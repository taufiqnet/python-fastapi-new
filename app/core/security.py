from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.identity.models import User
from app.core.identity.repository import UserRepository
from app.database import get_async_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)
user_repo = UserRepository()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def extract_token_from_request(request: Request, header_token: str | None = None) -> str | None:
    if header_token:
        return header_token
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        if cookie_token.startswith("Bearer "):
            return cookie_token[7:]
        return cookie_token
    query_token = request.query_params.get("token")
    if query_token:
        if query_token.startswith("Bearer "):
            return query_token[7:]
        return query_token
    return None


async def get_current_user_optional(
    request: Request,
    header_token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_async_db),
) -> User | None:
    if hasattr(request, "state") and getattr(request.state, "user", None) is not None:
        return request.state.user
    token = extract_token_from_request(request, header_token)
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        sub = payload.get("sub")
        if sub is None:
            return None
        sub_str = str(sub)
        user = None
        if sub_str.isdigit():
            user = await user_repo.get_by_id(db, int(sub_str))
        if user is None:
            user = await user_repo.get_by_username(db, sub_str)
        return user
    except Exception:
        return None


async def get_current_user(
    request: Request,
    header_token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_async_db),
) -> User:
    user = await get_current_user_optional(request, header_token, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.is_superuser or current_user.has_role("admin"):
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin access required",
    )


async def get_current_plan_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Allow access to superusers, users with role 'admin',
    or users granted general:subscription_plans permissions.
    """
    if current_user.is_superuser or current_user.has_role("admin"):
        return current_user
    if (
        current_user.has_permission("general:subscription_plans:view")
        or current_user.has_permission("general:subscription_plans:manage")
        or current_user.has_permission("general:subscription_plans:create")
        or current_user.has_permission("general:subscription_plans:update")
    ):
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Subscription plans administration access required",
    )


def require_permission(module: str, feature: str, action: str):
    async def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.is_superuser or current_user.has_role("admin"):
            return current_user

        candidate_codes = [f"{module}:{feature}:{action}"]
        if action == "edit":
            candidate_codes.append(f"{module}:{feature}:update")
        elif action == "update":
            candidate_codes.append(f"{module}:{feature}:edit")

        if feature in ("pos_terminal", "pos_registers"):
            candidate_codes.extend([f"{module}:pos:{action}", f"{module}:orders:{action}"])
        elif feature in ("procurement_po", "procurement_suppliers"):
            candidate_codes.extend([f"{module}:procurement:{action}", f"{module}:inventory:{action}"])
        elif feature in ("items_master", "inventory_uom", "inventory_valuation", "lots_serials", "inventory_transfers", "inventory_counts", "barcode_print"):
            candidate_codes.append(f"{module}:inventory:{action}")
        elif feature in ("customers", "customer"):
            candidate_codes.extend([f"{module}:pos:{action}", f"{module}:orders:{action}"])
        elif feature == "coupons":
            candidate_codes.append(f"{module}:products:{action}")
        elif module in ("fleet", "vehicles"):
            candidate_codes.extend([f"fleet:{feature}:{action}", f"vehicles:{feature}:{action}"])
        elif feature in ("assets", "asset_allocations", "asset_maintenance"):
            candidate_codes.extend([f"hrm:{feature}:{action}", f"assets:{feature}:{action}"])

        # Check authorization strategy
        strategy = getattr(settings, "auth_strategy", "rbac").lower()

        # In Pure RBAC or Dual Strategy: check user permissions
        if strategy != "subscription":
            has_any = any(current_user.has_permission(c) for c in candidate_codes)
            if not has_any:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied. Required permission: {candidate_codes[0]}",
                )

        # In Subscription Plan Strategy or Dual Strategy: check business subscription plan
        if (strategy in ("subscription", "dual") or settings.subscription_required) and current_user.business_id:
            biz_profile = current_user.business_profile
            if biz_profile:
                plan_has_any = any(biz_profile.has_permission(c) for c in candidate_codes)
                if not plan_has_any:
                    plan_name = (
                        biz_profile.subscription_plan.name
                        if biz_profile.subscription_plan
                        else "Current"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Upgrade required: Your business subscription plan ({plan_name}) does not include feature '{candidate_codes[0]}'. Please upgrade your subscription.",
                    )
        return current_user

    return permission_checker
