import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.database import get_async_db
from app.main import app
from app.models.business import BusinessProfile  # noqa
from app.models.task import Task  # noqa
from app.models.user import (  # noqa
    Address,
    AddressType,
    CustomerProfile,
    Role,
    User,
    UserRole,
    VendorProfile,
)
from app.models.user import Base as UserBase

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


@pytest_asyncio.fixture
async def async_db():
    async with engine.begin() as conn:
        await conn.run_sync(UserBase.metadata.create_all)

    async with TestingSessionLocal() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(UserBase.metadata.drop_all)


@pytest_asyncio.fixture
async def client(async_db):
    async def _override_get_async_db():
        yield async_db

    app.dependency_overrides[get_async_db] = _override_get_async_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_register_and_login_user(client: AsyncClient):
    # Register
    reg_response = await client.post(
        "/auth/register",
        json={
            "username": "testuser",
            "email": "testuser@example.com",
            "password": "secretpassword",
        },
    )
    assert reg_response.status_code == 201
    user_data = reg_response.json()
    assert user_data["username"] == "testuser"
    assert user_data["email"] == "testuser@example.com"
    assert len(user_data["roles"]) == 1
    assert user_data["roles"][0]["name"] == "customer"
    assert user_data["customer_profile"] is not None

    # Login
    login_response = await client.post(
        "/auth/login",
        data={
            "username": "testuser",
            "password": "secretpassword",
        },
    )
    assert login_response.status_code == 200
    token_data = login_response.json()
    assert "access_token" in token_data

    headers = {"Authorization": f"Bearer {token_data['access_token']}"}

    # Get /auth/me
    me_response = await client.get("/auth/me", headers=headers)
    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["username"] == "testuser"

    # Add Address
    addr_response = await client.post(
        "/auth/me/addresses",
        headers=headers,
        json={
            "type": AddressType.SHIPPING.value,
            "is_default": True,
            "recipient_name": "John Doe",
            "phone": "+1234567890",
            "building_no": "123",
            "street": "Main St",
            "city": "Metropolis",
            "state": "NY",
            "country": "USA",
            "zip_code": "10001",
        },
    )
    assert addr_response.status_code == 201
    addr_data = addr_response.json()
    assert addr_data["recipient_name"] == "John Doe"
    address_id = addr_data["id"]

    # Create Vendor Profile
    vendor_response = await client.post(
        "/auth/me/vendor-profile",
        headers=headers,
        json={"business_profile_id": 42},
    )
    assert vendor_response.status_code == 201
    vendor_data = vendor_response.json()
    assert vendor_data["business_profile_id"] == 42
    assert vendor_data["status"] == "pending"

    # Verify updated profile on /auth/me (role vendor added)
    me_response_2 = await client.get("/auth/me", headers=headers)
    assert me_response_2.status_code == 200
    me_data_2 = me_response_2.json()
    role_names = [r["name"] for r in me_data_2["roles"]]
    assert "vendor" in role_names
    assert me_data_2["vendor_profile"] is not None
    assert len(me_data_2["addresses"]) == 1

    # Delete Address
    del_addr_response = await client.delete(
        f"/auth/me/addresses/{address_id}", headers=headers
    )
    assert del_addr_response.status_code == 204
