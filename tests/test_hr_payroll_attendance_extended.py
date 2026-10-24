import uuid
from datetime import date, datetime, time, timedelta

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user_optional
from app.core.identity.models import User
from app.database import Base, get_db
from app.main import app

sync_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
SyncTestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=sync_engine
)


@pytest.fixture
def sync_db():
    Base.metadata.create_all(bind=sync_engine)
    db = SyncTestingSessionLocal()
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
        email="admin@example.com",
        is_active=True,
        is_superuser=True,
        business_id=1,
    )

    def _override_get_current_user(request=None):
        return dummy_user

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user_optional] = _override_get_current_user

    # Create dummy business profile
    from app.core.tenancy.models import BusinessProfile

    biz = BusinessProfile(id=1, name_en="ProERP Test Inc", is_active=True)
    sync_db.add(biz)
    sync_db.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_attendance_settings_get_and_update(client: AsyncClient):
    # 1. Get default settings
    res = await client.get("/attendance/settings?business_id=1")
    assert res.status_code == 200
    data = res.json()
    assert data["enable_biometric_device"] is False
    assert data["grace_period_minutes"] == 15

    # 2. Update settings
    update_payload = {
        "enable_biometric_device": True,
        "auto_sync_device_logs": True,
        "grace_period_minutes": 20,
        "standard_daily_work_hours": 8.0,
    }
    update_res = await client.put(
        "/attendance/settings?business_id=1", json=update_payload
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["enable_biometric_device"] is True
    assert updated_data["grace_period_minutes"] == 20


@pytest.mark.asyncio
async def test_biometric_device_lifecycle_and_ping(client: AsyncClient):
    # 1. Register Device
    device_payload = {
        "business_id": 1,
        "device_name": "Main Gate Terminal - ZKTeco MB360",
        "device_brand": "zkteco",
        "device_type": "face_recognition",
        "ip_address": "192.168.1.201",
        "port": 4370,
        "comm_key": "0",
        "serial_number": "ZK889104",
    }
    res = await client.post("/attendance/devices", json=device_payload)
    assert res.status_code == 201
    dev = res.json()
    dev_id = dev["id"]
    assert dev["device_name"] == "Main Gate Terminal - ZKTeco MB360"
    assert dev["status"] == "online"

    # 2. Ping Device
    ping_res = await client.post(f"/attendance/devices/{dev_id}/ping")
    assert ping_res.status_code == 200
    assert ping_res.json()["status"] == "online"

    # 3. List Devices
    list_res = await client.get("/attendance/devices?business_id=1")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1


@pytest.mark.asyncio
async def test_raw_attendance_push_and_daily_sync(client: AsyncClient, sync_db):
    # 1. Create an Employee
    from app.modules.hr_payroll.employees.models import Employee

    emp = Employee(
        business_id=1,
        first_name="Rahim",
        last_name="Uddin",
        employee_id="EMP-001",
        work_email="rahim@example.com",
        biometric_user_id="BIO-101",
        is_active=True,
    )
    sync_db.add(emp)
    sync_db.commit()
    sync_db.refresh(emp)

    # 2. Push raw attendance logs (Check In at 09:05, Check Out at 17:35)
    today = date(2026, 10, 24)
    dt_in = datetime.combine(today, time(9, 5)).isoformat()
    dt_out = datetime.combine(today, time(17, 35)).isoformat()

    push_payload = {
        "business_id": 1,
        "punches": [
            {
                "business_id": 1,
                "biometric_user_id": "BIO-101",
                "employee_id": str(emp.id),
                "punch_time": dt_in,
                "punch_state": "check_in",
                "verification_type": "face",
            },
            {
                "business_id": 1,
                "biometric_user_id": "BIO-101",
                "employee_id": str(emp.id),
                "punch_time": dt_out,
                "punch_state": "check_out",
                "verification_type": "face",
            },
        ],
    }
    push_res = await client.post("/attendance/raw-logs/push", json=push_payload)
    assert push_res.status_code == 200
    assert push_res.json()["ingested_count"] == 2

    # Verify logs in table
    logs_res = await client.get(
        f"/attendance/raw-logs?business_id=1&employee_id={emp.id}"
    )
    assert logs_res.status_code == 200
    assert len(logs_res.json()) == 2

    # 3. Trigger daily sync
    sync_res = await client.post(
        f"/attendance/sync-daily?business_id=1&target_date={today.isoformat()}"
    )
    assert sync_res.status_code == 200
    assert sync_res.json()["consolidated_records"] >= 1

    # 4. Verify consolidated Attendance record
    att_res = await client.get(
        f"/attendance?business_id=1&employee_id={emp.id}&date={today.isoformat()}"
    )
    assert att_res.status_code == 200
    records = att_res.json()
    assert len(records) == 1
    assert records[0]["status"] == "present"
    assert records[0]["work_hours"] == 8.5
    assert records[0]["source"] == "biometric"


@pytest.mark.asyncio
async def test_attendance_regularization_workflow(client: AsyncClient, sync_db):
    from app.modules.hr_payroll.employees.models import Employee

    emp = Employee(
        business_id=1,
        first_name="Karim",
        last_name="Mia",
        employee_id="EMP-002",
        work_email="karim@example.com",
        is_active=True,
    )
    sync_db.add(emp)
    sync_db.commit()
    sync_db.refresh(emp)

    target_d = date(2026, 10, 20)

    # 1. Submit regularization
    reg_payload = {
        "business_id": 1,
        "employee_id": str(emp.id),
        "attendance_date": target_d.isoformat(),
        "request_type": "missed_in",
        "requested_check_in": "09:00:00",
        "requested_check_out": "17:00:00",
        "reason": "Terminal was down during morning entry",
    }
    create_res = await client.post(
        "/attendance/regularizations", json=reg_payload
    )
    assert create_res.status_code == 201
    reg_data = create_res.json()
    reg_id = reg_data["id"]
    assert reg_data["status"] == "pending"

    # 2. Review and approve
    review_res = await client.patch(
        f"/attendance/regularizations/{reg_id}/review",
        json={"status": "approved", "review_remarks": "Approved by HR"},
    )
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "approved"

    # 3. Check Attendance record was updated to PRESENT
    att_res = await client.get(
        f"/attendance?business_id=1&employee_id={emp.id}&date={target_d.isoformat()}"
    )
    assert att_res.status_code == 200
    records = att_res.json()
    assert len(records) == 1
    assert records[0]["status"] == "present"
    assert records[0]["source"] == "manual"
    assert "Regularization Approved" in records[0]["note"]


@pytest.mark.asyncio
async def test_outdoor_duty_and_overtime_workflow(client: AsyncClient, sync_db):
    from app.modules.hr_payroll.employees.models import Employee

    emp = Employee(
        business_id=1,
        first_name="Fatima",
        last_name="Begum",
        employee_id="EMP-003",
        work_email="fatima@example.com",
        is_active=True,
    )
    sync_db.add(emp)
    sync_db.commit()
    sync_db.refresh(emp)

    od_date = date(2026, 10, 22)

    # 1. Outdoor Duty Application
    od_payload = {
        "business_id": 1,
        "employee_id": str(emp.id),
        "start_date": od_date.isoformat(),
        "end_date": od_date.isoformat(),
        "is_full_day": True,
        "visit_type": "client_meeting",
        "destination_or_client": "Grameenphone HQ",
        "purpose": "ERP Integration Architecture Workshop",
    }
    od_res = await client.post("/attendance/outdoor-duties", json=od_payload)
    assert od_res.status_code == 201
    od_id = od_res.json()["id"]

    # Approve Outdoor Duty
    od_review = await client.patch(
        f"/attendance/outdoor-duties/{od_id}/review",
        json={"status": "approved", "review_remarks": "Authorized"},
    )
    assert od_review.status_code == 200
    assert od_review.json()["status"] == "approved"

    # 2. Overtime Application
    ot_date = date(2026, 10, 23)
    ot_payload = {
        "business_id": 1,
        "employee_id": str(emp.id),
        "ot_date": ot_date.isoformat(),
        "start_time": "17:30:00",
        "end_time": "19:30:00",
        "claimed_hours": 2.0,
        "purpose": "Urgent deployment migration",
    }
    ot_res = await client.post("/attendance/overtime", json=ot_payload)
    assert ot_res.status_code == 201
    ot_id = ot_res.json()["id"]

    # Approve Overtime
    ot_review = await client.patch(
        f"/attendance/overtime/{ot_id}/review",
        json={
            "status": "approved",
            "approved_hours": 2.0,
            "manager_remarks": "Approved per BLA 2006",
        },
    )
    assert ot_review.status_code == 200
    assert ot_review.json()["approved_hours"] == 2.0


@pytest.mark.asyncio
async def test_period_approval_and_monthly_summary(client: AsyncClient, sync_db):
    # 1. Monthly Summary
    sum_res = await client.get(
        "/attendance/monthly-summary?business_id=1&year=2026&month=10"
    )
    assert sum_res.status_code == 200
    summary = sum_res.json()
    assert summary["year"] == 2026
    assert summary["month"] == 10

    # 2. Period Approval Creation
    appr_payload = {
        "business_id": 1,
        "year": 2026,
        "month": 10,
        "comments": "Audited by Head of HR",
    }
    appr_res = await client.post(
        "/attendance/period-approvals", json=appr_payload
    )
    assert appr_res.status_code == 201
    appr_id = appr_res.json()["id"]

    # 3. Lock Period
    lock_res = await client.post(
        f"/attendance/period-approvals/{appr_id}/lock?comments=Locked+for+payroll"
    )
    assert lock_res.status_code == 200
    assert lock_res.json()["status"] == "locked"

    # 4. Excel Export
    excel_res = await client.get(
        "/attendance/monthly-summary/export-excel?business_id=1&year=2026&month=10"
    )
    assert excel_res.status_code == 200
    assert (
        excel_res.headers["content-type"]
        == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert len(excel_res.content) > 1000
