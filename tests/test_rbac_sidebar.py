import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.billing.models import SubscriptionPlan
from app.core.deps import get_current_user_optional
from app.core.identity.models import Permission, Role, User
from app.core.tenancy.models import BusinessProfile
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
async def test_hr_admin_sidebar_menu_visibility(sync_db, client: AsyncClient):
    db = sync_db

    # Create HR Admin permissions
    hr_perm_1 = Permission(
        module="hrm",
        feature="employees",
        action="view",
        code="hrm:employees:view",
        name="Employees View",
    )
    hr_perm_2 = Permission(
        module="hrm",
        feature="departments",
        action="view",
        code="hrm:departments:view",
        name="Departments View",
    )
    hr_perm_3 = Permission(
        module="hrm",
        feature="compensation",
        action="view",
        code="hrm:compensation:view",
        name="Compensation View",
    )
    db.add_all([hr_perm_1, hr_perm_2, hr_perm_3])
    db.flush()

    # Create Free Plan with only basic permissions
    free_plan = SubscriptionPlan(
        name="Free",
        description="Free Plan",
        is_active=True,
        permissions=[hr_perm_1, hr_perm_2],
    )
    db.add(free_plan)
    db.flush()

    biz = BusinessProfile(
        name_en="Test Business",
        short_name="testbiz",
        is_active=True,
        subscription_plan_id=free_plan.id,
        subscription_plan=free_plan,
    )
    db.add(biz)
    db.flush()

    hr_role = Role(
        name="HR Admin",
        description="HR Admin Role",
        permissions=[hr_perm_1, hr_perm_2, hr_perm_3],
    )
    db.add(hr_role)
    db.flush()

    hr_user = User(
        username="hradmin",
        email="hradmin@example.com",
        password_hash="hashed_pw",
        is_active=True,
        is_superuser=False,
        business_id=biz.id,
        business_profile=biz,
        roles=[hr_role],
    )
    db.add(hr_user)
    db.commit()
    db.refresh(hr_user)

    # Force eager evaluation of permission codes into memory
    hr_user.get_all_permission_codes()

    async def _override_get_current_user(*args, **kwargs):
        return hr_user

    app.dependency_overrides[get_current_user_optional] = _override_get_current_user

    res = await client.get("/employees/manage")
    assert res.status_code == 200

    html = res.text

    # HR & Payroll module section header should be visible
    assert "HR & Payroll" in html

    # Unlocked menu items (Employees, Department)
    assert 'href="/employees/manage"' in html
    assert 'href="/departments/manage"' in html

    # Compensation is in user RBAC role but locked by Subscription Plan
    assert "Compensation" in html
    assert 'data-upsell="true"' in html
    assert "data-title=\"Compensation\"" in html
    assert "Structure pay grades, bonuses, and compensation packages" in html
    assert 'id="upsell-modal"' in html
    assert "Upgrade Plan" in html

    # Non-permitted module sections and links should be hidden
    assert 'data-module="tenancy"' not in html
    assert 'data-module="ecommerce"' not in html
    assert 'data-module="general_admin"' not in html
    assert "/users/manage" not in html
    assert "/categories/manage" not in html
    assert "/inventory/manage" not in html
