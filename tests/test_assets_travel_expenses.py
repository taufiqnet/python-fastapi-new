import datetime
import uuid
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user, get_current_user_optional
from app.core.identity.models import Role, User
from app.core.tenancy.models import BusinessProfile
from app.database import Base, get_db
from app.main import app
from app.modules.assets.models import (
    AllocationStatusEnum,
    AssetAssignment,
    AssetCategory,
    AssetConditionEnum,
    AssetStatusEnum,
    CompanyAsset,
)
from app.modules.hr_payroll.employees.models import Employee
from app.modules.travel_expenses.models import (
    AdvanceStatusEnum,
    ClaimStatusEnum,
    DAConveyancePolicy,
    ExpenseSettlementClaim,
    TravelAdvance,
    TravelRequest,
    TravelStatusEnum,
)

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

    # 1. Business
    biz = db.query(BusinessProfile).filter(BusinessProfile.id == 1).first()
    if not biz:
        biz = BusinessProfile(
            id=1,
            legal_name="Acme Corporation Ltd",
            name_en="Acme Corp",
            cr_number="1234567890",
            vat_number="300000000000003",
        )
        db.add(biz)
        db.commit()

    # 2. Users
    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        admin_user = User(
            id=1,
            username="admin",
            email="admin@acme.com",
            password_hash="hashed_pw",
            is_active=True,
            is_superuser=True,
            business_id=1,
        )
        db.add(admin_user)

    emp_user = db.query(User).filter(User.username == "john.doe").first()
    if not emp_user:
        emp_user = User(
            id=2,
            username="john.doe",
            email="john.doe@acme.com",
            password_hash="hashed_pw",
            is_active=True,
            is_superuser=False,
            business_id=1,
        )
        db.add(emp_user)
    db.commit()

    # 3. Employee linked to emp_user
    emp = db.query(Employee).filter(Employee.employee_id == "EMP-1001").first()
    if not emp:
        emp = Employee(
            id=uuid.uuid4(),
            business_id=1,
            user_id=2,
            employee_id="EMP-1001",
            first_name="John",
            last_name="Doe",
            work_email="john.doe@acme.com",
            date_of_birth=datetime.date(1992, 5, 10),
            start_date=datetime.date(2023, 2, 1),
        )
        db.add(emp)
        db.commit()

    try:
        yield db
    finally:
        db.close()


from fastapi import Request

@pytest_asyncio.fixture
async def client(sync_db):
    def _override_get_db():
        yield sync_db

    admin_user = sync_db.query(User).filter(User.username == "admin").first()

    async def _override_get_current_user(request: Request = None):
        return admin_user

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = _override_get_current_user
    app.dependency_overrides[get_current_user_optional] = _override_get_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_asset_management_full_lifecycle(sync_db, client: AsyncClient):
    """
    Tests Asset Categories, Asset Registration, Allocation to Employee,
    Employee Acknowledgment, Maintenance Log, and Return Intake.
    """
    emp = sync_db.query(Employee).first()
    assert emp is not None

    # 1. Create Category
    cat_resp = await client.post(
        "/assets/categories",
        json={
            "name": "Laptops & Notebooks",
            "code": "CAT-LAPTOP",
            "useful_life_months": 36,
        },
    )
    assert cat_resp.status_code == 201, cat_resp.text
    cat_data = cat_resp.json()
    cat_id = cat_data["id"]
    assert cat_data["name"] == "Laptops & Notebooks"

    # 2. Register Company Asset
    asset_resp = await client.post(
        "/assets/items",
        json={
            "asset_tag": "ASSET-LTP-001",
            "name": "ThinkPad P16s Gen 2",
            "category_id": cat_id,
            "serial_number": "SN-LENOVO-9988",
            "model": "21HK000BUS",
            "brand": "Lenovo",
            "purchase_date": "2024-01-15",
            "purchase_cost": 185000.00,
            "condition": "new",
        },
    )
    assert asset_resp.status_code == 201, asset_resp.text
    asset_data = asset_resp.json()
    asset_id = asset_data["id"]
    assert asset_data["current_status"] == "available"
    assert asset_data["asset_tag"] == "ASSET-LTP-001"

    # 3. Overview Stats Check
    stats_resp = await client.get("/assets/overview/stats?business_id=1")
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_assets"] >= 1
    assert stats["available_assets"] >= 1

    # 4. Allocate Asset to Employee
    alloc_resp = await client.post(
        "/assets/allocations",
        json={
            "asset_id": asset_id,
            "employee_id": str(emp.id),
            "assigned_date": "2026-03-01",
            "issue_condition": "new",
            "issue_notes": "Issued with 100W USB-C charger and laptop sleeve.",
        },
    )
    assert alloc_resp.status_code == 201, alloc_resp.text
    alloc_data = alloc_resp.json()
    alloc_id = alloc_data["id"]
    assert alloc_data["status"] == "pending_acknowledgement"

    # Verify Asset is now 'assigned'
    get_asset = await client.get(f"/assets/items/{asset_id}")
    assert get_asset.status_code == 200
    assert get_asset.json()["current_status"] == "assigned"

    # 5. Employee Portal: Acknowledge Custody
    ack_resp = await client.post(
        f"/assets/allocations/{alloc_id}/acknowledge",
        json={
            "status": "active",
            "notes": "Verified hardware serial number and received charger in working order.",
        },
    )
    assert ack_resp.status_code == 200, ack_resp.text
    assert ack_resp.json()["status"] == "active"
    assert ack_resp.json()["acknowledged_at"] is not None

    # 6. Maintenance Work Order
    maint_resp = await client.post(
        "/assets/maintenance",
        json={
            "asset_id": asset_id,
            "issue_type": "preventive",
            "problem_description": "Internal fan cleaning and thermal paste reapplication.",
            "status": "in_repair",
            "vendor_service_center": "Lenovo Bangladesh Premier Support",
        },
    )
    assert maint_resp.status_code == 201, maint_resp.text
    maint_id = maint_resp.json()["id"]

    # Complete Maintenance
    maint_update = await client.put(
        f"/assets/maintenance/{maint_id}",
        json={
            "status": "repaired",
            "cost": 3500.00,
            "resolution_notes": "Cleaned fans and renewed thermal compound.",
            "completion_date": "2026-03-10",
        },
    )
    assert maint_update.status_code == 200
    assert maint_update.json()["status"] == "repaired"

    # 7. Return Intake
    return_resp = await client.post(
        f"/assets/allocations/{alloc_id}/return",
        json={
            "actual_return_date": "2026-03-20",
            "return_condition": "good",
            "return_notes": "Returned upon department transfer. Charger intact.",
        },
    )
    assert return_resp.status_code == 200, return_resp.text
    assert return_resp.json()["status"] == "returned"

    # Verify Asset status returns to 'available'
    get_asset_after_return = await client.get(f"/assets/items/{asset_id}")
    assert get_asset_after_return.json()["current_status"] == "available"


