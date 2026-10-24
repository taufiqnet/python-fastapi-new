import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.modules.hr_payroll.separation.models import (
    ClearanceStatusEnum,
    DepartmentClearanceTypeEnum,
    ReleaseLetterStatusEnum,
    ResignationReasonEnum,
    ResignationStatusEnum,
    SeparationStatusEnum,
    SeparationTypeEnum,
    SettlementPaymentStatusEnum,
)


# ── Nested Summaries ───────────────────────────────────────────────────
class EmployeeSeparationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: str
    first_name: str
    last_name: Optional[str] = None
    work_email: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    start_date: Optional[date] = None

    @model_validator(mode="before")
    @classmethod
    def extract_from_orm(cls, data):
        if hasattr(data, "id"):
            dept_name = getattr(data, "department_name", None)
            title_name = getattr(data, "job_title_name", None)
            return {
                "id": data.id,
                "employee_id": data.employee_id,
                "first_name": data.first_name,
                "last_name": data.last_name,
                "work_email": getattr(data, "work_email", None),
                "phone": getattr(data, "phone", None),
                "department": dept_name,
                "designation": title_name,
                "start_date": getattr(data, "start_date", None),
            }
        return data


# ── Resignation Application Schemas ───────────────────────────────────
class ResignationApplicationBase(BaseModel):
    notice_date: date
    proposed_last_working_day: date
    contractual_notice_days: int = 30
    reason_category: ResignationReasonEnum = ResignationReasonEnum.CAREER_GROWTH
    resignation_letter: str
    handover_notes: Optional[str] = None


class ResignationApplicationCreate(ResignationApplicationBase):
    employee_id: uuid.UUID


class ResignationApplicationReview(BaseModel):
    status: ResignationStatusEnum
    approved_last_working_day: Optional[date] = None
    rejection_reason: Optional[str] = None


class ResignationApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    resignation_number: str
    notice_date: date
    proposed_last_working_day: date
    approved_last_working_day: Optional[date] = None
    contractual_notice_days: int
    served_notice_days: int
    shortfall_notice_days: int
    reason_category: str
    resignation_letter: str
    handover_notes: Optional[str] = None
    status: str
    reviewed_by_id: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    employee: Optional[EmployeeSeparationSummary] = None


# ── Department Clearance Schemas ─────────────────────────────────────
class DepartmentClearanceBase(BaseModel):
    department_type: DepartmentClearanceTypeEnum
    status: ClearanceStatusEnum = ClearanceStatusEnum.PENDING
    outstanding_amount: Decimal = Decimal("0.00")
    checklist_remarks: Optional[str] = None


class DepartmentClearanceCreate(DepartmentClearanceBase):
    separation_id: uuid.UUID
    employee_id: uuid.UUID


class DepartmentClearanceSignOff(BaseModel):
    status: ClearanceStatusEnum  # CLEARED, WAIVED, ISSUE_FLAGGED
    outstanding_amount: Decimal = Decimal("0.00")
    checklist_remarks: Optional[str] = None


class DepartmentClearanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    separation_id: uuid.UUID
    employee_id: uuid.UUID
    department_type: str
    status: str
    cleared_by_id: Optional[int] = None
    cleared_at: Optional[datetime] = None
    outstanding_amount: Decimal
    checklist_remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    employee: Optional[EmployeeSeparationSummary] = None


# ── Exit Interview Schemas ───────────────────────────────────────────
class ExitInterviewBase(BaseModel):
    interview_date: date
    primary_reason_for_leaving: str
    rating_culture: int = Field(default=3, ge=1, le=5)
    rating_management: int = Field(default=3, ge=1, le=5)
    rating_growth_opportunities: int = Field(default=3, ge=1, le=5)
    rating_compensation: int = Field(default=3, ge=1, le=5)
    rating_work_life_balance: int = Field(default=3, ge=1, le=5)
    would_recommend: str = "yes"
    proudest_accomplishment: Optional[str] = None
    improvement_suggestions: Optional[str] = None
    confidential_hr_notes: Optional[str] = None


class ExitInterviewCreate(ExitInterviewBase):
    separation_id: uuid.UUID
    employee_id: uuid.UUID


class ExitInterviewUpdate(BaseModel):
    interview_date: Optional[date] = None
    primary_reason_for_leaving: Optional[str] = None
    rating_culture: Optional[int] = Field(None, ge=1, le=5)
    rating_management: Optional[int] = Field(None, ge=1, le=5)
    rating_growth_opportunities: Optional[int] = Field(None, ge=1, le=5)
    rating_compensation: Optional[int] = Field(None, ge=1, le=5)
    rating_work_life_balance: Optional[int] = Field(None, ge=1, le=5)
    would_recommend: Optional[str] = None
    proudest_accomplishment: Optional[str] = None
    improvement_suggestions: Optional[str] = None
    confidential_hr_notes: Optional[str] = None
    status: Optional[str] = None


class ExitInterviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    separation_id: uuid.UUID
    employee_id: uuid.UUID
    interview_date: date
    interviewer_id: Optional[int] = None
    primary_reason_for_leaving: str
    rating_culture: int
    rating_management: int
    rating_growth_opportunities: int
    rating_compensation: int
    rating_work_life_balance: int
    would_recommend: str
    proudest_accomplishment: Optional[str] = None
    improvement_suggestions: Optional[str] = None
    confidential_hr_notes: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    employee: Optional[EmployeeSeparationSummary] = None


