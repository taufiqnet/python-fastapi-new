import uuid
from datetime import date, datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


# ===========================================================================
# 1. Profile & Dashboard Schemas
# ===========================================================================
class PortalMeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    user_id: int | None = None
    employee_id: str
    first_name: str
    last_name: str | None = None
    full_name: str
    bangla_name: str | None = None
    work_email: str
    personal_email: str | None = None
    phone: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    blood_group: str | None = None
    national_id: str | None = None
    tin: str | None = None
    photo_url: str | None = None
    department_name: str | None = None
    job_title_name: str | None = None
    branch_name: str | None = None
    manager_name: str | None = None
    employment_type: str | None = None
    employee_category: str | None = None
    work_arrangement: str | None = None
    start_date: date | None = None
    confirmation_date: date | None = None
    is_active: bool
    # Bank & Statutory Details
    disbursement_method: str | None = None
    bank_name: str | None = None
    bank_branch: str | None = None
    bank_account_no: str | None = None
    bank_routing_number: str | None = None
    mfs_provider: str | None = None
    mfs_number: str | None = None
    # Addresses
    present_address: str | None = None
    permanent_address: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_relation: str | None = None
    emergency_contact_phone: str | None = None


class PortalLeaveBalanceItem(BaseModel):
    leave_type_id: uuid.UUID
    leave_type_name: str
    code: str
    is_statutory: bool = False
    allocated_days: float = 0.0
    used_days: float = 0.0
    remaining_days: float = 0.0


class PortalHolidayItem(BaseModel):
    name: str
    holiday_type: str
    start_date: date
    end_date: date
    is_paid: bool = True


class PortalRosterShiftItem(BaseModel):
    duty_date: date
    shift_name: str
    start_time: str
    end_time: str
    is_night_shift: bool = False


class PortalNoticeItem(BaseModel):
    id: uuid.UUID
    title: str
    category: str
    publish_date: datetime
    is_pinned: bool = False
    is_acknowledged: bool = False


class PortalDashboardOut(BaseModel):
    profile: PortalMeOut
    attendance_summary: dict[str, Any]
    leave_balances: list[PortalLeaveBalanceItem]
    upcoming_holidays: list[PortalHolidayItem]
    upcoming_shifts: list[PortalRosterShiftItem]
    recent_notices: list[PortalNoticeItem]
    unread_notices_count: int = 0
    pending_requests_count: int = 0
    active_tickets_count: int = 0


# ===========================================================================
# 2. Profile Update Request Schemas
# ===========================================================================
class ProfileUpdateRequestCreate(BaseModel):
    requested_changes: dict[str, Any] = Field(
        ...,
        description="Key-value pairs of employee fields to update, e.g. phone, addresses, bank details",
    )
    reason: str | None = None


class ProfileUpdateRequestReview(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected)$")
    review_notes: str | None = None


class ProfileUpdateRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    requested_changes: dict[str, Any]
    reason: str | None = None
    status: str
    reviewed_by_id: int | None = None
    review_notes: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime


# ===========================================================================
# 3. Attendance Correction Schemas
# ===========================================================================
class AttendanceCorrectionRequestCreate(BaseModel):
    attendance_date: date
    request_type: str = Field(..., pattern="^(missed_punch|late_excuse|work_on_holiday)$")
    requested_time_in: str | None = None
    requested_time_out: str | None = None
    reason: str
    supporting_document_url: str | None = None


class AttendanceCorrectionRequestReview(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected)$")
    review_notes: str | None = None


class AttendanceCorrectionRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    attendance_date: date
    request_type: str
    requested_time_in: str | None = None
    requested_time_out: str | None = None
    reason: str
    supporting_document_url: str | None = None
    status: str
    reviewed_by_id: int | None = None
    review_notes: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime


# ===========================================================================
# 4. Loan & Advance Schemas
# ===========================================================================
class EmployeeLoanCreate(BaseModel):
    loan_type: str = Field(..., pattern="^(salary_advance|personal_loan|emergency_loan)$")
    principal_amount: float = Field(..., gt=0)
    total_installments: int = Field(1, ge=1, le=48)
    repayment_start_date: date | None = None
    reason: str


class EmployeeLoanReview(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected)$")
    notes: str | None = None


class EmployeeLoanDisburse(BaseModel):
    payment_reference: str
    notes: str | None = None


class EmployeeLoanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    loan_type: str
    principal_amount: float
    monthly_installment_amount: float
    total_installments: int
    disbursed_amount: float
    remaining_balance: float
    repayment_start_date: date | None = None
    status: str
    approved_by_id: int | None = None
    disbursed_at: datetime | None = None
    reason: str
    notes: str | None = None
    created_at: datetime


