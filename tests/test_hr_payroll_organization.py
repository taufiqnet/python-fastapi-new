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
async def test_department_and_job_title_crud(client: AsyncClient):
    # 1. Create Department
    dept_payload = {
        "name": "Engineering",
        "slug": "engineering",
        "description": "Software & Infrastructure",
        "is_active": True,
        "multiple_heads_allowed": False,
        "business_id": 1,
    }
    response = await client.post("/departments", json=dept_payload)
    assert response.status_code == 201, response.text
    dept_data = response.json()
    assert dept_data["name"] == "Engineering"
    assert dept_data["slug"] == "engineering"
    dept_id = dept_data["id"]

    # 2. Duplicate Department (should fail)
    response_dup = await client.post("/departments", json=dept_payload)
    assert response_dup.status_code == 400

    # 3. Get Department List & Detail
    response = await client.get(f"/departments/{dept_id}")
    assert response.status_code == 200
    assert response.json()["id"] == dept_id

    response = await client.get("/departments?business_id=1")
    assert response.status_code == 200
    assert len(response.json()) >= 1

    # 4. Update Department
    update_payload = {"name": "Software Engineering"}
    response = await client.put(f"/departments/{dept_id}", json=update_payload)
    assert response.status_code == 200
    assert response.json()["name"] == "Software Engineering"

    # 5. Create Job Title for Department
    jt_payload = {
        "name": "Senior Software Engineer",
        "short_name": "Sr. SE",
        "description": "Backend specialist",
        "is_active": True,
        "department_id": dept_id,
        "business_id": 1,
    }
    response = await client.post("/job-titles", json=jt_payload)
    assert response.status_code == 201, response.text
    jt_data = response.json()
    assert jt_data["name"] == "Senior Software Engineer"
    jt_id = jt_data["id"]

    # 6. Duplicate Job Title in same Department (should fail)
    response_dup_jt = await client.post("/job-titles", json=jt_payload)
    assert response_dup_jt.status_code == 400

    # 7. Get Job Title Detail & List
    response = await client.get(f"/job-titles/{jt_id}")
    assert response.status_code == 200
    assert response.json()["id"] == jt_id

    response = await client.get(f"/job-titles?department_id={dept_id}")
    assert response.status_code == 200
    assert len(response.json()) == 1

    # 8. Update Job Title
    response = await client.put(
        f"/job-titles/{jt_id}", json={"short_name": "Lead SE"}
    )
    assert response.status_code == 200
    assert response.json()["short_name"] == "Lead SE"

    # 9. Delete Job Title
    response = await client.delete(f"/job-titles/{jt_id}")
    assert response.status_code == 204

    response = await client.get(f"/job-titles/{jt_id}")
    assert response.status_code == 404

    # 10. Delete Department
    response = await client.delete(f"/departments/{dept_id}")
    assert response.status_code == 204

    response = await client.get(f"/departments/{dept_id}")
    assert response.status_code == 404
