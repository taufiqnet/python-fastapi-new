import uuid
from datetime import date as date_type, datetime, time as time_type
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.modules.hr_payroll.attendance.models import (
    ApprovalStatusEnum,
    AttendanceSourceEnum,
    AttendanceStatusEnum,
    DeviceBrandEnum,
    DeviceStatusEnum,
    DeviceTypeEnum,
    PeriodApprovalStatusEnum,
    PunchStateEnum,
    RegularizationTypeEnum,
    VerificationTypeEnum,
    VisitTypeEnum,
)


# ===========================================================================
# Attendance Core Schemas
# ===========================================================================
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
    recorded_by_id: int | None = None


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
    recorded_by_id: int | None = None


class AttendanceCheckInRequest(BaseModel):
    business_id: int
    employee_id: uuid.UUID
    date: date_type | None = None
    check_in: time_type | None = None
    note: str | None = Field(None, max_length=255)


class AttendanceCheckOutRequest(BaseModel):
    business_id: int
    employee_id: uuid.UUID
    date: date_type | None = None
    check_out: time_type | None = None
    note: str | None = Field(None, max_length=255)


class AttendanceOut(AttendanceBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    overtime_hours: float = 0.0
    created_at: datetime
    updated_at: datetime
    employee_name: str | None = None
    employee_code: str | None = None
    department_name: str | None = None


# ===========================================================================
# Settings Schemas
# ===========================================================================
class AttendanceSettingsBase(BaseModel):
    enable_biometric_device: bool = False
    auto_sync_device_logs: bool = False
    sync_interval_minutes: int = Field(15, ge=1, le=1440)
    grace_period_minutes: int = Field(15, ge=0, le=120)
    half_day_late_minutes: int = Field(120, ge=0, le=360)
    standard_daily_work_hours: float = Field(8.0, ge=1.0, le=24.0)
    minimum_work_hours_half_day: float = Field(4.0, ge=1.0, le=12.0)
    require_ot_pre_approval: bool = True
    require_attendance_approval_before_payroll: bool = False


class AttendanceSettingsUpdate(BaseModel):
    enable_biometric_device: bool | None = None
    auto_sync_device_logs: bool | None = None
    sync_interval_minutes: int | None = Field(None, ge=1, le=1440)
    grace_period_minutes: int | None = Field(None, ge=0, le=120)
    half_day_late_minutes: int | None = Field(None, ge=0, le=360)
    standard_daily_work_hours: float | None = Field(None, ge=1.0, le=24.0)
    minimum_work_hours_half_day: float | None = Field(None, ge=1.0, le=12.0)
    require_ot_pre_approval: bool | None = None
    require_attendance_approval_before_payroll: bool | None = None


class AttendanceSettingsOut(AttendanceSettingsBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    created_at: datetime
    updated_at: datetime


# ===========================================================================
# Biometric Device Schemas
# ===========================================================================
class BiometricDeviceBase(BaseModel):
    device_name: str = Field(..., min_length=2, max_length=255)
    device_brand: DeviceBrandEnum = DeviceBrandEnum.ZKTECO
    device_type: DeviceTypeEnum = DeviceTypeEnum.FINGERPRINT
    ip_address: str = Field(..., max_length=100)
    port: int = Field(4370, ge=1, le=65535)
    comm_key: str | None = Field(None, max_length=100)
    serial_number: str | None = Field(None, max_length=100)
    mac_address: str | None = Field(None, max_length=100)
    branch_id: uuid.UUID | None = None
    status: DeviceStatusEnum = DeviceStatusEnum.ONLINE
    is_active: bool = True


class BiometricDeviceCreate(BiometricDeviceBase):
    business_id: int


class BiometricDeviceUpdate(BaseModel):
    device_name: str | None = Field(None, min_length=2, max_length=255)
    device_brand: DeviceBrandEnum | None = None
    device_type: DeviceTypeEnum | None = None
    ip_address: str | None = Field(None, max_length=100)
    port: int | None = Field(None, ge=1, le=65535)
    comm_key: str | None = Field(None, max_length=100)
    serial_number: str | None = Field(None, max_length=100)
    mac_address: str | None = Field(None, max_length=100)
    branch_id: uuid.UUID | None = None
    status: DeviceStatusEnum | None = None
    is_active: bool | None = None


class BiometricDeviceOut(BiometricDeviceBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    last_heartbeat_at: datetime | None = None
    last_synced_at: datetime | None = None
    branch_name: str | None = None
    created_at: datetime
    updated_at: datetime


# ===========================================================================
# Raw Attendance Log Schemas
# ===========================================================================
class RawAttendanceLogCreate(BaseModel):
    business_id: int
    device_id: uuid.UUID | None = None
    biometric_user_id: str = Field(..., max_length=50)
    employee_id: uuid.UUID | None = None
    punch_time: datetime
    punch_state: PunchStateEnum = PunchStateEnum.AUTO
    verification_type: VerificationTypeEnum = VerificationTypeEnum.FINGERPRINT
    device_ip: str | None = Field(None, max_length=100)


class RawAttendancePushBatch(BaseModel):
    business_id: int
    device_id: uuid.UUID | None = None
    punches: list[RawAttendanceLogCreate]


class RawAttendanceLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    device_id: uuid.UUID | None = None
    biometric_user_id: str
    employee_id: uuid.UUID | None = None
    punch_time: datetime
    punch_state: PunchStateEnum
    verification_type: VerificationTypeEnum
    device_ip: str | None = None
    is_processed: bool
    processed_at: datetime | None = None
    error_message: str | None = None
    employee_name: str | None = None
    employee_code: str | None = None
    device_name: str | None = None
    created_at: datetime


# ===========================================================================
# Regularization Schemas
# ===========================================================================
class AttendanceRegularizationCreate(BaseModel):
    business_id: int
    employee_id: uuid.UUID
    attendance_date: date_type
    request_type: RegularizationTypeEnum
    requested_check_in: time_type | None = None
    requested_check_out: time_type | None = None
    reason: str
    supporting_doc_url: str | None = Field(None, max_length=500)


class AttendanceRegularizationReview(BaseModel):
    status: ApprovalStatusEnum
    review_remarks: str | None = None


class AttendanceRegularizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    attendance_date: date_type
    request_type: RegularizationTypeEnum
    requested_check_in: time_type | None = None
    requested_check_out: time_type | None = None
    reason: str
    supporting_doc_url: str | None = None
    status: ApprovalStatusEnum
    reviewed_by_id: int | None = None
    reviewed_at: datetime | None = None
    review_remarks: str | None = None
    employee_name: str | None = None
    employee_code: str | None = None
    department_name: str | None = None
    reviewer_name: str | None = None
    created_at: datetime
    updated_at: datetime


# ===========================================================================
# Outdoor Duty Schemas
# ===========================================================================
class OutdoorDutyCreate(BaseModel):
    business_id: int
    employee_id: uuid.UUID
    start_date: date_type
    end_date: date_type
    is_full_day: bool = True
    visit_type: VisitTypeEnum = VisitTypeEnum.CLIENT_MEETING
    destination_or_client: str = Field(..., max_length=255)
    purpose: str


class OutdoorDutyReview(BaseModel):
    status: ApprovalStatusEnum
    review_remarks: str | None = None


class OutdoorDutyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    start_date: date_type
    end_date: date_type
    is_full_day: bool
    visit_type: VisitTypeEnum
    destination_or_client: str
    purpose: str
    status: ApprovalStatusEnum
    reviewed_by_id: int | None = None
    reviewed_at: datetime | None = None
    review_remarks: str | None = None
    employee_name: str | None = None
    employee_code: str | None = None
    department_name: str | None = None
    reviewer_name: str | None = None
    created_at: datetime
    updated_at: datetime


# ===========================================================================
# Overtime Schemas
# ===========================================================================
class OvertimeCreate(BaseModel):
    business_id: int
    employee_id: uuid.UUID
    ot_date: date_type
    start_time: time_type | None = None
    end_time: time_type | None = None
    claimed_hours: float = Field(..., ge=0.5, le=12.0)
    purpose: str
    project_name_or_task: str | None = Field(None, max_length=255)


class OvertimeReview(BaseModel):
    status: ApprovalStatusEnum
    approved_hours: float | None = Field(None, ge=0.0, le=12.0)
    manager_remarks: str | None = None


class OvertimeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    ot_date: date_type
    start_time: time_type | None = None
    end_time: time_type | None = None
    claimed_hours: float
    approved_hours: float
    purpose: str
    project_name_or_task: str | None = None
    status: ApprovalStatusEnum
    approved_by_id: int | None = None
    approved_at: datetime | None = None
    manager_remarks: str | None = None
    employee_name: str | None = None
    employee_code: str | None = None
    department_name: str | None = None
    approver_name: str | None = None
    created_at: datetime
    updated_at: datetime


# ===========================================================================
# Period Approval & Monthly Summary Schemas
# ===========================================================================
class AttendancePeriodApprovalCreate(BaseModel):
    business_id: int
    year: int
    month: int
    comments: str | None = None


class AttendancePeriodApprovalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    year: int
    month: int
    start_date: date_type
    end_date: date_type
    total_employees: int
    present_days_total: float
    absent_days_total: float
    leave_days_total: float
    ot_hours_total: float
    status: PeriodApprovalStatusEnum
    approved_by_id: int | None = None
    approved_at: datetime | None = None
    comments: str | None = None
    approver_name: str | None = None
    created_at: datetime
    updated_at: datetime


class MonthlyAttendanceSummaryItem(BaseModel):
    employee_id: uuid.UUID
    employee_code: str
    employee_name: str
    department_name: str | None = None
    job_title: str | None = None
    total_days: int
    present_days: float
    late_days: int
    half_days: int
    absent_days: float
    leave_days: float
    outdoor_duty_days: int
    total_work_hours: float
    overtime_hours: float


class MonthlyAttendanceSummaryOut(BaseModel):
    business_id: int
    year: int
    month: int
    total_employees: int
    items: list[MonthlyAttendanceSummaryItem]


class AttendanceBatchSyncRequest(BaseModel):
    business_id: int
    start_date: date_type
    end_date: date_type
    employee_id: uuid.UUID | None = None
