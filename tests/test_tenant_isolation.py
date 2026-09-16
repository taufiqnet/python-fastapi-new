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
async def setup_tenants(sync_db):
    def _override_get_db():
        yield sync_db

    app.dependency_overrides[get_db] = _override_get_db

    superuser = User(
        id=1,
        username="superuser",
        email="super@example.com",
        is_active=True,
        is_superuser=True,
        business_id=1,
    )
    superuser.get_all_permission_codes = lambda: {
        "hrm:departments:view", "hrm:departments:create", "hrm:departments:update", "hrm:departments:delete",
        "hrm:job_titles:view", "hrm:job_titles:create", "hrm:job_titles:update", "hrm:job_titles:delete",
        "hrm:employees:view", "hrm:employees:create", "hrm:employees:update", "hrm:employees:delete",
        "hrm:compensation:view", "hrm:compensation:create", "hrm:compensation:update", "hrm:compensation:delete",
        "hrm:holidays:view", "hrm:holidays:create", "hrm:holidays:update", "hrm:holidays:delete",
        "hrm:payroll_periods:view", "hrm:payroll_periods:create", "hrm:payroll_periods:update", "hrm:payroll_periods:delete",
        "hrm:payroll_records:view", "hrm:payroll_records:create", "hrm:payroll_records:update", "hrm:payroll_records:delete",
        "hrm:payroll_settings:view", "hrm:payroll_settings:update",
        "hrm:recruitment:view", "hrm:recruitment:create", "hrm:recruitment:update", "hrm:recruitment:delete",
        "hrm:appointment_letters:view", "hrm:appointment_letters:create", "hrm:appointment_letters:update", "hrm:appointment_letters:delete",
        "hrm:salary_certificates:view", "hrm:salary_certificates:create", "hrm:salary_certificates:update", "hrm:salary_certificates:delete",
        "hrm:offer_letters:view", "hrm:offer_letters:create", "hrm:offer_letters:update", "hrm:offer_letters:delete",
        "hrm:experience_letters:view", "hrm:experience_letters:create", "hrm:experience_letters:update", "hrm:experience_letters:delete",
        "hrm:notice_board:view", "hrm:notice_board:create", "hrm:notice_board:update", "hrm:notice_board:delete",
    }
    superuser.has_permission = lambda code: True

    user_a = User(
        id=2,
        username="usera",
        email="usera@example.com",
        is_active=True,
        is_superuser=False,
        business_id=1,
    )
    user_a.get_all_permission_codes = lambda: {
        "hrm:departments:view", "hrm:departments:create", "hrm:departments:update", "hrm:departments:delete",
        "hrm:job_titles:view", "hrm:job_titles:create", "hrm:job_titles:update", "hrm:job_titles:delete",
        "hrm:employees:view", "hrm:employees:create", "hrm:employees:update", "hrm:employees:delete",
        "hrm:compensation:view", "hrm:compensation:create", "hrm:compensation:update", "hrm:compensation:delete",
        "hrm:holidays:view", "hrm:holidays:create", "hrm:holidays:update", "hrm:holidays:delete",
        "hrm:payroll_periods:view", "hrm:payroll_periods:create", "hrm:payroll_periods:update", "hrm:payroll_periods:delete",
        "hrm:payroll_records:view", "hrm:payroll_records:create", "hrm:payroll_records:update", "hrm:payroll_records:delete",
        "hrm:payroll_settings:view", "hrm:payroll_settings:update",
        "hrm:recruitment:view", "hrm:recruitment:create", "hrm:recruitment:update", "hrm:recruitment:delete",
        "hrm:appointment_letters:view", "hrm:appointment_letters:create", "hrm:appointment_letters:update", "hrm:appointment_letters:delete",
        "hrm:salary_certificates:view", "hrm:salary_certificates:create", "hrm:salary_certificates:update", "hrm:salary_certificates:delete",
        "hrm:offer_letters:view", "hrm:offer_letters:create", "hrm:offer_letters:update", "hrm:offer_letters:delete",
        "hrm:experience_letters:view", "hrm:experience_letters:create", "hrm:experience_letters:update", "hrm:experience_letters:delete",
        "hrm:notice_board:view", "hrm:notice_board:create", "hrm:notice_board:update", "hrm:notice_board:delete",
    }
    user_a.has_permission = lambda code: True

    user_b = User(
        id=3,
        username="userb",
        email="userb@example.com",
        is_active=True,
        is_superuser=False,
        business_id=2,
    )
    user_b.get_all_permission_codes = lambda: {
        "hrm:departments:view", "hrm:departments:create", "hrm:departments:update", "hrm:departments:delete",
        "hrm:job_titles:view", "hrm:job_titles:create", "hrm:job_titles:update", "hrm:job_titles:delete",
        "hrm:employees:view", "hrm:employees:create", "hrm:employees:update", "hrm:employees:delete",
        "hrm:compensation:view", "hrm:compensation:create", "hrm:compensation:update", "hrm:compensation:delete",
        "hrm:holidays:view", "hrm:holidays:create", "hrm:holidays:update", "hrm:holidays:delete",
        "hrm:payroll_periods:view", "hrm:payroll_periods:create", "hrm:payroll_periods:update", "hrm:payroll_periods:delete",
        "hrm:payroll_records:view", "hrm:payroll_records:create", "hrm:payroll_records:update", "hrm:payroll_records:delete",
        "hrm:payroll_settings:view", "hrm:payroll_settings:update",
        "hrm:recruitment:view", "hrm:recruitment:create", "hrm:recruitment:update", "hrm:recruitment:delete",
        "hrm:appointment_letters:view", "hrm:appointment_letters:create", "hrm:appointment_letters:update", "hrm:appointment_letters:delete",
        "hrm:salary_certificates:view", "hrm:salary_certificates:create", "hrm:salary_certificates:update", "hrm:salary_certificates:delete",
        "hrm:offer_letters:view", "hrm:offer_letters:create", "hrm:offer_letters:update", "hrm:offer_letters:delete",
        "hrm:experience_letters:view", "hrm:experience_letters:create", "hrm:experience_letters:update", "hrm:experience_letters:delete",
        "hrm:notice_board:view", "hrm:notice_board:create", "hrm:notice_board:update", "hrm:notice_board:delete",
    }
    user_b.has_permission = lambda code: True

    yield {
        "superuser": superuser,
        "user_a": user_a,
        "user_b": user_b,
        "sync_db": sync_db,
    }

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_employee_tenant_isolation(setup_tenants):
    ctx = setup_tenants
    superuser = ctx["superuser"]
    user_a = ctx["user_a"]
    user_b = ctx["user_b"]

    transport = ASGITransport(app=app)

    # 1. Superuser creates Employee A (Business 1) and Employee B (Business 2)
    app.dependency_overrides[get_current_user_optional] = lambda request=None: superuser
    app.dependency_overrides[get_current_user] = lambda request=None: superuser

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_a = await ac.post("/employees", json={
            "first_name": "Alice",
            "last_name": "Smith",
            "employee_id": "EMP-A1",
            "work_email": "alice@biz1.com",
            "business_id": 1,
        })
        assert res_a.status_code == 201, res_a.text
        emp_a_id = res_a.json()["id"]

        res_b = await ac.post("/employees", json={
            "first_name": "Bob",
            "last_name": "Jones",
            "employee_id": "EMP-B2",
            "work_email": "bob@biz2.com",
            "business_id": 2,
        })
        assert res_b.status_code == 201, res_b.text
        emp_b_id = res_b.json()["id"]

    # 2. Test User A (Business 1, non-superuser)
    app.dependency_overrides[get_current_user_optional] = lambda request=None: user_a
    app.dependency_overrides[get_current_user] = lambda request=None: user_a

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # List employees: should only see EMP A
        res_list = await ac.get("/employees")
        assert res_list.status_code == 200
        ids = [e["id"] for e in res_list.json()]
        assert emp_a_id in ids
        assert emp_b_id not in ids

        # Query param business_id=2 ignored, returning Business 1 employees
        res_param = await ac.get("/employees?business_id=2")
        assert res_param.status_code == 200
        param_ids = [e["id"] for e in res_param.json()]
        assert emp_a_id in param_ids
        assert emp_b_id not in param_ids

        # Accessing EMP B by ID (GET, PUT, DELETE) returns 404 Not Found
        res_get = await ac.get(f"/employees/{emp_b_id}")
        assert res_get.status_code == 404
        assert res_get.json()["detail"] == "Employee not found"

        res_put = await ac.put(f"/employees/{emp_b_id}", json={"first_name": "Hacked Bob"})
        assert res_put.status_code == 404
        assert res_put.json()["detail"] == "Employee not found"

        res_del = await ac.delete(f"/employees/{emp_b_id}")
        assert res_del.status_code == 404
        assert res_del.json()["detail"] == "Employee not found"

        # Creating employee with business_id=2 forced to 1
        res_create = await ac.post("/employees", json={
            "first_name": "Charlie",
            "last_name": "Brown",
            "employee_id": "EMP-A2",
            "work_email": "charlie@biz1.com",
            "business_id": 2,
        })
        assert res_create.status_code == 201
        assert res_create.json()["business_id"] == 1


