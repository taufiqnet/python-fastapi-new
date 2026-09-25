import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
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
    from app.core.deps import get_current_user, get_current_user_optional

    admin_user = User(
        id=1,
        username="admin",
        email="admin@example.com",
        is_superuser=True,
        is_active=True,
        business_id=1,
    )

    def _override_get_db():
        yield sync_db

    def _override_user(*args, **kwargs):
        return admin_user

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = _override_user
    app.dependency_overrides[get_current_user_optional] = _override_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_customer_creation_and_phone_validation(client: AsyncClient):
    # 1. Successful customer creation
    payload1 = {
        "first_name": "John",
        "last_name": "Doe",
        "phone": "+8801700112233",
        "email": "john.doe@example.com",
        "address": "123 Main Street, Dhaka",
        "business_id": 1,
        "is_active": True,
    }

    resp1 = await client.post("/customers/", json=payload1)
    assert resp1.status_code == 201, resp1.text
    data1 = resp1.json()
    assert data1["first_name"] == "John"
    assert data1["phone"] == "+8801700112233"
    assert data1["full_name"] == "John Doe"

    # 2. Duplicate phone number in same business profile -> Fail validation
    payload_dup = {
        "first_name": "Jane",
        "last_name": "Smith",
        "phone": "+8801700112233",
        "email": "jane.smith@example.com",
        "address": "456 Side Street, Dhaka",
        "business_id": 1,
        "is_active": True,
    }

    resp_dup = await client.post("/customers/", json=payload_dup)
    assert resp_dup.status_code == 400
    err_data = resp_dup.json()
    assert "A customer with this phone number already exists." in err_data["detail"]

    # 3. Same phone number in DIFFERENT business profile -> Allowed
    payload_other_biz = {
        "first_name": "Other",
        "last_name": "User",
        "phone": "+8801700112233",
        "email": "other@example.com",
        "address": "789 Other Street, Chittagong",
        "business_id": 2,
        "is_active": True,
    }

    resp_other = await client.post("/customers/", json=payload_other_biz)
    assert resp_other.status_code == 201, resp_other.text

    # 4. Missing required fields (phone missing/empty) -> Fail validation
    payload_missing = {
        "first_name": "Invalid",
        "last_name": "Customer",
        "phone": "   ",
        "address": "Some address",
        "business_id": 1,
    }

    resp_missing = await client.post("/customers/", json=payload_missing)
    assert resp_missing.status_code == 400
