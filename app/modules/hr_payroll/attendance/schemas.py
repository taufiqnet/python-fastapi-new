import uuid
from datetime import date as date_type
from datetime import datetime
from datetime import time as time_type

from pydantic import BaseModel, ConfigDict, Field

from app.modules.hr_payroll.attendance.models import (
    AttendanceSourceEnum,
    AttendanceStatusEnum,
)


class AttendanceBase(BaseModel):
    business_id: int
    employee_id: uuid.UUID
    date: date_type
    status: AttendanceStatusEnum = AttendanceStatusEnum.PRESENT
    check_in: time_type | None = None
    check_out: time_type | None = None
    work_hours: float = Field(0.0, ge=0.0)
    overtime_hours: float | None = Field(None, ge=0.0)
    source: AttendanceSourceEnum = AttendanceSourceEnum.MANUAL
    note: str | None = Field(None, max_length=255)
    recorded_by_id: uuid.UUID | None = None


class AttendanceCreate(AttendanceBase):
    pass


class AttendanceUpdate(BaseModel):
    business_id: int | None = None
    employee_id: uuid.UUID | None = None
    date: date_type | None = None
    status: AttendanceStatusEnum | None = None
    check_in: time_type | None = None
    check_out: time_type | None = None
    work_hours: float | None = Field(None, ge=0.0)
    overtime_hours: float | None = Field(None, ge=0.0)
    source: AttendanceSourceEnum | None = None
    note: str | None = Field(None, max_length=255)
    recorded_by_id: uuid.UUID | None = None


class AttendanceOut(AttendanceBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    overtime_hours: float = 0.0
    created_at: datetime
    updated_at: datetime
