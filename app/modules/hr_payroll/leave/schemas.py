import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.modules.hr_payroll.leave.models import (
    GenderApplicabilityEnum,
    LeaveStatusEnum,
)


# ── Leave Type Schemas ──────────────────────────────────────────────────
class LeaveTypeBase(BaseModel):
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=10)
    description: str | None = None
    max_days_per_year: int = Field(0, ge=0)
    is_paid: bool = True
    requires_document: bool = False
    applicable_gender: GenderApplicabilityEnum = GenderApplicabilityEnum.ALL
    carry_forward: bool = False
    is_active: bool = True
    business_id: int


class LeaveTypeCreate(LeaveTypeBase):
    pass


class LeaveTypeUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    code: str | None = Field(None, max_length=10)
    description: str | None = None
    max_days_per_year: int | None = Field(None, ge=0)
    is_paid: bool | None = None
    requires_document: bool | None = None
    applicable_gender: GenderApplicabilityEnum | None = None
    carry_forward: bool | None = None
    is_active: bool | None = None
    business_id: int | None = None


class LeaveTypeOut(LeaveTypeBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# ── Leave Allocation Schemas ───────────────────────────────────────────
class LeaveAllocationBase(BaseModel):
    employee_id: uuid.UUID
    leave_type_id: uuid.UUID
    year: int = Field(..., ge=1900, le=2100)
    allocated_days: float = Field(..., ge=0.0)
    used_days: float = Field(0.0, ge=0.0)
    carried_forward: float = Field(0.0, ge=0.0)
    business_id: int


class LeaveAllocationCreate(LeaveAllocationBase):
    pass


class LeaveAllocationUpdate(BaseModel):
    allocated_days: float | None = Field(None, ge=0.0)
    used_days: float | None = Field(None, ge=0.0)
    carried_forward: float | None = Field(None, ge=0.0)


class LeaveAllocationOut(LeaveAllocationBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    remaining_days: float
    created_at: datetime
    updated_at: datetime


# ── Leave Application Schemas ──────────────────────────────────────────
class LeaveApplicationBase(BaseModel):
    employee_id: uuid.UUID
    leave_type_id: uuid.UUID
    start_date: date
    end_date: date
    total_days: int = Field(0, ge=0)
    reason: str = Field(..., min_length=1)
    document_url: str | None = Field(None, max_length=500)
    business_id: int


class LeaveApplicationCreate(LeaveApplicationBase):
    pass


class LeaveApplicationUpdate(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    total_days: int | None = Field(None, ge=0)
    reason: str | None = None
    document_url: str | None = Field(None, max_length=500)


class LeaveApplicationReview(BaseModel):
    status: LeaveStatusEnum
    reviewed_by_id: uuid.UUID
    review_note: str | None = None


class LeaveApplicationOut(LeaveApplicationBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: LeaveStatusEnum
    reviewed_by_id: uuid.UUID | None = None
    review_note: str | None = None
    applied_at: datetime | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
