import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.common.enums import Status


# --- Image Schemas ---
class ProductImageBase(BaseModel):
    url: str = Field(..., max_length=500)
    position: int = 0
    alt_text: str | None = Field(None, max_length=255)
    variant_id: uuid.UUID | None = None


class ProductImageCreate(ProductImageBase):
    pass


class ProductImageOut(ProductImageBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# --- Variant Schemas ---
class VariantBase(BaseModel):
    sku: str = Field(..., max_length=100)
    attributes: dict[str, Any] | None = None
    price: Decimal = Field(gt=Decimal("0.00"))
    stock_qty: int = Field(0, ge=0)


class VariantCreate(VariantBase):
    pass


class VariantUpdate(BaseModel):
    sku: str | None = Field(None, max_length=100)
    attributes: dict[str, Any] | None = None
    price: Decimal | None = Field(None, gt=Decimal("0.00"))
    stock_qty: int | None = Field(None, ge=0)


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


class ProductAttributeBase(BaseModel):
    name: str = Field(..., max_length=100)


class ProductAttributeCreate(ProductAttributeBase):
    values: list[AttributeValueCreate] = []


class ProductAttributeOut(ProductAttributeBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    values: list[AttributeValueOut] = []


# --- Product Tag Schemas ---
class ProductTagBase(BaseModel):
    name: str = Field(..., max_length=50)
    slug: str = Field(..., max_length=50)


class ProductTagCreate(ProductTagBase):
    pass


class ProductTagOut(ProductTagBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


# --- Product Schemas ---
class ProductBase(BaseModel):
    title: str = Field(..., max_length=255)
    slug: str = Field(..., max_length=255)
    description: str | None = None
    brand: str | None = Field(None, max_length=100)
    status: Status = Status.DRAFT
    category_id: uuid.UUID | None = None
    seller_id: uuid.UUID | None = None


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
    category_id: uuid.UUID | None = None
    seller_id: uuid.UUID | None = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
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


class ProductDetailOut(ProductOut):
    """Full nested view including variants, images, attributes, and tags."""

    variants: list[VariantOut] = []
    images: list[ProductImageOut] = []
    attributes: list[ProductAttributeOut] = []
    tags: list[ProductTagOut] = []
