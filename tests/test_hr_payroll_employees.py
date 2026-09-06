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
async def test_employee_crud_and_validation(client: AsyncClient):
    # 1. Create Department & Job Title
    dept_res = await client.post(
        "/departments",
        json={
            "name": "Engineering",
            "slug": "engineering",
            "description": "Eng Dept",
            "is_active": True,
            "multiple_heads_allowed": False,
            "business_id": 1,
        },
    )
    assert dept_res.status_code == 201
    dept_id = dept_res.json()["id"]

    jt_res = await client.post(
        "/job-titles",
        json={
            "name": "Software Engineer",
            "short_name": "SE",
            "description": "Dev",
            "is_active": True,
            "department_id": dept_id,
            "business_id": 1,
        },
    )
    assert jt_res.status_code == 201
    jt_id = jt_res.json()["id"]

    # 2. Create Employee 1 (Department Head)
    emp1_payload = {
        "first_name": "John",
        "last_name": "Doe",
        "employee_id": "EMP-001",
        "work_email": "john.doe@example.com",
        "phone": "+1234567890",
        "department_id": dept_id,
        "job_title_id": jt_id,
        "is_department_head": True,
        "is_active": True,
        "business_id": 1,
    }
    res = await client.post("/employees", json=emp1_payload)
    assert res.status_code == 201, res.text
    emp1_data = res.json()
    assert emp1_data["full_name"] == "John Doe"
    assert emp1_data["is_department_head"] is True
    emp1_id = emp1_data["id"]

    # 3. Duplicate Employee ID (should fail)
    dup_payload = emp1_payload.copy()
    dup_payload["work_email"] = "different@example.com"
    dup_payload["phone"] = "+1999999999"
    res_dup = await client.post("/employees", json=dup_payload)
    assert res_dup.status_code == 400

    # 4. Attempt second Department Head in single-head department (should fail)
    emp2_payload = {
        "first_name": "Jane",
        "last_name": "Smith",
        "employee_id": "EMP-002",
        "work_email": "jane.smith@example.com",
        "phone": "+1987654321",
        "department_id": dept_id,
        "job_title_id": jt_id,
        "direct_manager_id": emp1_id,
        "is_department_head": True,
        "is_active": True,
        "business_id": 1,
    }
    res_head_fail = await client.post("/employees", json=emp2_payload)
    assert res_head_fail.status_code == 400

    # 5. Create Employee 2 as regular employee under Employee 1
    emp2_payload["is_department_head"] = False
    res2 = await client.post("/employees", json=emp2_payload)
    assert res2.status_code == 201
    emp2_id = res2.json()["id"]

    # 6. Get List & Detail
    res_get = await client.get(f"/employees/{emp1_id}")
    assert res_get.status_code == 200
    assert res_get.json()["id"] == emp1_id

    res_list = await client.get(f"/employees?business_id=1&department_id={dept_id}")
    assert res_list.status_code == 200
    assert len(res_list.json()) == 2

    # 7. Update Employee 2
    res_upd = await client.put(
        f"/employees/{emp2_id}", json={"middle_name": "Ann"}
    )
    assert res_upd.status_code == 200
    assert res_upd.json()["full_name"] == "Jane Ann Smith"

    # 8. Delete Employees
    res_del2 = await client.delete(f"/employees/{emp2_id}")
    assert res_del2.status_code == 204

    res_del1 = await client.delete(f"/employees/{emp1_id}")
    assert res_del1.status_code == 204

    res_verify = await client.get(f"/employees/{emp1_id}")
    assert res_verify.status_code == 404


@pytest.mark.asyncio
async def test_employee_excel_template_and_import(client: AsyncClient):
    # Template download
    tpl_res = await client.get("/employees/template-excel?business_id=1")
    assert tpl_res.status_code == 200
    assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in tpl_res.headers["content-type"]

    # Import test file
    import openpyxl
    from io import BytesIO

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append([
        "Employee ID", "First Name", "Middle Name", "Last Name", "Work Email",
        "Phone", "Department", "Job Title", "Employment Type", "Work Arrangement",
        "Start Date", "Gender"
    ])
    ws.append([
        "IMP100", "Alice", "", "Wonderland", "alice@example.com",
        "+111222333", "", "", "full_time", "remote",
        "2025-01-15", "female"
    ])
    output = BytesIO()
    wb.save(output)
    output.seek(0)

    files = {
        "file": (
            "employees.xlsx",
            output.getvalue(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }
    import_res = await client.post("/employees/import-excel?business_id=1", files=files)
    assert import_res.status_code == 200
    res_json = import_res.json()
    assert res_json["imported_count"] == 1

    # Importing same file again should trigger duplicate warning
    output.seek(0)
    files2 = {
        "file": (
            "employees.xlsx",
            output.getvalue(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }
    import_res2 = await client.post("/employees/import-excel?business_id=1", files=files2)
    assert import_res2.status_code == 200
    res_json2 = import_res2.json()
    assert res_json2["imported_count"] == 0
    assert len(res_json2["errors"]) == 1
    assert "already exists" in res_json2["errors"][0]
