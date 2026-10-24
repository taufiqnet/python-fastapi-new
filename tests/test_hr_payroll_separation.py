import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
import pytest_asyncio
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
from app.modules.hr_payroll.organization.models import Department, JobTitle

sync_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
SyncTestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)


@pytest.fixture
def sync_db():
    Base.metadata.create_all(bind=sync_engine)
    db = SyncTestingSessionLocal()
    try:
        # Create Business Profile
        biz = BusinessProfile(
            id=1,
            name_en="Apex Horizon Ltd",
            email="hr@apexhorizon.com",
            phone="+8801700000000",
        )
        db.add(biz)
        db.commit()
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
        "hrm:employees:view",
        "hrm:employees:create",
        "hrm:employees:update",
        "hrm:resignations:view",
        "hrm:resignations:create",
        "hrm:resignations:update",
        "hrm:separations:view",
        "hrm:separations:create",
        "hrm:separations:update",
        "hrm:department_clearances:view",
        "hrm:department_clearances:update",
        "hrm:exit_interviews:view",
        "hrm:exit_interviews:create",
        "hrm:final_settlements:view",
        "hrm:final_settlements:create",
        "hrm:final_settlements:update",
        "hrm:release_letters:view",
        "hrm:release_letters:create",
    }
    dummy_user.has_permission = lambda code: True

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user_optional] = lambda request=None: dummy_user
    app.dependency_overrides[get_current_user] = lambda request=None: dummy_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
def test_employee(sync_db) -> Employee:
    dept = Department(name="Engineering", code="ENG", slug="engineering", business_id=1)
    title = JobTitle(name="Senior Engineer", short_name="SR-ENG", business_id=1)
    sync_db.add_all([dept, title])
    sync_db.commit()

    emp = Employee(
        business_id=1,
        first_name="Tariqul",
        last_name="Islam",
        employee_id="EMP-9001",
        work_email="tariqul.islam@apexhorizon.com",
        phone="+8801811223344",
        department_id=dept.id,
        job_title_id=title.id,
        start_date=date.today() - timedelta(days=365 * 6),  # 6 years of service
        is_active=True,
    )
    sync_db.add(emp)
    sync_db.commit()
    sync_db.refresh(emp)

    # Add compensation structure (Basic 50,000, Gross 80,000)
    salary = EmployeeSalary(
        business_id=1,
        employee_id=emp.id,
        basic_salary=50000.0,
        house_rent=25000.0,
        medical_allowance=5000.0,
        gross_salary=80000.0,
        net_salary=75000.0,
        provident_fund=5000.0,
        effective_from=date.today() - timedelta(days=365),
    )
    sync_db.add(salary)
    sync_db.commit()
    return emp


