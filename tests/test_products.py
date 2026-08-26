import uuid
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.common.enums import Status
from app.database import Base, get_db
from app.main import app
from app.modules.categories.models import Category
from app.modules.products.models import (
    MediaType,
    Product,
    ProductCondition,
    ProductImage,
    ProductTag,
    ProductType,
    ProductVariant,
)
from app.modules.products.schemas import (
    MediaType as SchemaMediaType,
    ProductCondition as SchemaProductCondition,
    ProductCreate,
    ProductImageCreate,
    ProductListItem,
    ProductType as SchemaProductType,
    ProductUpdate,
    VariantCreate,
)
from app.modules.sellers.models import Seller  # noqa: F401

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
async def test_product_models_and_relationships(async_db: AsyncSession):
    # Category
    category = Category(name="Footwear", slug="footwear")
    async_db.add(category)
    await async_db.commit()
    await async_db.refresh(category)

    # Seller
    seller = Seller(store_name="Speedy Store", slug="speedy-store")
    async_db.add(seller)
    await async_db.commit()
    await async_db.refresh(seller)

    # Tag
    tag = ProductTag(name="Running", slug="running")
    async_db.add(tag)
    await async_db.commit()

    # Product
    product = Product(
        category_id=category.id,
        seller_id=seller.id,
        title="Pro Running Shoes",
        slug="pro-running-shoes",
        brand="Speedy",
        status=Status.ACTIVE,
        condition=ProductCondition.NEW,
        product_type=ProductType.PHYSICAL,
        requires_shipping=True,
        meta_title="Best Pro Running Shoes",
        meta_description="Top quality pro running shoes",
        is_featured=True,
    )
    product.tags.append(tag)
    async_db.add(product)
    await async_db.commit()
    await async_db.refresh(product)

    assert product.id is not None
    assert product.status == Status.ACTIVE
    assert product.condition == ProductCondition.NEW
    assert product.product_type == ProductType.PHYSICAL
    assert product.is_featured is True
    assert len(product.tags) == 1

    # Variant
    variant = ProductVariant(
        product_id=product.id,
        sku="SHOES-RED-42",
        barcode="1234567890123",
        attributes={"color": "Red", "size": "42"},
        price=Decimal("99.99"),
        compare_at_price=Decimal("120.00"),
        cost_price=Decimal("50.00"),
        currency="USD",
        stock_qty=50,
        low_stock_threshold=5,
        backorder_allowed=False,
        is_default=True,
        weight=Decimal("0.800"),
        weight_unit="kg",
    )
    async_db.add(variant)
    await async_db.commit()
    await async_db.refresh(variant)

    assert variant.id is not None
    assert variant.price == Decimal("99.99")
    assert variant.compare_at_price == Decimal("120.00")
    assert variant.barcode == "1234567890123"
    assert variant.is_default is True

    # Image
    image = ProductImage(
        product_id=product.id,
        variant_id=variant.id,
        url="https://example.com/shoes.jpg",
        position=1,
        alt_text="Red Shoes Side View",
        is_primary=True,
        media_type=MediaType.IMAGE,
    )
    async_db.add(image)
    await async_db.commit()
    await async_db.refresh(image)

    assert image.id is not None
    assert image.url == "https://example.com/shoes.jpg"
    assert image.is_primary is True
    assert image.media_type == MediaType.IMAGE


