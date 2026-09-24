"""
Default Chart of Accounts & Sample Finance Data Seed for Bangladesh Context.
"""

from datetime import date
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.finance.models import (
    Account,
    Customer,
    FiscalPeriod,
    FiscalYear,
    JournalEntry,
    JournalVoucher,
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


async def seed_default_chart_of_accounts(db: AsyncSession, business_id: int) -> list[Account]:
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
                description=item["description"],
            )
            db.add(acc)
            created.append(acc)

    if created:
        await db.commit()
    return created


def seed_default_chart_of_accounts_sync(db, business_id: int) -> list[Account]:
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
                description=item["description"],
            )
            db.add(acc)
            created.append(acc)

    if created:
        db.commit()
    return created


def seed_wbsoft_finance_data_sync(db, business_id: int) -> None:
    """Seed comprehensive finance data (Chart of Accounts, Fiscal Year, Vouchers, Invoices) for WBSOFT."""
    # 1. Chart of Accounts
    seed_default_chart_of_accounts_sync(db, business_id)
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
