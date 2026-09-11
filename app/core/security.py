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


def require_permission(module: str, feature: str, action: str):
    async def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.is_superuser:
            return current_user
        code = f"{module}:{feature}:{action}"
        if not current_user.has_permission(code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required permission: {code}",
            )
        if current_user.business_id:
            from app.core.tenancy.models import BusinessProfile
            from app.core.billing.models import SubscriptionPlan
            from sqlalchemy import select
            db = getattr(current_user, "_sa_instance_state", None)
            # Re-fetch business profile with subscription_plan permissions if needed
            biz_profile = current_user.business_profile
            if biz_profile:
                if not biz_profile.has_permission(code):
                    plan_name = (
                        biz_profile.subscription_plan.name
                        if biz_profile.subscription_plan
                        else "Current"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Upgrade required: Your business subscription plan ({plan_name}) does not include feature '{code}'. Please upgrade your subscription.",
                    )
        return current_user

    return permission_checker
