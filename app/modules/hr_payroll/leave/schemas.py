import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.modules.hr_payroll.leave.models import (
    GenderApplicabilityEnum,
    LeaveEncashmentStatusEnum,
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
    encashed_days: float = Field(0.0, ge=0.0)
    business_id: int


class LeaveAllocationCreate(LeaveAllocationBase):
    pass


class LeaveAllocationUpdate(BaseModel):
    allocated_days: float | None = Field(None, ge=0.0)
    used_days: float | None = Field(None, ge=0.0)
    carried_forward: float | None = Field(None, ge=0.0)
    encashed_days: float | None = Field(None, ge=0.0)


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
    sync_attendance: bool = True


class LeaveApplicationRollback(BaseModel):
    reason: str = Field(..., min_length=2)
    actor_id: uuid.UUID
    force_override: bool = False


class LeaveApplicationOut(LeaveApplicationBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: LeaveStatusEnum
    reviewed_by_id: uuid.UUID | None = None
    review_note: str | None = None
    applied_at: datetime | None = None
    reviewed_at: datetime | None = None
    rolled_back_at: datetime | None = None
    rolled_back_by_id: uuid.UUID | None = None
    rollback_reason: str | None = None
    created_at: datetime
    updated_at: datetime


# ── Leave Encashment Schemas (BLA 2006 § 117) ──────────────────────────
class LeaveEncashmentBase(BaseModel):
    employee_id: uuid.UUID
    leave_type_id: uuid.UUID
    year: int = Field(..., ge=1900, le=2100)
    encashable_days: float = Field(..., gt=0.0)
    reason: str | None = None
    business_id: int


class LeaveEncashmentCreate(LeaveEncashmentBase):
    pass


class LeaveEncashmentReview(BaseModel):
    status: LeaveEncashmentStatusEnum
    reviewed_by_id: uuid.UUID
    review_note: str | None = None


class LeaveEncashmentDisburse(BaseModel):
    payment_date: date
    payment_reference: str | None = None
    payroll_period_id: uuid.UUID | None = None


class LeaveEncashmentOut(LeaveEncashmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    daily_rate: float
    total_amount: float
    status: LeaveEncashmentStatusEnum
    payroll_period_id: uuid.UUID | None = None
    reviewed_by_id: uuid.UUID | None = None
    reviewed_at: datetime | None = None
    review_note: str | None = None
    payment_date: date | None = None
    payment_reference: str | None = None
    created_at: datetime
    updated_at: datetime


# ── Yearly Leave Carry Forward Schemas ─────────────────────────────────
class LeaveCarryForwardPreviewRequest(BaseModel):
    from_year: int = Field(..., ge=1900, le=2100)
    to_year: int = Field(..., ge=1900, le=2100)
    leave_type_id: uuid.UUID | None = None
    max_cap: float | None = Field(None, ge=0.0)
    business_id: int | None = None


class LeaveCarryForwardPreviewItem(BaseModel):
    employee_id: uuid.UUID
    employee_code: str
    employee_name: str
    department_name: str
    leave_type_id: uuid.UUID
    leave_type_name: str
    leave_type_code: str
    carry_forward_allowed: bool
    from_year_balance: float
    proposed_carry_forward: float
    proposed_lapsed: float
    new_annual_allocation: float
    projected_starting_balance: float


class LeaveCarryForwardPreviewResponse(BaseModel):
    from_year: int
    to_year: int
    total_employees: int
    total_carried_days: float
    total_lapsed_days: float
    items: list[LeaveCarryForwardPreviewItem]


class LeaveCarryForwardExecuteRequest(BaseModel):
    from_year: int = Field(..., ge=1900, le=2100)
    to_year: int = Field(..., ge=1900, le=2100)
    leave_type_id: uuid.UUID | None = None
    max_cap: float | None = Field(None, ge=0.0)
    executed_by_id: uuid.UUID | None = None
    notes: str | None = None
    business_id: int | None = None


class LeaveCarryForwardExecuteResponse(BaseModel):
    from_year: int
    to_year: int
    total_employees: int
    total_carried_days: float
    total_lapsed_days: float
    allocations_created_or_updated: int
    message: str
