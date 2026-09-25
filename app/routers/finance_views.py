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
from sqlalchemy.orm import selectinload

from app.modules.ecommerce.orders.models import Order
from fastapi import HTTPException, status
from app.modules.finance.models import Account, Customer, FiscalYear, JournalVoucher, MushakChallan, SalesInvoice
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
) -> tuple[int | None, list[BusinessProfile], dict[int, str]]:
    resolved_biz_id = resolve_business_id(current_user, requested_business_id)

    stmt = select(BusinessProfile)
    if not current_user.is_superuser:
        stmt = stmt.where(BusinessProfile.id == resolved_biz_id)
    res = await db.execute(stmt)
    businesses = list(res.scalars().all())
    biz_map = {b.id: b.name_en for b in businesses}

    if resolved_biz_id is None and businesses:
        resolved_biz_id = businesses[0].id

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
# 5. Mushak 6.3 Tax Invoice Management
# -----------------------------------------------------------------------------
@router.get(
    "/mushak-6-3/manage",
    response_class=HTMLResponse,
    dependencies=[Depends(require_permission("finance", "mushak", "view"))],
)
async def manage_mushak_63_view(
    request: Request,
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz_id, businesses, biz_map = await _get_business_profiles(
        db, current_user, business_id
    )

    # Fetch all Mushak Challans for the business profile with invoice & line data
    mushak_stmt = (
        select(MushakChallan)
        .options(
            selectinload(MushakChallan.invoice).selectinload(SalesInvoice.lines)
        )
        .where(MushakChallan.business_id == resolved_biz_id)
        .order_by(MushakChallan.issued_at.desc())
    )
    mushak_res = await db.execute(mushak_stmt)
    mushaks = list(mushak_res.scalars().all())

    # Fetch all SalesInvoices with mushak_challan for business profile
    inv_stmt = (
        select(SalesInvoice)
        .options(selectinload(SalesInvoice.mushak_challan))
        .where(SalesInvoice.business_id == resolved_biz_id)
    )
    inv_res = await db.execute(inv_stmt)
    invoices = list(inv_res.scalars().all())
    inv_map = {inv.so_number: inv for inv in invoices if inv.so_number}

    # Fetch available e-commerce orders for business profile
    order_stmt = (
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.addresses))
        .where(Order.business_id == resolved_biz_id)
        .order_by(Order.created_at.desc())
    )
    order_res = await db.execute(order_stmt)
    orders = list(order_res.scalars().all())

    orders_with_mushak_status = []
    ready_to_generate_count = 0
    pending_trigger_count = 0

    for o in orders:
        inv = inv_map.get(o.order_number)
        has_mushak = (inv is not None and inv.mushak_challan is not None)

        p_stat = str(getattr(o.payment_status, "value", o.payment_status)).lower()
        f_stat = str(getattr(o.fulfillment_status, "value", o.fulfillment_status)).lower()
        is_paid = p_stat in ("paid", "partially_paid")
        is_dispatched = f_stat in ("shipped", "partially_shipped", "delivered", "dispatched", "out_for_delivery")
        has_posted_inv = (inv is not None and inv.status == "posted")

        if has_mushak:
            m_status = "Generated"
            reason = "Mushak 6.3 Tax Invoice Issued"
            can_gen = False
        elif is_paid or is_dispatched or has_posted_inv:
            m_status = "Ready to Generate"
            reasons = []
            if is_paid: reasons.append(f"Payment Received ({p_stat})")
            if is_dispatched: reasons.append(f"Goods Dispatched ({f_stat})")
            if has_posted_inv: reasons.append("Invoice Issued")
            reason = ", ".join(reasons)
            can_gen = True
            ready_to_generate_count += 1
        else:
            m_status = "Pending Trigger"
            reason = "Pending Trigger (Unpaid, Unshipped, No Invoice)"
            can_gen = False
            pending_trigger_count += 1

        orders_with_mushak_status.append({
            "order": o,
            "mushak_status": m_status,
            "mushak_challan": inv.mushak_challan if (inv and inv.mushak_challan) else None,
            "invoice": inv,
            "trigger_reason": reason,
            "can_generate": can_gen,
        })

    total_mushak_count = len(mushaks)
    total_taxable_val = sum(m.invoice.total_subtotal for m in mushaks if m.invoice)
    total_vat_amount = sum(m.invoice.total_vat for m in mushaks if m.invoice)
    total_payable_val = sum(m.invoice.total_payable for m in mushaks if m.invoice)

    return templates.TemplateResponse(
        "modules/finance/mushak_6_3_list.html",
        {
            "request": request,
            "current_user": current_user,
            "active_page": "finance_mushak",
            "mushaks": mushaks,
            "orders": orders,
            "orders_with_mushak_status": orders_with_mushak_status,
            "ready_to_generate_count": ready_to_generate_count,
            "pending_trigger_count": pending_trigger_count,
            "businesses": businesses,
            "biz_map": biz_map,
            "selected_business_id": resolved_biz_id,
            "total_mushak_count": total_mushak_count,
            "total_taxable_val": total_taxable_val,
            "total_vat_amount": total_vat_amount,
            "total_payable_val": total_payable_val,
        },
    )


