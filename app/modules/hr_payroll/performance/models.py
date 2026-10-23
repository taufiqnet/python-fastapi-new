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
    Index,
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


class CycleTypeEnum(str, enum.Enum):
    ANNUAL = "annual"
    SEMI_ANNUAL = "semi_annual"
    QUARTERLY = "quarterly"
    PROBATIONARY = "probationary"


class CycleStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    GOAL_SETTING = "goal_setting"
    IN_REVIEW = "in_review"
    CALIBRATING = "calibrating"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class GoalCategoryEnum(str, enum.Enum):
    OPERATIONAL = "operational"
    FINANCIAL = "financial"
    STRATEGIC = "strategic"
    LEARNING = "learning_development"


class GoalMetricEnum(str, enum.Enum):
    PERCENTAGE = "percentage"
    CURRENCY = "currency"
    COUNT = "count"
    BOOLEAN = "boolean"


class GoalStatusEnum(str, enum.Enum):
    NOT_STARTED = "not_started"
    ON_TRACK = "on_track"
    AT_RISK = "at_risk"
    COMPLETED = "completed"
    DEFERRED = "deferred"


class AppraisalStatusEnum(str, enum.Enum):
    SELF_REVIEW_PENDING = "self_review_pending"
    MANAGER_REVIEW_PENDING = "manager_review_pending"
    CALIBRATION_PENDING = "calibration_pending"
    ACKNOWLEDGEMENT_PENDING = "acknowledgement_pending"
    COMPLETED = "completed"


class AppraisalCycle(Base, UUIDMixin, TimestampMixin):
    """Performance review cycle (annual / half-yearly / quarterly / probationary)."""

    __tablename__ = "performance_cycles"

    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    cycle_type: Mapped[str] = mapped_column(String(30), default=CycleTypeEnum.ANNUAL.value, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    self_review_deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    manager_review_deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default=CycleStatusEnum.DRAFT.value, nullable=False, index=True)

    goals: Mapped[list["EmployeeGoal"]] = relationship("EmployeeGoal", back_populates="cycle", cascade="all, delete-orphan")
    appraisals: Mapped[list["PerformanceAppraisal"]] = relationship(
        "PerformanceAppraisal", back_populates="cycle", cascade="all, delete-orphan"
    )


class EmployeeGoal(Base, UUIDMixin, TimestampMixin):
    """Individual goal / KPI with weighted target-vs-achievement tracking."""

    __tablename__ = "employee_goals"
    __table_args__ = (Index("ix_employee_goals_emp_cycle", "employee_id", "cycle_id"),)

    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cycle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("performance_cycles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(30), default=GoalCategoryEnum.OPERATIONAL.value, nullable=False)
    metric_type: Mapped[str] = mapped_column(String(20), default=GoalMetricEnum.PERCENTAGE.value, nullable=False)
    target_value: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    achieved_value: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    weightage: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0, nullable=False)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=GoalStatusEnum.NOT_STARTED.value, nullable=False)
    self_rating: Mapped[Optional[Decimal]] = mapped_column(Numeric(3, 2), nullable=True)
    manager_rating: Mapped[Optional[Decimal]] = mapped_column(Numeric(3, 2), nullable=True)
    self_comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    manager_comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    cycle: Mapped["AppraisalCycle"] = relationship("AppraisalCycle", back_populates="goals")
    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id])


class PerformanceAppraisal(Base, UUIDMixin, TimestampMixin):
    """3-stage appraisal: self review -> manager review -> calibration -> acknowledgement."""

    __tablename__ = "performance_appraisals"
    __table_args__ = (Index("ix_perf_appraisal_emp_cycle", "employee_id", "cycle_id", unique=True),)

    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cycle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("performance_cycles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reviewer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )

    self_evaluation_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    self_overall_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(3, 2), nullable=True)
    manager_evaluation_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    manager_overall_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(3, 2), nullable=True)
    calibrated_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(3, 2), nullable=True)
    final_rating_label: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), default=AppraisalStatusEnum.SELF_REVIEW_PENDING.value, nullable=False, index=True
    )

    promotion_recommended: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    recommended_job_title_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("job_titles.id", ondelete="SET NULL"), nullable=True
    )
    increment_recommended: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    recommended_increment_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    pip_recommended: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    discussion_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    employee_acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    cycle: Mapped["AppraisalCycle"] = relationship("AppraisalCycle", back_populates="appraisals")
    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id])
