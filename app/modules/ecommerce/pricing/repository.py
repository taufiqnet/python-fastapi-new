import uuid

from sqlalchemy.orm import Session

from app.modules.ecommerce.pricing.models import Coupon, CurrencyRate, DiscountRule, PriceHistory, TaxRule
from app.modules.ecommerce.pricing.schemas import (
    CouponCreate,
    CouponUpdate,
    CurrencyRateCreate,
    DiscountRuleCreate,
    DiscountRuleUpdate,
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

    # --- Discount Rules ---
    def create_discount_rule(
        self, db: Session, data: DiscountRuleCreate
    ) -> DiscountRule:
        rule = DiscountRule(**data.model_dump())
        db.add(rule)
        db.commit()
        db.refresh(rule)
        return rule

    def get_discount_rules(
        self, db: Session, business_id: int = 1
    ) -> list[DiscountRule]:
        return (
            db.query(DiscountRule)
            .filter(DiscountRule.business_id == business_id)
            .all()
        )

    def get_discount_rule_by_id(
        self, db: Session, rule_id: uuid.UUID, business_id: int = 1
    ) -> DiscountRule | None:
        return (
            db.query(DiscountRule)
            .filter(DiscountRule.id == rule_id, DiscountRule.business_id == business_id)
            .first()
        )

    def update_discount_rule(
        self, db: Session, rule: DiscountRule, data: DiscountRuleUpdate
    ) -> DiscountRule:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(rule, field, value)
        db.commit()
        db.refresh(rule)
        return rule

    def delete_discount_rule(
        self, db: Session, rule: DiscountRule
    ) -> None:
        db.delete(rule)
        db.commit()

    # --- Coupons ---
    def create_coupon(self, db: Session, data: CouponCreate) -> Coupon:
        coupon = Coupon(**data.model_dump())
        db.add(coupon)
        db.commit()
        db.refresh(coupon)
        return coupon

    def get_coupons(self, db: Session, business_id: int = 1) -> list[Coupon]:
        return (
            db.query(Coupon)
            .filter(Coupon.business_id == business_id)
            .all()
        )

    def get_coupon_by_code(
        self, db: Session, code: str, business_id: int = 1
    ) -> Coupon | None:
        return (
            db.query(Coupon)
            .filter(Coupon.code == code, Coupon.business_id == business_id)
            .first()
        )

    def get_coupon_by_id(
        self, db: Session, coupon_id: uuid.UUID, business_id: int = 1
    ) -> Coupon | None:
        return (
            db.query(Coupon)
            .filter(Coupon.id == coupon_id, Coupon.business_id == business_id)
            .first()
        )

    def update_coupon(
        self, db: Session, coupon: Coupon, data: CouponUpdate
    ) -> Coupon:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(coupon, field, value)
        db.commit()
        db.refresh(coupon)
        return coupon

    def delete_coupon(self, db: Session, coupon: Coupon) -> None:
        db.delete(coupon)
        db.commit()
