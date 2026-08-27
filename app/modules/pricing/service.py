import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.pricing.repository import PricingRepository
from app.modules.pricing.schemas import (
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


class PricingService:
    def __init__(self, repository: PricingRepository | None = None):
        self.repository = repository or PricingRepository()

    def create_price_history(
        self, db: Session, data: PriceHistoryCreate
    ) -> PriceHistoryOut:
        history = self.repository.create_price_history(db, data)
        return PriceHistoryOut.model_validate(history)

    def get_price_histories(
        self, db: Session, variant_id: uuid.UUID, business_id: int = 1
    ) -> list[PriceHistoryOut]:
        histories = self.repository.get_price_histories(
            db, variant_id=variant_id, business_id=business_id
        )
        return [PriceHistoryOut.model_validate(h) for h in histories]

    def create_tax_rule(self, db: Session, data: TaxRuleCreate) -> TaxRuleOut:
        rule = self.repository.create_tax_rule(db, data)
        return TaxRuleOut.model_validate(rule)

    def get_tax_rules(self, db: Session, business_id: int = 1) -> list[TaxRuleOut]:
        rules = self.repository.get_tax_rules(db, business_id=business_id)
        return [TaxRuleOut.model_validate(r) for r in rules]

    def update_tax_rule(
        self, db: Session, rule_id: uuid.UUID, data: TaxRuleUpdate, business_id: int = 1
    ) -> TaxRuleOut:
        rule = self.repository.get_tax_rule_by_id(db, rule_id, business_id=business_id)
        if not rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Tax rule not found"
            )
        updated = self.repository.update_tax_rule(db, rule, data)
        return TaxRuleOut.model_validate(updated)

    def calculate_tax(
        self, db: Session, req: TaxCalculationRequest
    ) -> TaxCalculationResponse:
        rules = self.repository.get_tax_rules(db, business_id=req.business_id)
        matched_rule = None
        for r in rules:
            if r.region.lower() == req.region.lower() and r.is_active:
                if req.category_id and r.category_id == req.category_id:
                    matched_rule = r
                    break
                elif not r.category_id and not matched_rule:
                    matched_rule = r

        rate = float(matched_rule.tax_percentage) if matched_rule else 0.0
        tax_amount = round(req.amount * (rate / 100.0), 2)
        total = round(req.amount + tax_amount, 2)

        return TaxCalculationResponse(
            subtotal=req.amount,
            tax_rate=rate,
            tax_amount=tax_amount,
            total=total,
        )

    def create_currency_rate(
        self, db: Session, data: CurrencyRateCreate
    ) -> CurrencyRateOut:
        rate = self.repository.create_currency_rate(db, data)
        return CurrencyRateOut.model_validate(rate)

    def get_currency_rates(
        self, db: Session, business_id: int = 1
    ) -> list[CurrencyRateOut]:
        rates = self.repository.get_currency_rates(db, business_id=business_id)
        return [CurrencyRateOut.model_validate(r) for r in rates]
