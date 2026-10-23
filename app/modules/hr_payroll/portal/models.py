import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID

from app.common.models import TimestampMixin, UUIDMixin
from app.core.identity.models import User
from app.database import Base
from app.modules.hr_payroll.employees.models import Employee


# ===========================================================================
# 1. Profile Update Requests
# ===========================================================================
class ProfileUpdateRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ProfileUpdateRequest(Base, UUIDMixin, TimestampMixin):
    """Employee-submitted changes to their personal and banking information."""

    __tablename__ = "portal_profile_update_requests"

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
    requested_changes: Mapped[str] = mapped_column(
        Text, nullable=False
    )  # JSON-encoded dictionary of field changes
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default=ProfileUpdateRequestStatus.PENDING.value, nullable=False, index=True
    )
    reviewed_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")  # noqa: F821
    reviewer: Mapped["User"] = relationship("User", lazy="selectin")  # noqa: F821


# ===========================================================================
# 2. Attendance Correction Requests
# ===========================================================================
class AttendanceCorrectionRequest(Base, UUIDMixin, TimestampMixin):
    """Missed punch, late excuse, or work-on-holiday adjustment request."""

    __tablename__ = "portal_attendance_corrections"

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
    attendance_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    request_type: Mapped[str] = mapped_column(
        String(50), default="missed_punch", nullable=False
    )  # missed_punch, late_excuse, work_on_holiday
    requested_time_in: Mapped[str | None] = mapped_column(String(50), nullable=True)  # HH:MM or ISO
    requested_time_out: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    supporting_document_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False, index=True
    )  # pending, approved, rejected
    reviewed_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")  # noqa: F821
    reviewer: Mapped["User"] = relationship("User", lazy="selectin")  # noqa: F821


# ===========================================================================
# 3. Employee Loans & Salary Advances
# ===========================================================================
class EmployeeLoan(Base, UUIDMixin, TimestampMixin):
    """Salary advances and personal loans with installment deduction schedules."""

    __tablename__ = "portal_employee_loans"

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
    loan_type: Mapped[str] = mapped_column(
        String(50), default="salary_advance", nullable=False
    )  # salary_advance, personal_loan, emergency_loan
    principal_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    monthly_installment_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_installments: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    disbursed_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)
    remaining_balance: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)
    repayment_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False, index=True
    )  # pending, approved, disbursed, rejected, completed
    approved_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    disbursed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")  # noqa: F821
    approver: Mapped["User"] = relationship("User", lazy="selectin")  # noqa: F821


# ===========================================================================
# 4. Expense Reimbursement Claims
# ===========================================================================
class ExpenseClaim(Base, UUIDMixin, TimestampMixin):
    """Employee business expense reimbursement submission."""

    __tablename__ = "portal_expense_claims"

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
    claim_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    claim_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="submitted", nullable=False, index=True
    )  # draft, submitted, approved, rejected, reimbursed
    reviewer_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    payment_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reimbursed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")  # noqa: F821
    reviewer: Mapped["User"] = relationship("User", lazy="selectin")  # noqa: F821
    items: Mapped[list["ExpenseClaimItem"]] = relationship(
        "ExpenseClaimItem",
        back_populates="claim",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class ExpenseClaimItem(Base, UUIDMixin, TimestampMixin):
    """Line items inside an expense claim with receipts."""

    __tablename__ = "portal_expense_claim_items"

    claim_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("portal_expense_claims.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)
    category: Mapped[str] = mapped_column(
        String(50), default="travel", nullable=False
    )  # travel, meals, hotel, supplies, training, other
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    receipt_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    claim: Mapped["ExpenseClaim"] = relationship("ExpenseClaim", back_populates="items")


# ===========================================================================
# 5. Official Letter Requests
# ===========================================================================
class OfficialLetterRequest(Base, UUIDMixin, TimestampMixin):
    """Request for official letterhead documents (NOC, Salary Certificate, etc)."""

    __tablename__ = "portal_official_letter_requests"

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
    letter_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # noc_visa, noc_travel, salary_certificate, experience_letter, job_confirmation
    purpose: Mapped[str] = mapped_column(Text, nullable=False)
    addressed_to: Mapped[str | None] = mapped_column(String(255), nullable=True)
    travel_country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    travel_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    travel_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False, index=True
    )  # pending, approved, generated, rejected
    generated_file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    reviewed_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")  # noqa: F821
    reviewer: Mapped["User"] = relationship("User", lazy="selectin")  # noqa: F821


# ===========================================================================
# 6. Company Policy & Handbook Directory
# ===========================================================================
class CompanyPolicy(Base, UUIDMixin, TimestampMixin):
    """Company policies, rules, and handbooks."""

    __tablename__ = "portal_company_policies"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(
        String(50), default="hr_policy", nullable=False, index=True
    )  # hr_policy, code_of_conduct, leave_rules, it_security, health_safety, benefits
    version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)
    effective_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachment_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_mandatory_acknowledgement: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    acknowledgements: Mapped[list["PolicyAcknowledgement"]] = relationship(
        "PolicyAcknowledgement",
        back_populates="policy",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class PolicyAcknowledgement(Base, UUIDMixin, TimestampMixin):
    """Employee acknowledgement of reading mandatory policy."""

    __tablename__ = "portal_policy_acknowledgements"
    __table_args__ = (
        UniqueConstraint("policy_id", "employee_id", name="uq_policy_ack_employee"),
    )

    policy_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("portal_company_policies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    acknowledged_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Relationships
    policy: Mapped["CompanyPolicy"] = relationship("CompanyPolicy", back_populates="acknowledgements")
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")  # noqa: F821


# ===========================================================================
# 7. HR Helpdesk & Ticketing System
# ===========================================================================
class HRTicket(Base, UUIDMixin, TimestampMixin):
    """Helpdesk support tickets raised by employees."""

    __tablename__ = "portal_hr_tickets"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ticket_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category: Mapped[str] = mapped_column(
        String(50), default="general", nullable=False, index=True
    )  # payroll, leave, benefits, workplace, it, general
    priority: Mapped[str] = mapped_column(
        String(20), default="medium", nullable=False, index=True
    )  # low, medium, high, urgent
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    attachment_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="open", nullable=False, index=True
    )  # open, in_progress, resolved, closed
    assigned_to_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")  # noqa: F821
    assigned_to: Mapped["User"] = relationship("User", lazy="selectin")  # noqa: F821
    comments: Mapped[list["HRTicketComment"]] = relationship(
        "HRTicketComment",
        back_populates="ticket",
        cascade="all, delete-orphan",
        order_by="HRTicketComment.created_at",
        lazy="selectin",
    )


class HRTicketComment(Base, UUIDMixin, TimestampMixin):
    """Threaded replies between employee and HR support staff."""

    __tablename__ = "portal_hr_ticket_comments"

    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("portal_hr_tickets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    is_hr_staff: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    attachment_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    ticket: Mapped["HRTicket"] = relationship("HRTicket", back_populates="comments")
    author: Mapped["User"] = relationship("User", lazy="selectin")  # noqa: F821
