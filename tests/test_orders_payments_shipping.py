import uuid
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.common.enums import Status
from app.database import Base, get_db
from app.main import app
from app.modules.products.models import Product, ProductVariant

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

async_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
AsyncTestingSessionLocal = sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)

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
async def test_orders_payments_shipping_flow(client: AsyncClient, sync_db):
    # 1. Setup Product Variant
    product = Product(
        title="Order Test Product", slug="order-test", status=Status.ACTIVE
    )
    sync_db.add(product)
    sync_db.commit()

    variant = ProductVariant(
        product_id=product.id, sku="SKU-ORDER", price=Decimal("150.00")
    )
    sync_db.add(variant)
    sync_db.commit()

    user_id = str(uuid.uuid4())

    # 2. Create Order
    order_resp = await client.post(
        "/orders",
        json={
            "business_id": 1,
            "user_id": user_id,
            "items": [{"variant_id": str(variant.id), "quantity": 2}],
            "shipping_address": {
                "recipient_name": "Alice Smith",
                "street": "456 Market St",
                "city": "San Francisco",
                "country": "USA",
            },
        },
    )
    assert order_resp.status_code == 201
    order_data = order_resp.json()
    order_id = order_data["id"]
    assert order_data["total_amount"] == 300.00
    assert order_data["status"] == "pending"

    # 3. Update Order Status
    upd_status = await client.put(
        f"/orders/{order_id}/status?business_id=1",
        json={"status": "processing", "note": "Payment received"},
    )
    assert upd_status.status_code == 200
    assert upd_status.json()["status"] == "processing"

    # 4. Create Payment Intent & Capture
    payment_resp = await client.post(
        "/payments",
        json={
            "business_id": 1,
            "order_id": order_id,
            "provider": "stripe",
            "amount": 300.00,
        },
    )
    assert payment_resp.status_code == 201
    payment_id = payment_resp.json()["id"]

    cap_resp = await client.post(f"/payments/{payment_id}/capture?business_id=1")
    assert cap_resp.status_code == 200
    assert cap_resp.json()["status"] == "captured"

    # 5. Shipping Zone & Quote & Shipment
    zone_resp = await client.post(
        "/shipping/zones",
        json={
            "business_id": 1,
            "name": "US Domestic",
            "region": "USA",
            "rates": [{"min_weight": 0.0, "max_weight": 10.0, "base_cost": 15.00}],
        },
    )
    assert zone_resp.status_code == 201

    quote_resp = await client.post(
        "/shipping/quote",
        json={"business_id": 1, "region": "USA", "weight": 2.5},
    )
    assert quote_resp.status_code == 200
    assert quote_resp.json()["base_cost"] == 15.00

    shipment_resp = await client.post(
        "/shipping/shipments",
        json={
            "business_id": 1,
            "order_id": order_id,
            "carrier": "FedEx",
            "tracking_number": "TRACK123456",
        },
    )
    assert shipment_resp.status_code == 201
    shipment_id = shipment_resp.json()["id"]
    assert shipment_resp.json()["status"] == "label_created"

    track_resp = await client.put(
        f"/shipping/shipments/{shipment_id}/tracking?business_id=1",
        json={"status": "shipped"},
    )
    assert track_resp.status_code == 200
    assert track_resp.json()["status"] == "shipped"
