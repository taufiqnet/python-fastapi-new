import uuid
import pytest
import pytest_asyncio
from datetime import date
from decimal import Decimal
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.core.deps import get_current_user_optional, get_current_user
from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile
from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.compensation.models import EmployeeSalary
from app.modules.hr_payroll.leave.models import (
    LeaveType,
    LeaveAllocation,
    LeaveApplication,
    LeaveEncashment,
    LeaveCarryForwardLog,
)
from app.modules.hr_payroll.payroll.models import PayrollPeriod, PayrollPeriodStatusEnum
from app.modules.hr_payroll.attendance.models import Attendance, AttendanceStatusEnum

sync_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
SyncTestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=sync_engine
)

EMP_ID = uuid.uuid4()
MGR_ID = uuid.uuid4()
LT_AL_ID = uuid.uuid4()
LT_SL_ID = uuid.uuid4()
ALLOC_AL_ID = uuid.uuid4()
ALLOC_SL_ID = uuid.uuid4()


@pytest.fixture
def sync_db():
    Base.metadata.create_all(bind=sync_engine)
    db = SyncTestingSessionLocal()

    # Seed business profile
    biz = BusinessProfile(
        id=1,
        legal_name="Acme Corp Ltd",
        name_en="Acme Corp",
        cr_number="1234567890",
        vat_number="123456789012345",
    )
    db.add(biz)

    # Seed employee
    emp = Employee(
        id=EMP_ID,
        business_id=1,
        first_name="Rahim",
        last_name="Uddin",
        employee_id="EMP-001",
        work_email="rahim@acme.com",
        is_active=True,
    )
    db.add(emp)

    # Seed manager
    manager = Employee(
        id=MGR_ID,
        business_id=1,
        first_name="Karim",
        last_name="Manager",
        employee_id="EMP-002",
        work_email="karim@acme.com",
        is_active=True,
    )
    db.add(manager)

    # Seed employee salary (basic: 30000 -> daily rate: 1000)
    salary = EmployeeSalary(
        business_id=1,
        employee_id=EMP_ID,
        basic_salary=Decimal("30000.00"),
        gross_salary=Decimal("50000.00"),
        effective_from=date(2025, 1, 1),
    )
    db.add(salary)

    # Seed Leave Types: Annual Leave (AL, carry_forward=True) and Casual Leave (CL, carry_forward=False)
    al_type = LeaveType(
        id=LT_AL_ID,
        business_id=1,
        name="Annual Leave",
        code="AL",
        max_days_per_year=15,
        carry_forward=True,
        is_paid=True,
    )
    sl_type = LeaveType(
        id=LT_SL_ID,
        business_id=1,
        name="Casual Leave",
        code="CL",
        max_days_per_year=10,
        carry_forward=False,
        is_paid=True,
    )
    db.add(al_type)
    db.add(sl_type)

    # Seed Allocations for 2025
    al_alloc = LeaveAllocation(
        id=ALLOC_AL_ID,
        business_id=1,
        employee_id=EMP_ID,
        leave_type_id=LT_AL_ID,
        year=2025,
        allocated_days=Decimal("15.0"),
        carried_forward=Decimal("0.0"),
        used_days=Decimal("0.0"),
        encashed_days=Decimal("0.0"),
    )
    sl_alloc = LeaveAllocation(
        id=ALLOC_SL_ID,
        business_id=1,
        employee_id=EMP_ID,
        leave_type_id=LT_SL_ID,
        year=2025,
        allocated_days=Decimal("10.0"),
        carried_forward=Decimal("0.0"),
        used_days=Decimal("0.0"),
        encashed_days=Decimal("0.0"),
    )
    db.add(al_alloc)
    db.add(sl_alloc)

    db.commit()

    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=sync_engine)


