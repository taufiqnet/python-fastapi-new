import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CategoryAttributeTemplateBase(BaseModel):
    attribute_name: str = Field(..., max_length=100)
    attribute_type: str = Field("text", max_length=50)
    is_required: bool = False
    options: dict[str, Any] | list[Any] | None = None


class CategoryAttributeTemplateCreate(CategoryAttributeTemplateBase):
    pass


class CategoryAttributeTemplateOut(CategoryAttributeTemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class CategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: str = Field(..., max_length=100)
    icon: str | None = Field(None, max_length=255)
    description: str | None = None
    is_active: bool = True
    parent_id: uuid.UUID | None = None
    business_id: int | None = None


class CategoryCreate(CategoryBase):
    attribute_templates: list[CategoryAttributeTemplateCreate] = []


class CategoryUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    slug: str | None = Field(None, max_length=100)
    icon: str | None = Field(None, max_length=255)
    description: str | None = None
    is_active: bool | None = None
    parent_id: uuid.UUID | None = None
    business_id: int | None = None


class CategoryOut(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    attribute_templates: list[CategoryAttributeTemplateOut] = []


class CategoryTreeNode(CategoryOut):
    children: list["CategoryTreeNode"] = []


CategoryTreeNode.model_rebuild()
