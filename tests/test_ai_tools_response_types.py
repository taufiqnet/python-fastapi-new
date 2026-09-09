import uuid
from datetime import date
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.core.identity.models import User, Role, Permission
from app.core.tenancy.models import BusinessProfile
from app.modules.hr_payroll.employees.models import Employee, EmploymentTypeEnum
from app.modules.hr_payroll.organization.models import Department, JobTitle
from app.modules.hr_payroll.payroll.models import PayrollPeriod, PayrollPeriodStatusEnum, PayrollRecord
from app.services.ai.tools import (
    execute_search_employees,
    execute_get_employee,
    execute_get_employee_count,
    execute_get_department_employee_count,
    execute_get_payroll_status,
)
from app.services.ai.response_types import (
    TableResponse,
    EmployeeCardResponse,
    NumberResponse,
    ChartResponse,
    SummaryResponse,
    ErrorResponse,
)


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def setup_data(db_session):
    biz = BusinessProfile(id=1, name_en="Test Business", is_active=True)
    db_session.add(biz)

    perm_emp_view = Permission(id=1, code="hrm:employees:view", name="View Employees", module="hrm", feature="employees", action="view")
    perm_dept_view = Permission(id=2, code="hrm:departments:view", name="View Depts", module="hrm", feature="departments", action="view")
    perm_period_view = Permission(id=3, code="hrm:payroll_periods:view", name="View Periods", module="hrm", feature="payroll_periods", action="view")
    
    db_session.add_all([perm_emp_view, perm_dept_view, perm_period_view])

    role = Role(id=1, name="HR Manager")
    role.permissions.extend([perm_emp_view, perm_dept_view, perm_period_view])
    db_session.add(role)

    user = User(id=1, username="hradmin", email="hr@example.com", password_hash="hash", business_id=1, is_superuser=False)
    user.roles.append(role)
    db_session.add(user)

    unauth_user = User(id=2, username="regularuser", email="user@example.com", password_hash="hash", business_id=1, is_superuser=False)
    db_session.add(unauth_user)

    dept1 = Department(id=uuid.uuid4(), name="Engineering", slug="engineering", business_id=1, is_active=True)
    dept2 = Department(id=uuid.uuid4(), name="Sales", slug="sales", business_id=1, is_active=True)
    db_session.add_all([dept1, dept2])

    job_title = JobTitle(id=uuid.uuid4(), name="Software Developer", business_id=1, is_active=True)
    db_session.add(job_title)

    # Add 60 employees to test page size clamping
    for i in range(1, 61):
        emp = Employee(
            id=uuid.uuid4(),
            business_id=1,
            first_name=f"Employee{i}",
            last_name="Test",
            employee_id=f"EMP{i:03d}",
            work_email=f"emp{i}@example.com",
            department_id=dept1.id if i <= 40 else dept2.id,
            job_title_id=job_title.id,
            national_id="SECRET_123",
            residential_address="Secret Address 123",
            is_active=True,
        )
        db_session.add(emp)

    period = PayrollPeriod(
        id=uuid.uuid4(),
        name="Jan 2025",
        business_id=1,
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 31),
        status=PayrollPeriodStatusEnum.PROCESSING,
    )
    db_session.add(period)

    db_session.commit()
    return {"user": user, "unauth_user": unauth_user, "period": period}


def test_page_size_clamping(db_session, setup_data):
    user = setup_data["user"]
    # Request page_size = 500
    res = execute_search_employees(db_session, user, page=1, page_size=500)
    assert isinstance(res, TableResponse)
    assert res.total == 60
    assert res.page_size == 50  # Hard capped at 50
    assert len(res.rows) == 50


def test_column_allowlist_employee(db_session, setup_data):
    user = setup_data["user"]
    res = execute_get_employee(db_session, user, employee_id="EMP001")
    assert isinstance(res, EmployeeCardResponse)
    emp_data = res.employee
    
    # Check allowlisted fields exist
    assert "employee_id" in emp_data
    assert "full_name" in emp_data
    assert "department" in emp_data
    assert "job_title" in emp_data
    assert "status" in emp_data
    assert "work_email" in emp_data

    # Confirm sensitive/unlisted fields are strictly EXCLUDED
    assert "national_id" not in emp_data
    assert "residential_address" not in emp_data
    assert "salary" not in emp_data
    assert "bank_account" not in emp_data


def test_permission_denied_returns_error_envelope(db_session, setup_data):
    unauth_user = setup_data["unauth_user"]
    res = execute_search_employees(db_session, unauth_user, page=1, page_size=20)
    assert isinstance(res, ErrorResponse)
    assert "Permission denied" in res.message


def test_new_aggregate_tools(db_session, setup_data):
    user = setup_data["user"]
    period = setup_data["period"]

    # 1. get_employee_count
    count_res = execute_get_employee_count(db_session, user)
    assert isinstance(count_res, NumberResponse)
    assert count_res.value == 60
    assert count_res.label == "Total Employees"

    # 2. get_department_employee_count
    dept_res = execute_get_department_employee_count(db_session, user)
    assert isinstance(dept_res, ChartResponse)
    assert dept_res.chart_type == "bar"
    assert len(dept_res.data) == 2
    dept_map = {d["department"]: d["count"] for d in dept_res.data}
    assert dept_map["Engineering"] == 40
    assert dept_map["Sales"] == 20

    # 3. get_payroll_status
    status_res = execute_get_payroll_status(db_session, user, payroll_period_id=str(period.id))
    assert isinstance(status_res, SummaryResponse)
    assert status_res.metrics["period_name"] == "Jan 2025"
    assert status_res.metrics["status"] == "processing"
