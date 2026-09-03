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
    note: str | None = None
    business_id: int


class PayrollRecordCreate(PayrollRecordBase):
    pass


class PayrollRecordUpdate(BaseModel):
    working_days: int | None = Field(None, ge=0)
    present_days: int | None = Field(None, ge=0)
    absent_days: int | None = Field(None, ge=0)
    leave_days: int | None = Field(None, ge=0)
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
    note: str | None = None


class PayrollRecordOut(PayrollRecordBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    gross_salary: float
    total_deduction: float
    net_salary: float
    created_at: datetime
    updated_at: datetime