# ── Final Settlement (FnF) Schemas ────────────────────────────────────
class FinalSettlementBase(BaseModel):
    settlement_date: date
    unpaid_salary_days: int = 0
    unpaid_salary_amount: Decimal = Decimal("0.00")
    leave_encashment_days: float = 0.0
    leave_encashment_amount: Decimal = Decimal("0.00")
    gratuity_years: float = 0.0
    gratuity_amount: Decimal = Decimal("0.00")
    provident_fund_amount: Decimal = Decimal("0.00")
    severance_pay_amount: Decimal = Decimal("0.00")
    bonus_arrears_amount: Decimal = Decimal("0.00")
    other_payable_amount: Decimal = Decimal("0.00")
    total_payable_amount: Decimal = Decimal("0.00")

    notice_shortfall_days: int = 0
    notice_shortfall_deduction: Decimal = Decimal("0.00")
    loan_advance_deduction: Decimal = Decimal("0.00")
    asset_damage_deduction: Decimal = Decimal("0.00")
    clearance_charge_deduction: Decimal = Decimal("0.00")
    tax_withholding_deduction: Decimal = Decimal("0.00")
    total_deduction_amount: Decimal = Decimal("0.00")

    net_payable_amount: Decimal = Decimal("0.00")
    payment_method: str = "bank_transfer"
    notes: Optional[str] = None


class FinalSettlementCreate(FinalSettlementBase):
    separation_id: uuid.UUID
    employee_id: uuid.UUID


class FinalSettlementComputeRequest(BaseModel):
    settlement_date: Optional[date] = None
    unpaid_salary_days: Optional[int] = None
    bonus_arrears_amount: Optional[Decimal] = None
    other_payable_amount: Optional[Decimal] = None
    asset_damage_deduction: Optional[Decimal] = None
    tax_withholding_deduction: Optional[Decimal] = None
    notes: Optional[str] = None


class FinalSettlementDisburse(BaseModel):
    payment_method: str = "bank_transfer"
    payment_reference: Optional[str] = None
    notes: Optional[str] = None


class FinalSettlementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    separation_id: uuid.UUID
    employee_id: uuid.UUID
    settlement_number: str
    settlement_date: date
    unpaid_salary_days: int
    unpaid_salary_amount: Decimal
    leave_encashment_days: float
    leave_encashment_amount: Decimal
    gratuity_years: float
    gratuity_amount: Decimal
    provident_fund_amount: Decimal
    severance_pay_amount: Decimal
    bonus_arrears_amount: Decimal
    other_payable_amount: Decimal
    total_payable_amount: Decimal
    notice_shortfall_days: int
    notice_shortfall_deduction: Decimal
    loan_advance_deduction: Decimal
    asset_damage_deduction: Decimal
    clearance_charge_deduction: Decimal
    tax_withholding_deduction: Decimal
    total_deduction_amount: Decimal
    net_payable_amount: Decimal
    payment_status: str
    payment_method: str
    payment_reference: Optional[str] = None
    disbursed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    employee: Optional[EmployeeSeparationSummary] = None


# ── Release Letter Schemas ───────────────────────────────────────────
class ReleaseLetterBase(BaseModel):
    issue_date: date
    effective_exit_date: date
    designation: str
    department: Optional[str] = None
    letter_content: str


class ReleaseLetterCreate(ReleaseLetterBase):
    separation_id: uuid.UUID
    employee_id: uuid.UUID


class ReleaseLetterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    separation_id: uuid.UUID
    employee_id: uuid.UUID
    letter_number: str
    issue_date: date
    effective_exit_date: date
    designation: str
    department: Optional[str] = None
    status: str
    letter_content: str
    created_at: datetime
    updated_at: datetime
    employee: Optional[EmployeeSeparationSummary] = None


# ── Employee Separation Master Schemas ────────────────────────────────
class EmployeeSeparationBase(BaseModel):
    separation_type: SeparationTypeEnum = SeparationTypeEnum.RESIGNATION
    order_date: date
    last_working_date: date
    reason: Optional[str] = None
    resignation_id: Optional[uuid.UUID] = None
    severance_entitled: bool = False


class EmployeeSeparationCreate(EmployeeSeparationBase):
    employee_id: uuid.UUID


class EmployeeSeparationUpdate(BaseModel):
    separation_type: Optional[SeparationTypeEnum] = None
    last_working_date: Optional[date] = None
    reason: Optional[str] = None
    status: Optional[SeparationStatusEnum] = None
    severance_entitled: Optional[bool] = None


class EmployeeSeparationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    separation_number: str
    separation_type: str
    resignation_id: Optional[uuid.UUID] = None
    disciplinary_case_id: Optional[uuid.UUID] = None
    order_date: date
    last_working_date: date
    reason: Optional[str] = None
    status: str
    severance_entitled: bool
    service_duration_days: int
    service_duration_years: float
    created_at: datetime
    updated_at: datetime
    employee: Optional[EmployeeSeparationSummary] = None
    resignation: Optional[ResignationApplicationOut] = None
    clearances: list[DepartmentClearanceOut] = []
    exit_interview: Optional[ExitInterviewOut] = None
    settlement: Optional[FinalSettlementOut] = None


# ── Asset Handover Item Schema ───────────────────────────────────────
class AssetHandoverItem(BaseModel):
    assignment_id: uuid.UUID
    asset_id: uuid.UUID
    asset_name: str
    asset_tag: str
    category: Optional[str] = None
    assigned_date: Optional[date] = None
    status: str
    condition_notes: Optional[str] = None