@pytest.mark.asyncio
async def test_compensation_tenant_isolation(setup_tenants):
    ctx = setup_tenants
    superuser = ctx["superuser"]
    user_a = ctx["user_a"]
    user_b = ctx["user_b"]

    transport = ASGITransport(app=app)

    # Setup employees for Business 1 & 2
    app.dependency_overrides[get_current_user_optional] = lambda request=None: superuser
    app.dependency_overrides[get_current_user] = lambda request=None: superuser

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_e1 = await ac.post("/employees", json={
            "first_name": "Dave",
            "employee_id": "EMP-D1",
            "work_email": "dave@biz1.com",
            "business_id": 1,
        })
        e1_id = res_e1.json()["id"]

        res_e2 = await ac.post("/employees", json={
            "first_name": "Eve",
            "employee_id": "EMP-E2",
            "work_email": "eve@biz2.com",
            "business_id": 2,
        })
        e2_id = res_e2.json()["id"]

        # Create Salary A (Business 1) & Salary B (Business 2)
        res_s1 = await ac.post("/compensation/salaries", json={
            "employee_id": e1_id,
            "business_id": 1,
            "basic_salary": 5000,
            "effective_from": "2025-01-01",
        })
        assert res_s1.status_code == 201, res_s1.text
        s1_id = res_s1.json()["id"]

        res_s2 = await ac.post("/compensation/salaries", json={
            "employee_id": e2_id,
            "business_id": 2,
            "basic_salary": 6000,
            "effective_from": "2025-01-01",
        })
        assert res_s2.status_code == 201, res_s2.text
        s2_id = res_s2.json()["id"]

    # Test User A (Business 1, non-superuser)
    app.dependency_overrides[get_current_user_optional] = lambda request=None: user_a
    app.dependency_overrides[get_current_user] = lambda request=None: user_a

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # List salaries: only Salary 1
        res_list = await ac.get("/compensation/salaries")
        assert res_list.status_code == 200
        s_ids = [s["id"] for s in res_list.json()]
        assert s1_id in s_ids
        assert s2_id not in s_ids

        # Query param business_id=2 ignored
        res_param = await ac.get("/compensation/salaries?business_id=2")
        assert res_param.status_code == 200
        param_s_ids = [s["id"] for s in res_param.json()]
        assert s1_id in param_s_ids
        assert s2_id not in param_s_ids

        # GET, PUT, DELETE Salary 2 returns 404 Not Found
        res_get = await ac.get(f"/compensation/salaries/{s2_id}")
        assert res_get.status_code == 404
        assert res_get.json()["detail"] == "Compensation record not found"

        res_put = await ac.put(f"/compensation/salaries/{s2_id}", json={"basic_salary": 9999})
        assert res_put.status_code == 404
        assert res_put.json()["detail"] == "Compensation record not found"

        res_del = await ac.delete(f"/compensation/salaries/{s2_id}")
        assert res_del.status_code == 404
        assert res_del.json()["detail"] == "Compensation record not found"


