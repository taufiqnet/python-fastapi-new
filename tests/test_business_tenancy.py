import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app

sync_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
SyncTestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=sync_engine
)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=sync_engine)
    db = SyncTestingSessionLocal()
    
    def _override_get_db():
        yield db

    app.dependency_overrides[get_db] = _override_get_db
    yield
    db.close()
    Base.metadata.drop_all(bind=sync_engine)
    app.dependency_overrides.clear()


client = TestClient(app)


def test_business_crud_and_views():
    # 1. Create a new business
    payload = {
        "name_en": "Test Corp",
        "short_name": "TestCorp",
        "legal_name": "Test Corp Ltd.",
        "company_tagline": "Innovating the future",
        "description": "A test company profile",
        "cr_number": "CR-123456",
        "vat_number": "VAT-987654",
        "city": "Dhaka",
        "country": "Bangladesh",
        "email": "info@testcorp.com",
        "is_active": True,
    }

    create_res = client.post("/business/", json=payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["name_en"] == "Test Corp"
    assert "id" in created_data
    business_id = created_data["id"]

    # 2. Get business profile API
    get_res = client.get(f"/business/{business_id}")
    assert get_res.status_code == 200
    assert get_res.json()["cr_number"] == "CR-123456"

    # 3. List business profiles API
    list_res = client.get("/business/")
    assert list_res.status_code == 200
    items = list_res.json()
    assert any(b["id"] == business_id for b in items)

    # 4. Update business profile API
    payload["name_en"] = "Updated Test Corp"
    put_res = client.put(f"/business/{business_id}", json=payload)
    assert put_res.status_code == 200
    assert put_res.json()["name_en"] == "Updated Test Corp"

    # 5. Test HTML View routes
    # List Page
    page_res = client.get("/")
    assert page_res.status_code == 200
    assert "Updated Test Corp" in page_res.text

    # Create Page
    create_page_res = client.get("/businesses/create")
    assert create_page_res.status_code == 200
    assert "Create Business Profile" in create_page_res.text

    # Detail Page
    detail_page_res = client.get(f"/businesses/{business_id}")
    assert detail_page_res.status_code == 200
    assert "Updated Test Corp" in detail_page_res.text

    # Edit Page
    edit_page_res = client.get(f"/businesses/{business_id}/edit")
    assert edit_page_res.status_code == 200
    assert "Edit Business Profile" in edit_page_res.text

    # 6. Delete business profile API
    del_res = client.delete(f"/business/{business_id}")
    assert del_res.status_code == 204

    # Confirm deletion
    get_after_del = client.get(f"/business/{business_id}")
    assert get_after_del.status_code == 404
