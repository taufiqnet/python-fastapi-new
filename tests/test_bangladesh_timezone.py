import uuid
from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo
import pytest

from app.common.timezone import (
    BANGLADESH_TZ,
    UTC_TZ,
    derive_assessment_year,
    get_bangladesh_fiscal_year,
    now_bd,
    time_bd,
    to_bd,
    to_utc,
    today_bd,
    utc_now,
)
from app.modules.hr_payroll.attendance.models import AttendanceStatusEnum
from app.modules.hr_payroll.attendance.service import AttendanceService
from app.modules.hr_payroll.attendance.schemas import AttendanceCreate
from app.database import SessionLocal
from app.core.identity.models import User
from app.modules.hr_payroll.employees.models import Employee


def test_timezone_constants_and_offsets():
    bd_now = now_bd()
    assert bd_now.tzinfo is not None
    # Bangladesh standard offset is +06:00
    offset = bd_now.utcoffset()
    assert offset.total_seconds() == 6 * 3600

    u_now = utc_now()
    assert u_now.tzinfo is not None
    assert u_now.utcoffset().total_seconds() == 0

    # Test conversion between UTC and BST
    converted = to_bd(u_now)
    assert converted.tzinfo == BANGLADESH_TZ
    # Difference between Bangladesh time representation and UTC should be exactly 6 hours
    diff_hours = (converted.hour - u_now.hour) % 24
    assert diff_hours == 6


def test_bangladesh_midnight_boundary_edge_case():
    """
    Test the critical midnight to 6:00 AM gap:
    When it is 2:30 AM on Oct 23 in Dhaka, it is 8:30 PM (20:30) on Oct 22 in UTC.
    The Bangladesh calendar date must evaluate to Oct 23, NOT Oct 22!
    """
    utc_instant = datetime(2026, 10, 22, 20, 30, 0, tzinfo=UTC_TZ)
    bd_time = to_bd(utc_instant)

    assert bd_time.date() == date(2026, 10, 23)
    assert bd_time.hour == 2
    assert bd_time.minute == 30


def test_bangladesh_fiscal_year_ita_2023():
    """
    Bangladesh Income Tax Act (ITA 2023) fiscal year runs July 1 to June 30.
    """
    # Last day of FY 2025-2026
    fy, start_d, end_d = get_bangladesh_fiscal_year(date(2026, 6, 30))
    assert fy == "2025-2026"
    assert start_d == date(2025, 7, 1)
    assert end_d == date(2026, 6, 30)
    assert derive_assessment_year(fy) == "2026-2027"

    # First day of FY 2026-2027
    fy2, start_d2, end_d2 = get_bangladesh_fiscal_year(date(2026, 7, 1))
    assert fy2 == "2026-2027"
    assert start_d2 == date(2026, 7, 1)
    assert end_d2 == date(2027, 6, 30)
    assert derive_assessment_year(fy2) == "2027-2028"

    # Current month (Oct 2026)
    fy3, _, _ = get_bangladesh_fiscal_year(date(2026, 10, 23))
    assert fy3 == "2026-2027"
    assert derive_assessment_year(fy3) == "2027-2028"


def test_attendance_late_threshold_bst():
    """
    Office start time in Dhaka: 09:00 AM, with 15 minutes grace period.
    Check-in at or before 09:15 AM BST -> PRESENT
    Check-in after 09:15 AM BST -> LATE
    """
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.is_superuser == True).first()
        emp = db.query(Employee).filter(Employee.business_id == (user.business_id or 1)).first()
        if not emp:
            pytest.skip("No employee found for attendance test.")

        svc = AttendanceService()
        test_date = date(2026, 11, 15)

        # 1. On time check-in (09:10 AM BST)
        rec_on_time = svc.check_in(
            db,
            business_id=emp.business_id,
            employee_id=emp.id,
            att_date=test_date,
            check_in_time=time(9, 10),
            note="Punctual check-in BST",
        )
        assert rec_on_time.status == AttendanceStatusEnum.PRESENT
        assert rec_on_time.check_in == time(9, 10)

        # 2. Late check-in (09:20 AM BST) on next date
        test_date_late = date(2026, 11, 16)
        rec_late = svc.check_in(
            db,
            business_id=emp.business_id,
            employee_id=emp.id,
            att_date=test_date_late,
            check_in_time=time(9, 20),
            note="Late arrival BST",
        )
        assert rec_late.status == AttendanceStatusEnum.LATE
        assert rec_late.check_in == time(9, 20)

        # Clean up test records
        db.delete(rec_on_time)
        db.delete(rec_late)
        db.commit()
    finally:
        db.close()
