import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# --- JobTitle Schemas ---
class JobTitleBase(BaseModel):
    name: str = Field(..., max_length=255)
    short_name: str | None = Field(None, max_length=255)
    description: str | None = None
    is_active: bool = True
    department_id: uuid.UUID | None = None
    business_id: int


class JobTitleCreate(JobTitleBase):
    pass


class JobTitleUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    short_name: str | None = Field(None, max_length=255)
    description: str | None = None
    is_active: bool | None = None
    department_id: uuid.UUID | None = None
    business_id: int | None = None


class JobTitleOut(JobTitleBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# --- Department Schemas ---
class DepartmentBase(BaseModel):
    name: str = Field(..., max_length=255)
    slug: str = Field(..., max_length=280)
    description: str | None = None
    is_active: bool = True
    multiple_heads_allowed: bool = False
    business_id: int | None = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    slug: str | None = Field(None, max_length=280)
    description: str | None = None
    is_active: bool | None = None
    multiple_heads_allowed: bool | None = None
    business_id: int | None = None


class DepartmentOut(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    job_titles: list[JobTitleOut] = []
