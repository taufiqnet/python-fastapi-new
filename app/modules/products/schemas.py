import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.common.enums import Status
from app.modules.products.models import (
    MediaType,
    ProductCondition,
    ProductType,
)


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


class VariantCreate(VariantBase):
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
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    images: list[ProductImageOut] = []


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
    slug: str = Field(..., max_length=50)
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
    slug: str = Field(..., max_length=255)
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
    variants: list[VariantCreate] = []
    images: list[ProductImageCreate] = []
    attributes: list[ProductAttributeCreate] = []
    tag_ids: list[uuid.UUID] = []


class ProductUpdate(BaseModel):
    title: str | None = Field(None, max_length=255)
    slug: str | None = Field(None, max_length=255)
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
    thumbnail_url: str | None = None
    min_price: Decimal | None = None
    business_id: int | None = None
    is_featured: bool = False
    average_rating: Decimal = Decimal("0.00")


class ProductDetailOut(ProductOut):
    """Full nested view including variants, images, attributes, and tags."""

    variants: list[VariantOut] = []
    images: list[ProductImageOut] = []
    attributes: list[ProductAttributeOut] = []
    tags: list[ProductTagOut] = []
