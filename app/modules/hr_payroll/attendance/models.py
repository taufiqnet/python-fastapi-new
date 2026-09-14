import enum
import uuid
from datetime import date as date_type
from datetime import time as time_type

from sqlalchemy import Boolean, Date, Float, ForeignKey, Integer, String, Text, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID, Enum as SAEnum

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base
from app.modules.hr_payroll.employees.models import (
    Employee,
    EmploymentTypeEnum,
    GenderEnum,
    ImportJob,
    MaritalStatusEnum,
    WorkArrangementEnum,
)


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


class Attendance(Base, UUIDMixin, TimestampMixin):
    """
    Attendance log record for employee daily check-in/out and work/overtime hours calculation.
    """

    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint("business_id", "employee_id", "date", name="uq_attendance_employee_date"),
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
    overtime_hours: Mapped[float | None] = mapped_column(Float, default=0.0, nullable=True)
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


__all__ = [
    "GenderEnum",
    "MaritalStatusEnum",
    "WorkArrangementEnum",
    "EmploymentTypeEnum",
    "Employee",
    "ImportJob",
    "AttendanceStatusEnum",
    "AttendanceSourceEnum",
    "Attendance",
]
