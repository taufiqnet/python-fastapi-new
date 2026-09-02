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
async def test_employee_views_renders(client: AsyncClient):
    # 1. Manage Page
    res_list = await client.get("/employees/manage")
    assert res_list.status_code == 200
    assert "Employees" in res_list.text

    # 2. Create Page
    res_create = await client.get("/employees/create")
    assert res_create.status_code == 200
    assert "Create Employee" in res_create.text

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
