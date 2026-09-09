import os
import pytest
import pytest_asyncio
import uuid
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker, selectinload
from sqlalchemy.pool import StaticPool

import app.models_registry
from app.database import Base
from app.core.identity.models import User, Role, Permission
from app.core.identity.repository import UserRepository
from app.core.tenancy.models import BusinessProfile
from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.leave.models import LeaveType, LeaveApplication, LeaveAllocation, LeaveStatusEnum
from app.modules.hr_payroll.payroll.models import PayrollPeriod, PayrollRecord, PayrollPeriodStatusEnum
from app.modules.hr_payroll.attendance.models import Attendance, AttendanceStatusEnum
from app.mcp import hr_report_server


@pytest.fixture
def setup_mcp_db():
    sync_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SyncTestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)
    Base.metadata.create_all(bind=sync_engine)

    # Monkeypatch hr_report_server's SessionLocal to use our test db
    orig_sessionlocal = hr_report_server.SessionLocal
    hr_report_server.SessionLocal = SyncTestingSessionLocal

    db = SyncTestingSessionLocal()

    # Seed Businesses
    biz1 = BusinessProfile(id=1, name_en="Business One")
    biz2 = BusinessProfile(id=2, name_en="Business Two")
    db.add_all([biz1, biz2])
    db.commit()

    # Seed Permissions
    perm_emp_view = Permission(module="hrm", feature="employees", action="view", code="hrm:employees:view")
    perm_leave_apps = Permission(module="hrm", feature="leave_applications", action="view", code="hrm:leave_applications:view")
    perm_leave_alloc = Permission(module="hrm", feature="leave_allocations", action="view", code="hrm:leave_allocations:view")
    perm_pay_rec = Permission(module="hrm", feature="payroll_records", action="view", code="hrm:payroll_records:view")
    perm_comp_view = Permission(module="hrm", feature="compensation", action="view", code="hrm:compensation:view")
    perm_att_view = Permission(module="hrm", feature="attendance", action="view", code="hrm:attendance:view")
    db.add_all([perm_emp_view, perm_leave_apps, perm_leave_alloc, perm_pay_rec, perm_comp_view, perm_att_view])
    db.commit()

    # Seed Users
    # User 1: Business 1, has payroll_records:view but NOT compensation:view
    user1 = User(id=1, username="user1", email="user1@example.com", password_hash="hash", business_id=1, is_superuser=False)
    user1.direct_permissions.extend([perm_emp_view, perm_leave_apps, perm_leave_alloc, perm_pay_rec, perm_att_view])

    # User 2: Business 1, has ALL permissions including compensation:view
    user2 = User(id=2, username="user2", email="user2@example.com", password_hash="hash", business_id=1, is_superuser=False)
    user2.direct_permissions.extend([perm_emp_view, perm_leave_apps, perm_leave_alloc, perm_pay_rec, perm_comp_view, perm_att_view])

    # User 3: Business 2, has ALL permissions
    user3 = User(id=3, username="user3", email="user3@example.com", password_hash="hash", business_id=2, is_superuser=False)
    user3.direct_permissions.extend([perm_emp_view, perm_leave_apps, perm_leave_alloc, perm_pay_rec, perm_comp_view, perm_att_view])

    db.add_all([user1, user2, user3])
    db.commit()

    # Seed Employees
    emp1_id = uuid.uuid4()
    emp1 = Employee(id=emp1_id, business_id=1, first_name="John", last_name="Doe", employee_id="EMP101", work_email="john@biz1.com", is_active=True)

    emp2_id = uuid.uuid4()
    emp2 = Employee(id=emp2_id, business_id=2, first_name="Alice", last_name="Smith", employee_id="EMP201", work_email="alice@biz2.com", is_active=True)

    db.add_all([emp1, emp2])
    db.commit()

    # Seed Leave Types & Allocations & Applications
    lt1 = LeaveType(id=uuid.uuid4(), business_id=1, name="Annual Leave", code="AL", max_days_per_year=20, is_paid=True)
    db.add(lt1)
    db.commit()

    alloc1 = LeaveAllocation(id=uuid.uuid4(), business_id=1, employee_id=emp1_id, leave_type_id=lt1.id, year=2025, allocated_days=20.0, used_days=5.0)
    app1 = LeaveApplication(
        id=uuid.uuid4(), business_id=1, employee_id=emp1_id, leave_type_id=lt1.id,
        start_date=date(2025, 1, 10), end_date=date(2025, 1, 15), total_days=5, reason="Vacation", status=LeaveStatusEnum.APPROVED
    )
    db.add_all([alloc1, app1])
    db.commit()

    # Seed Payroll Period & Record
    period1_id = uuid.uuid4()
    period1 = PayrollPeriod(id=period1_id, business_id=1, name="January 2025", start_date=date(2025, 1, 1), end_date=date(2025, 1, 31), status=PayrollPeriodStatusEnum.PROCESSING)
    db.add(period1)
    db.commit()

    pay_rec1 = PayrollRecord(
        id=uuid.uuid4(), business_id=1, period_id=period1_id, employee_id=emp1_id,
        working_days=22, present_days=20, basic_salary=4000.0, gross_salary=5000.0, total_deduction=500.0, net_salary=4500.0
    )
    db.add(pay_rec1)
    db.commit()

    # Seed Attendance
    att1 = Attendance(
        id=uuid.uuid4(), business_id=1, employee_id=emp1_id, date=date(2025, 1, 5), status=AttendanceStatusEnum.PRESENT, work_hours=8.0, overtime_hours=2.0
    )
    db.add(att1)
    db.commit()

    # Helper function using real Sync session with selectinload to mock resolve_acting_user
    def sync_resolve_acting_user():
        user_id_str = os.getenv("MCP_ACTING_USER_ID")
        if not user_id_str:
            raise RuntimeError("MCP_ACTING_USER_ID environment variable is not set")
        user_id = int(user_id_str)
        s = hr_report_server.SessionLocal()
        try:
            u = s.query(User).options(
                selectinload(User.roles).selectinload(Role.permissions),
                selectinload(User.direct_permissions),
            ).filter(User.id == user_id).first()
            if u:
                _ = u.get_all_permission_codes()
            return u
        finally:
            s.close()

    yield {
        "db": db,
        "emp1_id": str(emp1_id),
        "emp2_id": str(emp2_id),
        "period1_id": str(period1_id),
        "sync_resolve": sync_resolve_acting_user,
    }

    hr_report_server.SessionLocal = orig_sessionlocal


