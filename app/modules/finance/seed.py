"""
Default Chart of Accounts & Sample Finance Data Seed for Bangladesh Context.
"""

import sys
from pathlib import Path

# Ensure project root is in sys.path when script is executed directly
repo_root = Path(__file__).resolve().parent.parent.parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.finance.models import (
    Account,
    CreditDebitNote,
    Customer,
    FiscalPeriod,
    FiscalYear,
    JournalEntry,
    JournalVoucher,
    MushakChallan,
    SalesImportBatch,
    SalesInvoice,
    SalesInvoiceLine,
)

DEFAULT_BD_ACCOUNTS = [
    # ASSETS (1000s)
    {"code": "1010", "name": "Cash on Hand", "account_type": "asset", "is_system": True, "description": "Cash balance in hand"},
    {"code": "1020", "name": "Bank Account", "account_type": "asset", "is_system": True, "description": "Primary operating bank account"},
    {"code": "1100", "name": "Accounts Receivable", "account_type": "asset", "is_system": True, "description": "Receivable from trade customers"},
    {"code": "1200", "name": "Input VAT Receivable", "account_type": "asset", "is_system": True, "description": "Input VAT paid on purchases (Mushak 6.1/6.2)"},
    {"code": "1210", "name": "TDS Receivable", "account_type": "asset", "is_system": True, "description": "Tax Deducted at Source by customers"},
    {"code": "1220", "name": "VDS Receivable", "account_type": "asset", "is_system": True, "description": "VAT Deducted at Source by customers"},
    {"code": "1300", "name": "Merchandise Inventory", "account_type": "asset", "is_system": True, "description": "Stock inventory value"},

    # LIABILITIES (2000s)
    {"code": "2010", "name": "Accounts Payable", "account_type": "liability", "is_system": True, "description": "Payable to trade suppliers"},
    {"code": "2100", "name": "Output VAT Payable (15%)", "account_type": "liability", "is_system": True, "description": "Output VAT collected on sales (Mushak 6.3)"},
    {"code": "2110", "name": "Output VAT Payable (Reduced/Exempt)", "account_type": "liability", "is_system": True, "description": "Output VAT at non-standard rates"},
    {"code": "2120", "name": "Supplementary Duty Payable", "account_type": "liability", "is_system": True, "description": "Supplementary Duty liability"},
    {"code": "2200", "name": "TDS Payable", "account_type": "liability", "is_system": True, "description": "Tax deducted from employee salaries and vendor payments"},
    {"code": "2210", "name": "VDS Payable", "account_type": "liability", "is_system": True, "description": "VAT deducted at source from supplier payments"},
    {"code": "2300", "name": "Provident Fund Payable", "account_type": "liability", "is_system": True, "description": "Employee & Company PF contributions payable"},
    {"code": "2400", "name": "Salary Payable", "account_type": "liability", "is_system": True, "description": "Net salaries payable to employees"},

    # EQUITY (3000s)
    {"code": "3010", "name": "Owner's Capital", "account_type": "equity", "is_system": True, "description": "Share capital / Owner equity"},
    {"code": "3020", "name": "Retained Earnings", "account_type": "equity", "is_system": True, "description": "Accumulated profits/losses"},

    # INCOME (4000s)
    {"code": "4010", "name": "Sales Revenue", "account_type": "income", "is_system": True, "description": "Revenue from product sales"},
    {"code": "4020", "name": "Service Revenue", "account_type": "income", "is_system": True, "description": "Revenue from services rendered"},
    {"code": "4090", "name": "Other Income", "account_type": "income", "is_system": False, "description": "Miscellaneous income"},

    # EXPENSES (5000s)
    {"code": "5010", "name": "Cost of Goods Sold", "account_type": "expense", "is_system": True, "description": "Direct cost of inventory sold"},
    {"code": "5100", "name": "Salary Expense", "account_type": "expense", "is_system": True, "description": "Gross salary expense"},
    {"code": "5110", "name": "House Rent Allowance Expense", "account_type": "expense", "is_system": False, "description": "House rent allowance"},
    {"code": "5120", "name": "Medical Allowance Expense", "account_type": "expense", "is_system": False, "description": "Medical allowance"},
    {"code": "5130", "name": "Conveyance Allowance Expense", "account_type": "expense", "is_system": False, "description": "Conveyance allowance"},
    {"code": "5200", "name": "Office Rent Expense", "account_type": "expense", "is_system": False, "description": "Office space rent"},
    {"code": "5210", "name": "Utilities Expense", "account_type": "expense", "is_system": False, "description": "Electricity, water, internet"},
    {"code": "5900", "name": "General & Administrative Expense", "account_type": "expense", "is_system": False, "description": "Other operating costs"},
]


