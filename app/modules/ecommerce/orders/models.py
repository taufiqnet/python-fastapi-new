import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    JSON,
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


class OrderPaymentStatus(str, enum.Enum):
    UNPAID = "unpaid"
    PAID = "paid"
    PARTIALLY_REFUNDED = "partially_refunded"
    REFUNDED = "refunded"
    FAILED = "failed"


class OrderFulfillmentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    PARTIALLY_SHIPPED = "partially_shipped"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    RETURNED = "returned"
    CANCELLED = "cancelled"


class OrderItemStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURNED = "returned"
    REFUNDED = "refunded"


class OrderStatusType(str, enum.Enum):
    PAYMENT = "payment"
    FULFILLMENT = "fulfillment"


class Order(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "orders"
    __table_args__ = (
        UniqueConstraint("order_number", name="uq_orders_order_number"),
        UniqueConstraint("idempotency_key", name="uq_orders_idempotency_key"),
        CheckConstraint("user_id IS NOT NULL OR guest_email IS NOT NULL",
                         name="ck_orders_user_or_guest"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Human-facing reference (e.g. "ORD-2026-000123"), distinct from the UUID PK.
    order_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    # Guest checkout support — either user_id or guest_email must be set (see CheckConstraint).
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    guest_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Prevents duplicate orders from retried/double-submitted checkout requests.
    idempotency_key: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)

    # Payment and fulfillment are orthogonal — a single OrderStatus can't
    # represent "shipped but partially refunded".
    payment_status: Mapped[OrderPaymentStatus] = mapped_column(
        Enum(OrderPaymentStatus), default=OrderPaymentStatus.UNPAID, nullable=False
    )
    fulfillment_status: Mapped[OrderFulfillmentStatus] = mapped_column(
        Enum(OrderFulfillmentStatus), default=OrderFulfillmentStatus.PENDING, nullable=False
    )

    # Monetary breakdown — required to render an itemized invoice.
    subtotal_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    shipping_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)

    coupon_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    customer_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    status_history: Mapped[list["OrderStatusHistory"]] = relationship(
        "OrderStatusHistory",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    addresses: Mapped[list["OrderAddress"]] = relationship(
        "OrderAddress",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class OrderItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
        CheckConstraint("cancelled_quantity >= 0 AND cancelled_quantity <= quantity",
                         name="ck_order_items_cancelled_qty_bounds"),
        CheckConstraint("refunded_quantity >= 0 AND refunded_quantity <= quantity",
                         name="ck_order_items_refunded_qty_bounds"),
    )

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # RESTRICT, not CASCADE: deleting a variant must never silently delete
    # historical order line items.
    variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    seller_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sellers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Snapshot of product data at time of purchase — order history must
    # never change just because the seller edited or deleted the product.
    product_title: Mapped[str] = mapped_column(String(255), nullable=False)
    product_sku: Mapped[str] = mapped_column(String(100), nullable=False)
    variant_attributes: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    cancelled_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    refunded_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Per-item status — required for multi-vendor orders where one seller
    # ships while another cancels their line of the same order.
    status: Mapped[OrderItemStatus] = mapped_column(
        Enum(OrderItemStatus), default=OrderItemStatus.PENDING, nullable=False
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    order: Mapped["Order"] = relationship("Order", back_populates="items")


class OrderStatusHistory(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "order_status_history"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Tracks changes to either payment_status or fulfillment_status —
    # status_type disambiguates which one status_value refers to.
    status_type: Mapped[OrderStatusType] = mapped_column(Enum(OrderStatusType), nullable=False)
    status_value: Mapped[str] = mapped_column(String(50), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    order: Mapped["Order"] = relationship("Order", back_populates="status_history")


class OrderAddress(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "order_addresses"
    __table_args__ = (
        Index("ix_order_addresses_order_item_id", "order_item_id"),
    )

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Nullable link to a specific line item — supports split shipments
    # (different items in one order going to different addresses). Null
    # means the address applies to the whole order.
    order_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("order_items.id", ondelete="CASCADE"),
        nullable=True,
    )
    address_type: Mapped[str] = mapped_column(
        String(50), default="shipping", nullable=False
    )  # shipping / billing
    recipient_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    street: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    zip_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    country: Mapped[str] = mapped_column(String(100), nullable=False)

    order: Mapped["Order"] = relationship("Order", back_populates="addresses")