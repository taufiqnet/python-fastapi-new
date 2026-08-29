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
