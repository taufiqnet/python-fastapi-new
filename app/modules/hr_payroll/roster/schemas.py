import uuid
from datetime import date as date_type
from datetime import datetime as datetime_type
from datetime import time as time_type
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.modules.hr_payroll.roster.models import (
    DutyAssignmentSourceEnum,
    DutyAssignmentStatusEnum,
    DutyBatchStatusEnum,
    MonthlyRosterStatusEnum,
    RosterChangeStatusEnum,
    RosterExchangeStatusEnum,
)


# ============================================================
# Shift Schemas
# ============================================================
class ShiftBase(BaseModel):
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=20)
    start_time: time_type | None = None
    end_time: time_type | None = None
    work_hours: float = 8.0
    break_duration_minutes: int = 60
    grace_in_minutes: int = 15
    grace_out_minutes: int = 15
    is_night_shift: bool = False
    is_off_day: bool = False
    color_code: str = Field("#3B82F6", max_length=20)
    is_active: bool = True


class ShiftCreate(ShiftBase):
    business_id: int | None = None


class ShiftUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    start_time: time_type | None = None
    end_time: time_type | None = None
    work_hours: float | None = None
    break_duration_minutes: int | None = None
    grace_in_minutes: int | None = None
    grace_out_minutes: int | None = None
    is_night_shift: bool | None = None
    is_off_day: bool | None = None
    color_code: str | None = None
    is_active: bool | None = None


class ShiftOut(ShiftBase):
    id: uuid.UUID
    business_id: int
    created_at: datetime_type | None = None
    updated_at: datetime_type | None = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Department Roster Config Schemas
# ============================================================
class DepartmentRosterToggle(BaseModel):
    is_roster_enabled: bool


class DepartmentRosterStatusOut(BaseModel):
    id: uuid.UUID
    name: str
    code: str | None = None
    is_roster_enabled: bool
    employee_count: int = 0

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Duty Assignment Schemas
# ============================================================
class DutyAssignmentItem(BaseModel):
    employee_id: uuid.UUID
    date: date_type
    shift_id: uuid.UUID
    notes: str | None = None


class DutyAssignmentBulkCreate(BaseModel):
    department_id: uuid.UUID
    assignments: list[DutyAssignmentItem]


class DutyAssignmentOut(BaseModel):
    id: uuid.UUID
    business_id: int
    monthly_roster_id: uuid.UUID | None = None
    batch_id: uuid.UUID | None = None
    employee_id: uuid.UUID
    department_id: uuid.UUID
    date: date_type
    shift_id: uuid.UUID
    status: DutyAssignmentStatusEnum
    source: DutyAssignmentSourceEnum
    notes: str | None = None
    created_at: datetime_type | None = None
    updated_at: datetime_type | None = None

    # Nested display helpers
    employee_name: str | None = None
    employee_code: str | None = None
    department_name: str | None = None
    shift: ShiftOut | None = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Duty Assign Batch Schemas
# ============================================================
class DutyAssignBatchCreate(BaseModel):
    department_id: uuid.UUID
    title: str = Field(..., max_length=255)
    start_date: date_type
    end_date: date_type
    assignments: list[DutyAssignmentItem]