async def seed_default_chart_of_accounts(db: AsyncSession, business_id: int, is_testing: bool = False) -> list[Account]:
    """Seed standard Bangladesh chart of accounts for a given business profile if not present."""
    res = await db.execute(select(Account).where(Account.business_id == business_id))
    existing = {acc.code for acc in res.scalars().all()}

    created = []
    for item in DEFAULT_BD_ACCOUNTS:
        if item["code"] not in existing:
            acc = Account(
                business_id=business_id,
                code=item["code"],
                name=item["name"],
                account_type=item["account_type"],
                is_system=item["is_system"],
                is_testing=is_testing,
                description=item["description"],
            )
            db.add(acc)
            created.append(acc)

    if created:
        await db.commit()
    return created


def seed_default_chart_of_accounts_sync(db, business_id: int, is_testing: bool = False) -> list[Account]:
    """Synchronous version of chart of accounts seeder."""
    existing = {acc.code for acc in db.query(Account).filter(Account.business_id == business_id).all()}
    created = []
    for item in DEFAULT_BD_ACCOUNTS:
        if item["code"] not in existing:
            acc = Account(
                business_id=business_id,
                code=item["code"],
                name=item["name"],
                account_type=item["account_type"],
                is_system=item["is_system"],
                is_testing=is_testing,
                description=item["description"],
            )
            db.add(acc)
            created.append(acc)

    if created:
        db.commit()
    return created


