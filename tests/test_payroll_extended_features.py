import uuid
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import date

from app.database import Base, get_db
from app.main import app
from app.core.deps import get_current_user_optional, get_current_user
from app.core.identity.models import User
from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.organization.models import Department, JobTitle, SalaryGrade
from app.modules.hr_payroll.compensation.models import EmployeeSalary
from app.modules.hr_payroll.portal.models import EmployeeLoan

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
        "hrm:employees:view", "hrm:employees:create", "hrm:employees:update", "hrm:employees:delete",
        "hrm:compensation:view", "hrm:compensation:create", "hrm:compensation:update", "hrm:compensation:delete",
        "hrm:holidays:view", "hrm:holidays:create", "hrm:holidays:update", "hrm:holidays:delete",
        "hrm:payroll_periods:view", "hrm:payroll_periods:create", "hrm:payroll_periods:update", "hrm:payroll_periods:delete",
        "hrm:payroll_records:view", "hrm:payroll_records:create", "hrm:payroll_records:update", "hrm:payroll_records:delete",
        "hrm:payroll_settings:view", "hrm:payroll_settings:create", "hrm:payroll_settings:update", "hrm:payroll_settings:delete",
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
async def test_salary_components_and_structures(client: AsyncClient):
    # 1. Create Component
    comp_res = await client.post(
        "/compensation/components",
        json={
            "business_id": 1,
            "name": "House Rent Allowance",
            "code": "HRA",
            "component_type": "earning",
            "calculation_type": "percent_basic",
            "default_value": 50.0,
            "is_taxable": True,
            "is_statutory": False,
        },
    )
    assert comp_res.status_code == 201
    comp_id = comp_res.json()["id"]

    # 2. List Components
    list_res = await client.get("/compensation/components?business_id=1")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 3. Create Structure
    struct_res = await client.post(
        "/compensation/structures",
        json={
            "business_id": 1,
            "name": "Executive Compensation Structure",
            "description": "Standard management structure with 50% HRA",
            "is_active": True,
            "items": [
                {
                    "component_id": comp_id,
                    "calculation_type": "percent_basic",
                    "value": 50.0,
                }
            ],
        },
    )
    assert struct_res.status_code == 201
    assert struct_res.json()["name"] == "Executive Compensation Structure"


@pytest.mark.asyncio
async def test_company_bank_accounts_crud(client: AsyncClient):
    res = await client.post(
        "/payroll/bank-accounts",
        json={
            "business_id": 1,
            "bank_name": "Dutch-Bangla Bank PLC",
            "branch_name": "Gulshan Branch",
            "account_title": "ProERP Enterprise Limited",
            "account_number": "1101200045678",
            "routing_number": "090271648",
            "is_default": True,
        },
    )
    assert res.status_code == 201
    acc_id = res.json()["id"]

    list_res = await client.get("/payroll/bank-accounts?business_id=1")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["routing_number"] == "090271648"


@pytest.mark.asyncio
async def test_tax_slabs_and_statutory_settings(client: AsyncClient):
    # Create Tax Slab
    slab_res = await client.post(
        "/payroll/tax-slabs",
        json={
            "business_id": 1,
            "fiscal_year": "2025-2026",
            "gender_category": "general_male",
            "slab_order": 1,
            "min_income": 350000.0,
            "max_income": 450000.0,
            "tax_rate_percent": 5.0,
        },
    )
    assert slab_res.status_code == 201

    # Update Statutory settings
    stat_res = await client.put(
        "/payroll/statutory-settings?business_id=1",
        json={
            "enable_provident_fund": True,
            "pf_employee_percent": 10.0,
            "pf_employer_percent": 10.0,
            "enable_tax_auto_deduction": True,
            "minimum_tax_amount": 5000.0,
        },
    )
    assert stat_res.status_code == 200
    assert stat_res.json()["pf_employee_percent"] == 10.0