@pytest.mark.asyncio
async def test_payroll_setup_tenant_isolation(setup_tenants):
    ctx = setup_tenants
    superuser = ctx["superuser"]
    user_a = ctx["user_a"]

    transport = ASGITransport(app=app)

    # Create Period A (Business 1) & Period B (Business 2) as Superuser
    app.dependency_overrides[get_current_user_optional] = lambda request=None: superuser
    app.dependency_overrides[get_current_user] = lambda request=None: superuser

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_p1 = await ac.post("/payroll/periods", json={
            "name": "Jan 2025 (Biz 1)",
            "business_id": 1,
            "start_date": "2025-01-01",
            "end_date": "2025-01-31",
            "status": "draft",
        })
        assert res_p1.status_code == 201
        p1_id = res_p1.json()["id"]

        res_p2 = await ac.post("/payroll/periods", json={
            "name": "Jan 2025 (Biz 2)",
            "business_id": 2,
            "start_date": "2025-01-01",
            "end_date": "2025-01-31",
            "status": "draft",
        })
        assert res_p2.status_code == 201
        p2_id = res_p2.json()["id"]

        # Create Holiday A (Business 1) & Holiday B (Business 2)
        res_h1 = await ac.post("/payroll/holidays", json={
            "name": "Biz 1 Holiday",
            "holiday_type": "public",
            "business_id": 1,
            "start_date": "2025-01-01",
            "end_date": "2025-01-01",
            "is_paid": True,
        })
        assert res_h1.status_code == 201
        h1_id = res_h1.json()["id"]

        res_h2 = await ac.post("/payroll/holidays", json={
            "name": "Biz 2 Holiday",
            "holiday_type": "public",
            "business_id": 2,
            "start_date": "2025-01-01",
            "end_date": "2025-01-01",
            "is_paid": True,
        })
        assert res_h2.status_code == 201
        h2_id = res_h2.json()["id"]

    # Test User A (Business 1, non-superuser)
    app.dependency_overrides[get_current_user_optional] = lambda request=None: user_a
    app.dependency_overrides[get_current_user] = lambda request=None: user_a

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Periods list
        res_plist = await ac.get("/payroll/periods?business_id=2")
        assert res_plist.status_code == 200
        p_ids = [p["id"] for p in res_plist.json()]
        assert p1_id in p_ids
        assert p2_id not in p_ids

        # GET Period B returns 404 Not Found
        res_pget = await ac.get(f"/payroll/periods/{p2_id}")
        assert res_pget.status_code == 404
        assert res_pget.json()["detail"] == "Payroll period not found"

        # Holidays list
        res_hlist = await ac.get("/payroll/holidays?business_id=2")
        assert res_hlist.status_code == 200
        h_ids = [h["id"] for h in res_hlist.json()]
        assert h1_id in h_ids
        assert h2_id not in h_ids

        # GET Holiday B returns 404 Not Found
        res_hget = await ac.get(f"/payroll/holidays/{h2_id}")
        assert res_hget.status_code == 404
        assert res_hget.json()["detail"] == "Holiday not found"

        # Payroll settings query business_id=2 returns User A's settings (Business 1)
        res_set = await ac.get("/payroll/settings?business_id=2")
        assert res_set.status_code == 200
        assert res_set.json()["business_id"] == 1