async def seed_wbsoft_finance_data(db: AsyncSession, business_id: int, is_testing: bool = False) -> None:
    """Async version of finance data seeder for WBSOFT."""
    await seed_default_chart_of_accounts(db, business_id, is_testing=is_testing)

    res_acc = await db.execute(select(Account).where(Account.business_id == business_id))
    accounts = res_acc.scalars().all()
    acc_map = {acc.code: acc for acc in accounts}

    fy_name = "FY 2025-2026"
    res_fy = await db.execute(select(FiscalYear).where(FiscalYear.business_id == business_id, FiscalYear.name == fy_name))
    fy = res_fy.scalars().first()
    if not fy:
        fy = FiscalYear(
            business_id=business_id,
            name=fy_name,
            start_date=date(2025, 7, 1),
            end_date=date(2026, 6, 30),
            status="open",
            is_current=True,
            is_testing=is_testing,
        )
        db.add(fy)
        await db.flush()

        months = [
            ("July 2025", date(2025, 7, 1), date(2025, 7, 31)),
            ("August 2025", date(2025, 8, 1), date(2025, 8, 31)),
            ("September 2025", date(2025, 9, 1), date(2025, 9, 30)),
            ("October 2025", date(2025, 10, 1), date(2025, 10, 31)),
            ("November 2025", date(2025, 11, 1), date(2025, 11, 30)),
            ("December 2025", date(2025, 12, 1), date(2025, 12, 31)),
            ("January 2026", date(2026, 1, 1), date(2026, 1, 31)),
            ("February 2026", date(2026, 2, 1), date(2026, 2, 28)),
            ("March 2026", date(2026, 3, 1), date(2026, 3, 31)),
            ("April 2026", date(2026, 4, 1), date(2026, 4, 30)),
            ("May 2026", date(2026, 5, 1), date(2026, 5, 31)),
            ("June 2026", date(2026, 6, 1), date(2026, 6, 30)),
        ]
        for pnum, (mname, sdate, edate) in enumerate(months, 1):
            fp = FiscalPeriod(
                fiscal_year_id=fy.id,
                business_id=business_id,
                period_number=pnum,
                name=mname,
                start_date=sdate,
                end_date=edate,
                status="open",
                is_testing=is_testing,
            )
            db.add(fp)
        await db.flush()

    jv_num = "JV-2025-001"
    res_jv = await db.execute(select(JournalVoucher).where(JournalVoucher.business_id == business_id, JournalVoucher.voucher_number == jv_num))
    jv = res_jv.scalars().first()
    if not jv:
        cash_acc = acc_map.get("1010")
        cap_acc = acc_map.get("3010")
        if cash_acc and cap_acc:
            jv = JournalVoucher(
                business_id=business_id,
                voucher_number=jv_num,
                voucher_type="journal",
                entry_date=date(2025, 7, 1),
                status="posted",
                is_testing=is_testing,
                reference="INIT-CAPITAL",
                notes="Initial capital injection for WBSOFT operations",
            )
            db.add(jv)
            await db.flush()

            e1 = JournalEntry(
                voucher_id=jv.id,
                account_id=cash_acc.id,
                debit=Decimal("500000.00"),
                credit=Decimal("0.00"),
                narration="Capital cash deposit",
            )
            e2 = JournalEntry(
                voucher_id=jv.id,
                account_id=cap_acc.id,
                debit=Decimal("0.00"),
                credit=Decimal("500000.00"),
                narration="Owner capital contribution",
            )
            db.add_all([e1, e2])

    res_cust = await db.execute(select(Customer).where(Customer.business_id == business_id, Customer.name == "Apex Solutions Bangladesh"))
    cust = res_cust.scalars().first()
    if not cust:
        cust = Customer(
            business_id=business_id,
            name="Apex Solutions Bangladesh",
            bin="001234567-0101",
            address="Plot 12, Road 4, Gulshan-1, Dhaka 1212",
            phone="+8801711223344",
            email="accounts@apexsolutions.bd",
            is_active=True,
            is_testing=is_testing,
        )
        db.add(cust)
        await db.flush()

    inv_num = "INV-2025-001"
    res_inv = await db.execute(select(SalesInvoice).where(SalesInvoice.business_id == business_id, SalesInvoice.invoice_number == inv_num))
    inv = res_inv.scalars().first()
    if not inv:
        inv = SalesInvoice(
            business_id=business_id,
            invoice_number=inv_num,
            issue_date=date(2025, 7, 15),
            customer_id=cust.id if cust else None,
            buyer_name="Apex Solutions Bangladesh",
            buyer_bin="001234567-0101",
            buyer_address="Plot 12, Road 4, Gulshan-1, Dhaka 1212",
            total_subtotal=Decimal("100000.00"),
            total_sd=Decimal("0.00"),
            total_vat=Decimal("15000.00"),
            total_payable=Decimal("115000.00"),
            status="posted",
            is_testing=is_testing,
        )
        db.add(inv)
        await db.flush()

        line1 = SalesInvoiceLine(
            invoice_id=inv.id,
            sl_no=1,
            description="Enterprise Software License & Setup",
            uom="PCS",
            quantity=Decimal("1.0000"),
            unit_price=Decimal("100000.00"),
            total_price=Decimal("100000.00"),
            sd_rate=Decimal("0.00"),
            sd_amount=Decimal("0.00"),
            vat_rate=Decimal("15.00"),
            vat_amount=Decimal("15000.00"),
            price_incl_duties_taxes=Decimal("115000.00"),
        )
        db.add(line1)

    await db.commit()


