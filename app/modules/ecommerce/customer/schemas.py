from decimal import Decimal
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CustomerBase(BaseModel):
    first_name: str = Field(..., max_length=100)
    last_name: str | None = Field(None, max_length=100)
    email: str | None = Field(None, max_length=255)
    phone: str = Field(..., max_length=50)
    address: str | None = Field(None)
    is_active: bool = True
    business_id: int | None = None
    loyalty_points: int = 0
    store_credit: Decimal = Decimal("0.00")
    membership_tier: str = "Regular"


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)
    email: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=50)
    address: str | None = None
    is_active: bool | None = None
    business_id: int | None = None
    loyalty_points: int | None = None
    store_credit: Decimal | None = None
    membership_tier: str | None = None


class CustomerOut(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    full_name: str
