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
from app.modules.ecommerce.brands.service import BrandService

router = APIRouter(prefix="", tags=["Model Views"])
templates = Jinja2Templates(directory="app/templates")
brand_service = BrandService()
business_service = BusinessService()


@router.get("/brands/models", response_class=HTMLResponse)
def model_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    models = brand_service.get_all_models(
        db, skip=skip, limit=limit, business_id=resolved_business_id
    )
    brands = brand_service.get_brands(db, skip=0, limit=500, business_id=resolved_business_id)
    all_businesses = business_service.list_businesses(db, skip=0, limit=500)
    if current_user and not current_user.is_superuser and current_user.business_id:
        businesses = [b for b in all_businesses if b.id == current_user.business_id]
    else:
        businesses = all_businesses

    brand_map = {b.id: b.name for b in brands}

    total_count = len(models)
    active_count = sum(1 for m in models if getattr(m, "is_active", True))
    inactive_count = total_count - active_count

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/models/model_list.html",
        context={
            "models": models,
            "brands": brands,
            "businesses": businesses,
            "brand_map": brand_map,
            "total_count": total_count,
            "active_count": active_count,
            "inactive_count": inactive_count,
            "active_page": "models",
            "current_user": current_user,
        },
    )


@router.get("/brands/models/create", response_class=HTMLResponse)
def model_create_page(
    request: Request,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, None)
    brands = brand_service.get_brands(db, skip=0, limit=500, business_id=resolved_business_id)
    all_businesses = business_service.list_businesses(db, skip=0, limit=500)
    if current_user and not current_user.is_superuser and current_user.business_id:
        businesses = [b for b in all_businesses if b.id == current_user.business_id]
    else:
        businesses = all_businesses

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/models/model_form.html",
        context={
            "model": None,
            "is_edit": False,
            "brands": brands,
            "businesses": businesses,
            "active_page": "models",
            "current_user": current_user,
        },
    )


@router.get("/brands/models/detail/{model_id}", response_class=HTMLResponse)
def model_detail_page(
    model_id: uuid.UUID,
    request: Request,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    model = brand_service.repository.get_model_by_id(db, model_id)
    if not model:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Model not found"
        )

    verify_record_ownership(model.brand, current_user)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/models/model_detail.html",
        context={
            "model": model,
            "active_page": "models",
            "current_user": current_user,
        },
    )


@router.get("/brands/models/edit/{model_id}", response_class=HTMLResponse)
def model_edit_page(
    model_id: uuid.UUID,
    request: Request,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    model = brand_service.repository.get_model_by_id(db, model_id)
    if not model:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Model not found"
        )

    verify_record_ownership(model.brand, current_user)

    resolved_business_id = resolve_business_id(current_user, model.brand.business_id if model.brand else None)
    brands = brand_service.get_brands(db, skip=0, limit=500, business_id=resolved_business_id)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/models/model_form.html",
        context={
            "model": model,
            "is_edit": True,
            "brands": brands,
            "active_page": "models",
            "current_user": current_user,
        },
    )
