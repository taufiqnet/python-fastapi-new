import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


# ── Leave Type Schemas ──────────────────────────────────────────────────
class LeaveTypeBase(BaseModel):
    name: str = Field(..., max_length=255)
    code: str = Field(..., max_length=50)
    description: str | None = None
    default_days_per_year: float = Field(0.0, ge=0.0)
    is_paid: bool = True
    is_active: bool = True
    business_id: int


class LeaveTypeCreate(LeaveTypeBase):
    pass


class LeaveTypeUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    code: str | None = Field(None, max_length=50)
    description: str | None = None
    default_days_per_year: float | None = Field(None, ge=0.0)
    is_paid: bool | None = None
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
    business_id: int


class LeaveAllocationCreate(LeaveAllocationBase):
    pass


class LeaveAllocationUpdate(BaseModel):
    allocated_days: float | None = Field(None, ge=0.0)
    used_days: float | None = Field(None, ge=0.0)


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
    number_of_days: float = Field(..., gt=0.0)
    reason: str | None = None
    business_id: int


class LeaveApplicationCreate(LeaveApplicationBase):
    pass


class LeaveApplicationUpdate(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    number_of_days: float | None = Field(None, gt=0.0)
    reason: str | None = None


class LeaveApplicationReview(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected)$")
    reviewer_id: uuid.UUID
    rejection_reason: str | None = None


class LeaveApplicationOut(LeaveApplicationBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str
    reviewer_id: uuid.UUID | None = None
    rejection_reason: str | None = None
    created_at: datetime
    updated_at: datetime