class DutyAssignBatchReview(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$")
    reason: str | None = None


class DutyAssignBatchOut(BaseModel):
    id: uuid.UUID
    business_id: int
    department_id: uuid.UUID
    department_name: str | None = None
    title: str
    start_date: date_type
    end_date: date_type
    assigned_count: int
    status: DutyBatchStatusEnum
    submitted_by_id: uuid.UUID | None = None
    submitted_by_name: str | None = None
    submitted_at: datetime_type
    approved_by_id: uuid.UUID | None = None
    approved_by_name: str | None = None
    approved_at: datetime_type | None = None
    rejection_reason: str | None = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Monthly Roster Schemas
# ============================================================
class MonthlyRosterCreate(BaseModel):
    department_id: uuid.UUID
    year: int
    month: int
    notes: str | None = None


class MonthlyRosterCellUpdate(BaseModel):
    employee_id: uuid.UUID
    date: date_type
    shift_id: uuid.UUID
    notes: str | None = None


class MonthlyRosterBulkCellUpdate(BaseModel):
    cells: list[MonthlyRosterCellUpdate]


class MonthlyRosterReview(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$")
    reason: str | None = None


class MonthlyRosterOut(BaseModel):
    id: uuid.UUID
    business_id: int
    department_id: uuid.UUID
    department_name: str | None = None
    year: int
    month: int
    status: MonthlyRosterStatusEnum
    submitted_by_id: uuid.UUID | None = None
    submitted_by_name: str | None = None
    submitted_at: datetime_type | None = None
    approved_by_id: uuid.UUID | None = None
    approved_by_name: str | None = None
    approved_at: datetime_type | None = None
    rejection_reason: str | None = None
    notes: str | None = None
    total_assignments: int = 0
    created_at: datetime_type | None = None

    model_config = ConfigDict(from_attributes=True)


class RestDayViolation(BaseModel):
    employee_id: uuid.UUID
    employee_name: str
    consecutive_work_days: int
    start_date: date_type
    end_date: date_type
    rule: str = "BLA 2006 Sec 103: Minimum 1 mandatory 24h rest day per 7-day period"


class EmployeeMatrixRow(BaseModel):
    employee_id: uuid.UUID
    employee_name: str
    employee_code: str | None = None
    job_title: str | None = None
    duties: dict[str, DutyAssignmentOut]  # keyed by YYYY-MM-DD
    total_shifts: int = 0
    total_off_days: int = 0
    total_work_hours: float = 0.0


class MonthlyRosterMatrixOut(BaseModel):
    monthly_roster: MonthlyRosterOut | None = None
    department_id: uuid.UUID
    department_name: str
    is_roster_enabled: bool
    year: int
    month: int
    days_in_month: int
    shifts: list[ShiftOut]
    rows: list[EmployeeMatrixRow]
    daily_shift_counts: dict[str, dict[str, int]]  # date_str -> shift_code -> count
    rest_day_violations: list[RestDayViolation]


# ============================================================
# Roster Change Application Schemas
# ============================================================
class RosterChangeCreate(BaseModel):
    employee_id: uuid.UUID
    date: date_type
    requested_shift_id: uuid.UUID
    reason: str


class RosterChangeReview(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$")
    note: str | None = None


class RosterChangeOut(BaseModel):
    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    employee_name: str | None = None
    employee_code: str | None = None
    duty_assignment_id: uuid.UUID | None = None
    date: date_type
    current_shift_id: uuid.UUID
    current_shift: ShiftOut | None = None
    requested_shift_id: uuid.UUID
    requested_shift: ShiftOut | None = None
    reason: str
    status: RosterChangeStatusEnum
    applied_at: datetime_type
    reviewed_by_id: uuid.UUID | None = None
    reviewed_by_name: str | None = None
    reviewed_at: datetime_type | None = None
    review_note: str | None = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# Roster Exchange Application Schemas
# ============================================================
class RosterExchangeCreate(BaseModel):
    requesting_employee_id: uuid.UUID
    target_employee_id: uuid.UUID
    requesting_date: date_type
    target_date: date_type
    reason: str


class RosterExchangePeerReview(BaseModel):
    action: str = Field(..., pattern="^(accept|reject)$")
    peer_note: str | None = None


class RosterExchangeManagerReview(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$")
    review_note: str | None = None


class RosterExchangeOut(BaseModel):
    id: uuid.UUID
    business_id: int
    requesting_employee_id: uuid.UUID
    requesting_employee_name: str | None = None
    target_employee_id: uuid.UUID
    target_employee_name: str | None = None
    requesting_date: date_type
    requesting_shift_id: uuid.UUID
    requesting_shift: ShiftOut | None = None
    target_date: date_type
    target_shift_id: uuid.UUID
    target_shift: ShiftOut | None = None
    reason: str
    status: RosterExchangeStatusEnum
    applied_at: datetime_type
    peer_reviewed_at: datetime_type | None = None
    peer_note: str | None = None
    reviewed_by_id: uuid.UUID | None = None
    reviewed_by_name: str | None = None
    reviewed_at: datetime_type | None = None
    review_note: str | None = None

    model_config = ConfigDict(from_attributes=True)
