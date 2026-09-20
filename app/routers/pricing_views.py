import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id, verify_record_ownership
from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.ecommerce.categories.service import CategoryService
from app.modules.ecommerce.pricing.service import PricingService
from app.modules.ecommerce.products.service import ProductService

router = APIRouter(prefix="", tags=["Pricing Views"])
templates = Jinja2Templates(directory="app/templates")
pricing_service = PricingService()
business_service = BusinessService()
product_service = ProductService()
category_service = CategoryService()


@router.get("/pricing/manage", response_class=HTMLResponse)
def pricing_manage_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    all_businesses = business_service.list_businesses(db, skip=0, limit=500)
    if current_user and not current_user.is_superuser and current_user.business_id:
        businesses = [b for b in all_businesses if b.id == current_user.business_id]
    else:
        businesses = all_businesses

    selected_business_id = resolved_business_id or (businesses[0].id if businesses else 1)

    tax_rules = pricing_service.get_tax_rules(db, business_id=selected_business_id)
    currency_rates = pricing_service.get_currency_rates(db, business_id=selected_business_id)
    discount_rules = pricing_service.get_discount_rules(db, business_id=selected_business_id)
    products = product_service.get_products(db, business_id=selected_business_id, skip=0, limit=500)
    categories = category_service.get_categories(db, business_id=selected_business_id, skip=0, limit=500)

    variants_list = []
    for p in products:
        for v in p.variants:
            variants_list.append({
                "id": v.id,
                "sku": v.sku,
                "product_title": p.title,
                "price": float(v.price),
            })

    total_tax_rules = len(tax_rules)
    total_currency_rates = len(currency_rates)
    total_discount_rules = len(discount_rules)
    active_discount_rules = sum(1 for r in discount_rules if r.is_active)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/pricing/pricing_list.html",
        context={
            "tax_rules": tax_rules,
            "currency_rates": currency_rates,
            "discount_rules": discount_rules,
            "variants_list": variants_list,
            "categories": categories,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "total_tax_rules": total_tax_rules,
            "total_currency_rates": total_currency_rates,
            "total_discount_rules": total_discount_rules,
            "active_discount_rules": active_discount_rules,
            "active_page": "pricing",
            "current_user": current_user,
        },
    )


@router.get("/coupons/manage", response_class=HTMLResponse)
def coupon_manage_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    all_businesses = business_service.list_businesses(db, skip=0, limit=500)
    if current_user and not current_user.is_superuser and current_user.business_id:
        businesses = [b for b in all_businesses if b.id == current_user.business_id]
    else:
        businesses = all_businesses

    selected_business_id = resolved_business_id or (businesses[0].id if businesses else 1)

    coupons = pricing_service.get_coupons(db, business_id=selected_business_id)
    discount_rules = pricing_service.get_discount_rules(db, business_id=selected_business_id)

    total_coupons = len(coupons)
    active_coupons = sum(1 for c in coupons if c.is_active)
    total_uses = sum(c.used_count for c in coupons)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/pricing/coupon_list.html",
        context={
            "coupons": coupons,
            "discount_rules": discount_rules,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "total_coupons": total_coupons,
            "active_coupons": active_coupons,
            "total_uses": total_uses,
            "active_page": "coupons",
            "current_user": current_user,
        },
    )
