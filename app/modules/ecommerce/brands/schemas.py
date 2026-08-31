import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# --- ProductModel Schemas ---
class ProductModelBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: str = Field(..., max_length=100)
    description: str | None = None
    is_active: bool = True


class ProductModelCreate(ProductModelBase):
    pass


class ProductModelUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    slug: str | None = Field(None, max_length=100)
    description: str | None = None
    is_active: bool | None = None


class ProductModelOut(ProductModelBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    brand_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# --- Brand Schemas ---
class BrandBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: str = Field(..., max_length=100)
    logo_url: str | None = Field(None, max_length=500)
    description: str | None = None
    is_active: bool = True
    business_id: int | None = None


class BrandCreate(BrandBase):
    pass


class BrandUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    slug: str | None = Field(None, max_length=100)
    logo_url: str | None = Field(None, max_length=500)
    description: str | None = None
    is_active: bool | None = None
    business_id: int | None = None


class BrandOut(BrandBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    models: list[ProductModelOut] = []


class BrandDropdownItem(BaseModel):
    """Lightweight DTO for brand dropdowns."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    logo_url: str | None = None
