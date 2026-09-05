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
async def test_get_and_update_payroll_settings(client: AsyncClient):
    # Retrieve default settings for business 1
    response = await client.get("/payroll/settings?business_id=1")
    assert response.status_code == 200
    data = response.json()
    assert data["business_id"] == 1
    assert data["include_attendance"] is True
    assert data["include_leave"] is True
    assert data["include_holidays"] is True
    assert data["include_overtime"] is True
    assert data["deduct_absent_days"] is True
    assert data["standard_hours_per_day"] == 8.0

    # Update settings
    update_payload = {
        "include_attendance": False,
        "include_leave": True,
        "include_holidays": False,
        "include_overtime": False,
        "deduct_absent_days": False,
        "standard_hours_per_day": 7.5,
    }
    put_response = await client.put("/payroll/settings?business_id=1", json=update_payload)
    assert put_response.status_code == 200
    updated_data = put_response.json()
    assert updated_data["include_attendance"] is False
    assert updated_data["include_overtime"] is False
    assert updated_data["standard_hours_per_day"] == 7.5


@pytest.mark.asyncio
async def test_payroll_settings_view(client: AsyncClient):
    response = await client.get("/payroll-settings/manage?business_id=1")
    assert response.status_code == 200
    assert "Payroll Settings" in response.text
    assert "Consider Attendance Records" in response.text
