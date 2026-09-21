import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.ecommerce.orders.service import OrderService
from app.modules.ecommerce.payments.models import PaymentStatus
from app.modules.ecommerce.payments.service import PaymentService

router = APIRouter(prefix="", tags=["Payment Views"])
templates = Jinja2Templates(directory="app/templates")

payment_service = PaymentService()
order_service = OrderService()
business_service = BusinessService()


@router.get("/payments/manage", response_class=HTMLResponse)
def payment_manage_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    current_user: User = Depends(require_permission("ecommerce", "orders", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    all_businesses = business_service.list_businesses(db, skip=0, limit=500)
    if current_user and not current_user.is_superuser and current_user.business_id:
        businesses = [b for b in all_businesses if b.id == current_user.business_id]
    else:
        businesses = all_businesses

    selected_business_id = (
        resolved_business_id or (businesses[0].id if businesses else 1)
    )

    configs = payment_service.get_gateway_configs(
        db, business_id=selected_business_id
    )
    payments = payment_service.get_payments(
        db, business_id=selected_business_id, skip=skip, limit=limit
    )
    refunds = payment_service.get_refunds(
        db, business_id=selected_business_id, skip=skip, limit=limit
    )
    orders = order_service.get_orders(
        db, business_id=selected_business_id, skip=skip, limit=limit
    )

    total_transactions = len(payments)
    captured_amount = sum(
        float(p.amount)
        for p in payments
        if (getattr(p.status, "value", p.status) == PaymentStatus.CAPTURED.value)
    )
    refunded_amount = sum(float(r.amount) for r in refunds)
    active_gateways = sum(1 for c in configs if c.is_enabled)

    # Convert configs to a dict by provider for easy template lookup
    config_map = {c.provider: c for c in configs}

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/payments/payments_manage.html",
        context={
            "configs": configs,
            "config_map": config_map,
            "payments": payments,
            "refunds": refunds,
            "orders": orders,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "total_transactions": total_transactions,
            "captured_amount": captured_amount,
            "refunded_amount": refunded_amount,
            "active_gateways": active_gateways,
            "payment_statuses": [s.value for s in PaymentStatus],
            "active_page": "payments",
            "current_user": current_user,
        },
    )
