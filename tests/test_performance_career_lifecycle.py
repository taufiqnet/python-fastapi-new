import datetime
import uuid
from decimal import Decimal

import pytest
import pytest_asyncio
from fastapi import Request
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user, get_current_user_optional
from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile
from app.database import Base, get_db
from app.main import app
from app.modules.hr_payroll.compensation.models import EmployeeSalary
from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.organization.models import JobTitle

sync_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
SyncTestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)


@pytest.fixture
def sync_db():
    Base.metadata.create_all(bind=sync_engine)
    db = SyncTestingSessionLocal()

    if not db.query(BusinessProfile).filter(BusinessProfile.id == 1).first():
        db.add(BusinessProfile(id=1, legal_name="Acme Corporation Ltd", name_en="Acme Corp", cr_number="1234567890", vat_number="300000000000003"))
        db.commit()
    if not db.query(User).filter(User.username == "admin").first():
        db.add(User(id=1, username="admin", email="admin@acme.com", password_hash="x", is_active=True, is_superuser=True, business_id=1))
    if not db.query(User).filter(User.username == "john.doe").first():
        db.add(User(id=2, username="john.doe", email="john.doe@acme.com", password_hash="x", is_active=True, is_superuser=False, business_id=1))
    db.commit()

    emp = db.query(Employee).filter(Employee.employee_id == "EMP-2001").first()
    if not emp:
        emp = Employee(
            id=uuid.uuid4(), business_id=1, user_id=2, employee_id="EMP-2001", first_name="John", last_name="Doe",
            work_email="john.doe@acme.com", date_of_birth=datetime.date(1992, 5, 10), start_date=datetime.date(2026, 1, 1),
            probation_end_date=datetime.date(2026, 7, 1), probation_period_months=6,
        )
        db.add(emp)
        db.commit()
    try:
        yield db
    finally:
        db.close()


@pytest_asyncio.fixture
async def client(sync_db):
    def _override_get_db():
        yield sync_db

    admin_user = sync_db.query(User).filter(User.username == "admin").first()

    async def _override_user(request: Request = None):
        return admin_user

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = _override_user
    app.dependency_overrides[get_current_user_optional] = _override_user
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


def _emp(db) -> Employee:
    return db.query(Employee).filter(Employee.employee_id == "EMP-2001").first()


@pytest.mark.asyncio
async def test_goals_and_appraisal_pipeline(sync_db, client):
    emp = _emp(sync_db)
    cyc = await client.post("/performance/cycles", json={"title": "FY26", "start_date": "2026-01-01", "end_date": "2026-12-31"})
    assert cyc.status_code == 201, cyc.text
    cycle_id = cyc.json()["id"]

    base = {"employee_id": str(emp.id), "cycle_id": cycle_id, "target_value": 100}
    g1 = await client.post("/performance/goals", json={**base, "title": "Sales", "weightage": 60})
    assert g1.status_code == 201, g1.text
    over = await client.post("/performance/goals", json={**base, "title": "Quality", "weightage": 50})
    assert over.status_code == 400, over.text
    ok = await client.post("/performance/goals", json={**base, "title": "Quality", "weightage": 40})
    assert ok.status_code == 201, ok.text

    ap = await client.post("/performance/appraisals", json={"employee_id": str(emp.id), "cycle_id": cycle_id})
    assert ap.status_code == 201, ap.text
    aid = ap.json()["id"]
    assert ap.json()["status"] == "self_review_pending"

    r = await client.post(f"/performance/appraisals/{aid}/self-review", json={"self_evaluation_text": "good", "self_overall_score": 4})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "manager_review_pending"
    r = await client.post(f"/performance/appraisals/{aid}/manager-review", json={"manager_evaluation_text": "ok", "manager_overall_score": 4})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "calibration_pending"
    r = await client.post(f"/performance/appraisals/{aid}/calibrate", json={"calibrated_score": 4.2})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "acknowledgement_pending"
    assert r.json()["final_rating_label"]
    r = await client.post(f"/performance/appraisals/{aid}/acknowledge")
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "completed"