@pytest.mark.asyncio
async def test_recruitment_tenant_isolation(setup_tenants):
    ctx = setup_tenants
    superuser = ctx["superuser"]
    user_a = ctx["user_a"]

    transport = ASGITransport(app=app)

    # Superuser creates Candidate A (Business 1) and Candidate B (Business 2)
    app.dependency_overrides[get_current_user_optional] = lambda request=None: superuser
    app.dependency_overrides[get_current_user] = lambda request=None: superuser

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_c1 = await ac.post("/recruitment/candidates", json={
            "first_name": "Cand1",
            "last_name": "One",
            "email": "cand1@biz1.com",
            "business_id": 1,
        })
        assert res_c1.status_code == 201
        c1_id = res_c1.json()["id"]

        res_c2 = await ac.post("/recruitment/candidates", json={
            "first_name": "Cand2",
            "last_name": "Two",
            "email": "cand2@biz2.com",
            "business_id": 2,
        })
        assert res_c2.status_code == 201
        c2_id = res_c2.json()["id"]

    # Test User A (Business 1, non-superuser)
    app.dependency_overrides[get_current_user_optional] = lambda request=None: user_a
    app.dependency_overrides[get_current_user] = lambda request=None: user_a

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # List candidates: only Candidate 1
        res_list = await ac.get("/recruitment/candidates?business_id=2")
        assert res_list.status_code == 200
        c_ids = [c["id"] for c in res_list.json()]
        assert c1_id in c_ids
        assert c2_id not in c_ids

        # GET Candidate 2 returns 404 Not Found
        res_get = await ac.get(f"/recruitment/candidates/{c2_id}")
        assert res_get.status_code == 404
        assert res_get.json()["detail"] == f"Candidate with ID '{c2_id}' not found."

        # PUT Candidate 2 returns 404 Not Found
        res_put = await ac.put(f"/recruitment/candidates/{c2_id}", json={"first_name": "Hacked Cand2"})
        assert res_put.status_code == 404
        assert res_put.json()["detail"] == f"Candidate with ID '{c2_id}' not found."

        # DELETE Candidate 2 returns 404 Not Found
        res_del = await ac.delete(f"/recruitment/candidates/{c2_id}")
        assert res_del.status_code == 404
        assert res_del.json()["detail"] == f"Candidate with ID '{c2_id}' not found."

    # Superuser creates Interview A (Business 1) & Interview B (Business 2)
    app.dependency_overrides[get_current_user_optional] = lambda request=None: superuser
    app.dependency_overrides[get_current_user] = lambda request=None: superuser

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_e1 = await ac.post("/employees", json={
            "first_name": "Interviewer1",
            "employee_id": "INT-1",
            "work_email": "int1@biz1.com",
            "business_id": 1,
        })
        e1_id = res_e1.json()["id"]

        res_e2 = await ac.post("/employees", json={
            "first_name": "Interviewer2",
            "employee_id": "INT-2",
            "work_email": "int2@biz2.com",
            "business_id": 2,
        })
        e2_id = res_e2.json()["id"]

        res_i1 = await ac.post("/recruitment/interviews", json={
            "business_id": 1,
            "candidate_id": c1_id,
            "interviewer_id": e1_id,
            "stage": "technical",
            "scheduled_at": "2025-02-01T10:00:00",
            "duration_minutes": 60,
        })
        assert res_i1.status_code == 201
        i1_id = res_i1.json()["id"]

        res_i2 = await ac.post("/recruitment/interviews", json={
            "business_id": 2,
            "candidate_id": c2_id,
            "interviewer_id": e2_id,
            "stage": "technical",
            "scheduled_at": "2025-02-01T10:00:00",
            "duration_minutes": 60,
        })
        assert res_i2.status_code == 201
        i2_id = res_i2.json()["id"]

    # User A (Business 1, non-superuser)
    app.dependency_overrides[get_current_user_optional] = lambda request=None: user_a
    app.dependency_overrides[get_current_user] = lambda request=None: user_a

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # List interviews: only Interview 1
        res_ilist = await ac.get("/recruitment/interviews?business_id=2")
        assert res_ilist.status_code == 200
        i_ids = [i["id"] for i in res_ilist.json()]
        assert i1_id in i_ids
        assert i2_id not in i_ids

        # GET Interview 2 returns 404 Not Found
        res_iget = await ac.get(f"/recruitment/interviews/{i2_id}")
        assert res_iget.status_code == 404
        assert res_iget.json()["detail"] == f"Interview with ID '{i2_id}' not found."

        # DELETE Interview 2 returns 404 Not Found
        res_idel = await ac.delete(f"/recruitment/interviews/{i2_id}")
        assert res_idel.status_code == 404
        assert res_idel.json()["detail"] == f"Interview with ID '{i2_id}' not found."


