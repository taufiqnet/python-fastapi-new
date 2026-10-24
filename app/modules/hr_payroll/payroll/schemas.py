import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.modules.hr_payroll.payroll.models import (
    HolidayTypeEnum,
    PaymentMethodEnum,
    PayrollPeriodStatusEnum,
)


# ── Holiday Schemas ───────────────────────────────────────────────────
class HolidayBase(BaseModel):
    name: str = Field(..., max_length=255)
    holiday_type: HolidayTypeEnum
    start_date: date
    end_date: date
    is_paid: bool = True
    description: str | None = None
    business_id: int


class HolidayCreate(HolidayBase):
    pass


class HolidayUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    holiday_type: HolidayTypeEnum | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_paid: bool | None = None
    description: str | None = None
    business_id: int | None = None


class HolidayOut(HolidayBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# ── Payroll Period Schemas ───────────────────────────────────────────
class PayrollPeriodBase(BaseModel):
    name: str = Field(..., max_length=100)
    start_date: date
    end_date: date
    status: PayrollPeriodStatusEnum = PayrollPeriodStatusEnum.DRAFT
    payment_date: date | None = None
    notes: str | None = None
    business_id: int


class PayrollPeriodCreate(PayrollPeriodBase):
    pass


class PayrollPeriodUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    start_date: date | None = None
    end_date: date | None = None
    status: PayrollPeriodStatusEnum | None = None
    payment_date: date | None = None
    notes: str | None = None
    business_id: int | None = None


class PayrollPeriodOut(PayrollPeriodBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_locked: bool
    created_at: datetime
    updated_at: datetime


# ── Payroll Record (Payslip) Schemas ───────────────────────────────────
class PayrollRecordBase(BaseModel):
    period_id: uuid.UUID
    employee_id: uuid.UUID
    working_days: int = Field(0, ge=0)
    present_days: int = Field(0, ge=0)
    absent_days: int = Field(0, ge=0)
    leave_days: int = Field(0, ge=0)
    holiday_days: int = Field(0, ge=0)
    overtime_hours: float = Field(0.0, ge=0.0)

    basic_salary: float = Field(0.0, ge=0.0)
    house_rent: float = Field(0.0, ge=0.0)
    transport_allowance: float = Field(0.0, ge=0.0)
    medical_allowance: float = Field(0.0, ge=0.0)
    food_allowance: float = Field(0.0, ge=0.0)
    other_allowance: float = Field(0.0, ge=0.0)
    overtime_pay: float = Field(0.0, ge=0.0)
    bonus: float = Field(0.0, ge=0.0)

    tax: float = Field(0.0, ge=0.0)
    provident_fund: float = Field(0.0, ge=0.0)
    unpaid_leave_deduction: float = Field(0.0, ge=0.0)
    loan_installment: float = Field(0.0, ge=0.0)
    other_deduction: float = Field(0.0, ge=0.0)

    payment_method: PaymentMethodEnum = PaymentMethodEnum.BANK_TRANSFER
    bank_account: str | None = Field(None, max_length=50)
    is_paid: bool = False
    paid_at: datetime | None = None
    is_held: bool = False
    hold_reason: str | None = None
    hold_released_at: datetime | None = None
    note: str | None = None
    business_id: int


class PayrollRecordCreate(PayrollRecordBase):
    pass


class PayrollRecordUpdate(BaseModel):
    working_days: int | None = Field(None, ge=0)
    present_days: int | None = Field(None, ge=0)
    absent_days: int | None = Field(None, ge=0)
    leave_days: int | None = Field(None, ge=0)
    holiday_days: int | None = Field(None, ge=0)
    overtime_hours: float | None = Field(None, ge=0.0)

    basic_salary: float | None = Field(None, ge=0.0)
    house_rent: float | None = Field(None, ge=0.0)
    transport_allowance: float | None = Field(None, ge=0.0)
    medical_allowance: float | None = Field(None, ge=0.0)
    food_allowance: float | None = Field(None, ge=0.0)
    other_allowance: float | None = Field(None, ge=0.0)
    overtime_pay: float | None = Field(None, ge=0.0)
    bonus: float | None = Field(None, ge=0.0)

    tax: float | None = Field(None, ge=0.0)
    provident_fund: float | None = Field(None, ge=0.0)
    unpaid_leave_deduction: float | None = Field(None, ge=0.0)
    loan_installment: float | None = Field(None, ge=0.0)
    other_deduction: float | None = Field(None, ge=0.0)

    payment_method: PaymentMethodEnum | None = None
    bank_account: str | None = Field(None, max_length=50)
    is_paid: bool | None = None
    paid_at: datetime | None = None
    is_held: bool | None = None
    hold_reason: str | None = None
    hold_released_at: datetime | None = None
    note: str | None = None


class PayrollRecordOut(PayrollRecordBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    gross_salary: float
    total_deduction: float
    net_salary: float
    created_at: datetime
    updated_at: datetime


# ── Payroll Settings Schemas ───────────────────────────────────────────
class PayrollSettingsBase(BaseModel):
    include_attendance: bool = True
    include_leave: bool = True
    include_holidays: bool = True
    include_overtime: bool = True
    deduct_absent_days: bool = True
    standard_hours_per_day: float = Field(8.0, ge=1.0, le=24.0)


class PayrollSettingsUpdate(BaseModel):
    include_attendance: bool | None = None
    include_leave: bool | None = None
    include_holidays: bool | None = None
    include_overtime: bool | None = None
    deduct_absent_days: bool | None = None
    standard_hours_per_day: float | None = Field(None, ge=1.0, le=24.0)


class PayrollSettingsOut(PayrollSettingsBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    created_at: datetime
    updated_at: datetime


# ============================================================
# Payscale Step Schemas
# ============================================================
class PayscaleStepBase(BaseModel):
    step_number: int = Field(..., ge=1)
    basic_amount: float = Field(..., ge=0.0)
    increment_amount: float = Field(0.0, ge=0.0)
    description: str | None = None
    is_active: bool = True


class PayscaleStepCreate(PayscaleStepBase):
    business_id: int
    salary_grade_id: uuid.UUID


class PayscaleStepUpdate(BaseModel):
    step_number: int | None = None
    basic_amount: float | None = None
    increment_amount: float | None = None
    description: str | None = None
    is_active: bool | None = None


class PayscaleStepOut(PayscaleStepBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    salary_grade_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# ============================================================
# Company Bank Account Schemas
# ============================================================
class CompanyBankAccountBase(BaseModel):
    bank_name: str = Field(..., max_length=100)
    branch_name: str = Field(..., max_length=100)
    account_title: str = Field(..., max_length=150)
    account_number: str = Field(..., max_length=50)
    routing_number: str = Field(..., min_length=9, max_length=9)
    is_default: bool = False
    is_active: bool = True


class CompanyBankAccountCreate(CompanyBankAccountBase):
    business_id: int


class CompanyBankAccountUpdate(BaseModel):
    bank_name: str | None = None
    branch_name: str | None = None
    account_title: str | None = None
    account_number: str | None = None
    routing_number: str | None = None
    is_default: bool | None = None
    is_active: bool | None = None


class CompanyBankAccountOut(CompanyBankAccountBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    created_at: datetime
    updated_at: datetime


# ============================================================
# Tax Slab & Statutory Compliance Schemas
# ============================================================
from app.modules.hr_payroll.payroll.models import (
    AdjustmentStatusEnum,
    AdjustmentTypeEnum,
    ApprovalActionEnum,
    ApprovalStageEnum,
    BonusBasisEnum,
    BonusTypeEnum,
    EMIStatusEnum,
    GenderCategoryEnum,
)


class TaxSlabBase(BaseModel):
    fiscal_year: str = Field(..., max_length=20)
    gender_category: GenderCategoryEnum = GenderCategoryEnum.GENERAL_MALE
    slab_order: int = Field(..., ge=1)
    min_income: float = Field(..., ge=0.0)
    max_income: float | None = Field(None, ge=0.0)
    tax_rate_percent: float = Field(..., ge=0.0, le=100.0)


class TaxSlabCreate(TaxSlabBase):
    business_id: int


class TaxSlabUpdate(BaseModel):
    fiscal_year: str | None = None
    gender_category: GenderCategoryEnum | None = None
    slab_order: int | None = None
    min_income: float | None = None
    max_income: float | None = None
    tax_rate_percent: float | None = None


class TaxSlabOut(TaxSlabBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    created_at: datetime
    updated_at: datetime


class StatutoryComplianceSettingBase(BaseModel):
    enable_provident_fund: bool = True
    pf_employee_percent: float = Field(8.33, ge=0.0, le=50.0)
    pf_employer_percent: float = Field(8.33, ge=0.0, le=50.0)
    enable_tax_auto_deduction: bool = True
    minimum_tax_amount: float = Field(5000.0, ge=0.0)
    gratuity_qualifying_years: int = Field(5, ge=1)


class StatutoryComplianceSettingCreate(StatutoryComplianceSettingBase):
    business_id: int


class StatutoryComplianceSettingUpdate(BaseModel):
    enable_provident_fund: bool | None = None
    pf_employee_percent: float | None = None
    pf_employer_percent: float | None = None
    enable_tax_auto_deduction: bool | None = None
    minimum_tax_amount: float | None = None
    gratuity_qualifying_years: int | None = None


class StatutoryComplianceSettingOut(StatutoryComplianceSettingBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    created_at: datetime
    updated_at: datetime


# ============================================================
# Salary Adjustment Schemas
# ============================================================
class SalaryAdjustmentBase(BaseModel):
    employee_id: uuid.UUID
    period_id: uuid.UUID | None = None
    adjustment_type: AdjustmentTypeEnum
    amount: float = Field(..., ge=0.0)
    title: str = Field(..., max_length=150)
    reason: str | None = None


class SalaryAdjustmentCreate(SalaryAdjustmentBase):
    business_id: int


class SalaryAdjustmentUpdate(BaseModel):
    period_id: uuid.UUID | None = None
    adjustment_type: AdjustmentTypeEnum | None = None
    amount: float | None = None
    title: str | None = None
    reason: str | None = None
    status: AdjustmentStatusEnum | None = None


class SalaryAdjustmentOut(SalaryAdjustmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    status: AdjustmentStatusEnum
    approved_by_id: int | None = None
    applied_payroll_record_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


# ============================================================
# Loan Repayment Schedule Schemas
# ============================================================
class LoanRepaymentScheduleBase(BaseModel):
    loan_id: uuid.UUID
    installment_number: int = Field(..., ge=1)
    due_date: date
    installment_amount: float = Field(..., ge=0.0)
    status: EMIStatusEnum = EMIStatusEnum.PENDING
    notes: str | None = None


class LoanRepaymentScheduleCreate(LoanRepaymentScheduleBase):
    business_id: int


class LoanRepaymentScheduleUpdate(BaseModel):
    status: EMIStatusEnum | None = None
    due_date: date | None = None
    notes: str | None = None


class LoanRepaymentScheduleOut(LoanRepaymentScheduleBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    payroll_record_id: uuid.UUID | None = None
    paid_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


# ============================================================
# Bonus Policy & Bonus Run Schemas
# ============================================================
class BonusPolicyBase(BaseModel):
    name: str = Field(..., max_length=150)
    bonus_type: BonusTypeEnum = BonusTypeEnum.FESTIVAL
    calculation_basis: BonusBasisEnum = BonusBasisEnum.PERCENT_BASIC
    percentage_or_amount: float = Field(100.0, ge=0.0)
    min_service_months: int = Field(3, ge=0)
    is_taxable: bool = True
    is_active: bool = True


class BonusPolicyCreate(BonusPolicyBase):
    business_id: int


class BonusPolicyUpdate(BaseModel):
    name: str | None = None
    bonus_type: BonusTypeEnum | None = None
    calculation_basis: BonusBasisEnum | None = None
    percentage_or_amount: float | None = None
    min_service_months: int | None = None
    is_taxable: bool | None = None
    is_active: bool | None = None


class BonusPolicyOut(BonusPolicyBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    created_at: datetime
    updated_at: datetime


class BonusRunCreate(BaseModel):
    business_id: int
    policy_id: uuid.UUID
    payroll_period_id: uuid.UUID | None = None
    run_date: date


class BonusRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    policy_id: uuid.UUID
    payroll_period_id: uuid.UUID | None = None
    run_date: date
    status: str
    total_amount: float
    headcount: int
    created_at: datetime
    updated_at: datetime


# ============================================================
# Payroll Period Approval Schemas
# ============================================================
class PayrollPeriodApprovalCreate(BaseModel):
    business_id: int
    period_id: uuid.UUID
    stage: ApprovalStageEnum
    action: ApprovalActionEnum
    comments: str | None = None


class PayrollPeriodApprovalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    period_id: uuid.UUID
    stage: ApprovalStageEnum
    action: ApprovalActionEnum
    action_by_id: int
    comments: str | None = None
    created_at: datetime
    updated_at: datetime

