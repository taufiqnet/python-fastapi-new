import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.main import app
from app.core.identity.models import User, Role, Permission
from app.core.billing.models import SubscriptionPlan
from app.core.tenancy.models import BusinessProfile
from app.database import AsyncSessionLocal, SessionLocal
from app.core.identity.seed import seed_system_admin_and_permissions_sync


@pytest.fixture(scope="module", autouse=True)
def setup_seed_data():
    db = SessionLocal()
    seed_system_admin_and_permissions_sync(db)
    db.commit()
    db.close()


@pytest.mark.asyncio
async def test_module_tiered_registration():
    import uuid
    suffix = uuid.uuid4().hex[:6]
    test_username = f"tier_test_hr_{suffix}"
    test_email = f"tier_test_{suffix}@example.com"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        reg_payload = {
            "username": test_username,
            "email": test_email,
            "password": "Password123#",
            "company_name": f"Tiered HR Corp {suffix}",
            "modules": ["hrm"],
        }
        res = await ac.post("/auth/register", json=reg_payload)
        assert res.status_code == 201, res.text
        data = res.json()
        assert data["email"] == test_email

    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(User)
            .options(selectinload(User.roles).selectinload(Role.permissions), selectinload(User.direct_permissions))
            .where(User.email == test_email)
        )
        user = res.scalar_one_or_none()
        assert user is not None
        assert len(user.direct_permissions) == 0, "User must start with 0 direct permissions"
        
        role_names = [r.name for r in user.roles]
        assert "hr_basic" in role_names, f"Expected hr_basic role, got {role_names}"

        # Verify Business Profile Subscription Plan
        assert user.business_id is not None
        b_res = await db.execute(
            select(BusinessProfile).where(BusinessProfile.id == user.business_id)
        )
        biz = b_res.scalar_one_or_none()
        assert biz is not None

        p_res = await db.execute(
            select(SubscriptionPlan).where(SubscriptionPlan.id == biz.subscription_plan_id)
        )
        plan = p_res.scalar_one_or_none()
        assert plan is not None
        assert "Basic" in plan.name or "basic" in plan.name

        # Verify permission boundary for hr_basic
        assert user.has_permission("hrm:attendance:view") is True
        assert user.has_permission("hrm:employees:view") is True
        assert user.has_permission("hrm:departments:view") is True
        assert user.has_permission("hrm:compensation:view") is False
        assert user.has_permission("hrm:payroll_settings:view") is False
        assert user.has_permission("hrm:recruitment:view") is False

        # Simulate upgrade to hr_pro
        pro_role_res = await db.execute(
            select(Role).options(selectinload(Role.permissions)).where(Role.name == "hr_pro")
        )
        hr_pro_role = pro_role_res.scalar_one_or_none()
        assert hr_pro_role is not None
        user.roles = [hr_pro_role]
        await db.commit()
        await db.refresh(user)

        assert user.has_permission("hrm:attendance:view") is True
        assert user.has_permission("hrm:compensation:view") is True
        assert user.has_permission("hrm:payroll_settings:view") is True
        assert user.has_permission("hrm:recruitment:view") is False

        # Simulate upgrade to hr_enterprise
        ent_role_res = await db.execute(
            select(Role).options(selectinload(Role.permissions)).where(Role.name == "hr_enterprise")
        )
        hr_ent_role = ent_role_res.scalar_one_or_none()
        assert hr_ent_role is not None
        user.roles = [hr_ent_role]
        await db.commit()
        await db.refresh(user)

        assert user.has_permission("hrm:attendance:view") is True
        assert user.has_permission("hrm:compensation:view") is True
        assert user.has_permission("hrm:recruitment:view") is True
