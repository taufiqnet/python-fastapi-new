"""
Default Chart of Accounts Seed for Bangladesh Context.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.finance.models import Account

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
