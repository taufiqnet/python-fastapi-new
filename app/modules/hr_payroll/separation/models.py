import enum
import uuid
from datetime import date, datetime
from decimal import Decimal
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
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base
from app.modules.hr_payroll.employees.models import Employee


# ===========================================================================
# Enums
# ===========================================================================
class ResignationStatusEnum(str, enum.Enum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class ResignationReasonEnum(str, enum.Enum):
    CAREER_GROWTH = "career_growth"
    BETTER_COMPENSATION = "better_compensation"
    RELOCATION = "relocation"
    HIGHER_STUDIES = "higher_studies"
    HEALTH_PERSONAL = "health_personal"
    WORK_ENVIRONMENT = "work_environment"
    OTHER = "other"


class SeparationTypeEnum(str, enum.Enum):
    RESIGNATION = "resignation"
    TERMINATION = "termination"
    DISMISSAL = "dismissal"
    RETIREMENT = "retirement"
    RETRENCHMENT = "retrenchment"
    DEATH = "death"


class SeparationStatusEnum(str, enum.Enum):
    INITIATED = "initiated"
    CLEARANCE_IN_PROGRESS = "clearance_in_progress"
    SETTLEMENT_PENDING = "settlement_pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class DepartmentClearanceTypeEnum(str, enum.Enum):
    LINE_MANAGER = "line_manager"
    IT_SYSTEMS = "it_systems"
    FINANCE_ACCOUNTS = "finance_accounts"
    ADMIN_FACILITIES = "admin_facilities"
    HUMAN_RESOURCES = "human_resources"


class ClearanceStatusEnum(str, enum.Enum):
    PENDING = "pending"
    CLEARED = "cleared"
    WAIVED = "waived"
    ISSUE_FLAGGED = "issue_flagged"


class SettlementPaymentStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    VERIFIED = "verified"
    APPROVED = "approved"
    DISBURSED = "disbursed"


class ReleaseLetterStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    REVOKED = "revoked"


# ===========================================================================
# 1. Resignation Application
# ===========================================================================
class ResignationApplication(Base, UUIDMixin, TimestampMixin):
    """Employee voluntary resignation application with notice period tracking."""

    __tablename__ = "resignation_applications"

    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    resignation_number: Mapped[str] = mapped_column(String(40), nullable=False, unique=True, index=True)

    notice_date: Mapped[date] = mapped_column(Date, nullable=False)
    proposed_last_working_day: Mapped[date] = mapped_column(Date, nullable=False)
    approved_last_working_day: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    contractual_notice_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    served_notice_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    shortfall_notice_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    reason_category: Mapped[str] = mapped_column(
        String(40), default=ResignationReasonEnum.CAREER_GROWTH.value, nullable=False
    )
    resignation_letter: Mapped[str] = mapped_column(Text, nullable=False)
    handover_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(
        String(20), default=ResignationStatusEnum.SUBMITTED.value, nullable=False, index=True
    )
    reviewed_by_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id], lazy="selectin")


# ===========================================================================
# 2. Employee Separation Master
# ===========================================================================
class EmployeeSeparation(Base, UUIDMixin, TimestampMixin):
    """Master record coordinating the entire employee offboarding lifecycle."""

    __tablename__ = "employee_separations"

    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    separation_number: Mapped[str] = mapped_column(String(40), nullable=False, unique=True, index=True)

    separation_type: Mapped[str] = mapped_column(
        String(30), default=SeparationTypeEnum.RESIGNATION.value, nullable=False, index=True
    )
    resignation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resignation_applications.id", ondelete="SET NULL"), nullable=True
    )
    disciplinary_case_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    order_date: Mapped[date] = mapped_column(Date, nullable=False)
    last_working_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(
        String(30), default=SeparationStatusEnum.INITIATED.value, nullable=False, index=True
    )
    severance_entitled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    service_duration_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    service_duration_years: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id], lazy="selectin")
    resignation: Mapped[Optional["ResignationApplication"]] = relationship(
        "ResignationApplication", foreign_keys=[resignation_id], lazy="selectin"
    )
    clearances: Mapped[list["DepartmentClearance"]] = relationship(
        "DepartmentClearance", back_populates="separation", cascade="all, delete-orphan", lazy="selectin"
    )
    exit_interview: Mapped[Optional["ExitInterview"]] = relationship(
        "ExitInterview", back_populates="separation", uselist=False, cascade="all, delete-orphan", lazy="selectin"
    )
    settlement: Mapped[Optional["FinalSettlement"]] = relationship(
        "FinalSettlement", back_populates="separation", uselist=False, cascade="all, delete-orphan", lazy="selectin"
    )


