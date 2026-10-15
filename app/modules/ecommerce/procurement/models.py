import enum
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
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
from app.common.models import SyncMixin, TimestampMixin, UUIDMixin
from app.database import Base


class PurchaseOrderStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    CONFIRMED = "confirmed"
    PARTIALLY_RECEIVED = "partially_received"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class Supplier(Base, UUIDMixin, TimestampMixin, SyncMixin):
    """
    Vendor or wholesaler profile from whom goods and raw materials are purchased.
    """
    __tablename__ = "procurement_suppliers"
    __table_args__ = (
        UniqueConstraint("business_id", "code", name="uq_suppliers_business_code"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "SUP-001"
    contact_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), default="Bangladesh", nullable=True)
    tax_id: Mapped[str | None] = mapped_column(String(100), nullable=True)  # TIN / BIN / VAT ID
    payment_terms: Mapped[str | None] = mapped_column(String(50), default="Net 30", nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    purchase_orders: Mapped[list["PurchaseOrder"]] = relationship(
        "PurchaseOrder", back_populates="supplier", cascade="all, delete-orphan", lazy="selectin"
    )


class PurchaseOrder(Base, UUIDMixin, TimestampMixin, SyncMixin):
    """
    Purchase Order (PO) issued to a supplier for incoming inventory.
    """
    __tablename__ = "procurement_purchase_orders"
    __table_args__ = (
        UniqueConstraint("business_id", "po_number", name="uq_purchase_orders_business_number"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    po_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # e.g., "PO-2026-0001"
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("procurement_suppliers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    destination_warehouse_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("warehouses.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[PurchaseOrderStatus] = mapped_column(
        pg_enum(PurchaseOrderStatus, name="purchase_order_status"),
        default=PurchaseOrderStatus.DRAFT,
        nullable=False,
    )
    order_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    expected_delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    subtotal_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    shipping_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    supplier: Mapped["Supplier"] = relationship("Supplier", back_populates="purchase_orders", lazy="selectin")
    destination_warehouse: Mapped["Warehouse"] = relationship("Warehouse", lazy="selectin")  # noqa: F821
    items: Mapped[list["PurchaseOrderItem"]] = relationship(
        "PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan", lazy="selectin"
    )
    receipts: Mapped[list["GoodsReceivedNote"]] = relationship(
        "GoodsReceivedNote", back_populates="purchase_order", cascade="all, delete-orphan", lazy="selectin"
    )


class PurchaseOrderItem(Base, UUIDMixin, TimestampMixin):
    """
    Individual line item in a Purchase Order.
    """
    __tablename__ = "procurement_po_items"
    __table_args__ = (
        CheckConstraint("quantity_ordered > 0", name="ck_po_items_qty_ordered_positive"),
        CheckConstraint("quantity_received >= 0", name="ck_po_items_qty_received_non_negative"),
    )

    purchase_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("procurement_purchase_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("items.id", ondelete="SET NULL"),
        nullable=True,
    )
    quantity_ordered: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_received: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Relationships
    purchase_order: Mapped["PurchaseOrder"] = relationship("PurchaseOrder", back_populates="items")
    variant: Mapped["ProductVariant"] = relationship("ProductVariant", lazy="selectin")  # noqa: F821
    item: Mapped["Item | None"] = relationship("Item", lazy="selectin")  # noqa: F821


class GoodsReceivedNote(Base, UUIDMixin, TimestampMixin):
    """
    Goods Received Note (GRN) created when physical stock arrives at warehouse.
    Directly triggers StockMovement(RECEIPT) and FIFO CostLayer.
    """
    __tablename__ = "procurement_grn"
    __table_args__ = (
        UniqueConstraint("business_id", "grn_number", name="uq_grn_business_number"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    grn_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # e.g., "GRN-2026-0001"
    purchase_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("procurement_purchase_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    received_by_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    supplier_invoice_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    purchase_order: Mapped["PurchaseOrder"] = relationship("PurchaseOrder", back_populates="receipts")
    received_by: Mapped["User | None"] = relationship("User", lazy="selectin")  # noqa: F821
    items: Mapped[list["GoodsReceivedNoteItem"]] = relationship(
        "GoodsReceivedNoteItem", back_populates="grn", cascade="all, delete-orphan", lazy="selectin"
    )


class GoodsReceivedNoteItem(Base, UUIDMixin, TimestampMixin):
    """
    Line item inside a GRN recording received quantity, lot, and expiry.
    """
    __tablename__ = "procurement_grn_items"

    grn_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("procurement_grn.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    po_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("procurement_po_items.id", ondelete="CASCADE"),
        nullable=False,
    )
    variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity_received: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    lot_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    grn: Mapped["GoodsReceivedNote"] = relationship("GoodsReceivedNote", back_populates="items")
    variant: Mapped["ProductVariant"] = relationship("ProductVariant", lazy="selectin")  # noqa: F821
    po_item: Mapped["PurchaseOrderItem"] = relationship("PurchaseOrderItem", lazy="selectin")
