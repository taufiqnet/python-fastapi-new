import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.database import get_db
from app.modules.ecommerce.pricing.schemas import (
    CurrencyRateCreate,
    CurrencyRateOut,
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
    return service.create_price_history(db, data)


@router.get("/price-history", response_model=list[PriceHistoryOut])
def get_price_histories(
    variant_id: uuid.UUID = Query(...),
    business_id: int = Query(1),
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    return service.get_price_histories(
        db, variant_id=variant_id, business_id=business_id
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
    return service.create_tax_rule(db, data)


@router.get("/tax-rules", response_model=list[TaxRuleOut])
def get_tax_rules(
    business_id: int = Query(1),
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    return service.get_tax_rules(db, business_id=business_id)


@router.put("/tax-rules/{rule_id}", response_model=TaxRuleOut)
def update_tax_rule(
    rule_id: uuid.UUID,
    data: TaxRuleUpdate,
    business_id: int = Query(1),
    current_user: User = Depends(require_permission("ecommerce", "products", "update")),
    db: Session = Depends(get_db),
):
    return service.update_tax_rule(
        db, rule_id=rule_id, data=data, business_id=business_id
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
    return service.create_currency_rate(db, data)


@router.get("/currency-rates", response_model=list[CurrencyRateOut])
def get_currency_rates(
    business_id: int = Query(1),
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    return service.get_currency_rates(db, business_id=business_id)