def seed_wbsoft_finance_data_sync(db, business_id: int, is_testing: bool = False) -> None:
    """Seed comprehensive finance data (Chart of Accounts, Fiscal Year, Vouchers, Invoices) for WBSOFT."""
    # 1. Chart of Accounts
    seed_default_chart_of_accounts_sync(db, business_id, is_testing=is_testing)
    acc_map = {acc.code: acc for acc in db.query(Account).filter(Account.business_id == business_id).all()}

    # 2. Fiscal Year & 12 Periods
    fy_name = "FY 2025-2026"
    fy = db.query(FiscalYear).filter(FiscalYear.business_id == business_id, FiscalYear.name == fy_name).first()
    if not fy:
        fy = FiscalYear(
            business_id=business_id,
            name=fy_name,
            start_date=date(2025, 7, 1),
            end_date=date(2026, 6, 30),
            status="open",
            is_current=True,
            is_testing=is_testing,
        )
        db.add(fy)
        db.flush()

        months = [
            ("July 2025", date(2025, 7, 1), date(2025, 7, 31)),
            ("August 2025", date(2025, 8, 1), date(2025, 8, 31)),
            ("September 2025", date(2025, 9, 1), date(2025, 9, 30)),
            ("October 2025", date(2025, 10, 1), date(2025, 10, 31)),
            ("November 2025", date(2025, 11, 1), date(2025, 11, 30)),
            ("December 2025", date(2025, 12, 1), date(2025, 12, 31)),
            ("January 2026", date(2026, 1, 1), date(2026, 1, 31)),
            ("February 2026", date(2026, 2, 1), date(2026, 2, 28)),
            ("March 2026", date(2026, 3, 1), date(2026, 3, 31)),
            ("April 2026", date(2026, 4, 1), date(2026, 4, 30)),
            ("May 2026", date(2026, 5, 1), date(2026, 5, 31)),
            ("June 2026", date(2026, 6, 1), date(2026, 6, 30)),
        ]
        for pnum, (mname, sdate, edate) in enumerate(months, 1):
            fp = FiscalPeriod(
                fiscal_year_id=fy.id,
                business_id=business_id,
                period_number=pnum,
                name=mname,
                start_date=sdate,
                end_date=edate,
                status="open",
                is_testing=is_testing,
            )
            db.add(fp)
        db.flush()

    # 3. Sample Journal Vouchers
    jv_num = "JV-2025-001"
    jv = db.query(JournalVoucher).filter(JournalVoucher.business_id == business_id, JournalVoucher.voucher_number == jv_num).first()
    if not jv:
        cash_acc = acc_map.get("1010")
        cap_acc = acc_map.get("3010")
        if cash_acc and cap_acc:
            jv = JournalVoucher(
                business_id=business_id,
                voucher_number=jv_num,
                voucher_type="journal",
                entry_date=date(2025, 7, 1),
                status="posted",
                is_testing=is_testing,
                reference="INIT-CAPITAL",
                notes="Initial capital injection for WBSOFT operations",
            )
            db.add(jv)
            db.flush()

            e1 = JournalEntry(
                voucher_id=jv.id,
                account_id=cash_acc.id,
                debit=Decimal("500000.00"),
                credit=Decimal("0.00"),
                narration="Capital cash deposit",
            )
            e2 = JournalEntry(
                voucher_id=jv.id,
                account_id=cap_acc.id,
                debit=Decimal("0.00"),
                credit=Decimal("500000.00"),
                narration="Owner capital contribution",
            )
            db.add_all([e1, e2])

    # 4. Sample Customer & Sales Invoice
    cust = db.query(Customer).filter(Customer.business_id == business_id, Customer.name == "Apex Solutions Bangladesh").first()
    if not cust:
        cust = Customer(
            business_id=business_id,
            name="Apex Solutions Bangladesh",
            bin="001234567-0101",
            address="Plot 12, Road 4, Gulshan-1, Dhaka 1212",
            phone="+8801711223344",
            email="accounts@apexsolutions.bd",
            is_active=True,
            is_testing=is_testing,
        )
        db.add(cust)
        db.flush()

    inv_num = "INV-2025-001"
    inv = db.query(SalesInvoice).filter(SalesInvoice.business_id == business_id, SalesInvoice.invoice_number == inv_num).first()
    if not inv:
        inv = SalesInvoice(
            business_id=business_id,
            invoice_number=inv_num,
            issue_date=date(2025, 7, 15),
            customer_id=cust.id if cust else None,
            buyer_name="Apex Solutions Bangladesh",
            buyer_bin="001234567-0101",
            buyer_address="Plot 12, Road 4, Gulshan-1, Dhaka 1212",
            total_subtotal=Decimal("100000.00"),
            total_sd=Decimal("0.00"),
            total_vat=Decimal("15000.00"),
            total_payable=Decimal("115000.00"),
            status="posted",
            is_testing=is_testing,
        )
        db.add(inv)
        db.flush()

        line1 = SalesInvoiceLine(
            invoice_id=inv.id,
            sl_no=1,
            description="Enterprise Software License & Setup",
            uom="PCS",
            quantity=Decimal("1.0000"),
            unit_price=Decimal("100000.00"),
            total_price=Decimal("100000.00"),
            sd_rate=Decimal("0.00"),
            sd_amount=Decimal("0.00"),
            vat_rate=Decimal("15.00"),
            vat_amount=Decimal("15000.00"),
            price_incl_duties_taxes=Decimal("115000.00"),
        )
        db.add(line1)

    db.commit()


