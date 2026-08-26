import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    JSON,
    Column,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID

from app.common.enums import Status
from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base

# Many-to-Many association table between Product and ProductTag
product_tags = Table(
    "product_tags_association",
    Base.metadata,
    Column(
        "product_id",
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tag_id",
        UUID(as_uuid=True),
        ForeignKey("product_tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Product(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "products"

    seller_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    brand: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[Status] = mapped_column(
        Enum(Status),
        default=Status.DRAFT,
        nullable=False,
    )

    # Relationships
    category: Mapped["Category | None"] = relationship(  # noqa: F821
        "Category",
        back_populates="products",
    )
    variants: Mapped[list["ProductVariant"]] = relationship(
        "ProductVariant",
        back_populates="product",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    images: Mapped[list["ProductImage"]] = relationship(
        "ProductImage",
        back_populates="product",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    attributes: Mapped[list["ProductAttribute"]] = relationship(
        "ProductAttribute",
        back_populates="product",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    tags: Mapped[list["ProductTag"]] = relationship(
        "ProductTag",
        secondary=product_tags,
        back_populates="products",
        lazy="selectin",
    )


class ProductVariant(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "product_variants"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    sku: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )
    attributes: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    stock_qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    product: Mapped["Product"] = relationship(
        "Product",
        back_populates="variants",
    )
    images: Mapped[list["ProductImage"]] = relationship(
        "ProductImage",
        back_populates="variant",
        lazy="selectin",
    )


class ProductImage(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "product_images"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    variant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="SET NULL"),
        nullable=True,
    )
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    alt_text: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    product: Mapped["Product"] = relationship(
        "Product",
        back_populates="images",
    )
    variant: Mapped["ProductVariant | None"] = relationship(
        "ProductVariant",
        back_populates="images",
    )


class ProductAttribute(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "product_attributes"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    # Relationships
    product: Mapped["Product"] = relationship(
        "Product",
        back_populates="attributes",
    )
    values: Mapped[list["AttributeValue"]] = relationship(
        "AttributeValue",
        back_populates="attribute",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class AttributeValue(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "attribute_values"

    attribute_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_attributes.id", ondelete="CASCADE"),
        nullable=False,
    )
    value: Mapped[str] = mapped_column(String(255), nullable=False)

    # Relationships
    attribute: Mapped["ProductAttribute"] = relationship(
        "ProductAttribute",
        back_populates="values",
    )


class ProductTag(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "product_tags"

    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    # Relationships
    products: Mapped[list["Product"]] = relationship(
        "Product",
        secondary=product_tags,
        back_populates="tags",
        lazy="selectin",
    )