def test_resolve_acting_user_function(setup_mcp_db, monkeypatch):
    data = setup_mcp_db
    monkeypatch.setattr(hr_report_server, "resolve_acting_user", data["sync_resolve"])

    # Test resolving user 1
    os.environ["MCP_ACTING_USER_ID"] = "1"
    user1 = hr_report_server.resolve_acting_user()
    assert user1 is not None
    assert user1.username == "user1"
    assert user1.has_permission("hrm:employees:view") is True
    assert user1.has_permission("hrm:compensation:view") is False

    # Test resolving user 2
    os.environ["MCP_ACTING_USER_ID"] = "2"
    user2 = hr_report_server.resolve_acting_user()
    assert user2 is not None
    assert user2.username == "user2"
    assert user2.has_permission("hrm:compensation:view") is True


def test_get_employee_payslip_permission_denied(setup_mcp_db, monkeypatch):
    data = setup_mcp_db
    os.environ["MCP_ACTING_USER_ID"] = "1"
    monkeypatch.setattr(hr_report_server, "resolve_acting_user", data["sync_resolve"])

    res = hr_report_server.get_employee_payslip(data["emp1_id"], data["period1_id"])
    assert isinstance(res, str)
    assert "Permission denied" in res
    assert "hrm:compensation:view" in res