async def seed_finance_test_data(db: AsyncSession, business_id: int) -> dict[str, int]:
    """
    Seed comprehensive test finance data flagged with is_testing=True for any business profile.
    """
    await seed_default_chart_of_accounts(db, business_id, is_testing=True)

    res_acc = await db.execute(select(Account).where(Account.business_id == business_id))
    accounts = res_acc.scalars().all()
    acc_map = {acc.code: acc for acc in accounts}

    # Test Fiscal Year
    fy_name = "FY 2025-2026 (Test)"
    res_fy = await db.execute(
        select(FiscalYear).where(FiscalYear.business_id == business_id, FiscalYear.name == fy_name)
    )
    fy = res_fy.scalars().first()
    if not fy:
        fy = FiscalYear(
            business_id=business_id,
            name=fy_name,
            start_date=date(2025, 7, 1),
            end_date=date(2026, 6, 30),
            status="open",
            is_current=False,
            is_testing=True,
        )
        db.add(fy)
        await db.flush()

        for pnum, mname in enumerate(
            ["July 2025 (Test)", "August 2025 (Test)", "September 2025 (Test)"], 1
        ):
            fp = FiscalPeriod(
                fiscal_year_id=fy.id,
                business_id=business_id,
                period_number=pnum,
                name=mname,
                start_date=date(2025, pnum + 6, 1),
                end_date=date(2025, pnum + 6, 28),
                status="open",
                is_testing=True,
            )
            db.add(fp)

    # Test Vouchers
    vouchers_created = 0
    test_vouchers = [
        ("TEST-JV-001", "journal", date(2025, 7, 10), "TEST-REF-1", "Testing Journal Voucher 1"),
        ("TEST-JV-002", "payment", date(2025, 7, 20), "TEST-REF-2", "Testing Payment Voucher 2"),
    ]
    cash_acc = acc_map.get("1010")
    exp_acc = acc_map.get("5200") or acc_map.get("5010")
    cap_acc = acc_map.get("3010")

    for vnum, vtype, edate, vref, vnotes in test_vouchers:
        res_jv = await db.execute(
            select(JournalVoucher).where(JournalVoucher.business_id == business_id, JournalVoucher.voucher_number == vnum)
        )
        if not res_jv.scalars().first():
            jv = JournalVoucher(
                business_id=business_id,
                voucher_number=vnum,
                voucher_type=vtype,
                entry_date=edate,
                status="posted",
                is_testing=True,
                reference=vref,
                notes=vnotes,
            )
            db.add(jv)
            await db.flush()
            vouchers_created += 1

            if cash_acc and (exp_acc or cap_acc):
                target_acc = exp_acc if vtype == "payment" else cap_acc
                e1 = JournalEntry(
                    voucher_id=jv.id,
                    account_id=target_acc.id if target_acc else cash_acc.id,
                    debit=Decimal("25000.00"),
                    credit=Decimal("0.00"),
                    narration=f"Testing Debit for {vnum}",
                )
                e2 = JournalEntry(
                    voucher_id=jv.id,
                    account_id=cash_acc.id,
                    debit=Decimal("0.00"),
                    credit=Decimal("25000.00"),
                    narration=f"Testing Credit for {vnum}",
                )
                db.add_all([e1, e2])

    # Test Customer & Invoices
    cust_name = "Test Client Corp (Testing)"
    res_cust = await db.execute(
        select(Customer).where(Customer.business_id == business_id, Customer.name == cust_name)
    )
    cust = res_cust.scalars().first()
    if not cust:
        cust = Customer(
            business_id=business_id,
            name=cust_name,
            bin="999888777-0001",
            address="123 Test Street, Dhaka",
            phone="+8801900000000",
            email="test@testclient.com",
            is_active=True,
            is_testing=True,
        )
        db.add(cust)
        await db.flush()

    invoices_created = 0
    mushaks_created = 0
    test_invoices = [
        ("TEST-INV-001", date(2025, 7, 12), "TEST-MUSHAK-001"),
        ("TEST-INV-002", date(2025, 7, 25), "TEST-MUSHAK-002"),
    ]

    for inv_num, idate, mnum in test_invoices:
        res_inv = await db.execute(
            select(SalesInvoice).where(SalesInvoice.business_id == business_id, SalesInvoice.invoice_number == inv_num)
        )
        inv = res_inv.scalars().first()
        if not inv:
            inv = SalesInvoice(
                business_id=business_id,
                invoice_number=inv_num,
                issue_date=idate,
                customer_id=cust.id if cust else None,
                buyer_name=cust_name,
                buyer_bin="999888777-0001",
                buyer_address="123 Test Street, Dhaka",
                total_subtotal=Decimal("50000.00"),
                total_sd=Decimal("0.00"),
                total_vat=Decimal("7500.00"),
                total_payable=Decimal("57500.00"),
                status="posted",
                is_testing=True,
            )
            db.add(inv)
            await db.flush()
            invoices_created += 1

            line1 = SalesInvoiceLine(
                invoice_id=inv.id,
                sl_no=1,
                description="Testing Service Item",
                uom="PCS",
                quantity=Decimal("1.0000"),
                unit_price=Decimal("50000.00"),
                total_price=Decimal("50000.00"),
                sd_rate=Decimal("0.00"),
                sd_amount=Decimal("0.00"),
                vat_rate=Decimal("15.00"),
                vat_amount=Decimal("7500.00"),
                price_incl_duties_taxes=Decimal("57500.00"),
            )
            db.add(line1)
            await db.flush()

            res_mc = await db.execute(
                select(MushakChallan).where(MushakChallan.business_id == business_id, MushakChallan.mushak_number == mnum)
            )
            if not res_mc.scalars().first():
                mc = MushakChallan(
                    business_id=business_id,
                    invoice_id=inv.id,
                    mushak_number=mnum,
                    serial_number=100 + invoices_created,
                    fiscal_year="FY 2025-2026 (Test)",
                    bin="999888777-0001",
                    issued_at=datetime.combine(idate, datetime.min.time()),
                    is_testing=True,
                )
                db.add(mc)
                mushaks_created += 1

    await db.commit()
    return {
        "vouchers_created": vouchers_created,
        "invoices_created": invoices_created,
        "mushaks_created": mushaks_created,
    }