def test_product_schemas():
    prod_create = ProductCreate(
        title="Wireless Headphones",
        slug="wireless-headphones",
        brand="AudioTech",
        status=Status.ACTIVE,
        condition=SchemaProductCondition.NEW,
        product_type=SchemaProductType.PHYSICAL,
        requires_shipping=True,
        meta_title="Wireless Headphones SEO",
        meta_description="SEO Description",
        is_featured=True,
        variants=[
            VariantCreate(
                sku="HEADPHONES-BLK",
                barcode="9876543210123",
                price=Decimal("149.99"),
                compare_at_price=Decimal("199.99"),
                cost_price=Decimal("80.00"),
                currency="USD",
                stock_qty=20,
                low_stock_threshold=3,
                is_default=True,
                weight=Decimal("0.350"),
                weight_unit="kg",
            )
        ],
        images=[
            ProductImageCreate(
                url="https://example.com/headphones.jpg",
                position=0,
                alt_text="Headphones main view",
                is_primary=True,
                media_type=SchemaMediaType.IMAGE,
            )
        ],
    )
    assert prod_create.title == "Wireless Headphones"
    assert prod_create.condition == SchemaProductCondition.NEW
    assert prod_create.variants[0].price == Decimal("149.99")
    assert prod_create.variants[0].compare_at_price == Decimal("199.99")
    assert prod_create.variants[0].cost_price == Decimal("80.00")
    assert prod_create.images[0].is_primary is True

    # Update schema
    prod_update = ProductUpdate(
        title="Updated Title",
        condition=SchemaProductCondition.REFURBISHED,
        is_featured=False,
    )
    assert prod_update.title == "Updated Title"
    assert prod_update.condition == SchemaProductCondition.REFURBISHED

    # List item schema test
    list_item = ProductListItem(
        id=uuid.uuid4(),
        title="Wireless Headphones",
        slug="wireless-headphones",
        brand="AudioTech",
        status=Status.ACTIVE,
        thumbnail_url="https://example.com/thumb.jpg",
        min_price=Decimal("149.99"),
        is_featured=True,
        average_rating=Decimal("4.50"),
    )
    assert list_item.min_price == Decimal("149.99")
    assert list_item.is_featured is True
    assert list_item.average_rating == Decimal("4.50")


@pytest.mark.asyncio
async def test_product_api_crud(client: AsyncClient):
    # 1. Create Tag via API
    tag_resp = await client.post(
        "/products/tags",
        json={"name": "Wireless", "slug": "wireless"},
    )
    assert tag_resp.status_code == 201
    tag_id = tag_resp.json()["id"]

    # 2. Get Tags
    tags_list_resp = await client.get("/products/tags")
    assert tags_list_resp.status_code == 200
    assert len(tags_list_resp.json()) >= 1

    # 3. Create Product via API
    prod_resp = await client.post(
        "/products/",
        json={
            "title": "Smart Watch Series 5",
            "slug": "smart-watch-series-5",
            "brand": "TechBrand",
            "status": "active",
            "condition": "new",
            "product_type": "physical",
            "requires_shipping": True,
            "is_featured": True,
            "tag_ids": [tag_id],
            "variants": [
                {
                    "sku": "WATCH-S5-BLK",
                    "price": "299.99",
                    "stock_qty": 15,
                    "is_default": True,
                }
            ],
            "images": [
                {
                    "url": "https://example.com/watch.jpg",
                    "position": 0,
                    "is_primary": True,
                    "media_type": "image",
                }
            ],
            "attributes": [
                {
                    "name": "Color",
                    "values": [{"value": "Black"}, {"value": "Silver"}],
                }
            ],
        },
    )
    assert prod_resp.status_code == 201
    p_data = prod_resp.json()
    product_id = p_data["id"]
    assert p_data["title"] == "Smart Watch Series 5"
    assert len(p_data["variants"]) == 1
    assert len(p_data["images"]) == 1
    assert len(p_data["attributes"]) == 1
    assert len(p_data["tags"]) == 1

    # 4. List Products (ProductListItem DTO)
    list_resp = await client.get("/products/")
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert len(items) >= 1
    assert items[0]["title"] == "Smart Watch Series 5"
    assert Decimal(str(items[0]["min_price"])) == Decimal("299.99")

    # 5. Get Product Detail
    detail_resp = await client.get(f"/products/{product_id}")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["slug"] == "smart-watch-series-5"

    # 6. Update Product
    upd_resp = await client.put(
        f"/products/{product_id}",
        json={"title": "Smart Watch Series 5 Pro", "is_featured": False},
    )
    assert upd_resp.status_code == 200
    assert upd_resp.json()["title"] == "Smart Watch Series 5 Pro"

    # 7. Add Variant
    var_resp = await client.post(
        f"/products/{product_id}/variants",
        json={
            "sku": "WATCH-S5-SLV",
            "price": "319.99",
            "stock_qty": 10,
        },
    )
    assert var_resp.status_code == 201
    var_id = var_resp.json()["id"]

    # 8. Delete Variant
    del_var_resp = await client.delete(f"/products/variants/{var_id}")
    assert del_var_resp.status_code == 204

    # 9. Delete Product
    del_prod_resp = await client.delete(f"/products/{product_id}")
    assert del_prod_resp.status_code == 204

    # Verify 404 after deletion
    get_again = await client.get(f"/products/{product_id}")
    assert get_again.status_code == 404