@pytest.mark.asyncio
async def test_travel_and_expense_lifecycle(sync_db, client: AsyncClient):
    """
    Tests Travel Requisition, Manager Approval, Advance Disbursement,
    DA Policy, Expense Claim with Lines, Net Payable Calculation,
    Audit Review, and Settlement.
    """
    emp = sync_db.query(Employee).first()
    assert emp is not None

    # 1. Configure DA & Conveyance Policy
    policy_resp = await client.post(
        "/expenses/policies",
        json={
            "grade_name": "Executive",
            "city_tier": "tier_1_dhaka_ctg",
            "daily_allowance_rate": 1800.00,
            "hotel_limit_per_night": 6000.00,
            "conveyance_rate_per_km": 18.00,
            "is_active": True,
        },
    )
    assert policy_resp.status_code == 201, policy_resp.text
    assert float(policy_resp.json()["daily_allowance_rate"]) == 1800.00

    # 2. Submit Travel Request with Advance
    tr_resp = await client.post(
        "/travel/requests",
        json={
            "employee_id": str(emp.id),
            "purpose": "Chittagong Port Terminal ERP Deployment & Training",
            "travel_type": "domestic",
            "origin": "Dhaka Head Office",
            "destination": "Chittagong Agrabad Branch",
            "departure_date": "2026-04-05",
            "return_date": "2026-04-08",
            "estimated_cost": 25000.00,
            "advance_required": True,
            "advance_amount_requested": 15000.00,
            "notes": "Requires train tickets and 3-night hotel accommodation.",
        },
    )
    assert tr_resp.status_code == 201, tr_resp.text
    tr_data = tr_resp.json()
    tr_id = tr_data["id"]
    assert tr_data["status"] == "pending_approval"
    assert tr_data["request_number"].startswith("TRV-")

    # 3. Manager Approval & Advance Approval
    review_resp = await client.post(
        f"/travel/requests/{tr_id}/review",
        json={
            "status": "approved",
            "advance_amount_approved": 15000.00,
            "notes": "Approved for 4 days on-site deployment.",
        },
    )
    assert review_resp.status_code == 200, review_resp.text
    assert review_resp.json()["status"] == "approved"

    # 4. Check Advance Requisition
    advances_resp = await client.get("/travel/advances?business_id=1")
    assert advances_resp.status_code == 200
    advances = advances_resp.json()
    assert len(advances) >= 1
    adv = next(a for a in advances if a["travel_request_id"] == tr_id)
    adv_id = adv["id"]
    assert float(adv["amount_approved"]) == 15000.00
    assert adv["settlement_status"] == "unsettled"

    # 5. Disburse Travel Advance
    disburse_resp = await client.post(
        f"/travel/advances/{adv_id}/disburse",
        json={
            "disbursement_method": "bank_transfer",
            "payment_reference": "EFT-ACME-99120",
        },
    )
    assert disburse_resp.status_code == 200, disburse_resp.text
    assert disburse_resp.json()["disbursed_at"] is not None

    # 6. Post-Trip Expense Claim Submission
    # Employee spent BDT 18500 total (12000 hotel + 4000 transport + 2500 food).
    # Less BDT 15000 advance -> Net claim reimbursement = BDT 3500.
    claim_resp = await client.post(
        "/expenses/claims",
        json={
            "employee_id": str(emp.id),
            "travel_request_id": tr_id,
            "title": "Chittagong On-site Trip Expenses",
            "lines": [
                {
                    "expense_date": "2026-04-05",
                    "category": "hotel_lodging",
                    "description": "Hotel Agrabad (3 Nights)",
                    "amount": 12000.00,
                },
                {
                    "expense_date": "2026-04-05",
                    "category": "travel_fare",
                    "description": "Subarna Express Train AC Chair",
                    "amount": 4000.00,
                },
                {
                    "expense_date": "2026-04-06",
                    "category": "meals",
                    "description": "Client On-site Dinners",
                    "amount": 2500.00,
                },
            ],
        },
    )
    assert claim_resp.status_code == 201, claim_resp.text
    claim_data = claim_resp.json()
    claim_id = claim_data["id"]
    assert float(claim_data["total_claim_amount"]) == 18500.00
    assert float(claim_data["advance_deducted"]) == 15000.00
    assert float(claim_data["net_payable_or_refundable"]) == 3500.00
    assert claim_data["status"] == "submitted"

    # 7. Audit & Review Claim
    claim_review_resp = await client.post(
        f"/expenses/claims/{claim_id}/review",
        json={
            "status": "manager_approved",
            "approval_notes": "All vouchers verified and compliant with policy.",
        },
    )
    assert claim_review_resp.status_code == 200, claim_review_resp.text
    assert claim_review_resp.json()["status"] == "manager_approved"

    # 8. Settle Claim (Direct Payout)
    settle_resp = await client.post(
        f"/expenses/claims/{claim_id}/settle",
        json={
            "settlement_channel": "direct_payout",
            "payment_reference": "TXN-EFT-PAYOUT-3311",
        },
    )
    assert settle_resp.status_code == 200, settle_resp.text
    assert settle_resp.json()["status"] == "settled"
    assert settle_resp.json()["settlement_channel"] == "direct_payout"


