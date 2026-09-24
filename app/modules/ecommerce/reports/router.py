from datetime import datetime, timezone
import uuid
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_permission
from app.database import get_async_db, get_db
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.modules.ecommerce.reports.exporters import ExcelExporter, PdfExporter
from app.modules.ecommerce.reports.schemas import (
    AsyncReportTaskResponse,
    FulfillmentReportFilter,
    InventoryReportFilter,
    ReportFormat,
    SalesReportFilter,
    StandardReportEnvelope,
)
from app.modules.ecommerce.reports.services import ReportAggregationService

router = APIRouter(prefix="/reports", tags=["Reports"])
templates = Jinja2Templates(directory="app/templates")


def _format_download_response(
    content: bytes, filename: str, media_type: str
) -> StreamingResponse:
    return StreamingResponse(
        iter([content]),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


async def _process_async_report_generation(
    job_id: uuid.UUID, report_type: str, business_id: int
) -> None:
    # Async background task signature placeholder for batch download queue processing
    print(f"[Async Report Generator] Job {job_id}: Processing {report_type} for Business #{business_id}")


@router.get(
    "/sales",
    response_model=StandardReportEnvelope[Any],
    dependencies=[Depends(require_permission("ecommerce", "reports", "view"))],
)
async def get_sales_report(
    request: Request,
    filters: SalesReportFilter = Depends(),
    format: ReportFormat = Query(ReportFormat.JSON),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    business_id = resolve_business_id(current_user, filters.business_id)
    service = ReportAggregationService(db)
    report_data = await service.get_sales_revenue_summary(business_id, filters)

    generated_at = datetime.now(timezone.utc)

    if format == ReportFormat.XLSX:
        headers = ["Interval", "Gross Sales", "Discounts", "Net Sales", "Taxes", "Shipping", "Orders"]
        data_rows = [
            [
                item.interval_label,
                float(item.gross_sales),
                float(item.discount_amount),
                float(item.net_sales),
                float(item.tax_amount),
                float(item.shipping_amount),
                item.order_count,
            ]
            for item in report_data.intervals
        ]

        excel_bytes = ExcelExporter.export_sheet(
            title="Sales Revenue Summary",
            headers=headers,
            data_rows=data_rows,
            summary_formula_cols=[2, 3, 4, 5, 6, 7],
        )
        filename = f"sales_report_{business_id}_{generated_at.strftime('%Y%m%d_%H%M%S')}.xlsx"
        return _format_download_response(
            excel_bytes, filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    if format == ReportFormat.PDF:
        rendered_html = templates.TemplateResponse(
            request=request,
            name="modules/ecommerce/reports/invoice_summary.html",
            context={
                "title": "Sales & Financial Summary Report",
                "company_name": f"Business #{business_id}",
                "business_id": business_id,
                "generated_at": generated_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
                "report_data": report_data,
            },
        ).body.decode("utf-8")

        pdf_bytes = PdfExporter.render_pdf_from_html(rendered_html)
        filename = f"sales_report_{business_id}_{generated_at.strftime('%Y%m%d_%H%M%S')}.pdf"
        return _format_download_response(pdf_bytes, filename, "application/pdf")

    return StandardReportEnvelope(
        report_type="sales_revenue_summary",
        generated_at=generated_at,
        business_id=business_id,
        filter=filters.model_dump(),
        data=report_data,
    )


@router.get(
    "/inventory",
    response_model=StandardReportEnvelope[Any],
    dependencies=[Depends(require_permission("ecommerce", "reports", "view"))],
)
async def get_inventory_report(
    filters: InventoryReportFilter = Depends(),
    format: ReportFormat = Query(ReportFormat.JSON),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    business_id = resolve_business_id(current_user, filters.business_id)
    service = ReportAggregationService(db)
    report_data = await service.get_stock_valuation_snapshot(business_id, filters)

    generated_at = datetime.now(timezone.utc)

    if format == ReportFormat.XLSX:
        headers = ["Warehouse Code", "Warehouse Name", "SKU", "Item Name", "Qty on Hand", "FIFO Unit Cost", "Total Valuation"]
        data_rows = [
            [
                item.warehouse_code,
                item.warehouse_name,
                item.sku,
                item.item_name,
                item.quantity_on_hand,
                float(item.fifo_unit_cost),
                float(item.total_valuation),
            ]
            for item in report_data.items
        ]

        excel_bytes = ExcelExporter.export_sheet(
            title="Stock Valuation Snapshot",
            headers=headers,
            data_rows=data_rows,
            summary_formula_cols=[5, 7],
        )
        filename = f"inventory_valuation_{business_id}_{generated_at.strftime('%Y%m%d_%H%M%S')}.xlsx"
        return _format_download_response(
            excel_bytes, filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    if format == ReportFormat.PDF:
        html_content = f"""
        <html>
        <head><title>Stock Valuation Snapshot</title></head>
        <body>
            <h1>Stock Valuation Snapshot - Business #{business_id}</h1>
            <p>Generated at: {generated_at.strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
            <p>Total Units: {report_data.total_units} | Total Valuation: ${report_data.total_valuation_amount:.2f}</p>
        </body>
        </html>
        """
        pdf_bytes = PdfExporter.render_pdf_from_html(html_content)
        filename = f"inventory_valuation_{business_id}_{generated_at.strftime('%Y%m%d_%H%M%S')}.pdf"
        return _format_download_response(pdf_bytes, filename, "application/pdf")

    return StandardReportEnvelope(
        report_type="stock_valuation_snapshot",
        generated_at=generated_at,
        business_id=business_id,
        filter=filters.model_dump(),
        data=report_data,
    )


@router.get(
    "/fulfillment",
    response_model=StandardReportEnvelope[Any],
    dependencies=[Depends(require_permission("ecommerce", "reports", "view"))],
)
async def get_fulfillment_report(
    filters: FulfillmentReportFilter = Depends(),
    format: ReportFormat = Query(ReportFormat.JSON),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    business_id = resolve_business_id(current_user, filters.business_id)
    service = ReportAggregationService(db)
    report_data = await service.get_fulfillment_sla_report(business_id, filters)

    generated_at = datetime.now(timezone.utc)

    if format == ReportFormat.XLSX:
        headers = ["Order Number", "Created At", "Fulfillment Status", "Carrier", "Tracking ID", "Latency (Hours)", "SLA Met"]
        data_rows = [
            [
                o.order_number,
                o.created_at.strftime("%Y-%m-%d %H:%M:%S") if o.created_at else "",
                o.fulfillment_status,
                o.carrier or "N/A",
                o.tracking_id or "N/A",
                o.fulfillment_latency_hours if o.fulfillment_latency_hours is not None else "N/A",
                "YES" if o.sla_met else "NO",
            ]
            for o in report_data.orders
        ]

        excel_bytes = ExcelExporter.export_sheet(
            title="Fulfillment SLA Report",
            headers=headers,
            data_rows=data_rows,
        )
        filename = f"fulfillment_sla_{business_id}_{generated_at.strftime('%Y%m%d_%H%M%S')}.xlsx"
        return _format_download_response(
            excel_bytes, filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    if format == ReportFormat.PDF:
        html_content = f"""
        <html>
        <head><title>Fulfillment SLA Report</title></head>
        <body>
            <h1>Fulfillment SLA Report - Business #{business_id}</h1>
            <p>Generated at: {generated_at.strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
            <p>Analyzed Orders: {report_data.total_orders_analyzed} | Avg Latency: {report_data.avg_fulfillment_latency_hours} hrs | Compliance: {report_data.sla_compliance_rate_percentage}%</p>
        </body>
        </html>
        """
        pdf_bytes = PdfExporter.render_pdf_from_html(html_content)
        filename = f"fulfillment_sla_{business_id}_{generated_at.strftime('%Y%m%d_%H%M%S')}.pdf"
        return _format_download_response(pdf_bytes, filename, "application/pdf")

    return StandardReportEnvelope(
        report_type="fulfillment_sla_report",
        generated_at=generated_at,
        business_id=business_id,
        filter=filters.model_dump(),
        data=report_data,
    )


@router.post(
    "/async-generate",
    response_model=AsyncReportTaskResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(require_permission("ecommerce", "reports", "view"))],
)
async def generate_report_async(
    report_type: str = Query("sales", description="Report type to generate asynchronously"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: User = Depends(get_current_user),
) -> AsyncReportTaskResponse:
    business_id = current_user.business_id or 1
    job_id = uuid.uuid4()

    background_tasks.add_task(_process_async_report_generation, job_id, report_type, business_id)

    return AsyncReportTaskResponse(
        job_id=job_id,
        report_type=report_type,
        status="queued",
        created_at=datetime.now(timezone.utc),
        message="Report generation task queued successfully.",
    )
