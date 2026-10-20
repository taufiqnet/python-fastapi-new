import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile

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
    # Create business profile
    biz = BusinessProfile(
        id=1,
        name_en="Akij & Sons Conglomerate Ltd.",
        address_en="Akij House, 198 Bir Uttam Mir Shawkat Sarak",
        city="Dhaka",
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

    from app.core.deps import get_current_user_optional, require_permission

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user_optional] = lambda *args, **kwargs: dummy_user
    app.dependency_overrides[require_permission("hrm", "employees", "view")] = lambda *args, **kwargs: dummy_user
    app.dependency_overrides[require_permission("hrm", "employees", "create")] = lambda *args, **kwargs: dummy_user
    app.dependency_overrides[require_permission("hrm", "employees", "update")] = lambda *args, **kwargs: dummy_user
    app.dependency_overrides[require_permission("hrm", "employees", "delete")] = lambda *args, **kwargs: dummy_user

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_bangladesh_employee_creation_and_attributes(client):
    # 1. Create employee with complete Bangladesh attributes
    payload = {
        "first_name": "Tanvir",
        "last_name": "Hasan",
        "bangla_name": "তানভীর হাসান",
        "employee_id": "GOC-1001",
        "work_email": "tanvir.hasan@goc.com.bd",
        "phone": "01711000111",
        "gender": "male",
        "religion": "Islam",
        "blood_group": "B+",
        "national_id": "19922695500000001",
        "tin": "123456789012",
        "father_name": "Late Rafiqul Hasan",
        "mother_name": "Rokeya Begum",
        "present_address": "House 12, Road 5, Block C",
        "present_thana": "Banani",
        "present_district": "Dhaka",
        "present_division": "Dhaka",
        "present_post_code": "1213",
        "permanent_address": "Village: Shampur, Post: Joydebpur",
        "permanent_thana": "Gazipur Sadar",
        "permanent_district": "Gazipur",
        "permanent_division": "Dhaka",
        "permanent_post_code": "1700",
        "disbursement_method": "mfs_bkash",
        "mfs_provider": "bkash",
        "mfs_number": "01711000111",
        "employee_category": "management",
        "probation_period_months": 6,
        "is_overtime_eligible": False,
        "biometric_user_id": "1001",
        "rfid_card_number": "0009876543",
        "business_id": 1,
    }

    res = await client.post("/employees", json=payload)
    assert res.status_code == 201, res.text
    emp_data = res.json()
    emp_id = emp_data["id"]
    assert emp_data["bangla_name"] == "তানভীর হাসান"
    assert emp_data["blood_group"] == "B+"
    assert emp_data["present_thana"] == "Banani"
    assert emp_data["mfs_provider"] == "bkash"
    assert emp_data["biometric_user_id"] == "1001"

    # 2. Add Nominees (BLA 2006 Form 33)
    nominee1_payload = {
        "nominee_name": "Nasreen Akter",
        "nominee_name_bangla": "নাসরীন আক্তার",
        "relation": "Spouse",
        "nid_or_birth_cert": "19942695500000002",
        "share_percentage": 60.0,
        "phone": "01811000222",
        "address": "Banani, Dhaka",
    }
    res_nom1 = await client.post(f"/employees/{emp_id}/nominees", json=nominee1_payload)
    assert res_nom1.status_code == 201, res_nom1.text
    nom1_data = res_nom1.json()
    assert nom1_data["share_percentage"] == 60.0
    assert nom1_data["relation"] == "Spouse"

    # 3. Add second nominee (minor child) with guardian details
    nominee2_payload = {
        "nominee_name": "Tahmid Hasan",
        "relation": "Son",
        "share_percentage": 40.0,
        "is_minor": True,
        "guardian_name": "Nasreen Akter",
        "guardian_relation": "Mother",
        "guardian_phone": "01811000222",
    }
    res_nom2 = await client.post(f"/employees/{emp_id}/nominees", json=nominee2_payload)
    assert res_nom2.status_code == 201, res_nom2.text

    # 4. Attempt to add third nominee exceeding 100% total (should reject with 400)
    nominee3_payload = {
        "nominee_name": "Rafiqul Islam",
        "relation": "Brother",
        "share_percentage": 10.0,
    }
    res_nom3 = await client.post(f"/employees/{emp_id}/nominees", json=nominee3_payload)
    assert res_nom3.status_code == 400
    assert "exceed 100%" in res_nom3.json()["detail"]

    # 5. Verify Employee details includes nominees
    res_emp = await client.get(f"/employees/{emp_id}")
    assert res_emp.status_code == 200
    detail = res_emp.json()
    assert len(detail["nominees"]) == 2
    total_share = sum(n["share_percentage"] for n in detail["nominees"])
    assert total_share == 100.0

    # 6. Test Smart ID Card Generation Data
    res_card = await client.get(f"/employees/{emp_id}/id-card")
    assert res_card.status_code == 200
    card_data = res_card.json()
    assert card_data["employee_id"] == "GOC-1001"
    assert card_data["full_name"] == "Tanvir Hasan"
    assert card_data["bangla_name"] == "তানভীর হাসান"
    assert card_data["blood_group"] == "B+"
    assert card_data["biometric_user_id"] == "1001"
    assert card_data["rfid_card_number"] == "0009876543"
    assert "Akij & Sons" in card_data["company_name"]
    assert card_data["verification_url"] == "/verify/emp/GOC-1001"