def test_tenant_scoping_isolation(setup_mcp_db, monkeypatch):
    data = setup_mcp_db
    os.environ["MCP_ACTING_USER_ID"] = "1"
    monkeypatch.setattr(hr_report_server, "resolve_acting_user", data["sync_resolve"])

    # User 1 attempts to query Business 2 employees
    res_list = hr_report_server.list_employees(business_id=2)
    assert isinstance(res_list, str)
    assert "Tenant scoping violation" in res_list

    # User 1 attempts to query Employee B (Business 2)
    res_emp = hr_report_server.get_employee(data["emp2_id"])
    assert isinstance(res_emp, str)
    assert "Tenant scoping violation" in res_emp


def test_leave_and_payroll_summary_reports_happy_path(setup_mcp_db, monkeypatch):
    data = setup_mcp_db
    os.environ["MCP_ACTING_USER_ID"] = "2"
    monkeypatch.setattr(hr_report_server, "resolve_acting_user", data["sync_resolve"])

    # Test get_leave_summary_report
    leave_rep = hr_report_server.get_leave_summary_report(business_id=1, period_start="2025-01-01", period_end="2025-01-31")
    assert isinstance(leave_rep, dict)
    assert leave_rep["type"] == "summary"
    assert leave_rep["metrics"]["total_applications"] == 1

    # Test get_payroll_summary_report
    payroll_rep = hr_report_server.get_payroll_summary_report(business_id=1, payroll_period_id=data["period1_id"])
    assert isinstance(payroll_rep, dict)
    assert payroll_rep["type"] == "summary"
    assert payroll_rep["metrics"]["headcount"] == 1
    assert payroll_rep["metrics"]["total_gross_salary"] == 5000.0
    assert payroll_rep["metrics"]["total_net_salary"] == 4500.0
    assert payroll_rep["metrics"]["total_deductions"] == 500.0
    # Confirm NO individual per-employee breakdown / records key exists
    assert "records" not in payroll_rep["metrics"]


def test_other_mcp_tools(setup_mcp_db, monkeypatch):
    data = setup_mcp_db
    os.environ["MCP_ACTING_USER_ID"] = "2"
    monkeypatch.setattr(hr_report_server, "resolve_acting_user", data["sync_resolve"])

    # 1. list_employees
    emp_list = hr_report_server.list_employees(business_id=1)
    assert isinstance(emp_list, dict)
    assert emp_list["type"] == "table"
    assert emp_list["total"] == 1
    assert emp_list["rows"][0]["employee_id"] == "EMP101"

    # 2. get_employee
    emp = hr_report_server.get_employee(data["emp1_id"])
    assert isinstance(emp, dict)
    assert emp["type"] == "employee_card"
    assert emp["employee"]["full_name"] == "John Doe"

    # 3. list_leave_applications
    apps = hr_report_server.list_leave_applications(business_id=1)
    assert isinstance(apps, dict)
    assert apps["type"] == "list"
    assert apps["total"] == 1

    # 4. get_employee_leave_balance
    bal = hr_report_server.get_employee_leave_balance(data["emp1_id"])
    assert isinstance(bal, dict)
    assert bal["type"] == "summary"
    assert bal["metrics"]["Annual Leave (Remaining)"] == 15.0

    # 5. get_employee_payslip (User 2 has compensation:view)
    payslip = hr_report_server.get_employee_payslip(data["emp1_id"], data["period1_id"])
    assert isinstance(payslip, dict)
    assert payslip["type"] == "employee_card"
    assert payslip["employee"]["gross_salary"] == 5000.0
    assert payslip["employee"]["net_salary"] == 4500.0

    # 6. get_attendance_summary
    att_sum = hr_report_server.get_attendance_summary(data["emp1_id"], "2025-01-01", "2025-01-31")
    assert isinstance(att_sum, dict)
    assert att_sum["type"] == "summary"
    assert att_sum["metrics"]["total_overtime_hours"] == 2.0
