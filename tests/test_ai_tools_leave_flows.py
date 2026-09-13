import pytest
from datetime import date
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models_registry
from app.database import Base
from app.core.identity.models import User, Role, Permission
from app.core.tenancy.models import BusinessProfile
from app.core.billing.models import SubscriptionPlan
from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.leave.models import LeaveType, LeaveApplication, LeaveAllocation, LeaveStatusEnum
from app.services.ai.tools import (
    execute_get_leave_types,
    execute_get_my_leave_applications,
    execute_create_leave_application,
)
from app.mcp import hr_report_server


@pytest.fixture
def setup_leave_flow_db():
    sync_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SyncTestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)
    Base.metadata.create_all(bind=sync_engine)

    db = SyncTestingSessionLocal()

    # Permissions
    perm_types_view = Permission(module="hrm", feature="leave_types", action="view", code="hrm:leave_types:view")
    perm_apps_view = Permission(module="hrm", feature="leave_applications", action="view", code="hrm:leave_applications:view")
    perm_apps_create = Permission(module="hrm", feature="leave_applications", action="create", code="hrm:leave_applications:create")
    perm_alloc_view = Permission(module="hrm", feature="leave_allocations", action="view", code="hrm:leave_allocations:view")
    db.add_all([perm_types_view, perm_apps_view, perm_apps_create, perm_alloc_view])
    db.commit()

    plan = SubscriptionPlan(id=1, name="Pro Plan", is_active=True)
    plan.permissions.extend([perm_types_view, perm_apps_view, perm_apps_create, perm_alloc_view])
    db.add(plan)
    db.commit()

    biz1 = BusinessProfile(id=1, name_en="Business One", subscription_plan_id=1)
    db.add(biz1)
    db.commit()

    # User 1: Assigned to Business 1
    user_assigned = User(id=1, username="assigned_user", email="assigned@example.com", password_hash="hash", business_id=1, is_superuser=False)
    user_assigned.direct_permissions.extend([perm_types_view, perm_apps_view, perm_apps_create, perm_alloc_view])

    # User 2: Not assigned to any business (business_id is None)
    user_unassigned = User(id=2, username="unassigned_user", email="unassigned@example.com", password_hash="hash", business_id=None, is_superuser=False)
    user_unassigned.direct_permissions.extend([perm_types_view, perm_apps_view, perm_apps_create, perm_alloc_view])

    db.add_all([user_assigned, user_unassigned])
    db.commit()

    emp1_id = uuid.uuid4()
    emp1 = Employee(id=emp1_id, business_id=1, first_name="Jane", last_name="Doe", employee_id="EMP001", work_email="assigned@example.com", is_active=True)
    db.add(emp1)
    db.commit()

    lt1 = LeaveType(id=uuid.uuid4(), business_id=1, name="Casual Leave", code="CL", max_days_per_year=14, is_paid=True, is_active=True)
    lt2 = LeaveType(id=uuid.uuid4(), business_id=1, name="Sick Leave", code="SL", max_days_per_year=10, is_paid=True, is_active=True)
    db.add_all([lt1, lt2])
    db.commit()

    alloc1 = LeaveAllocation(id=uuid.uuid4(), business_id=1, employee_id=emp1_id, leave_type_id=lt1.id, year=2025, allocated_days=14.0, used_days=2.0)
    db.add(alloc1)
    db.commit()

    app1 = LeaveApplication(
        id=uuid.uuid4(), business_id=1, employee_id=emp1_id, leave_type_id=lt1.id,
        start_date=date(2025, 1, 10), end_date=date(2025, 1, 12), total_days=3, reason="Family event", status=LeaveStatusEnum.APPROVED
    )
    app2 = LeaveApplication(
        id=uuid.uuid4(), business_id=1, employee_id=emp1_id, leave_type_id=lt1.id,
        start_date=date(2025, 2, 1), end_date=date(2025, 2, 3), total_days=3, reason="Personal matter", status=LeaveStatusEnum.PENDING
    )
    db.add_all([app1, app2])
    db.commit()

    yield {
        "db": db,
        "user_assigned": user_assigned,
        "user_unassigned": user_unassigned,
        "emp1_id": emp1_id,
        "lt1": lt1,
        "lt2": lt2,
        "app1": app1,
        "app2": app2,
    }


def test_business_assignment_check_in_get_leave_types(setup_leave_flow_db):
    db = setup_leave_flow_db["db"]
    user_unassigned = setup_leave_flow_db["user_unassigned"]
    user_assigned = setup_leave_flow_db["user_assigned"]

    # Unassigned user should get error response requesting administrator assistance
    res_unassigned = execute_get_leave_types(db, user_unassigned)
    assert res_unassigned.type == "error"
    assert "You have not been assigned to any business yet" in res_unassigned.message

    # Assigned user gets configured leave types
    res_assigned = execute_get_leave_types(db, user_assigned)
    assert res_assigned.type == "list"
    assert res_assigned.total == 2


def test_get_my_leave_applications_default_vs_history(setup_leave_flow_db):
    db = setup_leave_flow_db["db"]
    user_assigned = setup_leave_flow_db["user_assigned"]

    # Default call (history_requested=False) returns only the single most recent request
    res_default = execute_get_my_leave_applications(db, user_assigned, history_requested=False)
    assert res_default.type == "list"
    assert res_default.total == 1
    assert len(res_default.rows) == 1
    assert res_default.rows[0]["start_date"] == "2025-02-01"  # most recent by date

    # Full history call (history_requested=True) returns all requests
    res_history = execute_get_my_leave_applications(db, user_assigned, history_requested=True)
    assert res_history.type == "list"
    assert res_history.total == 2
    assert len(res_history.rows) == 2


def test_create_leave_application_validations(setup_leave_flow_db):
    db = setup_leave_flow_db["db"]
    user_assigned = setup_leave_flow_db["user_assigned"]
    lt1 = setup_leave_flow_db["lt1"]

    # Test invalid date order (end_date before start_date)
    res_inv_dates = execute_create_leave_application(
        db,
        user_assigned,
        leave_type_id="CL",
        start_date="2025-05-10",
        end_date="2025-05-05",
        reason="Vacation",
    )
    assert res_inv_dates.type == "error"
    assert "Start date cannot be after end date" in res_inv_dates.message

    # Test successful application creation
    res_success = execute_create_leave_application(
        db,
        user_assigned,
        leave_type_id="CL",
        start_date="2025-06-01",
        end_date="2025-06-03",
        reason="Vacation trip",
    )
    assert res_success.type == "summary"
    assert "Leave Application Created" in res_success.title
    assert res_success.metrics["total_days"] == 3
