from io import BytesIO
import openpyxl
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
        "hrm:employees:view", "hrm:employees:create", "hrm:employees:update", "hrm:employees:delete",
        "hrm:compensation:view", "hrm:compensation:create", "hrm:compensation:update", "hrm:compensation:delete",
        "hrm:leave_types:view", "hrm:leave_types:create", "hrm:leave_types:update", "hrm:leave_types:delete",
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
async def test_leave_types_excel_import(client: AsyncClient):
    tpl_res = await client.get("/leave/types/template-excel?business_id=1")
    assert tpl_res.status_code == 200

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append([
        "Name", "Code", "Max Days Per Year", "Is Paid", "Requires Document",
        "Applicable Gender", "Carry Forward", "Description"
    ])
    ws.append([
        "Casual Leave", "CL", 14, "yes", "no", "all", "no", "Casual leave description"
    ])
    output = BytesIO()
    wb.save(output)
    output.seek(0)

    files = {
        "file": (
            "leave_types.xlsx",
            output.getvalue(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }
    import_res = await client.post("/leave/types/import-excel?business_id=1", files=files)
    assert import_res.status_code == 200
    res_json = import_res.json()
    assert res_json["imported_count"] == 1

    # Second import duplicate warning
    output.seek(0)
    import_res2 = await client.post("/leave/types/import-excel?business_id=1", files=files)
    assert import_res2.status_code == 200
    res_json2 = import_res2.json()
    assert res_json2["imported_count"] == 0
    assert len(res_json2["errors"]) == 1


@pytest.mark.asyncio
async def test_compensation_excel_import(client: AsyncClient):
    # Create employee first
    emp_res = await client.post(
        "/employees",
        json={
            "first_name": "Bob",
            "last_name": "Builder",
            "employee_id": "EMP-BOB",
            "work_email": "bob@example.com",
            "business_id": 1,
        },
    )
    assert emp_res.status_code == 201

    tpl_res = await client.get("/compensation/template-excel?business_id=1")
    assert tpl_res.status_code == 200

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append([
        "Employee ID", "Employee Name", "Basic Salary", "House Rent",
        "Medical Allowance", "Transport Allowance", "Food Allowance",
        "Other Allowance", "Tax", "Provident Fund", "Other Deduction",
        "Effective From"
    ])
    ws.append([
        "EMP-BOB", "Bob Builder", 4000.0, 1000.0, 300.0, 200.0, 100.0, 0.0, 300.0, 200.0, 0.0, "2025-01-01"
    ])
    output = BytesIO()
    wb.save(output)
    output.seek(0)

    files = {
        "file": (
            "compensation.xlsx",
            output.getvalue(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }
    import_res = await client.post("/compensation/import-excel?business_id=1", files=files)
    assert import_res.status_code == 200
    res_json = import_res.json()
    assert res_json["imported_count"] == 1

    # Second import duplicate warning
    output.seek(0)
    import_res2 = await client.post("/compensation/import-excel?business_id=1", files=files)
    assert import_res2.status_code == 200
    res_json2 = import_res2.json()
    assert res_json2["imported_count"] == 0
    assert len(res_json2["errors"]) == 1
