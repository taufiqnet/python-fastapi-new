import uuid
from datetime import datetime, timezone
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
        name_en="Test Business Transfers & Counts",
    )
    sync_db.add(bp)
    sync_db.commit()
    sync_db.refresh(bp)
    return bp


@pytest.mark.asyncio
async def test_warehouse_transfer_workflow(client: AsyncClient, test_business):
    business_id = test_business.id

    wh_src = (await client.post("/inventory/warehouses", json={"business_id": business_id, "name": "Source WH", "code": "WH-SRC"})).json()
    wh_dst = (await client.post("/inventory/warehouses", json={"business_id": business_id, "name": "Dest WH", "code": "WH-DST"})).json()

    item = (await client.post("/inventory/items-master", json={"business_id": business_id, "sku": "TRANSFER-ITEM-1", "name": "Transfer Item"})).json()

    # Receive 100 units into source warehouse
    inv_src = (await client.post("/inventory/items", json={"item_id": item["id"], "warehouse_id": wh_src["id"], "quantity_on_hand": 0})).json()
    await client.post("/inventory/adjustments", json={"inventory_item_id": inv_src["id"], "delta": 100, "reason": "receipt"})

    # 1. Create Draft Transfer (40 units)
    t_res = await client.post("/inventory/transfers", json={
        "business_id": business_id,
        "transfer_number": "TR-001",
        "source_warehouse_id": wh_src["id"],
        "destination_warehouse_id": wh_dst["id"],
        "lines": [{"item_id": item["id"], "quantity": 40}],
    })
    assert t_res.status_code == 201
    transfer = t_res.json()
    transfer_id = transfer["id"]
    assert transfer["status"] == "draft"

    # 2. Ship Transfer -> Source stock deducts by 40 (remaining 60), status -> in_transit
    ship_res = await client.post(f"/inventory/transfers/{transfer_id}/ship?business_id={business_id}")
    assert ship_res.status_code == 200
    assert ship_res.json()["status"] == "in_transit"

    inv_src_chk = (await client.get(f"/inventory/items/{inv_src['id']}")).json()
    assert inv_src_chk["quantity_on_hand"] == 60

    # 3. Receive Transfer -> Destination stock gains 40, status -> received
    recv_res = await client.post(f"/inventory/transfers/{transfer_id}/receive?business_id={business_id}")
    assert recv_res.status_code == 200
    assert recv_res.json()["status"] == "received"

    inv_dst_list = (await client.get(f"/inventory/items?item_id={item['id']}&warehouse_id={wh_dst['id']}")).json()
    assert len(inv_dst_list) == 1
    assert inv_dst_list[0]["quantity_on_hand"] == 40


@pytest.mark.asyncio
async def test_cycle_count_workflow(client: AsyncClient, test_business):
    business_id = test_business.id

    wh = (await client.post("/inventory/warehouses", json={"business_id": business_id, "name": "Count WH", "code": "WH-COUNT"})).json()
    item = (await client.post("/inventory/items-master", json={"business_id": business_id, "sku": "COUNT-ITEM-1", "name": "Count Item"})).json()

    inv = (await client.post("/inventory/items", json={"item_id": item["id"], "warehouse_id": wh["id"], "quantity_on_hand": 0})).json()
    await client.post("/inventory/adjustments", json={"inventory_item_id": inv["id"], "delta": 50, "reason": "receipt"})

    # 1. Create Draft Count session
    cnt_res = await client.post("/inventory/counts", json={
        "business_id": business_id,
        "warehouse_id": wh["id"],
        "scheduled_date": datetime.now(timezone.utc).isoformat(),
        "item_ids": [item["id"]],
    })
    assert cnt_res.status_code == 201
    count = cnt_res.json()
    count_id = count["id"]
    assert count["status"] == "draft"
    assert count["lines"][0]["system_quantity"] == 50

    # 2. Start Count -> status in_progress
    start_res = await client.post(f"/inventory/counts/{count_id}/start?business_id={business_id}")
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "in_progress"

    # 3. Record Count (Counted 45 units -> variance -5)
    rec_res = await client.post(f"/inventory/counts/{count_id}/record?business_id={business_id}", json={
        "counts": {item["id"]: 45}
    })
    assert rec_res.status_code == 200
    assert rec_res.json()["lines"][0]["variance"] == -5
    assert rec_res.json()["lines"][0]["recount_flag"] is True

    # 4. Complete Count -> Posts count_correction movement (-5 units)
    comp_res = await client.post(f"/inventory/counts/{count_id}/complete?business_id={business_id}")
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "completed"

    inv_chk = (await client.get(f"/inventory/items/{inv['id']}")).json()
    assert inv_chk["quantity_on_hand"] == 45


@pytest.mark.asyncio
async def test_reorder_alerts(client: AsyncClient, test_business):
    business_id = test_business.id

    wh = (await client.post("/inventory/warehouses", json={"business_id": business_id, "name": "Alert WH", "code": "WH-ALERT"})).json()
    item = (await client.post("/inventory/items-master", json={"business_id": business_id, "sku": "LOW-STOCK-1", "name": "Low Stock Item"})).json()

    # Create inventory item with reorder_point = 20, reorder_quantity = 50, quantity_on_hand = 15
    inv = (await client.post("/inventory/items", json={
        "item_id": item["id"],
        "warehouse_id": wh["id"],
        "quantity_on_hand": 15,
        "reorder_point": 20,
        "reorder_quantity": 50,
    })).json()

    # Query reorder alerts
    alert_res = await client.get(f"/inventory/reorder-alerts?business_id={business_id}")
    assert alert_res.status_code == 200
    alerts = alert_res.json()
    assert len(alerts) == 1
    a = alerts[0]
    assert a["sku"] == "LOW-STOCK-1"
    assert a["quantity_available"] == 15
    assert a["reorder_point"] == 20
    assert a["suggested_order_quantity"] == 50
