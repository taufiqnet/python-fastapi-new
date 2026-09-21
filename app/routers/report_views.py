from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_permission
from app.database import get_async_db, get_db
from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile
from app.core.tenancy.scoping import resolve_business_id
from app.modules.reports.schemas import FulfillmentReportFilter, InventoryReportFilter, SalesReportFilter
from app.modules.reports.services import ReportAggregationService

router = APIRouter(prefix="/reports", tags=["Report Views"])
templates = Jinja2Templates(directory="app/templates")


@router.get(
    "/manage",
    response_class=HTMLResponse,
    dependencies=[Depends(require_permission("ecommerce", "reports", "view"))],
)
async def manage_reports_page(
    request: Request,
    business_id: int | None = Query(None),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    resolved_biz_id = resolve_business_id(current_user, business_id)

    # Fetch business list for superusers dropdown filter
    business_profiles = []
    if current_user.is_superuser:
        biz_res = await db.execute(select(BusinessProfile).where(BusinessProfile.is_active == True))
        business_profiles = list(biz_res.scalars().all())

    # Fetch initial metrics
    service = ReportAggregationService(db)
    sales_summary = await service.get_sales_revenue_summary(
        resolved_biz_id, SalesReportFilter()
    )
    valuation_summary = await service.get_stock_valuation_snapshot(
        resolved_biz_id, InventoryReportFilter()
    )
    fulfillment_summary = await service.get_fulfillment_sla_report(
        resolved_biz_id, FulfillmentReportFilter()
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/reports/reports_manage.html",
        context={
            "current_user": current_user,
            "selected_business_id": resolved_biz_id,
            "business_profiles": business_profiles,
            "sales_summary": sales_summary,
            "valuation_summary": valuation_summary,
            "fulfillment_summary": fulfillment_summary,
            "active_page": "ecommerce_reports",
        },
    )
