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
def test_business_a(sync_db):
    bp = BusinessProfile(name_en="Business Alpha")
    sync_db.add(bp)
    sync_db.commit()
    sync_db.refresh(bp)
    return bp


@pytest.fixture
def test_business_b(sync_db):
    bp = BusinessProfile(name_en="Business Beta")
    sync_db.add(bp)
    sync_db.commit()
    sync_db.refresh(bp)
    return bp


@pytest.fixture
def superuser(sync_db):
    user = User(
        email="superuser@example.com",
        username="superuser",
        hashed_password="hashedpassword",
        is_superuser=True,
        is_active=True,
    )
    sync_db.add(user)
    sync_db.commit()
    sync_db.refresh(user)
    return user


@pytest.fixture
def normal_user_a(sync_db, test_business_a):
    user = User(
        email="usera@example.com",
        username="usera",
        hashed_password="hashedpassword",
        is_superuser=False,
        is_active=True,
        business_id=test_business_a.id,
    )
    sync_db.add(user)
    sync_db.commit()
    sync_db.refresh(user)
    return user


@pytest.mark.asyncio
async def test_uom_manage_view_response(client: AsyncClient, test_business_a):
    res = await client.get(f"/inventory/uom/manage?business_id={test_business_a.id}")
    assert res.status_code == 200
    assert "Units of Measure &amp; Conversions" in res.text or "Units of Measure" in res.text
    assert "Quantity Conversion Calculation Tool" in res.text


@pytest.mark.asyncio
async def test_items_master_manage_view_response(client: AsyncClient, test_business_a):
    res = await client.get(f"/inventory/items-master/manage?business_id={test_business_a.id}")
    assert res.status_code == 200
    assert "Item Master Catalog" in res.text
    assert "Stock Items" in res.text
