import enum
import uuid
from datetime import date as date_type
from datetime import datetime as datetime_type
from datetime import time as time_type

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Enum as SAEnum, UUID

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


# ============================================================
# Enums
# ============================================================
class MonthlyRosterStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"


class DutyAssignmentStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    CANCELLED = "cancelled"


class DutyAssignmentSourceEnum(str, enum.Enum):
    MONTHLY_ROSTER = "monthly_roster"
    DIRECT_ASSIGN = "direct_assign"
    SHIFT_CHANGE = "shift_change"
    SHIFT_EXCHANGE = "shift_exchange"


class DutyBatchStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"


class RosterChangeStatusEnum(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class RosterExchangeStatusEnum(str, enum.Enum):
    PENDING_PEER_APPROVAL = "pending_peer_approval"
    PENDING_MANAGER_APPROVAL = "pending_manager_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


# ============================================================
# 1. Shift Definition
# ============================================================
class Shift(Base, UUIDMixin, TimestampMixin):
    """
    Defines a working shift or designated rest day (weekly off) with time boundaries and tolerances.
    """

    __tablename__ = "shifts"
    __table_args__ = (
        UniqueConstraint("business_id", "code", name="uq_shift_business_code"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    start_time: Mapped[time_type | None] = mapped_column(Time, nullable=True)
    end_time: Mapped[time_type | None] = mapped_column(Time, nullable=True)
    work_hours: Mapped[float] = mapped_column(Float, default=8.0, nullable=False)
    break_duration_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    grace_in_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    grace_out_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    is_night_shift: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_off_day: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    color_code: Mapped[str] = mapped_column(String(20), default="#3B82F6", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Shift {self.code} ({self.name})>"


# ============================================================
# 2. Monthly Roster (Department Schedule Submission & Approval)
# ============================================================
class MonthlyRoster(Base, UUIDMixin, TimestampMixin):
    """
    Department-wide monthly roster boundary.
    """

    __tablename__ = "monthly_rosters"
    __table_args__ = (
        UniqueConstraint("business_id", "department_id", "year", "month", name="uq_monthly_roster_dept_month"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    month: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    status: Mapped[MonthlyRosterStatusEnum] = mapped_column(
        SAEnum(MonthlyRosterStatusEnum, name="monthly_roster_status"),
        default=MonthlyRosterStatusEnum.DRAFT,
        nullable=False,
    )
    submitted_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )
    submitted_at: Mapped[datetime_type | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )
    approved_at: Mapped[datetime_type | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    department: Mapped["Department"] = relationship(  # noqa: F821
        "Department",
        lazy="selectin",
    )
    submitted_by: Mapped["Employee | None"] = relationship(  # noqa: F821
        "Employee",
        foreign_keys=[submitted_by_id],
        lazy="selectin",
    )
    approved_by: Mapped["Employee | None"] = relationship(  # noqa: F821
        "Employee",
        foreign_keys=[approved_by_id],
        lazy="selectin",
    )
    duty_assignments: Mapped[list["DutyAssignment"]] = relationship(
        "DutyAssignment",
        back_populates="monthly_roster",
        cascade="all, delete-orphan",
    )


# ============================================================
# 3. Duty Assignment (Daily Scheduled Shift for an Employee)
# ============================================================
class DutyAssignment(Base, UUIDMixin, TimestampMixin):
    """
    Day-by-day active scheduled duty for an employee.
    """

    __tablename__ = "duty_assignments"
    __table_args__ = (
        UniqueConstraint("business_id", "employee_id", "date", name="uq_duty_assignment_employee_date"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    monthly_roster_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("monthly_rosters.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    batch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("duty_assign_batches.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    shift_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shifts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[DutyAssignmentStatusEnum] = mapped_column(
        SAEnum(DutyAssignmentStatusEnum, name="duty_assignment_status"),
        default=DutyAssignmentStatusEnum.DRAFT,
        nullable=False,
    )
    source: Mapped[DutyAssignmentSourceEnum] = mapped_column(
        SAEnum(DutyAssignmentSourceEnum, name="duty_assignment_source"),
        default=DutyAssignmentSourceEnum.MONTHLY_ROSTER,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    monthly_roster: Mapped["MonthlyRoster | None"] = relationship(
        "MonthlyRoster",
        back_populates="duty_assignments",
    )
    employee: Mapped["Employee"] = relationship(  # noqa: F821
        "Employee",
        foreign_keys=[employee_id],
        lazy="selectin",
    )
    department: Mapped["Department"] = relationship(  # noqa: F821
        "Department",
        lazy="selectin",
    )
    shift: Mapped["Shift"] = relationship(
        "Shift",
        lazy="selectin",
    )


# ============================================================
# 4. Duty Assign Batch (Direct / Bulk Duty Scheduling & Approval)
# ============================================================
class DutyAssignBatch(Base, UUIDMixin, TimestampMixin):
    """
    A submitted batch of direct duty assignments needing managerial approval.
    """

    __tablename__ = "duty_assign_batches"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    start_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    end_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    assigned_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[DutyBatchStatusEnum] = mapped_column(
        SAEnum(DutyBatchStatusEnum, name="duty_batch_status"),
        default=DutyBatchStatusEnum.PENDING_APPROVAL,
        nullable=False,
    )
    submitted_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )
    submitted_at: Mapped[datetime_type] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    approved_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )
    approved_at: Mapped[datetime_type | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    department: Mapped["Department"] = relationship(  # noqa: F821
        "Department",
        lazy="selectin",
    )
    submitted_by: Mapped["Employee | None"] = relationship(  # noqa: F821
        "Employee",
        foreign_keys=[submitted_by_id],
        lazy="selectin",
    )
    approved_by: Mapped["Employee | None"] = relationship(  # noqa: F821
        "Employee",
        foreign_keys=[approved_by_id],
        lazy="selectin",
    )


# ============================================================
# 5. Roster Change Application & Approval
# ============================================================
class RosterChangeApplication(Base, UUIDMixin, TimestampMixin):
    """
    Employee / Supervisor request to alter an assigned shift on a specific date.
    """

    __tablename__ = "roster_change_applications"

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
    duty_assignment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("duty_assignments.id", ondelete="CASCADE"),
        nullable=True,
    )
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    current_shift_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shifts.id", ondelete="RESTRICT"),
        nullable=False,
    )
    requested_shift_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shifts.id", ondelete="RESTRICT"),
        nullable=False,
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[RosterChangeStatusEnum] = mapped_column(
        SAEnum(RosterChangeStatusEnum, name="roster_change_status"),
        default=RosterChangeStatusEnum.PENDING,
        nullable=False,
    )
    applied_at: Mapped[datetime_type] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[datetime_type | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    employee: Mapped["Employee"] = relationship(  # noqa: F821
        "Employee",
        foreign_keys=[employee_id],
        lazy="selectin",
    )
    current_shift: Mapped["Shift"] = relationship(
        "Shift",
        foreign_keys=[current_shift_id],
        lazy="selectin",
    )
    requested_shift: Mapped["Shift"] = relationship(
        "Shift",
        foreign_keys=[requested_shift_id],
        lazy="selectin",
    )
    reviewed_by: Mapped["Employee | None"] = relationship(  # noqa: F821
        "Employee",
        foreign_keys=[reviewed_by_id],
        lazy="selectin",
    )


# ============================================================
# 6. Roster Exchange Application & Approval (Shift Swap)
# ============================================================
class RosterExchangeApplication(Base, UUIDMixin, TimestampMixin):
    """
    Two employees mutual request to swap scheduled shifts.
    Workflow: Proposer submits -> Peer reviews/accepts -> Manager reviews/approves.
    """

    __tablename__ = "roster_exchange_applications"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    requesting_employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    requesting_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    requesting_shift_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shifts.id", ondelete="RESTRICT"),
        nullable=False,
    )
    target_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    target_shift_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shifts.id", ondelete="RESTRICT"),
        nullable=False,
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[RosterExchangeStatusEnum] = mapped_column(
        SAEnum(RosterExchangeStatusEnum, name="roster_exchange_status"),
        default=RosterExchangeStatusEnum.PENDING_PEER_APPROVAL,
        nullable=False,
    )
    applied_at: Mapped[datetime_type] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    peer_reviewed_at: Mapped[datetime_type | None] = mapped_column(DateTime(timezone=True), nullable=True)
    peer_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[datetime_type | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    requesting_employee: Mapped["Employee"] = relationship(  # noqa: F821
        "Employee",
        foreign_keys=[requesting_employee_id],
        lazy="selectin",
    )
    target_employee: Mapped["Employee"] = relationship(  # noqa: F821
        "Employee",
        foreign_keys=[target_employee_id],
        lazy="selectin",
    )
    requesting_shift: Mapped["Shift"] = relationship(
        "Shift",
        foreign_keys=[requesting_shift_id],
        lazy="selectin",
    )
    target_shift: Mapped["Shift"] = relationship(
        "Shift",
        foreign_keys=[target_shift_id],
        lazy="selectin",
    )
    reviewed_by: Mapped["Employee | None"] = relationship(  # noqa: F821
        "Employee",
        foreign_keys=[reviewed_by_id],
        lazy="selectin",
    )


__all__ = [
    "MonthlyRosterStatusEnum",
    "DutyAssignmentStatusEnum",
    "DutyAssignmentSourceEnum",
    "DutyBatchStatusEnum",
    "RosterChangeStatusEnum",
    "RosterExchangeStatusEnum",
    "Shift",
    "MonthlyRoster",
    "DutyAssignment",
    "DutyAssignBatch",
    "RosterChangeApplication",
    "RosterExchangeApplication",
]
