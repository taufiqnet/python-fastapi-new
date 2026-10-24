"""
Seed data generator for Finance & Accounts module.
Generates Chart of Accounts, Fiscal Year & Periods, Opening Balance & Expense Vouchers,
B2B Customer profiles, Sales Invoices with VAT lines, and statutory Mushak 6.3 Challans.
"""
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Callable, Dict
from sqlalchemy.orm import Session

from app.modules.finance.models import (
    Account,
    FiscalYear,
    FiscalPeriod,
    JournalVoucher,
    JournalEntry,
    Customer as FinanceCustomer,
    SalesInvoice,
    SalesInvoiceLine,
    MushakChallan,
)


def seed_finance_data(db: Session, business_id: int, log_record: Callable[[str, str], None]) -> Dict[str, int]:
    counts = {
        "accounts": 0,
        "fiscal_years": 0,
        "fiscal_periods": 0,
        "journal_vouchers": 0,
        "journal_entries": 0,
        "finance_customers": 0,
        "sales_invoices": 0,
        "sales_invoice_lines": 0,
        "mushak_challans": 0,
    }

    # 1. Chart of Accounts
    account_specs = [
        # Assets
        (f"SEED-1000-{business_id % 1000}", "Cash & Cash Equivalents [SEED]", "asset", "Liquid cash balances"),
        (f"SEED-1010-{business_id % 1000}", "Dutch-Bangla Bank Corporate Account [SEED]", "asset", "Primary corporate operating bank"),
        (f"SEED-1200-{business_id % 1000}", "Accounts Receivable [SEED]", "asset", "Trade receivables from credit customers"),
        (f"SEED-1400-{business_id % 1000}", "Merchandise Inventory [SEED]", "asset", "Finished goods and stock valuation"),
        # Liabilities
        (f"SEED-2000-{business_id % 1000}", "Accounts Payable [SEED]", "liability", "Trade vendor payables"),
        (f"SEED-2200-{business_id % 1000}", "Statutory VAT Payable (Mushak) [SEED]", "liability", "NBR Output VAT liability"),
        # Equity
        (f"SEED-3000-{business_id % 1000}", "Paid-in Share Capital [SEED]", "equity", "Owner and shareholder capital"),
        (f"SEED-3100-{business_id % 1000}", "Retained Earnings [SEED]", "equity", "Accumulated surplus"),
        # Income
        (f"SEED-4000-{business_id % 1000}", "Enterprise Sales Revenue [SEED]", "income", "Revenue from goods and services"),
        # Expense
        (f"SEED-5000-{business_id % 1000}", "Cost of Goods Sold [SEED]", "expense", "Cost of items sold to customers"),
        (f"SEED-6000-{business_id % 1000}", "Salaries & Payroll Compensation [SEED]", "expense", "Monthly payroll expense"),
        (f"SEED-6100-{business_id % 1000}", "Office Rent & Facilities [SEED]", "expense", "Commercial facility lease expense"),
    ]

    accounts_by_code = {}
    for code, name, acc_type, desc in account_specs:
        acc = Account(
            business_id=business_id,
            code=code,
            name=name,
            account_type=acc_type,
            description=desc,
            is_system=False,
            is_active=True,
            is_testing=True,
        )
        db.add(acc)
        db.flush()
        log_record("finance_accounts", str(acc.id))
        accounts_by_code[code] = acc
        counts["accounts"] += 1

    # 2. Fiscal Year & Monthly Periods (e.g. FY 2025-2026 or current)
    current_year = date.today().year
    fy_name = f"FY {current_year}-{current_year + 1} [SEED-{business_id}]"
    fy = FiscalYear(
        business_id=business_id,
        name=fy_name,
        start_date=date(current_year, 7, 1),
        end_date=date(current_year + 1, 6, 30),
        status="open",
        is_current=True,
        is_testing=True,
    )
    db.add(fy)
    db.flush()
    log_record("finance_fiscal_years", str(fy.id))
    counts["fiscal_years"] += 1

    # Seed 12 Fiscal Periods
    month_names = [
        "July", "August", "September", "October", "November", "December",
        "January", "February", "March", "April", "May", "June"
    ]
    for idx, m_name in enumerate(month_names, start=1):
        # calculate approximate period dates
        cal_year = current_year if idx <= 6 else current_year + 1
        cal_month = idx + 6 if idx <= 6 else idx - 6
        start_d = date(cal_year, cal_month, 1)
        # last day of month
        if cal_month in (1, 3, 5, 7, 8, 10, 12):
            end_d = date(cal_year, cal_month, 31)
        elif cal_month == 2:
            end_d = date(cal_year, cal_month, 28)
        else:
            end_d = date(cal_year, cal_month, 30)

        fp = FiscalPeriod(
            fiscal_year_id=fy.id,
            business_id=business_id,
            period_number=idx,
            name=f"{m_name} {cal_year} [SEED]",
            start_date=start_d,
            end_date=end_d,
            status="open",
            is_testing=True,
        )
        db.add(fp)
        db.flush()
        log_record("finance_fiscal_periods", str(fp.id))
        counts["fiscal_periods"] += 1

    # 3. Journal Vouchers & Entries
    bank_code = f"SEED-1010-{business_id % 1000}"
    capital_code = f"SEED-3000-{business_id % 1000}"
    rent_code = f"SEED-6100-{business_id % 1000}"

    # Voucher 1: Opening Capital
    jv1 = JournalVoucher(
        business_id=business_id,
        voucher_number=f"SEED-JV-001-{business_id % 1000}",
        voucher_type="journal",
        entry_date=date(current_year, 7, 1),
        status="posted",
        is_testing=True,
        reference="OPENING-BAL-2026",
        notes="Opening equity and capital investment injection [SEED]",
        posted_at=datetime.now(timezone.utc),
    )
    db.add(jv1)
    db.flush()
    log_record("finance_journal_vouchers", str(jv1.id))
    counts["journal_vouchers"] += 1

    entry1_dr = JournalEntry(
        voucher_id=jv1.id,
        account_id=accounts_by_code[bank_code].id,
        debit=Decimal("5000000.00"),
        credit=Decimal("0.00"),
        narration="Bank balance from initial capitalization",
    )
    entry1_cr = JournalEntry(
        voucher_id=jv1.id,
        account_id=accounts_by_code[capital_code].id,
        debit=Decimal("0.00"),
        credit=Decimal("5000000.00"),
        narration="Paid-in share capital",
    )
    db.add_all([entry1_dr, entry1_cr])
    db.flush()
    log_record("finance_journal_entries", str(entry1_dr.id))
    log_record("finance_journal_entries", str(entry1_cr.id))
    counts["journal_entries"] += 2

    # Voucher 2: Facility Rent Payment
    jv2 = JournalVoucher(
        business_id=business_id,
        voucher_number=f"SEED-PV-001-{business_id % 1000}",
        voucher_type="payment",
        entry_date=date.today(),
        status="posted",
        is_testing=True,
        reference="RENT-OFFICE-M1",
        notes="Commercial head office monthly rent payout [SEED]",
        posted_at=datetime.now(timezone.utc),
    )
    db.add(jv2)
    db.flush()
    log_record("finance_journal_vouchers", str(jv2.id))
    counts["journal_vouchers"] += 1

    entry2_dr = JournalEntry(
        voucher_id=jv2.id,
        account_id=accounts_by_code[rent_code].id,
        debit=Decimal("150000.00"),
        credit=Decimal("0.00"),
        narration="Monthly office lease payment",
    )
    entry2_cr = JournalEntry(
        voucher_id=jv2.id,
        account_id=accounts_by_code[bank_code].id,
        debit=Decimal("0.00"),
        credit=Decimal("150000.00"),
        narration="Disbursement via DBBL Cheque",
    )
    db.add_all([entry2_dr, entry2_cr])
    db.flush()
    log_record("finance_journal_entries", str(entry2_dr.id))
    log_record("finance_journal_entries", str(entry2_cr.id))
    counts["journal_entries"] += 2

    # 4. Finance Customers (B2B Corporates)
    cust_specs = [
        ("Bashundhara Paper Mills Ltd [SEED]", "BIN-001928374-0101", "Baridhara R/A, Dhaka", "+88028401921"),
        ("Square Pharmaceuticals Ltd [SEED]", "BIN-002839485-0202", "Uttara Commercial Area, Dhaka", "+88028901822"),
    ]

    created_custs = []
    for c_name, bin_num, addr, ph in cust_specs:
        fc = FinanceCustomer(
            business_id=business_id,
            name=c_name,
            bin=bin_num,
            address=addr,
            phone=ph,
            email=f"accounts.{business_id}@seedcustomer.com",
            is_active=True,
            is_testing=True,
        )
        db.add(fc)
        db.flush()
        log_record("finance_customers", str(fc.id))
        created_custs.append(fc)
        counts["finance_customers"] += 1

    # 5. Sales Invoices with Mushak 6.3 Challan
    inv_num = f"SEED-INV-2026-001-{business_id % 1000}"
    sinv = SalesInvoice(
        business_id=business_id,
        invoice_number=inv_num,
        issue_date=date.today(),
        customer_id=created_custs[0].id,
        buyer_name=created_custs[0].name,
        buyer_bin=created_custs[0].bin,
        buyer_address=created_custs[0].address,
        delivery_destination="Bashundhara Industrial Complex, Narayanganj",
        vehicle_nature_number="Covered Van DHK-METRO-TA-14-9988",
        so_number=f"SO-SEED-8899-{business_id % 1000}",
        total_subtotal=Decimal("400000.00"),
        total_sd=Decimal("0.00"),
        total_vat=Decimal("30000.00"), # 7.5% commercial service/goods VAT
        total_payable=Decimal("430000.00"),
        status="posted",
        is_testing=True,
    )
    db.add(sinv)
    db.flush()
    log_record("finance_sales_invoices", str(sinv.id))
    counts["sales_invoices"] += 1

    # Invoice line
    line = SalesInvoiceLine(
        invoice_id=sinv.id,
        sl_no=1,
        description="Enterprise ERP Implementation & System Maintenance Services [SEED]",
        uom="Month",
        quantity=Decimal("1.0000"),
        unit_price=Decimal("400000.00"),
        total_price=Decimal("400000.00"),
        sd_rate=Decimal("0.00"),
        sd_amount=Decimal("0.00"),
        vat_rate=Decimal("7.50"),
        vat_amount=Decimal("30000.00"),
        price_incl_duties_taxes=Decimal("430000.00"),
    )
    db.add(line)
    db.flush()
    log_record("finance_sales_invoice_lines", str(line.id))
    counts["sales_invoice_lines"] += 1

    # Statutory Mushak 6.3 Tax Invoice Challan
    mushak = MushakChallan(
        business_id=business_id,
        invoice_id=sinv.id,
        mushak_number=f"MUSHAK-6.3-SEED-{business_id % 1000}-001",
        serial_number=1,
        fiscal_year=f"{current_year}-{current_year + 1}",
        bin="BIN-PROERP-990011-0001",
        issued_at=datetime.now(timezone.utc),
        is_testing=True,
    )
    db.add(mushak)
    db.flush()
    log_record("finance_mushak_challans", str(mushak.id))
    counts["mushak_challans"] += 1

    return counts
