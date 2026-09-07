from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.identity.schemas import UserCreate, UserResponse, UserUpdate
from app.core.identity.seed import SYSTEM_MODULES
from app.core.identity.service import UserService
from app.core.tenancy.models import BusinessProfile
from app.database import get_async_db

router = APIRouter(prefix="", tags=["User Views & Management"])
templates = Jinja2Templates(directory="app/templates")
user_service = UserService()


@router.get("/users/manage", response_class=HTMLResponse)
async def user_list_page(
    request: Request,
    business_id: int | None = None,
    db: AsyncSession = Depends(get_async_db),
):
    users = await user_service.get_all_users(db, business_id=business_id)
    result = await db.execute(
        select(BusinessProfile).where(BusinessProfile.is_active)
    )
    businesses = list(result.scalars().all())

    return templates.TemplateResponse(
        request=request,
        name="modules/identity/user_list.html",
        context={
            "users": users,
            "businesses": businesses,
            "selected_business_id": business_id,
            "active_page": "users",
        },
    )


@router.get("/users/create", response_class=HTMLResponse)
async def user_create_page(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    roles = await user_service.get_roles(db)
    permissions = await user_service.get_all_permissions(db)
    result = await db.execute(
        select(BusinessProfile).where(BusinessProfile.is_active)
    )
    businesses = list(result.scalars().all())

    return templates.TemplateResponse(
        request=request,
        name="modules/identity/user_form.html",
        context={
            "user": None,
            "is_edit": False,
            "roles": roles,
            "permissions": permissions,
            "system_modules": SYSTEM_MODULES,
            "businesses": businesses,
            "active_page": "users",
        },
    )


@router.get("/users/{user_id}/edit", response_class=HTMLResponse)
async def user_edit_page(
    user_id: int,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    user = await user_service.get_user_by_id(db, user_id)
    roles = await user_service.get_roles(db, business_id=user.business_id)
    permissions = await user_service.get_all_permissions(db)
    result = await db.execute(
        select(BusinessProfile).where(BusinessProfile.is_active)
    )
    businesses = list(result.scalars().all())

    assigned_role_ids = {r.id for r in user.roles}
    assigned_perm_ids = {p.id for p in user.direct_permissions}

    return templates.TemplateResponse(
        request=request,
        name="modules/identity/user_form.html",
        context={
            "user": user,
            "is_edit": True,
            "roles": roles,
            "assigned_role_ids": assigned_role_ids,
            "assigned_perm_ids": assigned_perm_ids,
            "permissions": permissions,
            "system_modules": SYSTEM_MODULES,
            "businesses": businesses,
            "active_page": "users",
        },
    )


@router.get("/users/api", response_model=list[UserResponse])
async def list_users_api(
    business_id: int | None = None,
    db: AsyncSession = Depends(get_async_db),
):
    return await user_service.get_all_users(db, business_id=business_id)


@router.post("/users/api", response_model=UserResponse, status_code=201)
async def create_user_api(
    data: UserCreate,
    db: AsyncSession = Depends(get_async_db),
):
    return await user_service.create_user(db, data)


@router.get("/users/api/{user_id}", response_model=UserResponse)
async def get_user_api(
    user_id: int,
    db: AsyncSession = Depends(get_async_db),
):
    return await user_service.get_user_by_id(db, user_id)


@router.put("/users/api/{user_id}", response_model=UserResponse)
async def update_user_api(
    user_id: int,
    data: UserUpdate,
    db: AsyncSession = Depends(get_async_db),
):
    return await user_service.update_user(db, user_id, data)


@router.delete("/users/api/{user_id}", status_code=204)
async def delete_user_api(
    user_id: int,
    db: AsyncSession = Depends(get_async_db),
):
    await user_service.delete_user(db, user_id)
