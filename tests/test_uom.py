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
        name_en="Test Business UoM",
    )
    sync_db.add(bp)
    sync_db.commit()
    sync_db.refresh(bp)
    return bp


@pytest.mark.asyncio
async def test_uom_crud(client: AsyncClient, test_business):
    business_id = test_business.id

    # 1. Create UoM
    res = await client.post("/inventory/uom/units", json={
        "business_id": business_id,
        "code": "KG",
        "name": "Kilogram",
        "precision": 2,
    })
    assert res.status_code == 201
    uom_data = res.json()
    assert uom_data["code"] == "KG"
    uom_id = uom_data["id"]

    # 2. Get UoM
    get_res = await client.get(f"/inventory/uom/units/{uom_id}?business_id={business_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Kilogram"

    # 3. List UoMs
    list_res = await client.get(f"/inventory/uom/units?business_id={business_id}")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 4. Update UoM
    upd_res = await client.put(f"/inventory/uom/units/{uom_id}?business_id={business_id}", json={
        "name": "Kilo Grams",
        "precision": 3,
    })
    assert upd_res.status_code == 200
    assert upd_res.json()["name"] == "Kilo Grams"
    assert upd_res.json()["precision"] == 3

    # 5. Delete UoM
    del_res = await client.delete(f"/inventory/uom/units/{uom_id}?business_id={business_id}")
    assert del_res.status_code == 204


@pytest.mark.asyncio
async def test_uom_conversion_pathfinding_and_normalisation(client: AsyncClient, test_business):
    business_id = test_business.id

    # Create UoMs: KG, G, LB, BOX
    kg_res = await client.post("/inventory/uom/units", json={"business_id": business_id, "code": "KG", "name": "Kilogram"})
    kg_id = kg_res.json()["id"]

    g_res = await client.post("/inventory/uom/units", json={"business_id": business_id, "code": "G", "name": "Gram"})
    g_id = g_res.json()["id"]

    box_res = await client.post("/inventory/uom/units", json={"business_id": business_id, "code": "BOX", "name": "Box"})
    box_id = box_res.json()["id"]

    unlinked_res = await client.post("/inventory/uom/units", json={"business_id": business_id, "code": "UNLINKED", "name": "Unlinked"})
    unlinked_id = unlinked_res.json()["id"]

    # 1. Create global conversion: 1 KG = 1000 G (factor = 1000)
    c1_res = await client.post("/inventory/uom/conversions", json={
        "business_id": business_id,
        "from_uom_id": kg_id,
        "to_uom_id": g_id,
        "factor": 1000,
    })
    assert c1_res.status_code == 201

    # 2. Create global conversion: 1 BOX = 5 KG (factor = 5)
    c2_res = await client.post("/inventory/uom/conversions", json={
        "business_id": business_id,
        "from_uom_id": box_id,
        "to_uom_id": kg_id,
        "factor": 5,
    })
    assert c2_res.status_code == 201

    # Test direct conversion endpoint: 2.5 KG to G -> 2500 G
    conv_res = await client.post("/inventory/uom/convert", json={
        "business_id": business_id,
        "from_uom_id": kg_id,
        "to_uom_id": g_id,
        "quantity": 2.5,
    })
    assert conv_res.status_code == 200
    assert float(conv_res.json()["converted_quantity"]) == 2500.0

    # Test inverse conversion endpoint: 5000 G to KG -> 0.5 KG
    inv_conv_res = await client.post("/inventory/uom/convert", json={
        "business_id": business_id,
        "from_uom_id": g_id,
        "to_uom_id": kg_id,
        "quantity": 5000,
    })
    assert inv_conv_res.status_code == 200
    assert float(inv_conv_res.json()["converted_quantity"]) == 5.0

    # Test multi-hop conversion endpoint: 2 BOX to G -> 2 * 5 * 1000 = 10000 G
    multi_res = await client.post("/inventory/uom/convert", json={
        "business_id": business_id,
        "from_uom_id": box_id,
        "to_uom_id": g_id,
        "quantity": 2,
    })
    assert multi_res.status_code == 200
    assert float(multi_res.json()["converted_quantity"]) == 10000.0

    # Reject conversion when no path exists
    no_path_res = await client.post("/inventory/uom/convert", json={
        "business_id": business_id,
        "from_uom_id": box_id,
        "to_uom_id": unlinked_id,
        "quantity": 10,
    })
    assert no_path_res.status_code == 400
    assert "No valid conversion path found" in no_path_res.json()["detail"]


@pytest.mark.asyncio
async def test_ledger_normalisation_on_stock_adjustment(client: AsyncClient, test_business):
    business_id = test_business.id

    # Create UoMs
    kg_res = await client.post("/inventory/uom/units", json={"business_id": business_id, "code": "KG", "name": "Kilogram"})
    kg_id = kg_res.json()["id"]

    box_res = await client.post("/inventory/uom/units", json={"business_id": business_id, "code": "BOX", "name": "Box"})
    box_id = box_res.json()["id"]

    # Global conversion: 1 BOX = 10 KG
    await client.post("/inventory/uom/conversions", json={
        "business_id": business_id,
        "from_uom_id": box_id,
        "to_uom_id": kg_id,
        "factor": 10,
    })

    # Create Warehouse
    wh_res = await client.post("/inventory/warehouses", json={
        "business_id": business_id,
        "name": "UoM Warehouse",
        "code": f"WH-UOM-{uuid.uuid4().hex[:6]}",
    })
    wh_id = wh_res.json()["id"]

    # Create Item with base_uom_id = KG
    item_res = await client.post("/inventory/items-master", json={
        "business_id": business_id,
        "sku": "BULK-COFFEE-01",
        "name": "Bulk Coffee Beans",
        "base_uom_id": kg_id,
    })
    item_id = item_res.json()["id"]

    # Create InventoryItem
    inv_res = await client.post("/inventory/items", json={
        "item_id": item_id,
        "warehouse_id": wh_id,
        "quantity_on_hand": 0,
    })
    inv_id = inv_res.json()["id"]

    # Adjust stock in BOX (3 BOXES). With 1 BOX = 10 KG, ledger should normalise to 30 KG.
    adj_res = await client.post("/inventory/adjustments", json={
        "inventory_item_id": inv_id,
        "delta": 3,
        "uom_id": box_id,
        "reason": "restock",
    })
    assert adj_res.status_code == 200
    assert adj_res.json()["quantity_on_hand"] == 30
