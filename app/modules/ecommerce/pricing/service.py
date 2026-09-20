import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.ecommerce.pricing.repository import PricingRepository
from datetime import datetime, timezone

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

    # --- Discount Rules ---
    def create_discount_rule(
        self, db: Session, data: DiscountRuleCreate
    ) -> DiscountRuleOut:
        rule = self.repository.create_discount_rule(db, data)
        return DiscountRuleOut.model_validate(rule)

    def get_discount_rules(
        self, db: Session, business_id: int = 1
    ) -> list[DiscountRuleOut]:
        rules = self.repository.get_discount_rules(db, business_id=business_id)
        return [DiscountRuleOut.model_validate(r) for r in rules]

    def update_discount_rule(
        self, db: Session, rule_id: uuid.UUID, data: DiscountRuleUpdate, business_id: int = 1
    ) -> DiscountRuleOut:
        rule = self.repository.get_discount_rule_by_id(db, rule_id, business_id=business_id)
        if not rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Discount rule not found"
            )
        updated = self.repository.update_discount_rule(db, rule, data)
        return DiscountRuleOut.model_validate(updated)

    def delete_discount_rule(
        self, db: Session, rule_id: uuid.UUID, business_id: int = 1
    ) -> None:
        rule = self.repository.get_discount_rule_by_id(db, rule_id, business_id=business_id)
        if not rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Discount rule not found"
            )
        self.repository.delete_discount_rule(db, rule)

    # --- Coupons ---
    def create_coupon(
        self, db: Session, data: CouponCreate
    ) -> CouponOut:
        rule = self.repository.get_discount_rule_by_id(db, data.discount_rule_id, business_id=data.business_id)
        if not rule:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Referenced discount rule not found"
            )
        existing = self.repository.get_coupon_by_code(db, data.code, business_id=data.business_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Coupon code already exists"
            )
        coupon = self.repository.create_coupon(db, data)
        return CouponOut.model_validate(coupon)

    def get_coupons(
        self, db: Session, business_id: int = 1
    ) -> list[CouponOut]:
        coupons = self.repository.get_coupons(db, business_id=business_id)
        return [CouponOut.model_validate(c) for c in coupons]

    def update_coupon(
        self, db: Session, coupon_id: uuid.UUID, data: CouponUpdate, business_id: int = 1
    ) -> CouponOut:
        coupon = self.repository.get_coupon_by_id(db, coupon_id, business_id=business_id)
        if not coupon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found"
            )
        if data.discount_rule_id:
            rule = self.repository.get_discount_rule_by_id(db, data.discount_rule_id, business_id=business_id)
            if not rule:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail="Referenced discount rule not found"
                )
        updated = self.repository.update_coupon(db, coupon, data)
        return CouponOut.model_validate(updated)

    def delete_coupon(
        self, db: Session, coupon_id: uuid.UUID, business_id: int = 1
    ) -> None:
        coupon = self.repository.get_coupon_by_id(db, coupon_id, business_id=business_id)
        if not coupon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found"
            )
        self.repository.delete_coupon(db, coupon)

    def validate_coupon(
        self, db: Session, req: CouponValidateRequest
    ) -> CouponValidateResponse:
        coupon = self.repository.get_coupon_by_code(db, req.code, business_id=req.business_id)
        if not coupon or not coupon.is_active:
            return CouponValidateResponse(
                is_valid=False,
                message="Invalid or inactive coupon code"
            )

        now = datetime.now(timezone.utc)
        if coupon.valid_from and coupon.valid_from.tzinfo is None:
            c_valid_from = coupon.valid_from.replace(tzinfo=timezone.utc)
        else:
            c_valid_from = coupon.valid_from

        if coupon.valid_to and coupon.valid_to.tzinfo is None:
            c_valid_to = coupon.valid_to.replace(tzinfo=timezone.utc)
        else:
            c_valid_to = coupon.valid_to

        if c_valid_from and now < c_valid_from:
            return CouponValidateResponse(
                is_valid=False,
                message="Coupon is not valid yet"
            )

        if c_valid_to and now > c_valid_to:
            return CouponValidateResponse(
                is_valid=False,
                message="Coupon has expired"
            )

        if coupon.max_uses is not None and coupon.used_count >= coupon.max_uses:
            return CouponValidateResponse(
                is_valid=False,
                message="Coupon usage limit reached"
            )

        rule = coupon.discount_rule
        if not rule or not rule.is_active:
            return CouponValidateResponse(
                is_valid=False,
                message="Associated discount rule is inactive"
            )

        if float(rule.min_order_amount) > req.cart_amount:
            return CouponValidateResponse(
                is_valid=False,
                message=f"Minimum order amount for this coupon is {float(rule.min_order_amount):.2f}"
            )

        # Compute discount amount
        discount_amount = 0.0
        if rule.discount_type == "percentage":
            discount_amount = round(req.cart_amount * (float(rule.discount_value) / 100.0), 2)
        elif rule.discount_type == "fixed":
            discount_amount = min(req.cart_amount, float(rule.discount_value))
        elif rule.discount_type == "buy_x_get_y":
            discount_amount = float(rule.discount_value)

        return CouponValidateResponse(
            is_valid=True,
            message="Coupon applied successfully",
            coupon=CouponOut.model_validate(coupon),
            discount_amount=discount_amount,
        )

    def calculate_cart(
        self, db: Session, req: CartCalculationRequest
    ) -> CartCalculationResponse:
        subtotal = sum(item.unit_price * item.quantity for item in req.items)
        discount_amount = 0.0
        applied_rule = None
        applied_coupon_code = None

        if req.coupon_code:
            val_res = self.validate_coupon(
                db, CouponValidateRequest(business_id=req.business_id, code=req.coupon_code, cart_amount=subtotal)
            )
            if val_res.is_valid and val_res.coupon:
                discount_amount = val_res.discount_amount
                applied_rule = val_res.coupon.discount_rule
                applied_coupon_code = req.coupon_code

        if not applied_rule:
            # Check for best active automatic discount rule matching min_order_amount
            rules = self.repository.get_discount_rules(db, business_id=req.business_id)
            best_discount = 0.0
            best_rule = None
            for r in rules:
                if r.is_active and float(r.min_order_amount) <= subtotal:
                    cur_discount = 0.0
                    if r.discount_type == "percentage":
                        cur_discount = round(subtotal * (float(r.discount_value) / 100.0), 2)
                    elif r.discount_type == "fixed":
                        cur_discount = min(subtotal, float(r.discount_value))
                    elif r.discount_type == "buy_x_get_y":
                        # Buy X Get Y calculation based on items quantity
                        total_qty = sum(item.quantity for item in req.items)
                        buy_x = r.buy_x_qty or 1
                        get_y = r.get_y_qty or 1
                        free_groups = total_qty // (buy_x + get_y)
                        cur_discount = min(subtotal, free_groups * float(r.discount_value))

                    if cur_discount > best_discount:
                        best_discount = cur_discount
                        best_rule = r

            if best_rule:
                discount_amount = best_discount
                applied_rule = DiscountRuleOut.model_validate(best_rule)

        taxable_amount = max(0.0, subtotal - discount_amount)
        tax_amount = 0.0
        if req.region:
            tax_res = self.calculate_tax(
                db, TaxCalculationRequest(business_id=req.business_id, region=req.region, category_id=req.category_id, amount=taxable_amount)
            )
            tax_amount = tax_res.tax_amount

        total = round(taxable_amount + tax_amount, 2)

        return CartCalculationResponse(
            subtotal=subtotal,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            total=total,
            applied_discount_rule=applied_rule,
            coupon_code=applied_coupon_code,
        )
