import uuid
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.common.enums import Status
from app.database import Base
from app.modules.categories.models import Category
from app.modules.products.models import (
    Product,
    ProductImage,
    ProductTag,
    ProductVariant,
)
from app.modules.products.schemas import (
    ProductCreate,
    ProductListItem,
    VariantCreate,
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
async def test_product_models_and_relationships(async_db: AsyncSession):
    # Category
    category = Category(name="Footwear", slug="footwear")
    async_db.add(category)
    await async_db.commit()
    await async_db.refresh(category)

    # Tag
    tag = ProductTag(name="Running", slug="running")
    async_db.add(tag)
    await async_db.commit()

    # Product
    product = Product(
        category_id=category.id,
        title="Pro Running Shoes",
        slug="pro-running-shoes",
        brand="Speedy",
        status=Status.ACTIVE,
    )
    product.tags.append(tag)
    async_db.add(product)
    await async_db.commit()
    await async_db.refresh(product)

    assert product.id is not None
    assert product.status == Status.ACTIVE
    assert len(product.tags) == 1

    # Variant
    variant = ProductVariant(
        product_id=product.id,
        sku="SHOES-RED-42",
        attributes={"color": "Red", "size": "42"},
        price=Decimal("99.99"),
        stock_qty=50,
    )
    async_db.add(variant)
    await async_db.commit()
    await async_db.refresh(variant)

    assert variant.id is not None
    assert variant.price == Decimal("99.99")

    # Image
    image = ProductImage(
        product_id=product.id,
        variant_id=variant.id,
        url="https://example.com/shoes.jpg",
        position=1,
        alt_text="Red Shoes Side View",
    )
    async_db.add(image)
    await async_db.commit()
    await async_db.refresh(image)

    assert image.id is not None
    assert image.url == "https://example.com/shoes.jpg"


def test_product_schemas():
    prod_create = ProductCreate(
        title="Wireless Headphones",
        slug="wireless-headphones",
        brand="AudioTech",
        status=Status.ACTIVE,
        variants=[
            VariantCreate(
                sku="HEADPHONES-BLK",
                price=Decimal("149.99"),
                stock_qty=20,
            )
        ],
    )
    assert prod_create.title == "Wireless Headphones"
    assert prod_create.variants[0].price == Decimal("149.99")

    # List item schema test
    list_item = ProductListItem(
        id=uuid.uuid4(),
        title="Wireless Headphones",
        slug="wireless-headphones",
        brand="AudioTech",
        status=Status.ACTIVE,
        thumbnail_url="https://example.com/thumb.jpg",
        min_price=Decimal("149.99"),
    )
    assert list_item.min_price == Decimal("149.99")
