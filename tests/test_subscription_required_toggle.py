import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.deps import get_current_user_optional, get_current_user
from app.core.identity.models import Permission, User
from app.core.tenancy.models import BusinessProfile
from app.core.billing.models import SubscriptionPlan
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
async def test_permission_with_subscription_required_true(sync_db, client: AsyncClient):
    db = sync_db

    emp_perm = Permission(
        module="hrm", feature="employees", action="view", code="hrm:employees:view", name="Employees View"
    )
    comp_perm = Permission(
        module="hrm", feature="compensation", action="view", code="hrm:compensation:view", name="Comp View"
    )
    db.add_all([emp_perm, comp_perm])
    db.flush()

    restricted_plan = SubscriptionPlan(
        name="Basic Plan",
        description="Basic Plan",
        is_active=True,
        permissions=[emp_perm],  # LACKS comp_perm
    )
    db.add(restricted_plan)
    db.flush()

    biz = BusinessProfile(
        name_en="Test Biz",
        subscription_plan_id=restricted_plan.id,
        subscription_plan=restricted_plan,
        is_active=True,
    )
    db.add(biz)
    db.flush()

    user = User(
        username="subuser",
        email="subuser@example.com",
        password_hash="pw",
        business_id=biz.id,
        business_profile=biz,
        is_active=True,
        is_superuser=False,
        direct_permissions=[comp_perm],  # User HAS compensation view permission!
    )
    db.add(user)
    db.commit()

    async def _override_user(*args, **kwargs):
        return user

    app.dependency_overrides[get_current_user_optional] = _override_user
    app.dependency_overrides[get_current_user] = _override_user

    original_setting = settings.subscription_required
    try:
        settings.subscription_required = True
        # User has direct permission for hrm:compensation:view, BUT business subscription plan lacks it.
        # With subscription_required = True, this should be DENIED (HTTP 403) with upgrade required.
        response = await client.get("/compensation/manage")
        assert response.status_code == 403
    finally:
        settings.subscription_required = original_setting
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_permission_with_subscription_required_false(sync_db, client: AsyncClient):
    db = sync_db

    emp_perm = Permission(
        module="hrm", feature="employees", action="view", code="hrm:employees:view", name="Employees View"
    )
    comp_perm = Permission(
        module="hrm", feature="compensation", action="view", code="hrm:compensation:view", name="Comp View"
    )
    db.add_all([emp_perm, comp_perm])
    db.flush()

    restricted_plan = SubscriptionPlan(
        name="Basic Plan",
        description="Basic Plan",
        is_active=True,
        permissions=[emp_perm],  # LACKS comp_perm
    )
    db.add(restricted_plan)
    db.flush()

    biz = BusinessProfile(
        name_en="Test Biz",
        subscription_plan_id=restricted_plan.id,
        subscription_plan=restricted_plan,
        is_active=True,
    )
    db.add(biz)
    db.flush()

    user = User(
        username="subuser2",
        email="subuser2@example.com",
        password_hash="pw",
        business_id=biz.id,
        business_profile=biz,
        is_active=True,
        is_superuser=False,
        direct_permissions=[comp_perm],  # User HAS compensation view permission!
    )
    db.add(user)
    db.commit()

    async def _override_user(*args, **kwargs):
        return user

    app.dependency_overrides[get_current_user_optional] = _override_user
    app.dependency_overrides[get_current_user] = _override_user

    original_setting = settings.subscription_required
    try:
        settings.subscription_required = False
        # With subscription_required = False, subscription check is bypassed, so user is ALLOWED (HTTP 200).
        response = await client.get("/compensation/manage")
        assert response.status_code == 200

        # But if user lacks user permission (e.g. hrm:departments:view), user is still DENIED (HTTP 403).
        response_dept = await client.get("/departments/manage")
        assert response_dept.status_code == 403
    finally:
        settings.subscription_required = original_setting
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_business_without_subscription_plan_when_subscription_not_required(sync_db, client: AsyncClient):
    db = sync_db

    emp_perm = Permission(
        module="hrm", feature="employees", action="view", code="hrm:employees:view", name="Employees View"
    )
    db.add(emp_perm)
    db.flush()

    biz_no_plan = BusinessProfile(
        name_en="Biz No Sub Plan",
        subscription_plan_id=None,
        subscription_plan=None,
        is_active=True,
    )
    db.add(biz_no_plan)
    db.flush()

    user = User(
        username="no_plan_user",
        email="no_plan_user@example.com",
        password_hash="pw",
        business_id=biz_no_plan.id,
        business_profile=biz_no_plan,
        is_active=True,
        is_superuser=False,
        direct_permissions=[emp_perm],
    )
    db.add(user)
    db.commit()

    async def _override_user(*args, **kwargs):
        return user

    app.dependency_overrides[get_current_user_optional] = _override_user
    app.dependency_overrides[get_current_user] = _override_user

    original_setting = settings.subscription_required
    try:
        settings.subscription_required = False
        # With subscription_required = False, user with permission can access /employees/manage even with no subscription plan!
        response = await client.get("/employees/manage")
        assert response.status_code == 200
    finally:
        settings.subscription_required = original_setting
        app.dependency_overrides.clear()
