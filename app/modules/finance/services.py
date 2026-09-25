import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from jinja2 import Environment, FileSystemLoader
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.tenancy.models import BusinessProfile
from app.modules.finance.models import (
    Account,
    AuditLog,
    CreditDebitNote,
    Customer,
    FiscalPeriod,
    FiscalYear,
    JournalEntry,
    JournalVoucher,
    MushakChallan,
    SalesInvoice,
    SalesInvoiceLine,
)
from app.modules.finance.schemas import (
    AccountCreate,
    AccountTreeNode,
    AccountUpdate,
    BalanceSheetReport,
    CreditDebitNoteCreate,
    CustomerCreate,
    FinancialReportLine,
    FiscalYearCreate,
    GeneralLedgerLine,
    GeneralLedgerReport,
    JournalEntryCreate,
    JournalVoucherCreate,
    JournalVoucherUpdate,
    Mushak63Buyer,
    Mushak63Footer,
    Mushak63Header,
    Mushak63JSONView,
    Mushak63LineItem,
    Mushak63RegisteredPerson,
    Mushak63Summary,
    ProfitAndLossReport,
    SalesInvoiceCreate,
    TrialBalanceItem,
    TrialBalanceReport,
)
from app.modules.finance.utils import number_to_words_bdt


async def log_audit(
    db: AsyncSession,
    business_id: int,
    user_id: int | None,
    action: str,
    entity_type: str,
    entity_id: str,
    details: str | None = None,
) -> AuditLog:
    log_entry = AuditLog(
        business_id=business_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
    )
    db.add(log_entry)
    await db.commit()
    return log_entry


# -----------------------------------------------------------------------------
# Chart of Accounts Service
# -----------------------------------------------------------------------------

class AccountService:
    @staticmethod
    async def get_accounts(db: AsyncSession, business_id: int) -> list[Account]:
        res = await db.execute(
            select(Account)
            .where(Account.business_id == business_id)
            .order_by(Account.code)
        )
        return list(res.scalars().all())

    @staticmethod
    async def get_account_tree(db: AsyncSession, business_id: int) -> list[AccountTreeNode]:
        accounts = await AccountService.get_accounts(db, business_id)
        
        # Build tree structure
        acc_dict: dict[uuid.UUID, AccountTreeNode] = {}
        roots: list[AccountTreeNode] = []

        for acc in accounts:
            node = AccountTreeNode(
                id=acc.id,
                code=acc.code,
                name=acc.name,
                account_type=acc.account_type,
                is_system=acc.is_system,
                is_active=acc.is_active,
                children=[],
            )
            acc_dict[acc.id] = node

        for acc in accounts:
            node = acc_dict[acc.id]
            if acc.parent_id and acc.parent_id in acc_dict:
                acc_dict[acc.parent_id].children.append(node)
            else:
                roots.append(node)

        return roots

    @staticmethod
    async def create_account(
        db: AsyncSession, business_id: int, data: AccountCreate
    ) -> Account:
        # Check duplicate code
        res = await db.execute(
            select(Account)
            .where(Account.business_id == business_id)
            .where(Account.code == data.code)
        )
        if res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Account with code '{data.code}' already exists.",
            )

        account = Account(
            business_id=business_id,
            code=data.code,
            name=data.name,
            account_type=data.account_type,
            parent_id=data.parent_id,
            description=data.description,
            is_system=False,
            is_active=True,
        )
        db.add(account)
        await db.commit()
        await db.refresh(account)
        return account

    @staticmethod
    async def update_account(
        db: AsyncSession, business_id: int, account_id: uuid.UUID, data: AccountUpdate
    ) -> Account:
        res = await db.execute(
            select(Account)
            .where(Account.business_id == business_id)
            .where(Account.id == account_id)
        )
        account = res.scalar_one_or_none()
        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found.",
            )

        if account.is_system and data.account_type and data.account_type != account.account_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change account type of a system account.",
            )

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(account, key, value)

        await db.commit()
        await db.refresh(account)
        return account

    @staticmethod
    async def delete_account(
        db: AsyncSession, business_id: int, account_id: uuid.UUID
    ) -> None:
        res = await db.execute(
            select(Account)
            .where(Account.business_id == business_id)
            .where(Account.id == account_id)
        )
        account = res.scalar_one_or_none()
        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found.",
            )

        if account.is_system:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="System accounts cannot be deleted.",
            )

        # Check if used in entries
        entry_check = await db.execute(
            select(JournalEntry).where(JournalEntry.account_id == account_id).limit(1)
        )
        if entry_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete account with existing journal entries. Deactivate it instead.",
            )

        await db.delete(account)
        await db.commit()


# -----------------------------------------------------------------------------
# Fiscal Year & Period Lock Service
# -----------------------------------------------------------------------------

class FiscalYearService:
    @staticmethod
    async def is_period_locked(db: AsyncSession, business_id: int, entry_date: date) -> bool:
        res = await db.execute(
            select(FiscalPeriod)
            .where(FiscalPeriod.business_id == business_id)
            .where(FiscalPeriod.start_date <= entry_date)
            .where(FiscalPeriod.end_date >= entry_date)
            .where(FiscalPeriod.status == "locked")
        )
        return res.scalar_one_or_none() is not None

    @staticmethod
    async def create_fiscal_year(
        db: AsyncSession, business_id: int, data: FiscalYearCreate
    ) -> FiscalYear:
        # Create FiscalYear
        fy = FiscalYear(
            business_id=business_id,
            name=data.name,
            start_date=data.start_date,
            end_date=data.end_date,
            status="open",
            is_current=True,
        )
        db.add(fy)
        await db.flush()

        # Generate 12 monthly periods
        from calendar import monthrange

        curr_start = data.start_date
        period_no = 1
        month_names = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ]

        while curr_start < data.end_date and period_no <= 12:
            days_in_m = monthrange(curr_start.year, curr_start.month)[1]
            curr_end = min(date(curr_start.year, curr_start.month, days_in_m), data.end_date)
            period_name = f"{month_names[curr_start.month - 1]} {curr_start.year}"

            period = FiscalPeriod(
                fiscal_year_id=fy.id,
                business_id=business_id,
                period_number=period_no,
                name=period_name,
                start_date=curr_start,
                end_date=curr_end,
                status="open",
            )
            db.add(period)

            # Advance to next month
            if curr_start.month == 12:
                curr_start = date(curr_start.year + 1, 1, 1)
            else:
                curr_start = date(curr_start.year, curr_start.month + 1, 1)
            period_no += 1

        await db.commit()
        res = await db.execute(
            select(FiscalYear)
            .options(selectinload(FiscalYear.periods))
            .where(FiscalYear.id == fy.id)
        )
        return res.scalar_one()

    @staticmethod
    async def get_fiscal_years(db: AsyncSession, business_id: int) -> list[FiscalYear]:
        res = await db.execute(
            select(FiscalYear)
            .options(selectinload(FiscalYear.periods))
            .where(FiscalYear.business_id == business_id)
            .order_by(FiscalYear.start_date.desc())
        )
        return list(res.scalars().all())

    @staticmethod
    async def lock_period(
        db: AsyncSession, business_id: int, user_id: int | None, period_id: uuid.UUID, lock_status: str
    ) -> FiscalPeriod:
        res = await db.execute(
            select(FiscalPeriod)
            .where(FiscalPeriod.business_id == business_id)
            .where(FiscalPeriod.id == period_id)
        )
        period = res.scalar_one_or_none()
        if not period:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Fiscal period not found."
            )

        period.status = lock_status
        await db.commit()
        await db.refresh(period)

        await log_audit(
            db, business_id, user_id, f"PERIOD_{lock_status.upper()}", "FiscalPeriod", str(period.id), f"Period {period.name} set to {lock_status}"
        )
        return period


