import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.database import get_db
from app.modules.ecommerce.pricing.schemas import (
    CartCalculationRequest,
    CartCalculationResponse,
    CouponCreate,
    CouponOut,
    CouponUpdate,
    CouponValidateRequest,
    CouponValidateResponse,
    CurrencyRateCreate,
    CurrencyRateOut,
    DiscountRuleCreate,
    DiscountRuleOut,
    DiscountRuleUpdate,
    PriceHistoryCreate,
    PriceHistoryOut,
    TaxCalculationRequest,
    TaxCalculationResponse,
    TaxRuleCreate,
    TaxRuleOut,
    TaxRuleUpdate,
)
from app.modules.ecommerce.pricing.service import PricingService

router = APIRouter(prefix="/pricing", tags=["Pricing"])
service = PricingService()


# --- Price History Endpoints ---
@router.post(
    "/price-history",
    response_model=PriceHistoryOut,
    status_code=status.HTTP_201_CREATED,
)
def create_price_history(
    data: PriceHistoryCreate,
    current_user: User = Depends(require_permission("ecommerce", "products", "create")),
    db: Session = Depends(get_db),
):
    data.business_id = resolve_business_id(current_user, data.business_id)
    return service.create_price_history(db, data)


@router.get("/price-history", response_model=list[PriceHistoryOut])
def get_price_histories(
    variant_id: uuid.UUID = Query(...),
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return service.get_price_histories(
        db, variant_id=variant_id, business_id=resolved_business_id
    )


# --- Tax Rule Endpoints ---
@router.post(
    "/tax-rules",
    response_model=TaxRuleOut,
    status_code=status.HTTP_201_CREATED,
)
def create_tax_rule(
    data: TaxRuleCreate,
    current_user: User = Depends(require_permission("ecommerce", "products", "create")),
    db: Session = Depends(get_db),
):
    data.business_id = resolve_business_id(current_user, data.business_id)
    return service.create_tax_rule(db, data)


@router.get("/tax-rules", response_model=list[TaxRuleOut])
def get_tax_rules(
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return service.get_tax_rules(db, business_id=resolved_business_id)


@router.put("/tax-rules/{rule_id}", response_model=TaxRuleOut)
def update_tax_rule(
    rule_id: uuid.UUID,
    data: TaxRuleUpdate,
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "products", "update")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return service.update_tax_rule(
        db, rule_id=rule_id, data=data, business_id=resolved_business_id
    )


@router.post("/calculate-tax", response_model=TaxCalculationResponse)
def calculate_tax(
    req: TaxCalculationRequest,
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    return service.calculate_tax(db, req)


# --- Currency Rate Endpoints ---
@router.post(
    "/currency-rates",
    response_model=CurrencyRateOut,
    status_code=status.HTTP_201_CREATED,
)
def create_currency_rate(
    data: CurrencyRateCreate,
    current_user: User = Depends(require_permission("ecommerce", "products", "create")),
    db: Session = Depends(get_db),
):
    data.business_id = resolve_business_id(current_user, data.business_id)
    return service.create_currency_rate(db, data)


@router.get("/currency-rates", response_model=list[CurrencyRateOut])
def get_currency_rates(
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return service.get_currency_rates(db, business_id=resolved_business_id)


# --- Discount Rule Endpoints ---
@router.post(
    "/discount-rules",
    response_model=DiscountRuleOut,
    status_code=status.HTTP_201_CREATED,
)
def create_discount_rule(
    data: DiscountRuleCreate,
    current_user: User = Depends(require_permission("ecommerce", "products", "create")),
    db: Session = Depends(get_db),
):
    data.business_id = resolve_business_id(current_user, data.business_id)
    return service.create_discount_rule(db, data)


@router.get("/discount-rules", response_model=list[DiscountRuleOut])
def get_discount_rules(
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return service.get_discount_rules(db, business_id=resolved_business_id)


@router.put("/discount-rules/{rule_id}", response_model=DiscountRuleOut)
def update_discount_rule(
    rule_id: uuid.UUID,
    data: DiscountRuleUpdate,
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "products", "update")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return service.update_discount_rule(
        db, rule_id=rule_id, data=data, business_id=resolved_business_id
    )


@router.delete("/discount-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_discount_rule(
    rule_id: uuid.UUID,
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "products", "delete")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    service.delete_discount_rule(db, rule_id=rule_id, business_id=resolved_business_id)


# --- Coupon Endpoints ---
@router.post(
    "/coupons",
    response_model=CouponOut,
    status_code=status.HTTP_201_CREATED,
)
def create_coupon(
    data: CouponCreate,
    current_user: User = Depends(require_permission("ecommerce", "products", "create")),
    db: Session = Depends(get_db),
):
    data.business_id = resolve_business_id(current_user, data.business_id)
    return service.create_coupon(db, data)


@router.get("/coupons", response_model=list[CouponOut])
def get_coupons(
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return service.get_coupons(db, business_id=resolved_business_id)


@router.put("/coupons/{coupon_id}", response_model=CouponOut)
def update_coupon(
    coupon_id: uuid.UUID,
    data: CouponUpdate,
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "products", "update")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return service.update_coupon(
        db, coupon_id=coupon_id, data=data, business_id=resolved_business_id
    )


@router.delete("/coupons/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_coupon(
    coupon_id: uuid.UUID,
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "products", "delete")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    service.delete_coupon(db, coupon_id=coupon_id, business_id=resolved_business_id)


@router.post("/coupons/validate", response_model=CouponValidateResponse)
def validate_coupon(
    req: CouponValidateRequest,
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    return service.validate_coupon(db, req)


@router.post("/calculate", response_model=CartCalculationResponse)
def calculate_cart(
    req: CartCalculationRequest,
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    return service.calculate_cart(db, req)
