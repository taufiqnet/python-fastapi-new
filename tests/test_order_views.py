import io
import uuid
import openpyxl
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
    # Seed business profile with id=1
    biz = BusinessProfile(id=1, name_en="Test Business", is_active=True)
    db.add(biz)
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

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_order_views_and_excel_import(client: AsyncClient):
    # 1. Test Order List Page
    response = await client.get("/orders/manage")
    assert response.status_code == 200
    assert "Order List" in response.text
    assert "Import Excel" in response.text

    # 2. Test Order Create Page
    response = await client.get("/orders/create")
    assert response.status_code == 200
    assert "Create New Order" in response.text

    # 3. Test Order Excel Template Download
    response = await client.get("/orders/template-excel?business_id=1")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    # 4. Create an Order via API
    cat_resp = await client.post("/categories/", json={
        "name": "Order Test Cat",
        "slug": f"order-test-cat-{uuid.uuid4().hex[:6]}",
        "business_id": 1
    })
    assert cat_resp.status_code == 201

    prod_resp = await client.post("/products/", json={
        "title": "Order Test Product",
        "slug": f"order-test-prod-{uuid.uuid4().hex[:6]}",
        "business_id": 1,
        "category_id": cat_resp.json()["id"],
        "variants": [{
            "sku": f"ORD-SKU-{uuid.uuid4().hex[:6]}",
            "price": 49.99,
            "stock_qty": 100,
            "is_default": True
        }]
    })
    assert prod_resp.status_code == 201
    product_data = prod_resp.json()
    variant_id = product_data["variants"][0]["id"]
    variant_sku = product_data["variants"][0]["sku"]

    order_payload = {
        "business_id": 1,
        "user_id": str(uuid.uuid4()),
        "currency": "USD",
        "items": [{"variant_id": variant_id, "quantity": 2}],
        "shipping_address": {
            "address_type": "shipping",
            "recipient_name": "Test Customer",
            "phone": "+123456789",
            "street": "123 Test St",
            "city": "Testville",
            "state": "TS",
            "zip_code": "12345",
            "country": "USA"
        }
    }
    create_order_resp = await client.post("/orders", json=order_payload)
    assert create_order_resp.status_code == 201
    order_data = create_order_resp.json()
    order_id = order_data["id"]

    # 5. Test Order Detail Page
    detail_resp = await client.get(f"/orders/detail/{order_id}?business_id=1")
    assert detail_resp.status_code == 200
    assert order_data["order_number"] in detail_resp.text
    assert "Test Customer" in detail_resp.text

    # 6. Test Order Edit Page
    edit_resp = await client.get(f"/orders/edit/{order_id}?business_id=1")
    assert edit_resp.status_code == 200
    assert "Update Order Status" in edit_resp.text

    # 7. Test Order Status Update
    status_resp = await client.put(f"/orders/{order_id}/status?business_id=1", json={
        "payment_status": "paid",
        "fulfillment_status": "shipped",
        "note": "Shipped via Test Courier"
    })
    assert status_resp.status_code == 200
    assert status_resp.json()["payment_status"] == "paid"
    assert status_resp.json()["fulfillment_status"] == "shipped"

    # 8. Test Orders Excel Import
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Orders"
    ws.append([
        "Recipient Name", "Street", "City", "State", "Zip Code", "Country",
        "Product SKU", "Quantity", "Currency", "Payment Status", "Fulfillment Status"
    ])
    ws.append([
        "Imported Person", "456 Import Ave", "Import City", "IC", "67890", "USA",
        variant_sku, 3, "USD", "paid", "delivered"
    ])
    excel_file = io.BytesIO()
    wb.save(excel_file)
    excel_file.seek(0)

    import_resp = await client.post(
        "/orders/import-excel?business_id=1",
        files={"file": ("orders_import.xlsx", excel_file.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    )
    assert import_resp.status_code == 200
    assert import_resp.json()["imported_count"] == 1
