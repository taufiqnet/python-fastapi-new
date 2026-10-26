import pytest
import pytest_asyncio
import uuid
from decimal import Decimal
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile
from app.core.deps import get_current_user, get_current_user_optional
from app.common.enums import Status
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

    def _override_get_current_user(request=None):
        return superuser

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = _override_get_current_user
    app.dependency_overrides[get_current_user_optional] = _override_get_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_manual_social_order_flow(client: AsyncClient, sync_db):
    # 1. Create a Product with Variant in test db
    prod = Product(
        title="Social Commerce T-Shirt",
        slug=f"social-shirt-{uuid.uuid4().hex[:6]}",
        status=Status.ACTIVE,
        business_id=1,
    )
    sync_db.add(prod)
    sync_db.flush()

    variant = ProductVariant(
        product_id=prod.id,
        sku="SKU-SHIRT-XL",
        price=Decimal("450.00"),
        stock_qty=50,
        attributes={"color": "Navy Blue", "size": "XL"},
    )
    sync_db.add(variant)
    sync_db.commit()

    # 2. Test Catalog Products Endpoint
    cat_res = await client.get("/orders/catalog/products?business_id=1")
    assert cat_res.status_code == 200, cat_res.text
    catalog = cat_res.json()
    assert isinstance(catalog, list)
    assert len(catalog) >= 1
    target_prod = next((p for p in catalog if p["id"] == str(prod.id)), catalog[0])
    assert len(target_prod["variants"]) >= 1
    target_var = target_prod["variants"][0]
    assert target_var["sku"] == "SKU-SHIRT-XL"

    # 3. Create a Social Order (e.g. WhatsApp Order) with user_id=None and custom negotiated price
    order_payload = {
        "business_id": 1,
        "user_id": None,
        "guest_email": None,
        "items": [
            {
                "variant_id": target_var["id"],
                "quantity": 2,
                "unit_price": 400.0,  # negotiated price lower than 450
            }
        ],
        "shipping_address": {
            "recipient_name": "Tariqul Islam (WhatsApp)",
            "phone": "+8801712345678",
            "street": "House 12, Road 4, Dhanmondi",
            "city": "Dhaka",
            "country": "Bangladesh",
        },
        "currency": "BDT",
        "shipping_amount": 60.0,
        "tax_amount": 120.0,
        "discount_amount": 50.0,
        "other_charges": 0.0,
        "customer_note": "[WhatsApp Order] Deliver after 6 PM",
        "order_source": "WhatsApp",
        "payment_method": "cash_on_delivery",
        "payment_channel": "COD",
        "payment_status": "unpaid",
        "fulfillment_status": "pending",
        "delivery_method": "Inside Dhaka",
        "courier_company": "Steadfast",
        "tracking_id": "ST-998877",
    }

    create_res = await client.post("/orders", json=order_payload)
    assert create_res.status_code == 201, create_res.text
    created_order = create_res.json()

    assert created_order["order_number"].startswith("ORD-")
    # Subtotal: 2 * 400 = 800
    # Total: 800 + 60 (shipping) + 120 (tax) - 50 (discount) = 930
    assert float(created_order["subtotal_amount"]) == 800.0
    assert float(created_order["total_amount"]) == 930.0
    assert created_order["payment_status"] == "unpaid"
    assert created_order["fulfillment_status"] == "pending"
    assert created_order["courier_company"] == "Steadfast"

    # 4. Verify order in list
    list_res = await client.get("/orders?business_id=1")
    assert list_res.status_code == 200
    orders_list = list_res.json()
    assert any(o["id"] == created_order["id"] for o in orders_list)

    # 5. Delete order test (CRUD completion)
    del_res = await client.delete(f"/orders/{created_order['id']}?business_id=1")
    assert del_res.status_code == 204


@pytest.mark.asyncio
async def test_delivery_settings_and_blank_courier_flow(client: AsyncClient, sync_db):
    # 1. Fetch delivery settings - should auto-seed Inside Dhaka (70) and Outside Dhaka (150)
    res = await client.get("/shipping/delivery-settings?business_id=1")
    assert res.status_code == 200, res.text
    settings = res.json()
    assert len(settings) >= 2

    inside_dhaka = next((s for s in settings if "Inside Dhaka" in s["name"]), None)
    assert inside_dhaka is not None
    assert float(inside_dhaka["charge"]) == 70.0
    assert inside_dhaka["is_default"] is True

    outside_dhaka = next((s for s in settings if "Outside Dhaka" in s["name"]), None)
    assert outside_dhaka is not None
    assert float(outside_dhaka["charge"]) == 150.0

    # 2. Add a new delivery setting
    new_res = await client.post(
        "/shipping/delivery-settings",
        json={
            "business_id": 1,
            "name": "Sub-Dhaka / Adjacent",
            "charge": 100.0,
            "region": "Gazipur, Narayanganj, Savar",
            "estimated_days": "24-48 Hours",
            "is_default": False,
            "is_active": True,
        },
    )
    assert new_res.status_code == 201, new_res.text
    created_setting = new_res.json()
    assert created_setting["name"] == "Sub-Dhaka / Adjacent"
    assert float(created_setting["charge"]) == 100.0

    # 3. Update delivery setting price
    update_res = await client.put(
        f"/shipping/delivery-settings/{created_setting['id']}?business_id=1",
        json={"charge": 110.0},
    )
    assert update_res.status_code == 200
    assert float(update_res.json()["charge"]) == 110.0

    # 4. Create an order with NO courier partner (courier_company is blank/None)
    prod = Product(
        title="Delivery Test Product",
        slug=f"deliv-prod-{uuid.uuid4().hex[:6]}",
        status=Status.ACTIVE,
        business_id=1,
    )
    sync_db.add(prod)
    sync_db.flush()
    var = ProductVariant(
        product_id=prod.id,
        sku=f"SKU-DELIV-{uuid.uuid4().hex[:4]}",
        price=Decimal("500.00"),
        stock_qty=20,
    )
    sync_db.add(var)
    sync_db.commit()

    order_payload = {
        "business_id": 1,
        "items": [{"variant_id": str(var.id), "quantity": 1}],
        "shipping_address": {
            "recipient_name": "Rahim Khan",
            "street": "Mirpur 10",
            "city": "Dhaka",
            "country": "Bangladesh",
        },
        "shipping_amount": 70.0,
        "delivery_method": "Inside Dhaka City",
        "courier_company": None,  # Blank / Optional by default
    }
    ord_res = await client.post("/orders", json=order_payload)
    assert ord_res.status_code == 201, ord_res.text
    ord_data = ord_res.json()
    assert ord_data["courier_company"] is None
    assert ord_data["delivery_method"] == "Inside Dhaka City"
    assert float(ord_data["shipping_amount"]) == 70.0

    # 5. Delete the custom delivery setting
    del_setting_res = await client.delete(
        f"/shipping/delivery-settings/{created_setting['id']}?business_id=1"
    )
    assert del_setting_res.status_code == 200

