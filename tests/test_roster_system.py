import uuid
from datetime import date, datetime, time, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile
from app.database import Base
from app.modules.hr_payroll.attendance.models import Attendance, AttendanceStatusEnum
from app.modules.hr_payroll.attendance.schemas import AttendanceCreate
from app.modules.hr_payroll.attendance.service import AttendanceService
from app.modules.hr_payroll.employees.models import Employee, EmploymentTypeEnum, GenderEnum, MaritalStatusEnum
from app.modules.hr_payroll.organization.models import Branch, Department
from app.modules.hr_payroll.roster.models import (
    DutyAssignmentStatusEnum,
    DutyBatchStatusEnum,
    MonthlyRosterStatusEnum,
    RosterChangeStatusEnum,
    RosterExchangeStatusEnum,
)
from app.modules.hr_payroll.roster.schemas import (
    DepartmentRosterToggle,
    DutyAssignBatchCreate,
    DutyAssignBatchReview,
    DutyAssignmentItem,
    MonthlyRosterBulkCellUpdate,
    MonthlyRosterCellUpdate,
    MonthlyRosterReview,
    RosterChangeCreate,
    RosterChangeReview,
    RosterExchangeCreate,
    RosterExchangeManagerReview,
    RosterExchangePeerReview,
    ShiftCreate,
)
from app.modules.hr_payroll.roster.service import RosterService

sync_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
SyncTestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=sync_engine
)


@pytest.fixture
def db():
    Base.metadata.create_all(bind=sync_engine)
    session = SyncTestingSessionLocal()
    try:
        # Create test business profile
        biz = BusinessProfile(
            id=1,
            name_en="Test Business Ltd",
            legal_name="Test Business Ltd",
        )
        session.add(biz)

        # Create branch
        branch = Branch(
            business_id=1,
            name="Main Branch",
            code="BR-01",
        )
        session.add(branch)

        # Create General Dept
        general_dept = Department(
            business_id=1,
            name="Finance",
            code="FIN",
            slug="finance-dept",
            is_roster_enabled=False,
        )
        session.add(general_dept)

        # Create Roster Dept
        roster_dept = Department(
            business_id=1,
            name="Support Services",
            code="SUPP",
            slug="support-services",
            is_roster_enabled=True,
        )
        session.add(roster_dept)
        session.flush()

        # Create employees
        emp1 = Employee(
            business_id=1,
            first_name="Rahim",
            last_name="Uddin",
            employee_id="EMP-001",
            work_email="rahim@test.com",
            gender=GenderEnum.MALE,
            marital_status=MaritalStatusEnum.SINGLE,
            employment_type=EmploymentTypeEnum.FULL_TIME,
            department_id=roster_dept.id,
            branch_id=branch.id,
            start_date=date(2025, 1, 1),
            is_active=True,
        )
        emp2 = Employee(
            business_id=1,
            first_name="Karim",
            last_name="Chowdhury",
            employee_id="EMP-002",
            work_email="karim@test.com",
            gender=GenderEnum.MALE,
            marital_status=MaritalStatusEnum.MARRIED,
            employment_type=EmploymentTypeEnum.FULL_TIME,
            department_id=roster_dept.id,
            branch_id=branch.id,
            start_date=date(2025, 1, 1),
            is_active=True,
        )
        emp_general = Employee(
            business_id=1,
            first_name="Salma",
            last_name="Begum",
            employee_id="EMP-003",
            work_email="salma@test.com",
            gender=GenderEnum.FEMALE,
            marital_status=MaritalStatusEnum.MARRIED,
            employment_type=EmploymentTypeEnum.FULL_TIME,
            department_id=general_dept.id,
            branch_id=branch.id,
            start_date=date(2025, 1, 1),
            is_active=True,
        )
        session.add_all([emp1, emp2, emp_general])
        session.commit()

        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=sync_engine)


