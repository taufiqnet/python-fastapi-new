import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.modules.shipping.models import ShipmentStatus


class ShipmentCreate(BaseModel):
    business_id: int = Field(1)
    order_id: uuid.UUID
    carrier: str = Field(..., max_length=100)
    tracking_number: str | None = Field(None, max_length=255)


class ShipmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    order_id: uuid.UUID
    carrier: str
    tracking_number: str | None = None
    status: ShipmentStatus
    shipped_at: datetime | None = None
    delivered_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class TrackingUpdate(BaseModel):
    status: ShipmentStatus
    tracking_number: str | None = None


class ShippingRateCreate(BaseModel):
    min_weight: float = Field(0.0, ge=0)
    max_weight: float = Field(999.999, gt=0)
    base_cost: float = Field(..., ge=0)


class ShippingRateOut(ShippingRateCreate):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    zone_id: uuid.UUID


class ShippingZoneCreate(BaseModel):
    business_id: int = Field(1)
    name: str = Field(..., max_length=100)
    region: str = Field(..., max_length=100)
    rates: list[ShippingRateCreate] = []


class ShippingZoneOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    name: str
    region: str
    rates: list[ShippingRateOut] = []


class ShippingRateQuoteRequest(BaseModel):
    business_id: int = Field(1)
    region: str
    weight: float = Field(..., ge=0)


class ShippingRateQuoteResponse(BaseModel):
    carrier: str = "Standard Shipping"
    base_cost: float
