import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.modules.inventory.models import StockMovementReason


# --- Warehouse Schemas ---
class WarehouseBase(BaseModel):
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=50)
    address: str | None = None
    region: str | None = Field(None, max_length=100)
    is_active: bool = True
    business_id: int | None = None


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    code: str | None = Field(None, max_length=50)
    address: str | None = None
    region: str | None = Field(None, max_length=100)
    is_active: bool | None = None
    business_id: int | None = None


class WarehouseOut(WarehouseBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# --- Stock Movement Schemas ---
class StockMovementBase(BaseModel):
    delta: int
    reason: StockMovementReason
    reference_id: str | None = Field(None, max_length=255)
    notes: str | None = None


class StockMovementOut(StockMovementBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    inventory_item_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class StockAdjustmentRequest(BaseModel):
    inventory_item_id: uuid.UUID
    delta: int
    reason: StockMovementReason = StockMovementReason.ADJUSTMENT
    reference_id: str | None = Field(None, max_length=255)
    notes: str | None = None


# --- Inventory Item Schemas ---
class InventoryItemBase(BaseModel):
    variant_id: uuid.UUID
    warehouse_id: uuid.UUID
    quantity_on_hand: int = Field(0, ge=0)
    quantity_reserved: int = Field(0, ge=0)


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(BaseModel):
    quantity_on_hand: int | None = Field(None, ge=0)
    quantity_reserved: int | None = Field(None, ge=0)


class InventoryOut(InventoryItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    quantity_available: int = 0
    created_at: datetime
    updated_at: datetime


class InventoryDetailOut(InventoryOut):
    warehouse: WarehouseOut
    stock_movements: list[StockMovementOut] = []