def test_shifts_crud_and_seed(db):
    service = RosterService()
    shifts = service.get_shifts(db, business_id=1)
    assert len(shifts) >= 4  # Default 4 seeded

    # Create new shift
    new_shift = service.create_shift(
        db,
        ShiftCreate(
            name="Custom Shift",
            code="CUST-1",
            start_time=time(10, 0),
            end_time=time(18, 30),
            work_hours=8.0,
            grace_in_minutes=10,
        ),
        business_id=1,
    )
    assert new_shift.code == "CUST-1"

    # Query
    fetched = service.repo.get_shift_by_id(db, new_shift.id, business_id=1)
    assert fetched is not None
    assert fetched.name == "Custom Shift"


def test_department_roster_toggle(db):
    service = RosterService()
    general_dept = db.query(Department).filter(Department.code == "FIN").first()
    assert general_dept.is_roster_enabled is False

    # Toggle to enabled
    updated = service.toggle_department_roster(
        db, general_dept.id, DepartmentRosterToggle(is_roster_enabled=True), business_id=1
    )
    assert updated.is_roster_enabled is True

    # Toggle back to disabled
    updated_back = service.toggle_department_roster(
        db, general_dept.id, DepartmentRosterToggle(is_roster_enabled=False), business_id=1
    )
    assert updated_back.is_roster_enabled is False


def test_monthly_roster_workflow_and_bla_validation(db):
    service = RosterService()
    roster_dept = db.query(Department).filter(Department.code == "SUPP").first()
    emp1 = db.query(Employee).filter(Employee.employee_id == "EMP-001").first()

    shifts = service.get_shifts(db, business_id=1)
    morning_shift = next(s for s in shifts if s.code == "MS-1")
    off_shift = next(s for s in shifts if s.code == "OFF")

    # 1. Assign 7 consecutive working days (no OFF) -> Should trigger BLA 2006 violation
    cells = [
        MonthlyRosterCellUpdate(
            employee_id=emp1.id,
            date=date(2026, 11, d),
            shift_id=morning_shift.id,
        )
        for d in range(1, 8)
    ]
    service.save_monthly_roster_cells(
        db, roster_dept.id, 2026, 11, MonthlyRosterBulkCellUpdate(cells=cells), business_id=1
    )

    matrix = service.get_monthly_roster_matrix(db, roster_dept.id, 2026, 11, business_id=1)
    assert len(matrix.rest_day_violations) > 0
    assert matrix.rest_day_violations[0].employee_id == emp1.id

    # 2. Fix the violation: Give day 7 OFF
    fix_cell = MonthlyRosterCellUpdate(
        employee_id=emp1.id,
        date=date(2026, 11, 7),
        shift_id=off_shift.id,
    )
    service.save_monthly_roster_cells(
        db, roster_dept.id, 2026, 11, MonthlyRosterBulkCellUpdate(cells=[fix_cell]), business_id=1
    )
    matrix_fixed = service.get_monthly_roster_matrix(db, roster_dept.id, 2026, 11, business_id=1)
    assert len(matrix_fixed.rest_day_violations) == 0

    # 3. Submit for approval
    dummy_user = User(id=1, username="supervisor", business_id=1)
    submitted = service.submit_monthly_roster(
        db, matrix_fixed.monthly_roster.id, business_id=1, current_user=dummy_user
    )
    assert submitted.status == MonthlyRosterStatusEnum.SUBMITTED

    # 4. Approve
    approved = service.review_monthly_roster(
        db,
        matrix_fixed.monthly_roster.id,
        MonthlyRosterReview(action="approve"),
        business_id=1,
        current_user=dummy_user,
    )
    assert approved.status == MonthlyRosterStatusEnum.APPROVED

    # Check duty assignments are approved
    duty_day1 = service.repo.get_assignment_for_date(db, emp1.id, date(2026, 11, 1), business_id=1)
    assert duty_day1 is not None
    assert duty_day1.status == DutyAssignmentStatusEnum.APPROVED