# -----------------------------------------------------------------------------
# Journal Voucher & Entry Service
# -----------------------------------------------------------------------------

class JournalVoucherService:
    @staticmethod
    async def _generate_voucher_number(
        db: AsyncSession, business_id: int, voucher_type: str, entry_date: date
    ) -> str:
        prefix_map = {
            "journal": "JV",
            "payment": "PV",
            "receipt": "RV",
            "contra": "CV",
        }
        prefix = prefix_map.get(voucher_type, "JV")
        year_str = entry_date.strftime("%Y%m")

        # Count existing vouchers with this prefix/year
        query = select(func.count(JournalVoucher.id)).where(
            JournalVoucher.business_id == business_id,
            JournalVoucher.voucher_number.like(f"{prefix}-{year_str}-%"),
        )
        res = await db.execute(query)
        cnt = res.scalar() or 0
        return f"{prefix}-{year_str}-{(cnt + 1):05d}"

    @staticmethod
    async def create_voucher(
        db: AsyncSession, business_id: int, user_id: int | None, data: JournalVoucherCreate
    ) -> JournalVoucher:
        # Period lock check
        if await FiscalYearService.is_period_locked(db, business_id, data.entry_date):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot post to locked fiscal period for date {data.entry_date}.",
            )

        # Debit/Credit Balancing check
        total_debit = sum((e.debit for e in data.entries), Decimal("0.00"))
        total_credit = sum((e.credit for e in data.entries), Decimal("0.00"))

        if total_debit != total_credit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Journal voucher is not balanced. Total Debit ({total_debit}) != Total Credit ({total_credit}).",
            )

        if total_debit <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Journal voucher total amount must be greater than zero.",
            )

        voucher_num = await JournalVoucherService._generate_voucher_number(
            db, business_id, data.voucher_type, data.entry_date
        )

        voucher = JournalVoucher(
            business_id=business_id,
            voucher_number=voucher_num,
            voucher_type=data.voucher_type,
            entry_date=data.entry_date,
            status="draft",
            reference=data.reference,
            notes=data.notes,
            created_by_id=user_id,
        )
        db.add(voucher)
        await db.flush()

        for e in data.entries:
            entry = JournalEntry(
                voucher_id=voucher.id,
                account_id=e.account_id,
                debit=e.debit,
                credit=e.credit,
                narration=e.narration,
                partner_type=e.partner_type,
                partner_id=e.partner_id,
            )
            db.add(entry)

        await db.commit()
        
        # Reload with entries
        res = await db.execute(
            select(JournalVoucher)
            .options(selectinload(JournalVoucher.entries).selectinload(JournalEntry.account))
            .where(JournalVoucher.id == voucher.id)
        )
        return res.scalar_one()

    @staticmethod
    async def post_voucher(
        db: AsyncSession, business_id: int, user_id: int | None, voucher_id: uuid.UUID
    ) -> JournalVoucher:
        res = await db.execute(
            select(JournalVoucher)
            .options(selectinload(JournalVoucher.entries))
            .where(JournalVoucher.business_id == business_id)
            .where(JournalVoucher.id == voucher_id)
        )
        voucher = res.scalar_one_or_none()
        if not voucher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Journal voucher not found."
            )

        if voucher.status == "posted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Voucher is already posted."
            )
        if voucher.status == "cancelled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot post a cancelled voucher."
            )

        if await FiscalYearService.is_period_locked(db, business_id, voucher.entry_date):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot post to locked fiscal period for date {voucher.entry_date}.",
            )

        total_debit = sum((e.debit for e in voucher.entries), Decimal("0.00"))
        total_credit = sum((e.credit for e in voucher.entries), Decimal("0.00"))

        if total_debit != total_credit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Journal voucher is not balanced. Debit ({total_debit}) != Credit ({total_credit}).",
            )

        voucher.status = "posted"
        voucher.posted_by_id = user_id
        voucher.posted_at = datetime.now(timezone.utc)

        await db.commit()

        await log_audit(
            db,
            business_id,
            user_id,
            "JOURNAL_POSTED",
            "JournalVoucher",
            str(voucher.id),
            f"Voucher {voucher.voucher_number} posted.",
        )

        res = await db.execute(
            select(JournalVoucher)
            .options(selectinload(JournalVoucher.entries).selectinload(JournalEntry.account))
            .where(JournalVoucher.id == voucher.id)
        )
        return res.scalar_one()

    @staticmethod
    async def cancel_voucher(
        db: AsyncSession, business_id: int, user_id: int | None, voucher_id: uuid.UUID
    ) -> JournalVoucher:
        res = await db.execute(
            select(JournalVoucher)
            .where(JournalVoucher.business_id == business_id)
            .where(JournalVoucher.id == voucher_id)
        )
        voucher = res.scalar_one_or_none()
        if not voucher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Journal voucher not found."
            )

        if voucher.status == "cancelled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Voucher is already cancelled."
            )

        voucher.status = "cancelled"
        await db.commit()

        await log_audit(
            db,
            business_id,
            user_id,
            "JOURNAL_CANCELLED",
            "JournalVoucher",
            str(voucher.id),
            f"Voucher {voucher.voucher_number} cancelled.",
        )

        res = await db.execute(
            select(JournalVoucher)
            .options(selectinload(JournalVoucher.entries).selectinload(JournalEntry.account))
            .where(JournalVoucher.id == voucher.id)
        )
        return res.scalar_one()

    @staticmethod
    async def list_vouchers(
        db: AsyncSession,
        business_id: int,
        skip: int = 0,
        limit: int = 100,
        status_filter: str | None = None,
        voucher_type: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[JournalVoucher]:
        query = (
            select(JournalVoucher)
            .options(selectinload(JournalVoucher.entries).selectinload(JournalEntry.account))
            .where(JournalVoucher.business_id == business_id)
        )

        if status_filter:
            query = query.where(JournalVoucher.status == status_filter)
        if voucher_type:
            query = query.where(JournalVoucher.voucher_type == voucher_type)
        if start_date:
            query = query.where(JournalVoucher.entry_date >= start_date)
        if end_date:
            query = query.where(JournalVoucher.entry_date <= end_date)

        query = query.order_by(JournalVoucher.entry_date.desc(), JournalVoucher.created_at.desc())
        query = query.offset(skip).limit(limit)

        res = await db.execute(query)
        return list(res.scalars().all())


# -----------------------------------------------------------------------------
# Reporting Service: General Ledger, Trial Balance, P&L, Balance Sheet
# -----------------------------------------------------------------------------

class FinanceReportService:
    @staticmethod
    async def get_general_ledger(
        db: AsyncSession,
        business_id: int,
        account_id: uuid.UUID,
        start_date: date,
        end_date: date,
    ) -> GeneralLedgerReport:
        # Fetch account
        acc_res = await db.execute(
            select(Account)
            .where(Account.business_id == business_id)
            .where(Account.id == account_id)
        )
        account = acc_res.scalar_one_or_none()
        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Account not found."
            )

        # Opening balance before start_date
        ob_query = (
            select(
                func.coalesce(func.sum(JournalEntry.debit), 0).label("tot_debit"),
                func.coalesce(func.sum(JournalEntry.credit), 0).label("tot_credit"),
            )
            .join(JournalVoucher, JournalEntry.voucher_id == JournalVoucher.id)
            .where(JournalVoucher.business_id == business_id)
            .where(JournalVoucher.status == "posted")
            .where(JournalEntry.account_id == account_id)
            .where(JournalVoucher.entry_date < start_date)
        )
        ob_res = await db.execute(ob_query)
        ob_row = ob_res.one()
        tot_ob_debit = Decimal(str(ob_row[0])) if hasattr(ob_row, '__getitem__') else Decimal(str(getattr(ob_row, 'tot_debit', 0)))
        tot_ob_credit = Decimal(str(ob_row[1])) if hasattr(ob_row, '__getitem__') else Decimal(str(getattr(ob_row, 'tot_credit', 0)))

        is_debit_normal = account.account_type in ("asset", "expense")
        opening_balance = (tot_ob_debit - tot_ob_credit) if is_debit_normal else (tot_ob_credit - tot_ob_debit)

        # Period entries
        entries_query = (
            select(JournalEntry, JournalVoucher)
            .join(JournalVoucher, JournalEntry.voucher_id == JournalVoucher.id)
            .where(JournalVoucher.business_id == business_id)
            .where(JournalVoucher.status == "posted")
            .where(JournalEntry.account_id == account_id)
            .where(JournalVoucher.entry_date >= start_date)
            .where(JournalVoucher.entry_date <= end_date)
            .order_by(JournalVoucher.entry_date.asc(), JournalVoucher.created_at.asc())
        )
        entries_res = await db.execute(entries_query)
        rows = entries_res.all()

        lines: list[GeneralLedgerLine] = []
        running_balance = opening_balance

        for entry, voucher in rows:
            debit = entry.debit
            credit = entry.credit
            if is_debit_normal:
                running_balance += (debit - credit)
            else:
                running_balance += (credit - debit)

            lines.append(
                GeneralLedgerLine(
                    entry_date=voucher.entry_date,
                    voucher_number=voucher.voucher_number,
                    voucher_type=voucher.voucher_type,
                    narration=entry.narration or voucher.notes,
                    debit=debit,
                    credit=credit,
                    balance=running_balance,
                )
            )

        return GeneralLedgerReport(
            account_id=account.id,
            account_code=account.code,
            account_name=account.name,
            opening_balance=opening_balance,
            closing_balance=running_balance,
            lines=lines,
        )

    @staticmethod
    async def get_trial_balance(
        db: AsyncSession, business_id: int, as_of_date: date
    ) -> TrialBalanceReport:
        # Fetch all active accounts
        acc_res = await db.execute(
            select(Account)
            .where(Account.business_id == business_id)
            .order_by(Account.code)
        )
        accounts = list(acc_res.scalars().all())

        items: list[TrialBalanceItem] = []
        total_debit = Decimal("0.00")
        total_credit = Decimal("0.00")

        for acc in accounts:
            bal_query = (
                select(
                    func.coalesce(func.sum(JournalEntry.debit), 0).label("tot_debit"),
                    func.coalesce(func.sum(JournalEntry.credit), 0).label("tot_credit"),
                )
                .join(JournalVoucher, JournalEntry.voucher_id == JournalVoucher.id)
                .where(JournalVoucher.business_id == business_id)
                .where(JournalVoucher.status == "posted")
                .where(JournalEntry.account_id == acc.id)
                .where(JournalVoucher.entry_date <= as_of_date)
            )
            res = await db.execute(bal_query)
            row = res.one()
            d = Decimal(str(row[0])) if hasattr(row, '__getitem__') else Decimal(str(getattr(row, 'tot_debit', 0)))
            c = Decimal(str(row[1])) if hasattr(row, '__getitem__') else Decimal(str(getattr(row, 'tot_credit', 0)))

            diff = d - c
            debit_bal = diff if diff > 0 else Decimal("0.00")
            credit_bal = -diff if diff < 0 else Decimal("0.00")

            if debit_bal > 0 or credit_bal > 0:
                items.append(
                    TrialBalanceItem(
                        account_id=acc.id,
                        account_code=acc.code,
                        account_name=acc.name,
                        account_type=acc.account_type,
                        debit_balance=debit_bal,
                        credit_balance=credit_bal,
                    )
                )
                total_debit += debit_bal
                total_credit += credit_bal

        return TrialBalanceReport(
            as_of_date=as_of_date,
            total_debit=total_debit,
            total_credit=total_credit,
            items=items,
        )

    @staticmethod
    async def get_profit_and_loss(
        db: AsyncSession, business_id: int, start_date: date, end_date: date
    ) -> ProfitAndLossReport:
        acc_res = await db.execute(
            select(Account)
            .where(Account.business_id == business_id)
            .where(Account.account_type.in_(["income", "expense"]))
            .order_by(Account.code)
        )
        accounts = list(acc_res.scalars().all())

        income_lines: list[FinancialReportLine] = []
        expense_lines: list[FinancialReportLine] = []

        tot_income = Decimal("0.00")
        tot_expense = Decimal("0.00")

        for acc in accounts:
            bal_query = (
                select(
                    func.coalesce(func.sum(JournalEntry.debit), 0).label("tot_debit"),
                    func.coalesce(func.sum(JournalEntry.credit), 0).label("tot_credit"),
                )
                .join(JournalVoucher, JournalEntry.voucher_id == JournalVoucher.id)
                .where(JournalVoucher.business_id == business_id)
                .where(JournalVoucher.status == "posted")
                .where(JournalEntry.account_id == acc.id)
                .where(JournalVoucher.entry_date >= start_date)
                .where(JournalVoucher.entry_date <= end_date)
            )
            res = await db.execute(bal_query)
            row = res.one()
            d = Decimal(str(row[0])) if hasattr(row, '__getitem__') else Decimal(str(getattr(row, 'tot_debit', 0)))
            c = Decimal(str(row[1])) if hasattr(row, '__getitem__') else Decimal(str(getattr(row, 'tot_credit', 0)))

            if acc.account_type == "income":
                net = c - d
                if net != 0:
                    income_lines.append(
                        FinancialReportLine(
                            account_code=acc.code, account_name=acc.name, amount=net
                        )
                    )
                    tot_income += net
            elif acc.account_type == "expense":
                net = d - c
                if net != 0:
                    expense_lines.append(
                        FinancialReportLine(
                            account_code=acc.code, account_name=acc.name, amount=net
                        )
                    )
                    tot_expense += net

        return ProfitAndLossReport(
            start_date=start_date,
            end_date=end_date,
            total_income=tot_income,
            total_expenses=tot_expense,
            net_profit=tot_income - tot_expense,
            income_breakdown=income_lines,
            expense_breakdown=expense_lines,
        )

    @staticmethod
    async def get_balance_sheet(
        db: AsyncSession, business_id: int, as_of_date: date
    ) -> BalanceSheetReport:
        acc_res = await db.execute(
            select(Account)
            .where(Account.business_id == business_id)
            .where(Account.account_type.in_(["asset", "liability", "equity"]))
            .order_by(Account.code)
        )
        accounts = list(acc_res.scalars().all())

        asset_lines: list[FinancialReportLine] = []
        liability_lines: list[FinancialReportLine] = []
        equity_lines: list[FinancialReportLine] = []

        tot_assets = Decimal("0.00")
        tot_liabilities = Decimal("0.00")
        tot_equity = Decimal("0.00")

        for acc in accounts:
            bal_query = (
                select(
                    func.coalesce(func.sum(JournalEntry.debit), 0).label("tot_debit"),
                    func.coalesce(func.sum(JournalEntry.credit), 0).label("tot_credit"),
                )
                .join(JournalVoucher, JournalEntry.voucher_id == JournalVoucher.id)
                .where(JournalVoucher.business_id == business_id)
                .where(JournalVoucher.status == "posted")
                .where(JournalEntry.account_id == acc.id)
                .where(JournalVoucher.entry_date <= as_of_date)
            )
            res = await db.execute(bal_query)
            row = res.one()
            d = Decimal(str(row[0])) if hasattr(row, '__getitem__') else Decimal(str(getattr(row, 'tot_debit', 0)))
            c = Decimal(str(row[1])) if hasattr(row, '__getitem__') else Decimal(str(getattr(row, 'tot_credit', 0)))

            if acc.account_type == "asset":
                net = d - c
                if net != 0:
                    asset_lines.append(
                        FinancialReportLine(
                            account_code=acc.code, account_name=acc.name, amount=net
                        )
                    )
                    tot_assets += net
            elif acc.account_type == "liability":
                net = c - d
                if net != 0:
                    liability_lines.append(
                        FinancialReportLine(
                            account_code=acc.code, account_name=acc.name, amount=net
                        )
                    )
                    tot_liabilities += net
            elif acc.account_type == "equity":
                net = c - d
                if net != 0:
                    equity_lines.append(
                        FinancialReportLine(
                            account_code=acc.code, account_name=acc.name, amount=net
                        )
                    )
                    tot_equity += net

        return BalanceSheetReport(
            as_of_date=as_of_date,
            total_assets=tot_assets,
            total_liabilities=tot_liabilities,
            total_equity=tot_equity,
            asset_breakdown=asset_lines,
            liability_breakdown=liability_lines,
            equity_breakdown=equity_lines,
        )


