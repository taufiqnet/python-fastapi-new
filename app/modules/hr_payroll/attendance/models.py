import enum
import uuid

from sqlalchemy import (
    ForeignKey,
    Integer,
    Numeric,
    String,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID, Date, Enum as SAEnum

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


class AttendanceStatusEnum(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    HALF_DAY = "half_day"
    ON_LEAVE = "on_leave"
    HOLIDAY = "holiday"
    WEEKEND = "weekend"


class AttendanceSourceEnum(str, enum.Enum):
    MANUAL = "manual"
    BIOMETRIC = "biometric"
    SYSTEM = "system"


class Attendance(Base, UUIDMixin, TimestampMixin):
    """
    One record per employee per date.

    Note: `work_hours` (check_out − check_in) and `overtime_hours` (hours
    beyond the standard shift) were derivable values in the Django source.
    Per this platform's convention, that computation belongs in
    hr_payroll/attendance/service.py::record_attendance() — the model only
    stores the resulting figures, same as total_days in LeaveApplication.
    """

    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint("employee_id", "date", name="uq_attendance_employee_date"),
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
    date: Mapped["Date"] = mapped_column(Date, nullable=False)
    status: Mapped[AttendanceStatusEnum] = mapped_column(
        SAEnum(AttendanceStatusEnum, name="attendance_status"),
        default=AttendanceStatusEnum.PRESENT,
        nullable=False,
    )
    check_in: Mapped["Time | None"] = mapped_column(Time, nullable=True)
    check_out: Mapped["Time | None"] = mapped_column(Time, nullable=True)
    work_hours: Mapped[float] = mapped_column(Numeric(4, 2), default=0, nullable=False)
    overtime_hours: Mapped[float] = mapped_column(Numeric(4, 2), default=0, nullable=False)
    source: Mapped[AttendanceSourceEnum] = mapped_column(
        SAEnum(AttendanceSourceEnum, name="attendance_source"),
        default=AttendanceSourceEnum.MANUAL,
        nullable=False,
    )
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    recorded_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )  # HR/admin employee who created this record manually

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )
    employee: Mapped["Employee"] = relationship(  # noqa: F821
        "Employee",
        foreign_keys=[employee_id],
        lazy="selectin",
    )
    recorded_by: Mapped["Employee | None"] = relationship(  # noqa: F821
        "Employee",
        foreign_keys=[recorded_by_id],
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Attendance {self.employee_id} | {self.date} [{self.status}]>"
