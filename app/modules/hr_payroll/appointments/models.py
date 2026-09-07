import enum
import uuid

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID, Enum as SAEnum

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base
from app.modules.hr_payroll.employees.models import EmploymentTypeEnum


class AppointmentStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"


class AppointmentLetter(Base, UUIDMixin, TimestampMixin):
    """Appointment Letter model for job offers and onboarding conversion."""

    __tablename__ = "appointment_letters"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    candidate_name: Mapped[str] = mapped_column(String(255), nullable=False)
    candidate_email: Mapped[str] = mapped_column(String(255), nullable=False)
    candidate_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    job_title_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("job_titles.id", ondelete="SET NULL"),
        nullable=True,
    )
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
    )
    offered_joining_date: Mapped[Date] = mapped_column(Date, nullable=False)
    probation_period_months: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    employment_type: Mapped[EmploymentTypeEnum] = mapped_column(
        SAEnum(EmploymentTypeEnum, name="appointment_employment_type"),
        default=EmploymentTypeEnum.FULL_TIME,
        nullable=False,
    )

    offered_basic_salary: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    offered_gross_salary: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    allowance_details: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[AppointmentStatusEnum] = mapped_column(
        SAEnum(AppointmentStatusEnum, name="appointment_status"),
        default=AppointmentStatusEnum.DRAFT,
        nullable=False,
    )
    issue_date: Mapped[Date] = mapped_column(Date, nullable=False)
    valid_until: Mapped[Date] = mapped_column(Date, nullable=False)
    terms_and_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)

    employee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    job_title: Mapped["JobTitle | None"] = relationship("JobTitle", lazy="selectin")  # noqa: F821
    department: Mapped["Department | None"] = relationship("Department", lazy="selectin")  # noqa: F821
    employee: Mapped["Employee | None"] = relationship("Employee", lazy="selectin")  # noqa: F821

    def __repr__(self) -> str:
        return f"<AppointmentLetter {self.candidate_name} ({self.status})>"
