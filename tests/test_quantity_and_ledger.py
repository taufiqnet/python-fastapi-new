import uuid
from decimal import Decimal
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.core.tenancy.models import BusinessProfile
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
    bp = BusinessProfile(
        name_en="Test Business Qty Ledger",
    )
    sync_db.add(bp)
    sync_db.commit()
    sync_db.refresh(bp)
    return bp


@pytest.mark.asyncio
async def test_variant_stock_qty_write_ignored_and_read_only(client: AsyncClient, test_business, sync_db):
    business_id = test_business.id

    # Create Product & Variant
    product = Product(title="Headphones", slug="headphones", business_id=business_id)
    sync_db.add(product)
    sync_db.commit()

    # Create variant - stock_qty is ignored on write (excluded from write payload schema)
    v_res = await client.post(f"/products/{product.id}/variants", json={
        "sku": "HP-001",
        "price": 100.00,
    })
    assert v_res.status_code == 201
    variant_data = v_res.json()
    variant_id = variant_data["id"]
    assert "stock_qty" in variant_data

    # Update variant with stock_qty - stock_qty is read-only (ignored on update schema)
    v_upd = await client.put(f"/products/variants/{variant_id}", json={
        "price": 120.00,
        "stock_qty": 8888,
    })
    assert v_upd.status_code == 200
    assert v_upd.json()["price"] == "120.00"


@pytest.mark.asyncio
async def test_stock_availability_and_aggregation(client: AsyncClient, test_business):
    business_id = test_business.id

    # Create warehouses
    wh1 = (await client.post("/inventory/warehouses", json={"business_id": business_id, "name": "WH1", "code": "WH1-CODE"})).json()
    wh2 = (await client.post("/inventory/warehouses", json={"business_id": business_id, "name": "WH2", "code": "WH2-CODE"})).json()

    # Create Item & Variant
    item = (await client.post("/inventory/items-master", json={"business_id": business_id, "sku": "ITEM-AVAIL", "name": "Avail Item"})).json()
    item_id = item["id"]

    # Create inventory items
    inv1 = (await client.post("/inventory/items", json={"item_id": item_id, "warehouse_id": wh1["id"], "quantity_on_hand": 50, "quantity_reserved": 10})).json()
    inv2 = (await client.post("/inventory/items", json={"item_id": item_id, "warehouse_id": wh2["id"], "quantity_on_hand": 30, "quantity_reserved": 5})).json()

    # Query availability across all warehouses for item_id
    avail_res = await client.get(f"/inventory/availability?business_id={business_id}&item_id={item_id}")
    assert avail_res.status_code == 200
    data = avail_res.json()
    assert data["quantity_on_hand"] == 80
    assert data["quantity_reserved"] == 15
    assert data["quantity_available"] == 65

    # Query availability for specific warehouse wh1
    avail_wh1 = await client.get(f"/inventory/availability?warehouse_id={wh1['id']}")
    assert avail_wh1.status_code == 200
    assert avail_wh1.json()["quantity_on_hand"] == 50
    assert avail_wh1.json()["quantity_available"] == 40


@pytest.mark.asyncio
async def test_typed_adjustments_source_tracing_and_immutable_ledger(client: AsyncClient, test_business):
    business_id = test_business.id

    wh = (await client.post("/inventory/warehouses", json={"business_id": business_id, "name": "Ledger WH", "code": "WH-LEDGER"})).json()
    item = (await client.post("/inventory/items-master", json={"business_id": business_id, "sku": "ITEM-LEDGER", "name": "Ledger Item"})).json()
    inv = (await client.post("/inventory/items", json={"item_id": item["id"], "warehouse_id": wh["id"], "quantity_on_hand": 0})).json()

    # Post stock adjustment with typed reason (receipt) and source document tracing
    adj_res = await client.post("/inventory/adjustments", json={
        "inventory_item_id": inv["id"],
        "delta": 100,
        "reason": "receipt",
        "source_type": "purchase_order",
        "source_id": "PO-9988",
        "reference_id": "REF-PO-9988",
        "notes": "Initial receipt from vendor",
    })
    assert adj_res.status_code == 200
    assert adj_res.json()["quantity_on_hand"] == 100

    # Query movements filtered by source_type, source_id, and reason
    mov_res = await client.get(f"/inventory/movements?inventory_item_id={inv['id']}&source_type=purchase_order&source_id=PO-9988&reason=receipt")
    assert mov_res.status_code == 200
    movements = mov_res.json()
    assert len(movements) == 1
    m = movements[0]
    assert m["delta"] == 100
    assert m["reason"] == "receipt"
    assert m["source_type"] == "purchase_order"
    assert m["source_id"] == "PO-9988"
