import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

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
    # Create test business profile with id=1
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
async def test_department_views(client: AsyncClient):
    # 1. Manage view
    manage_resp = await client.get("/departments/manage")
    assert manage_resp.status_code == 200
    assert "Departments" in manage_resp.text

    # 2. Create page view
    create_page_resp = await client.get("/departments/create")
    assert create_page_resp.status_code == 200
    assert "Create Department" in create_page_resp.text

    # 3. Create department via API
    create_resp = await client.post(
        "/departments",
        json={
            "name": "Human Resources",
            "slug": "human-resources",
            "description": "HR & Recruiting",
            "is_active": True,
            "multiple_heads_allowed": True,
            "business_id": 1,
        },
    )
    assert create_resp.status_code == 201
    dept_id = create_resp.json()["id"]

    # 4. Detail view
    detail_resp = await client.get(f"/departments/detail/{dept_id}")
    assert detail_resp.status_code == 200
    assert "Human Resources" in detail_resp.text

    # 5. Edit view
    edit_resp = await client.get(f"/departments/edit/{dept_id}")
    assert edit_resp.status_code == 200
    assert "Edit Department" in edit_resp.text


@pytest.mark.asyncio
async def test_job_title_views(client: AsyncClient):
    # 1. Manage view
    manage_resp = await client.get("/job-titles/manage")
    assert manage_resp.status_code == 200
    assert "Job Titles" in manage_resp.text

    # 2. Create page view
    create_page_resp = await client.get("/job-titles/create")
    assert create_page_resp.status_code == 200
    assert "Create Job Title" in create_page_resp.text

    # 3. Create job title via API
    create_resp = await client.post(
        "/job-titles",
        json={
            "name": "HR Specialist",
            "short_name": "HRS",
            "description": "Talent acquisition",
            "is_active": True,
            "business_id": 1,
        },
    )
    assert create_resp.status_code == 201
    jt_id = create_resp.json()["id"]

    # 4. Detail view
    detail_resp = await client.get(f"/job-titles/detail/{jt_id}")
    assert detail_resp.status_code == 200
    assert "HR Specialist" in detail_resp.text

    # 5. Edit view
    edit_resp = await client.get(f"/job-titles/edit/{jt_id}")
    assert edit_resp.status_code == 200
    assert "Edit Job Title" in edit_resp.text
