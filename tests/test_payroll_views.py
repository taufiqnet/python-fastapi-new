import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.core.deps import get_current_user_optional, get_current_user
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

    dummy_user = User(
        id=1,
        username="admin",
        email="admin@example.com",
        is_active=True,
        is_superuser=True,
        business_id=1,
    )
    dummy_user.get_all_permission_codes = lambda: {
        "hrm:holidays:view", "hrm:holidays:create",
        "hrm:payroll_periods:view", "hrm:payroll_periods:create",
        "hrm:payroll_records:view", "hrm:payroll_records:create",
    }
    dummy_user.has_permission = lambda code: True

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user_optional] = lambda request=None: dummy_user
    app.dependency_overrides[get_current_user] = lambda request=None: dummy_user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_payroll_view_pages(client: AsyncClient):
    # Test Holiday views
    res = await client.get("/holidays/manage")
    assert res.status_code == 200
    assert "Holiday Calendar" in res.text

    res = await client.get("/holidays/create")
    assert res.status_code == 200
    assert "Create Holiday" in res.text

    # Test Period views
    res = await client.get("/payroll-periods/manage")
    assert res.status_code == 200
    assert "Payroll Periods" in res.text

    res = await client.get("/payroll-periods/create")
    assert res.status_code == 200
    assert "Create Payroll Period" in res.text

    # Test Record views
    res = await client.get("/payroll-records/manage")
    assert res.status_code == 200
    assert "Payroll Payslips" in res.text

    res = await client.get("/payroll-records/create")
    assert res.status_code == 200
    assert "Generate Payslip" in res.text