@pytest.mark.asyncio
async def test_documents_and_notice_tenant_isolation(setup_tenants):
    ctx = setup_tenants
    superuser = ctx["superuser"]
    user_a = ctx["user_a"]

    transport = ASGITransport(app=app)

    # Superuser creates records for Business 1 & Business 2
    app.dependency_overrides[get_current_user_optional] = lambda request=None: superuser
    app.dependency_overrides[get_current_user] = lambda request=None: superuser

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Appointment Letters
        res_app1 = await ac.post("/appointment-letters", json={
            "business_id": 1,
            "candidate_name": "Appt Cand 1",
            "candidate_email": "appt1@biz1.com",
            "offered_basic_salary": 5000,
            "offered_gross_salary": 6000,
            "offered_joining_date": "2025-03-01",
            "issue_date": "2025-02-01",
            "valid_until": "2025-02-15",
        })
        assert res_app1.status_code == 201
        app1_id = res_app1.json()["id"]

        res_app2 = await ac.post("/appointment-letters", json={
            "business_id": 2,
            "candidate_name": "Appt Cand 2",
            "candidate_email": "appt2@biz2.com",
            "offered_basic_salary": 5000,
            "offered_gross_salary": 6000,
            "offered_joining_date": "2025-03-01",
            "issue_date": "2025-02-01",
            "valid_until": "2025-02-15",
        })
        assert res_app2.status_code == 201
        app2_id = res_app2.json()["id"]

        # Offer Letters
        res_off1 = await ac.post("/offer-letters", json={
            "business_id": 1,
            "candidate_name": "Offer Cand 1",
            "candidate_email": "offer1@biz1.com",
            "job_title": "Developer",
            "offered_salary": 7000,
            "joining_date": "2025-03-01",
            "issue_date": "2025-02-01",
        })
        assert res_off1.status_code == 201
        off1_id = res_off1.json()["id"]

        res_off2 = await ac.post("/offer-letters", json={
            "business_id": 2,
            "candidate_name": "Offer Cand 2",
            "candidate_email": "offer2@biz2.com",
            "job_title": "Developer",
            "offered_salary": 7000,
            "joining_date": "2025-03-01",
            "issue_date": "2025-02-01",
        })
        assert res_off2.status_code == 201
        off2_id = res_off2.json()["id"]

        # Notice Board
        res_not1 = await ac.post("/notices", json={
            "business_id": 1,
            "title": "Biz 1 Announcement",
            "content": "Notice content for biz 1",
            "category": "general",
            "target_audience": "all",
            "publish_date": "2025-02-01T10:00:00",
        })
        assert res_not1.status_code == 201
        not1_id = res_not1.json()["id"]

        res_not2 = await ac.post("/notices", json={
            "business_id": 2,
            "title": "Biz 2 Announcement",
            "content": "Notice content for biz 2",
            "category": "general",
            "target_audience": "all",
            "publish_date": "2025-02-01T10:00:00",
        })
        assert res_not2.status_code == 201
        not2_id = res_not2.json()["id"]

    # Test User A (Business 1, non-superuser)
    app.dependency_overrides[get_current_user_optional] = lambda request=None: user_a
    app.dependency_overrides[get_current_user] = lambda request=None: user_a

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Appointment Letters listing & 404
        res_app_list = await ac.get("/appointment-letters?business_id=2")
        assert res_app_list.status_code == 200
        app_ids = [a["id"] for a in res_app_list.json()]
        assert app1_id in app_ids
        assert app2_id not in app_ids

        res_app_get2 = await ac.get(f"/appointment-letters/{app2_id}")
        assert res_app_get2.status_code == 404

        # Offer Letters listing & 404
        res_off_list = await ac.get("/offer-letters?business_id=2")
        assert res_off_list.status_code == 200
        off_ids = [o["id"] for o in res_off_list.json()]
        assert off1_id in off_ids
        assert off2_id not in off_ids

        res_off_get2 = await ac.get(f"/offer-letters/{off2_id}")
        assert res_off_get2.status_code == 404

        # Notices listing & 404
        res_not_list = await ac.get("/notices?business_id=2")
        assert res_not_list.status_code == 200
        not_ids = [n["id"] for n in res_not_list.json()]
        assert not1_id in not_ids
        assert not2_id not in not_ids

        res_not_get2 = await ac.get(f"/notices/{not2_id}")
        assert res_not_get2.status_code == 404
