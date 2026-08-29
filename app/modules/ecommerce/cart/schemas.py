import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field


class CartItemBase(BaseModel):
    variant_id: uuid.UUID
    quantity: int = Field(1, gt=0)


class CartItemCreate(CartItemBase):
    pass


class CartItemUpdate(BaseModel):
    quantity: int = Field(..., gt=0)


class CartItemOut(CartItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    cart_id: uuid.UUID
    price_snapshot: float
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def subtotal(self) -> float:
        return round(self.price_snapshot * self.quantity, 2)


class CartCreate(BaseModel):
    business_id: int = Field(1)
    user_id: uuid.UUID | None = None
    session_id: str | None = Field(None, max_length=255)


class CartOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    user_id: uuid.UUID | None = None
    session_id: str | None = None
    status: str
    items: list[CartItemOut] = []
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def total_amount(self) -> float:
        return round(sum(item.subtotal for item in self.items), 2)


class CartMergeRequest(BaseModel):
    guest_session_id: str
    user_id: uuid.UUID
    business_id: int = Field(1)
