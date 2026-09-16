import datetime
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user_optional
from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile
from app.database import Base, get_db
from app.main import app
from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.payroll.models import PayrollPeriod, PayrollPeriodStatusEnum, PayrollRecord

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
    biz = BusinessProfile(
        id=1,
        legal_name="Test Company",
        name_en="Test Company",
        cr_number="1234567890",
        vat_number="300000000000003",
    )
    db.add(biz)
    db.commit()

    emp = Employee(
        business_id=1,
        first_name="Md. Taufiqur",
        last_name="Rahman",
        employee_id="00034",
        work_email="taufiq@acme.com",
        tin="743177139768",
    )
    db.add(emp)
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

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_salary_certificate_aggregation_and_views(sync_db, client: AsyncClient):
    admin_user = User(
        username="admin",
        email="admin@example.com",
        password_hash="hashed_pw",
        is_active=True,
        is_superuser=True,
    )
    sync_db.add(admin_user)
    sync_db.commit()

    async def _override_get_current_user(*args, **kwargs):
        return admin_user

    app.dependency_overrides[get_current_user_optional] = _override_get_current_user

    emp = sync_db.query(Employee).first()

    # 1. Attempt certificate creation with NO payroll records -> HTTP 400
    resp_empty = await client.post(
        "/salary-certificates",
        json={
            "business_id": 1,
            "employee_id": str(emp.id),
            "issue_date": "2023-09-25",
            "fiscal_year": "2022-2023",
            "assessment_year": "2021-2022",
            "tin": "743177139768",
        },
    )
    assert resp_empty.status_code == 400
    assert "No payroll records found for employee" in resp_empty.json()["detail"]

    # 2. Add payroll records for partial fiscal year (March 2023 and June 2023)
    period1 = PayrollPeriod(
        business_id=1,
        name="March 2023",
        start_date=datetime.date(2023, 3, 1),
        end_date=datetime.date(2023, 3, 31),
        status=PayrollPeriodStatusEnum.PAID,
    )
    period2 = PayrollPeriod(
        business_id=1,
        name="June 2023",
        start_date=datetime.date(2023, 6, 1),
        end_date=datetime.date(2023, 6, 30),
        status=PayrollPeriodStatusEnum.PAID,
    )
    sync_db.add_all([period1, period2])
    sync_db.commit()

    rec1 = PayrollRecord(
        business_id=1,
        period_id=period1.id,
        employee_id=emp.id,
        basic_salary=96000,
        house_rent=43200,
        medical_allowance=9600,
        transport_allowance=9600,
        food_allowance=1600,
        other_allowance=0,
        bonus=48000,
        gross_salary=208000,
        tax=0,
        net_salary=208000,
    )
    rec2 = PayrollRecord(
        business_id=1,
        period_id=period2.id,
        employee_id=emp.id,
        basic_salary=96000,
        house_rent=43200,
        medical_allowance=9600,
        transport_allowance=9600,
        food_allowance=1600,
        other_allowance=0,
        bonus=48000,
        gross_salary=208000,
        tax=0,
        net_salary=208000,
    )
    sync_db.add_all([rec1, rec2])
    sync_db.commit()

    # 3. Create Salary Certificate via API
    create_resp = await client.post(
        "/salary-certificates",
        json={
            "business_id": 1,
            "employee_id": str(emp.id),
            "issue_date": "2023-09-25",
            "fiscal_year": "2022-2023",
            "assessment_year": "2021-2022",
            "tin": "743177139768",
        },
    )
    assert create_resp.status_code == 201
    cert_data = create_resp.json()
    cert_id = cert_data["id"]

    assert cert_data["basic_salary"] == 192000.0
    assert cert_data["gross_salary"] == 416000.0
    assert cert_data["net_salary"] == 416000.0

    # 4. View Certificate printable detail page
    detail_resp = await client.get(f"/salary-certificates/detail/{cert_id}")
    assert detail_resp.status_code == 200
    assert "Salary Certificate" in detail_resp.text
    assert "Md. Taufiqur Rahman" in detail_resp.text
    assert "416,000" in detail_resp.text
    assert "01 March 2023 to 30 June, 2023" in detail_resp.text
