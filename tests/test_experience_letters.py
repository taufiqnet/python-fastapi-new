import datetime
import uuid
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
        id=uuid.uuid4(),
        business_id=1,
        employee_id="EMP-001",
        first_name="Jane",
        last_name="Doe",
        work_email="jane.doe@example.com",
        date_of_birth=datetime.date(1990, 1, 1),
        start_date=datetime.date(2022, 1, 15),
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
async def test_experience_letters_crud_and_views(sync_db, client: AsyncClient):
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

    # 1. Manage Page
    resp = await client.get("/experience-letters/manage")
    assert resp.status_code == 200
    assert "Experience Letters" in resp.text

    # 2. Create Page
    resp_create_page = await client.get("/experience-letters/create")
    assert resp_create_page.status_code == 200
    assert "Generate Experience Letter" in resp_create_page.text

    # 3. Create Experience Letter via API
    create_resp = await client.post(
        "/experience-letters",
        json={
            "business_id": 1,
            "employee_id": str(emp.id),
            "issue_date": "2026-03-31",
            "relieving_date": "2026-03-31",
            "conduct_and_character": "Excellent",
        },
    )
    assert create_resp.status_code == 201
    letter_data = create_resp.json()
    letter_id = letter_data["id"]
    assert letter_data["letter_no"].startswith("EL-")
    assert letter_data["joining_date"] == "2022-01-15"

    # 4. Get by ID API
    get_resp = await client.get(f"/experience-letters/{letter_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["designation"] == "Employee"

    # 5. Detail / Printable Page
    detail_resp = await client.get(f"/experience-letters/detail/{letter_id}")
    assert detail_resp.status_code == 200
    assert "EXPERIENCE CERTIFICATE" in detail_resp.text
    assert "Jane Doe" in detail_resp.text

    # 6. Edit Page
    edit_page_resp = await client.get(f"/experience-letters/edit/{letter_id}")
    assert edit_page_resp.status_code == 200
    assert "Edit Experience Letter" in edit_page_resp.text

    # 7. Update API
    update_resp = await client.put(
        f"/experience-letters/{letter_id}",
        json={"status": "issued", "designation": "Lead Developer"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "issued"
    assert update_resp.json()["designation"] == "Lead Developer"

    # 8. Delete API
    del_resp = await client.delete(f"/experience-letters/{letter_id}")
    assert del_resp.status_code == 204

    # Confirm deletion
    get_after_del = await client.get(f"/experience-letters/{letter_id}")
    assert get_after_del.status_code == 404
