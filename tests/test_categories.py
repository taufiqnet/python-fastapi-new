import uuid

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.modules.categories.models import Category, CategoryAttributeTemplate
from app.modules.categories.schemas import (
    CategoryAttributeTemplateCreate,
    CategoryCreate,
    CategoryTreeNode,
)

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


@pytest_asyncio.fixture
async def async_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


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
