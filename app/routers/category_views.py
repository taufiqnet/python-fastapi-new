import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.deps import get_current_user_optional
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id, verify_record_ownership
from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.ecommerce.categories.service import CategoryService

router = APIRouter(prefix="", tags=["Category Views"])
templates = Jinja2Templates(directory="app/templates")
category_service = CategoryService()
business_service = BusinessService()


@router.get("/categories/manage", response_class=HTMLResponse)
def category_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    categories = category_service.get_categories(
        db, skip=skip, limit=limit, business_id=resolved_business_id
    )
    all_businesses = business_service.list_businesses(db, skip=0, limit=500)
    if current_user and not current_user.is_superuser and current_user.business_id:
        businesses = [b for b in all_businesses if b.id == current_user.business_id]
    else:
        businesses = all_businesses

    biz_map = {b.id: b.name_en for b in all_businesses}

    total_count = len(categories)
    active_count = sum(1 for c in categories if getattr(c, "is_active", True))
    inactive_count = total_count - active_count
    root_count = sum(1 for c in categories if c.parent_id is None)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/categories/category_list.html",
        context={
            "categories": categories,
            "businesses": businesses,
            "biz_map": biz_map,
            "total_count": total_count,
            "active_count": active_count,
            "inactive_count": inactive_count,
            "root_count": root_count,
            "active_page": "categories",
            "current_user": current_user,
        },
    )


@router.get("/categories/create", response_class=HTMLResponse)
def category_create_page(
    request: Request,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    all_businesses = business_service.list_businesses(db, skip=0, limit=500)
    if current_user and not current_user.is_superuser and current_user.business_id:
        businesses = [b for b in all_businesses if b.id == current_user.business_id]
    else:
        businesses = all_businesses

    resolved_business_id = resolve_business_id(current_user, None)
    parent_categories = category_service.get_categories(
        db, skip=0, limit=500, business_id=resolved_business_id
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/categories/category_form.html",
        context={
            "category": None,
            "is_edit": False,
            "businesses": businesses,
            "parent_categories": parent_categories,
            "active_page": "categories",
            "current_user": current_user,
        },
    )


@router.get("/categories/detail/{category_id}", response_class=HTMLResponse)
def category_detail_page(
    category_id: uuid.UUID,
    request: Request,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    category = category_service.get_category(db, category_id)
    verify_record_ownership(category, current_user)
    business = None
    if category.business_id:
        business = business_service.get_business(db, category.business_id)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/categories/category_detail.html",
        context={
            "category": category,
            "business": business,
            "active_page": "categories",
            "current_user": current_user,
        },
    )


@router.get("/categories/edit/{category_id}", response_class=HTMLResponse)
def category_edit_page(
    category_id: uuid.UUID,
    request: Request,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    category = category_service.get_category(db, category_id)
    verify_record_ownership(category, current_user)

    all_businesses = business_service.list_businesses(db, skip=0, limit=500)
    if current_user and not current_user.is_superuser and current_user.business_id:
        businesses = [b for b in all_businesses if b.id == current_user.business_id]
    else:
        businesses = all_businesses

    resolved_business_id = resolve_business_id(current_user, category.business_id)
    all_categories = category_service.get_categories(
        db, skip=0, limit=500, business_id=resolved_business_id
    )
    parent_categories = [c for c in all_categories if c.id != category_id]

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/categories/category_form.html",
        context={
            "category": category,
            "is_edit": True,
            "businesses": businesses,
            "parent_categories": parent_categories,
            "active_page": "categories",
            "current_user": current_user,
        },
    )
