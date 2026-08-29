import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.modules.ecommerce.payments.models import PaymentStatus


class PaymentIntentCreate(BaseModel):
    business_id: int = Field(1)
    order_id: uuid.UUID
    provider: str = Field(..., max_length=50)
    amount: float = Field(..., gt=0)
    currency: str = Field("USD", max_length=3)


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    order_id: uuid.UUID
    provider: str
    transaction_id: str | None = None
    amount: float
    currency: str
    status: PaymentStatus
    created_at: datetime
    updated_at: datetime


class RefundRequest(BaseModel):
    amount: float = Field(..., gt=0)
    reason: str | None = None


class RefundOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    payment_id: uuid.UUID
    amount: float
    reason: str | None = None
    status: str
    created_at: datetime


class PaymentMethodCreate(BaseModel):
    business_id: int = Field(1)
    user_id: uuid.UUID
    type: str = Field(..., max_length=50)
    token_ref: str = Field(..., max_length=255)
    is_default: bool = False


class PaymentMethodOut(PaymentMethodCreate):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