@pytest_asyncio.fixture
async def client(sync_db):
    def _override_get_db():
        yield sync_db

    dummy_user = User(
        id=1,
        username="admin",
        email="admin@acme.com",
        is_active=True,
        is_superuser=True,
        business_id=1,
    )

    def _override_get_current_user(request=None):
        return dummy_user

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user_optional] = _override_get_current_user
    app.dependency_overrides[get_current_user] = _override_get_current_user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_leave_approval_with_attendance_sync(client: AsyncClient, sync_db):
    """
    1. Submit leave application for 2 days.
    2. Approve application with sync_attendance=True.
    3. Verify leave application status=approved, quota used_days updated to 2.0.
    4. Verify Attendance records created for the employee for both dates with status 'on_leave'.
    """
    create_res = await client.post(
        "/leave-applications",
        json={
            "business_id": 1,
            "employee_id": str(EMP_ID),
            "leave_type_id": str(LT_AL_ID),
            "start_date": "2025-05-10",
            "end_date": "2025-05-11",
            "total_days": 2,
            "reason": "Family vacation",
        },
    )
    assert create_res.status_code == 201
    app_id = create_res.json()["id"]

    # Review & approve with attendance sync
    review_res = await client.post(
        f"/leave-applications/{app_id}/review",
        json={
            "status": "approved",
            "reviewed_by_id": str(MGR_ID),
            "review_note": "Approved. Have a great time!",
            "sync_attendance": True,
        },
    )
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "approved"

    # Check allocation used_days
    alloc = sync_db.query(LeaveAllocation).filter_by(id=ALLOC_AL_ID).first()
    assert float(alloc.used_days) == 2.0

    # Check Attendance records were inserted for 2025-05-10 and 2025-05-11
    attendances = (
        sync_db.query(Attendance)
        .filter(Attendance.employee_id == EMP_ID)
        .order_by(Attendance.date.asc())
        .all()
    )
    assert len(attendances) == 2
    for att in attendances:
        assert att.status == AttendanceStatusEnum.ON_LEAVE
        assert "Approved Leave" in (att.note or "")


@pytest.mark.asyncio
async def test_leave_approval_rollback_flow(client: AsyncClient, sync_db):
    """
    1. Create and approve leave application with attendance sync.
    2. Roll back the approved leave application.
    3. Verify status reverted to pending, quota used_days reverted to 0, attendance reverted.
    4. Verify rollback audit columns populated.
    """
    create_res = await client.post(
        "/leave-applications",
        json={
            "business_id": 1,
            "employee_id": str(EMP_ID),
            "leave_type_id": str(LT_AL_ID),
            "start_date": "2025-06-01",
            "end_date": "2025-06-02",
            "total_days": 2,
            "reason": "Personal work",
        },
    )
    assert create_res.status_code == 201
    app_id = create_res.json()["id"]

    await client.post(
        f"/leave-applications/{app_id}/review",
        json={
            "status": "approved",
            "reviewed_by_id": str(MGR_ID),
            "sync_attendance": True,
        },
    )

    # Verify quota used
    alloc = sync_db.query(LeaveAllocation).filter_by(id=ALLOC_AL_ID).first()
    assert float(alloc.used_days) == 2.0

    # Roll back
    rollback_res = await client.post(
        f"/leave-applications/{app_id}/rollback",
        json={
            "reason": "Trip cancelled by employee due to emergency project.",
            "actor_id": str(MGR_ID),
            "force_override": False,
        },
    )
    assert rollback_res.status_code == 200
    data = rollback_res.json()
    assert data["status"] == "pending"
    assert data["rollback_reason"] == "Trip cancelled by employee due to emergency project."
    assert data["rolled_back_at"] is not None

    # Quota restored
    sync_db.refresh(alloc)
    assert float(alloc.used_days) == 0.0

    # Attendance reverted
    remaining_att = sync_db.query(Attendance).filter(Attendance.employee_id == EMP_ID).all()
    assert len(remaining_att) == 0


@pytest.mark.asyncio
async def test_leave_rollback_payroll_lock_guard(client: AsyncClient, sync_db):
    """
    Ensure rollback is strictly blocked if leave dates fall in a LOCKED or PAID PayrollPeriod.
    """
    create_res = await client.post(
        "/leave-applications",
        json={
            "business_id": 1,
            "employee_id": str(EMP_ID),
            "leave_type_id": str(LT_AL_ID),
            "start_date": "2025-08-10",
            "end_date": "2025-08-12",
            "total_days": 3,
            "reason": "Annual leave",
        },
    )
    assert create_res.status_code == 201
    app_id = create_res.json()["id"]

    await client.post(
        f"/leave-applications/{app_id}/review",
        json={
            "status": "approved",
            "reviewed_by_id": str(MGR_ID),
        },
    )

    # Create LOCKED payroll period covering August 2025
    period = PayrollPeriod(
        business_id=1,
        name="August 2025 Payroll",
        start_date=date(2025, 8, 1),
        end_date=date(2025, 8, 31),
        status=PayrollPeriodStatusEnum.LOCKED,
    )
    sync_db.add(period)
    sync_db.commit()

    # Attempt rollback without force_override -> must fail with HTTP 400
    failed_res = await client.post(
        f"/leave-applications/{app_id}/rollback",
        json={
            "reason": "Reverting locked period leave",
            "actor_id": str(MGR_ID),
            "force_override": False,
        },
    )
    assert failed_res.status_code == 400
    assert "locked or paid payroll period" in failed_res.json()["detail"].lower()

    # Attempt rollback WITH force_override -> succeeds
    success_res = await client.post(
        f"/leave-applications/{app_id}/rollback",
        json={
            "reason": "Admin force rollback after audit approval",
            "actor_id": str(MGR_ID),
            "force_override": True,
        },
    )
    assert success_res.status_code == 200
    assert success_res.json()["status"] == "pending"