@pytest.mark.asyncio
async def test_employee_exit_clearance_verification(sync_db, client: AsyncClient):
    """
    Verifies that the offboarding exit clearance endpoint accurately
    flags unreturned company equipment and unsettled travel advances.
    """
    # Use dedicated employee to avoid cross-test state leakage
    emp = Employee(
        id=uuid.uuid4(),
        business_id=1,
        employee_id=f"EMP-EXIT-{uuid.uuid4().hex[:6]}",
        first_name="Exit",
        last_name="Officer",
        work_email=f"exit.{uuid.uuid4().hex[:6]}@acme.com",
        date_of_birth=datetime.date(1993, 7, 15),
        start_date=datetime.date(2023, 1, 1),
    )
    sync_db.add(emp)
    sync_db.commit()

    # Step 1: Initial state (no active assets, no advances) -> Clear
    clearance_1 = await client.get(f"/employees/{emp.id}/clearance")
    assert clearance_1.status_code == 200
    res1 = clearance_1.json()
    assert res1["is_cleared"] is True
    assert res1["unreturned_assets_count"] == 0
    assert res1["unsettled_advances_count"] == 0

    # Step 2: Allocate an asset to employee
    cat = AssetCategory(
        business_id=1,
        name="Communication Devices",
        code="CAT-COMM",
    )
    sync_db.add(cat)
    sync_db.commit()

    asset = CompanyAsset(
        business_id=1,
        asset_tag="SIM-001",
        name="Official Grameenphone 4G SIM",
        category_id=cat.id,
        current_status=AssetStatusEnum.ASSIGNED.value,
    )
    sync_db.add(asset)
    sync_db.commit()

    alloc = AssetAssignment(
        business_id=1,
        asset_id=asset.id,
        employee_id=emp.id,
        assigned_date=datetime.date.today(),
        status=AllocationStatusEnum.ACTIVE.value,
        issue_condition=AssetConditionEnum.GOOD.value,
    )
    sync_db.add(alloc)
    sync_db.commit()

    # Step 3: Check clearance -> Should fail due to unreturned SIM
    clearance_2 = await client.get(f"/employees/{emp.id}/clearance")
    assert clearance_2.status_code == 200
    res2 = clearance_2.json()
    assert res2["is_cleared"] is False
    assert res2["unreturned_assets_count"] == 1
    assert res2["unreturned_assets"][0]["asset_tag"] == "SIM-001"

    # Step 4: Return the asset
    alloc.status = AllocationStatusEnum.RETURNED.value
    alloc.returned_date = datetime.date.today()
    alloc.return_condition = AssetConditionEnum.GOOD.value
    asset.current_status = AssetStatusEnum.AVAILABLE.value
    sync_db.commit()

    # Step 5: Check clearance -> Passes again
    clearance_3 = await client.get(f"/employees/{emp.id}/clearance")
    assert clearance_3.status_code == 200
    res3 = clearance_3.json()
    assert res3["is_cleared"] is True
    assert res3["unreturned_assets_count"] == 0
