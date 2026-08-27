import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


class ShipmentStatus(str, enum.Enum):
    PENDING = "pending"
    LABEL_CREATED = "label_created"
    SHIPPED = "shipped"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    FAILED = "failed"


class Shipment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "shipments"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        default=1,
        nullable=False,
        index=True,
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    carrier: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # DHL, FedEx, etc.
    tracking_number: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True
    )
    status: Mapped[ShipmentStatus] = mapped_column(
        Enum(ShipmentStatus), default=ShipmentStatus.PENDING, nullable=False
    )
    shipped_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class ShippingZone(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "shipping_zones"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        default=1,
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    region: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # Country or state code

    rates: Mapped[list["ShippingRate"]] = relationship(
        "ShippingRate",
        back_populates="zone",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class ShippingRate(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "shipping_rates"

    zone_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shipping_zones.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    min_weight: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), default=Decimal("0.000"), nullable=False
    )
    max_weight: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), default=Decimal("999.999"), nullable=False
    )
    base_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    zone: Mapped["ShippingZone"] = relationship("ShippingZone", back_populates="rates")
