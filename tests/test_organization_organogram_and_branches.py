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
from app.modules.hr_payroll.organization.models import Branch, Department, JobTitle
from app.modules.hr_payroll.employees.models import Employee

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

    # Seed Business Profile
    biz = BusinessProfile(
        id=1,
        name_en="SuperShop Retail Group",
        legal_name="SuperShop Retail Group Ltd",
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
async def test_branch_lifecycle(client: AsyncClient, sync_db):
    # 1. Create Head Office Branch
    payload_hq = {
        "name": "Corporate Headquarters",
        "code": "HQ-01",
        "branch_type": "headquarters",
        "phone": "+880 1700-000001",
        "email": "hq@supershop.com",
        "address": "Road 11, Banani",
        "city": "Dhaka",
        "country": "Bangladesh",
        "is_head_office": True,
        "is_active": True,
        "business_id": 1,
    }
    res = await client.post("/branches", json=payload_hq)
    assert res.status_code == 201, res.text
    hq_data = res.json()
    assert hq_data["name"] == "Corporate Headquarters"
    assert hq_data["code"] == "HQ-01"
    assert hq_data["is_head_office"] is True

    # 2. Create Retail Outlet Branch
    payload_outlet = {
        "name": "Dhanmondi Retail Outlet",
        "code": "DHK-02",
        "branch_type": "retail_outlet",
        "phone": "+880 1700-000002",
        "email": "dhanmondi@supershop.com",
        "address": "Satmasjid Road",
        "city": "Dhaka",
        "country": "Bangladesh",
        "is_head_office": False,
        "is_active": True,
        "business_id": 1,
    }
    res = await client.post("/branches", json=payload_outlet)
    assert res.status_code == 201
    outlet_data = res.json()
    assert outlet_data["code"] == "DHK-02"

    # 3. List branches
    res = await client.get("/branches?business_id=1")
    assert res.status_code == 200
    branches = res.json()
    assert len(branches) == 2

    # 4. Filter by type
    res = await client.get("/branches?business_id=1&branch_type=retail_outlet")
    assert res.status_code == 200
    filtered = res.json()
    assert len(filtered) == 1
    assert filtered[0]["code"] == "DHK-02"

    # 5. Update branch
    res = await client.put(f"/branches/{outlet_data['id']}", json={"phone": "+880 1799-999999"})
    assert res.status_code == 200
    assert res.json()["phone"] == "+880 1799-999999"


@pytest.mark.asyncio
async def test_department_tree_hierarchy(client: AsyncClient, sync_db):
    # 1. Create Parent Department (Operations)
    res = await client.post("/departments", json={
        "name": "Operations",
        "code": "OPS",
        "slug": "operations",
        "description": "Company Operations",
        "is_active": True,
        "business_id": 1,
    })
    assert res.status_code == 201
    ops_id = res.json()["id"]

    # 2. Create Sub-department (Logistics)
    res = await client.post("/departments", json={
        "name": "Logistics & Supply Chain",
        "code": "LOG",
        "slug": "logistics-supply-chain",
        "description": "Fleet & Delivery",
        "parent_department_id": ops_id,
        "is_active": True,
        "business_id": 1,
    })
    assert res.status_code == 201
    log_data = res.json()
    assert log_data["parent_department_id"] == ops_id

    # 3. Fetch Department Tree
    res = await client.get("/departments/tree?business_id=1")
    assert res.status_code == 200
    tree = res.json()
    assert len(tree) == 1
    assert tree[0]["name"] == "Operations"
    assert len(tree[0]["children"]) == 1
    assert tree[0]["children"][0]["name"] == "Logistics & Supply Chain"


@pytest.mark.asyncio
async def test_organogram_reporting_and_structure(client: AsyncClient, sync_db):
    # 1. Setup Branch & Department
    branch = Branch(
        id=uuid.uuid4(),
        business_id=1,
        name="Main Corporate Branch",
        code="MAIN-01",
        branch_type="headquarters",
        is_head_office=True,
    )
    dept = Department(
        id=uuid.uuid4(),
        business_id=1,
        name="Executive Leadership",
        slug="executive-leadership",
        code="EXEC",
    )
    job_ceo = JobTitle(
        id=uuid.uuid4(),
        business_id=1,
        department_id=dept.id,
        name="Chief Executive Officer",
        level_rank=1,
    )
    job_mgr = JobTitle(
        id=uuid.uuid4(),
        business_id=1,
        department_id=dept.id,
        name="Operations Director",
        level_rank=2,
    )
    job_lead = JobTitle(
        id=uuid.uuid4(),
        business_id=1,
        department_id=dept.id,
        name="Team Lead",
        level_rank=4,
    )
    sync_db.add_all([branch, dept, job_ceo, job_mgr, job_lead])
    sync_db.commit()

    # 2. Create Hierarchy: CEO -> Operations Director -> Team Lead
    ceo_id = uuid.uuid4()
    ceo = Employee(
        id=ceo_id,
        business_id=1,
        first_name="Rahim",
        last_name="Chowdhury",
        employee_id="EMP-001",
        work_email="rahim.ceo@supershop.com",
        branch_id=branch.id,
        department_id=dept.id,
        job_title_id=job_ceo.id,
        direct_manager_id=None,
        is_active=True,
    )

    dir_id = uuid.uuid4()
    ops_dir = Employee(
        id=dir_id,
        business_id=1,
        first_name="Fatima",
        last_name="Hasan",
        employee_id="EMP-002",
        work_email="fatima.ops@supershop.com",
        branch_id=branch.id,
        department_id=dept.id,
        job_title_id=job_mgr.id,
        direct_manager_id=ceo_id,
        is_active=True,
    )

    lead_id = uuid.uuid4()
    team_lead = Employee(
        id=lead_id,
        business_id=1,
        first_name="Tanvir",
        last_name="Ahmed",
        employee_id="EMP-003",
        work_email="tanvir.lead@supershop.com",
        branch_id=branch.id,
        department_id=dept.id,
        job_title_id=job_lead.id,
        direct_manager_id=dir_id,
        is_active=True,
    )

    sync_db.add_all([ceo, ops_dir, team_lead])
    sync_db.commit()

    # 3. Test Reporting Organogram
    res = await client.get("/organization/organogram/reporting?business_id=1")
    assert res.status_code == 200, res.text
    rep_tree = res.json()

    # Top leader should be CEO
    assert len(rep_tree) == 1
    ceo_node = rep_tree[0]
    assert ceo_node["name"] == "Rahim Chowdhury"
    assert ceo_node["job_title"] == "Chief Executive Officer"
    assert ceo_node["branch"] == "Main Corporate Branch"
    assert ceo_node["subordinate_count"] == 2

    # Operations Director under CEO
    assert len(ceo_node["subordinates"]) == 1
    dir_node = ceo_node["subordinates"][0]
    assert dir_node["name"] == "Fatima Hasan"
    assert dir_node["subordinate_count"] == 1

    # Team Lead under Director
    assert len(dir_node["subordinates"]) == 1
    lead_node = dir_node["subordinates"][0]
    assert lead_node["name"] == "Tanvir Ahmed"
    assert lead_node["subordinate_count"] == 0

    # 4. Test Structure Organogram
    res = await client.get("/organization/organogram/structure?business_id=1")
    assert res.status_code == 200, res.text
    struct = res.json()
    assert struct["company_name"] == "SuperShop Retail Group"
    assert struct["total_branches"] == 1
    assert struct["total_employees"] == 3
    assert len(struct["branches"]) == 1
    assert struct["branches"][0]["branch_name"] == "Main Corporate Branch"
    assert len(struct["branches"][0]["employees"]) == 3
