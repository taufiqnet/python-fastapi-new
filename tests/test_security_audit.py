import uuid
from datetime import datetime, timedelta, timezone
import jwt
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.config import settings
from app.core.deps import get_current_user, get_current_user_optional, require_permission
from app.core.identity.models import Permission, Role, User
from app.core.billing.models import SubscriptionPlan
from app.core.security import create_access_token, decode_access_token
from app.core.tenancy.models import BusinessProfile
from app.core.tenancy.scoping import resolve_business_id, verify_record_ownership
from app.database import get_db
from app.main import app
from fastapi import HTTPException, status


def test_jwt_token_creation_and_tampering():
    """
    Audit JWT creation, verification, expiration, and signature tampering.
    """
    user_id = 42
    data = {"sub": str(user_id), "email": "audit@proerp.com"}
    
    # 1. Valid token
    token = create_access_token(data, expires_delta=timedelta(minutes=15))
    decoded = decode_access_token(token)
    assert decoded["sub"] == str(user_id)
    assert decoded["email"] == "audit@proerp.com"

    # 2. Expired token
    expired_token = create_access_token(data, expires_delta=timedelta(seconds=-10))
    with pytest.raises(HTTPException) as exc_info:
        decode_access_token(expired_token)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Could not validate credentials" in exc_info.value.detail

    # 3. Tampered payload / signature
    parts = token.split(".")
    tampered_payload = "eyJzdWIiOiA5OTksICJlbWFpbCI6ICJhZG1pbkBoYWNrZXIuY29tIn0"
    tampered_token = f"{parts[0]}.{tampered_payload}.{parts[2]}"
    with pytest.raises(HTTPException) as exc_info:
        decode_access_token(tampered_token)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED

    # 4. Wrong secret key
    forged_token = jwt.encode(data, "wrong-secret-key-that-should-fail", algorithm=settings.algorithm)
    with pytest.raises(HTTPException) as exc_info:
        decode_access_token(forged_token)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


def test_tenant_isolation_boundary_scoping(db):
    """
    Audit multi-tenant isolation:
    - Normal user cannot tamper query param to cross into another tenant: resolve_business_id forces user.business_id.
    - Superuser can explicitly resolve any tenant.
    - verify_record_ownership raises 404 (preventing oracle enumeration) when accessing another tenant's record.
    """
    biz1 = BusinessProfile(id=101, name_en="Tenant Alpha Ltd")
    biz2 = BusinessProfile(id=102, name_en="Tenant Beta Ltd")
    db.add_all([biz1, biz2])
    db.commit()

    user_tenant1 = User(
        id=210,
        username="user_t101",
        email="user_t101@alpha.com",
        password_hash="mock",
        business_id=101,
        is_superuser=False,
        is_active=True,
    )
    superuser = User(
        id=999,
        username="global_admin",
        email="super@proerp.com",
        password_hash="mock",
        business_id=None,
        is_superuser=True,
        is_active=True,
    )

    # 1. Normal user: requested_business_id is ignored and forced to user.business_id
    assert resolve_business_id(user_tenant1, None) == 101
    assert resolve_business_id(user_tenant1, 102) == 101

    # 2. Superuser can explicitly target any tenant
    assert resolve_business_id(superuser, 101) == 101
    assert resolve_business_id(superuser, 102) == 102

    # 3. verify_record_ownership on record from Tenant 2 accessed by User of Tenant 1 -> 404
    class MockRecord:
        def __init__(self, bid):
            self.business_id = bid

    record_of_tenant2 = MockRecord(102)
    with pytest.raises(HTTPException) as exc_info:
        verify_record_ownership(record_of_tenant2, user_tenant1)
    assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND

    # Record of own tenant -> ALLOWED
    record_of_tenant1 = MockRecord(101)
    assert verify_record_ownership(record_of_tenant1, user_tenant1) == record_of_tenant1


@pytest.mark.asyncio
async def test_auth_strategy_gating_matrix(db):
    """
    Audit require_permission under different auth strategies:
    - In "rbac" mode: allowed if user role has permission, ignoring subscription plan limits.
    - In "subscription" mode: allowed only if subscription plan has permission.
    - In "dual" mode: requires BOTH user role and subscription plan permission.
    """
    plan_basic = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == "HR Payroll (Basic)").first()
    plan_pro = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == "HR Payroll (Pro)").first()
    role_basic = db.query(Role).filter(Role.name == "hr_basic").first()
    role_pro = db.query(Role).filter(Role.name == "hr_pro").first()

    biz_basic = BusinessProfile(id=110, name_en="Basic Corp", subscription_plan_id=plan_basic.id)
    biz_basic.subscription_plan = plan_basic
    db.add(biz_basic)
    db.commit()

    # User has Pro Role, but Business has Basic Subscription
    user = User(
        id=250,
        username="pro_user_on_basic_biz",
        email="prouser@basiccorp.com",
        password_hash="mock",
        business_id=biz_basic.id,
        is_superuser=False,
        is_active=True,
    )
    user.roles.append(role_pro)
    user.business_profile = biz_basic
    db.add(user)
    db.commit()

    # Feature: hrm:compensation:view is a PRO feature
    perm_checker = require_permission("hrm", "compensation", "view")

    # Under RBAC strategy: User has hr_pro -> ALLOWED
    settings.auth_strategy = "rbac"
    settings.subscription_required = False
    result = await perm_checker(current_user=user)
    assert result.id == user.id

    # Under Subscription strategy: Business only has Basic Plan -> DENIED (403)
    settings.auth_strategy = "subscription"
    settings.subscription_required = True
    with pytest.raises(HTTPException) as exc_info:
        await perm_checker(current_user=user)
    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    assert "Upgrade required" in exc_info.value.detail

    # Under Dual strategy: Requires both user role AND subscription plan -> DENIED (403)
    settings.auth_strategy = "dual"
    settings.subscription_required = True
    with pytest.raises(HTTPException) as exc_info:
        await perm_checker(current_user=user)
    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN

    # Reset settings back to default
    settings.auth_strategy = "rbac"
    settings.subscription_required = False