import uuid

from pydantic import BaseModel, ConfigDict, Field


class PricingBase(BaseModel):
    business_id: int = Field(1, description="Business profile ID, default 1")


# --- Price History Schemas ---
class PriceHistoryBase(PricingBase):
    variant_id: uuid.UUID
    old_price: float
    new_price: float
    reason: str | None = Field(None, max_length=255)


class PriceHistoryCreate(PriceHistoryBase):
    pass


class PriceHistoryOut(PriceHistoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


# --- Discount Rule Schemas ---
class DiscountRuleBase(PricingBase):
    name: str = Field(..., max_length=150)
    code: str | None = Field(None, max_length=50)
    discount_type: str = Field("percentage", description="percentage, fixed, or buy_x_get_y")
    discount_value: float = Field(0.0, ge=0)
    buy_x_qty: int | None = Field(None, ge=1)
    get_y_qty: int | None = Field(None, ge=1)
    min_order_amount: float = Field(0.0, ge=0)
    is_active: bool = True


class DiscountRuleCreate(DiscountRuleBase):
    pass


class DiscountRuleUpdate(BaseModel):
    name: str | None = Field(None, max_length=150)
    code: str | None = Field(None, max_length=50)
    discount_type: str | None = None
    discount_value: float | None = Field(None, ge=0)
    buy_x_qty: int | None = Field(None, ge=1)
    get_y_qty: int | None = Field(None, ge=1)
    min_order_amount: float | None = Field(None, ge=0)
    is_active: bool | None = None


class DiscountRuleOut(DiscountRuleBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


# --- Coupon Schemas ---
from datetime import datetime

class CouponBase(PricingBase):
    code: str = Field(..., max_length=50)
    discount_rule_id: uuid.UUID
    max_uses: int | None = Field(None, ge=1)
    valid_from: datetime | None = None
    valid_to: datetime | None = None
    is_active: bool = True


class CouponCreate(CouponBase):
    pass


class CouponUpdate(BaseModel):
    code: str | None = Field(None, max_length=50)
    discount_rule_id: uuid.UUID | None = None
    max_uses: int | None = Field(None, ge=1)
    valid_from: datetime | None = None
    valid_to: datetime | None = None
    is_active: bool | None = None


class CouponOut(CouponBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    used_count: int
    discount_rule: DiscountRuleOut | None = None


class CouponValidateRequest(BaseModel):
    business_id: int = Field(1)
    code: str
    cart_amount: float = Field(0.0, ge=0)


class CouponValidateResponse(BaseModel):
    is_valid: bool
    message: str
    coupon: CouponOut | None = None
    discount_amount: float = 0.0


# --- Cart Calculation Schemas ---
class CartCalculationItem(BaseModel):
    variant_id: uuid.UUID | None = None
    unit_price: float = Field(..., ge=0)
    quantity: int = Field(..., ge=1)


class CartCalculationRequest(BaseModel):
    business_id: int = Field(1)
    items: list[CartCalculationItem]
    coupon_code: str | None = None
    region: str | None = None
    category_id: uuid.UUID | None = None


class CartCalculationResponse(BaseModel):
    subtotal: float
    discount_amount: float
    tax_amount: float
    total: float
    applied_discount_rule: DiscountRuleOut | None = None
    coupon_code: str | None = None


# --- Tax Rule Schemas ---
class TaxRuleBase(PricingBase):
    region: str = Field(..., max_length=100)
    category_id: uuid.UUID | None = None
    tax_percentage: float = Field(..., ge=0, le=100)
    is_active: bool = True


class TaxRuleCreate(TaxRuleBase):
    pass


class TaxRuleUpdate(BaseModel):
    region: str | None = Field(None, max_length=100)
    category_id: uuid.UUID | None = None
    tax_percentage: float | None = Field(None, ge=0, le=100)
    is_active: bool | None = None


class TaxRuleOut(TaxRuleBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


class TaxCalculationRequest(BaseModel):
    business_id: int = Field(1)
    region: str
    category_id: uuid.UUID | None = None
    amount: float = Field(..., ge=0)


class TaxCalculationResponse(BaseModel):
    subtotal: float
    tax_rate: float
    tax_amount: float
    total: float


# --- Currency Rate Schemas ---
class CurrencyRateBase(PricingBase):
    currency_code: str = Field(..., max_length=3)
    rate: float = Field(..., gt=0)


class CurrencyRateCreate(CurrencyRateBase):
    pass


class CurrencyRateUpdate(BaseModel):
    rate: float = Field(..., gt=0)


class CurrencyRateOut(CurrencyRateBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
