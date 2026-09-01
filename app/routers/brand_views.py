import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.ecommerce.brands.service import BrandService

router = APIRouter(prefix="", tags=["Brand Views"])
templates = Jinja2Templates(directory="app/templates")
brand_service = BrandService()
business_service = BusinessService()


@router.get("/brands", response_class=HTMLResponse)
def brand_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    db: Session = Depends(get_db),
):
    brands = brand_service.get_brands(
        db, skip=skip, limit=limit, business_id=business_id
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    biz_map = {b.id: b.name_en for b in businesses}

    total_count = len(brands)
    active_count = sum(1 for b in brands if getattr(b, "is_active", True))
    inactive_count = total_count - active_count

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/brands/brand_list.html",
        context={
            "brands": brands,
            "businesses": businesses,
            "biz_map": biz_map,
            "total_count": total_count,
            "active_count": active_count,
            "inactive_count": inactive_count,
            "active_page": "brands",
        },
    )


@router.get("/brands/create", response_class=HTMLResponse)
def brand_create_page(request: Request, db: Session = Depends(get_db)):
    businesses = business_service.list_businesses(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/brands/brand_form.html",
        context={
            "brand": None,
            "is_edit": False,
            "businesses": businesses,
            "active_page": "brands",
        },
    )


@router.get("/brands/detail/{brand_id}", response_class=HTMLResponse)
def brand_detail_page(
    brand_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    brand = brand_service.get_brand(db, brand_id)
    business = None
    if brand.business_id:
        business = business_service.get_business(db, brand.business_id)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/brands/brand_detail.html",
        context={
            "brand": brand,
            "business": business,
            "active_page": "brands",
        },
    )


@router.get("/brands/edit/{brand_id}", response_class=HTMLResponse)
def brand_edit_page(
    brand_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    brand = brand_service.get_brand(db, brand_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/brands/brand_form.html",
        context={
            "brand": brand,
            "is_edit": True,
            "businesses": businesses,
            "active_page": "brands",
        },
    )
