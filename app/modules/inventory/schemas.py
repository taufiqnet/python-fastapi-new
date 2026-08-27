import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator, model_validator

from app.common.enums import Status
from app.modules.products.models import (
    MediaType,
    ProductCondition,
    ProductType,
)

SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"


# --- Image Schemas ---
class ProductImageBase(BaseModel):
    url: str = Field(..., max_length=500)
    position: int = 0
    alt_text: str | None = Field(None, max_length=255)
    is_primary: bool = False
    media_type: MediaType = MediaType.IMAGE
    variant_id: uuid.UUID | None = None


class ProductImageCreate(ProductImageBase):
    pass


class ProductImageUpdate(BaseModel):
    url: str | None = Field(None, max_length=500)
    position: int | None = None
    alt_text: str | None = Field(None, max_length=255)
    is_primary: bool | None = None
    media_type: MediaType | None = None
    variant_id: uuid.UUID | None = None


class ProductImageOut(ProductImageBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# --- Variant Schemas ---
class VariantBase(BaseModel):
    sku: str = Field(..., max_length=100)
    barcode: str | None = Field(None, max_length=64)
    attributes: dict[str, Any] | None = None

    # Pricing
    price: Decimal = Field(gt=Decimal("0.00"))
    compare_at_price: Decimal | None = Field(None, gt=Decimal("0.00"))
    currency: str = Field("USD", max_length=3)

    # Inventory
    stock_qty: int = Field(0, ge=0)
    low_stock_threshold: int = Field(5, ge=0)
    backorder_allowed: bool = False
    is_default: bool = False

    # Shipping
    weight: Decimal | None = Field(None, ge=Decimal("0.000"))
    weight_unit: str = Field("kg", max_length=10)
    length: Decimal | None = Field(None, ge=Decimal("0.00"))
    width: Decimal | None = Field(None, ge=Decimal("0.00"))
    height: Decimal | None = Field(None, ge=Decimal("0.00"))
    dimension_unit: str = Field("cm", max_length=10)

    @field_validator("compare_at_price")
    @classmethod
    def compare_at_price_must_exceed_price(cls, v: Decimal | None, info):
        price = info.data.get("price")
        if v is not None and price is not None and v <= price:
            raise ValueError("compare_at_price must be greater than price")
        return v


class VariantCreate(VariantBase):
    # Internal-only on input — accepted from sellers/admins but never echoed
    # back by VariantOut (only VariantAdminOut exposes it).
    cost_price: Decimal | None = Field(None, ge=Decimal("0.00"))


class VariantUpdate(BaseModel):
    sku: str | None = Field(None, max_length=100)
    barcode: str | None = Field(None, max_length=64)
    attributes: dict[str, Any] | None = None
    price: Decimal | None = Field(None, gt=Decimal("0.00"))
    compare_at_price: Decimal | None = Field(None, gt=Decimal("0.00"))
    cost_price: Decimal | None = Field(None, ge=Decimal("0.00"))
    currency: str | None = Field(None, max_length=3)
    stock_qty: int | None = Field(None, ge=0)
    low_stock_threshold: int | None = Field(None, ge=0)
    backorder_allowed: bool | None = None
    is_default: bool | None = None
    weight: Decimal | None = Field(None, ge=Decimal("0.000"))
    weight_unit: str | None = Field(None, max_length=10)
    length: Decimal | None = Field(None, ge=Decimal("0.00"))
    width: Decimal | None = Field(None, ge=Decimal("0.00"))
    height: Decimal | None = Field(None, ge=Decimal("0.00"))
    dimension_unit: str | None = Field(None, max_length=10)


class VariantOut(VariantBase):
    """Public-facing variant. cost_price is intentionally omitted."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    images: list[ProductImageOut] = []

    @computed_field
    @property
    def is_in_stock(self) -> bool:
        return self.stock_qty > 0 or self.backorder_allowed


class VariantAdminOut(VariantOut):
    """Internal/seller-dashboard view — includes cost_price for margin reporting."""

    cost_price: Decimal | None = None


# --- Attribute Value & Attribute Schemas ---
class AttributeValueBase(BaseModel):
    value: str = Field(..., max_length=255)


class AttributeValueCreate(AttributeValueBase):
    pass


class AttributeValueOut(AttributeValueBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    attribute_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ProductAttributeBase(BaseModel):
    name: str = Field(..., max_length=100)


class ProductAttributeCreate(ProductAttributeBase):
    values: list[AttributeValueCreate] = []


class ProductAttributeOut(ProductAttributeBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    values: list[AttributeValueOut] = []


# --- Product Tag Schemas ---
class ProductTagBase(BaseModel):
    name: str = Field(..., max_length=50)
    slug: str = Field(..., max_length=50, pattern=SLUG_PATTERN)
    business_id: int | None = None


class ProductTagCreate(ProductTagBase):
    pass


class ProductTagOut(ProductTagBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# --- Product Schemas ---
class ProductBase(BaseModel):
    title: str = Field(..., max_length=255)
    slug: str = Field(..., max_length=255, pattern=SLUG_PATTERN)
    description: str | None = None
    brand: str | None = Field(None, max_length=100)
    status: Status = Status.DRAFT
    condition: ProductCondition = ProductCondition.NEW
    product_type: ProductType = ProductType.PHYSICAL
    requires_shipping: bool = True

    # SEO / merchandising
    meta_title: str | None = Field(None, max_length=255)
    meta_description: str | None = Field(None, max_length=500)
    video_url: str | None = Field(None, max_length=500)
    is_featured: bool = False

    category_id: uuid.UUID | None = None
    seller_id: uuid.UUID | None = None
    business_id: int | None = None


class ProductCreate(ProductBase):
    variants: list[VariantCreate] = Field(..., min_length=1)
    images: list[ProductImageCreate] = []
    attributes: list[ProductAttributeCreate] = []
    tag_ids: list[uuid.UUID] = []

    @model_validator(mode="after")
    def ensure_single_default_variant(self):
        defaults = [v for v in self.variants if v.is_default]
        if len(defaults) > 1:
            raise ValueError("Only one variant can be marked as is_default")
        if self.variants and not defaults:
            self.variants[0].is_default = True
        return self

    @model_validator(mode="after")
    def ensure_single_primary_image(self):
        primaries = [i for i in self.images if i.is_primary]
        if len(primaries) > 1:
            raise ValueError("Only one image can be marked as is_primary")
        if self.images and not primaries:
            self.images[0].is_primary = True
        return self


class ProductUpdate(BaseModel):
    title: str | None = Field(None, max_length=255)
    slug: str | None = Field(None, max_length=255, pattern=SLUG_PATTERN)
    description: str | None = None
    brand: str | None = Field(None, max_length=100)
    status: Status | None = None
    condition: ProductCondition | None = None
    product_type: ProductType | None = None
    requires_shipping: bool | None = None

    meta_title: str | None = Field(None, max_length=255)
    meta_description: str | None = Field(None, max_length=500)
    video_url: str | None = Field(None, max_length=500)
    is_featured: bool | None = None

    category_id: uuid.UUID | None = None
    seller_id: uuid.UUID | None = None
    business_id: int | None = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID

    # Denormalized, read-only — set by the service layer, never client-writable
    average_rating: Decimal = Decimal("0.00")
    review_count: int = 0
    sold_count: int = 0
    published_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ProductListItem(BaseModel):
    """Lightweight DTO for product catalog grid views."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    slug: str
    brand: str | None = None
    status: Status
    condition: ProductCondition
    thumbnail_url: str | None = None
    min_price: Decimal | None = None
    compare_at_price: Decimal | None = None
    currency: str = "USD"
    business_id: int | None = None
    is_featured: bool = False
    average_rating: Decimal = Decimal("0.00")
    review_count: int = 0


class ProductDetailOut(ProductOut):
    """Full nested view including variants, images, attributes, and tags."""

    variants: list[VariantOut] = []
    images: list[ProductImageOut] = []
    attributes: list[ProductAttributeOut] = []
    tags: list[ProductTagOut] = []


class ProductAdminDetailOut(ProductDetailOut):
    """Internal/seller-dashboard view — variants include cost_price."""

    variants: list[VariantAdminOut] = []
