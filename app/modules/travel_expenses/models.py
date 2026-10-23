import enum
import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
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


class TravelTypeEnum(str, enum.Enum):
    DOMESTIC = "domestic"
    INTERNATIONAL = "international"


class TravelStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class AdvanceStatusEnum(str, enum.Enum):
    UNSETTLED = "unsettled"
    PARTIALLY_SETTLED = "partially_settled"
    FULLY_SETTLED = "fully_settled"


class ClaimTypeEnum(str, enum.Enum):
    TRAVEL_SETTLEMENT = "travel_settlement"
    DAILY_CONVEYANCE = "daily_conveyance"
    GENERAL_EXPENSE = "general_expense"


class ClaimStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    MANAGER_APPROVED = "manager_approved"
    FINANCE_APPROVED = "finance_approved"
    SETTLED = "settled"
    REJECTED = "rejected"


class ExpenseCategoryEnum(str, enum.Enum):
    TRAVEL_FARE = "travel_fare"
    HOTEL_LODGING = "hotel_lodging"
    DAILY_ALLOWANCE = "daily_allowance"
    LOCAL_CONVEYANCE = "local_conveyance"
    MEALS = "meals"
    OFFICE_SUPPLIES = "office_supplies"
    CLIENT_ENTERTAINMENT = "client_entertainment"
    COMMUNICATION = "communication"
    OTHER = "other"


# ===========================================================================
# 1. Travel Requests
# ===========================================================================
class TravelRequest(Base, UUIDMixin, TimestampMixin):
    """Business travel requisition submitted by an employee."""

    __tablename__ = "travel_requests"
    __table_args__ = (
        UniqueConstraint("business_id", "request_number", name="uq_travel_request_num"),
        Index("ix_travel_req_biz_emp", "business_id", "employee_id"),
        Index("ix_travel_req_biz_status", "business_id", "status"),
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
    request_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    purpose: Mapped[str] = mapped_column(Text, nullable=False)
    travel_type: Mapped[str] = mapped_column(
        String(30), default=TravelTypeEnum.DOMESTIC.value, nullable=False
    )
    origin: Mapped[str] = mapped_column(String(150), nullable=False)
    destination: Mapped[str] = mapped_column(String(150), nullable=False)
    departure_date: Mapped[date] = mapped_column(Date, nullable=False)
    return_date: Mapped[date] = mapped_column(Date, nullable=False)
    estimated_cost: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)

    advance_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    advance_amount_requested: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)

    status: Mapped[str] = mapped_column(
        String(30), default=TravelStatusEnum.PENDING_APPROVAL.value, nullable=False, index=True
    )
    approved_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")
    approver: Mapped[Optional["User"]] = relationship("User", lazy="selectin")
    advance: Mapped[Optional["TravelAdvance"]] = relationship(
        "TravelAdvance", back_populates="travel_request", uselist=False, cascade="all, delete-orphan"
    )
    settlement_claim: Mapped[Optional["ExpenseSettlementClaim"]] = relationship(
        "ExpenseSettlementClaim", back_populates="travel_request", uselist=False
    )


# ===========================================================================
# 2. Travel Advances
# ===========================================================================
class TravelAdvance(Base, UUIDMixin, TimestampMixin):
    """Pre-trip cash or bank advance issued to an employee for approved business travel."""

    __tablename__ = "travel_advances"
    __table_args__ = (
        UniqueConstraint("business_id", "advance_number", name="uq_travel_advance_num"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    travel_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("travel_requests.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    advance_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    amount_approved: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    disbursed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    disbursed_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    disbursement_method: Mapped[str] = mapped_column(String(50), default="bank_transfer", nullable=False)
    payment_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    settlement_status: Mapped[str] = mapped_column(
        String(30), default=AdvanceStatusEnum.UNSETTLED.value, nullable=False, index=True
    )

    # Relationships
    travel_request: Mapped["TravelRequest"] = relationship("TravelRequest", back_populates="advance")
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")
    disbursed_by: Mapped[Optional["User"]] = relationship("User", lazy="selectin")


# ===========================================================================
# 3. Daily Allowance (DA) & Conveyance Policies
# ===========================================================================
class DAConveyancePolicy(Base, UUIDMixin, TimestampMixin):
    """Grade and City-tier per-diem daily allowances and local mileage rates."""

    __tablename__ = "da_conveyance_policies"
    __table_args__ = (
        UniqueConstraint("business_id", "grade_name", "city_tier", name="uq_da_policy_grade_tier"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    grade_name: Mapped[str] = mapped_column(String(100), nullable=False)
    city_tier: Mapped[str] = mapped_column(
        String(50), default="tier_1_dhaka_ctg", nullable=False
    )
    daily_allowance_rate: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    hotel_limit_per_night: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    conveyance_rate_per_km: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


# ===========================================================================
# 4. Expense Settlement & General Claims
# ===========================================================================
class ExpenseSettlementClaim(Base, UUIDMixin, TimestampMixin):
    """Unified expense submission: general claims, conveyance, and travel settlements."""

    __tablename__ = "expense_settlement_claims"
    __table_args__ = (
        UniqueConstraint("business_id", "claim_number", name="uq_expense_claim_num"),
        Index("ix_exp_claim_biz_emp", "business_id", "employee_id"),
        Index("ix_exp_claim_biz_status", "business_id", "status"),
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
    travel_request_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("travel_requests.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    claim_type: Mapped[str] = mapped_column(
        String(40), default=ClaimTypeEnum.GENERAL_EXPENSE.value, nullable=False, index=True
    )
    claim_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    claim_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)

    total_claim_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)
    advance_deducted: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)
    # Net payable: positive = company pays employee, negative = employee refunds company
    net_payable_or_refundable: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)

    status: Mapped[str] = mapped_column(
        String(30), default=ClaimStatusEnum.SUBMITTED.value, nullable=False, index=True
    )
    approved_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approval_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    settlement_channel: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # bank_transfer, cash, payroll_adjustment
    payment_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")
    approver: Mapped[Optional["User"]] = relationship("User", lazy="selectin")
    travel_request: Mapped[Optional["TravelRequest"]] = relationship(
        "TravelRequest", back_populates="settlement_claim"
    )
    lines: Mapped[list["ExpenseClaimLine"]] = relationship(
        "ExpenseClaimLine", back_populates="claim", cascade="all, delete-orphan", lazy="selectin"
    )


class ExpenseClaimLine(Base, UUIDMixin, TimestampMixin):
    """Itemized receipts and mileage claims in an expense submission."""

    __tablename__ = "expense_claim_lines"

    claim_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("expense_settlement_claims.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)
    category: Mapped[str] = mapped_column(
        String(40), default=ExpenseCategoryEnum.OTHER.value, nullable=False
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    conveyance_km: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    conveyance_mode: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    receipt_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    claim: Mapped["ExpenseSettlementClaim"] = relationship("ExpenseSettlementClaim", back_populates="lines")
