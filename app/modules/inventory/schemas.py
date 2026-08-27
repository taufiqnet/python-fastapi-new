import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.modules.inventory.models import ReservationStatus, StockMovementReason


# --- Warehouse Schemas ---
class WarehouseBase(BaseModel):
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=50)
    address_line1: str | None = Field(None, max_length=255)
    address_line2: str | None = Field(None, max_length=255)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=100)
    postal_code: str | None = Field(None, max_length=20)
    country: str | None = Field(None, max_length=2)
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    region: str | None = Field(None, max_length=100)
    is_active: bool = True
    is_default: bool = False
    business_id: int | None = None


class WarehouseCreate(WarehouseBase):
    # Support backward-compatible 'address' field on input
    address: str | None = Field(None, max_length=255)

    @model_validator(mode="after")
    def sync_address_fields(self):
        if self.address is not None and self.address_line1 is None:
            self.address_line1 = self.address
        elif self.address_line1 is not None and self.address is None:
            self.address = self.address_line1
        return self


class WarehouseUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    code: str | None = Field(None, max_length=50)
    address: str | None = Field(None, max_length=255)
    address_line1: str | None = Field(None, max_length=255)
    address_line2: str | None = Field(None, max_length=255)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=100)
    postal_code: str | None = Field(None, max_length=20)
    country: str | None = Field(None, max_length=2)
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    region: str | None = Field(None, max_length=100)
    is_active: bool | None = None
    is_default: bool | None = None
    business_id: int | None = None

    @model_validator(mode="after")
    def sync_address_fields(self):
        if self.address is not None and self.address_line1 is None:
            self.address_line1 = self.address
        elif self.address_line1 is not None and self.address is None:
            self.address = self.address_line1
        return self


class WarehouseOut(WarehouseBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    address: str | None = None
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="after")
    def populate_address(self):
        if self.address is None:
            self.address = self.address_line1
        return self


# --- Inventory Item Schemas ---
class InventoryItemBase(BaseModel):
    variant_id: uuid.UUID
    warehouse_id: uuid.UUID
    quantity_on_hand: int = Field(0, ge=0)
    quantity_reserved: int = Field(0, ge=0)
    quantity_incoming: int = Field(0, ge=0)
    reorder_point: int | None = Field(None, ge=0)
    reorder_quantity: int | None = Field(None, ge=0)
    aisle: str | None = Field(None, max_length=50)
    bin_code: str | None = Field(None, max_length=50)


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(BaseModel):
    quantity_on_hand: int | None = Field(None, ge=0)
    quantity_reserved: int | None = Field(None, ge=0)
    quantity_incoming: int | None = Field(None, ge=0)
    reorder_point: int | None = Field(None, ge=0)
    reorder_quantity: int | None = Field(None, ge=0)
    aisle: str | None = Field(None, max_length=50)
    bin_code: str | None = Field(None, max_length=50)


class InventoryOut(InventoryItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    version_id: int
    quantity_available: int = 0
    created_at: datetime
    updated_at: datetime


# --- Stock Reservation Schemas ---
class StockReservationBase(BaseModel):
    inventory_item_id: uuid.UUID
    cart_id: uuid.UUID | None = None
    order_id: uuid.UUID | None = None
    quantity: int = Field(..., gt=0)
    status: ReservationStatus = ReservationStatus.ACTIVE
    expires_at: datetime


class StockReservationCreate(StockReservationBase):
    pass


class StockReservationUpdate(BaseModel):
    status: ReservationStatus | None = None
    expires_at: datetime | None = None


class StockReservationOut(StockReservationBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# --- Stock Movement & Adjustment Schemas ---
class StockAdjustmentRequest(BaseModel):
    inventory_item_id: uuid.UUID
    delta: int
    reason: StockMovementReason
    reference_id: str | None = Field(None, max_length=255)
    notes: str | None = None
    actor_id: uuid.UUID | None = None
    actor_type: str | None = Field(None, max_length=50)
    unit_cost: Decimal | None = Field(None, ge=Decimal("0.00"))
    idempotency_key: str | None = Field(None, max_length=255)
    batch_number: str | None = Field(None, max_length=100)
    expiry_date: datetime | None = None


class StockMovementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    inventory_item_id: uuid.UUID
    delta: int
    reason: StockMovementReason
    reference_id: str | None = None
    notes: str | None = None
    actor_id: uuid.UUID | None = None
    actor_type: str | None = None
    unit_cost: Decimal | None = None
    idempotency_key: str | None = None
    batch_number: str | None = None
    expiry_date: datetime | None = None
    created_at: datetime
    updated_at: datetime
