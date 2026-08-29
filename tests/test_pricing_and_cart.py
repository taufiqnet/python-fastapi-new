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
from app.modules.ecommerce.products.models import Product, ProductVariant

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
async def test_pricing_api(client: AsyncClient, sync_db):
    # Setup product variant
    product = Product(title="Test Product", slug="test-product", status=Status.ACTIVE)
    sync_db.add(product)
    sync_db.commit()

    variant = ProductVariant(
        product_id=product.id, sku="SKU-PRICING", price=Decimal("100.00")
    )
    sync_db.add(variant)
    sync_db.commit()

    # 1. Tax Rule CRUD
    tax_resp = await client.post(
        "/pricing/tax-rules",
        json={
            "business_id": 1,
            "region": "California",
            "tax_percentage": 7.5,
            "is_active": True,
        },
    )
    assert tax_resp.status_code == 201
    tax_data = tax_resp.json()
    assert tax_data["region"] == "California"
    assert tax_data["tax_percentage"] == 7.5

    # Calculate Tax
    calc_resp = await client.post(
        "/pricing/calculate-tax",
        json={
            "business_id": 1,
            "region": "California",
            "amount": 100.00,
        },
    )
    assert calc_resp.status_code == 200
    calc_data = calc_resp.json()
    assert calc_data["tax_rate"] == 7.5
    assert calc_data["tax_amount"] == 7.50
    assert calc_data["total"] == 107.50

    # 2. Price History
    ph_resp = await client.post(
        "/pricing/price-history",
        json={
            "business_id": 1,
            "variant_id": str(variant.id),
            "old_price": 100.00,
            "new_price": 120.00,
            "reason": "Price increase",
        },
    )
    assert ph_resp.status_code == 201

    get_ph = await client.get(
        f"/pricing/price-history?variant_id={variant.id}&business_id=1"
    )
    assert get_ph.status_code == 200
    assert len(get_ph.json()) == 1

    # 3. Currency Rates
    curr_resp = await client.post(
        "/pricing/currency-rates",
        json={
            "business_id": 1,
            "currency_code": "EUR",
            "rate": 0.92,
        },
    )
    assert curr_resp.status_code == 201

    get_curr = await client.get("/pricing/currency-rates?business_id=1")
    assert get_curr.status_code == 200
    assert len(get_curr.json()) >= 1


@pytest.mark.asyncio
async def test_cart_api(client: AsyncClient, sync_db):
    # Setup product variant
    product = Product(title="Cart Product", slug="cart-product", status=Status.ACTIVE)
    sync_db.add(product)
    sync_db.commit()

    variant = ProductVariant(
        product_id=product.id, sku="SKU-CART", price=Decimal("50.00")
    )
    sync_db.add(variant)
    sync_db.commit()

    # 1. Get or create cart for guest
    session_id = "guest-session-123"
    cart_resp = await client.get(f"/cart?business_id=1&session_id={session_id}")
    assert cart_resp.status_code == 200
    cart_data = cart_resp.json()
    cart_id = cart_data["id"]
    assert cart_data["business_id"] == 1

    # 2. Add item to cart
    add_resp = await client.post(
        f"/cart/items?cart_id={cart_id}&business_id=1",
        json={"variant_id": str(variant.id), "quantity": 2},
    )
    assert add_resp.status_code == 201
    updated_cart = add_resp.json()
    assert len(updated_cart["items"]) == 1
    assert updated_cart["items"][0]["quantity"] == 2
    assert updated_cart["total_amount"] == 100.00

    item_id = updated_cart["items"][0]["id"]

    # 3. Update item quantity
    upd_resp = await client.put(
        f"/cart/items/{item_id}",
        json={"quantity": 3},
    )
    assert upd_resp.status_code == 200
    assert upd_resp.json()["total_amount"] == 150.00

    # 4. Remove item
    del_resp = await client.delete(f"/cart/items/{item_id}")
    assert del_resp.status_code == 200
    assert len(del_resp.json()["items"]) == 0