def seed_finance_test_data_sync(db, business_id: int) -> dict[str, int]:
    """
    Synchronous version of finance test data seeder.
    """
    seed_default_chart_of_accounts_sync(db, business_id, is_testing=True)
    acc_map = {acc.code: acc for acc in db.query(Account).filter(Account.business_id == business_id).all()}

    fy_name = "FY 2025-2026 (Test)"
    fy = db.query(FiscalYear).filter(FiscalYear.business_id == business_id, FiscalYear.name == fy_name).first()
    if not fy:
        fy = FiscalYear(
            business_id=business_id,
            name=fy_name,
            start_date=date(2025, 7, 1),
            end_date=date(2026, 6, 30),
            status="open",
            is_current=False,
            is_testing=True,
        )
        db.add(fy)
        db.flush()

        for pnum, mname in enumerate(["July 2025 (Test)", "August 2025 (Test)", "September 2025 (Test)"], 1):
            fp = FiscalPeriod(
                fiscal_year_id=fy.id,
                business_id=business_id,
                period_number=pnum,
                name=mname,
                start_date=date(2025, pnum + 6, 1),
                end_date=date(2025, pnum + 6, 28),
                status="open",
                is_testing=True,
            )
            db.add(fp)

    vouchers_created = 0
    test_vouchers = [
        ("TEST-JV-001", "journal", date(2025, 7, 10), "TEST-REF-1", "Testing Journal Voucher 1"),
        ("TEST-JV-002", "payment", date(2025, 7, 20), "TEST-REF-2", "Testing Payment Voucher 2"),
    ]
    cash_acc = acc_map.get("1010")
    exp_acc = acc_map.get("5200") or acc_map.get("5010")
    cap_acc = acc_map.get("3010")

    for vnum, vtype, edate, vref, vnotes in test_vouchers:
        jv = db.query(JournalVoucher).filter(JournalVoucher.business_id == business_id, JournalVoucher.voucher_number == vnum).first()
        if not jv:
            jv = JournalVoucher(
                business_id=business_id,
                voucher_number=vnum,
                voucher_type=vtype,
                entry_date=edate,
                status="posted",
                is_testing=True,
                reference=vref,
                notes=vnotes,
            )
            db.add(jv)
            db.flush()
            vouchers_created += 1

            if cash_acc and (exp_acc or cap_acc):
                target_acc = exp_acc if vtype == "payment" else cap_acc
                e1 = JournalEntry(
                    voucher_id=jv.id,
                    account_id=target_acc.id if target_acc else cash_acc.id,
                    debit=Decimal("25000.00"),
                    credit=Decimal("0.00"),
                    narration=f"Testing Debit for {vnum}",
                )
                e2 = JournalEntry(
                    voucher_id=jv.id,
                    account_id=cash_acc.id,
                    debit=Decimal("0.00"),
                    credit=Decimal("25000.00"),
                    narration=f"Testing Credit for {vnum}",
                )
                db.add_all([e1, e2])

    cust_name = "Test Client Corp (Testing)"
    cust = db.query(Customer).filter(Customer.business_id == business_id, Customer.name == cust_name).first()
    if not cust:
        cust = Customer(
            business_id=business_id,
            name=cust_name,
            bin="999888777-0001",
            address="123 Test Street, Dhaka",
            phone="+8801900000000",
            email="test@testclient.com",
            is_active=True,
            is_testing=True,
        )
        db.add(cust)
        db.flush()

    invoices_created = 0
    mushaks_created = 0
    test_invoices = [
        ("TEST-INV-001", date(2025, 7, 12), "TEST-MUSHAK-001"),
        ("TEST-INV-002", date(2025, 7, 25), "TEST-MUSHAK-002"),
    ]

    for inv_num, idate, mnum in test_invoices:
        inv = db.query(SalesInvoice).filter(SalesInvoice.business_id == business_id, SalesInvoice.invoice_number == inv_num).first()
        if not inv:
            inv = SalesInvoice(
                business_id=business_id,
                invoice_number=inv_num,
                issue_date=idate,
                customer_id=cust.id if cust else None,
                buyer_name=cust_name,
                buyer_bin="999888777-0001",
                buyer_address="123 Test Street, Dhaka",
                total_subtotal=Decimal("50000.00"),
                total_sd=Decimal("0.00"),
                total_vat=Decimal("7500.00"),
                total_payable=Decimal("57500.00"),
                status="posted",
                is_testing=True,
            )
            db.add(inv)
            db.flush()
            invoices_created += 1

            line1 = SalesInvoiceLine(
                invoice_id=inv.id,
                sl_no=1,
                description="Testing Service Item",
                uom="PCS",
                quantity=Decimal("1.0000"),
                unit_price=Decimal("50000.00"),
                total_price=Decimal("50000.00"),
                sd_rate=Decimal("0.00"),
                sd_amount=Decimal("0.00"),
                vat_rate=Decimal("15.00"),
                vat_amount=Decimal("7500.00"),
                price_incl_duties_taxes=Decimal("57500.00"),
            )
            db.add(line1)
            db.flush()

            mc = db.query(MushakChallan).filter(MushakChallan.business_id == business_id, MushakChallan.mushak_number == mnum).first()
            if not mc:
                mc = MushakChallan(
                    business_id=business_id,
                    invoice_id=inv.id,
                    mushak_number=mnum,
                    serial_number=100 + invoices_created,
                    fiscal_year="FY 2025-2026 (Test)",
                    bin="999888777-0001",
                    issued_at=datetime.combine(idate, datetime.min.time()),
                    is_testing=True,
                )
                db.add(mc)
                mushaks_created += 1

    db.commit()
    return {
        "vouchers_created": vouchers_created,
        "invoices_created": invoices_created,
        "mushaks_created": mushaks_created,
    }


