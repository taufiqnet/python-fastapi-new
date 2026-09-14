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
        "hrm:job_titles:view", "hrm:job_titles:create", "hrm:job_titles:update", "hrm:job_titles:delete"
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


@pytest.mark.asyncio
async def test_department_import_mandatory_business_and_header_mapping(client: AsyncClient, sync_db):
    import openpyxl
    from io import BytesIO

    # 1. Test template download with invalid business_id=0
    res_bad_tpl = await client.get("/departments/template-excel?business_id=0")
    assert res_bad_tpl.status_code == 400
    assert "Business profile ID is mandatory" in res_bad_tpl.json()["detail"]

    # 2. Test import with invalid business_id=0
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Department Name", "Slug", "Description"])
    ws.append(["Sales", "sales", "Sales Dept"])
    output = BytesIO()
    wb.save(output)
    files = {"file": ("test.xlsx", output.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}

    res_bad_imp = await client.post("/departments/import-excel?business_id=0", files=files)
    assert res_bad_imp.status_code == 400
    assert "Business profile ID is mandatory" in res_bad_imp.json()["detail"]

    # 3. Test import with extra columns (such as Business Profile ID and Business Profile Name from export)
    wb_hdr = openpyxl.Workbook()
    ws_hdr = wb_hdr.active
    ws_hdr.append([
        "Department ID", "Department Name", "Slug", "Description",
        "Business Profile ID", "Business Profile Name", "Multiple Heads Allowed", "Status"
    ])
    ws_hdr.append([
        "dept-123", "Marketing", "marketing", "Marketing & PR",
        "1", "Main Business", "No", "Active"
    ])
    out_hdr = BytesIO()
    wb_hdr.save(out_hdr)
    files_hdr = {"file": ("exported_depts.xlsx", out_hdr.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}

    res_imp = await client.post("/departments/import-excel?business_id=1", files=files_hdr)
    assert res_imp.status_code == 200
    data = res_imp.json()
    assert data["imported_count"] == 1

    dept_res = await client.get("/departments?business_id=1")
    assert dept_res.status_code == 200
    depts = [d for d in dept_res.json() if d["slug"] == "marketing"]
    assert len(depts) == 1
    assert depts[0]["name"] == "Marketing"


@pytest.mark.asyncio
async def test_department_tenant_isolation(sync_db):
    def _override_get_db():
        yield sync_db

    superuser = User(
        id=1,
        username="superuser",
        email="super@example.com",
        is_active=True,
        is_superuser=True,
        business_id=1,
    )
    superuser.get_all_permission_codes = lambda: {"hrm:departments:view", "hrm:departments:create", "hrm:departments:update", "hrm:departments:delete"}
    superuser.has_permission = lambda code: True

    user_a = User(
        id=2,
        username="usera",
        email="usera@example.com",
        is_active=True,
        is_superuser=False,
        business_id=1,
    )
    user_a.get_all_permission_codes = lambda: {"hrm:departments:view", "hrm:departments:create", "hrm:departments:update", "hrm:departments:delete"}
    user_a.has_permission = lambda code: True

    user_b = User(
        id=3,
        username="userb",
        email="userb@example.com",
        is_active=True,
        is_superuser=False,
        business_id=2,
    )
    user_b.get_all_permission_codes = lambda: {"hrm:departments:view", "hrm:departments:create", "hrm:departments:update", "hrm:departments:delete"}
    user_b.has_permission = lambda code: True

    app.dependency_overrides[get_db] = _override_get_db

    # 1. Superuser creates Dept A in Business 1 & Dept B in Business 2
    app.dependency_overrides[get_current_user_optional] = lambda request=None: superuser
    app.dependency_overrides[get_current_user] = lambda request=None: superuser

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_a = await ac.post("/departments", json={
            "name": "HR Dept",
            "slug": "hr-dept",
            "description": "HR for Business 1",
            "business_id": 1,
        })
        assert res_a.status_code == 201, res_a.text
        dept_a_id = res_a.json()["id"]

        res_b = await ac.post("/departments", json={
            "name": "Finance Dept",
            "slug": "finance-dept",
            "description": "Finance for Business 2",
            "business_id": 2,
        })
        assert res_b.status_code == 201, res_b.text
        dept_b_id = res_b.json()["id"]

    # 2. Test User A (Business 1, non-superuser)
    app.dependency_overrides[get_current_user_optional] = lambda request=None: user_a
    app.dependency_overrides[get_current_user] = lambda request=None: user_a

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # User A list departments: should only see Dept A
        res_list = await ac.get("/departments")
        assert res_list.status_code == 200
        dept_ids = [d["id"] for d in res_list.json()]
        assert dept_a_id in dept_ids
        assert dept_b_id not in dept_ids

        # User A search for Dept B: should return empty
        res_search = await ac.get("/departments?search=Finance")
        assert res_search.status_code == 200
        assert len(res_search.json()) == 0

        # User A specifies business_id=2 in query param: ignored in favor of own business_id=1
        res_param = await ac.get("/departments?business_id=2")
        assert res_param.status_code == 200
        param_ids = [d["id"] for d in res_param.json()]
        assert dept_a_id in param_ids
        assert dept_b_id not in param_ids

        # User A requests Dept B by ID (get, update, delete): returns 404 Not Found
        res_get = await ac.get(f"/departments/{dept_b_id}")
        assert res_get.status_code == 404
        assert res_get.json()["detail"] == "Department not found"

        res_put = await ac.put(f"/departments/{dept_b_id}", json={"name": "Hacked Finance"})
        assert res_put.status_code == 404
        assert res_put.json()["detail"] == "Department not found"

        res_del = await ac.delete(f"/departments/{dept_b_id}")
        assert res_del.status_code == 404
        assert res_del.json()["detail"] == "Department not found"

        # User A creates department with business_id=2 in body: forced to user_a.business_id (1)
        res_create = await ac.post("/departments", json={
            "name": "Legal Dept",
            "slug": "legal-dept",
            "business_id": 2,
        })
        assert res_create.status_code == 201
        assert res_create.json()["business_id"] == 1

    # 3. Test User B (Business 2, non-superuser)
    app.dependency_overrides[get_current_user_optional] = lambda request=None: user_b
    app.dependency_overrides[get_current_user] = lambda request=None: user_b

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_list = await ac.get("/departments")
        assert res_list.status_code == 200
        b_ids = [d["id"] for d in res_list.json()]
        assert dept_b_id in b_ids
        assert dept_a_id not in b_ids

        res_get = await ac.get(f"/departments/{dept_a_id}")
        assert res_get.status_code == 404

    # 4. Test Superuser
    app.dependency_overrides[get_current_user_optional] = lambda request=None: superuser
    app.dependency_overrides[get_current_user] = lambda request=None: superuser

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_super_b = await ac.get("/departments?business_id=2")
        assert res_super_b.status_code == 200
        super_b_ids = [d["id"] for d in res_super_b.json()]
        assert dept_b_id in super_b_ids
        assert dept_a_id not in super_b_ids

        res_get_a = await ac.get(f"/departments/{dept_a_id}")
        assert res_get_a.status_code == 200

        res_get_b = await ac.get(f"/departments/{dept_b_id}")
        assert res_get_b.status_code == 200

    app.dependency_overrides.clear()
