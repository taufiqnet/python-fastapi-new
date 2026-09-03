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
async def test_holiday_crud(client: AsyncClient):
    # Create holiday
    payload = {
        "business_id": 1,
        "name": "Independence Day",
        "holiday_type": "public",
        "start_date": "2025-03-26",
        "end_date": "2025-03-26",
        "is_paid": True,
        "description": "National Holiday",
    }
    response = await client.post("/payroll/holidays", json=payload)
    assert response.status_code == 201
    holiday_id = response.json()["id"]

    # List holidays
    response = await client.get("/payroll/holidays?business_id=1")
    assert response.status_code == 200
    assert len(response.json()) == 1

    # Get holiday
    response = await client.get(f"/payroll/holidays/{holiday_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Independence Day"

    # Update holiday
    response = await client.put(
        f"/payroll/holidays/{holiday_id}",
        json={"name": "Independence Day (Observed)"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Independence Day (Observed)"

    # Delete holiday
    response = await client.delete(f"/payroll/holidays/{holiday_id}")
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_payroll_period_crud(client: AsyncClient):
    # Create period
    payload = {
        "business_id": 1,
        "name": "January 2025",
        "start_date": "2025-01-01",
        "end_date": "2025-01-31",
        "status": "draft",
        "payment_date": "2025-01-31",
        "notes": "Jan run",
    }
    response = await client.post("/payroll/periods", json=payload)
    assert response.status_code == 201
    period_id = response.json()["id"]

    # List periods
    response = await client.get("/payroll/periods?business_id=1")
    assert response.status_code == 200
    assert len(response.json()) == 1

    # Update period status to processing
    response = await client.put(
        f"/payroll/periods/{period_id}", json={"status": "processing"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "processing"

    # Lock period
    response = await client.put(
        f"/payroll/periods/{period_id}", json={"status": "locked"}
    )
    assert response.status_code == 200
    assert response.json()["is_locked"] is True

    # Attempt to delete locked period -> 400
    response = await client.delete(f"/payroll/periods/{period_id}")
    assert response.status_code == 400

    # Unlock and delete
    await client.put(f"/payroll/periods/{period_id}", json={"status": "draft"})
    response = await client.delete(f"/payroll/periods/{period_id}")
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_payroll_record_crud(client: AsyncClient, sync_db):
    # Setup employee and period via client
    emp_res = await client.post(
        "/employees",
        json={
            "first_name": "Jane",
            "last_name": "Doe",
            "employee_id": "EMP-999",
            "work_email": "jane.doe@example.com",
            "phone": "+1234567890",
            "business_id": 1,
        },
    )
    assert emp_res.status_code == 201
    emp_id = emp_res.json()["id"]

    period_res = await client.post(
        "/payroll/periods",
        json={
            "business_id": 1,
            "name": "February 2025",
            "start_date": "2025-02-01",
            "end_date": "2025-02-28",
            "status": "draft",
        },
    )
    assert period_res.status_code == 201
    period_id = period_res.json()["id"]

    # Create payslip record
    payload = {
        "business_id": 1,
        "period_id": period_id,
        "employee_id": emp_id,
        "working_days": 20,
        "present_days": 20,
        "basic_salary": 5000.0,
        "house_rent": 1000.0,
        "transport_allowance": 300.0,
        "medical_allowance": 200.0,
        "food_allowance": 100.0,
        "other_allowance": 50.0,
        "overtime_pay": 150.0,
        "bonus": 200.0,
        "tax": 500.0,
        "provident_fund": 300.0,
        "unpaid_leave_deduction": 0.0,
        "loan_installment": 100.0,
        "other_deduction": 50.0,
        "payment_method": "bank_transfer",
        "is_paid": False,
    }
    response = await client.post("/payroll/records", json=payload)
    assert response.status_code == 201
    rec = response.json()
    record_id = rec["id"]

    # Verify gross, total deduction, and net salary calculations
    # gross = 5000 + 1000 + 300 + 200 + 100 + 50 + 150 + 200 = 7000.0
    # deductions = 500 + 300 + 0 + 100 + 50 = 950.0
    # net = 7000 - 950 = 6050.0
    assert rec["gross_salary"] == 7000.0
    assert rec["total_deduction"] == 950.0
    assert rec["net_salary"] == 6050.0

    # Get record
    response = await client.get(f"/payroll/records/{record_id}")
    assert response.status_code == 200

    # Update record
    response = await client.put(
        f"/payroll/records/{record_id}", json={"is_paid": True, "bonus": 500.0}
    )
    assert response.status_code == 200
    rec_updated = response.json()
    assert rec_updated["is_paid"] is True
    # gross updated = 7300.0, net = 6350.0
    assert rec_updated["gross_salary"] == 7300.0
    assert rec_updated["net_salary"] == 6350.0

    # Delete record
    response = await client.delete(f"/payroll/records/{record_id}")
    assert response.status_code == 204
