import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# -----------------------------------------------------------------------------
# Chart of Accounts
# -----------------------------------------------------------------------------

class AccountBase(BaseModel):
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=150)
    account_type: str = Field(..., description="asset, liability, equity, income, expense")
    parent_id: uuid.UUID | None = None
    description: str | None = None


class AccountCreate(AccountBase):
    business_id: int | None = None


class AccountUpdate(BaseModel):
    name: str | None = None
    account_type: str | None = None
    parent_id: uuid.UUID | None = None
    is_active: bool | None = None
    description: str | None = None


class AccountResponse(AccountBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    is_system: bool
    is_active: bool
    created_at: datetime


class AccountTreeNode(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    account_type: str
    is_system: bool
    is_active: bool
    children: list["AccountTreeNode"] = []


# -----------------------------------------------------------------------------
# Fiscal Years & Periods
# -----------------------------------------------------------------------------

class FiscalPeriodResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    fiscal_year_id: uuid.UUID
    business_id: int
    period_number: int
    name: str
    start_date: date
    end_date: date
    status: str


class FiscalYearCreate(BaseModel):
    business_id: int | None = None
    name: str = Field(..., description="e.g., FY 2024-2025")
    start_date: date
    end_date: date


class FiscalYearResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    name: str
    start_date: date
    end_date: date
    status: str
    is_current: bool
    periods: list[FiscalPeriodResponse] = []


class PeriodLockRequest(BaseModel):
    status: str = Field(..., description="locked or open")


# -----------------------------------------------------------------------------
# Journal Vouchers & Entries
# -----------------------------------------------------------------------------

class JournalEntryCreate(BaseModel):
    account_id: uuid.UUID
    debit: Decimal = Decimal("0.00")
    credit: Decimal = Decimal("0.00")
    narration: str | None = None
    partner_type: str | None = None  # customer, supplier, employee
    partner_id: str | None = None


class JournalEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    voucher_id: uuid.UUID
    account_id: uuid.UUID
    account_code: str | None = None
    account_name: str | None = None
    debit: Decimal
    credit: Decimal
    narration: str | None = None
    partner_type: str | None = None
    partner_id: str | None = None


class JournalVoucherCreate(BaseModel):
    business_id: int | None = None
    voucher_type: str = Field("journal", description="journal, payment, receipt, contra")
    entry_date: date
    reference: str | None = None
    notes: str | None = None
    entries: list[JournalEntryCreate]


class JournalVoucherUpdate(BaseModel):
    entry_date: date | None = None
    reference: str | None = None
    notes: str | None = None
    entries: list[JournalEntryCreate] | None = None


class JournalVoucherResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    voucher_number: str
    voucher_type: str
    entry_date: date
    status: str
    reference: str | None = None
    notes: str | None = None
    posted_at: datetime | None = None
    created_at: datetime
    entries: list[JournalEntryResponse] = []


# -----------------------------------------------------------------------------
# Customers
# -----------------------------------------------------------------------------

class CustomerCreate(BaseModel):
    business_id: int | None = None
    name: str
    bin: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None


class CustomerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    name: str
    bin: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    is_active: bool
    created_at: datetime


# -----------------------------------------------------------------------------
# Sales Invoices & Mushak 6.3
# -----------------------------------------------------------------------------

class SalesInvoiceLineCreate(BaseModel):
    description: str
    uom: str = "Pcs"
    quantity: Decimal
    unit_price: Decimal
    sd_rate: Decimal = Decimal("0.00")
    vat_rate: Decimal = Decimal("15.00")


class SalesInvoiceLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    invoice_id: uuid.UUID
    sl_no: int
    description: str
    uom: str
    quantity: Decimal
    unit_price: Decimal
    total_price: Decimal
    sd_rate: Decimal
    sd_amount: Decimal
    vat_rate: Decimal
    vat_amount: Decimal
    price_incl_duties_taxes: Decimal


class MushakChallanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    invoice_id: uuid.UUID
    mushak_number: str
    serial_number: int
    fiscal_year: str
    bin: str
    issued_at: datetime


class SalesInvoiceCreate(BaseModel):
    business_id: int | None = None
    issue_date: date
    customer_id: uuid.UUID | None = None
    buyer_name: str
    buyer_bin: str | None = None
    buyer_address: str | None = None
    delivery_destination: str | None = None
    vehicle_nature_number: str | None = None
    so_number: str | None = None
    bill_number: str | None = None
    lines: list[SalesInvoiceLineCreate]


class SalesInvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    invoice_number: str
    issue_date: date
    customer_id: uuid.UUID | None = None
    buyer_name: str
    buyer_bin: str | None = None
    buyer_address: str | None = None
    delivery_destination: str | None = None
    vehicle_nature_number: str | None = None
    so_number: str | None = None
    bill_number: str | None = None
    total_subtotal: Decimal
    total_sd: Decimal
    total_vat: Decimal
    total_payable: Decimal
    status: str
    voucher_id: uuid.UUID | None = None
    created_at: datetime
    lines: list[SalesInvoiceLineResponse] = []
    mushak_challan: MushakChallanResponse | None = None


# Mushak 6.3 JSON View Schema (NBR Form Musak-6.3)
class Mushak63RegisteredPerson(BaseModel):
    name: str
    bin: str
    address: str
    issue_venue: str | None = None


class Mushak63Header(BaseModel):
    mushak_form: str = "Musak-6.3"
    title: str = "TAX INVOICE"
    rule_note: str = "See clauses (c) and (f) of sub-rule (1) of rule 40"
    mushak_number: str
    invoice_number: str
    issue_date: str
    issue_time: str
    so_number: str | None = None
    bill_number: str | None = None


class Mushak63Buyer(BaseModel):
    name: str
    bin: str | None = None
    address: str | None = None
    delivery_destination: str | None = None
    vehicle_nature_number: str | None = None


class Mushak63LineItem(BaseModel):
    sl_no: int
    description: str
    uom: str
    quantity: Decimal
    unit_price: Decimal
    total_price: Decimal
    sd_rate: Decimal
    sd_amount: Decimal
    vat_rate: Decimal
    vat_amount: Decimal
    price_incl_duties_taxes: Decimal


class Mushak63Summary(BaseModel):
    total_price: Decimal
    total_sd: Decimal
    total_vat: Decimal
    total_payable: Decimal
    total_in_words: str


class Mushak63Footer(BaseModel):
    authorized_person_name: str
    designation: str
    signature_note: str = "Authorized Signature & Seal"


class Mushak63JSONView(BaseModel):
    registered_person: Mushak63RegisteredPerson
    header: Mushak63Header
    buyer: Mushak63Buyer
    lines: list[Mushak63LineItem]
    summary: Mushak63Summary
    footer: Mushak63Footer


# -----------------------------------------------------------------------------
# Credit / Debit Notes (Mushak 6.7 / 6.8)
# -----------------------------------------------------------------------------

class CreditDebitNoteCreate(BaseModel):
    business_id: int | None = None
    note_type: str = Field(..., description="credit_note or debit_note")
    invoice_id: uuid.UUID
    issue_date: date
    amount: Decimal
    vat_amount: Decimal = Decimal("0.00")
    reason: str


class CreditDebitNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    note_type: str
    note_number: str
    invoice_id: uuid.UUID
    issue_date: date
    amount: Decimal
    vat_amount: Decimal
    reason: str
    status: str
    voucher_id: uuid.UUID | None = None
    created_at: datetime


# -----------------------------------------------------------------------------
# Accounting Reports
# -----------------------------------------------------------------------------

class GeneralLedgerLine(BaseModel):
    entry_date: date
    voucher_number: str
    voucher_type: str
    narration: str | None = None
    debit: Decimal
    credit: Decimal
    balance: Decimal


class GeneralLedgerReport(BaseModel):
    account_id: uuid.UUID
    account_code: str
    account_name: str
    opening_balance: Decimal
    closing_balance: Decimal
    lines: list[GeneralLedgerLine]


class TrialBalanceItem(BaseModel):
    account_id: uuid.UUID
    account_code: str
    account_name: str
    account_type: str
    debit_balance: Decimal
    credit_balance: Decimal


class TrialBalanceReport(BaseModel):
    as_of_date: date
    total_debit: Decimal
    total_credit: Decimal
    items: list[TrialBalanceItem]


class FinancialReportLine(BaseModel):
    account_code: str
    account_name: str
    amount: Decimal


class ProfitAndLossReport(BaseModel):
    start_date: date
    end_date: date
    total_income: Decimal
    total_expenses: Decimal
    net_profit: Decimal
    income_breakdown: list[FinancialReportLine]
    expense_breakdown: list[FinancialReportLine]


class BalanceSheetReport(BaseModel):
    as_of_date: date
    total_assets: Decimal
    total_liabilities: Decimal
    total_equity: Decimal
    asset_breakdown: list[FinancialReportLine]
    liability_breakdown: list[FinancialReportLine]
    equity_breakdown: list[FinancialReportLine]
