import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.tenancy.models import BusinessProfile
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
    biz = BusinessProfile(
        id=1,
        legal_name="Test Company",
        name_en="Test Company",
        cr_number="1234567890",
        vat_number="300000000000003",
    )
    db.add(biz)
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

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_attendance_views(client: AsyncClient):
    # 1. Manage view page
    manage_resp = await client.get("/attendance/manage")
    assert manage_resp.status_code == 200
    assert "Attendance Records" in manage_resp.text

    # 2. Create page view
    create_page_resp = await client.get("/attendance/create")
    assert create_page_resp.status_code == 200
    assert "Log Attendance" in create_page_resp.text

    # 3. Create employee & log attendance record
    emp_res = await client.post(
        "/employees",
        json={
            "first_name": "Bob",
            "last_name": "Jones",
            "employee_id": "EMP-200",
            "work_email": "bob.jones@example.com",
            "is_active": True,
            "business_id": 1,
        },
    )
    assert emp_res.status_code == 201
    emp_id = emp_res.json()["id"]

    att_res = await client.post(
        "/attendance",
        json={
            "business_id": 1,
            "employee_id": emp_id,
            "date": "2025-01-20",
            "status": "present",
            "check_in": "09:00:00",
            "check_out": "17:00:00",
            "work_hours": 8.0,
            "overtime_hours": 0.0,
            "source": "manual",
        },
    )
    assert att_res.status_code == 201
    att_id = att_res.json()["id"]

    # 4. Detail view page
    detail_resp = await client.get(f"/attendance/detail/{att_id}")
    assert detail_resp.status_code == 200
    assert "Attendance Record Details" in detail_resp.text
    assert "Bob Jones" in detail_resp.text

    # 5. Edit view page
    edit_resp = await client.get(f"/attendance/edit/{att_id}")
    assert edit_resp.status_code == 200
    assert "Edit Attendance Record" in edit_resp.text
