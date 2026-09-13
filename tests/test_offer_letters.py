import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user_optional
from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile
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
    biz = BusinessProfile(
        id=1,
        legal_name="Test Company",
        name_en="Test Company",
        cr_number="1234567890",
        vat_number="300000000000003",
    )
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
async def test_offer_letters_crud_and_views(sync_db, client: AsyncClient):
    admin_user = User(
        username="admin",
        email="admin@example.com",
        password_hash="hashed_pw",
        is_active=True,
        is_superuser=True,
    )
    sync_db.add(admin_user)
    sync_db.commit()

    async def _override_get_current_user(*args, **kwargs):
        return admin_user

    app.dependency_overrides[get_current_user_optional] = _override_get_current_user

    # 1. Manage Page
    resp = await client.get("/offer-letters/manage")
    assert resp.status_code == 200
    assert "Offer Letters" in resp.text

    # 2. Create Page
    resp_create_page = await client.get("/offer-letters/create")
    assert resp_create_page.status_code == 200
    assert "Generate Offer Letter" in resp_create_page.text

    # 3. Create Offer Letter via API
    create_resp = await client.post(
        "/offer-letters",
        json={
            "business_id": 1,
            "candidate_name": "John Doe",
            "candidate_email": "john.doe@example.com",
            "candidate_phone": "+8801700000000",
            "job_title": "Senior Software Engineer",
            "department": "Engineering",
            "offered_salary": 120000.0,
            "joining_date": "2026-05-01",
            "issue_date": "2026-04-01",
            "valid_until": "2026-04-15",
            "terms": "Standard employment contract terms.",
            "notes": "Top candidate.",
        },
    )
    assert create_resp.status_code == 201
    letter_data = create_resp.json()
    letter_id = letter_data["id"]
    assert letter_data["letter_no"].startswith("OL-")

    # 4. Get by ID API
    get_resp = await client.get(f"/offer-letters/{letter_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["candidate_name"] == "John Doe"

    # 5. Detail / Printable Page
    detail_resp = await client.get(f"/offer-letters/detail/{letter_id}")
    assert detail_resp.status_code == 200
    assert "John Doe" in detail_resp.text
    assert "JOB OFFER LETTER" in detail_resp.text

    # 6. Edit Page
    edit_page_resp = await client.get(f"/offer-letters/edit/{letter_id}")
    assert edit_page_resp.status_code == 200
    assert "Edit Offer Letter" in edit_page_resp.text

    # 7. Update API
    update_resp = await client.put(
        f"/offer-letters/{letter_id}",
        json={"status": "issued", "offered_salary": 125000.0},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "issued"
    assert update_resp.json()["offered_salary"] == 125000.0

    # 8. Delete API
    del_resp = await client.delete(f"/offer-letters/{letter_id}")
    assert del_resp.status_code == 204

    # Confirm deletion
    get_after_del = await client.get(f"/offer-letters/{letter_id}")
    assert get_after_del.status_code == 404
