import io
import uuid
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import HTMLResponse, Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_permission
from app.database import get_async_db
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.modules.finance.import_service import SalesImportService
from app.modules.finance.schemas import (
    AccountCreate,
    AccountResponse,
    AccountTreeNode,
    AccountUpdate,
    BalanceSheetReport,
    CreditDebitNoteCreate,
    CreditDebitNoteResponse,
    FiscalPeriodResponse,
    FiscalYearCreate,
    FiscalYearResponse,
    GeneralLedgerReport,
    JournalVoucherCreate,
    JournalVoucherResponse,
    Mushak63JSONView,
    PeriodLockRequest,
    ProfitAndLossReport,
    SalesInvoiceCreate,
    SalesInvoiceResponse,
    TrialBalanceReport,
)
from app.modules.finance.services import (
    AccountService,
    CreditDebitNoteService,
    FinanceReportService,
    FiscalYearService,
    InvoiceService,
    JournalVoucherService,
    Mushak63Service,
)

router = APIRouter(prefix="/finance", tags=["Finance & Accounting"])


# -----------------------------------------------------------------------------
# 1. Chart of Accounts
# -----------------------------------------------------------------------------

@router.get(
    "/accounts",
    response_model=list[AccountResponse],
    dependencies=[Depends(require_permission("finance", "accounts", "view"))],
)
async def list_accounts(
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, business_id)
    return await AccountService.get_accounts(db, resolved_biz)


@router.get(
    "/accounts/tree",
    response_model=list[AccountTreeNode],
    dependencies=[Depends(require_permission("finance", "accounts", "view"))],
)
async def get_account_tree(
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, business_id)
    return await AccountService.get_account_tree(db, resolved_biz)


@router.post(
    "/accounts",
    response_model=AccountResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("finance", "accounts", "create"))],
)
async def create_account(
    data: AccountCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, data.business_id)
    return await AccountService.create_account(db, resolved_biz, data)


@router.put(
    "/accounts/{account_id}",
    response_model=AccountResponse,
    dependencies=[Depends(require_permission("finance", "accounts", "edit"))],
)
async def update_account(
    account_id: uuid.UUID,
    data: AccountUpdate,
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, business_id)
    return await AccountService.update_account(db, resolved_biz, account_id, data)


@router.delete(
    "/accounts/{account_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("finance", "accounts", "delete"))],
)
async def delete_account(
    account_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> None:
    resolved_biz = resolve_business_id(current_user, business_id)
    await AccountService.delete_account(db, resolved_biz, account_id)


# -----------------------------------------------------------------------------
# 2. Fiscal Years & Period Locking
# -----------------------------------------------------------------------------

@router.get(
    "/fiscal-years",
    response_model=list[FiscalYearResponse],
    dependencies=[Depends(require_permission("finance", "vouchers", "view"))],
)
async def list_fiscal_years(
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, business_id)
    return await FiscalYearService.get_fiscal_years(db, resolved_biz)


@router.post(
    "/fiscal-years",
    response_model=FiscalYearResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("finance", "vouchers", "create"))],
)
async def create_fiscal_year(
    data: FiscalYearCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, data.business_id)
    return await FiscalYearService.create_fiscal_year(db, resolved_biz, data)


@router.put(
    "/fiscal-periods/{period_id}/lock",
    response_model=FiscalPeriodResponse,
    dependencies=[Depends(require_permission("finance", "vouchers", "edit"))],
)
async def lock_fiscal_period(
    period_id: uuid.UUID,
    req: PeriodLockRequest,
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, business_id)
    return await FiscalYearService.lock_period(
        db, resolved_biz, current_user.id, period_id, req.status
    )


# -----------------------------------------------------------------------------
# 3. Journal Vouchers
# -----------------------------------------------------------------------------

@router.get(
    "/vouchers",
    response_model=list[JournalVoucherResponse],
    dependencies=[Depends(require_permission("finance", "vouchers", "view"))],
)
async def list_journal_vouchers(
    business_id: int | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: str | None = Query(None),
    voucher_type: str | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, business_id)
    return await JournalVoucherService.list_vouchers(
        db, resolved_biz, skip, limit, status, voucher_type, start_date, end_date
    )


@router.post(
    "/vouchers",
    response_model=JournalVoucherResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("finance", "vouchers", "create"))],
)
async def create_journal_voucher(
    data: JournalVoucherCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, data.business_id)
    return await JournalVoucherService.create_voucher(
        db, resolved_biz, current_user.id, data
    )


@router.post(
    "/vouchers/{voucher_id}/post",
    response_model=JournalVoucherResponse,
    dependencies=[Depends(require_permission("finance", "vouchers", "post"))],
)
async def post_journal_voucher(
    voucher_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, business_id)
    return await JournalVoucherService.post_voucher(
        db, resolved_biz, current_user.id, voucher_id
    )


@router.post(
    "/vouchers/{voucher_id}/cancel",
    response_model=JournalVoucherResponse,
    dependencies=[Depends(require_permission("finance", "vouchers", "edit"))],
)
async def cancel_journal_voucher(
    voucher_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, business_id)
    return await JournalVoucherService.cancel_voucher(
        db, resolved_biz, current_user.id, voucher_id
    )


# -----------------------------------------------------------------------------
# 4. Sales Invoices & Mushak 6.3
# -----------------------------------------------------------------------------

@router.get(
    "/invoices",
    response_model=list[SalesInvoiceResponse],
    dependencies=[Depends(require_permission("finance", "invoices", "view"))],
)
async def list_sales_invoices(
    business_id: int | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: str | None = Query(None),
    customer_id: uuid.UUID | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, business_id)
    return await InvoiceService.list_invoices(
        db, resolved_biz, skip, limit, status, customer_id, start_date, end_date
    )


