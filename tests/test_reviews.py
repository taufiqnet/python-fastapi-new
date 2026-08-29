import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.common.enums import Status
from app.database import Base, get_db
from app.main import app
from app.modules.ecommerce.products.models import Product

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
async def test_reviews_flow(client: AsyncClient, sync_db):
    # Setup Product
    product = Product(
        title="Reviewable Product", slug="reviewable-product", status=Status.ACTIVE
    )
    sync_db.add(product)
    sync_db.commit()

    user_id = str(uuid.uuid4())

    # 1. Create Review
    create_resp = await client.post(
        "/reviews",
        json={
            "business_id": 1,
            "product_id": str(product.id),
            "user_id": user_id,
            "rating": 5,
            "title": "Amazing quality!",
            "comment": "Exceeded my expectations.",
            "images": ["https://example.com/rev1.jpg"],
        },
    )
    assert create_resp.status_code == 201
    rev_data = create_resp.json()
    review_id = rev_data["id"]
    assert rev_data["rating"] == 5
    assert rev_data["title"] == "Amazing quality!"

    # 2. Get Product Reviews
    get_revs_resp = await client.get(f"/reviews/product/{product.id}")
    assert get_revs_resp.status_code == 200
    reviews = get_revs_resp.json()
    assert len(reviews) == 1

    # 3. Get Review Summary
    summary_resp = await client.get(f"/reviews/product/{product.id}/summary")
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert summary["average_rating"] == 5.0
    assert summary["total_reviews"] == 1
    assert summary["breakdown"]["star_5"] == 1

    # 4. Vote on Review
    voter_user_id = str(uuid.uuid4())
    vote_resp = await client.post(
        f"/reviews/{review_id}/vote",
        json={"user_id": voter_user_id, "is_helpful": True},
    )
    assert vote_resp.status_code == 200
    assert vote_resp.json()["is_helpful"] is True

    # Get review again to check updated helpful_count
    get_rev_resp = await client.get(f"/reviews/{review_id}")
    assert get_rev_resp.status_code == 200
    assert get_rev_resp.json()["helpful_count"] == 1

    # 5. Update Review
    update_resp = await client.put(
        f"/reviews/{review_id}",
        json={"rating": 4, "comment": "Updated comment"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["rating"] == 4

    # 6. Delete Review
    del_resp = await client.delete(f"/reviews/{review_id}")
    assert del_resp.status_code == 200

    # Summary after delete
    summary_after = await client.get(f"/reviews/product/{product.id}/summary")
    assert summary_after.json()["total_reviews"] == 0
