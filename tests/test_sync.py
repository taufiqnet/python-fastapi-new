import uuid
from datetime import datetime, timezone
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_async_db
from app.main import app
from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile
from app.core.deps import get_current_user
from app.modules.ecommerce.orders.models import Order
from app.modules.finance.models import SalesInvoice

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


@pytest_asyncio.fixture
async def async_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        # Seed test business and user
        biz = BusinessProfile(id=1, name_en="Retail Business", is_active=True)
        session.add(biz)

        user = User(
            id=1,
            username="offline_user",
            email="user@retail.com",
            password_hash="fakehash",
            is_superuser=False,
            can_use_offline_mode=True,
            is_active=True,
            business_id=1,
        )
        session.add(user)
        await session.commit()

        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client(async_db):
    async def _override_get_async_db():
        yield async_db

    user = (await async_db.execute(
        User.__table__.select().where(User.username == "offline_user")
    )).first()

    # Re-query ORM User object
    from sqlalchemy import select
    user_obj = (await async_db.execute(select(User).where(User.id == 1))).scalar_one()

    def _override_get_current_user():
        return user_obj

    app.dependency_overrides[get_async_db] = _override_get_async_db
    app.dependency_overrides[get_current_user] = _override_get_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_sync_push_orders_and_invoices(client: AsyncClient, async_db):
    order_uuid = str(uuid.uuid4())
    invoice_uuid = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    push_payload = {
        "mutations": [
            {
                "entity": "orders",
                "action": "CREATE",
                "client_uuid": order_uuid,
                "client_updated_at": now_iso,
                "payload": {
                    "order_number": "ORD-OFFLINE-001",
                    "total_amount": 150.00,
                    "payment_status": "paid",
                    "fulfillment_status": "fulfilled",
                    "guest_email": "walkin@customer.com",
                },
            },
            {
                "entity": "invoices",
                "action": "CREATE",
                "client_uuid": invoice_uuid,
                "client_updated_at": now_iso,
                "payload": {
                    "invoice_number": "INV-OFFLINE-001",
                    "buyer_name": "Walk-in Customer",
                    "total_payable": 150.00,
                    "status": "paid",
                },
            },
        ]
    }

    res = await client.post("/api/v1/sync/push", json=push_payload)
    assert res.status_code == 200
    data = res.json()
    assert "synced" in data
    assert len(data["synced"]) == 2

    statuses = {item["entity"]: item["status"] for item in data["synced"]}
    assert statuses["orders"] == "created"
    assert statuses["invoices"] == "created"

    # Verify orders in DB
    from sqlalchemy import select
    order_db = (await async_db.execute(select(Order).where(Order.client_uuid == uuid.UUID(order_uuid)))).scalar_one_or_none()
    assert order_db is not None
    assert order_db.order_number == "ORD-OFFLINE-001"
    assert float(order_db.total_amount) == 150.00

    # Verify invoice in DB
    invoice_db = (await async_db.execute(select(SalesInvoice).where(SalesInvoice.client_uuid == uuid.UUID(invoice_uuid)))).scalar_one_or_none()
    assert invoice_db is not None
    assert invoice_db.invoice_number == "INV-OFFLINE-001"
    assert invoice_db.buyer_name == "Walk-in Customer"


@pytest.mark.asyncio
async def test_sync_pull_no_tasks(client: AsyncClient, async_db):
    res = await client.get("/api/v1/sync/pull")
    assert res.status_code == 200
    data = res.json()
    assert "timestamp" in data
    assert "changes" in data
    changes = data["changes"]

    # Verify 'orders' and 'invoices' are in changes, but 'tasks' is NOT
    assert "orders" in changes
    assert "invoices" in changes
    assert "tasks" not in changes


@pytest.mark.asyncio
async def test_sync_push_unsupported_task_entity(client: AsyncClient, async_db):
    task_uuid = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    push_payload = {
        "mutations": [
            {
                "entity": "tasks",
                "action": "CREATE",
                "client_uuid": task_uuid,
                "client_updated_at": now_iso,
                "payload": {
                    "title": "Legacy Task",
                },
            }
        ]
    }

    res = await client.post("/api/v1/sync/push", json=push_payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["synced"]) == 1
    assert data["synced"][0]["status"] == "skipped"
    assert "Unsupported entity type" in data["synced"][0]["detail"]