# -----------------------------------------------------------------------------
# Sales Invoices & Mushak 6.3 Service
# -----------------------------------------------------------------------------

class InvoiceService:
    @staticmethod
    async def _generate_invoice_number(db: AsyncSession, business_id: int, issue_date: date) -> str:
        fy_str = issue_date.strftime("%Y%m")
        query = select(func.count(SalesInvoice.id)).where(
            SalesInvoice.business_id == business_id,
            SalesInvoice.invoice_number.like(f"INV-{fy_str}-%"),
        )
        res = await db.execute(query)
        cnt = res.scalar() or 0
        return f"INV-{fy_str}-{(cnt + 1):05d}"

    @staticmethod
    async def create_invoice(
        db: AsyncSession, business_id: int, user_id: int | None, data: SalesInvoiceCreate
    ) -> SalesInvoice:
        inv_number = await InvoiceService._generate_invoice_number(db, business_id, data.issue_date)

        # Calculate line item amounts
        lines_to_add = []
        tot_subtotal = Decimal("0.00")
        tot_sd = Decimal("0.00")
        tot_vat = Decimal("0.00")
        tot_payable = Decimal("0.00")

        for idx, line_data in enumerate(data.lines, start=1):
            qty = line_data.quantity
            uprice = line_data.unit_price
            tot_price = round(qty * uprice, 2)

            sd_rate = line_data.sd_rate
            sd_amt = round(tot_price * (sd_rate / Decimal("100.00")), 2)

            vat_rate = line_data.vat_rate
            vat_amt = round((tot_price + sd_amt) * (vat_rate / Decimal("100.00")), 2)

            line_payable = tot_price + sd_amt + vat_amt

            tot_subtotal += tot_price
            tot_sd += sd_amt
            tot_vat += vat_amt
            tot_payable += line_payable

            lines_to_add.append({
                "sl_no": idx,
                "description": line_data.description,
                "uom": line_data.uom,
                "quantity": qty,
                "unit_price": uprice,
                "total_price": tot_price,
                "sd_rate": sd_rate,
                "sd_amount": sd_amt,
                "vat_rate": vat_rate,
                "vat_amount": vat_amt,
                "price_incl_duties_taxes": line_payable,
            })

        invoice = SalesInvoice(
            business_id=business_id,
            invoice_number=inv_number,
            issue_date=data.issue_date,
            customer_id=data.customer_id,
            buyer_name=data.buyer_name,
            buyer_bin=data.buyer_bin,
            buyer_address=data.buyer_address,
            delivery_destination=data.delivery_destination,
            vehicle_nature_number=data.vehicle_nature_number,
            so_number=data.so_number,
            bill_number=data.bill_number,
            total_subtotal=tot_subtotal,
            total_sd=tot_sd,
            total_vat=tot_vat,
            total_payable=tot_payable,
            status="draft",
        )
        db.add(invoice)
        await db.flush()

        for ldict in lines_to_add:
            line_obj = SalesInvoiceLine(invoice_id=invoice.id, **ldict)
            db.add(line_obj)

        await db.commit()

        res = await db.execute(
            select(SalesInvoice)
            .options(
                selectinload(SalesInvoice.lines),
                selectinload(SalesInvoice.mushak_challan),
            )
            .where(SalesInvoice.id == invoice.id)
        )
        return res.scalar_one()

    @staticmethod
    async def post_invoice(
        db: AsyncSession, business_id: int, user_id: int | None, invoice_id: uuid.UUID
    ) -> SalesInvoice:
        res = await db.execute(
            select(SalesInvoice)
            .options(selectinload(SalesInvoice.lines))
            .where(SalesInvoice.business_id == business_id)
            .where(SalesInvoice.id == invoice_id)
        )
        invoice = res.scalar_one_or_none()
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Sales invoice not found."
            )

        if invoice.status == "posted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invoice is already posted."
            )
        if invoice.status == "cancelled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot post a cancelled invoice."
            )

        # Check accounts needed for auto-posting
        accs_res = await db.execute(
            select(Account).where(Account.business_id == business_id)
        )
        acc_dict = {a.code: a for a in accs_res.scalars().all()}

        ar_acc = acc_dict.get("1100") or acc_dict.get("1010")  # Accounts Receivable or Cash
        sales_acc = acc_dict.get("4010")  # Sales Revenue
        vat_acc = acc_dict.get("2100")  # Output VAT Payable
        sd_acc = acc_dict.get("2120")  # SD Payable

        if not (ar_acc and sales_acc and vat_acc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Default accounting accounts (1100 Accounts Receivable, 4010 Sales Revenue, 2100 Output VAT Payable) must be present to post sales invoice.",
            )

        # Build entries
        entries = [
            JournalEntryCreate(
                account_id=ar_acc.id,
                debit=invoice.total_payable,
                credit=Decimal("0.00"),
                narration=f"AR for Invoice {invoice.invoice_number}",
                partner_type="customer",
                partner_id=str(invoice.customer_id) if invoice.customer_id else None,
            ),
            JournalEntryCreate(
                account_id=sales_acc.id,
                debit=Decimal("0.00"),
                credit=invoice.total_subtotal,
                narration=f"Sales revenue for Invoice {invoice.invoice_number}",
            ),
            JournalEntryCreate(
                account_id=vat_acc.id,
                debit=Decimal("0.00"),
                credit=invoice.total_vat,
                narration=f"Output VAT 15% for Invoice {invoice.invoice_number}",
            ),
        ]

        if invoice.total_sd > Decimal("0.00") and sd_acc:
            entries.append(
                JournalEntryCreate(
                    account_id=sd_acc.id,
                    debit=Decimal("0.00"),
                    credit=invoice.total_sd,
                    narration=f"Supplementary Duty for Invoice {invoice.invoice_number}",
                )
            )

        jv_create = JournalVoucherCreate(
            business_id=business_id,
            voucher_type="journal",
            entry_date=invoice.issue_date,
            reference=invoice.invoice_number,
            notes=f"Auto-posted sales invoice {invoice.invoice_number} for {invoice.buyer_name}",
            entries=entries,
        )

        voucher = await JournalVoucherService.create_voucher(db, business_id, user_id, jv_create)
        await JournalVoucherService.post_voucher(db, business_id, user_id, voucher.id)

        invoice.status = "posted"
        invoice.voucher_id = voucher.id
        await db.commit()

        await log_audit(
            db, business_id, user_id, "INVOICE_POSTED", "SalesInvoice", str(invoice.id), f"Invoice {invoice.invoice_number} posted with voucher {voucher.voucher_number}"
        )

        res = await db.execute(
            select(SalesInvoice)
            .options(
                selectinload(SalesInvoice.lines),
                selectinload(SalesInvoice.mushak_challan),
            )
            .where(SalesInvoice.id == invoice.id)
        )
        return res.scalar_one()

    @staticmethod
    async def get_invoice(
        db: AsyncSession, business_id: int | None, invoice_id: uuid.UUID
    ) -> SalesInvoice:
        query = (
            select(SalesInvoice)
            .options(
                selectinload(SalesInvoice.lines),
                selectinload(SalesInvoice.mushak_challan),
            )
            .where(SalesInvoice.id == invoice_id)
        )
        if business_id is not None:
            query = query.where(SalesInvoice.business_id == business_id)

        res = await db.execute(query)
        invoice = res.scalar_one_or_none()
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Sales invoice not found."
            )
        return invoice

    @staticmethod
    async def list_invoices(
        db: AsyncSession,
        business_id: int,
        skip: int = 0,
        limit: int = 100,
        status_filter: str | None = None,
        customer_id: uuid.UUID | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[SalesInvoice]:
        query = (
            select(SalesInvoice)
            .options(
                selectinload(SalesInvoice.lines),
                selectinload(SalesInvoice.mushak_challan),
            )
            .where(SalesInvoice.business_id == business_id)
        )

        if status_filter:
            query = query.where(SalesInvoice.status == status_filter)
        if customer_id:
            query = query.where(SalesInvoice.customer_id == customer_id)
        if start_date:
            query = query.where(SalesInvoice.issue_date >= start_date)
        if end_date:
            query = query.where(SalesInvoice.issue_date <= end_date)

        query = query.order_by(SalesInvoice.issue_date.desc(), SalesInvoice.created_at.desc())
        query = query.offset(skip).limit(limit)

        res = await db.execute(query)
        return list(res.scalars().all())


class Mushak63Service:
    @staticmethod
    def _get_fiscal_year_label(issue_date: date) -> str:
        if issue_date.month >= 7:
            start_y = issue_date.year
            end_y = issue_date.year + 1
        else:
            start_y = issue_date.year - 1
            end_y = issue_date.year
        return f"{start_y}-{end_y}"

    @staticmethod
    async def resolve_sales_invoice(
        db: AsyncSession, business_id: int | None, record_id: uuid.UUID, user: Any = None
    ) -> SalesInvoice:
        """
        Resolves a SalesInvoice from record_id, which can be a SalesInvoice ID,
        a MushakChallan ID, or an Order ID.
        """
        # 1. Try finding SalesInvoice by ID
        query = (
            select(SalesInvoice)
            .options(
                selectinload(SalesInvoice.lines),
                selectinload(SalesInvoice.mushak_challan),
            )
            .where(SalesInvoice.id == record_id)
        )
        if business_id is not None:
            query = query.where(SalesInvoice.business_id == business_id)

        res = await db.execute(query)
        invoice = res.scalar_one_or_none()

        # 2. If not found, check if record_id is a MushakChallan ID
        if not invoice:
            mushak_query = select(MushakChallan).where(MushakChallan.id == record_id)
            if business_id is not None:
                mushak_query = mushak_query.where(MushakChallan.business_id == business_id)
            m_res = await db.execute(mushak_query)
            mushak = m_res.scalar_one_or_none()
            if mushak:
                inv_query = (
                    select(SalesInvoice)
                    .options(
                        selectinload(SalesInvoice.lines),
                        selectinload(SalesInvoice.mushak_challan),
                    )
                    .where(SalesInvoice.id == mushak.invoice_id)
                )
                inv_res = await db.execute(inv_query)
                invoice = inv_res.scalar_one_or_none()

        # 3. If still not found, check if record_id is an Order ID
        if not invoice:
            from app.modules.ecommerce.orders.models import Order
            order_query = select(Order).where(Order.id == record_id)
            if business_id is not None:
                order_query = order_query.where(Order.business_id == business_id)
            o_res = await db.execute(order_query)
            order = o_res.scalar_one_or_none()
            if order:
                user_id = getattr(user, "id", None)
                mushak = await Mushak63Service.generate_mushak_from_order(
                    db, order.business_id, user_id, order.id
                )
                inv_query = (
                    select(SalesInvoice)
                    .options(
                        selectinload(SalesInvoice.lines),
                        selectinload(SalesInvoice.mushak_challan),
                    )
                    .where(SalesInvoice.id == mushak.invoice_id)
                )
                inv_res = await db.execute(inv_query)
                invoice = inv_res.scalar_one_or_none()

        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Sales invoice not found."
            )

        if user:
            from app.core.tenancy.scoping import verify_record_ownership
            verify_record_ownership(invoice, user)

        return invoice

    @staticmethod
    async def issue_mushak_challan(
        db: AsyncSession, business_id: int | None, user_id: int | None, invoice_id: uuid.UUID, user: Any = None
    ) -> MushakChallan:
        invoice = await Mushak63Service.resolve_sales_invoice(db, business_id, invoice_id, user)
        effective_business_id = invoice.business_id

        if invoice.status != "posted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mushak 6.3 can only be issued for POSTED invoices.",
            )

        if invoice.mushak_challan:
            return invoice.mushak_challan

        # Get business BIN / VAT Number
        biz_res = await db.execute(
            select(BusinessProfile).where(BusinessProfile.id == effective_business_id)
        )
        biz = biz_res.scalar_one_or_none()
        issuer_bin = (biz.vat_number if biz and biz.vat_number else "BD123456789").strip()

        fy_label = Mushak63Service._get_fiscal_year_label(invoice.issue_date)

        # Get next serial for (effective_business_id, bin, fy)
        max_sl_res = await db.execute(
            select(func.max(MushakChallan.serial_number))
            .where(MushakChallan.business_id == effective_business_id)
            .where(MushakChallan.bin == issuer_bin)
            .where(MushakChallan.fiscal_year == fy_label)
        )
        max_sl = max_sl_res.scalar() or 0
        next_sl = max_sl + 1

        fy_compact = fy_label.replace("-", "")
        mushak_num = f"M6.3-{issuer_bin}-{fy_compact}-{next_sl:06d}"

        mushak = MushakChallan(
            business_id=effective_business_id,
            invoice_id=invoice.id,
            mushak_number=mushak_num,
            serial_number=next_sl,
            fiscal_year=fy_label,
            bin=issuer_bin,
            issued_at=datetime.now(timezone.utc),
            issued_by_id=user_id,
        )
        db.add(mushak)
        await db.commit()
        await db.refresh(mushak)

        await log_audit(
            db, effective_business_id, user_id, "MUSHAK_ISSUED", "MushakChallan", str(mushak.id), f"Issued Mushak 6.3 Challan {mushak.mushak_number} for Invoice {invoice.invoice_number}"
        )
        return mushak

    @staticmethod
    async def generate_mushak_json(
        db: AsyncSession, business_id: int | None, invoice_id: uuid.UUID, user: Any = None
    ) -> Mushak63JSONView:
        invoice = await Mushak63Service.resolve_sales_invoice(db, business_id, invoice_id, user)
        mushak = await Mushak63Service.issue_mushak_challan(db, invoice.business_id, None, invoice.id, user)

        biz_res = await db.execute(
            select(BusinessProfile).where(BusinessProfile.id == invoice.business_id)
        )
        biz = biz_res.scalar_one_or_none()

        registered_person = Mushak63RegisteredPerson(
            name=biz.legal_name or biz.name_en if biz else "WBSOFT",
            bin=mushak.bin,
            address=biz.address_en if biz and biz.address_en else (f"{biz.city or ''}, {biz.country or 'Bangladesh'}".strip(", ") if biz else "WBSOFT"),
            issue_venue=biz.city if biz else "Dhaka",
        )

        header = Mushak63Header(
            mushak_number=mushak.mushak_number,
            invoice_number=invoice.invoice_number,
            issue_date=invoice.issue_date.strftime("%d.%m.%Y"),
            issue_time=mushak.issued_at.strftime("%I:%M %p") if mushak.issued_at else "12:00 PM",
            so_number=invoice.so_number,
            bill_number=invoice.bill_number or invoice.so_number,
        )

        buyer = Mushak63Buyer(
            name=invoice.buyer_name,
            bin=invoice.buyer_bin,
            address=invoice.buyer_address,
            delivery_destination=invoice.delivery_destination,
            vehicle_nature_number=invoice.vehicle_nature_number,
        )

        lines = [
            Mushak63LineItem(
                sl_no=l.sl_no,
                description=l.description,
                uom=l.uom,
                quantity=l.quantity,
                unit_price=l.unit_price,
                total_price=l.total_price,
                sd_rate=l.sd_rate,
                sd_amount=l.sd_amount,
                vat_rate=l.vat_rate,
                vat_amount=l.vat_amount,
                price_incl_duties_taxes=l.price_incl_duties_taxes,
            )
            for l in invoice.lines
        ]

        total_quantity = sum((l.quantity for l in invoice.lines), Decimal("0"))
        summary = Mushak63Summary(
            total_quantity=total_quantity,
            total_price=invoice.total_subtotal,
            total_sd=invoice.total_sd,
            total_vat=invoice.total_vat,
            total_payable=invoice.total_payable,
            total_in_words=number_to_words_bdt(invoice.total_payable),
        )

        footer = Mushak63Footer(
            authorized_person_name="System Administrator",
            designation="Executive",
        )

        return Mushak63JSONView(
            registered_person=registered_person,
            header=header,
            buyer=buyer,
            lines=lines,
            summary=summary,
            footer=footer,
        )

    @staticmethod
    def is_order_mushak_eligible(order, db_sync=None) -> tuple[bool, str]:
        """
        Determines if an order is eligible for Mushak 6.3 generation based on Time of Supply rules:
        1. Payment Received: payment_status in ('paid', 'partially_paid')
        2. Goods Dispatched: fulfillment_status in ('shipped', 'partially_shipped', 'delivered', 'dispatched', 'out_for_delivery')
        3. Invoice Issued: Commercial invoice created and posted for order.
        """
        p_stat = str(getattr(order.payment_status, "value", order.payment_status)).lower()
        f_stat = str(getattr(order.fulfillment_status, "value", order.fulfillment_status)).lower()

        is_paid = p_stat in ("paid", "partially_paid")
        is_dispatched = f_stat in ("shipped", "partially_shipped", "delivered", "dispatched", "out_for_delivery")

        has_posted_invoice = False
        if db_sync is not None:
            inv = db_sync.query(SalesInvoice).filter(
                SalesInvoice.business_id == order.business_id,
                SalesInvoice.so_number == order.order_number,
                SalesInvoice.status == "posted"
            ).first()
            if inv:
                has_posted_invoice = True

        if is_paid or is_dispatched or has_posted_invoice:
            reasons = []
            if is_paid:
                reasons.append(f"Payment Received ({p_stat})")
            if is_dispatched:
                reasons.append(f"Goods Dispatched ({f_stat})")
            if has_posted_invoice:
                reasons.append("Invoice Issued")
            return True, ", ".join(reasons)

        return False, "Pending Trigger (Unpaid, Unshipped, No Invoice)"

    @staticmethod
    def generate_mushak_from_order_sync(
        db, business_id: int, user_id: int | None, order_id: uuid.UUID
    ) -> MushakChallan:
        """Synchronous version for sync DB sessions (ORM Session)."""
        from app.modules.ecommerce.orders.models import Order

        if isinstance(order_id, str):
            order_id = uuid.UUID(order_id)

        order = db.query(Order).filter(Order.id == order_id, Order.business_id == business_id).first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found for this business profile.",
            )

        # Check eligibility under Time of Supply rules
        eligible, reason = Mushak63Service.is_order_mushak_eligible(order, db_sync=db)
        if not eligible:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order {order.order_number} is not yet eligible for Mushak 6.3 generation ({reason}).",
            )

        # Check if invoice already exists for this order SO number
        existing_inv = db.query(SalesInvoice).filter(
            SalesInvoice.business_id == business_id,
            SalesInvoice.so_number == order.order_number,
        ).first()

        if existing_inv and existing_inv.mushak_challan:
            return existing_inv.mushak_challan

        if not existing_inv:
            shipping_addr = next(
                (a for a in order.addresses if a.address_type == "shipping"),
                order.addresses[0] if order.addresses else None,
            )
            buyer_name = shipping_addr.recipient_name if shipping_addr else (order.guest_email or f"Customer #{order.user_id}")
            buyer_addr = (
                f"{shipping_addr.street}, {shipping_addr.city}, {shipping_addr.country}".strip(", ")
                if shipping_addr
                else ""
            )

            # Generate Sales Invoice Number
            fy_str = (order.created_at.date() if hasattr(order.created_at, "date") else date.today()).strftime("%Y%m")
            cnt = db.query(SalesInvoice).filter(
                SalesInvoice.business_id == business_id,
                SalesInvoice.invoice_number.like(f"INV-{fy_str}-%"),
            ).count()
            inv_number = f"INV-{fy_str}-{(cnt + 1):05d}"

            tot_subtotal = Decimal("0.00")
            tot_sd = Decimal("0.00")
            tot_vat = Decimal("0.00")
            tot_payable = Decimal("0.00")
            lines_to_add = []

            for idx, item in enumerate(order.items, start=1):
                qty = Decimal(str(item.quantity))
                uprice = Decimal(str(item.unit_price))
                tot_price = round(qty * uprice, 2)
                sd_rate = Decimal("0.00")
                sd_amt = Decimal("0.00")
                vat_rate = Decimal("15.00")
                vat_amt = round(tot_price * (vat_rate / Decimal("100.00")), 2)
                line_payable = tot_price + sd_amt + vat_amt

                tot_subtotal += tot_price
                tot_sd += sd_amt
                tot_vat += vat_amt
                tot_payable += line_payable

                lines_to_add.append(
                    SalesInvoiceLine(
                        sl_no=idx,
                        description=f"{item.product_title} ({item.product_sku})",
                        uom="Pcs",
                        quantity=qty,
                        unit_price=uprice,
                        total_price=tot_price,
                        sd_rate=sd_rate,
                        sd_amount=sd_amt,
                        vat_rate=vat_rate,
                        vat_amount=vat_amt,
                        price_incl_duties_taxes=line_payable,
                    )
                )

            issue_dt = order.created_at.date() if hasattr(order.created_at, "date") else date.today()
            existing_inv = SalesInvoice(
                business_id=business_id,
                invoice_number=inv_number,
                issue_date=issue_dt,
                buyer_name=buyer_name,
                buyer_address=buyer_addr,
                so_number=order.order_number,
                total_subtotal=tot_subtotal,
                total_sd=tot_sd,
                total_vat=tot_vat,
                total_payable=tot_payable,
                status="posted",
            )
            db.add(existing_inv)
            db.flush()

            for line in lines_to_add:
                line.invoice_id = existing_inv.id
                db.add(line)
            db.flush()
        elif existing_inv.status != "posted":
            existing_inv.status = "posted"
            db.flush()

        # Check again if mushak_challan exists for existing_inv
        mushak = db.query(MushakChallan).filter(MushakChallan.invoice_id == existing_inv.id).first()
        if mushak:
            return mushak

        # Issue Mushak Challan
        biz = db.query(BusinessProfile).filter(BusinessProfile.id == business_id).first()
        issuer_bin = (biz.vat_number if biz and biz.vat_number else "BD123456789").strip()
        fy_label = Mushak63Service._get_fiscal_year_label(existing_inv.issue_date)

        max_sl = db.query(func.max(MushakChallan.serial_number)).filter(
            MushakChallan.business_id == business_id,
            MushakChallan.bin == issuer_bin,
            MushakChallan.fiscal_year == fy_label,
        ).scalar() or 0
        next_sl = max_sl + 1

        fy_compact = fy_label.replace("-", "")
        mushak_num = f"M6.3-{issuer_bin}-{fy_compact}-{next_sl:06d}"

        mushak = MushakChallan(
            business_id=business_id,
            invoice_id=existing_inv.id,
            mushak_number=mushak_num,
            serial_number=next_sl,
            fiscal_year=fy_label,
            bin=issuer_bin,
            issued_at=datetime.now(timezone.utc),
            issued_by_id=user_id,
        )
        db.add(mushak)
        db.commit()
        db.refresh(mushak)
        return mushak

    @staticmethod
    async def generate_mushak_from_order(
        db: AsyncSession, business_id: int, user_id: int | None, order_id: uuid.UUID
    ) -> MushakChallan:
        from app.modules.ecommerce.orders.models import Order
        from app.modules.finance.schemas import SalesInvoiceCreate, SalesInvoiceLineCreate

        order_res = await db.execute(
            select(Order)
            .options(selectinload(Order.items), selectinload(Order.addresses))
            .where(Order.id == order_id, Order.business_id == business_id)
        )
        order = order_res.scalar_one_or_none()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found for this business profile.",
            )

        # Check eligibility under Time of Supply rules
        p_stat = str(getattr(order.payment_status, "value", order.payment_status)).lower()
        f_stat = str(getattr(order.fulfillment_status, "value", order.fulfillment_status)).lower()
        is_paid = p_stat in ("paid", "partially_paid")
        is_dispatched = f_stat in ("shipped", "partially_shipped", "delivered", "dispatched", "out_for_delivery")

        existing_inv_res = await db.execute(
            select(SalesInvoice)
            .options(selectinload(SalesInvoice.mushak_challan))
            .where(
                SalesInvoice.business_id == business_id,
                SalesInvoice.so_number == order.order_number,
            )
        )
        invoice = existing_inv_res.scalar_one_or_none()
        has_posted_invoice = (invoice is not None and invoice.status == "posted")

        if not (is_paid or is_dispatched or has_posted_invoice):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order {order.order_number} is not eligible for Mushak 6.3 generation (unpaid, unshipped, no posted invoice).",
            )

        if invoice and invoice.mushak_challan:
            return invoice.mushak_challan

        if not invoice:
            # Extract buyer shipping address
            shipping_addr = next(
                (a for a in order.addresses if a.address_type == "shipping"),
                order.addresses[0] if order.addresses else None,
            )
            buyer_name = shipping_addr.recipient_name if shipping_addr else (order.guest_email or f"Customer #{order.user_id}")
            buyer_addr = (
                f"{shipping_addr.street}, {shipping_addr.city}, {shipping_addr.country}".strip(", ")
                if shipping_addr
                else ""
            )

            lines_create = []
            for item in order.items:
                vat_pct = Decimal("15.00")
                lines_create.append(
                    SalesInvoiceLineCreate(
                        description=f"{item.product_title} ({item.product_sku})",
                        uom="Pcs",
                        quantity=Decimal(str(item.quantity)),
                        unit_price=Decimal(str(item.unit_price)),
                        sd_rate=Decimal("0.00"),
                        vat_rate=vat_pct,
                    )
                )

            issue_dt = order.created_at.date() if hasattr(order.created_at, "date") else date.today()

            inv_data = SalesInvoiceCreate(
                issue_date=issue_dt,
                buyer_name=buyer_name,
                buyer_address=buyer_addr,
                so_number=order.order_number,
                lines=lines_create,
            )

            invoice = await InvoiceService.create_invoice(db, business_id, user_id, inv_data)
            invoice = await InvoiceService.post_invoice(db, business_id, user_id, invoice.id)

        if invoice.status != "posted":
            invoice = await InvoiceService.post_invoice(db, business_id, user_id, invoice.id)

        if invoice.mushak_challan:
            return invoice.mushak_challan

        return await Mushak63Service.issue_mushak_challan(db, business_id, user_id, invoice.id)


    @staticmethod
    async def generate_mushak_html(
        db: AsyncSession, business_id: int | None, invoice_id: uuid.UUID, user: Any = None
    ) -> str:
        json_view = await Mushak63Service.generate_mushak_json(db, business_id, invoice_id, user)

        import os
        from jinja2 import Environment, FileSystemLoader

        template_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "templates", "modules", "finance")
        env = Environment(loader=FileSystemLoader(template_dir))
        template = env.get_template("mushak_6_3.html")

        return template.render(**json_view.model_dump())


