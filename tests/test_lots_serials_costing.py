import uuid
from datetime import datetime, timedelta, timezone
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
        name_en="Test Business Lots & Costing",
    )
    sync_db.add(bp)
    sync_db.commit()
    sync_db.refresh(bp)
    return bp


@pytest.mark.asyncio
async def test_lot_fefo_and_expiry_alerts(client: AsyncClient, test_business):
    business_id = test_business.id

    wh = (await client.post("/inventory/warehouses", json={"business_id": business_id, "name": "Pharma WH", "code": "WH-PHARMA"})).json()

    # Create lot-tracked item
    item = (await client.post("/inventory/items-master", json={
        "business_id": business_id,
        "sku": "MED-001",
        "name": "Antibiotic Pills",
        "tracking_type": "lot",
    })).json()

    inv = (await client.post("/inventory/items", json={"item_id": item["id"], "warehouse_id": wh["id"], "quantity_on_hand": 0})).json()

    # Receive Lot 1 (expires in 10 days)
    exp1 = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
    await client.post("/inventory/adjustments", json={
        "inventory_item_id": inv["id"],
        "delta": 50,
        "reason": "receipt",
        "batch_number": "BATCH-001",
        "expiry_date": exp1,
    })

    # Receive Lot 2 (expires in 40 days)
    exp2 = (datetime.now(timezone.utc) + timedelta(days=40)).isoformat()
    await client.post("/inventory/adjustments", json={
        "inventory_item_id": inv["id"],
        "delta": 50,
        "reason": "receipt",
        "batch_number": "BATCH-002",
        "expiry_date": exp2,
    })

    # Expiry alert endpoint (within 15 days) -> should return BATCH-001
    exp_lots_res = await client.get(f"/inventory/lots/expiring?business_id={business_id}&days=15")
    assert exp_lots_res.status_code == 200
    lots = exp_lots_res.json()
    assert len(lots) == 1
    assert lots[0]["lot_number"] == "BATCH-001"

    # Outbound adjustment (consume 30 units) without specifying batch -> FEFO should consume BATCH-001
    await client.post("/inventory/adjustments", json={
        "inventory_item_id": inv["id"],
        "delta": -30,
        "reason": "sale",
    })

    # Query expiring lots again -> BATCH-001 remaining qty should be 20
    exp_lots_res_2 = await client.get(f"/inventory/lots/expiring?business_id={business_id}&days=15")
    assert exp_lots_res_2.json()[0]["quantity"] == 20


@pytest.mark.asyncio
async def test_serial_tracking_enforcement(client: AsyncClient, test_business):
    business_id = test_business.id

    wh = (await client.post("/inventory/warehouses", json={"business_id": business_id, "name": "Tech WH", "code": "WH-TECH"})).json()

    # Create serial-tracked item
    item = (await client.post("/inventory/items-master", json={
        "business_id": business_id,
        "sku": "LAPTOP-01",
        "name": "Pro Laptop",
        "tracking_type": "serial",
    })).json()

    inv = (await client.post("/inventory/items", json={"item_id": item["id"], "warehouse_id": wh["id"], "quantity_on_hand": 0})).json()

    # Moving delta > 1 for serial-tracked item should fail
    fail_res = await client.post("/inventory/adjustments", json={
        "inventory_item_id": inv["id"],
        "delta": 5,
        "reason": "receipt",
        "serial_number": "SN-100",
    })
    assert fail_res.status_code == 400
    assert "exactly 1 unit" in fail_res.json()["detail"]

    # Inbound 1 unit with serial
    ok_res = await client.post("/inventory/adjustments", json={
        "inventory_item_id": inv["id"],
        "delta": 1,
        "reason": "receipt",
        "serial_number": "SN-100",
    })
    assert ok_res.status_code == 200

    # Inbound duplicate available serial should fail
    dup_res = await client.post("/inventory/adjustments", json={
        "inventory_item_id": inv["id"],
        "delta": 1,
        "reason": "receipt",
        "serial_number": "SN-100",
    })
    assert dup_res.status_code == 400


@pytest.mark.asyncio
async def test_cost_layers_and_inventory_valuation(client: AsyncClient, test_business):
    business_id = test_business.id

    wh = (await client.post("/inventory/warehouses", json={"business_id": business_id, "name": "Main WH", "code": "WH-MAIN"})).json()

    item = (await client.post("/inventory/items-master", json={
        "business_id": business_id,
        "sku": "VAL-ITEM-1",
        "name": "Valuation Item",
    })).json()

    inv = (await client.post("/inventory/items", json={"item_id": item["id"], "warehouse_id": wh["id"], "quantity_on_hand": 0})).json()

    # Inbound Layer 1: 10 units @ $10.00
    await client.post("/inventory/adjustments", json={
        "inventory_item_id": inv["id"],
        "delta": 10,
        "unit_cost": 10.00,
        "reason": "receipt",
    })

    # Inbound Layer 2: 20 units @ $20.00
    await client.post("/inventory/adjustments", json={
        "inventory_item_id": inv["id"],
        "delta": 20,
        "unit_cost": 20.00,
        "reason": "receipt",
    })

    # Valuation report (FIFO): Total Qty = 30, Total Value = (10*10) + (20*20) = 100 + 400 = $500.00
    val_res = await client.get(f"/inventory/valuation?business_id={business_id}&costing_method=FIFO")
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert float(val_data["total_valuation"]) == 500.0
    assert len(val_data["items"]) == 1
    assert val_data["items"][0]["total_quantity"] == 30

    # Consume 15 units (FIFO: 10 units @ $10 + 5 units @ $20 = $200 total COGS -> unit cost $13.33)
    out_res = await client.post("/inventory/adjustments", json={
        "inventory_item_id": inv["id"],
        "delta": -15,
        "reason": "sale",
    })
    assert out_res.status_code == 200

    # Remaining Valuation report: 15 units @ $20 = $300.00
    val_res_2 = await client.get(f"/inventory/valuation?business_id={business_id}&costing_method=FIFO")
    assert val_res_2.status_code == 200
    assert float(val_res_2.json()["total_valuation"]) == 300.0