@pytest.mark.asyncio
async def test_complete_separation_lifecycle(client: AsyncClient, test_employee: Employee, sync_db):
    emp_id = str(test_employee.id)

    # 1. Resignation Submission
    notice_date = date.today()
    proposed_lwd = notice_date + timedelta(days=20)  # 20 days served out of 30 -> 10 days shortfall
    res_payload = {
        "employee_id": emp_id,
        "notice_date": notice_date.isoformat(),
        "proposed_last_working_day": proposed_lwd.isoformat(),
        "contractual_notice_days": 30,
        "reason_category": "career_growth",
        "resignation_letter": "I hereby tender my resignation to pursue a new career milestone.",
        "handover_notes": "All git repos transferred to lead.",
    }
    res_resp = await client.post("/separation/resignations?business_id=1", json=res_payload)
    assert res_resp.status_code == 201
    res_data = res_resp.json()
    assert res_data["status"] == "submitted"
    assert res_data["served_notice_days"] == 20
    assert res_data["shortfall_notice_days"] == 10
    res_id = res_data["id"]

    # 2. Resignation Review & Approval
    review_resp = await client.post(
        f"/separation/resignations/{res_id}/review?business_id=1",
        json={
            "status": "approved",
            "approved_last_working_day": proposed_lwd.isoformat(),
        },
    )
    assert review_resp.status_code == 200
    assert review_resp.json()["status"] == "approved"

    # Verify EmployeeSeparation was auto-initiated
    seps_resp = await client.get(f"/separation/separations?business_id=1&employee_id={emp_id}")
    assert seps_resp.status_code == 200
    seps = seps_resp.json()
    assert len(seps) == 1
    sep_id = seps[0]["id"]
    assert seps[0]["separation_type"] == "resignation"
    assert seps[0]["status"] == "initiated"
    assert seps[0]["service_duration_years"] >= 5.9  # approx 6 years

    # 3. Department Clearances
    clearances_resp = await client.get(f"/separation/separations/{sep_id}/clearances?business_id=1")
    assert clearances_resp.status_code == 200
    clearances = clearances_resp.json()
    assert len(clearances) == 5  # Line Manager, IT, Finance, Admin, HR

    # Sign off all clearances (Finance has an outstanding deduction of 2,500 BDT)
    for c in clearances:
        outstanding = 2500.0 if c["department_type"] == "finance_accounts" else 0.0
        sign_off_resp = await client.post(
            f"/separation/clearances/{c['id']}/sign-off?business_id=1",
            json={
                "status": "cleared",
                "outstanding_amount": outstanding,
                "checklist_remarks": "Verified and cleared.",
            },
        )
        assert sign_off_resp.status_code == 200

    # Verify separation status moved to settlement_pending
    sep_check = await client.get(f"/separation/separations/{sep_id}?business_id=1")
    assert sep_check.json()["status"] == "settlement_pending"

    # 4. Exit Interview
    interview_resp = await client.post(
        "/separation/exit-interviews?business_id=1",
        json={
            "separation_id": sep_id,
            "employee_id": emp_id,
            "interview_date": date.today().isoformat(),
            "primary_reason_for_leaving": "Higher compensation package elsewhere",
            "rating_culture": 4,
            "rating_management": 4,
            "rating_growth_opportunities": 3,
            "rating_compensation": 3,
            "rating_work_life_balance": 4,
            "would_recommend": "yes",
            "proudest_accomplishment": "Shipped the core ERP billing engine.",
            "improvement_suggestions": "Introduce more flexible remote days.",
        },
    )
    assert interview_resp.status_code == 201
    assert interview_resp.json()["primary_reason_for_leaving"] == "Higher compensation package elsewhere"

    # 5. Full & Final Settlement (FnF Calculation)
    compute_resp = await client.post(
        f"/separation/separations/{sep_id}/settlement/compute?business_id=1",
        json={
            "unpaid_salary_days": 15,  # 15 days of salary
            "bonus_arrears_amount": 10000.0,
            "asset_damage_deduction": 1200.0,
            "notes": "Full and final statutory calculations.",
        },
    )
    assert compute_resp.status_code == 200
    fnf = compute_resp.json()
    settlement_id = fnf["id"]

    # Basic is 50,000, daily basic = 50,000/30 = 1,666.67
    # Gross is 80,000, daily gross = 80,000/30 = 2,666.67
    # 15 days unpaid salary = 15 * 2,666.67 = 40,000.05
    # Gratuity for 6 years >= 5 years = 6 * 50,000 = 300,000
    # Provident Fund = 5,000 * 2 = 10,000
    # Notice shortfall = 10 days * 1,666.67 = 16,666.70
    # Finance clearance charge = 2,500
    # Asset damage = 1,200
    assert float(fnf["gratuity_amount"]) >= 290000.0
    assert float(fnf["total_payable_amount"]) > 300000.0
    assert float(fnf["clearance_charge_deduction"]) == 2500.0
    assert float(fnf["asset_damage_deduction"]) == 1200.0
    assert float(fnf["net_payable_amount"]) > 0
    assert fnf["payment_status"] == "draft"

    # 6. Disbursement
    disburse_resp = await client.post(
        f"/separation/settlements/{settlement_id}/disburse?business_id=1",
        json={
            "payment_method": "bank_transfer",
            "payment_reference": "EFTN-20261024-9988",
            "notes": "Direct bank credit advice sent.",
        },
    )
    assert disburse_resp.status_code == 200
    assert disburse_resp.json()["payment_status"] == "disbursed"

    # Verify Employee is now inactive
    sync_db.refresh(test_employee)
    assert test_employee.is_active is False

    # Verify Separation is completed
    sep_final = await client.get(f"/separation/separations/{sep_id}?business_id=1")
    assert sep_final.json()["status"] == "completed"

    # 7. Relieving & Release Letter Generation
    letter_resp = await client.post(
        "/separation/release-letters?business_id=1",
        json={
            "separation_id": sep_id,
            "employee_id": emp_id,
            "issue_date": date.today().isoformat(),
            "effective_exit_date": proposed_lwd.isoformat(),
            "designation": "Senior Engineer",
            "department": "Engineering",
            "letter_content": "This is to certify that Mr. Tariqul Islam has been relieved of his duties with no dues.",
        },
    )
    assert letter_resp.status_code == 201
    letter = letter_resp.json()
    assert letter["status"] == "issued"
    assert "Senior Engineer" in letter["designation"]
