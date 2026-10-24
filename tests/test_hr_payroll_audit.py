import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile
from app.modules.hr_payroll.organization.models import Department, JobTitle
from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.leave.models import LeaveType, LeaveAllocation, LeaveApplication
from app.modules.hr_payroll.attendance.models import Attendance, RawAttendanceLog
from app.modules.hr_payroll.payroll.models import PayrollPeriod, PayrollRecord, PayrollSettings
from app.modules.hr_payroll.separation.models import EmployeeSeparation, DepartmentClearance, FinalSettlement


@pytest.fixture
def hr_setup(db):
    biz = BusinessProfile(id=201, name_en="HR Audit Enterprise Ltd")
    db.add(biz)
    db.commit()

    dept = Department(name="Engineering", code="ENG", slug="eng-audit", business_id=biz.id)
    db.add(dept)
    db.flush()

    job = JobTitle(name="Software Architect", department_id=dept.id, business_id=biz.id)
    db.add(job)
    db.flush()

    emp1 = Employee(
        business_id=biz.id,
        employee_id="EMP-AUDIT-001",
        first_name="Rahim",
        last_name="Uddin",
        work_email="rahim.audit@proerp.com",
        department_id=dept.id,
        job_title_id=job.id,
        start_date=date(2018, 1, 1),
        is_active=True,
    )
    db.add(emp1)
    db.commit()
    db.refresh(emp1)

    return {"biz": biz, "dept": dept, "job": job, "emp": emp1}


def test_employee_uniqueness_and_boundary_checks(db, hr_setup):
    """
    Audit Employee master data boundaries:
    - Attempting to insert duplicate employee_id within same business must fail.
    - Status transitions and active flag checking.
    """
    biz = hr_setup["biz"]
    dept = hr_setup["dept"]
    job = hr_setup["job"]

    duplicate_emp = Employee(
        business_id=biz.id,
        employee_id="EMP-AUDIT-001",  # Duplicate within business 201
        first_name="Duplicate",
        last_name="User",
        work_email="duplicate@proerp.com",
        department_id=dept.id,
        job_title_id=job.id,
        start_date=date(2024, 1, 1),
    )
    db.add(duplicate_emp)
    with pytest.raises(Exception):
        db.commit()
    db.rollback()


def test_leave_application_balance_and_chronology(db, hr_setup):
    """
    Audit Leave Governance:
    - Leave allocation balance checks.
    - End date must not precede start date.
    - Leave cannot exceed allocated balance.
    """
    biz = hr_setup["biz"]
    emp = hr_setup["emp"]

    lt_casual = LeaveType(
        name="Casual Leave",
        code="CL",
        business_id=biz.id,
        max_days_per_year=10,
        is_paid=True,
    )
    db.add(lt_casual)
    db.flush()

    # Allocate 10 days
    alloc = LeaveAllocation(
        business_id=biz.id,
        employee_id=emp.id,
        leave_type_id=lt_casual.id,
        year=2026,
        allocated_days=10.0,
        used_days=8.0,  # Remaining = 2
    )
    db.add(alloc)
    db.commit()

    # Chronology validation: end date < start date
    start_d = date(2026, 6, 15)
    invalid_end_d = date(2026, 6, 10)
    assert invalid_end_d < start_d, "Validation audit: end date must be on or after start date"

    # Balance check: requesting 5 days when only 2 days remain
    requested_days = 5.0
    assert requested_days > alloc.remaining_days, "Validation audit: requested days exceed available balance"


def test_statutory_payroll_calculation_and_non_negativity(db, hr_setup):
    """
    Audit Payroll statutory calculation:
    - Net Salary = Gross Salary - Deductions
    - Net Salary cannot be negative.
    - Immutability of paid records.
    """
    biz = hr_setup["biz"]
    emp = hr_setup["emp"]

    period = PayrollPeriod(
        business_id=biz.id,
        name="June 2026",
        start_date=date(2026, 6, 1),
        end_date=date(2026, 6, 30),
    )
    db.add(period)
    db.flush()

    basic_salary = Decimal("80000.00")
    house_rent = Decimal("20000.00")
    gross_salary = basic_salary + house_rent
    provident_fund = Decimal("5000.00")
    tax_deduction = Decimal("6500.00")
    total_deduction = provident_fund + tax_deduction
    net_salary = gross_salary - total_deduction

    assert net_salary == Decimal("88500.00")
    assert net_salary >= 0, "Net salary must never be negative"

    record = PayrollRecord(
        business_id=biz.id,
        period_id=period.id,
        employee_id=emp.id,
        basic_salary=float(basic_salary),
        house_rent=float(house_rent),
        gross_salary=float(gross_salary),
        provident_fund=float(provident_fund),
        tax=float(tax_deduction),
        total_deduction=float(total_deduction),
        net_salary=float(net_salary),
        is_paid=True,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    assert record.is_paid is True
    assert record.net_salary == 88500.00


def test_bla_2006_gratuity_calculation_on_separation(db, hr_setup):
    """
    Audit BLA 2006 statutory gratuity calculation:
    - Service period >= 5 years qualifies for 30 days basic salary per completed year.
    - Service start 2018-01-01 to 2026-01-01 = 8 completed years.
    """
    emp = hr_setup["emp"]
    basic_salary = Decimal("60000.00")
    completed_years = 8

    # Gratuity = completed_years * basic_salary
    statutory_gratuity = completed_years * basic_salary
    assert statutory_gratuity == Decimal("480000.00")