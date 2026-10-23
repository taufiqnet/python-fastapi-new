import enum
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
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
class ProbationRecommendationEnum(str, enum.Enum):
    CONFIRM = "confirm"
    EXTEND = "extend_probation"
    TERMINATE = "terminate"


class ProbationStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"


class MovementTypeEnum(str, enum.Enum):
    PROMOTION = "promotion"
    INCREMENT = "increment"
    TRANSFER = "transfer"
    PROMOTION_INCREMENT = "promotion_and_increment"


class MovementStatusEnum(str, enum.Enum):
    PENDING_APPROVAL = "pending_approval"
    APPLIED = "applied"
    REJECTED = "rejected"


class IncrementTypeEnum(str, enum.Enum):
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"


class CaseStageEnum(str, enum.Enum):
    REPORTED = "reported"
    SHOW_CAUSE_ISSUED = "show_cause_issued"
    EXPLANATION_RECEIVED = "explanation_received"
    CLOSED = "closed"


class SanctionTypeEnum(str, enum.Enum):
    VERBAL_COUNSELING = "verbal_counseling"
    WRITTEN_WARNING = "written_warning"
    FINAL_WARNING = "final_warning"
    SUSPENSION = "suspension"
    WITHHOLD_INCREMENT = "withholding_increment"
    DEMOTION = "demotion"
    DISMISSAL = "dismissal"
    NO_ACTION = "no_action"


# ===========================================================================
# 1. Probation Review
# ===========================================================================
class ProbationReview(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "probation_reviews"

    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reviewer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )
    review_number: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    review_date: Mapped[date] = mapped_column(Date, nullable=False)
    performance_rating: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    conduct_rating: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    punctuality_rating: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    recommendation: Mapped[str] = mapped_column(String(30), nullable=False)
    extension_months: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    effective_confirmation_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=ProbationStatusEnum.SUBMITTED.value, nullable=False, index=True)
    decided_by_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    letter_reference_no: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id])


# ===========================================================================
# 2. Career Movement (promotion / increment / transfer)
# ===========================================================================
class CareerMovement(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "career_movements"

    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    movement_number: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    action_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default=MovementStatusEnum.PENDING_APPROVAL.value, nullable=False, index=True)
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason_category: Mapped[str] = mapped_column(String(40), default="annual_appraisal", nullable=False)
    justification_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    appraisal_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Promotion
    previous_job_title_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    new_job_title_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    previous_salary_grade_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    new_salary_grade_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Transfer
    previous_branch_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    new_branch_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    previous_department_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    new_department_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    previous_manager_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    new_manager_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Increment
    increment_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    increment_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    previous_basic_salary: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    new_basic_salary: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    previous_gross_salary: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    new_gross_salary: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)

    approver_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    letter_reference_no: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id])


# ===========================================================================
# 3. Disciplinary (BLA 2006 sec. 23-24)
# ===========================================================================
class DisciplinaryCase(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "disciplinary_cases"

    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    case_number: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    incident_date: Mapped[date] = mapped_column(Date, nullable=False)
    allegation_title: Mapped[str] = mapped_column(String(255), nullable=False)
    allegation_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    allegation_category: Mapped[str] = mapped_column(String(40), default="misconduct", nullable=False)
    statutory_clause: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    severity_level: Mapped[str] = mapped_column(String(20), default="minor", nullable=False)
    current_stage: Mapped[str] = mapped_column(String(30), default=CaseStageEnum.REPORTED.value, nullable=False, index=True)

    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id])
    notices: Mapped[list["ShowCauseNotice"]] = relationship(
        "ShowCauseNotice", back_populates="case", cascade="all, delete-orphan", order_by="ShowCauseNotice.issue_date"
    )
    actions: Mapped[list["DisciplinaryActionLog"]] = relationship(
        "DisciplinaryActionLog", back_populates="case", cascade="all, delete-orphan", order_by="DisciplinaryActionLog.effective_date"
    )


class ShowCauseNotice(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "show_cause_notices"

    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("disciplinary_cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    notice_number: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    response_deadline: Mapped[date] = mapped_column(Date, nullable=False)
    notice_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    employee_explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    explanation_received_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    explanation_accepted: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    case: Mapped["DisciplinaryCase"] = relationship("DisciplinaryCase", back_populates="notices")


class DisciplinaryActionLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "disciplinary_action_logs"

    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("disciplinary_cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sanction_type: Mapped[str] = mapped_column(String(30), nullable=False)
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    suspension_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    subsistence_allowance_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    letter_reference_no: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    issued_by_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    case: Mapped["DisciplinaryCase"] = relationship("DisciplinaryCase", back_populates="actions")