# -----------------------------------------------------------------------------
# 6. Seed Finance Data Management (System Admin Only)
# -----------------------------------------------------------------------------
@router.get(
    "/seed-data/manage",
    response_class=HTMLResponse,
)
async def manage_seed_data_view(
    request: Request,
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    if not current_user or not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only system administrators can access Seed Finance Data operations.",
        )

    resolved_biz_id, businesses, biz_map = await _get_business_profiles(
        db, current_user, business_id
    )

    # Fetch testing metrics for selected business profile
    acc_res = await db.execute(select(Account).where(Account.business_id == resolved_biz_id))
    accounts = list(acc_res.scalars().all())
    test_accounts_count = sum(1 for a in accounts if a.is_testing)

    fy_res = await db.execute(select(FiscalYear).where(FiscalYear.business_id == resolved_biz_id))
    fiscal_years = list(fy_res.scalars().all())
    test_fy_count = sum(1 for fy in fiscal_years if fy.is_testing)

    jv_res = await db.execute(select(JournalVoucher).where(JournalVoucher.business_id == resolved_biz_id))
    vouchers = list(jv_res.scalars().all())
    test_vouchers_count = sum(1 for v in vouchers if v.is_testing)

    cust_res = await db.execute(select(Customer).where(Customer.business_id == resolved_biz_id))
    customers = list(cust_res.scalars().all())
    test_customers_count = sum(1 for c in customers if c.is_testing)

    inv_res = await db.execute(select(SalesInvoice).where(SalesInvoice.business_id == resolved_biz_id))
    invoices = list(inv_res.scalars().all())
    test_invoices_count = sum(1 for inv in invoices if inv.is_testing)

    mc_res = await db.execute(select(MushakChallan).where(MushakChallan.business_id == resolved_biz_id))
    mushaks = list(mc_res.scalars().all())
    test_mushaks_count = sum(1 for m in mushaks if m.is_testing)

    return templates.TemplateResponse(
        "modules/finance/seed_data/seed_manage.html",
        {
            "request": request,
            "current_user": current_user,
            "active_page": "finance_seed_data",
            "businesses": businesses,
            "biz_map": biz_map,
            "selected_business_id": resolved_biz_id,
            "test_accounts_count": test_accounts_count,
            "test_fy_count": test_fy_count,
            "test_vouchers_count": test_vouchers_count,
            "test_customers_count": test_customers_count,
            "test_invoices_count": test_invoices_count,
            "test_mushaks_count": test_mushaks_count,
            "total_test_records": test_accounts_count + test_fy_count + test_vouchers_count + test_customers_count + test_invoices_count + test_mushaks_count,
        },
    )


# -----------------------------------------------------------------------------
# 7. Financial Reports Management
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
