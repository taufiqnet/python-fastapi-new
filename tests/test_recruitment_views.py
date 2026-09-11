import uuid
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
async def test_recruitment_candidates_and_interviews_views(sync_db, client: AsyncClient):
    # Setup admin user
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

    # 1. Candidate List page view
    resp = await client.get("/recruitment/candidates/manage")
    assert resp.status_code == 200
    assert "Recruitment Candidates" in resp.text

    # 2. Candidate Create page view
    resp_create_page = await client.get("/recruitment/candidates/create")
    assert resp_create_page.status_code == 200
    assert "Add Candidate" in resp_create_page.text

    # 3. Create candidate via API
    cand_resp = await client.post(
        "/recruitment/candidates",
        json={
            "business_id": 1,
            "first_name": "Alice",
            "last_name": "Smith",
            "email": "alice.smith@example.com",
            "phone": "+1234567890",
        },
    )
    assert cand_resp.status_code == 201
    cand_data = cand_resp.json()
    cand_id = cand_data["id"]

    # 4. Candidate Edit page view
    resp_edit_page = await client.get(f"/recruitment/candidates/edit/{cand_id}")
    assert resp_edit_page.status_code == 200
    assert "Alice" in resp_edit_page.text

    # 5. Interview List page view
    resp_int_manage = await client.get("/recruitment/interviews/manage")
    assert resp_int_manage.status_code == 200
    assert "Interview Schedules" in resp_int_manage.text or "Interview" in resp_int_manage.text

    # 6. Interview Create page view
    resp_int_create_page = await client.get("/recruitment/interviews/create")
    assert resp_int_create_page.status_code == 200

    # 7. Create interviewer employee
    interviewer_id = str(uuid.uuid4())

    # Create interview via API
    int_resp = await client.post(
        "/recruitment/interviews",
        json={
            "business_id": 1,
            "candidate_id": cand_id,
            "interviewer_id": interviewer_id,
            "stage": "technical",
            "scheduled_at": "2026-10-01T10:00:00",
        },
    )
    assert int_resp.status_code == 201
    int_data = int_resp.json()
    int_id = int_data["id"]

    # 8. Interview Evaluate page view
    resp_eval_page = await client.get(f"/recruitment/interviews/{int_id}/evaluate")
    assert resp_eval_page.status_code == 200
