import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.modules.ecommerce.categories.models import Category, CategoryAttributeTemplate
from app.modules.ecommerce.categories.schemas import (
    CategoryAttributeTemplateCreate,
    CategoryCreate,
    CategoryTreeNode,
)

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
async def test_category_and_template_models(async_db: AsyncSession):
    # Create parent category
    parent_cat = Category(
        name="Electronics",
        slug="electronics",
        icon="device.png",
        description="Electronic gadgets and appliances",
    )
    async_db.add(parent_cat)
    await async_db.commit()
    await async_db.refresh(parent_cat)

    assert parent_cat.id is not None
    assert isinstance(parent_cat.id, uuid.UUID)

    # Create sub category
    sub_cat = Category(
        parent_id=parent_cat.id,
        name="Smartphones",
        slug="smartphones",
        description="Mobile phones",
    )
    async_db.add(sub_cat)
    await async_db.commit()
    await async_db.refresh(sub_cat)

    assert sub_cat.parent_id == parent_cat.id

    # Create attribute template
    attr_template = CategoryAttributeTemplate(
        category_id=sub_cat.id,
        attribute_name="RAM",
        attribute_type="select",
        is_required=True,
        options=["4GB", "8GB", "16GB"],
    )
    async_db.add(attr_template)
    await async_db.commit()
    await async_db.refresh(attr_template)

    assert attr_template.id is not None
    assert attr_template.attribute_name == "RAM"
    assert attr_template.options == ["4GB", "8GB", "16GB"]


def test_category_schemas():
    cat_create = CategoryCreate(
        name="Laptops",
        slug="laptops",
        description="High performance laptops",
        attribute_templates=[
            CategoryAttributeTemplateCreate(
                attribute_name="Processor",
                attribute_type="text",
                is_required=True,
            )
        ],
    )
    assert cat_create.name == "Laptops"
    assert len(cat_create.attribute_templates) == 1

    # Test tree node schema
    cat_id = uuid.uuid4()
    child_id = uuid.uuid4()
    now_time = "2025-01-01T00:00:00Z"

    tree = CategoryTreeNode.model_validate(
        {
            "id": cat_id,
            "name": "Computers",
            "slug": "computers",
            "is_active": True,
            "created_at": now_time,
            "updated_at": now_time,
            "attribute_templates": [],
            "children": [
                {
                    "id": child_id,
                    "parent_id": cat_id,
                    "name": "Desktops",
                    "slug": "desktops",
                    "is_active": True,
                    "created_at": now_time,
                    "updated_at": now_time,
                    "attribute_templates": [],
                    "children": [],
                }
            ],
        }
    )

    assert tree.id == cat_id
    assert len(tree.children) == 1
    assert tree.children[0].id == child_id


@pytest.mark.asyncio
async def test_category_api_crud(client: AsyncClient):
    # 1. Create Category
    create_resp = await client.post(
        "/categories/",
        json={
            "name": "Home Appliances",
            "slug": "home-appliances",
            "description": "Appliance products for home",
            "attribute_templates": [
                {
                    "attribute_name": "Power Rating",
                    "attribute_type": "text",
                    "is_required": False,
                }
            ],
        },
    )
    assert create_resp.status_code == 201
    cat_data = create_resp.json()
    cat_id = cat_data["id"]
    assert cat_data["name"] == "Home Appliances"
    assert len(cat_data["attribute_templates"]) == 1

    # 2. Get Category List
    list_resp = await client.get("/categories/")
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert len(items) >= 1

    # 3. Get Category by ID
    get_resp = await client.get(f"/categories/{cat_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["slug"] == "home-appliances"

    # 4. Update Category
    update_resp = await client.put(
        f"/categories/{cat_id}",
        json={"name": "Smart Home Appliances"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "Smart Home Appliances"

    # 5. Get Tree
    tree_resp = await client.get("/categories/tree")
    assert tree_resp.status_code == 200
    tree_data = tree_resp.json()
    assert isinstance(tree_data, list)

    # 6. Delete Category
    del_resp = await client.delete(f"/categories/{cat_id}")
    assert del_resp.status_code == 204

    # Verify 404 after deletion
    get_again = await client.get(f"/categories/{cat_id}")
    assert get_again.status_code == 404


@pytest.mark.asyncio
async def test_category_html_views(client: AsyncClient):
    # 1. Manage Page
    manage_resp = await client.get("/categories/manage")
    assert manage_resp.status_code == 200
    assert "Category List" in manage_resp.text
    assert "Ecommerce" in manage_resp.text
    assert "Category" in manage_resp.text
    assert "Brand" in manage_resp.text
    assert "Model" in manage_resp.text
    assert "Product" in manage_resp.text

    # 2. Create Page
    create_page_resp = await client.get("/categories/create")
    assert create_page_resp.status_code == 200
    assert "Create Category" in create_page_resp.text

    # 3. Create a category via API
    create_resp = await client.post(
        "/categories/",
        json={
            "name": "Laptops & Notebooks",
            "slug": "laptops-notebooks",
            "description": "Portable computers",
        },
    )
    assert create_resp.status_code == 201
    cat_id = create_resp.json()["id"]

    # 4. Detail Page
    detail_resp = await client.get(f"/categories/detail/{cat_id}")
    assert detail_resp.status_code == 200
    assert "Laptops" in detail_resp.text

    # 5. Edit Page
    edit_resp = await client.get(f"/categories/edit/{cat_id}")
    assert edit_resp.status_code == 200
    assert "Edit Category" in edit_resp.text