# ===========================================================================
# 5. Expense Claim Schemas
# ===========================================================================
class ExpenseClaimItemCreate(BaseModel):
    expense_date: date
    category: str = Field("travel", pattern="^(travel|meals|hotel|supplies|training|other)$")
    amount: float = Field(..., gt=0)
    description: str
    receipt_url: str | None = None


class ExpenseClaimItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    claim_id: uuid.UUID
    expense_date: date
    category: str
    amount: float
    description: str
    receipt_url: str | None = None


class ExpenseClaimCreate(BaseModel):
    title: str
    claim_date: date = Field(default_factory=date.today)
    items: list[ExpenseClaimItemCreate]


class ExpenseClaimReview(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected)$")
    review_notes: str | None = None


class ExpenseClaimReimburse(BaseModel):
    payment_reference: str
    review_notes: str | None = None


class ExpenseClaimOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    claim_number: str
    title: str
    claim_date: date
    total_amount: float
    status: str
    reviewer_id: int | None = None
    review_notes: str | None = None
    payment_reference: str | None = None
    reimbursed_at: datetime | None = None
    items: list[ExpenseClaimItemOut] = []
    created_at: datetime


# ===========================================================================
# 6. Official Letter Request Schemas
# ===========================================================================
class OfficialLetterRequestCreate(BaseModel):
    letter_type: str = Field(
        ...,
        pattern="^(noc_visa|noc_travel|salary_certificate|experience_letter|job_confirmation)$",
    )
    purpose: str
    addressed_to: str | None = None
    travel_country: str | None = None
    travel_start_date: date | None = None
    travel_end_date: date | None = None


class OfficialLetterRequestReview(BaseModel):
    status: str = Field(..., pattern="^(approved|generated|rejected)$")
    generated_file_url: str | None = None
    review_notes: str | None = None


class OfficialLetterRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    letter_type: str
    purpose: str
    addressed_to: str | None = None
    travel_country: str | None = None
    travel_start_date: date | None = None
    travel_end_date: date | None = None
    status: str
    generated_file_url: str | None = None
    reviewed_by_id: int | None = None
    review_notes: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime


# ===========================================================================
# 7. Company Policy Schemas
# ===========================================================================
class CompanyPolicyCreate(BaseModel):
    title: str
    category: str = Field("hr_policy", pattern="^(hr_policy|code_of_conduct|leave_rules|it_security|health_safety|benefits)$")
    version: str = "1.0"
    effective_date: date = Field(default_factory=date.today)
    summary: str | None = None
    content: str | None = None
    attachment_url: str | None = None
    is_mandatory_acknowledgement: bool = False
    is_active: bool = True


class CompanyPolicyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    title: str
    category: str
    version: str
    effective_date: date
    summary: str | None = None
    content: str | None = None
    attachment_url: str | None = None
    is_mandatory_acknowledgement: bool
    is_active: bool
    acknowledged_by_me: bool = False
    acknowledged_at: datetime | None = None
    created_at: datetime


# ===========================================================================
# 8. HR Helpdesk & Ticketing Schemas
# ===========================================================================
class HRTicketCommentCreate(BaseModel):
    message: str
    attachment_url: str | None = None


class HRTicketCommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ticket_id: uuid.UUID
    author_user_id: int
    is_hr_staff: bool
    message: str
    attachment_url: str | None = None
    created_at: datetime


class HRTicketCreate(BaseModel):
    category: str = Field("general", pattern="^(payroll|leave|benefits|workplace|it|general)$")
    priority: str = Field("medium", pattern="^(low|medium|high|urgent)$")
    subject: str
    description: str
    attachment_url: str | None = None


class HRTicketStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(open|in_progress|resolved|closed)$")
    resolution_notes: str | None = None


class HRTicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    ticket_number: str
    employee_id: uuid.UUID
    category: str
    priority: str
    subject: str
    description: str
    attachment_url: str | None = None
    status: str
    assigned_to_id: int | None = None
    resolved_at: datetime | None = None
    resolution_notes: str | None = None
    comments: list[HRTicketCommentOut] = []
    created_at: datetime
    updated_at: datetime


# ===========================================================================
# 9. Tax Card (Bangladesh Income Tax Act 2023)
# ===========================================================================
class TaxCardMonthlyRow(BaseModel):
    month_name: str
    period_id: uuid.UUID
    basic_salary: float
    house_rent: float
    medical_allowance: float
    conveyance: float
    other_allowance: float
    gross_salary: float
    tax_deducted: float


class TaxCardSummaryOut(BaseModel):
    employee_id: uuid.UUID
    employee_name: str
    tin: str | None = None
    designation: str | None = None
    department: str | None = None
    fiscal_year: str
    assessment_year: str
    total_basic: float
    total_house_rent: float
    total_medical: float
    total_conveyance: float
    total_bonus: float
    total_gross_income: float
    total_tax_exempted: float
    taxable_income: float
    total_tax_withheld: float
    monthly_breakdown: list[TaxCardMonthlyRow] = []