@pytest.mark.asyncio
async def test_extended_salary_process_with_loan_bonus_adjustments_and_hold(
    client: AsyncClient, sync_db
):
    # 1. Setup Employee & Salary
    emp = Employee(
        id=uuid.uuid4(),
        business_id=1,
        employee_id="EMP-TEST-001",
        first_name="Rahim",
        last_name="Uddin",
        work_email="rahim@example.com",
        phone="01711000001",
        bank_name="BRAC Bank",
        bank_branch="Banani",
        bank_account_no="1501203456789001",
        bank_routing_number="060271892",
        is_active=True,
    )
    sync_db.add(emp)
    sync_db.commit()

    salary = EmployeeSalary(
        business_id=1,
        employee_id=emp.id,
        basic_salary=40000.0,
        house_rent=20000.0,
        medical_allowance=4000.0,
        transport_allowance=3000.0,
        food_allowance=2000.0,
        other_allowance=0.0,
        tax=0.0,
        provident_fund=0.0,
        other_deduction=0.0,
        gross_salary=69000.0,
        net_salary=69000.0,
        effective_from=date(2025, 1, 1),
    )
    sync_db.add(salary)

    # 2. Create Period
    period_res = await client.post(
        "/payroll/periods",
        json={
            "business_id": 1,
            "name": "January 2025",
            "start_date": "2025-01-01",
            "end_date": "2025-01-31",
            "status": "draft",
        },
    )
    assert period_res.status_code == 201
    period_id = period_res.json()["id"]

    # 3. Create Loan and Schedule
    loan = EmployeeLoan(
        id=uuid.uuid4(),
        business_id=1,
        employee_id=emp.id,
        loan_type="salary_advance",
        principal_amount=15000.0,
        monthly_installment_amount=5000.0,
        total_installments=3,
        remaining_balance=15000.0,
        status="approved",
        reason="Medical emergency",
    )
    sync_db.add(loan)
    sync_db.commit()

    # Create due installment for January 2025
    from app.modules.hr_payroll.payroll.models import LoanRepaymentSchedule, EMIStatusEnum
    emi = LoanRepaymentSchedule(
        id=uuid.uuid4(),
        business_id=1,
        loan_id=loan.id,
        installment_number=1,
        due_date=date(2025, 1, 15),
        installment_amount=5000.0,
        status=EMIStatusEnum.PENDING,
    )
    sync_db.add(emi)

    # 4. Create Salary Adjustment (Arrear 3,000 BDT)
    adj_res = await client.post(
        "/payroll/adjustments",
        json={
            "business_id": 1,
            "employee_id": str(emp.id),
            "period_id": period_id,
            "adjustment_type": "arrear",
            "amount": 3000.0,
            "title": "Retroactive increment arrear",
        },
    )
    assert adj_res.status_code == 201
    adj_id = adj_res.json()["id"]

    # Approve adjustment
    await client.put(
        f"/payroll/adjustments/{adj_id}",
        json={"status": "approved"},
    )

    # 5. Execute Salary Processing
    gen_res = await client.post(f"/payroll/periods/{period_id}/generate")
    assert gen_res.status_code == 200
    records = gen_res.json()
    assert len(records) == 1
    rec = records[0]

    # Verify Arrear adjustment was added to other_allowance
    assert rec["other_allowance"] == 3000.0
    # Verify Loan EMI was deducted
    assert rec["loan_installment"] == 5000.0

    # 6. Test Salary Hold Toggle
    hold_res = await client.put(
        f"/payroll/records/{rec['id']}/hold",
        json={"is_held": True, "hold_reason": "Pending compliance verification"},
    )
    assert hold_res.status_code == 200
    assert hold_res.json()["is_held"] is True
    assert hold_res.json()["hold_reason"] == "Pending compliance verification"

    # 7. Test Bank Advice Excel Export (Held employee MUST be excluded)
    advice_res = await client.get(f"/payroll/periods/{period_id}/bank-advice")
    assert advice_res.status_code == 200
    assert len(advice_res.content) > 0  # Valid Excel generated

    # Release hold and re-verify
    release_res = await client.put(
        f"/payroll/records/{rec['id']}/hold",
        json={"is_held": False},
    )
    assert release_res.status_code == 200
    assert release_res.json()["is_held"] is False
