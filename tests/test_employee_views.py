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


from app.core.deps import get_current_user_optional
from app.core.identity.models import User

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
    def _override_get_current_user(request=None):
        return dummy_user

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user_optional] = _override_get_current_user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_employee_views_renders(client: AsyncClient):
    # 1. Manage Page
    res_list = await client.get("/employees/manage")
    assert res_list.status_code == 200
    assert "Employees" in res_list.text

    # 2. Create Page
    res_create = await client.get("/employees/create")
    assert res_create.status_code == 200
    assert "Create Employee" in res_create.text
    assert 'data-department-id' in res_create.text
    assert 'filterJobTitles()' in res_create.text

    # 3. Create Employee via API
    emp_payload = {
        "first_name": "Alice",
        "last_name": "Smith",
        "employee_id": "EMP-999",
        "work_email": "alice@company.com",
        "business_id": 1,
    }
    res_api = await client.post("/employees", json=emp_payload)
    assert res_api.status_code == 201
    emp_id = res_api.json()["id"]

    # 4. Detail Page
    res_detail = await client.get(f"/employees/detail/{emp_id}")
    assert res_detail.status_code == 200
    assert "Alice Smith" in res_detail.text

    # 5. Edit Page
    res_edit = await client.get(f"/employees/edit/{emp_id}")
    assert res_edit.status_code == 200
    assert "Edit Employee" in res_edit.text


@pytest.mark.asyncio
async def test_employee_views_manage_over_500_employees(client: AsyncClient, sync_db):
    # Create 505 employee records to ensure all 500+ employees are listed
    from app.modules.hr_payroll.employees.models import Employee
    employees = [
        Employee(
            first_name=f"First{i}",
            last_name=f"Last{i}",
            employee_id=f"EMP-BULK-{i}",
            work_email=f"emp_bulk_{i}@example.com",
            business_id=1,
            is_active=True,
        )
        for i in range(505)
    ]
    sync_db.bulk_save_objects(employees)
    sync_db.commit()

    res = await client.get("/employees/manage")
    assert res.status_code == 200
    assert "EMP-BULK-0" in res.text
    assert "EMP-BULK-504" in res.text
