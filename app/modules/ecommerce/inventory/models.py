import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID

from app.common.enums import pg_enum
from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


class ItemType(str, enum.Enum):
    STOCK = "stock"
    SERVICE = "service"
    RAW_MATERIAL = "raw_material"
    CONSUMABLE = "consumable"


class TrackingType(str, enum.Enum):
    NONE = "none"
    LOT = "lot"
    SERIAL = "serial"


class StockMovementReason(str, enum.Enum):
    RECEIPT = "receipt"
    SALE = "sale"
    RETURN = "return"
    DAMAGE = "damage"
    THEFT = "theft"
    EXPIRY = "expiry"
    COUNT_CORRECTION = "count_correction"
    TRANSFER_IN = "transfer_in"
    TRANSFER_OUT = "transfer_out"
    PRODUCTION_IN = "production_in"
    PRODUCTION_OUT = "production_out"
    OPENING_BALANCE = "opening_balance"
    # Legacy enum values kept for backward compatibility if referenced
    RESTOCK = "restock"
    ORDER = "order"
    ADJUSTMENT = "adjustment"
    DAMAGED = "damaged"
    TRANSFER = "transfer"


class ReservationStatus(str, enum.Enum):
    ACTIVE = "active"
    COMMITTED = "committed"  # order confirmed/paid — stock permanently deducted
    RELEASED = "released"  # expired or cart/order cancelled — stock returned
    EXPIRED = "expired"


class SerialStatus(str, enum.Enum):
    AVAILABLE = "available"
    RESERVED = "reserved"
    SOLD = "sold"
    DAMAGED = "damaged"
    SCRAPPED = "scrapped"


class CostingMethod(str, enum.Enum):
    FIFO = "FIFO"
    WEIGHTED_AVERAGE = "weighted_average"


