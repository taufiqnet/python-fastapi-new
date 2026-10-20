import uuid
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.core.deps import get_current_user_optional, get_current_user
from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile
from app.modules.hr_payroll.organization.models import SalaryGrade, JobTitle, Department


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

    biz1 = BusinessProfile(id=1, name_en="Onoda Group", legal_name="Onoda Group Ltd")
    biz2 = BusinessProfile(id=2, name_en="Apex Holding", legal_name="Apex Holding Ltd")
    db.add_all([biz1, biz2])
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

    dummy_user = User(
        id=1,
        username="admin",
        email="admin@example.com",
        is_active=True,
        is_superuser=True,
        business_id=1,
    )
    dummy_user.get_all_permission_codes = lambda: {
        "hrm:departments:view", "hrm:departments:create", "hrm:departments:update", "hrm:departments:delete",
        "hrm:job_titles:view", "hrm:job_titles:create", "hrm:job_titles:update", "hrm:job_titles:delete",
        "hrm:employees:view", "hrm:employees:create", "hrm:employees:update", "hrm:employees:delete"
    }
    dummy_user.has_permission = lambda code: True

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user_optional] = lambda request=None: dummy_user
    app.dependency_overrides[get_current_user] = lambda request=None: dummy_user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_salary_grade_crud_and_presets(client: AsyncClient, sync_db):
    # 1. Load Presets for Corporate BD
    res_presets = await client.post("/salary-grades/presets/corporate_bd?business_id=1")
    assert res_presets.status_code == 200, res_presets.text
    data_presets = res_presets.json()
    assert data_presets["created_count"] == 7
    assert data_presets["skipped_count"] == 0

    # 2. Re-loading the same presets skips existing codes
    res_presets_dup = await client.post("/salary-grades/presets/corporate_bd?business_id=1")
    assert res_presets_dup.status_code == 200
    assert res_presets_dup.json()["created_count"] == 0
    assert res_presets_dup.json()["skipped_count"] == 7

    # 3. List Salary Grades
    res_list = await client.get("/salary-grades?business_id=1")
    assert res_list.status_code == 200
    grades = res_list.json()
    assert len(grades) == 7
    # Ordered by level_rank asc
    assert grades[0]["code"] == "M-1"
    assert grades[0]["level_rank"] == 1
    assert grades[0]["min_gross_salary"] == 200000.0
    assert grades[0]["max_gross_salary"] == 450000.0

    # 4. Create Custom Grade
    custom_grade_payload = {
        "name": "Specialist Tech Fellow",
        "code": "TECH-SPEC",
        "level_rank": 2,
        "description": "Distinguished Staff Engineer",
        "min_gross_salary": 180000.0,
        "max_gross_salary": 260000.0,
        "default_basic_percent": 50.0,
        "is_active": True,
        "business_id": 1,
    }
    res_create = await client.post("/salary-grades", json=custom_grade_payload)
    assert res_create.status_code == 201, res_create.text
    custom_grade = res_create.json()
    grade_id = custom_grade["id"]

    # 5. Duplicate code for same business should fail
    res_dup = await client.post("/salary-grades", json=custom_grade_payload)
    assert res_dup.status_code == 400
    assert "already exists" in res_dup.json()["detail"]

    # 6. Update Grade
    res_update = await client.put(f"/salary-grades/{grade_id}", json={
        "max_gross_salary": 280000.0,
        "description": "Updated Tech Fellow"
    })
    assert res_update.status_code == 200
    assert res_update.json()["max_gross_salary"] == 280000.0
    assert res_update.json()["description"] == "Updated Tech Fellow"

    # 7. Link to Job Title
    dept = Department(name="Engineering", slug="engineering", business_id=1)
    sync_db.add(dept)
    sync_db.commit()

    job_payload = {
        "name": "Principal Software Architect",
        "short_name": "PRIN-ARCH",
        "department_id": str(dept.id),
        "salary_grade_id": grade_id,
        "level_rank": 2,
        "business_id": 1,
    }
    res_job = await client.post("/job-titles", json=job_payload)
    assert res_job.status_code == 201, res_job.text
    job_data = res_job.json()
    assert job_data["salary_grade_id"] == grade_id
    assert job_data["salary_grade_name"] == "Specialist Tech Fellow"
    assert job_data["salary_grade_code"] == "TECH-SPEC"

    # 8. Export Excel
    res_export = await client.get("/salary-grades/export-excel?business_id=1")
    assert res_export.status_code == 200
    assert len(res_export.content) > 100

    # 9. Delete Grade
    res_delete = await client.delete(f"/salary-grades/{grade_id}")
    assert res_delete.status_code == 204

    # JobTitle's salary_grade_id should be set to null or unassigned
    sync_db.expire_all()
    jt = sync_db.query(JobTitle).filter(JobTitle.id == uuid.UUID(job_data["id"])).first()
    assert jt.salary_grade_id is None
