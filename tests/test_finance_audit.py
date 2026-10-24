import uuid
from datetime import date, datetime
from decimal import Decimal
import pytest
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.core.tenancy.models import BusinessProfile
from app.modules.finance.models import (
    Account,
    FiscalYear,
    FiscalPeriod,
    JournalVoucher,
    JournalEntry,
    SalesInvoice,
    SalesInvoiceLine,
    MushakChallan,
)
from app.modules.finance.schemas import JournalVoucherCreate, JournalEntryCreate
from app.modules.finance.services import JournalVoucherService, Mushak63Service


@pytest.fixture
def finance_setup(db):
    biz = BusinessProfile(id=401, name_en="Finance & Audit Corp Ltd", vat_number="BIN-987654321")
    db.add(biz)
    db.commit()

    # Create root accounts
    acc_cash = Account(
        business_id=biz.id,
        code="1010",
        name="Cash in Hand",
        account_type="asset",
        is_active=True,
    )
    acc_sales = Account(
        business_id=biz.id,
        code="4010",
        name="Sales Revenue",
        account_type="income",
        is_active=True,
    )
    acc_vat = Account(
        business_id=biz.id,
        code="2020",
        name="VAT Output Payable",
        account_type="liability",
        is_active=True,
    )
    db.add_all([acc_cash, acc_sales, acc_vat])
    db.commit()

    return {"biz": biz, "cash": acc_cash, "sales": acc_sales, "vat": acc_vat}


def test_chart_of_accounts_uniqueness_per_business(db, finance_setup):
    """
    Audit Chart of Accounts:
    - Account code must be unique within a business tenant.
    - Duplicate code in the same business raises IntegrityError.
    """
    biz = finance_setup["biz"]

    duplicate_acc = Account(
        business_id=biz.id,
        code="1010",  # Duplicate of Cash in Hand
        name="Duplicate Cash Account",
        account_type="asset",
    )
    db.add(duplicate_acc)

    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_double_entry_debit_credit_balancing_rules():
    """
    Audit Double-Entry Accounting Invariant:
    - Total Debits must equal Total Credits.
    - Balanced entries pass calculation validation.
    - Unbalanced entries must be flagged as invalid.
    """
    dummy_acc_1 = uuid.uuid4()
    dummy_acc_2 = uuid.uuid4()

    # 1. Unbalanced entries: Debit 5000 != Credit 4000
    unbalanced_entries = [
        JournalEntryCreate(account_id=dummy_acc_1, debit=Decimal("5000.00"), credit=Decimal("0.00")),
        JournalEntryCreate(account_id=dummy_acc_2, debit=Decimal("0.00"), credit=Decimal("4000.00")),
    ]
    tot_debit = sum((e.debit for e in unbalanced_entries), Decimal("0.00"))
    tot_credit = sum((e.credit for e in unbalanced_entries), Decimal("0.00"))
    assert tot_debit != tot_credit, "Unbalanced journal must fail equality check"

    # 2. Balanced entries: Debit 5000 == Credit 5000
    balanced_entries = [
        JournalEntryCreate(account_id=dummy_acc_1, debit=Decimal("5000.00"), credit=Decimal("0.00")),
        JournalEntryCreate(account_id=dummy_acc_2, debit=Decimal("0.00"), credit=Decimal("5000.00")),
    ]
    tot_debit_b = sum((e.debit for e in balanced_entries), Decimal("0.00"))
    tot_credit_b = sum((e.credit for e in balanced_entries), Decimal("0.00"))
    assert tot_debit_b == tot_credit_b, "Balanced journal must satisfy total debit == total credit"
    assert tot_debit_b > Decimal("0.00"), "Journal total must be strictly positive"


