import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.modules.hr_payroll.lifecycle.models import (
    IncrementTypeEnum,
    MovementTypeEnum,
    ProbationRecommendationEnum,
    SanctionTypeEnum,
)


# ============================ Probation ============================
class ProbationDeskRow(BaseModel):
    employee_id: uuid.UUID
    employee_name: str
    employee_code: Optional[str] = None
    department_name: Optional[str] = None
    job_title_name: Optional[str] = None
    start_date: Optional[date] = None
    probation_end_date: Optional[date] = None
    days_remaining: Optional[int] = None
    confirmation_date: Optional[date] = None
    is_overdue: bool = False


class ProbationReviewCreate(BaseModel):
    employee_id: uuid.UUID
    reviewer_id: Optional[uuid.UUID] = None
    review_date: date = Field(default_factory=date.today)
    performance_rating: int = Field(3, ge=1, le=5)
    conduct_rating: int = Field(3, ge=1, le=5)
    punctuality_rating: int = Field(3, ge=1, le=5)
    recommendation: ProbationRecommendationEnum
    extension_months: Optional[int] = Field(None, ge=1, le=6)
    effective_confirmation_date: Optional[date] = None
    comments: Optional[str] = None

    @model_validator(mode="after")
    def _check_extension(self):
        if self.recommendation == ProbationRecommendationEnum.EXTEND and not self.extension_months:
            raise ValueError("extension_months is required when recommending a probation extension.")
        return self


class ProbationDecision(BaseModel):
    approve: bool = True
    notes: Optional[str] = None


class ProbationReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    employee_name: Optional[str] = None
    reviewer_id: Optional[uuid.UUID] = None
    review_number: str
    due_date: Optional[date] = None
    review_date: date
    performance_rating: int
    conduct_rating: int
    punctuality_rating: int
    recommendation: str
    extension_months: Optional[int] = None
    effective_confirmation_date: Optional[date] = None
    comments: Optional[str] = None
    status: str
    decided_at: Optional[datetime] = None
    letter_reference_no: Optional[str] = None


# ============================ Career Movements ============================
class MovementCreate(BaseModel):
    employee_id: uuid.UUID
    action_type: MovementTypeEnum
    effective_date: date
    reason_category: str = "annual_appraisal"
    justification_notes: Optional[str] = None
    appraisal_id: Optional[uuid.UUID] = None
    # promotion
    new_job_title_id: Optional[uuid.UUID] = None
    new_salary_grade_id: Optional[uuid.UUID] = None
    # transfer
    new_branch_id: Optional[uuid.UUID] = None
    new_department_id: Optional[uuid.UUID] = None
    new_manager_id: Optional[uuid.UUID] = None
    # increment
    increment_type: Optional[IncrementTypeEnum] = None
    increment_value: Optional[Decimal] = Field(None, gt=0)

    @model_validator(mode="after")
    def _check_payload(self):
        t = self.action_type
        if t in (MovementTypeEnum.PROMOTION, MovementTypeEnum.PROMOTION_INCREMENT):
            if not self.new_job_title_id and not self.new_salary_grade_id:
                raise ValueError("A promotion requires a new job title or a new salary grade.")
        if t in (MovementTypeEnum.INCREMENT, MovementTypeEnum.PROMOTION_INCREMENT):
            if not self.increment_type or not self.increment_value:
                raise ValueError("An increment requires increment_type and increment_value.")
        if t == MovementTypeEnum.TRANSFER:
            if not (self.new_branch_id or self.new_department_id or self.new_manager_id):
                raise ValueError("A transfer requires a new branch, department or reporting manager.")
        return self


class MovementDecision(BaseModel):
    approve: bool = True
    rejection_reason: Optional[str] = None


class MovementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    employee_name: Optional[str] = None
    movement_number: str
    action_type: str
    status: str
    effective_date: date
    reason_category: str
    justification_notes: Optional[str] = None
    previous_job_title_id: Optional[uuid.UUID] = None
    new_job_title_id: Optional[uuid.UUID] = None
    previous_job_title_name: Optional[str] = None
    new_job_title_name: Optional[str] = None
    previous_salary_grade_id: Optional[uuid.UUID] = None
    new_salary_grade_id: Optional[uuid.UUID] = None
    previous_branch_id: Optional[uuid.UUID] = None
    new_branch_id: Optional[uuid.UUID] = None
    previous_department_id: Optional[uuid.UUID] = None
    new_department_id: Optional[uuid.UUID] = None
    previous_manager_id: Optional[uuid.UUID] = None
    new_manager_id: Optional[uuid.UUID] = None
    increment_type: Optional[str] = None
    increment_value: Optional[Decimal] = None
    previous_basic_salary: Optional[Decimal] = None
    new_basic_salary: Optional[Decimal] = None
    previous_gross_salary: Optional[Decimal] = None
    new_gross_salary: Optional[Decimal] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    letter_reference_no: Optional[str] = None


class IncrementPreview(BaseModel):
    employee_id: uuid.UUID
    previous_basic_salary: Decimal
    new_basic_salary: Decimal
    previous_gross_salary: Decimal
    new_gross_salary: Decimal
    previous_net_salary: Decimal
    new_net_salary: Decimal


class IncrementPreviewIn(BaseModel):
    employee_id: uuid.UUID
    increment_type: IncrementTypeEnum
    increment_value: Decimal = Field(..., gt=0)


# ============================ Disciplinary ============================
class CaseCreate(BaseModel):
    employee_id: uuid.UUID
    incident_date: date
    allegation_title: str = Field(..., max_length=255)
    allegation_details: Optional[str] = None
    allegation_category: str = "misconduct"
    statutory_clause: Optional[str] = None
    severity_level: str = "minor"


class ShowCauseIssue(BaseModel):
    issue_date: date = Field(default_factory=date.today)
    response_deadline: Optional[date] = None
    notice_content: Optional[str] = None


class ExplanationIn(BaseModel):
    employee_explanation: str
    explanation_received_date: date = Field(default_factory=date.today)
    explanation_accepted: Optional[bool] = None


class ActionIssue(BaseModel):
    sanction_type: SanctionTypeEnum
    effective_date: date = Field(default_factory=date.today)
    suspension_days: Optional[int] = Field(None, ge=1)
    subsistence_allowance_pct: Optional[Decimal] = Field(None, ge=0, le=100)
    remarks: Optional[str] = None


class NoticeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    notice_number: str
    issue_date: date
    response_deadline: date
    notice_content: Optional[str] = None
    employee_explanation: Optional[str] = None
    explanation_received_date: Optional[date] = None
    explanation_accepted: Optional[bool] = None


class ActionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sanction_type: str
    effective_date: date
    suspension_days: Optional[int] = None
    subsistence_allowance_pct: Optional[Decimal] = None
    remarks: Optional[str] = None
    letter_reference_no: Optional[str] = None


class CaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    employee_name: Optional[str] = None
    case_number: str
    incident_date: date
    allegation_title: str
    allegation_details: Optional[str] = None
    allegation_category: str
    statutory_clause: Optional[str] = None
    severity_level: str
    current_stage: str
    notices: List[NoticeOut] = []
    actions: List[ActionOut] = []


class LifecycleStats(BaseModel):
    on_probation: int = 0
    probation_due_30_days: int = 0
    probation_overdue: int = 0
    pending_movements: int = 0
    open_disciplinary_cases: int = 0