# ===========================================================================
# 3. Exit Interview
# ===========================================================================
class ExitInterview(Base, UUIDMixin, TimestampMixin):
    """Exit questionnaire evaluating organization culture and departure drivers."""

    __tablename__ = "exit_interviews"

    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    separation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employee_separations.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )

    interview_date: Mapped[date] = mapped_column(Date, nullable=False)
    interviewer_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    primary_reason_for_leaving: Mapped[str] = mapped_column(String(100), nullable=False)

    rating_culture: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    rating_management: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    rating_growth_opportunities: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    rating_compensation: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    rating_work_life_balance: Mapped[int] = mapped_column(Integer, default=3, nullable=False)

    would_recommend: Mapped[str] = mapped_column(String(20), default="yes", nullable=False)
    proudest_accomplishment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    improvement_suggestions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidential_hr_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="completed", nullable=False)

    separation: Mapped["EmployeeSeparation"] = relationship("EmployeeSeparation", back_populates="exit_interview")
    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id], lazy="selectin")


# ===========================================================================
# 4. Department Clearance (NOC)
# ===========================================================================
class DepartmentClearance(Base, UUIDMixin, TimestampMixin):
    """Individual department sign-off record (Operations, IT, Finance, Admin, HR)."""

    __tablename__ = "department_clearances"

    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    separation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employee_separations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )

    department_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(20), default=ClearanceStatusEnum.PENDING.value, nullable=False, index=True
    )

    cleared_by_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cleared_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    outstanding_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    checklist_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    separation: Mapped["EmployeeSeparation"] = relationship("EmployeeSeparation", back_populates="clearances")
    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id], lazy="selectin")


# ===========================================================================
# 5. Full & Final Settlement (FnF)
# ===========================================================================
class FinalSettlement(Base, UUIDMixin, TimestampMixin):
    """BLA 2006 statutory Full and Final financial settlement ledger."""

    __tablename__ = "final_settlements"

    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    separation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employee_separations.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    settlement_number: Mapped[str] = mapped_column(String(40), nullable=False, unique=True, index=True)
    settlement_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Payables (Earnings & Statutory Entitlements)
    unpaid_salary_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unpaid_salary_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    leave_encashment_days: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    leave_encashment_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    gratuity_years: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gratuity_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    provident_fund_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    severance_pay_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    bonus_arrears_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    other_payable_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_payable_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    # Deductions & Recoveries
    notice_shortfall_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notice_shortfall_deduction: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    loan_advance_deduction: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    asset_damage_deduction: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    clearance_charge_deduction: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    tax_withholding_deduction: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_deduction_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    # Net Remuneration
    net_payable_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    payment_status: Mapped[str] = mapped_column(
        String(20), default=SettlementPaymentStatusEnum.DRAFT.value, nullable=False, index=True
    )
    payment_method: Mapped[str] = mapped_column(String(40), default="bank_transfer", nullable=False)
    payment_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    disbursed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    separation: Mapped["EmployeeSeparation"] = relationship("EmployeeSeparation", back_populates="settlement")
    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id], lazy="selectin")


# ===========================================================================
# 6. Relieving & Release Letter
# ===========================================================================
class ReleaseLetter(Base, UUIDMixin, TimestampMixin):
    """Official Relieving Certificate verifying discharge of duties with no liabilities."""

    __tablename__ = "release_letters"

    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    separation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employee_separations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    letter_number: Mapped[str] = mapped_column(String(40), nullable=False, unique=True, index=True)

    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    effective_exit_date: Mapped[date] = mapped_column(Date, nullable=False)
    designation: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    status: Mapped[str] = mapped_column(
        String(20), default=ReleaseLetterStatusEnum.ISSUED.value, nullable=False, index=True
    )
    letter_content: Mapped[str] = mapped_column(Text, nullable=False)

    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id], lazy="selectin")
