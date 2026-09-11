from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user_optional
from app.core.identity.schemas import RoleCreate, RoleResponse
from app.core.identity.seed import SYSTEM_MODULES
from app.core.identity.service import UserService
from app.core.tenancy.models import BusinessProfile
from app.core.billing.models import SubscriptionPlan
from app.database import get_async_db

router = APIRouter(prefix="", tags=["Roles & Permissions Views"])
templates = Jinja2Templates(directory="app/templates")
user_service = UserService()


@router.get("/permissions/api")
async def list_permissions_api(db: AsyncSession = Depends(get_async_db)):
    permissions = await user_service.get_all_permissions(db)
    return permissions


@router.get("/roles/manage", response_class=HTMLResponse)
async def role_list_page(
    request: Request,
    business_id: int | None = None,
    db: AsyncSession = Depends(get_async_db),
):
    current_user = await get_current_user_optional(request, None, db)
    roles = await user_service.get_roles(db, business_id=business_id)
    result = await db.execute(
        select(BusinessProfile).where(BusinessProfile.is_active)
    )
    businesses = list(result.scalars().all())

    return templates.TemplateResponse(
        request=request,
        name="modules/identity/role_list.html",
        context={
            "current_user": current_user,
            "roles": roles,
            "businesses": businesses,
            "selected_business_id": business_id,
            "active_page": "roles",
        },
    )


@router.get("/roles/create", response_class=HTMLResponse)
async def role_create_page(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    current_user = await get_current_user_optional(request, None, db)
    permissions = await user_service.get_all_permissions(db)
    result = await db.execute(
        select(BusinessProfile)
        .where(BusinessProfile.is_active)
        .options(
            selectinload(BusinessProfile.subscription_plan).selectinload(
                SubscriptionPlan.permissions
            )
        )
    )
    businesses = list(result.scalars().all())

    result_plans = await db.execute(
        select(SubscriptionPlan)
        .where(SubscriptionPlan.is_active)
        .order_by(SubscriptionPlan.id.asc())
        .options(selectinload(SubscriptionPlan.permissions))
    )
    plans = list(result_plans.scalars().all())

    return templates.TemplateResponse(
        request=request,
        name="modules/identity/role_form.html",
        context={
            "current_user": current_user,
            "role": None,
            "is_edit": False,
            "permissions": permissions,
            "system_modules": SYSTEM_MODULES,
            "businesses": businesses,
            "plans": plans,
            "active_page": "roles",
        },
    )


@router.get("/roles/{role_id}/edit", response_class=HTMLResponse)
async def role_edit_page(
    role_id: int,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    current_user = await get_current_user_optional(request, None, db)
    role = await user_service.get_role_by_id(db, role_id)
    permissions = await user_service.get_all_permissions(db)
    result = await db.execute(
        select(BusinessProfile)
        .where(BusinessProfile.is_active)
        .options(
            selectinload(BusinessProfile.subscription_plan).selectinload(
                SubscriptionPlan.permissions
            )
        )
    )
    businesses = list(result.scalars().all())

    result_plans = await db.execute(
        select(SubscriptionPlan)
        .where(SubscriptionPlan.is_active)
        .order_by(SubscriptionPlan.id.asc())
        .options(selectinload(SubscriptionPlan.permissions))
    )
    plans = list(result_plans.scalars().all())

    # If editing system admin role (ID 1 or name 'admin' with global scope) or if role permissions are empty, ensure all permissions are assigned
    if role.id == 1 or (role.name == "admin" and role.business_id is None):
        assigned_perm_ids = {p.id for p in permissions}
        if len(role.permissions) < len(permissions):
            role.permissions = permissions
            await db.commit()
    else:
        assigned_perm_ids = {p.id for p in role.permissions}

    return templates.TemplateResponse(
        request=request,
        name="modules/identity/role_form.html",
        context={
            "current_user": current_user,
            "role": role,
            "is_edit": True,
            "assigned_perm_ids": assigned_perm_ids,
            "permissions": permissions,
            "system_modules": SYSTEM_MODULES,
            "businesses": businesses,
            "plans": plans,
            "active_page": "roles",
        },
    )


@router.get("/roles/api", response_model=list[RoleResponse])
async def list_roles_api(
    business_id: int | None = None,
    db: AsyncSession = Depends(get_async_db),
):
    return await user_service.get_roles(db, business_id=business_id)


@router.post("/roles/api", response_model=RoleResponse, status_code=201)
async def create_role_api(
    data: RoleCreate,
    db: AsyncSession = Depends(get_async_db),
):
    return await user_service.create_role(db, data)


@router.get("/roles/api/{role_id}", response_model=RoleResponse)
async def get_role_api(
    role_id: int,
    db: AsyncSession = Depends(get_async_db),
):
    return await user_service.get_role_by_id(db, role_id)


@router.put("/roles/api/{role_id}", response_model=RoleResponse)
async def update_role_api(
    role_id: int,
    data: RoleCreate,
    db: AsyncSession = Depends(get_async_db),
):
    return await user_service.update_role(
        db,
        role_id,
        name=data.name,
        description=data.description,
        permission_ids=data.permission_ids,
    )


@router.delete("/roles/api/{role_id}", status_code=204)
async def delete_role_api(
    role_id: int,
    db: AsyncSession = Depends(get_async_db),
):
    await user_service.delete_role(db, role_id)