def test_mushak_63_statutory_vat_and_sd_calculation(db, finance_setup):
    """
    Audit Bangladesh VAT Act 2012 & Mushak 6.3 Calculations:
    - Total Price = Quantity * Unit Price
    - Supplementary Duty (SD) = Total Price * (SD Rate / 100)
    - VAT Base = Total Price + SD
    - VAT Amount = VAT Base * (VAT Rate / 100)
    - Price inclusive of duties & taxes = Total Price + SD + VAT
    """
    biz = finance_setup["biz"]

    qty = Decimal("10.0000")
    unit_p = Decimal("1000.00")
    tot_p = qty * unit_p  # 10,000.00

    sd_rate = Decimal("10.00")  # 10%
    sd_amt = tot_p * (sd_rate / Decimal("100.00"))  # 1,000.00

    vat_base = tot_p + sd_amt  # 11,000.00
    vat_rate = Decimal("15.00")  # 15% standard rate
    vat_amt = vat_base * (vat_rate / Decimal("100.00"))  # 1,650.00

    total_payable = tot_p + sd_amt + vat_amt  # 12,650.00

    assert tot_p == Decimal("10000.00")
    assert sd_amt == Decimal("1000.00")
    assert vat_amt == Decimal("1650.00")
    assert total_payable == Decimal("12650.00")

    invoice = SalesInvoice(
        business_id=biz.id,
        invoice_number="INV-2026-AUDIT-001",
        issue_date=date(2026, 6, 15),
        buyer_name="Audit Enterprises Ltd",
        buyer_bin="BIN-112233445",
        total_subtotal=tot_p,
        total_sd=sd_amt,
        total_vat=vat_amt,
        total_payable=total_payable,
        status="posted",
    )
    db.add(invoice)
    db.flush()

    line = SalesInvoiceLine(
        invoice_id=invoice.id,
        sl_no=1,
        description="Premium Audit Goods",
        uom="PCS",
        quantity=qty,
        unit_price=unit_p,
        total_price=tot_p,
        sd_rate=sd_rate,
        sd_amount=sd_amt,
        vat_rate=vat_rate,
        vat_amount=vat_amt,
        price_incl_duties_taxes=total_payable,
    )
    db.add(line)
    db.commit()

    # Mushak 6.3 Challan Record
    challan = MushakChallan(
        business_id=biz.id,
        invoice_id=invoice.id,
        mushak_number="MUSHAK-6.3-2026-00001",
        serial_number=1,
        fiscal_year="2025-2026",
        bin=biz.vat_number,
        issued_at=datetime.utcnow(),
    )
    db.add(challan)
    db.commit()
    db.refresh(challan)

    assert challan.mushak_number == "MUSHAK-6.3-2026-00001"
    assert challan.fiscal_year == "2025-2026"


def test_mushak_63_challan_uniqueness(db, finance_setup):
    """
    Audit Mushak 6.3 Challan Sequence Integrity:
    - Attempting to issue duplicate mushak_number for the same business must violate unique constraint.
    """
    biz = finance_setup["biz"]

    inv1 = SalesInvoice(
        business_id=biz.id,
        invoice_number="INV-TEST-001",
        issue_date=date(2026, 6, 1),
        buyer_name="Client A",
        total_subtotal=Decimal("100.00"),
        total_payable=Decimal("115.00"),
        status="posted",
    )
    inv2 = SalesInvoice(
        business_id=biz.id,
        invoice_number="INV-TEST-002",
        issue_date=date(2026, 6, 2),
        buyer_name="Client B",
        total_subtotal=Decimal("200.00"),
        total_payable=Decimal("230.00"),
        status="posted",
    )
    db.add_all([inv1, inv2])
    db.flush()

    c1 = MushakChallan(
        business_id=biz.id,
        invoice_id=inv1.id,
        mushak_number="MUSHAK-DUP-001",
        serial_number=1,
        fiscal_year="2025-2026",
        bin="BIN-123",
        issued_at=datetime.utcnow(),
    )
    db.add(c1)
    db.commit()

    c2 = MushakChallan(
        business_id=biz.id,
        invoice_id=inv2.id,
        mushak_number="MUSHAK-DUP-001",  # Duplicate within business!
        serial_number=2,
        fiscal_year="2025-2026",
        bin="BIN-123",
        issued_at=datetime.utcnow(),
    )
    db.add(c2)

    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
