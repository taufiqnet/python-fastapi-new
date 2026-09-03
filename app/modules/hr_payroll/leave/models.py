import enum
import uuid

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID, Enum as SAEnum

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


class GenderApplicabilityEnum(str, enum.Enum):
    ALL = "all"
    MALE = "male"
    FEMALE = "female"


class LeaveStatusEnum(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class LeaveType(Base, UUIDMixin, TimestampMixin):
    """Per-business leave policy (Annual, Sick, Maternity, etc.)."""

    __tablename__ = "leave_types"
    __table_args__ = (
        UniqueConstraint("business_id", "code", name="uq_leave_type_business_code"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(10), nullable=False)  # e.g. AL, SL, ML — shown on payslips
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    max_days_per_year: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)  # 0 = unlimited
    is_paid: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    requires_document: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    applicable_gender: Mapped[GenderApplicabilityEnum] = mapped_column(
        SAEnum(GenderApplicabilityEnum, name="leave_type_applicable_gender"),
        default=GenderApplicabilityEnum.ALL,
        nullable=False,
    )
    carry_forward: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )
    applications: Mapped[list["LeaveApplication"]] = relationship(
        "LeaveApplication",
        back_populates="leave_type",
    )
    allocations: Mapped[list["LeaveAllocation"]] = relationship(
        "LeaveAllocation",
        back_populates="leave_type",
    )

    def __repr__(self) -> str:
        paid_label = "Paid" if self.is_paid else "Unpaid"
        return f"<LeaveType {self.name} ({self.code}) [{paid_label}]>"


class LeaveApplication(Base, UUIDMixin, TimestampMixin):
    """
    A single leave request, pending → approved/rejected/cancelled.

    Note: `total_days` was auto-computed from start/end dates inside the
    Django model's save(). Per this platform's convention (derived/business
    logic lives in service.py, not models.py), that computation belongs in
    hr_payroll/leave/service.py::create_leave_application() — the model only
    stores the resulting value.
    """

    __tablename__ = "leave_applications"

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
    leave_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("leave_types.id", ondelete="RESTRICT"),
        nullable=False,
    )
    start_date: Mapped["Date"] = mapped_column(Date, nullable=False)
    end_date: Mapped["Date"] = mapped_column(Date, nullable=False)
    total_days: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    document_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )  # medical certificate / supporting file, stored in object storage
    status: Mapped[LeaveStatusEnum] = mapped_column(
        SAEnum(LeaveStatusEnum, name="leave_application_status"),
        default=LeaveStatusEnum.PENDING,
        nullable=False,
    )
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    applied_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    reviewed_at: Mapped["DateTime | None"] = mapped_column(DateTime(timezone=True), nullable=True)

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
    leave_type: Mapped["LeaveType"] = relationship(
        "LeaveType",
        back_populates="applications",
        lazy="selectin",
    )
    reviewed_by: Mapped["Employee | None"] = relationship(  # noqa: F821
        "Employee",
        foreign_keys=[reviewed_by_id],
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<LeaveApplication {self.employee_id} | {self.start_date}→{self.end_date} [{self.status}]>"


class LeaveAllocation(Base, UUIDMixin, TimestampMixin):
    """Per-employee, per-leave-type, per-year balance."""

    __tablename__ = "leave_allocations"
    __table_args__ = (
        UniqueConstraint(
            "employee_id", "leave_type_id", "year", name="uq_leave_allocation_employee_type_year"
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
    leave_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("leave_types.id", ondelete="CASCADE"),
        nullable=False,
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    allocated_days: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    used_days: Mapped[float] = mapped_column(Numeric(5, 2), default=0, nullable=False)
    carried_forward: Mapped[float] = mapped_column(Numeric(5, 2), default=0, nullable=False)

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )
    employee: Mapped["Employee"] = relationship(  # noqa: F821
        "Employee",
        lazy="selectin",
    )
    leave_type: Mapped["LeaveType"] = relationship(
        "LeaveType",
        back_populates="allocations",
        lazy="selectin",
    )

    @property
    def remaining_days(self) -> float:
        return float(self.allocated_days) + float(self.carried_forward) - float(self.used_days)

    def __repr__(self) -> str:
        return f"<LeaveAllocation {self.employee_id} | {self.leave_type_id} | {self.year}>"