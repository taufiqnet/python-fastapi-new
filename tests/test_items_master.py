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
        name_en="Test Business Item Master",
    )
    sync_db.add(bp)
    sync_db.commit()
    sync_db.refresh(bp)
    return bp


@pytest.fixture
def test_business_2(sync_db):
    bp = BusinessProfile(
        name_en="Second Business Profile",
    )
    sync_db.add(bp)
    sync_db.commit()
    sync_db.refresh(bp)
    return bp


@pytest.mark.asyncio
async def test_item_master_crud(client: AsyncClient, test_business):
    business_id = test_business.id

    # 1. Create Item
    create_payload = {
        "business_id": business_id,
        "sku": "ITEM-SKU-100",
        "name": "Industrial Bolt",
        "barcode": "123456789012",
        "item_type": "stock",
        "tracking_type": "none",
        "default_cost": 15.50,
        "is_active": True,
    }
    response = await client.post("/inventory/items-master", json=create_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["sku"] == "ITEM-SKU-100"
    assert data["name"] == "Industrial Bolt"
    assert float(data["default_cost"]) == 15.50
    item_id = data["id"]

    # 2. Duplicate SKU in same business should fail
    response_dup = await client.post("/inventory/items-master", json=create_payload)
    assert response_dup.status_code == 400

    # 3. Get Item
    response_get = await client.get(f"/inventory/items-master/{item_id}?business_id={business_id}")
    assert response_get.status_code == 200
    assert response_get.json()["id"] == item_id

    # 4. List Items
    response_list = await client.get(f"/inventory/items-master?business_id={business_id}")
    assert response_list.status_code == 200
    items = response_list.json()
    assert len(items) >= 1
    assert any(i["id"] == item_id for i in items)

    # 5. Update Item
    update_payload = {
        "name": "Industrial Bolt - Grade A",
        "default_cost": 18.00,
    }
    response_update = await client.put(f"/inventory/items-master/{item_id}?business_id={business_id}", json=update_payload)
    assert response_update.status_code == 200
    assert response_update.json()["name"] == "Industrial Bolt - Grade A"
    assert float(response_update.json()["default_cost"]) == 18.00

    # 6. Delete Item
    response_delete = await client.delete(f"/inventory/items-master/{item_id}?business_id={business_id}")
    assert response_delete.status_code == 204

    # 7. Get deleted item should return 404
    response_get_del = await client.get(f"/inventory/items-master/{item_id}?business_id={business_id}")
    assert response_get_del.status_code == 404


@pytest.mark.asyncio
async def test_item_master_tenancy_isolation(client: AsyncClient, test_business, test_business_2):
    b1_id = test_business.id
    b2_id = test_business_2.id

    # Create item in Business 1
    res1 = await client.post("/inventory/items-master", json={
        "business_id": b1_id,
        "sku": "SHARED-SKU-001",
        "name": "Item B1",
        "default_cost": 10.00,
    })
    assert res1.status_code == 201
    item1_id = res1.json()["id"]

    # Same SKU in Business 2 should succeed (unique per business)
    res2 = await client.post("/inventory/items-master", json={
        "business_id": b2_id,
        "sku": "SHARED-SKU-001",
        "name": "Item B2",
        "default_cost": 20.00,
    })
    assert res2.status_code == 201
    item2_id = res2.json()["id"]

    # Listing for B1 should only return item1
    res_list_b1 = await client.get(f"/inventory/items-master?business_id={b1_id}")
    list_b1 = res_list_b1.json()
    b1_ids = [i["id"] for i in list_b1]
    assert item1_id in b1_ids
    assert item2_id not in b1_ids

    # Querying item1 with B2 scope should return 404
    get_b2_cross = await client.get(f"/inventory/items-master/{item1_id}?business_id={b2_id}")
    assert get_b2_cross.status_code == 404


@pytest.mark.asyncio
async def test_inventory_without_ecommerce_products(client: AsyncClient, test_business):
    business_id = test_business.id

    # Create warehouse
    wh_res = await client.post("/inventory/warehouses", json={
        "business_id": business_id,
        "name": "Standalone Warehouse",
        "code": f"WH-SA-{uuid.uuid4().hex[:6]}",
    })
    assert wh_res.status_code == 201
    wh_id = wh_res.json()["id"]

    # Create Item Master
    item_res = await client.post("/inventory/items-master", json={
        "business_id": business_id,
        "sku": "STANDALONE-ITEM-1",
        "name": "Raw Material Steel",
        "item_type": "raw_material",
        "default_cost": 50.00,
    })
    assert item_res.status_code == 201
    item_id = item_res.json()["id"]

    # Create Inventory Item decoupled from variant_id
    inv_res = await client.post("/inventory/items", json={
        "item_id": item_id,
        "warehouse_id": wh_id,
        "quantity_on_hand": 100,
    })
    assert inv_res.status_code == 201
    inv_data = inv_res.json()
    assert inv_data["item_id"] == item_id
    assert inv_data["variant_id"] is None
    assert inv_data["quantity_on_hand"] == 100

    # Query inventory item by item_id
    inv_list_res = await client.get(f"/inventory/items?item_id={item_id}")
    inv_list = inv_list_res.json()
    assert len(inv_list) == 1
    assert inv_list[0]["id"] == inv_data["id"]
