import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
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

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


class StockMovementReason(str, enum.Enum):
    RESTOCK = "restock"
    ORDER = "order"
    RETURN = "return"
    ADJUSTMENT = "adjustment"
    DAMAGED = "damaged"
    TRANSFER = "transfer"


class ReservationStatus(str, enum.Enum):
    ACTIVE = "active"
    COMMITTED = "committed"  # order confirmed/paid — stock permanently deducted
    RELEASED = "released"    # expired or cart/order cancelled — stock returned
    EXPIRED = "expired"


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
    address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)  # ISO 3166-1 alpha-2
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
        UniqueConstraint("variant_id", "warehouse_id", name="uq_inventory_variant_warehouse"),
        CheckConstraint("quantity_on_hand >= 0", name="ck_inventory_qoh_non_negative"),
        CheckConstraint("quantity_reserved >= 0", name="ck_inventory_reserved_non_negative"),
    )

    variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="CASCADE"),
        nullable=False,
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
    variant: Mapped["ProductVariant"] = relationship(  # noqa: F821
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
    order_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[ReservationStatus] = mapped_column(
        Enum(ReservationStatus), default=ReservationStatus.ACTIVE, nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationships
    inventory_item: Mapped["InventoryItem"] = relationship(
        "InventoryItem", back_populates="reservations"
    )


class StockMovement(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "stock_movements"
    __table_args__ = (
        CheckConstraint(
            "(reason = 'restock' AND delta > 0) OR "
            "(reason = 'damaged' AND delta < 0) OR "
            "(reason NOT IN ('restock', 'damaged'))",
            name="ck_stock_movement_delta_sign",
        ),
        Index("ix_stock_movements_reference_id", "reference_id"),
        UniqueConstraint("idempotency_key", name="uq_stock_movement_idempotency_key"),
    )

    inventory_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("inventory_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    delta: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[StockMovementReason] = mapped_column(
        Enum(StockMovementReason), nullable=False
    )
    reference_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Who/what performed this movement — staff user, seller, or automated
    # system/webhook. Nullable because system-originated movements have no
    # human actor.
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    actor_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # "user" | "system" | "webhook"

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
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    inventory_item: Mapped["InventoryItem"] = relationship(
        "InventoryItem", back_populates="stock_movements"
    )
