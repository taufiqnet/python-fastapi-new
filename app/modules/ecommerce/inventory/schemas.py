import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.modules.ecommerce.inventory.models import (
    CostingMethod,
    CountStatus,
    ItemType,
    ReservationStatus,
    SerialStatus,
    StockMovementReason,
    TrackingType,
    TransferStatus,
)


# --- Stock Count & Reorder Schemas ---
class StockCountLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    count_id: uuid.UUID
    item_id: uuid.UUID
    system_quantity: int
    counted_quantity: int | None = None
    variance: int = 0
    recount_flag: bool = False
    created_at: datetime
    updated_at: datetime


class StockCountBase(BaseModel):
    business_id: int
    warehouse_id: uuid.UUID
    scheduled_date: datetime
    counted_by: str | None = Field(None, max_length=255)


class StockCountCreate(StockCountBase):
    item_ids: list[uuid.UUID] = []  # Items to include in the count session


class StockCountLineRecordItem(BaseModel):
    item_id: uuid.UUID
    counted_quantity: int


class StockCountRecordRequest(BaseModel):
    counts: dict[uuid.UUID, int] | None = None  # {item_id: counted_quantity}
    lines: list[StockCountLineRecordItem] | None = None


class StockCountOut(StockCountBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: CountStatus
    created_at: datetime
    updated_at: datetime
    lines: list[StockCountLineOut] = []


class ReorderAlertOut(BaseModel):
    item_id: uuid.UUID
    sku: str
    name: str
    warehouse_id: uuid.UUID
    warehouse_name: str
    quantity_available: int
    reorder_point: int
    reorder_quantity: int
    suggested_order_quantity: int


# --- Stock Transfer Schemas ---
class StockTransferLineBase(BaseModel):
    item_id: uuid.UUID
    quantity: int = Field(..., gt=0)
    uom_id: uuid.UUID | None = None
    lot_number: str | None = Field(None, max_length=100)
    serial_number: str | None = Field(None, max_length=100)


class StockTransferLineCreate(StockTransferLineBase):
    pass


class StockTransferLineOut(StockTransferLineBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    transfer_id: uuid.UUID
    received_quantity: int = 0
    created_at: datetime
    updated_at: datetime


class StockTransferBase(BaseModel):
    business_id: int
    transfer_number: str = Field(..., max_length=100)
    source_warehouse_id: uuid.UUID
    destination_warehouse_id: uuid.UUID
    notes: str | None = None


class StockTransferCreate(StockTransferBase):
    lines: list[StockTransferLineCreate] = []


class StockTransferReceiveRequest(BaseModel):
    line_receipts: dict[uuid.UUID, int] | None = None  # {line_id: quantity_received}


class StockTransferOut(StockTransferBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: TransferStatus
    shipped_at: datetime | None = None
    received_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    lines: list[StockTransferLineOut] = []


# --- Valuation Schemas ---
class ItemValuationOut(BaseModel):
    item_id: uuid.UUID
    sku: str
    name: str
    warehouse_id: uuid.UUID | None = None
    total_quantity: int
    unit_cost: Decimal
    total_value: Decimal


class InventoryValuationReportOut(BaseModel):
    business_id: int
    as_of: datetime
    costing_method: CostingMethod
    total_valuation: Decimal
    items: list[ItemValuationOut] = []


# --- Lot & Serial Schemas ---
class StockLotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    item_id: uuid.UUID
    warehouse_id: uuid.UUID
    lot_number: str
    manufacture_date: datetime | None = None
    expiry_date: datetime | None = None
    quantity: int
    created_at: datetime
    updated_at: datetime


class StockSerialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    item_id: uuid.UUID
    serial_number: str
    status: SerialStatus
    current_warehouse_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


# --- Unit of Measure & Conversion Schemas ---
class UoMBase(BaseModel):
    business_id: int
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=100)
    precision: int = Field(0, ge=0)


class UoMCreate(UoMBase):
    pass


class UoMUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    precision: int | None = Field(None, ge=0)


class UoMOut(UoMBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class UoMConversionBase(BaseModel):
    business_id: int
    item_id: uuid.UUID | None = None
    from_uom_id: uuid.UUID
    to_uom_id: uuid.UUID
    factor: Decimal = Field(..., gt=Decimal("0"))


class UoMConversionCreate(UoMConversionBase):
    pass


class UoMConversionUpdate(BaseModel):
    factor: Decimal = Field(..., gt=Decimal("0"))


class UoMConversionOut(UoMConversionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class UoMConvertRequest(BaseModel):
    business_id: int
    item_id: uuid.UUID | None = None
    from_uom_id: uuid.UUID
    to_uom_id: uuid.UUID
    quantity: Decimal


class UoMConvertResponse(BaseModel):
    from_uom_id: uuid.UUID
    to_uom_id: uuid.UUID
    original_quantity: Decimal
    converted_quantity: Decimal
    conversion_factor: Decimal


# --- Item Master Schemas ---
class ItemBase(BaseModel):
    business_id: int
    sku: str = Field(..., max_length=100)
    name: str = Field(..., max_length=255)
    barcode: str | None = Field(None, max_length=64)
    item_type: ItemType = ItemType.STOCK
    base_uom_id: uuid.UUID | None = None
    tracking_type: TrackingType = TrackingType.NONE
    category_id: uuid.UUID | None = None
    default_cost: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"))
    is_active: bool = True


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    barcode: str | None = Field(None, max_length=64)
    item_type: ItemType | None = None
    base_uom_id: uuid.UUID | None = None
    tracking_type: TrackingType | None = None
    category_id: uuid.UUID | None = None
    default_cost: Decimal | None = Field(None, ge=Decimal("0.00"))
    is_active: bool | None = None


class ItemOut(ItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


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
    item_id: uuid.UUID | None = None
    variant_id: uuid.UUID | None = None
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

    @model_validator(mode="after")
    def compute_quantity_available(self):
        self.quantity_available = max(0, self.quantity_on_hand - self.quantity_reserved)
        return self


class StockAvailabilityOut(BaseModel):
    business_id: int | None = None
    item_id: uuid.UUID | None = None
    variant_id: uuid.UUID | None = None
    warehouse_id: uuid.UUID | None = None
    quantity_on_hand: int = 0
    quantity_reserved: int = 0
    quantity_incoming: int = 0
    quantity_available: int = 0


class VariantStockAggregationOut(BaseModel):
    variant_id: uuid.UUID
    total_on_hand: int = 0
    total_reserved: int = 0
    total_incoming: int = 0
    total_available: int = 0
    warehouses: list[InventoryOut] = []


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
    uom_id: uuid.UUID | None = None
    reason: StockMovementReason
    reference_id: str | None = Field(None, max_length=255)
    source_type: str | None = Field(None, max_length=50)
    source_id: str | None = Field(None, max_length=255)
    notes: str | None = None
    actor_id: uuid.UUID | None = None
    actor_type: str | None = Field(None, max_length=50)
    unit_cost: Decimal | None = Field(None, ge=Decimal("0.00"))
    idempotency_key: str | None = Field(None, max_length=255)
    batch_number: str | None = Field(None, max_length=100)
    expiry_date: datetime | None = None
    serial_number: str | None = Field(None, max_length=100)


class StockMovementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    inventory_item_id: uuid.UUID
    delta: int
    uom_id: uuid.UUID | None = None
    reason: StockMovementReason
    reference_id: str | None = None
    source_type: str | None = None
    source_id: str | None = None
    notes: str | None = None
    actor_id: uuid.UUID | None = None
    actor_type: str | None = None
    unit_cost: Decimal | None = None
    idempotency_key: str | None = None
    batch_number: str | None = None
    expiry_date: datetime | None = None
    created_at: datetime
    updated_at: datetime