async def delete_finance_test_data(db: AsyncSession, business_id: int | None = None) -> dict[str, int]:
    """
    Safely delete all finance data records flagged with is_testing=True.
    """
    from sqlalchemy import delete

    cond_mc = [MushakChallan.is_testing == True]
    cond_inv = [SalesInvoice.is_testing == True]
    cond_jv = [JournalVoucher.is_testing == True]
    cond_cust = [Customer.is_testing == True]
    cond_fy = [FiscalYear.is_testing == True]
    cond_acc = [Account.is_testing == True]
    cond_cdn = [CreditDebitNote.is_testing == True]
    cond_batch = [SalesImportBatch.is_testing == True]

    if business_id is not None:
        cond_mc.append(MushakChallan.business_id == business_id)
        cond_inv.append(SalesInvoice.business_id == business_id)
        cond_jv.append(JournalVoucher.business_id == business_id)
        cond_cust.append(Customer.business_id == business_id)
        cond_fy.append(FiscalYear.business_id == business_id)
        cond_acc.append(Account.business_id == business_id)
        cond_cdn.append(CreditDebitNote.business_id == business_id)
        cond_batch.append(SalesImportBatch.business_id == business_id)

    res_mc = await db.execute(delete(MushakChallan).where(*cond_mc))
    mushaks_deleted = res_mc.rowcount

    res_cdn = await db.execute(delete(CreditDebitNote).where(*cond_cdn))
    cdns_deleted = res_cdn.rowcount

    res_inv = await db.execute(delete(SalesInvoice).where(*cond_inv))
    invoices_deleted = res_inv.rowcount

    res_jv = await db.execute(delete(JournalVoucher).where(*cond_jv))
    vouchers_deleted = res_jv.rowcount

    res_cust = await db.execute(delete(Customer).where(*cond_cust))
    customers_deleted = res_cust.rowcount

    res_fy = await db.execute(delete(FiscalYear).where(*cond_fy))
    fy_deleted = res_fy.rowcount

    res_acc = await db.execute(delete(Account).where(*cond_acc))
    acc_deleted = res_acc.rowcount

    res_batch = await db.execute(delete(SalesImportBatch).where(*cond_batch))
    batches_deleted = res_batch.rowcount

    await db.commit()
    return {
        "mushaks_deleted": mushaks_deleted,
        "cdns_deleted": cdns_deleted,
        "invoices_deleted": invoices_deleted,
        "vouchers_deleted": vouchers_deleted,
        "customers_deleted": customers_deleted,
        "fiscal_years_deleted": fy_deleted,
        "accounts_deleted": acc_deleted,
        "batches_deleted": batches_deleted,
    }


