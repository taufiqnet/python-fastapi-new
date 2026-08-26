import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Text
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
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    inventory_items: Mapped[list["InventoryItem"]] = relationship(
        "InventoryItem",
        back_populates="warehouse",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class InventoryItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "inventory_items"

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


class StockMovement(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "stock_movements"

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

    # Relationships
    inventory_item: Mapped["InventoryItem"] = relationship(
        "InventoryItem", back_populates="stock_movements"
    )
