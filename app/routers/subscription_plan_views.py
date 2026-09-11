from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.billing.schemas import (
    SubscriptionPlanCreate,
    SubscriptionPlanOut,
    SubscriptionPlanUpdate,
)
from app.core.billing.service import SubscriptionPlanService
from app.core.deps import get_current_admin, get_current_user_optional
from app.core.identity.seed import SYSTEM_MODULES
from app.core.identity.service import UserService
from app.database import get_async_db

router = APIRouter(prefix="", tags=["Subscription Plans Management"])
templates = Jinja2Templates(directory="app/templates")
plan_service = SubscriptionPlanService()
user_service = UserService()


def _format_plan_out(plan) -> SubscriptionPlanOut:
    perm_ids = [p.id for p in plan.permissions]
    perm_codes = [p.code for p in plan.permissions]
    return SubscriptionPlanOut(
        id=plan.id,
        name=plan.name,
        description=plan.description,
        is_active=plan.is_active,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        permission_ids=perm_ids,
        permission_codes=perm_codes,
    )


@router.get("/subscription-plans/manage", response_class=HTMLResponse)
async def subscription_plan_list_page(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    current_user = await get_current_user_optional(request, None, db)
    if not current_user or not (current_user.is_superuser or current_user.has_role("admin")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="System admin access required"
        )

    plans = await plan_service.list_plans(db)
    permissions = await user_service.get_all_permissions(db)
    active_plans_count = sum(1 for p in plans if p.is_active)

    return templates.TemplateResponse(
        request=request,
        name="modules/billing/plan_list.html",
        context={
            "current_user": current_user,
            "plans": plans,
            "active_plans_count": active_plans_count,
            "total_permissions_count": len(permissions),
            "active_page": "subscription_plans",
        },
    )


@router.get("/subscription-plans/create", response_class=HTMLResponse)
async def subscription_plan_create_page(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    current_user = await get_current_user_optional(request, None, db)
    if not current_user or not (current_user.is_superuser or current_user.has_role("admin")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="System admin access required"
        )

    permissions = await user_service.get_all_permissions(db)

    return templates.TemplateResponse(
        request=request,
        name="modules/billing/plan_form.html",
        context={
            "current_user": current_user,
            "plan": None,
            "is_edit": False,
            "permissions": permissions,
            "system_modules": SYSTEM_MODULES,
            "active_page": "subscription_plans",
        },
    )


@router.get("/subscription-plans/{plan_id}/edit", response_class=HTMLResponse)
async def subscription_plan_edit_page(
    plan_id: int,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    current_user = await get_current_user_optional(request, None, db)
    if not current_user or not (current_user.is_superuser or current_user.has_role("admin")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="System admin access required"
        )

    plan = await plan_service.get_plan(db, plan_id)
    permissions = await user_service.get_all_permissions(db)
    assigned_perm_ids = {p.id for p in plan.permissions}

    return templates.TemplateResponse(
        request=request,
        name="modules/billing/plan_form.html",
        context={
            "current_user": current_user,
            "plan": plan,
            "is_edit": True,
            "assigned_perm_ids": assigned_perm_ids,
            "permissions": permissions,
            "system_modules": SYSTEM_MODULES,
            "active_page": "subscription_plans",
        },
    )


@router.get("/subscription-plans/api", response_model=list[SubscriptionPlanOut])
async def list_subscription_plans_api(
    db: AsyncSession = Depends(get_async_db),
    admin=Depends(get_current_admin),
):
    plans = await plan_service.list_plans(db)
    return [_format_plan_out(p) for p in plans]


@router.post(
    "/subscription-plans/api",
    response_model=SubscriptionPlanOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_subscription_plan_api(
    data: SubscriptionPlanCreate,
    db: AsyncSession = Depends(get_async_db),
    admin=Depends(get_current_admin),
):
    plan = await plan_service.create_plan(db, data)
    return _format_plan_out(plan)


@router.get("/subscription-plans/api/{plan_id}", response_model=SubscriptionPlanOut)
async def get_subscription_plan_api(
    plan_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin=Depends(get_current_admin),
):
    plan = await plan_service.get_plan(db, plan_id)
    return _format_plan_out(plan)


@router.put("/subscription-plans/api/{plan_id}", response_model=SubscriptionPlanOut)
async def update_subscription_plan_api(
    plan_id: int,
    data: SubscriptionPlanUpdate,
    db: AsyncSession = Depends(get_async_db),
    admin=Depends(get_current_admin),
):
    plan = await plan_service.update_plan(db, plan_id, data)
    return _format_plan_out(plan)


@router.delete(
    "/subscription-plans/api/{plan_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_subscription_plan_api(
    plan_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin=Depends(get_current_admin),
):
    await plan_service.delete_plan(db, plan_id)