def delete_finance_test_data_sync(db, business_id: int | None = None) -> dict[str, int]:
    """
    Synchronous version of delete_finance_test_data.
    """
    mc_q = db.query(MushakChallan).filter(MushakChallan.is_testing == True)
    inv_q = db.query(SalesInvoice).filter(SalesInvoice.is_testing == True)
    jv_q = db.query(JournalVoucher).filter(JournalVoucher.is_testing == True)
    cust_q = db.query(Customer).filter(Customer.is_testing == True)
    fy_q = db.query(FiscalYear).filter(FiscalYear.is_testing == True)
    acc_q = db.query(Account).filter(Account.is_testing == True)
    cdn_q = db.query(CreditDebitNote).filter(CreditDebitNote.is_testing == True)
    batch_q = db.query(SalesImportBatch).filter(SalesImportBatch.is_testing == True)

    if business_id is not None:
        mc_q = mc_q.filter(MushakChallan.business_id == business_id)
        inv_q = inv_q.filter(SalesInvoice.business_id == business_id)
        jv_q = jv_q.filter(JournalVoucher.business_id == business_id)
        cust_q = cust_q.filter(Customer.business_id == business_id)
        fy_q = fy_q.filter(FiscalYear.business_id == business_id)
        acc_q = acc_q.filter(Account.business_id == business_id)
        cdn_q = cdn_q.filter(CreditDebitNote.business_id == business_id)
        batch_q = batch_q.filter(SalesImportBatch.business_id == business_id)

    mushaks_deleted = mc_q.delete(synchronize_session=False)
    cdns_deleted = cdn_q.delete(synchronize_session=False)
    invoices_deleted = inv_q.delete(synchronize_session=False)
    vouchers_deleted = jv_q.delete(synchronize_session=False)
    customers_deleted = cust_q.delete(synchronize_session=False)
    fy_deleted = fy_q.delete(synchronize_session=False)
    acc_deleted = acc_q.delete(synchronize_session=False)
    batches_deleted = batch_q.delete(synchronize_session=False)

    db.commit()
    return {
        "mushaks_deleted": mushaks_deleted,
        "cdns_deleted": cdns_deleted,
        "invoices_deleted": invoices_deleted,
        "vouchers_deleted": vouchers_deleted,
        "customers_deleted": customers_deleted,
        "fiscal_years_deleted": fy_deleted,
        "accounts_deleted": acc_deleted,
        "batches_deleted": batches_deleted,
    }


if __name__ == "__main__":
    from app import models_registry  # noqa: F401
    from app.database import Base, SessionLocal, engine
    from app.core.identity.seed import seed_system_admin_and_permissions_sync
    from app.core.tenancy.models import BusinessProfile

    print("Ensuring database tables are created...")
    Base.metadata.create_all(bind=engine)

    print("Running standalone finance seed.py...")
    db = SessionLocal()
    try:
        seed_system_admin_and_permissions_sync(db)

        businesses = db.query(BusinessProfile).filter(BusinessProfile.is_active == True).all()
        for b in businesses:
            if b.name_en == "WBSOFT":
                seed_wbsoft_finance_data_sync(db, b.id)
            else:
                seed_default_chart_of_accounts_sync(db, b.id)

        print("Finance seeding completed successfully!")
    except Exception as e:
        print(f"Finance seeding failed: {e}")
        raise
    finally:
        db.close()