@pytest.mark.asyncio
async def test_leave_encashment_full_lifecycle(client: AsyncClient, sync_db):
    """
    1. Create encashment request for 5 days of Annual Leave.
    2. Check daily rate (basic 30000 / 30 = 1000) and total amount = 5000.
    3. Review & approve encashment -> allocation encashed_days updated to 5.0.
    4. Disburse payout -> status marked paid with payment method & transaction ref.
    """
    create_res = await client.post(
        "/leave-encashments",
        json={
            "business_id": 1,
            "employee_id": str(EMP_ID),
            "leave_type_id": str(LT_AL_ID),
            "year": 2025,
            "encashable_days": 5.0,
            "reason": "BLA 2006 statutory leave encashment claim",
        },
    )
    assert create_res.status_code == 201
    enc = create_res.json()
    assert enc["status"] == "pending"
    assert float(enc["daily_rate"]) == 1000.0
    assert float(enc["total_amount"]) == 5000.0
    enc_id = enc["id"]

    # Review & approve
    review_res = await client.post(
        f"/leave-encashments/{enc_id}/review",
        json={
            "status": "approved",
            "reviewed_by_id": str(MGR_ID),
            "review_note": "Eligible for encashment per BLA 2006 § 117.",
        },
    )
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "approved"

    # Allocation quota updated
    alloc = sync_db.query(LeaveAllocation).filter_by(id=ALLOC_AL_ID).first()
    assert float(alloc.encashed_days) == 5.0
    # Remaining should be 15 - 5 = 10
    assert float(alloc.remaining_days) == 10.0

    # Disburse
    disburse_res = await client.post(
        f"/leave-encashments/{enc_id}/disburse",
        json={
            "payment_date": "2025-05-15",
            "payment_reference": "TXN-ENC-2025-001",
        },
    )
    assert disburse_res.status_code == 200
    assert disburse_res.json()["status"] == "paid"
    assert disburse_res.json()["payment_reference"] == "TXN-ENC-2025-001"


@pytest.mark.asyncio
async def test_yearly_leave_carry_forward(client: AsyncClient, sync_db):
    """
    1. Preview carry forward from 2025 to 2026.
       - Annual Leave (carry_forward=True, 15 days balance) -> 15 carried.
       - Casual Leave (carry_forward=False, 10 days balance) -> 0 carried, 10 lapsed.
    2. Execute carry forward batch.
    3. Verify 2026 allocation exists with carried_forward = 15.
    4. Verify LeaveCarryForwardLog entry is logged.
    5. Re-executing carry forward is idempotent (updates existing, does not double count).
    """
    # 1. Preview
    preview_res = await client.post(
        "/leave-allocations/carry-forward/preview",
        json={
            "from_year": 2025,
            "to_year": 2026,
            "max_cap": 60.0,
            "business_id": 1,
        },
    )
    assert preview_res.status_code == 200
    pdata = preview_res.json()
    assert pdata["total_employees"] == 2
    assert pdata["total_carried_days"] == 15.0
    assert pdata["total_lapsed_days"] == 10.0

    # 2. Execute
    exec_res = await client.post(
        "/leave-allocations/carry-forward/execute",
        json={
            "from_year": 2025,
            "to_year": 2026,
            "max_cap": 60.0,
            "notes": "Annual statutory year-end carry forward",
            "business_id": 1,
        },
    )
    assert exec_res.status_code == 200
    edata = exec_res.json()
    assert edata["allocations_created_or_updated"] == 4
    assert edata["total_carried_days"] == 15.0

    # 3. Verify target year allocation in DB
    alloc_2026 = (
        sync_db.query(LeaveAllocation)
        .filter(
            LeaveAllocation.employee_id == EMP_ID,
            LeaveAllocation.leave_type_id == LT_AL_ID,
            LeaveAllocation.year == 2026,
        )
        .first()
    )
    assert alloc_2026 is not None
    assert float(alloc_2026.carried_forward) == 15.0

    # 4. Verify log exists
    log = (
        sync_db.query(LeaveCarryForwardLog)
        .filter_by(from_year=2025, to_year=2026)
        .first()
    )
    assert log is not None
    assert float(log.total_days_carried) == 15.0
    assert float(log.total_days_lapsed) == 10.0

    # 5. Idempotent check
    re_exec = await client.post(
        "/leave-allocations/carry-forward/execute",
        json={
            "from_year": 2025,
            "to_year": 2026,
            "max_cap": 60.0,
            "business_id": 1,
        },
    )
    assert re_exec.status_code == 200
    sync_db.refresh(alloc_2026)
    # carried_forward remains 15.0 (not 30.0)
    assert float(alloc_2026.carried_forward) == 15.0