class TransferStatus(str, enum.Enum):
    DRAFT = "draft"
    IN_TRANSIT = "in_transit"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class CountStatus(str, enum.Enum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class StockCount(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "stock_counts"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("warehouses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[CountStatus] = mapped_column(
        pg_enum(CountStatus, name="countstatus"),
        default=CountStatus.DRAFT,
        nullable=False,
    )
    scheduled_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    counted_by: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    warehouse: Mapped["Warehouse"] = relationship("Warehouse", lazy="selectin")
    lines: Mapped[list["StockCountLine"]] = relationship(
        "StockCountLine", back_populates="stock_count", cascade="all, delete-orphan", lazy="selectin"
    )


class StockCountLine(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "stock_count_lines"

    count_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("stock_counts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    system_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    counted_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    variance: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    recount_flag: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    stock_count: Mapped["StockCount"] = relationship("StockCount", back_populates="lines")
    item: Mapped["Item"] = relationship("Item", lazy="selectin")


class StockTransfer(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "stock_transfers"
    __table_args__ = (
        UniqueConstraint("business_id", "transfer_number", name="uq_stock_transfers_number"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    transfer_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    source_warehouse_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("warehouses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    destination_warehouse_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("warehouses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[TransferStatus] = mapped_column(
        pg_enum(TransferStatus, name="transferstatus"),
        default=TransferStatus.DRAFT,
        nullable=False,
    )
    shipped_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    received_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    source_warehouse: Mapped["Warehouse"] = relationship("Warehouse", foreign_keys=[source_warehouse_id], lazy="selectin")
    destination_warehouse: Mapped["Warehouse"] = relationship("Warehouse", foreign_keys=[destination_warehouse_id], lazy="selectin")
    lines: Mapped[list["StockTransferLine"]] = relationship(
        "StockTransferLine", back_populates="transfer", cascade="all, delete-orphan", lazy="selectin"
    )


class StockTransferLine(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "stock_transfer_lines"

    transfer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("stock_transfers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    received_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    uom_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("units_of_measure.id", ondelete="SET NULL"),
        nullable=True,
    )
    lot_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    serial_number: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Relationships
    transfer: Mapped["StockTransfer"] = relationship("StockTransfer", back_populates="lines")
    item: Mapped["Item"] = relationship("Item", lazy="selectin")
    uom: Mapped["UnitOfMeasure | None"] = relationship("UnitOfMeasure", lazy="selectin")


class CostLayer(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "cost_layers"
    __table_args__ = (
        CheckConstraint("quantity_remaining >= 0", name="ck_cost_layer_qty_non_negative"),
        CheckConstraint("unit_cost >= 0", name="ck_cost_layer_cost_non_negative"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("warehouses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    quantity_remaining: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    source_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    item: Mapped["Item"] = relationship("Item", lazy="selectin")
    warehouse: Mapped["Warehouse"] = relationship("Warehouse", lazy="selectin")


class StockLot(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "stock_lots"
    __table_args__ = (
        UniqueConstraint(
            "business_id",
            "item_id",
            "warehouse_id",
            "lot_number",
            name="uq_stock_lots_number",
        ),
        CheckConstraint("quantity >= 0", name="ck_stock_lot_quantity_non_negative"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("warehouses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lot_number: Mapped[str] = mapped_column(String(100), nullable=False)
    manufacture_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    expiry_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    item: Mapped["Item"] = relationship("Item", lazy="selectin")
    warehouse: Mapped["Warehouse"] = relationship("Warehouse", lazy="selectin")


class StockSerial(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "stock_serials"
    __table_args__ = (
        UniqueConstraint(
            "business_id", "item_id", "serial_number", name="uq_stock_serials_number"
        ),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    serial_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[SerialStatus] = mapped_column(
        pg_enum(SerialStatus, name="serialstatus"),
        default=SerialStatus.AVAILABLE,
        nullable=False,
    )
    current_warehouse_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("warehouses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    item: Mapped["Item"] = relationship("Item", lazy="selectin")
    warehouse: Mapped["Warehouse | None"] = relationship("Warehouse", lazy="selectin")


class UnitOfMeasure(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "units_of_measure"
    __table_args__ = (
        UniqueConstraint("business_id", "code", name="uq_uom_business_code"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    precision: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class UoMConversion(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "uom_conversions"
    __table_args__ = (
        UniqueConstraint(
            "business_id",
            "item_id",
            "from_uom_id",
            "to_uom_id",
            name="uq_uom_conversions_route",
        ),
        CheckConstraint("factor > 0", name="ck_uom_conversion_factor_positive"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    from_uom_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("units_of_measure.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    to_uom_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("units_of_measure.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    factor: Mapped[Decimal] = mapped_column(
        Numeric(18, 6), nullable=False
    )

    # Relationships
    from_uom: Mapped["UnitOfMeasure"] = relationship(
        "UnitOfMeasure", foreign_keys=[from_uom_id], lazy="selectin"
    )
    to_uom: Mapped["UnitOfMeasure"] = relationship(
        "UnitOfMeasure", foreign_keys=[to_uom_id], lazy="selectin"
    )
    item: Mapped["Item | None"] = relationship("Item", lazy="selectin")


class Item(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "items"
    __table_args__ = (
        UniqueConstraint("business_id", "sku", name="uq_items_business_sku"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sku: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    barcode: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )
    item_type: Mapped[ItemType] = mapped_column(
        pg_enum(ItemType, name="itemtype"),
        default=ItemType.STOCK,
        nullable=False,
    )
    base_uom_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("units_of_measure.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    tracking_type: Mapped[TrackingType] = mapped_column(
        pg_enum(TrackingType, name="trackingtype"),
        default=TrackingType.NONE,
        nullable=False,
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    default_cost: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0.00"),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    base_uom: Mapped["UnitOfMeasure | None"] = relationship(
        "UnitOfMeasure", foreign_keys=[base_uom_id], lazy="selectin"
    )
    category: Mapped["Category | None"] = relationship(  # noqa: F821
        "Category", lazy="selectin"
    )
    variants: Mapped[list["ProductVariant"]] = relationship(  # noqa: F821
        "ProductVariant", back_populates="item", lazy="selectin"
    )
    inventory_items: Mapped[list["InventoryItem"]] = relationship(
        "InventoryItem", back_populates="item", lazy="selectin"
    )


class Warehouse(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "warehouses"

    business_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )

    # Structured address — needed for nearest-warehouse fulfillment routing
    # and accurate shipping-rate calculation.
    address_line1: Mapped[str | None] = mapped_column(String(255), nullable=True)

    @property
    def address(self) -> str | None:
        return self.address_line1

    @address.setter
    def address(self, value: str | None) -> None:
        self.address_line1 = value

    address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    country: Mapped[str | None] = mapped_column(
        String(2), nullable=True
    )  # ISO 3166-1 alpha-2
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    inventory_items: Mapped[list["InventoryItem"]] = relationship(
        "InventoryItem",
        back_populates="warehouse",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class InventoryItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "inventory_items"
    __table_args__ = (
        UniqueConstraint(
            "variant_id", "warehouse_id", name="uq_inventory_variant_warehouse"
        ),
        CheckConstraint("quantity_on_hand >= 0", name="ck_inventory_qoh_non_negative"),
        CheckConstraint(
            "quantity_reserved >= 0", name="ck_inventory_reserved_non_negative"
        ),
    )

    item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    variant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("warehouses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    quantity_on_hand: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    quantity_reserved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    quantity_incoming: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Per-warehouse replenishment thresholds (a variant can be low in one
    # warehouse and fine in another — this can't live on the variant alone).
    reorder_point: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reorder_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Bin/shelf location for pick-and-pack workflows.
    aisle: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bin_code: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Optimistic concurrency control — prevents overselling when two
    # checkouts decrement the same row simultaneously. Increment on every
    # write; use it in the WHERE clause of the update.
    version_id: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    warehouse: Mapped["Warehouse"] = relationship(
        "Warehouse", back_populates="inventory_items"
    )
    item: Mapped["Item | None"] = relationship(
        "Item", back_populates="inventory_items", lazy="selectin"
    )
    variant: Mapped["ProductVariant | None"] = relationship(  # noqa: F821
        "ProductVariant", lazy="selectin"
    )
    stock_movements: Mapped[list["StockMovement"]] = relationship(
        "StockMovement",
        back_populates="inventory_item",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    reservations: Mapped[list["StockReservation"]] = relationship(
        "StockReservation",
        back_populates="inventory_item",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __mapper_args__ = {"version_id_col": version_id}


class StockReservation(Base, UUIDMixin, TimestampMixin):
    """
    Tracks *why* stock is reserved, not just a bare counter. Created when a
    cart proceeds to checkout; committed on successful payment (permanently
    deducts quantity_on_hand) or released on expiry/cancellation (returns
    quantity_reserved). A background job sweeps ACTIVE rows past expires_at.
    """

    __tablename__ = "stock_reservations"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_reservation_quantity_positive"),
        Index("ix_stock_reservations_order_id", "order_id"),
        Index("ix_stock_reservations_cart_id", "cart_id"),
    )

    inventory_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("inventory_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    cart_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    order_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[ReservationStatus] = mapped_column(
        pg_enum(ReservationStatus, name="reservationstatus"),
        default=ReservationStatus.ACTIVE,
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    # Relationships
    inventory_item: Mapped["InventoryItem"] = relationship(
        "InventoryItem", back_populates="reservations"
    )


class StockMovement(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "stock_movements"
    __table_args__ = (
        Index("ix_stock_movements_reference_id", "reference_id"),
        Index("ix_stock_movements_source", "source_type", "source_id"),
        UniqueConstraint("idempotency_key", name="uq_stock_movement_idempotency_key"),
    )

    inventory_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("inventory_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    delta: Mapped[int] = mapped_column(Integer, nullable=False)
    uom_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("units_of_measure.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reason: Mapped[StockMovementReason] = mapped_column(
        pg_enum(StockMovementReason, name="stockmovementreason"),
        nullable=False,
    )
    reference_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_type: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    source_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Who/what performed this movement — staff user, seller, or automated
    # system/webhook. Nullable because system-originated movements have no
    # human actor.
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    actor_type: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # "user" | "system" | "webhook"

    # Cost at the time of this specific movement — required for FIFO /
    # weighted-average inventory valuation and COGS reporting. This is
    # historical and distinct from ProductVariant.cost_price, which reflects
    # only the current cost.
    unit_cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)

    # Prevents double-counting when an upstream event (payment/shipping
    # webhook retry) fires more than once for the same logical movement.
    idempotency_key: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Optional batch/lot tracking — only relevant for perishables,
    # pharma, or cosmetics-style inventory; leave null otherwise.
    batch_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    expiry_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    inventory_item: Mapped["InventoryItem"] = relationship(
        "InventoryItem", back_populates="stock_movements"
    )
    uom: Mapped["UnitOfMeasure | None"] = relationship(
        "UnitOfMeasure", lazy="selectin"
    )
