import uuid
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_permission
from app.database import get_async_db
from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile
from app.core.tenancy.scoping import resolve_business_id, verify_record_ownership
from app.modules.finance.models import Account, FiscalYear
from app.modules.finance.services import (
    AccountService,
    FinanceReportService,
    FiscalYearService,
    InvoiceService,
    JournalVoucherService,
)

router = APIRouter(prefix="/finance", tags=["Finance View Routers"])
templates = Jinja2Templates(directory="app/templates")


# -----------------------------------------------------------------------------
# Helper function for business profiles
# -----------------------------------------------------------------------------
async def _get_business_profiles(
    db: AsyncSession, current_user: User, requested_business_id: int | None
) -> tuple[int, list[BusinessProfile], dict[int, str]]:
    resolved_biz_id = resolve_business_id(current_user, requested_business_id)

    stmt = select(BusinessProfile)
    if not current_user.is_superuser:
        stmt = stmt.where(BusinessProfile.id == resolved_biz_id)
    res = await db.execute(stmt)
    businesses = list(res.scalars().all())
    biz_map = {b.id: b.name_en for b in businesses}

    return resolved_biz_id, businesses, biz_map


# -----------------------------------------------------------------------------
# 1. Chart of Accounts Management
# -----------------------------------------------------------------------------
@router.get(
    "/accounts/manage",
    response_class=HTMLResponse,
    dependencies=[Depends(require_permission("finance", "accounts", "view"))],
)
async def manage_accounts_view(
    request: Request,
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz_id, businesses, biz_map = await _get_business_profiles(
        db, current_user, business_id
    )

    accounts = await AccountService.get_accounts(db, resolved_biz_id)

    total_count = len(accounts)
    asset_count = sum(1 for a in accounts if a.account_type == "asset")
    liability_equity_count = sum(
        1 for a in accounts if a.account_type in ("liability", "equity")
    )
    income_expense_count = sum(
        1 for a in accounts if a.account_type in ("income", "expense")
    )

    # Map parent accounts for lookup
    account_map = {a.id: a.name for a in accounts}

    return templates.TemplateResponse(
        "modules/finance/accounts/account_list.html",
        {
            "request": request,
            "current_user": current_user,
            "active_page": "finance_accounts",
            "accounts": accounts,
            "account_map": account_map,
            "businesses": businesses,
            "biz_map": biz_map,
            "selected_business_id": resolved_biz_id,
            "total_count": total_count,
            "asset_count": asset_count,
            "liability_equity_count": liability_equity_count,
            "income_expense_count": income_expense_count,
        },
    )


# -----------------------------------------------------------------------------
# 2. Fiscal Years & Period Locking
# -----------------------------------------------------------------------------
@router.get(
    "/fiscal-years/manage",
    response_class=HTMLResponse,
    dependencies=[Depends(require_permission("finance", "vouchers", "view"))],
)
async def manage_fiscal_years_view(
    request: Request,
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz_id, businesses, biz_map = await _get_business_profiles(
        db, current_user, business_id
    )

    fiscal_years = await FiscalYearService.get_fiscal_years(db, resolved_biz_id)

    total_fy_count = len(fiscal_years)
    current_fy = next((fy for fy in fiscal_years if fy.is_current), None)
    locked_periods_count = sum(
        1 for fy in fiscal_years for p in fy.periods if p.status == "locked"
    )

    return templates.TemplateResponse(
        "modules/finance/fiscal_years/fiscal_year_list.html",
        {
            "request": request,
            "current_user": current_user,
            "active_page": "finance_fiscal_years",
            "fiscal_years": fiscal_years,
            "businesses": businesses,
            "biz_map": biz_map,
            "selected_business_id": resolved_biz_id,
            "total_fy_count": total_fy_count,
            "current_fy": current_fy,
            "locked_periods_count": locked_periods_count,
        },
    )


# -----------------------------------------------------------------------------
# 3. Journal Vouchers Management
# -----------------------------------------------------------------------------
@router.get(
    "/vouchers/manage",
    response_class=HTMLResponse,
    dependencies=[Depends(require_permission("finance", "vouchers", "view"))],
)
async def manage_vouchers_view(
    request: Request,
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz_id, businesses, biz_map = await _get_business_profiles(
        db, current_user, business_id
    )

    vouchers = await JournalVoucherService.list_vouchers(db, resolved_biz_id, limit=200)
    accounts = await AccountService.get_accounts(db, resolved_biz_id)

    total_count = len(vouchers)
    draft_count = sum(1 for v in vouchers if v.status == "draft")
    posted_count = sum(1 for v in vouchers if v.status == "posted")
    cancelled_count = sum(1 for v in vouchers if v.status == "cancelled")

    return templates.TemplateResponse(
        "modules/finance/vouchers/voucher_list.html",
        {
            "request": request,
            "current_user": current_user,
            "active_page": "finance_vouchers",
            "vouchers": vouchers,
            "accounts": accounts,
            "businesses": businesses,
            "biz_map": biz_map,
            "selected_business_id": resolved_biz_id,
            "total_count": total_count,
            "draft_count": draft_count,
            "posted_count": posted_count,
            "cancelled_count": cancelled_count,
        },
    )


# -----------------------------------------------------------------------------
# 4. Sales Invoices & Sales Excel Import
# -----------------------------------------------------------------------------
@router.get(
    "/invoices/manage",
    response_class=HTMLResponse,
    dependencies=[Depends(require_permission("finance", "invoices", "view"))],
)
async def manage_invoices_view(
    request: Request,
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz_id, businesses, biz_map = await _get_business_profiles(
        db, current_user, business_id
    )

    invoices = await InvoiceService.list_invoices(db, resolved_biz_id, limit=200)

    total_count = len(invoices)
    draft_count = sum(1 for inv in invoices if inv.status == "draft")
    posted_count = sum(1 for inv in invoices if inv.status == "posted")
    total_payable = sum(inv.total_payable for inv in invoices)

    return templates.TemplateResponse(
        "modules/finance/invoices/invoice_list.html",
        {
            "request": request,
            "current_user": current_user,
            "active_page": "finance_invoices",
            "invoices": invoices,
            "businesses": businesses,
            "biz_map": biz_map,
            "selected_business_id": resolved_biz_id,
            "total_count": total_count,
            "draft_count": draft_count,
            "posted_count": posted_count,
            "total_payable": total_payable,
        },
    )


# -----------------------------------------------------------------------------
# 5. Financial Reports Management
# -----------------------------------------------------------------------------
@router.get(
    "/reports/manage",
    response_class=HTMLResponse,
    dependencies=[Depends(require_permission("finance", "reports", "view"))],
)
async def manage_reports_view(
    request: Request,
    business_id: int | None = Query(None),
    as_of_date: date | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    gl_account_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz_id, businesses, biz_map = await _get_business_profiles(
        db, current_user, business_id
    )

    today = date.today()
    as_of = as_of_date or today
    start = start_date or date(today.year, 1, 1)
    end = end_date or today

    accounts = await AccountService.get_accounts(db, resolved_biz_id)

    tb_report = await FinanceReportService.get_trial_balance(db, resolved_biz_id, as_of)
    pnl_report = await FinanceReportService.get_profit_and_loss(db, resolved_biz_id, start, end)
    bs_report = await FinanceReportService.get_balance_sheet(db, resolved_biz_id, as_of)

    gl_report = None
    gl_account = None
    if gl_account_id:
        gl_account = next((a for a in accounts if a.id == gl_account_id), None)
        if gl_account:
            gl_report = await FinanceReportService.get_general_ledger(
                db, resolved_biz_id, gl_account_id, start, end
            )
    elif accounts:
        gl_account = accounts[0]
        gl_report = await FinanceReportService.get_general_ledger(
            db, resolved_biz_id, gl_account.id, start, end
        )

    return templates.TemplateResponse(
        "modules/finance/reports/reports_manage.html",
        {
            "request": request,
            "current_user": current_user,
            "active_page": "finance_reports",
            "businesses": businesses,
            "biz_map": biz_map,
            "selected_business_id": resolved_biz_id,
            "accounts": accounts,
            "as_of_date": as_of.isoformat(),
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "tb_report": tb_report,
            "pnl_report": pnl_report,
            "bs_report": bs_report,
            "gl_report": gl_report,
            "gl_account": gl_account,
        },
    )
