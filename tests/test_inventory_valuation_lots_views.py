import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.identity.models import User
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


@pytest.fixture
def test_business(sync_db):
    bp = BusinessProfile(name_en="Valuation Business")
    sync_db.add(bp)
    sync_db.commit()
    sync_db.refresh(bp)
    return bp


@pytest.mark.asyncio
async def test_valuation_manage_view_response(client: AsyncClient, test_business):
    res = await client.get(f"/inventory/valuation/manage?business_id={test_business.id}")
    assert res.status_code == 200
    assert "Inventory Valuation &amp; COGS Dashboard" in res.text or "Inventory Valuation" in res.text
    assert "Item Valuation Breakdown" in res.text


@pytest.mark.asyncio
async def test_lots_serials_manage_view_response(client: AsyncClient, test_business):
    res = await client.get(f"/inventory/lots-serials/manage?business_id={test_business.id}")
    assert res.status_code == 200
    assert "Lot, Serial &amp; Expiry Management" in res.text or "Lot, Serial" in res.text
    assert "Tracked Serial Numbers" in res.text


@pytest.mark.asyncio
async def test_lots_and_serials_api_endpoints(client: AsyncClient, test_business):
    business_id = test_business.id

    lots_res = await client.get(f"/inventory/lots?business_id={business_id}")
    assert lots_res.status_code == 200
    assert isinstance(lots_res.json(), list)

    serials_res = await client.get(f"/inventory/serials?business_id={business_id}")
    assert serials_res.status_code == 200
    assert isinstance(serials_res.json(), list)