@pytest.mark.asyncio
async def test_org_chart_hierarchy(client):
    # Create Manager
    mgr_res = await client.post(
        "/employees",
        json={
            "first_name": "Managing",
            "last_name": "Director",
            "employee_id": "MD-001",
            "work_email": "md@goc.com.bd",
            "business_id": 1,
        },
    )
    assert mgr_res.status_code == 201
    mgr_id = mgr_res.json()["id"]

    # Create Subordinate reporting to Manager
    sub_res = await client.post(
        "/employees",
        json={
            "first_name": "General",
            "last_name": "Manager",
            "employee_id": "GM-001",
            "work_email": "gm@goc.com.bd",
            "direct_manager_id": mgr_id,
            "business_id": 1,
        },
    )
    assert sub_res.status_code == 201

    # Fetch Org Chart
    chart_res = await client.get("/employees/org-chart?business_id=1")
    assert chart_res.status_code == 200
    chart_data = chart_res.json()
    assert len(chart_data) >= 1

    md_node = next((n for n in chart_data if n["employee_id"] == "MD-001"), None)
    assert md_node is not None
    assert len(md_node["reports"]) == 1
    assert md_node["reports"][0]["employee_id"] == "GM-001"


@pytest.mark.asyncio
async def test_employee_search_and_count(client):
    # Create two employees with distinct names and IDs
    emp1_res = await client.post(
        "/employees",
        json={
            "first_name": "Taufiq",
            "last_name": "Hossain",
            "bangla_name": "তৌফিক হোসেন",
            "employee_id": "EMP-9001",
            "work_email": "taufiq.h@company.com",
            "is_active": True,
            "business_id": 1,
        },
    )
    assert emp1_res.status_code == 201

    emp2_res = await client.post(
        "/employees",
        json={
            "first_name": "Salma",
            "last_name": "Khatun",
            "bangla_name": "সালমা খাতুন",
            "employee_id": "EMP-9002",
            "work_email": "salma.k@company.com",
            "is_active": False,
            "business_id": 1,
        },
    )
    assert emp2_res.status_code == 201

    # Total count
    count_res = await client.get("/employees/count?business_id=1")
    assert count_res.status_code == 200
    assert count_res.json()["total"] >= 2

    # Status filtered count
    active_count_res = await client.get("/employees/count?business_id=1&status=active")
    assert active_count_res.status_code == 200
    assert active_count_res.json()["total"] >= 1

    # Search by Bengali name
    search_bng_res = await client.get("/employees?business_id=1&search=তৌফিক")
    assert search_bng_res.status_code == 200
    bng_emps = search_bng_res.json()
    assert len(bng_emps) == 1
    assert bng_emps[0]["employee_id"] == "EMP-9001"

    # Search by employee ID
    search_id_res = await client.get("/employees?business_id=1&search=9002")
    assert search_id_res.status_code == 200
    id_emps = search_id_res.json()
    assert len(id_emps) == 1
    assert id_emps[0]["employee_id"] == "EMP-9002"

    # Search with count endpoint
    search_cnt_res = await client.get("/employees/count?business_id=1&search=Salma")
    assert search_cnt_res.status_code == 200
    assert search_cnt_res.json()["total"] == 1

