import enum
import uuid
from datetime import date as date_type, datetime, time as time_type
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID, Enum as SAEnum

from app.common.models import TimestampMixin, UUIDMixin
from app.core.identity.models import User
from app.database import Base
from app.modules.hr_payroll.employees.models import (
    Employee,
    EmploymentTypeEnum,
    GenderEnum,
    ImportJob,
    MaritalStatusEnum,
    WorkArrangementEnum,
)


# ===========================================================================
# Enums
# ===========================================================================
class AttendanceStatusEnum(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    HALF_DAY = "half_day"
    ON_LEAVE = "on_leave"


class AttendanceSourceEnum(str, enum.Enum):
    MANUAL = "manual"
    BIOMETRIC = "biometric"
    MOBILE_APP = "mobile_app"
    WEB = "web"
    SYSTEM = "system"


class DeviceBrandEnum(str, enum.Enum):
    ZKTECO = "zkteco"
    HIKVISION = "hikvision"
    ANVIZ = "anviz"
    REALTIME = "realtime"
    GENERIC_WEBHOOK = "generic_webhook"


class DeviceTypeEnum(str, enum.Enum):
    FINGERPRINT = "fingerprint"
    FACE_RECOGNITION = "face_recognition"
    RFID_CARD = "rfid_card"
    HYBRID = "hybrid"


class DeviceStatusEnum(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    DISABLED = "disabled"


class PunchStateEnum(str, enum.Enum):
    CHECK_IN = "check_in"
    CHECK_OUT = "check_out"
    BREAK_OUT = "break_out"
    BREAK_IN = "break_in"
    AUTO = "auto"


class VerificationTypeEnum(str, enum.Enum):
    FINGERPRINT = "fingerprint"
    FACE = "face"
    RFID = "rfid"
    PASSWORD = "password"


class RegularizationTypeEnum(str, enum.Enum):
    MISSED_IN = "missed_in"
    MISSED_OUT = "missed_out"
    BOTH_PUNCHES = "both_punches"
    LATE_EXCUSE = "late_excuse"
    WORK_FROM_HOME = "work_from_home"


class ApprovalStatusEnum(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class VisitTypeEnum(str, enum.Enum):
    CLIENT_MEETING = "client_meeting"
    FIELD_WORK = "field_work"
    CUSTOMER_SITE = "customer_site"
    TRAINING_SEMINAR = "training_seminar"
    GOVERNMENT_OFFICE = "government_office"
    OTHER = "other"


class PeriodApprovalStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    LOCKED = "locked"


# ===========================================================================
# Models
# ===========================================================================
class AttendanceSettings(Base, UUIDMixin, TimestampMixin):
    """
    Business-level Attendance & Biometric Integration configuration.
    Defaults to enable_biometric_device=False so companies without devices
    operate normally without any hardware dependency.
    """

    __tablename__ = "hr_attendance_settings"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    enable_biometric_device: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    auto_sync_device_logs: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    sync_interval_minutes: Mapped[int] = mapped_column(
        Integer, default=15, nullable=False
    )
    grace_period_minutes: Mapped[int] = mapped_column(
        Integer, default=15, nullable=False
    )
    half_day_late_minutes: Mapped[int] = mapped_column(
        Integer, default=120, nullable=False
    )
    standard_daily_work_hours: Mapped[float] = mapped_column(
        Float, default=8.0, nullable=False
    )
    minimum_work_hours_half_day: Mapped[float] = mapped_column(
        Float, default=4.0, nullable=False
    )
    require_ot_pre_approval: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    require_attendance_approval_before_payroll: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<AttendanceSettings business_id={self.business_id} biometric={self.enable_biometric_device}>"


class BiometricDevice(Base, UUIDMixin, TimestampMixin):
    """
    Biometric terminal configuration (ZKTeco, Hikvision, etc.) for attendance sync.
    """

    __tablename__ = "hr_biometric_devices"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    device_name: Mapped[str] = mapped_column(String(255), nullable=False)
    device_brand: Mapped[DeviceBrandEnum] = mapped_column(
        SAEnum(DeviceBrandEnum, name="device_brand_enum"),
        default=DeviceBrandEnum.ZKTECO,
        nullable=False,
    )
    device_type: Mapped[DeviceTypeEnum] = mapped_column(
        SAEnum(DeviceTypeEnum, name="device_type_enum"),
        default=DeviceTypeEnum.FINGERPRINT,
        nullable=False,
    )
    ip_address: Mapped[str] = mapped_column(String(100), nullable=False)
    port: Mapped[int] = mapped_column(Integer, default=4370, nullable=False)
    comm_key: Mapped[str | None] = mapped_column(String(100), nullable=True)
    serial_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    mac_address: Mapped[str | None] = mapped_column(String(100), nullable=True)

    branch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("branches.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[DeviceStatusEnum] = mapped_column(
        SAEnum(DeviceStatusEnum, name="device_status_enum"),
        default=DeviceStatusEnum.ONLINE,
        nullable=False,
    )
    last_heartbeat_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    branch: Mapped["Branch | None"] = relationship(  # noqa: F821
        "Branch", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<BiometricDevice {self.device_name} ({self.ip_address}:{self.port})>"


class RawAttendanceLog(Base, UUIDMixin, TimestampMixin):
    """
    Unprocessed hardware/push punch log from biometric terminals.
    """

    __tablename__ = "hr_raw_attendance_logs"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    device_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("hr_biometric_devices.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    biometric_user_id: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )
    employee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    punch_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    punch_state: Mapped[PunchStateEnum] = mapped_column(
        SAEnum(PunchStateEnum, name="punch_state_enum"),
        default=PunchStateEnum.AUTO,
        nullable=False,
    )
    verification_type: Mapped[VerificationTypeEnum] = mapped_column(
        SAEnum(VerificationTypeEnum, name="verification_type_enum"),
        default=VerificationTypeEnum.FINGERPRINT,
        nullable=False,
    )
    device_ip: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_processed: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
    )
    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    employee: Mapped[Employee | None] = relationship("Employee", lazy="selectin")
    device: Mapped[BiometricDevice | None] = relationship(
        "BiometricDevice", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<RawAttendanceLog {self.biometric_user_id} at {self.punch_time}>"


class Attendance(Base, UUIDMixin, TimestampMixin):
    """
    Attendance log record for employee daily check-in/out and work/overtime hours calculation.
    """

    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint(
            "business_id", "employee_id", "date", name="uq_attendance_employee_date"
        ),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[AttendanceStatusEnum] = mapped_column(
        SAEnum(AttendanceStatusEnum, name="attendance_status"),
        default=AttendanceStatusEnum.PRESENT,
        nullable=False,
    )
    check_in: Mapped[time_type | None] = mapped_column(Time, nullable=True)
    check_out: Mapped[time_type | None] = mapped_column(Time, nullable=True)
    work_hours: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    overtime_hours: Mapped[float | None] = mapped_column(
        Float, default=0.0, nullable=True
    )
    source: Mapped[AttendanceSourceEnum] = mapped_column(
        SAEnum(AttendanceSourceEnum, name="attendance_source"),
        default=AttendanceSourceEnum.MANUAL,
        nullable=False,
    )
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    recorded_by_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Relationships ───────────────────────────────────────────────
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )
    employee: Mapped[Employee] = relationship(
        "Employee",
        foreign_keys=[employee_id],
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Attendance {self.employee_id} date={self.date} status={self.status}>"


class AttendanceRegularization(Base, UUIDMixin, TimestampMixin):
    """
    Employee request for missed punches, late excuse, or manual attendance corrections.
    """

    __tablename__ = "hr_attendance_regularizations"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attendance_date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    request_type: Mapped[RegularizationTypeEnum] = mapped_column(
        SAEnum(RegularizationTypeEnum, name="regularization_type_enum"),
        default=RegularizationTypeEnum.MISSED_IN,
        nullable=False,
    )
    requested_check_in: Mapped[time_type | None] = mapped_column(Time, nullable=True)
    requested_check_out: Mapped[time_type | None] = mapped_column(Time, nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    supporting_doc_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    status: Mapped[ApprovalStatusEnum] = mapped_column(
        SAEnum(ApprovalStatusEnum, name="reg_approval_status_enum"),
        default=ApprovalStatusEnum.PENDING,
        nullable=False,
    )
    reviewed_by_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    review_remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    employee: Mapped[Employee] = relationship("Employee", lazy="selectin")
    reviewed_by: Mapped[User | None] = relationship("User", lazy="selectin")

    def __repr__(self) -> str:
        return f"<AttendanceRegularization emp={self.employee_id} date={self.attendance_date} status={self.status}>"


class OutdoorDutyApplication(Base, UUIDMixin, TimestampMixin):
    """
    Outdoor Duty (OD) / Client Visit application. Approved OD marks attendance as PRESENT.
    """

    __tablename__ = "hr_outdoor_duties"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    start_date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    end_date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    is_full_day: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    visit_type: Mapped[VisitTypeEnum] = mapped_column(
        SAEnum(VisitTypeEnum, name="visit_type_enum"),
        default=VisitTypeEnum.CLIENT_MEETING,
        nullable=False,
    )
    destination_or_client: Mapped[str] = mapped_column(String(255), nullable=False)
    purpose: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[ApprovalStatusEnum] = mapped_column(
        SAEnum(ApprovalStatusEnum, name="od_approval_status_enum"),
        default=ApprovalStatusEnum.PENDING,
        nullable=False,
    )
    reviewed_by_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    review_remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    employee: Mapped[Employee] = relationship("Employee", lazy="selectin")
    reviewed_by: Mapped[User | None] = relationship("User", lazy="selectin")

    def __repr__(self) -> str:
        return f"<OutdoorDutyApplication emp={self.employee_id} {self.start_date} to {self.end_date} status={self.status}>"


class OvertimeApplication(Base, UUIDMixin, TimestampMixin):
    """
    Overtime application and supervisor approval workflow per BLA 2006 statutory norms.
    """

    __tablename__ = "hr_overtime_applications"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ot_date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time_type | None] = mapped_column(Time, nullable=True)
    end_time: Mapped[time_type | None] = mapped_column(Time, nullable=True)
    claimed_hours: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    approved_hours: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    purpose: Mapped[str] = mapped_column(Text, nullable=False)
    project_name_or_task: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )

    status: Mapped[ApprovalStatusEnum] = mapped_column(
        SAEnum(ApprovalStatusEnum, name="ot_approval_status_enum"),
        default=ApprovalStatusEnum.PENDING,
        nullable=False,
    )
    approved_by_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    manager_remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    employee: Mapped[Employee] = relationship("Employee", lazy="selectin")
    approved_by: Mapped[User | None] = relationship("User", lazy="selectin")

    def __repr__(self) -> str:
        return f"<OvertimeApplication emp={self.employee_id} date={self.ot_date} claimed={self.claimed_hours}h status={self.status}>"


class AttendancePeriodApproval(Base, UUIDMixin, TimestampMixin):
    """
    Monthly attendance period sign-off and audit lock before salary disbursement.
    """

    __tablename__ = "hr_attendance_period_approvals"
    __table_args__ = (
        UniqueConstraint(
            "business_id", "year", "month", name="uq_attendance_period_approval_month"
        ),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    start_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    end_date: Mapped[date_type] = mapped_column(Date, nullable=False)

    total_employees: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    present_days_total: Mapped[float] = mapped_column(
        Float, default=0.0, nullable=False
    )
    absent_days_total: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    leave_days_total: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    ot_hours_total: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    status: Mapped[PeriodApprovalStatusEnum] = mapped_column(
        SAEnum(PeriodApprovalStatusEnum, name="period_approval_status_enum"),
        default=PeriodApprovalStatusEnum.DRAFT,
        nullable=False,
    )
    approved_by_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    approved_by: Mapped[User | None] = relationship("User", lazy="selectin")

    def __repr__(self) -> str:
        return f"<AttendancePeriodApproval {self.year}-{self.month} status={self.status}>"


__all__ = [
    "GenderEnum",
    "MaritalStatusEnum",
    "WorkArrangementEnum",
    "EmploymentTypeEnum",
    "Employee",
    "ImportJob",
    "AttendanceStatusEnum",
    "AttendanceSourceEnum",
    "DeviceBrandEnum",
    "DeviceTypeEnum",
    "DeviceStatusEnum",
    "PunchStateEnum",
    "VerificationTypeEnum",
    "RegularizationTypeEnum",
    "ApprovalStatusEnum",
    "VisitTypeEnum",
    "PeriodApprovalStatusEnum",
    "AttendanceSettings",
    "BiometricDevice",
    "RawAttendanceLog",
    "Attendance",
    "AttendanceRegularization",
    "OutdoorDutyApplication",
    "OvertimeApplication",
    "AttendancePeriodApproval",
]
