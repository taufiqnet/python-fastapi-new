from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.common.enums import Status
from app.database import Base, get_db
from app.main import app
from app.modules.ecommerce.products.models import Product, ProductVariant

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
async def test_search_flow(client: AsyncClient, sync_db):
    # Setup Products
    p1 = Product(
        business_id=1,
        title="Wireless Gaming Mouse",
        slug="wireless-gaming-mouse",
        brand="Logi",
        status=Status.ACTIVE,
        is_featured=True,
    )
    p2 = Product(
        business_id=1,
        title="Mechanical Keyboard",
        slug="mechanical-keyboard",
        brand="Keychron",
        status=Status.ACTIVE,
        is_featured=False,
    )
    sync_db.add_all([p1, p2])
    sync_db.commit()

    v1 = ProductVariant(product_id=p1.id, sku="MOUSE-1", price=Decimal("49.99"))
    v2 = ProductVariant(product_id=p2.id, sku="KEY-1", price=Decimal("99.99"))
    sync_db.add_all([v1, v2])
    sync_db.commit()

    # 1. Search with GET
    get_resp = await client.get("/search?q=Gaming&business_id=1")
    assert get_resp.status_code == 200
    res = get_resp.json()
    assert res["total"] == 1
    assert res["items"][0]["title"] == "Wireless Gaming Mouse"

    # 2. Search with POST
    post_resp = await client.post(
        "/search",
        json={
            "business_id": 1,
            "min_price": 40.0,
            "max_price": 60.0,
        },
    )
    assert post_resp.status_code == 200
    res_post = post_resp.json()
    assert res_post["total"] == 1
    assert res_post["items"][0]["slug"] == "wireless-gaming-mouse"

    # 3. Search with Brand Facets
    all_resp = await client.get("/search?business_id=1")
    assert all_resp.status_code == 200
    all_res = all_resp.json()
    assert all_res["total"] == 2
    assert len(all_res["facets"]) >= 1
