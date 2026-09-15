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
from app.core.tenancy.models import BusinessProfile

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
    def _override_get_current_user(request=None):
        return dummy_user

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user_optional] = _override_get_current_user
    app.dependency_overrides[get_current_user] = _override_get_current_user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_leave_type_tenant_isolation(client: AsyncClient, sync_db):
    # 1. Create Business 2
    biz_b = BusinessProfile(
        id=2,
        legal_name="Business B Ltd",
        name_en="Business B",
        cr_number="6666666666",
        vat_number="300000000000006",
    )
    sync_db.add(biz_b)
    sync_db.commit()

    # Create Leave Type in Business A (id=1)
    res_a = await client.post(
        "/leave-types",
        json={
            "name": "Annual Leave A",
            "code": "AL-A",
            "business_id": 1,
            "max_days_per_year": 20,
            "applicable_gender": "all",
            "is_paid": True,
        },
    )
    assert res_a.status_code == 201
    lt_a_id = res_a.json()["id"]

    # Create Leave Type in Business B (id=2)
    res_b = await client.post(
        "/leave-types",
        json={
            "name": "Sick Leave B",
            "code": "SL-B",
            "business_id": 2,
            "max_days_per_year": 10,
            "applicable_gender": "all",
            "is_paid": True,
        },
    )
    assert res_b.status_code == 201
    lt_b_id = res_b.json()["id"]

    # 2. Switch to regular user assigned to Business A
    user_a = User(
        id=30,
        username="user_lt_a",
        email="user.lt@biz-a.com",
        is_active=True,
        is_superuser=False,
        business_id=1,
    )
    user_a.get_all_permission_codes = lambda: {
        "hrm:leave_types:view",
        "hrm:leave_types:create",
        "hrm:leave_types:update",
        "hrm:leave_types:delete",
    }
    user_a.has_permission = lambda code: code in {
        "hrm:leave_types:view",
        "hrm:leave_types:create",
        "hrm:leave_types:update",
        "hrm:leave_types:delete",
    }
    user_a.business_profile = None

    app.dependency_overrides[get_current_user_optional] = lambda request=None: user_a
    app.dependency_overrides[get_current_user] = lambda request=None: user_a
    app.dependency_overrides[get_db] = lambda: sync_db

    # A) List request trying to query business_id=2 should ignore query param and return Business A leave types
    list_res = await client.get("/leave-types?business_id=2")
    assert list_res.status_code == 200
    types = list_res.json()
    type_ids = [t["id"] for t in types]
    assert lt_a_id in type_ids
    assert lt_b_id not in type_ids

    # B) GET leave type in Business B by ID returns 404 (not 403)
    get_res = await client.get(f"/leave-types/{lt_b_id}")
    assert get_res.status_code == 404

    # C) PUT leave type in Business B by ID returns 404
    put_res = await client.put(f"/leave-types/{lt_b_id}", json={"name": "Hacked Name"})
    assert put_res.status_code == 404

    # D) DELETE leave type in Business B by ID returns 404
    del_res = await client.delete(f"/leave-types/{lt_b_id}")
    assert del_res.status_code == 404

    # E) Create leave type with business_id=2 in payload overrides business_id to 1 (assigned business)
    create_res = await client.post(
        "/leave-types",
        json={
            "name": "Casual Leave A2",
            "code": "CL-A2",
            "business_id": 2,
            "max_days_per_year": 5,
            "applicable_gender": "all",
            "is_paid": True,
        },
    )
    assert create_res.status_code == 201
    assert create_res.json()["business_id"] == 1

    # 3. Superuser access checks
    superuser = User(id=1, username="admin", email="admin@example.com", is_active=True, is_superuser=True, business_id=1)
    app.dependency_overrides[get_current_user_optional] = lambda request=None: superuser
    app.dependency_overrides[get_current_user] = lambda request=None: superuser

    # Superuser can explicitly request Business B list
    su_list_res = await client.get("/leave-types?business_id=2")
    assert su_list_res.status_code == 200
    su_types = su_list_res.json()
    su_type_ids = [t["id"] for t in su_types]
    assert lt_b_id in su_type_ids
    assert lt_a_id not in su_type_ids

    # Superuser can access Business B leave type by ID
    su_get_res = await client.get(f"/leave-types/{lt_b_id}")
    assert su_get_res.status_code == 200
    assert su_get_res.json()["id"] == lt_b_id
