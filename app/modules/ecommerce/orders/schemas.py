import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.modules.ecommerce.orders.models import OrderFulfillmentStatus, OrderPaymentStatus


class OrderItemCreate(BaseModel):
    variant_id: uuid.UUID
    quantity: int = Field(..., gt=0)


class OrderAddressCreate(BaseModel):
    address_type: str = Field("shipping", max_length=50)
    recipient_name: str = Field(..., max_length=255)
    phone: str | None = Field(None, max_length=50)
    street: str = Field(..., max_length=255)
    city: str = Field(..., max_length=100)
    state: str | None = Field(None, max_length=100)
    zip_code: str | None = Field(None, max_length=20)
    country: str = Field(..., max_length=100)


class OrderCreate(BaseModel):
    business_id: int = Field(1)
    user_id: uuid.UUID
    items: list[OrderItemCreate] = Field(..., min_length=1)
    shipping_address: OrderAddressCreate
    billing_address: OrderAddressCreate | None = None
    currency: str = Field("USD", max_length=3)


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    variant_id: uuid.UUID
    seller_id: uuid.UUID | None = None
    quantity: int
    unit_price: float
    subtotal: float


class OrderAddressOut(OrderAddressCreate):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID


class OrderStatusHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status_type: str
    status_value: str
    note: str | None = None
    created_at: datetime


class OrderStatusUpdate(BaseModel):
    payment_status: OrderPaymentStatus | None = None
    fulfillment_status: OrderFulfillmentStatus | None = None
    note: str | None = None


class OrderSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    user_id: uuid.UUID | None = None
    payment_status: OrderPaymentStatus
    fulfillment_status: OrderFulfillmentStatus
    total_amount: float
    currency: str
    created_at: datetime


class OrderDetail(OrderSummary):
    items: list[OrderItemOut] = []
    addresses: list[OrderAddressOut] = []
    status_history: list[OrderStatusHistoryOut] = []
