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
from app.modules.inventory.models import (
    InventoryItem,
    StockMovement,
    StockMovementReason,
    Warehouse,
)
from app.modules.inventory.schemas import (
    InventoryItemCreate,
    StockAdjustmentRequest,
    WarehouseCreate,
)
from app.modules.products.models import Product, ProductVariant
from app.modules.sellers.models import Seller  # noqa: F401

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


@pytest_asyncio.fixture
async def async_db():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncTestingSessionLocal() as session:
        yield session

    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


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
async def test_inventory_models_and_relationships(async_db: AsyncSession):
    # Warehouse
    warehouse = Warehouse(
        name="North Fulfillment",
        code="WH-NORTH",
        address="100 North Rd",
        region="North",
        is_active=True,
    )
    async_db.add(warehouse)
    await async_db.commit()
    await async_db.refresh(warehouse)

    assert warehouse.id is not None

    # Product & Variant
    product = Product(
        title="Gaming Laptop",
        slug="gaming-laptop",
        status=Status.ACTIVE,
    )
    async_db.add(product)
    await async_db.commit()
    await async_db.refresh(product)

    variant = ProductVariant(
        product_id=product.id,
        sku="LAPTOP-G15",
        price=Decimal("1200.00"),
        stock_qty=10,
    )
    async_db.add(variant)
    await async_db.commit()
    await async_db.refresh(variant)

    # InventoryItem
    inv_item = InventoryItem(
        variant_id=variant.id,
        warehouse_id=warehouse.id,
        quantity_on_hand=50,
        quantity_reserved=5,
    )
    async_db.add(inv_item)
    await async_db.commit()
    await async_db.refresh(inv_item)

    assert inv_item.id is not None
    assert inv_item.quantity_on_hand == 50

    # StockMovement
    movement = StockMovement(
        inventory_item_id=inv_item.id,
        delta=20,
        reason=StockMovementReason.RESTOCK,
        reference_id="PO-001",
        notes="Initial restock",
    )
    async_db.add(movement)
    await async_db.commit()
    await async_db.refresh(movement)

    assert movement.id is not None
    assert movement.reason == StockMovementReason.RESTOCK


def test_inventory_schemas():
    wh_create = WarehouseCreate(
        name="East Warehouse",
        code="WH-EAST",
        address="200 East Ave",
    )
    assert wh_create.name == "East Warehouse"
    assert wh_create.code == "WH-EAST"

    v_id = uuid.uuid4()
    w_id = uuid.uuid4()
    item_create = InventoryItemCreate(
        variant_id=v_id,
        warehouse_id=w_id,
        quantity_on_hand=100,
    )
    assert item_create.variant_id == v_id
    assert item_create.quantity_on_hand == 100

    item_id = uuid.uuid4()
    adj = StockAdjustmentRequest(
        inventory_item_id=item_id,
        delta=15,
        reason=StockMovementReason.RESTOCK,
    )
    assert adj.delta == 15


@pytest.mark.asyncio
async def test_inventory_api_crud(client: AsyncClient, sync_db):
    # Setup product and variant in DB for API usage
    product = Product(
        title="Wireless Mouse",
        slug="wireless-mouse",
        status=Status.ACTIVE,
    )
    sync_db.add(product)
    sync_db.commit()
    sync_db.refresh(product)

    variant = ProductVariant(
        product_id=product.id,
        sku="MOUSE-W100",
        price=Decimal("25.00"),
        stock_qty=100,
    )
    sync_db.add(variant)
    sync_db.commit()
    sync_db.refresh(variant)

    # 1. Create Warehouse
    wh_resp = await client.post(
        "/inventory/warehouses",
        json={
            "name": "Central Hub",
            "code": "WH-CENTRAL",
            "address": "500 Central Blvd",
            "region": "Central",
            "is_active": True,
        },
    )
    assert wh_resp.status_code == 201
    wh_data = wh_resp.json()
    warehouse_id = wh_data["id"]
    assert wh_data["name"] == "Central Hub"

    # 2. List Warehouses
    wh_list_resp = await client.get("/inventory/warehouses")
    assert wh_list_resp.status_code == 200
    assert len(wh_list_resp.json()) >= 1

    # 3. Get Warehouse
    get_wh_resp = await client.get(f"/inventory/warehouses/{warehouse_id}")
    assert get_wh_resp.status_code == 200
    assert get_wh_resp.json()["code"] == "WH-CENTRAL"

    # 4. Update Warehouse
    upd_wh_resp = await client.put(
        f"/inventory/warehouses/{warehouse_id}",
        json={"name": "Central Hub Express"},
    )
    assert upd_wh_resp.status_code == 200
    assert upd_wh_resp.json()["name"] == "Central Hub Express"

    # 5. Create Inventory Item
    item_resp = await client.post(
        "/inventory/items",
        json={
            "variant_id": str(variant.id),
            "warehouse_id": warehouse_id,
            "quantity_on_hand": 80,
            "quantity_reserved": 10,
        },
    )
    assert item_resp.status_code == 201
    item_data = item_resp.json()
    item_id = item_data["id"]
    assert item_data["quantity_on_hand"] == 80
    assert item_data["quantity_available"] == 70

    # 6. List Inventory Items
    items_list_resp = await client.get("/inventory/items")
    assert items_list_resp.status_code == 200
    assert len(items_list_resp.json()) >= 1

    # 7. Get Inventory Item
    get_item_resp = await client.get(f"/inventory/items/{item_id}")
    assert get_item_resp.status_code == 200
    assert get_item_resp.json()["quantity_on_hand"] == 80

    # 8. Adjust Stock
    adj_resp = await client.post(
        "/inventory/adjustments",
        json={
            "inventory_item_id": item_id,
            "delta": 20,
            "reason": "restock",
            "reference_id": "PO-100",
            "notes": "Added 20 units",
        },
    )
    assert adj_resp.status_code == 200
    assert adj_resp.json()["quantity_on_hand"] == 100

    # 9. Get Stock Movements
    mov_resp = await client.get(f"/inventory/movements?inventory_item_id={item_id}")
    assert mov_resp.status_code == 200
    movements = mov_resp.json()
    assert len(movements) == 1
    assert movements[0]["delta"] == 20
    assert movements[0]["reason"] == "restock"

    # 10. Delete Warehouse
    del_wh_resp = await client.delete(f"/inventory/warehouses/{warehouse_id}")
    assert del_wh_resp.status_code == 204