def generateMushak63(order_id: uuid.UUID | str, db=None, business_id: int | None = None, user_id: int | None = None):
    """
    Service function generateMushak63(orderId) that executes when any Time of Supply conditions are met.
    Works with both synchronous and asynchronous DB sessions.
    """
    if isinstance(order_id, str):
        order_id = uuid.UUID(order_id)

    if db is None:
        from app.database import SessionLocal
        db_sess = SessionLocal()
        try:
            from app.modules.ecommerce.orders.models import Order
            ord_obj = db_sess.query(Order).filter(Order.id == order_id).first()
            if not ord_obj:
                return None
            biz_id = business_id or ord_obj.business_id
            mushak = Mushak63Service.generate_mushak_from_order_sync(db_sess, biz_id, user_id, order_id)
            return mushak
        finally:
            db_sess.close()

    # Check if db is sync or async session
    if hasattr(db, "query"):
        from app.modules.ecommerce.orders.models import Order
        ord_obj = db.query(Order).filter(Order.id == order_id).first()
        if not ord_obj:
            return None
        biz_id = business_id or ord_obj.business_id
        return Mushak63Service.generate_mushak_from_order_sync(db, biz_id, user_id, order_id)
    else:
        # Async session
        if business_id is None:
            raise ValueError("business_id is required for async session execution without order pre-fetch")
        return Mushak63Service.generate_mushak_from_order(db, business_id, user_id, order_id)


class CreditDebitNoteService:
    @staticmethod
    async def create_note(
        db: AsyncSession, business_id: int, user_id: int | None, data: CreditDebitNoteCreate
    ) -> CreditDebitNote:
        invoice = await InvoiceService.get_invoice(db, business_id, data.invoice_id)
        if invoice.status != "posted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Credit/Debit notes can only be issued against POSTED invoices.",
            )

        prefix = "CN" if data.note_type == "credit_note" else "DN"
        fy_str = data.issue_date.strftime("%Y%m")

        query = select(func.count(CreditDebitNote.id)).where(
            CreditDebitNote.business_id == business_id,
            CreditDebitNote.note_number.like(f"{prefix}-{fy_str}-%"),
        )
        res = await db.execute(query)
        cnt = res.scalar() or 0
        note_num = f"{prefix}-{fy_str}-{(cnt + 1):05d}"

        note = CreditDebitNote(
            business_id=business_id,
            note_type=data.note_type,
            note_number=note_num,
            invoice_id=data.invoice_id,
            issue_date=data.issue_date,
            amount=data.amount,
            vat_amount=data.vat_amount,
            reason=data.reason,
            status="draft",
        )
        db.add(note)
        await db.commit()
        await db.refresh(note)
        return note
