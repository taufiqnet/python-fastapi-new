import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.core.deps import get_current_user_optional
from app.core.identity.models import User

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

    from app.modules.hr_payroll.attendance.router import attendance_service
    orig_bg_func = attendance_service.process_import_job_background

    def _sync_bg_wrapper(*args, **kwargs):
        kwargs["session_factory"] = lambda: sync_db
        orig_bg_func(*args, **kwargs)

    attendance_service.process_import_job_background = _sync_bg_wrapper

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
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_attendance_crud_and_calculation(client: AsyncClient):
    # 1. Create Employee
    emp_payload = {
        "first_name": "Alice",
        "last_name": "Smith",
        "employee_id": "EMP-100",
        "work_email": "alice.smith@example.com",
        "phone": "+1234567890",
        "is_active": True,
        "business_id": 1,
    }
    emp_res = await client.post("/employees", json=emp_payload)
    assert emp_res.status_code == 201, emp_res.text
    employee_id = emp_res.json()["id"]

    # 2. Log Attendance with auto work hours calculation
    # (09:00:00 to 18:00:00 -> 9 hours work, 1 OT)
    att_payload = {
        "business_id": 1,
        "employee_id": employee_id,
        "date": "2025-01-15",
        "status": "present",
        "check_in": "09:00:00",
        "check_out": "18:00:00",
        "source": "manual",
        "note": "Regular shift",
    }
    res = await client.post("/attendance", json=att_payload)
    assert res.status_code == 201, res.text
    att_data = res.json()
    att_id = att_data["id"]
    assert att_data["work_hours"] == 9.0
    assert att_data["overtime_hours"] == 1.0
    assert att_data["status"] == "present"

    # 3. Duplicate attendance log on same date (should fail)
    dup_res = await client.post("/attendance", json=att_payload)
    assert dup_res.status_code == 400

    # 4. Get List and Detail
    get_res = await client.get(f"/attendance/{att_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == att_id

    list_res = await client.get("/attendance?business_id=1&status=present")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # 5. Update Attendance Record
    upd_res = await client.put(
        f"/attendance/{att_id}",
        json={
            "status": "late",
            "check_in": "09:30:00",
            "check_out": "17:30:00",
            "note": "Late due to subway delay",
        },
    )
    assert upd_res.status_code == 200, upd_res.text
    upd_data = upd_res.json()
    assert upd_data["status"] == "late"
    assert upd_data["work_hours"] == 8.0
    assert upd_data["overtime_hours"] == 0.0

    # 6. Delete Attendance Record
    del_res = await client.delete(f"/attendance/{att_id}")
    assert del_res.status_code == 204

    verify_res = await client.get(f"/attendance/{att_id}")
    assert verify_res.status_code == 404


@pytest.mark.asyncio
async def test_excel_template_and_import(client: AsyncClient):
    # 1. Create Employee
    emp_payload = {
        "first_name": "Bob",
        "last_name": "Marley",
        "employee_id": "EMP-200",
        "work_email": "bob.marley@example.com",
        "phone": "+1234567891",
        "is_active": True,
        "business_id": 1,
    }
    emp_res = await client.post("/employees", json=emp_payload)
    assert emp_res.status_code == 201

    # 2. Download template
    tpl_res = await client.get("/attendance/template-excel?business_id=1")
    assert tpl_res.status_code == 200
    assert "spreadsheetml" in tpl_res.headers["content-type"]

    # 3. Create Excel in memory and import
    from io import BytesIO
    import openpyxl

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Employee ID", "Employee Name", "Date", "Status", "Check In", "Check Out", "Work Hours", "OT Hours", "Note"])
    ws.append(["EMP-200", "Bob Marley", "2025-01-20", "present", "09:00", "18:00", 8.0, 1.0, "Excel Import Day 1"])
    ws.append(["EMP-200", "Bob Marley", "2025-01-21", "late", "09:30", "18:00", 7.5, 0.0, "Excel Import Day 2"])

    out = BytesIO()
    wb.save(out)
    excel_bytes = out.getvalue()

    files = {"file": ("monthly_attendance.xlsx", excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    import_res = await client.post("/attendance/import-excel?business_id=1", files=files)
    assert import_res.status_code == 202, import_res.text
    imp_data = import_res.json()
    assert "job_id" in imp_data
    job_id = imp_data["job_id"]

    # 4. Check status
    status_res = await client.get(f"/attendance/import/{job_id}/status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["job_id"] == job_id
    assert status_data["success_count"] == 2
    assert status_data["error_count"] == 0

    # 5. Verify imported records via GET
    records_res = await client.get("/attendance?business_id=1")
    assert records_res.status_code == 200
    records = records_res.json()
    assert len(records) == 2

    # 6. Test duplicate import rejection (both DB duplicate and in-file duplicate)
    wb_dup = openpyxl.Workbook()
    ws_dup = wb_dup.active
    ws_dup.append(["Employee ID", "Employee Name", "Date", "Status", "Check In", "Check Out", "Work Hours", "OT Hours", "Note"])
    # "2025-01-20" already exists in DB for EMP-200 -> should be rejected as duplicate record
    ws_dup.append(["EMP-200", "Bob Marley", "2025-01-20", "present", "09:00", "18:00", 8.0, 1.0, "Duplicate DB"])
    # New date "2025-01-22" repeated twice in file -> first succeeds, second rejected as duplicate record
    ws_dup.append(["EMP-200", "Bob Marley", "2025-01-22", "present", "09:00", "18:00", 8.0, 1.0, "New Row 1"])
    ws_dup.append(["EMP-200", "Bob Marley", "2025-01-22", "present", "09:00", "18:00", 8.0, 1.0, "New Row 2 In-file Duplicate"])
    # Non-existent employee -> rejected
    ws_dup.append(["NON-EXISTENT", "Unknown", "2025-01-22", "present", "09:00", "18:00", 8.0, 1.0, "Bad Emp"])

    out_dup = BytesIO()
    wb_dup.save(out_dup)

    files_dup = {"file": ("dup_attendance.xlsx", out_dup.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    dup_import_res = await client.post("/attendance/import-excel?business_id=1", files=files_dup)
    assert dup_import_res.status_code == 202
    dup_job_id = dup_import_res.json()["job_id"]

    dup_status_res = await client.get(f"/attendance/import/{dup_job_id}/status")
    assert dup_status_res.status_code == 200
    dup_status = dup_status_res.json()
    assert dup_status["success_count"] == 1
    assert dup_status["error_count"] == 3

    # Check errors CSV
    csv_res = await client.get(f"/attendance/import/{dup_job_id}/errors-csv")
    assert csv_res.status_code == 200
    csv_text = csv_res.text
    assert "duplicate record" in csv_text
    assert "Employee with ID 'NON-EXISTENT' not found" in csv_text

    # Test cancel endpoint
    cancel_res = await client.post(f"/attendance/import/{dup_job_id}/cancel")
    assert cancel_res.status_code == 200
    assert cancel_res.json()["cancelled"] is True


@pytest.mark.asyncio
async def test_attendance_tenant_isolation(client: AsyncClient, sync_db):
    from app.core.tenancy.models import BusinessProfile

    # 1. Setup Business B (id=2)
    biz_b = BusinessProfile(
        id=2,
        legal_name="Business B Ltd",
        name_en="Business B",
        cr_number="7777777777",
        vat_number="300000000000007",
    )
    sync_db.add(biz_b)
    sync_db.commit()

    # Create Employee in Business A (id=1)
    emp_a_res = await client.post(
        "/employees",
        json={
            "first_name": "Alice",
            "last_name": "BizA",
            "employee_id": "EMP-ATT-A",
            "work_email": "alice.att@biz-a.com",
            "business_id": 1,
        },
    )
    assert emp_a_res.status_code == 201
    emp_a_id = emp_a_res.json()["id"]

    # Create Attendance in Business A
    att_a_res = await client.post(
        "/attendance",
        json={
            "business_id": 1,
            "employee_id": emp_a_id,
            "date": "2025-02-01",
            "status": "present",
        },
    )
    assert att_a_res.status_code == 201
    att_a_id = att_a_res.json()["id"]

    # Create Employee in Business B (id=2)
    emp_b_res = await client.post(
        "/employees",
        json={
            "first_name": "Bob",
            "last_name": "BizB",
            "employee_id": "EMP-ATT-B",
            "work_email": "bob.att@biz-b.com",
            "business_id": 2,
        },
    )
    assert emp_b_res.status_code == 201
    emp_b_id = emp_b_res.json()["id"]

    # Create Attendance in Business B
    att_b_res = await client.post(
        "/attendance",
        json={
            "business_id": 2,
            "employee_id": emp_b_id,
            "date": "2025-02-01",
            "status": "present",
        },
    )
    assert att_b_res.status_code == 201
    att_b_id = att_b_res.json()["id"]

    # 2. Switch to regular user assigned to Business A
    user_a = User(
        id=20,
        username="user_att_a",
        email="user.att@biz-a.com",
        is_active=True,
        is_superuser=False,
        business_id=1,
    )
    user_a.get_all_permission_codes = lambda: {
        "hrm:attendance:view",
        "hrm:attendance:create",
        "hrm:attendance:update",
        "hrm:attendance:delete",
    }
    user_a.has_permission = lambda code: code in {
        "hrm:attendance:view",
        "hrm:attendance:create",
        "hrm:attendance:update",
        "hrm:attendance:delete",
    }
    user_a.business_profile = None

    app.dependency_overrides[get_current_user_optional] = lambda request=None: user_a
    app.dependency_overrides[get_db] = lambda: sync_db

    # A) GET list attempting business_id=2 should ignore query param and return only Business A attendance
    list_res = await client.get("/attendance?business_id=2")
    assert list_res.status_code == 200
    records = list_res.json()
    record_ids = [r["id"] for r in records]
    assert att_a_id in record_ids
    assert att_b_id not in record_ids

    # B) GET attendance in Business B by ID returns 404
    get_res = await client.get(f"/attendance/{att_b_id}")
    assert get_res.status_code == 404

    # C) PUT attendance in Business B by ID returns 404
    put_res = await client.put(f"/attendance/{att_b_id}", json={"note": "Hacked"})
    assert put_res.status_code == 404

    # D) DELETE attendance in Business B by ID returns 404
    del_res = await client.delete(f"/attendance/{att_b_id}")
    assert del_res.status_code == 404

    # E) Create attendance with business_id=2 in payload overrides to 1
    create_res = await client.post(
        "/attendance",
        json={
            "business_id": 2,
            "employee_id": emp_a_id,
            "date": "2025-02-02",
            "status": "present",
        },
    )
    assert create_res.status_code == 201
    assert create_res.json()["business_id"] == 1

    # 3. Superuser access checks
    superuser = User(id=1, username="admin", email="admin@example.com", is_active=True, is_superuser=True, business_id=1)
    app.dependency_overrides[get_current_user_optional] = lambda request=None: superuser

    su_list_res = await client.get("/attendance?business_id=2")
    assert su_list_res.status_code == 200
    su_records = su_list_res.json()
    su_record_ids = [r["id"] for r in su_records]
    assert att_b_id in su_record_ids
    assert att_a_id not in su_record_ids

    su_get_res = await client.get(f"/attendance/{att_b_id}")
    assert su_get_res.status_code == 200
    assert su_get_res.json()["id"] == att_b_id
