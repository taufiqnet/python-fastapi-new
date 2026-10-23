import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.modules.travel_expenses.models import (
    AdvanceStatusEnum,
    ClaimStatusEnum,
    ClaimTypeEnum,
    ExpenseCategoryEnum,
    TravelStatusEnum,
    TravelTypeEnum,
)


# ===========================================================================
# 1. Travel Requests
# ===========================================================================
class TravelRequestBase(BaseModel):
    purpose: str
    travel_type: TravelTypeEnum = TravelTypeEnum.DOMESTIC
    origin: str = Field(..., max_length=150)
    destination: str = Field(..., max_length=150)
    departure_date: date
    return_date: date
    estimated_cost: Decimal = Decimal("0.00")
    advance_required: bool = False
    advance_amount_requested: Decimal = Decimal("0.00")
    notes: Optional[str] = None


class TravelRequestCreate(TravelRequestBase):
    employee_id: Optional[uuid.UUID] = None  # Admin can specify, or derived from current user


class TravelRequestReview(BaseModel):
    status: TravelStatusEnum  # APPROVED, REJECTED, CANCELLED
    advance_amount_approved: Optional[Decimal] = None
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None


class TravelRequestOut(TravelRequestBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    request_number: str
    status: str
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    approver_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    advance_id: Optional[uuid.UUID] = None
    advance_settlement_status: Optional[str] = None
    created_at: Optional[datetime] = None


# ===========================================================================
# 2. Travel Advances
# ===========================================================================
class TravelAdvanceDisburse(BaseModel):
    amount: Optional[Decimal] = None
    disbursement_method: str = "bank_transfer"
    payment_reference: Optional[str] = None


class TravelAdvanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    travel_request_id: uuid.UUID
    employee_id: uuid.UUID
    advance_number: str
    amount_approved: Decimal
    disbursed_at: Optional[datetime] = None
    disbursement_method: str
    payment_reference: Optional[str] = None
    settlement_status: str
    created_at: Optional[datetime] = None


# ===========================================================================
# 3. DA & Conveyance Policy
# ===========================================================================
class DAConveyancePolicyBase(BaseModel):
    grade_name: str = Field(..., max_length=100)
    city_tier: str = Field("tier_1_dhaka_ctg", max_length=50)
    daily_allowance_rate: Decimal = Decimal("0.00")
    hotel_limit_per_night: Decimal = Decimal("0.00")
    conveyance_rate_per_km: Decimal = Decimal("0.00")
    is_active: bool = True


class DAConveyancePolicyCreate(DAConveyancePolicyBase):
    pass


class DAConveyancePolicyUpdate(BaseModel):
    grade_name: Optional[str] = None
    city_tier: Optional[str] = None
    daily_allowance_rate: Optional[Decimal] = None
    hotel_limit_per_night: Optional[Decimal] = None
    conveyance_rate_per_km: Optional[Decimal] = None
    is_active: Optional[bool] = None


class DAConveyancePolicyOut(DAConveyancePolicyBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    created_at: Optional[datetime] = None


# ===========================================================================
# 4. Expense Claim Lines & Settlement Claims
# ===========================================================================
class ExpenseClaimLineCreate(BaseModel):
    expense_date: date = Field(default_factory=date.today)
    category: ExpenseCategoryEnum = ExpenseCategoryEnum.OTHER
    amount: Decimal
    conveyance_km: Optional[Decimal] = None
    conveyance_mode: Optional[str] = None
    description: str
    receipt_url: Optional[str] = None


class ExpenseClaimLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    expense_date: date
    category: str
    amount: Decimal
    conveyance_km: Optional[Decimal] = None
    conveyance_mode: Optional[str] = None
    description: str
    receipt_url: Optional[str] = None


class ExpenseClaimCreate(BaseModel):
    employee_id: Optional[uuid.UUID] = None
    travel_request_id: Optional[uuid.UUID] = None
    claim_type: ClaimTypeEnum = ClaimTypeEnum.GENERAL_EXPENSE
    title: str = Field(..., max_length=255)
    claim_date: date = Field(default_factory=date.today)
    lines: List[ExpenseClaimLineCreate] = []


class ExpenseClaimReview(BaseModel):
    status: ClaimStatusEnum  # MANAGER_APPROVED, FINANCE_APPROVED, REJECTED
    approval_notes: Optional[str] = None


class ExpenseClaimSettle(BaseModel):
    settlement_channel: str = "bank_transfer"  # bank_transfer, cash, payroll_adjustment
    payment_reference: Optional[str] = None


class ExpenseClaimOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    travel_request_id: Optional[uuid.UUID] = None
    claim_type: str
    claim_number: str
    title: str
    claim_date: date
    total_claim_amount: Decimal
    advance_deducted: Decimal
    net_payable_or_refundable: Decimal
    status: str
    approval_notes: Optional[str] = None
    settlement_channel: Optional[str] = None
    payment_reference: Optional[str] = None
    paid_at: Optional[datetime] = None
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    lines: List[ExpenseClaimLineOut] = []
    created_at: Optional[datetime] = None


# ===========================================================================
# 5. Travel & Expense Overview Stats
# ===========================================================================
class TravelExpenseStats(BaseModel):
    pending_travel_requests: int = 0
    active_travel_advances: int = 0
    total_advances_amount: Decimal = Decimal("0.00")
    pending_claims: int = 0
    total_claims_pending_amount: Decimal = Decimal("0.00")
    settled_claims_this_month: int = 0
