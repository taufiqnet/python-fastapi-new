import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.modules.hr_payroll.performance.models import (
    CycleStatusEnum,
    CycleTypeEnum,
    GoalCategoryEnum,
    GoalMetricEnum,
    GoalStatusEnum,
)


# --------------------------- Cycles ---------------------------
class CycleBase(BaseModel):
    title: str = Field(..., max_length=200)
    cycle_type: CycleTypeEnum = CycleTypeEnum.ANNUAL
    start_date: date
    end_date: date
    self_review_deadline: Optional[date] = None
    manager_review_deadline: Optional[date] = None


class CycleCreate(CycleBase):
    pass


class CycleUpdate(BaseModel):
    title: Optional[str] = None
    cycle_type: Optional[CycleTypeEnum] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    self_review_deadline: Optional[date] = None
    manager_review_deadline: Optional[date] = None
    status: Optional[CycleStatusEnum] = None


class CycleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    title: str
    cycle_type: str
    start_date: date
    end_date: date
    self_review_deadline: Optional[date] = None
    manager_review_deadline: Optional[date] = None
    status: str
    created_at: Optional[datetime] = None


# --------------------------- Goals ---------------------------
class GoalCreate(BaseModel):
    employee_id: uuid.UUID
    cycle_id: uuid.UUID
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    category: GoalCategoryEnum = GoalCategoryEnum.OPERATIONAL
    metric_type: GoalMetricEnum = GoalMetricEnum.PERCENTAGE
    target_value: Decimal = Decimal("0")
    weightage: Decimal = Field(Decimal("0"), ge=0, le=100)
    due_date: Optional[date] = None


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[GoalCategoryEnum] = None
    target_value: Optional[Decimal] = None
    achieved_value: Optional[Decimal] = None
    weightage: Optional[Decimal] = Field(None, ge=0, le=100)
    due_date: Optional[date] = None
    status: Optional[GoalStatusEnum] = None
    self_rating: Optional[Decimal] = Field(None, ge=0, le=5)
    manager_rating: Optional[Decimal] = Field(None, ge=0, le=5)
    self_comments: Optional[str] = None
    manager_comments: Optional[str] = None


class GoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    cycle_id: uuid.UUID
    employee_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    category: str
    metric_type: str
    target_value: Decimal
    achieved_value: Decimal
    weightage: Decimal
    due_date: Optional[date] = None
    status: str
    achievement_pct: Optional[Decimal] = None
    self_rating: Optional[Decimal] = None
    manager_rating: Optional[Decimal] = None
    self_comments: Optional[str] = None
    manager_comments: Optional[str] = None


# --------------------------- Appraisals ---------------------------
class AppraisalCreate(BaseModel):
    employee_id: uuid.UUID
    cycle_id: uuid.UUID
    reviewer_id: Optional[uuid.UUID] = None


class SelfReviewIn(BaseModel):
    self_evaluation_text: str
    self_overall_score: Decimal = Field(..., ge=1, le=5)


class ManagerReviewIn(BaseModel):
    manager_evaluation_text: str
    manager_overall_score: Decimal = Field(..., ge=1, le=5)
    promotion_recommended: bool = False
    recommended_job_title_id: Optional[uuid.UUID] = None
    increment_recommended: bool = False
    recommended_increment_pct: Optional[Decimal] = Field(None, ge=0, le=100)
    pip_recommended: bool = False


class CalibrateIn(BaseModel):
    calibrated_score: Decimal = Field(..., ge=1, le=5)
    discussion_date: Optional[date] = None


class AppraisalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    cycle_id: uuid.UUID
    reviewer_id: Optional[uuid.UUID] = None
    employee_name: Optional[str] = None
    cycle_title: Optional[str] = None
    self_evaluation_text: Optional[str] = None
    self_overall_score: Optional[Decimal] = None
    manager_evaluation_text: Optional[str] = None
    manager_overall_score: Optional[Decimal] = None
    calibrated_score: Optional[Decimal] = None
    final_rating_label: Optional[str] = None
    status: str
    promotion_recommended: bool
    recommended_job_title_id: Optional[uuid.UUID] = None
    increment_recommended: bool
    recommended_increment_pct: Optional[Decimal] = None
    pip_recommended: bool
    discussion_date: Optional[date] = None
    employee_acknowledged_at: Optional[datetime] = None


class PerformanceStats(BaseModel):
    active_cycles: int = 0
    total_goals: int = 0
    goals_completed: int = 0
    goals_at_risk: int = 0
    appraisals_pending: int = 0
    appraisals_completed: int = 0
