import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID

from app.common.enums import Status, pg_enum
from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base

# NOTE: ProductCondition / ProductType / MediaType are defined here for now.
# If other modules (e.g. returns, disputes) end up needing ProductCondition,
# move these three into app/common/enums.py alongside Status.


class ProductCondition(str, enum.Enum):
    NEW = "new"
    USED = "used"
    REFURBISHED = "refurbished"
    OPEN_BOX = "open_box"


class ProductType(str, enum.Enum):
    PHYSICAL = "physical"
    DIGITAL = "digital"
    SERVICE = "service"


class MediaType(str, enum.Enum):
    IMAGE = "image"
    VIDEO = "video"


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

    business_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    seller_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sellers.id", ondelete="SET NULL"),
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
        pg_enum(Status, name="status"),
        default=Status.DRAFT,
        nullable=False,
    )
    condition: Mapped[ProductCondition] = mapped_column(
        pg_enum(ProductCondition, name="productcondition"),
        default=ProductCondition.NEW,
        nullable=False,
    )
    product_type: Mapped[ProductType] = mapped_column(
        pg_enum(ProductType, name="producttype"),
        default=ProductType.PHYSICAL,
        nullable=False,
    )
    requires_shipping: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )

    # SEO / merchandising
    meta_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    meta_description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Denormalized stats (updated by service layer / triggers, not client-writable)
    average_rating: Mapped[Decimal] = mapped_column(
        Numeric(3, 2), default=Decimal("0.00"), nullable=False
    )
    review_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sold_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
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
        order_by="ProductImage.position",
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
    business_profile: Mapped["BusinessProfile | None"] = relationship(  # noqa: F821
        "BusinessProfile",
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
    barcode: Mapped[str | None] = mapped_column(
        String(64), unique=True, index=True, nullable=True
    )  # UPC / EAN / GTIN
    attributes: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    # Pricing
    price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    compare_at_price: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    cost_price: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )  # internal only — never serialize to public schemas
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)

    # Inventory
    stock_qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    backorder_allowed: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Shipping
    weight: Mapped[Decimal | None] = mapped_column(Numeric(10, 3), nullable=True)
    weight_unit: Mapped[str] = mapped_column(String(10), default="kg", nullable=False)
    length: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    width: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    height: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    dimension_unit: Mapped[str] = mapped_column(
        String(10), default="cm", nullable=False
    )

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

    # NOTE: "only one is_default variant per product" and "only one is_primary
    # image per product" are enforced in the service layer (or via a partial
    # unique index in a migration), not at the ORM level.


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
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    media_type: Mapped[MediaType] = mapped_column(
        pg_enum(MediaType, name="mediatype"), default=MediaType.IMAGE, nullable=False
    )

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

    business_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    # Relationships
    products: Mapped[list["Product"]] = relationship(
        "Product",
        secondary=product_tags,
        back_populates="tags",
        lazy="selectin",
    )