@router.post(
    "/invoices",
    response_model=SalesInvoiceResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("finance", "invoices", "create"))],
)
async def create_sales_invoice(
    data: SalesInvoiceCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, data.business_id)
    return await InvoiceService.create_invoice(
        db, resolved_biz, current_user.id, data
    )


@router.get(
    "/invoices/{invoice_id}",
    response_model=SalesInvoiceResponse,
    dependencies=[Depends(require_permission("finance", "invoices", "view"))],
)
async def get_sales_invoice(
    invoice_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, business_id)
    return await InvoiceService.get_invoice(db, resolved_biz, invoice_id)


@router.post(
    "/invoices/{invoice_id}/post",
    response_model=SalesInvoiceResponse,
    dependencies=[Depends(require_permission("finance", "invoices", "post"))],
)
async def post_sales_invoice(
    invoice_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, business_id)
    return await InvoiceService.post_invoice(
        db, resolved_biz, current_user.id, invoice_id
    )


@router.post(
    "/invoices/{invoice_id}/mushak-6-3",
    response_model=Mushak63JSONView,
    dependencies=[Depends(require_permission("finance", "mushak", "view"))],
)
async def generate_mushak_63(
    invoice_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, business_id)
    return await Mushak63Service.generate_mushak_json(db, resolved_biz, invoice_id)


@router.get(
    "/invoices/{invoice_id}/mushak-6-3/pdf",
    dependencies=[Depends(require_permission("finance", "mushak", "view"))],
)
async def download_mushak_63_pdf(
    invoice_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, business_id)
    html_content = await Mushak63Service.generate_mushak_html(db, resolved_biz, invoice_id)

    return HTMLResponse(content=html_content)


# -----------------------------------------------------------------------------
# 5. Excel Sales Import
# -----------------------------------------------------------------------------

@router.get(
    "/sales-import/template",
    dependencies=[Depends(require_permission("finance", "invoices", "create"))],
)
async def download_sales_import_template() -> Any:
    excel_bytes = SalesImportService.generate_excel_template()
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="sales_import_template.xlsx"'},
    )


@router.post(
    "/sales-import/upload",
    dependencies=[Depends(require_permission("finance", "invoices", "create"))],
)
async def upload_sales_import_file(
    file: UploadFile = File(...),
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, business_id)
    batch = await SalesImportService.process_file_upload(
        db, resolved_biz, current_user.id, file
    )
    return {
        "batch_id": batch.id,
        "filename": batch.filename,
        "status": batch.status,
        "total_rows": batch.total_rows,
        "valid_rows": batch.valid_rows,
        "error_count": batch.error_count,
        "error_summary": batch.error_summary,
    }


@router.post(
    "/sales-import/{batch_id}/confirm",
    response_model=list[SalesInvoiceResponse],
    dependencies=[Depends(require_permission("finance", "invoices", "create"))],
)
async def confirm_sales_import_batch(
    batch_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, business_id)
    return await SalesImportService.confirm_batch_import(
        db, resolved_biz, current_user.id, batch_id
    )


@router.post(
    "/sales-import/{batch_id}/generate-mushak",
    dependencies=[Depends(require_permission("finance", "mushak", "create"))],
)
async def bulk_generate_mushak_for_batch(
    batch_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, business_id)
    # Fetch invoices for batch
    invoices = await InvoiceService.list_invoices(db, resolved_biz)
    mushaks = []
    for inv in invoices:
        if inv.status == "posted":
            m = await Mushak63Service.issue_mushak_challan(db, resolved_biz, current_user.id, inv.id)
            mushaks.append(m.mushak_number)
    return {"issued_count": len(mushaks), "mushak_numbers": mushaks}


# -----------------------------------------------------------------------------
# 6. Credit / Debit Notes
# -----------------------------------------------------------------------------

@router.post(
    "/notes",
    response_model=CreditDebitNoteResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("finance", "invoices", "create"))],
)
async def create_credit_debit_note(
    data: CreditDebitNoteCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, data.business_id)
    return await CreditDebitNoteService.create_note(
        db, resolved_biz, current_user.id, data
    )


# -----------------------------------------------------------------------------
# 7. Financial Reports
# -----------------------------------------------------------------------------

@router.get(
    "/reports/general-ledger",
    response_model=GeneralLedgerReport,
    dependencies=[Depends(require_permission("finance", "reports", "view"))],
)
async def get_general_ledger_report(
    account_id: uuid.UUID = Query(...),
    start_date: date = Query(...),
    end_date: date = Query(...),
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, business_id)
    return await FinanceReportService.get_general_ledger(
        db, resolved_biz, account_id, start_date, end_date
    )


@router.get(
    "/reports/trial-balance",
    response_model=TrialBalanceReport,
    dependencies=[Depends(require_permission("finance", "reports", "view"))],
)
async def get_trial_balance_report(
    as_of_date: date = Query(...),
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, business_id)
    return await FinanceReportService.get_trial_balance(
        db, resolved_biz, as_of_date
    )


@router.get(
    "/reports/profit-and-loss",
    response_model=ProfitAndLossReport,
    dependencies=[Depends(require_permission("finance", "reports", "view"))],
)
async def get_profit_and_loss_report(
    start_date: date = Query(...),
    end_date: date = Query(...),
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, business_id)
    return await FinanceReportService.get_profit_and_loss(
        db, resolved_biz, start_date, end_date
    )


@router.get(
    "/reports/balance-sheet",
    response_model=BalanceSheetReport,
    dependencies=[Depends(require_permission("finance", "reports", "view"))],
)
async def get_balance_sheet_report(
    as_of_date: date = Query(...),
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz = resolve_business_id(current_user, business_id)
    return await FinanceReportService.get_balance_sheet(
        db, resolved_biz, as_of_date
    )