def test_duty_assign_batch_approval(db):
    service = RosterService()
    roster_dept = db.query(Department).filter(Department.code == "SUPP").first()
    emp2 = db.query(Employee).filter(Employee.employee_id == "EMP-002").first()
    shifts = service.get_shifts(db, business_id=1)
    evening_shift = next(s for s in shifts if s.code == "ES-2")

    dummy_user = User(id=1, username="lead", business_id=1)
    batch = service.create_duty_assign_batch(
        db,
        DutyAssignBatchCreate(
            department_id=roster_dept.id,
            title="Special Project Batch",
            start_date=date(2026, 12, 1),
            end_date=date(2026, 12, 3),
            assignments=[
                DutyAssignmentItem(
                    employee_id=emp2.id,
                    date=date(2026, 12, 1),
                    shift_id=evening_shift.id,
                ),
                DutyAssignmentItem(
                    employee_id=emp2.id,
                    date=date(2026, 12, 2),
                    shift_id=evening_shift.id,
                ),
            ],
        ),
        business_id=1,
        current_user=dummy_user,
    )
    assert batch.status == DutyBatchStatusEnum.PENDING_APPROVAL

    # Approve batch
    reviewed = service.review_duty_assign_batch(
        db, batch.id, DutyAssignBatchReview(action="approve"), business_id=1, current_user=dummy_user
    )
    assert reviewed.status == DutyBatchStatusEnum.APPROVED

    duty = service.repo.get_assignment_for_date(db, emp2.id, date(2026, 12, 1), business_id=1)
    assert duty is not None
    assert duty.shift_id == evening_shift.id
    assert duty.status == DutyAssignmentStatusEnum.APPROVED


def test_roster_change_workflow(db):
    service = RosterService()
    emp1 = db.query(Employee).filter(Employee.employee_id == "EMP-001").first()
    shifts = service.get_shifts(db, business_id=1)
    morning_shift = next(s for s in shifts if s.code == "MS-1")
    night_shift = next(s for s in shifts if s.code == "NS-3")

    # Set up approved duty
    target_date = date(2026, 10, 25)
    service.repo.upsert_assignment(
        db,
        business_id=1,
        employee_id=emp1.id,
        department_id=emp1.department_id,
        date_val=target_date,
        shift_id=morning_shift.id,
        status=DutyAssignmentStatusEnum.APPROVED,
    )

    # 1. Apply change to Night shift
    change_req = service.create_roster_change_request(
        db,
        RosterChangeCreate(
            employee_id=emp1.id,
            date=target_date,
            requested_shift_id=night_shift.id,
            reason="Covering urgent night ticket queue",
        ),
        business_id=1,
    )
    assert change_req.status == RosterChangeStatusEnum.PENDING

    # 2. Review and approve
    dummy_manager = User(id=2, username="manager", business_id=1)
    reviewed = service.review_roster_change_request(
        db,
        change_req.id,
        RosterChangeReview(action="approve", note="Approved by Manager"),
        business_id=1,
        current_user=dummy_manager,
    )
    assert reviewed.status == RosterChangeStatusEnum.APPROVED

    # Check that the duty assignment was updated to night shift
    duty = service.repo.get_assignment_for_date(db, emp1.id, target_date, business_id=1)
    assert duty.shift_id == night_shift.id


