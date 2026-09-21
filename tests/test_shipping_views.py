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
from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile
from app.core.deps import get_current_user, get_current_user_optional
from app.modules.ecommerce.orders.models import Order
from app.modules.ecommerce.products.models import Product, ProductVariant

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
    # Seed business profile and superuser
    biz = BusinessProfile(id=1, name_en="Test Business", is_active=True)
    db.add(biz)

    user = User(
        id=1,
        username="admin",
        email="admin@example.com",
        password_hash="fakehash",
        is_superuser=True,
        is_active=True,
        business_id=1,
    )
    db.add(user)
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

    superuser = sync_db.query(User).filter(User.username == "admin").first()

    def _override_get_current_user():
        return superuser

    async def _override_get_current_user_optional(*args, **kwargs):
        return superuser

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = _override_get_current_user
    app.dependency_overrides[get_current_user_optional] = _override_get_current_user_optional

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_shipping_manage_html_page(client: AsyncClient, sync_db):
    res = await client.get("/shipping/manage?business_id=1")
    assert res.status_code == 200
    assert "Shipping &amp; Carrier Management" in res.text or "Shipping & Carrier Management" in res.text
    assert "Dynamic Rate Calculator" in res.text
    assert "Shipment Fulfillment &amp; Carrier Tracking" in res.text or "Shipment Fulfillment & Carrier Tracking" in res.text


@pytest.mark.asyncio
async def test_shipping_api_extended_endpoints(client: AsyncClient, sync_db):
    # 1. Create Zone
    zone_res = await client.post(
        "/shipping/zones",
        json={
            "business_id": 1,
            "name": "North America Zone",
            "region": "USA",
            "rates": [{"min_weight": 0.0, "max_weight": 5.0, "base_cost": 12.50}],
        },
    )
    assert zone_res.status_code == 201
    zone_data = zone_res.json()
    assert zone_data["name"] == "North America Zone"

    # 2. Get Zones
    get_zones_res = await client.get("/shipping/zones?business_id=1")
    assert get_zones_res.status_code == 200
    assert len(get_zones_res.json()) >= 1

    # 3. Calculate Rate Quote
    calc_res = await client.post(
        "/shipping/calculate",
        json={"business_id": 1, "region": "USA", "weight": 2.0},
    )
    assert calc_res.status_code == 200
    assert calc_res.json()["base_cost"] == 12.50

    # 4. Create Order for Label Fulfillment
    product = Product(title="Test Item", slug="test-item", status=Status.ACTIVE)
    sync_db.add(product)
    sync_db.commit()

    variant = ProductVariant(product_id=product.id, sku="SKU-TEST-1", price=Decimal("100.00"))
    sync_db.add(variant)
    sync_db.commit()

    order = Order(business_id=1, order_number="ORD-TEST-101", subtotal_amount=Decimal("100.00"), total_amount=Decimal("100.00"), user_id=uuid.uuid4())
    sync_db.add(order)
    sync_db.commit()

    # 5. Generate Label / Shipment
    label_res = await client.post(
        "/shipping/labels",
        json={
            "business_id": 1,
            "order_id": str(order.id),
            "carrier": "DHL Express",
            "tracking_number": "DHL12345678",
        },
    )
    assert label_res.status_code == 201
    shipment_id = label_res.json()["id"]

    # 6. List Shipments
    shipments_res = await client.get("/shipping/shipments?business_id=1")
    assert shipments_res.status_code == 200
    shipments = shipments_res.json()
    assert len(shipments) >= 1
    assert shipments[0]["carrier"] == "DHL Express"

    # 7. Update Tracking Status
    track_res = await client.put(
        f"/shipping/shipments/{shipment_id}/tracking?business_id=1",
        json={"status": "in_transit", "tracking_number": "DHL12345678-UPDATED"},
    )
    assert track_res.status_code == 200
    assert track_res.json()["status"] == "in_transit"
    assert track_res.json()["tracking_number"] == "DHL12345678-UPDATED"
