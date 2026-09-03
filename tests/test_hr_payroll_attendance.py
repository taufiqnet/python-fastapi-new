import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

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

    app.dependency_overrides[get_db] = _override_get_db
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