def test_roster_exchange_workflow(db):
    service = RosterService()
    emp1 = db.query(Employee).filter(Employee.employee_id == "EMP-001").first()
    emp2 = db.query(Employee).filter(Employee.employee_id == "EMP-002").first()
    shifts = service.get_shifts(db, business_id=1)
    morning_shift = next(s for s in shifts if s.code == "MS-1")
    evening_shift = next(s for s in shifts if s.code == "ES-2")

    swap_date = date(2026, 10, 26)
    # Emp1 has Morning, Emp2 has Evening
    service.repo.upsert_assignment(
        db, business_id=1, employee_id=emp1.id, department_id=emp1.department_id,
        date_val=swap_date, shift_id=morning_shift.id, status=DutyAssignmentStatusEnum.APPROVED
    )
    service.repo.upsert_assignment(
        db, business_id=1, employee_id=emp2.id, department_id=emp2.department_id,
        date_val=swap_date, shift_id=evening_shift.id, status=DutyAssignmentStatusEnum.APPROVED
    )

    # 1. Emp1 proposes swap with Emp2
    exchange = service.create_roster_exchange_request(
        db,
        RosterExchangeCreate(
            requesting_employee_id=emp1.id,
            target_employee_id=emp2.id,
            requesting_date=swap_date,
            target_date=swap_date,
            reason="Family appointment in morning",
        ),
        business_id=1,
    )
    assert exchange.status == RosterExchangeStatusEnum.PENDING_PEER_APPROVAL

    # 2. Emp2 peer review: accepts
    emp2_user = User(id=3, username="emp2_user", business_id=1)
    peer_reviewed = service.peer_review_exchange(
        db, exchange.id, RosterExchangePeerReview(action="accept", peer_note="Agreed"), business_id=1, current_user=emp2_user
    )
    assert peer_reviewed.status == RosterExchangeStatusEnum.PENDING_MANAGER_APPROVAL

    # 3. Manager approves
    mgr = User(id=2, username="manager", business_id=1)
    mgr_reviewed = service.manager_review_exchange(
        db, exchange.id, RosterExchangeManagerReview(action="approve", review_note="Approved swap"), business_id=1, current_user=mgr
    )
    assert mgr_reviewed.status == RosterExchangeStatusEnum.APPROVED

    # Check atomic swap on duty records
    duty1 = service.repo.get_assignment_for_date(db, emp1.id, swap_date, business_id=1)
    duty2 = service.repo.get_assignment_for_date(db, emp2.id, swap_date, business_id=1)
    assert duty1.shift_id == evening_shift.id
    assert duty2.shift_id == morning_shift.id


def test_attendance_fallback_general_vs_roster(db):
    att_service = AttendanceService()
    emp_general = db.query(Employee).filter(Employee.employee_id == "EMP-003").first()
    emp_roster = db.query(Employee).filter(Employee.employee_id == "EMP-001").first()

    shifts = RosterService().get_shifts(db, business_id=1)
    morning_shift = next(s for s in shifts if s.code == "MS-1")  # 08:00 - 16:30, grace 15 min

    test_date = date(2026, 10, 27)

    # 1. General Department (is_roster_enabled = False)
    # Check-in 09:30, Check-out 18:30 -> 9 hours worked -> 1 hour OT (over standard 8.0)
    att_gen = att_service.create_record(
        db,
        AttendanceCreate(
            business_id=1,
            employee_id=emp_general.id,
            date=test_date,
            check_in=time(9, 30),
            check_out=time(18, 30),
            status=AttendanceStatusEnum.PRESENT,
        ),
    )
    assert att_gen.work_hours == 9.0
    assert att_gen.overtime_hours == 1.0
    assert att_gen.status == AttendanceStatusEnum.PRESENT  # Not marked late because no shift bound

    # 2. Roster Department with approved morning shift
    RosterService().repo.upsert_assignment(
        db,
        business_id=1,
        employee_id=emp_roster.id,
        department_id=emp_roster.department_id,
        date_val=test_date,
        shift_id=morning_shift.id,
        status=DutyAssignmentStatusEnum.APPROVED,
    )

    # Check-in at 08:25 (which is later than 08:00 + 15 min grace = 08:15)
    att_roster = att_service.create_record(
        db,
        AttendanceCreate(
            business_id=1,
            employee_id=emp_roster.id,
            date=test_date,
            check_in=time(8, 25),
            check_out=time(16, 25),
            status=AttendanceStatusEnum.PRESENT,
        ),
    )
    # Status automatically adjusted to LATE due to shift timing
    assert att_roster.status == AttendanceStatusEnum.LATE
    assert att_roster.work_hours == 8.0
    assert att_roster.overtime_hours == 0.0