@pytest.mark.asyncio
async def test_probation_confirm_and_extend(sync_db, client):
    emp = _emp(sync_db)
    desk = await client.get("/lifecycle/probation")
    assert desk.status_code == 200 and any(d["employee_id"] == str(emp.id) for d in desk.json())

    ext = await client.post(
        "/lifecycle/probation/reviews", json={"employee_id": str(emp.id), "recommendation": "extend_probation", "extension_months": 3}
    )
    assert ext.status_code == 201, ext.text
    dec = await client.post(f"/lifecycle/probation/reviews/{ext.json()['id']}/decide", json={"approve": True})
    assert dec.status_code == 200, dec.text
    sync_db.refresh(emp)
    assert emp.probation_end_date == datetime.date(2026, 10, 1)

    conf = await client.post("/lifecycle/probation/reviews", json={"employee_id": str(emp.id), "recommendation": "confirm"})
    assert conf.status_code == 201, conf.text
    dec = await client.post(f"/lifecycle/probation/reviews/{conf.json()['id']}/decide", json={"approve": True})
    assert dec.status_code == 200, dec.text
    sync_db.refresh(emp)
    assert emp.confirmation_date is not None
    letter = await client.get(f"/lifecycle/probation/reviews/{conf.json()['id']}/letter")
    assert letter.status_code == 200 and letter.json()["reference_no"].startswith("CNF-")


@pytest.mark.asyncio
async def test_promotion_transfer_increment(sync_db, client):
    emp = _emp(sync_db)
    jt = JobTitle(business_id=1, name="Senior Engineer")
    sync_db.add(jt)
    sal = EmployeeSalary(
        business_id=1, employee_id=emp.id, effective_from=datetime.date(2026, 1, 1),
        basic_salary=Decimal("50000"), house_rent=Decimal("0"), medical_allowance=Decimal("0"),
        transport_allowance=Decimal("0"), food_allowance=Decimal("0"), other_allowance=Decimal("0"),
        gross_salary=Decimal("50000"), net_salary=Decimal("50000"),
    )
    sync_db.add(sal)
    sync_db.commit()

    # Promotion + percentage increment
    mv = await client.post(
        "/lifecycle/movements",
        json={
            "employee_id": str(emp.id), "action_type": "promotion_and_increment", "effective_date": "2026-11-01",
            "new_job_title_id": str(jt.id), "increment_type": "percentage", "increment_value": 10,
        },
    )
    assert mv.status_code == 201, mv.text
    assert mv.json()["status"] == "pending_approval"
    dec = await client.post(f"/lifecycle/movements/{mv.json()['id']}/decide", json={"approve": True})
    assert dec.status_code == 200, dec.text
    assert dec.json()["status"] == "applied"
    sync_db.refresh(emp)
    sync_db.refresh(sal)
    assert emp.job_title_id == jt.id
    assert Decimal(str(sal.basic_salary)) == Decimal("55000.00")

    # Fixed-amount increment
    mv2 = await client.post(
        "/lifecycle/movements",
        json={"employee_id": str(emp.id), "action_type": "increment", "effective_date": "2026-12-01", "increment_type": "fixed_amount", "increment_value": 2000},
    )
    assert mv2.status_code == 201, mv2.text
    dec = await client.post(f"/lifecycle/movements/{mv2.json()['id']}/decide", json={"approve": True})
    assert dec.status_code == 200, dec.text
    sync_db.refresh(sal)
    assert Decimal(str(sal.basic_salary)) == Decimal("57000.00")

    # Invalid payload
    bad = await client.post("/lifecycle/movements", json={"employee_id": str(emp.id), "action_type": "transfer", "effective_date": "2026-12-01"})
    assert bad.status_code == 422


@pytest.mark.asyncio
async def test_disciplinary_flow(sync_db, client):
    emp = _emp(sync_db)
    case = await client.post(
        "/lifecycle/disciplinary/cases",
        json={"employee_id": str(emp.id), "incident_date": "2026-10-01", "allegation_title": "Unauthorized absence"},
    )
    assert case.status_code == 201, case.text
    cid = case.json()["id"]

    # Warning before show-cause must be rejected
    early = await client.post(f"/lifecycle/disciplinary/cases/{cid}/action", json={"sanction_type": "written_warning"})
    assert early.status_code == 400, early.text

    short = await client.post(
        f"/lifecycle/disciplinary/cases/{cid}/show-cause", json={"issue_date": "2026-10-02", "response_deadline": "2026-10-05"}
    )
    assert short.status_code == 400, short.text

    sc = await client.post(f"/lifecycle/disciplinary/cases/{cid}/show-cause", json={"issue_date": "2026-10-02"})
    assert sc.status_code == 200, sc.text
    assert sc.json()["current_stage"] == "show_cause_issued"

    ex = await client.post(f"/lifecycle/disciplinary/cases/{cid}/explanation", json={"employee_explanation": "Medical emergency"})
    assert ex.status_code == 200, ex.text

    act = await client.post(f"/lifecycle/disciplinary/cases/{cid}/action", json={"sanction_type": "written_warning"})
    assert act.status_code == 200, act.text
    assert act.json()["current_stage"] == "closed"
    assert len(act.json()["actions"]) == 1

    stats = await client.get("/lifecycle/overview/stats")
    assert stats.status_code == 200
