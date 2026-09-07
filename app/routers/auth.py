from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_optional
from app.core.identity.models import User
from app.core.identity.schemas import (
    AddressCreate,
    AddressResponse,
    Token,
    UserCreate,
    UserResponse,
    VendorProfileCreate,
    VendorProfileResponse,
)
from app.core.identity.service import UserService
from app.core.security import create_access_token, verify_password
from app.core.tenancy.models import BusinessProfile
from app.database import get_async_db

router = APIRouter(tags=["Authentication"])

service = UserService()
templates = Jinja2Templates(directory="app/templates")


def add_no_cache_headers(response: Response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@router.get("/auth/login", response_class=HTMLResponse)
async def login_page(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    current_user = await get_current_user_optional(request, None, db)
    if current_user and current_user.is_active:
        response = RedirectResponse(url="/users/manage", status_code=status.HTTP_302_FOUND)
        return add_no_cache_headers(response)

    response = templates.TemplateResponse(
        request=request,
        name="login.html",
    )
    return add_no_cache_headers(response)


@router.get("/auth/register", response_class=HTMLResponse)
async def register_page(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    result = await db.execute(
        select(BusinessProfile).where(BusinessProfile.is_active)
    )
    businesses = list(result.scalars().all())
    response = templates.TemplateResponse(
        request=request,
        name="register.html",
        context={"businesses": businesses},
    )
    return add_no_cache_headers(response)


@router.get("/auth/logout")
async def logout_get():
    response = RedirectResponse(url="/auth/login", status_code=status.HTTP_302_FOUND)
    response.delete_cookie("access_token", path="/")
    return add_no_cache_headers(response)


@router.post("/auth/logout")
async def logout_post():
    res = Response(content='{"message": "Successfully logged out"}', media_type="application/json")
    res.delete_cookie("access_token", path="/")
    return add_no_cache_headers(res)


@router.post("/auth/register", response_model=UserResponse, status_code=201)
async def register(data: UserCreate, db: AsyncSession = Depends(get_async_db)):
    return await service.create_user(db, data)


@router.post("/auth/login", response_model=Token)
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_async_db),
):
    user = await service.get_user_by_username_or_email(db, form_data.username)

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password",
        )

    token = create_access_token({"sub": str(user.id)})

    response.set_cookie(
        key="access_token",
        value=f"Bearer {token}",
        httponly=True,
        samesite="lax",
        path="/",
    )

    return {"access_token": token, "token_type": "bearer"}


@router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user_optional)):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return current_user


@router.post(
    "/auth/me/vendor-profile", response_model=VendorProfileResponse, status_code=201
)
async def create_vendor_profile(
    data: VendorProfileCreate,
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_async_db),
):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return await service.create_vendor_profile(db, current_user.id, data)


@router.post("/auth/me/addresses", response_model=AddressResponse, status_code=201)
async def add_address(
    data: AddressCreate,
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_async_db),
):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return await service.add_address(db, current_user.id, data)


@router.delete("/auth/me/addresses/{address_id}", status_code=204)
async def delete_address(
    address_id: int,
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_async_db),
):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    await service.delete_address(db, current_user.id, address_id)
