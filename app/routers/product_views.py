import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.common.enums import Status
from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.ecommerce.brands.service import BrandService
from app.modules.ecommerce.categories.service import CategoryService
from app.modules.ecommerce.products.models import ProductCondition, ProductType
from app.modules.ecommerce.products.service import ProductService

router = APIRouter(prefix="", tags=["Product Views"])
templates = Jinja2Templates(directory="app/templates")
product_service = ProductService()
category_service = CategoryService()
brand_service = BrandService()
business_service = BusinessService()


@router.get("/products", response_class=HTMLResponse)
def product_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    category_id: uuid.UUID | None = None,
    brand_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
):
    products = product_service.get_products(
        db,
        skip=skip,
        limit=limit,
        business_id=business_id,
        category_id=category_id,
        brand_id=brand_id,
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    categories = category_service.get_categories(db, skip=0, limit=500)
    brands = brand_service.get_brands(db, skip=0, limit=500)

    biz_map = {b.id: b.name_en for b in businesses}
    cat_map = {c.id: c.name for c in categories}
    brand_map = {b.id: b.name for b in brands}

    total_count = len(products)
    published_count = sum(
        1 for p in products if (getattr(p.status, "value", p.status) in ("published", "active"))
    )
    draft_count = sum(
        1 for p in products if getattr(p.status, "value", p.status) == "draft"
    )
    archived_count = sum(
        1 for p in products if getattr(p.status, "value", p.status) == "archived"
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/products/product_list.html",
        context={
            "products": products,
            "businesses": businesses,
            "categories": categories,
            "brands": brands,
            "biz_map": biz_map,
            "cat_map": cat_map,
            "brand_map": brand_map,
            "total_count": total_count,
            "published_count": published_count,
            "draft_count": draft_count,
            "archived_count": archived_count,
            "active_page": "products",
        },
    )


@router.get("/products/create", response_class=HTMLResponse)
def product_create_page(request: Request, db: Session = Depends(get_db)):
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    categories = category_service.get_categories(db, skip=0, limit=500)
    brands = brand_service.get_brands(db, skip=0, limit=500)
    models = brand_service.get_all_models(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/products/product_form.html",
        context={
            "product": None,
            "is_edit": False,
            "businesses": businesses,
            "categories": categories,
            "brands": brands,
            "models": models,
            "statuses": [s.value for s in Status],
            "conditions": [c.value for c in ProductCondition],
            "product_types": [t.value for t in ProductType],
            "active_page": "products",
        },
    )


@router.get("/products/detail/{product_id}", response_class=HTMLResponse)
def product_detail_page(
    product_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    product = product_service.get_product(db, product_id)
    business = None
    if product.business_id:
        business = business_service.get_business(db, product.business_id)

    categories = category_service.get_categories(db, skip=0, limit=500)
    brands = brand_service.get_brands(db, skip=0, limit=500)
    models = brand_service.get_all_models(db, skip=0, limit=500)

    cat_map = {c.id: c.name for c in categories}
    brand_map = {b.id: b.name for b in brands}
    model_map = {m.id: m.name for m in models}

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/products/product_detail.html",
        context={
            "product": product,
            "business": business,
            "cat_map": cat_map,
            "brand_map": brand_map,
            "model_map": model_map,
            "active_page": "products",
        },
    )


@router.get("/products/edit/{product_id}", response_class=HTMLResponse)
def product_edit_page(
    product_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    product = product_service.get_product(db, product_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    categories = category_service.get_categories(db, skip=0, limit=500)
    brands = brand_service.get_brands(db, skip=0, limit=500)
    models = brand_service.get_all_models(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/products/product_form.html",
        context={
            "product": product,
            "is_edit": True,
            "businesses": businesses,
            "categories": categories,
            "brands": brands,
            "models": models,
            "statuses": [s.value for s in Status],
            "conditions": [c.value for c in ProductCondition],
            "product_types": [t.value for t in ProductType],
            "active_page": "products",
        },
    )
