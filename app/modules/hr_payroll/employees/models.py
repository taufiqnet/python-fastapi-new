import enum
import uuid

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID, Enum as SAEnum

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


class GenderEnum(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class MaritalStatusEnum(str, enum.Enum):
    SINGLE = "single"
    MARRIED = "married"
    DIVORCED = "divorced"
    WIDOWED = "widowed"


class WorkArrangementEnum(str, enum.Enum):
    ONSITE = "onsite"
    REMOTE = "remote"
    HYBRID = "hybrid"


class EmploymentTypeEnum(str, enum.Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    INTERN = "intern"


class Employee(Base, UUIDMixin, TimestampMixin):
    """
    Employee profile — the hub of hr_payroll. attendance/, leave/,
    compensation/, and payslips/ all FK into this, never into each other.

    Note: the Django source enforced "only one active department head per
    department" and "department heads must be active + must have a
    department" inside Model.clean(). Per this platform's design principle
    (business logic lives in service.py, not models.py — see structure doc
    §8.2), that validation belongs in
    hr_payroll/employees/service.py::validate_department_head(), called
    before create/update, not on the model itself.
    """

    __tablename__ = "employees"
    __table_args__ = (
        UniqueConstraint("business_id", "employee_id", name="uq_employee_business_employee_id"),
        UniqueConstraint("business_id", "work_email", name="uq_employee_business_work_email"),
        UniqueConstraint("business_id", "phone", name="uq_employee_business_phone"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Basic Information ──────────────────────────────────────────
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    middle_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    employee_id: Mapped[str] = mapped_column(String(50), nullable=False)
    date_of_birth: Mapped["Date | None"] = mapped_column(Date, nullable=True)
    gender: Mapped[GenderEnum | None] = mapped_column(SAEnum(GenderEnum, name="employee_gender"), nullable=True)
    marital_status: Mapped[MaritalStatusEnum | None] = mapped_column(
        SAEnum(MaritalStatusEnum, name="employee_marital_status"), nullable=True
    )
    nationality: Mapped[str | None] = mapped_column(String(100), nullable=True)
    national_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    passport_no: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # ── Contact Information ────────────────────────────────────────
    work_email: Mapped[str] = mapped_column(String(255), nullable=False)
    personal_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    emergency_contact: Mapped[str | None] = mapped_column(Text, nullable=True)
    linkedin: Mapped[str | None] = mapped_column(String(500), nullable=True)
    residential_address: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Job Information ────────────────────────────────────────────
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
    team: Mapped[str | None] = mapped_column(String(255), nullable=True)
    direct_manager_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Employment Details ─────────────────────────────────────────
    employment_type: Mapped[EmploymentTypeEnum | None] = mapped_column(
        SAEnum(EmploymentTypeEnum, name="employee_employment_type"), nullable=True
    )
    start_date: Mapped["Date | None"] = mapped_column(Date, nullable=True)
    contract_end_date: Mapped["Date | None"] = mapped_column(Date, nullable=True)
    probation_end_date: Mapped["Date | None"] = mapped_column(Date, nullable=True)
    work_arrangement: Mapped[WorkArrangementEnum | None] = mapped_column(
        SAEnum(WorkArrangementEnum, name="employee_work_arrangement"), nullable=True
    )
    working_hours: Mapped[str | None] = mapped_column(String(100), nullable=True)
    working_days_per_week: Mapped[int | None] = mapped_column(Integer, nullable=True)
    working_days: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # ── Skills ──────────────────────────────────────────────────────
    skills_expertise: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_department_head: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ── System Fields ───────────────────────────────────────────────
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # ── Relationships ───────────────────────────────────────────────
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )
    department: Mapped["Department | None"] = relationship(  # noqa: F821
        "Department",
        foreign_keys=[department_id],
        lazy="selectin",
    )
    job_title: Mapped["JobTitle | None"] = relationship(  # noqa: F821
        "JobTitle",
        foreign_keys=[job_title_id],
        lazy="selectin",
    )
    direct_manager: Mapped["Employee | None"] = relationship(
        "Employee",
        remote_side="Employee.id",
        foreign_keys=[direct_manager_id],
        back_populates="subordinates",
    )
    subordinates: Mapped[list["Employee"]] = relationship(
        "Employee",
        back_populates="direct_manager",
    )

    @property
    def full_name(self) -> str:
        parts = [self.first_name, self.middle_name, self.last_name]
        return " ".join(p for p in parts if p)

    def __repr__(self) -> str:
        return f"<Employee {self.first_name} {self.last_name} ({self.employee_id})>"
