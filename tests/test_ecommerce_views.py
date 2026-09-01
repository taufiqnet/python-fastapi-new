import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
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
async def test_brand_views_and_crud(client: AsyncClient):
    # 1. List view
    list_resp = await client.get("/brands")
    assert list_resp.status_code == 200
    assert "Brands" in list_resp.text

    # 2. Create view
    create_page_resp = await client.get("/brands/create")
    assert create_page_resp.status_code == 200
    assert "Create Brand" in create_page_resp.text

    # 3. Create brand via API
    create_resp = await client.post(
        "/brands/",
        json={
            "name": "Sony",
            "slug": "sony",
            "description": "Sony electronics",
            "is_active": True,
        },
    )
    assert create_resp.status_code == 201
    brand_id = create_resp.json()["id"]

    # 4. Detail view
    detail_resp = await client.get(f"/brands/detail/{brand_id}")
    assert detail_resp.status_code == 200
    assert "Sony" in detail_resp.text

    # 5. Edit view
    edit_resp = await client.get(f"/brands/edit/{brand_id}")
    assert edit_resp.status_code == 200
    assert "Edit Brand" in edit_resp.text

    # 6. Delete brand
    del_resp = await client.delete(f"/brands/{brand_id}")
    assert del_resp.status_code == 204


@pytest.mark.asyncio
async def test_model_views_and_crud(client: AsyncClient):
    # Create brand first
    b_resp = await client.post(
        "/brands/",
        json={"name": "Samsung", "slug": "samsung", "is_active": True},
    )
    assert b_resp.status_code == 201
    brand_id = b_resp.json()["id"]

    # 1. Model List view
    list_resp = await client.get("/brands/models")
    assert list_resp.status_code == 200
    assert "Product Models" in list_resp.text

    # 2. Model Create view
    create_page_resp = await client.get("/brands/models/create")
    assert create_page_resp.status_code == 200
    assert "Create Model" in create_page_resp.text

    # 3. Create model via API
    m_resp = await client.post(
        f"/brands/{brand_id}/models",
        json={
            "name": "Galaxy S24",
            "slug": "galaxy-s24",
            "description": "Flagship model",
            "is_active": True,
        },
    )
    assert m_resp.status_code == 201
    model_id = m_resp.json()["id"]

    # 4. Model Detail view
    detail_resp = await client.get(f"/brands/models/detail/{model_id}")
    assert detail_resp.status_code == 200
    assert "Galaxy S24" in detail_resp.text

    # 5. Model Edit view
    edit_resp = await client.get(f"/brands/models/edit/{model_id}")
    assert edit_resp.status_code == 200
    assert "Edit Model" in edit_resp.text

    # 6. Delete model
    del_resp = await client.delete(f"/brands/models/{model_id}")
    assert del_resp.status_code == 204


@pytest.mark.asyncio
async def test_product_views_and_crud(client: AsyncClient):
    # 1. Product List view
    list_resp = await client.get("/products")
    assert list_resp.status_code == 200
    assert "Products" in list_resp.text

    # 2. Product Create view
    create_page_resp = await client.get("/products/create")
    assert create_page_resp.status_code == 200
    assert "Create Product" in create_page_resp.text

    # 3. Create product via API
    p_resp = await client.post(
        "/products/",
        json={
            "title": "Smart Watch Ultra",
            "slug": "smart-watch-ultra",
            "description": "Advanced smartwatch",
            "status": "active",
            "condition": "new",
            "product_type": "physical",
            "requires_shipping": True,
            "is_featured": True,
        },
    )
    assert p_resp.status_code == 201
    product_id = p_resp.json()["id"]

    # 4. Product Detail view
    detail_resp = await client.get(f"/products/detail/{product_id}")
    assert detail_resp.status_code == 200
    assert "Smart Watch Ultra" in detail_resp.text

    # 5. Product Edit view
    edit_resp = await client.get(f"/products/edit/{product_id}")
    assert edit_resp.status_code == 200
    assert "Edit Product" in edit_resp.text

    # 6. Delete product
    del_resp = await client.delete(f"/products/{product_id}")
    assert del_resp.status_code == 204
