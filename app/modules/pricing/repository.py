import uuid

from sqlalchemy.orm import Session

from app.modules.pricing.models import CurrencyRate, PriceHistory, TaxRule
from app.modules.pricing.schemas import (
    CurrencyRateCreate,
    PriceHistoryCreate,
    TaxRuleCreate,
    TaxRuleUpdate,
)


class PricingRepository:
    def create_price_history(
        self, db: Session, data: PriceHistoryCreate
    ) -> PriceHistory:
        history = PriceHistory(**data.model_dump())
        db.add(history)
        db.commit()
        db.refresh(history)
        return history

    def get_price_histories(
        self, db: Session, variant_id: uuid.UUID, business_id: int = 1
    ) -> list[PriceHistory]:
        return (
            db.query(PriceHistory)
            .filter(
                PriceHistory.variant_id == variant_id,
                PriceHistory.business_id == business_id,
            )
            .all()
        )

    def create_tax_rule(self, db: Session, data: TaxRuleCreate) -> TaxRule:
        rule = TaxRule(**data.model_dump())
        db.add(rule)
        db.commit()
        db.refresh(rule)
        return rule

    def get_tax_rules(self, db: Session, business_id: int = 1) -> list[TaxRule]:
        return db.query(TaxRule).filter(TaxRule.business_id == business_id).all()

    def get_tax_rule_by_id(
        self, db: Session, rule_id: uuid.UUID, business_id: int = 1
    ) -> TaxRule | None:
        return (
            db.query(TaxRule)
            .filter(TaxRule.id == rule_id, TaxRule.business_id == business_id)
            .first()
        )

    def update_tax_rule(
        self, db: Session, rule: TaxRule, data: TaxRuleUpdate
    ) -> TaxRule:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(rule, field, value)
        db.commit()
        db.refresh(rule)
        return rule

    def create_currency_rate(
        self, db: Session, data: CurrencyRateCreate
    ) -> CurrencyRate:
        rate = CurrencyRate(**data.model_dump())
        db.add(rate)
        db.commit()
        db.refresh(rate)
        return rate

    def get_currency_rates(
        self, db: Session, business_id: int = 1
    ) -> list[CurrencyRate]:
        return (
            db.query(CurrencyRate).filter(CurrencyRate.business_id == business_id).all()
        )
