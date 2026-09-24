import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


class Account(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "finance_accounts"
    __table_args__ = (
        UniqueConstraint("business_id", "code", name="uq_finance_accounts_biz_code"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    account_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # asset, liability, equity, income, expense
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_accounts.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    parent: Mapped["Account | None"] = relationship(
        "Account", remote_side="Account.id", back_populates="children"
    )
    children: Mapped[list["Account"]] = relationship(
        "Account", back_populates="parent", cascade="all, delete-orphan"
    )
    journal_entries: Mapped[list["JournalEntry"]] = relationship(
        "JournalEntry", back_populates="account"
    )


class FiscalYear(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "finance_fiscal_years"
    __table_args__ = (
        UniqueConstraint("business_id", "name", name="uq_finance_fiscal_years_biz_name"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "FY 2024-2025"
    start_date: Mapped[date] = mapped_column(Date, nullable=False)  # e.g., 2024-07-01
    end_date: Mapped[date] = mapped_column(Date, nullable=False)  # e.g., 2025-06-30
    status: Mapped[str] = mapped_column(
        String(20), default="open", nullable=False
    )  # open, closed, locked
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    periods: Mapped[list["FiscalPeriod"]] = relationship(
        "FiscalPeriod", back_populates="fiscal_year", cascade="all, delete-orphan"
    )


class FiscalPeriod(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "finance_fiscal_periods"
    __table_args__ = (
        UniqueConstraint(
            "fiscal_year_id", "period_number", name="uq_finance_periods_fy_num"
        ),
    )

    fiscal_year_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_fiscal_years.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    period_number: Mapped[int] = mapped_column(Integer, nullable=False)  # 1..12
    name: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "July 2024"
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="open", nullable=False
    )  # open, locked

    fiscal_year: Mapped["FiscalYear"] = relationship("FiscalYear", back_populates="periods")


class JournalVoucher(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "finance_journal_vouchers"
    __table_args__ = (
        UniqueConstraint(
            "business_id", "voucher_number", name="uq_finance_vouchers_biz_num"
        ),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    voucher_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    voucher_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # journal, payment, receipt, contra
    entry_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(20), default="draft", nullable=False
    )  # draft, posted, cancelled
    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    posted_by_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    posted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    entries: Mapped[list["JournalEntry"]] = relationship(
        "JournalEntry", back_populates="voucher", cascade="all, delete-orphan"
    )


class JournalEntry(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "finance_journal_entries"

    voucher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_journal_vouchers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_accounts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    debit: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0.00"), nullable=False
    )
    credit: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0.00"), nullable=False
    )
    narration: Mapped[str | None] = mapped_column(String(255), nullable=True)
    partner_type: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )  # customer, supplier, employee
    partner_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    voucher: Mapped["JournalVoucher"] = relationship(
        "JournalVoucher", back_populates="entries"
    )
    account: Mapped["Account"] = relationship(
        "Account", back_populates="journal_entries"
    )


class Customer(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "finance_customers"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    bin: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class SalesInvoice(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "finance_sales_invoices"
    __table_args__ = (
        UniqueConstraint(
            "business_id", "invoice_number", name="uq_finance_invoices_biz_num"
        ),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    invoice_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    issue_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    buyer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    buyer_bin: Mapped[str | None] = mapped_column(String(50), nullable=True)
    buyer_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    delivery_destination: Mapped[str | None] = mapped_column(Text, nullable=True)
    vehicle_nature_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    so_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bill_number: Mapped[str | None] = mapped_column(String(100), nullable=True)

    total_subtotal: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0.00"), nullable=False
    )
    total_sd: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0.00"), nullable=False
    )
    total_vat: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0.00"), nullable=False
    )
    total_payable: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0.00"), nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(20), default="draft", nullable=False
    )  # draft, posted, cancelled

    voucher_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_journal_vouchers.id", ondelete="SET NULL"),
        nullable=True,
    )

    lines: Mapped[list["SalesInvoiceLine"]] = relationship(
        "SalesInvoiceLine", back_populates="invoice", cascade="all, delete-orphan"
    )
    mushak_challan: Mapped["MushakChallan | None"] = relationship(
        "MushakChallan", back_populates="invoice", uselist=False
    )


class SalesInvoiceLine(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "finance_sales_invoice_lines"

    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_sales_invoices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sl_no: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    uom: Mapped[str] = mapped_column(String(50), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    total_price: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)

    sd_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0.00"), nullable=False
    )
    sd_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0.00"), nullable=False
    )

    vat_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("15.00"), nullable=False
    )
    vat_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0.00"), nullable=False
    )

    price_incl_duties_taxes: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False
    )

    invoice: Mapped["SalesInvoice"] = relationship(
        "SalesInvoice", back_populates="lines"
    )


class MushakChallan(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "finance_mushak_challans"
    __table_args__ = (
        UniqueConstraint(
            "business_id", "mushak_number", name="uq_finance_mushak_biz_num"
        ),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_sales_invoices.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    mushak_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    serial_number: Mapped[int] = mapped_column(Integer, nullable=False)
    fiscal_year: Mapped[str] = mapped_column(String(50), nullable=False)
    bin: Mapped[str] = mapped_column(String(50), nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    issued_by_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    invoice: Mapped["SalesInvoice"] = relationship(
        "SalesInvoice", back_populates="mushak_challan"
    )


class CreditDebitNote(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "finance_credit_debit_notes"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    note_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # credit_note, debit_note
    note_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_sales_invoices.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    vat_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0.00"), nullable=False
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="draft", nullable=False
    )  # draft, posted, cancelled

    voucher_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_journal_vouchers.id", ondelete="SET NULL"),
        nullable=True,
    )


class SalesImportBatch(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "finance_sales_import_batches"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    batch_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), default=uuid.uuid4, nullable=False, index=True
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )  # pending, validated, confirmed, failed
    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    valid_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_summary: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    raw_data: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_by_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )


class AuditLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "finance_audit_logs"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(100), nullable=False)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
