from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile
from app.core.tenancy import resolve_business_id
from app.database import get_db
from app.modules.ecommerce.notifications.service import NotificationService
from fastapi.templating import Jinja2Templates

templates = Jinja2Templates(directory="app/templates")

router = APIRouter(tags=["Ecommerce Notifications Views"])
service = NotificationService()

DEFAULT_TEMPLATES = [
    {
        "event_type": "order_status",
        "channel": "email",
        "name": "Order Status Update",
        "subject": "Update on your Order #{order_id}",
        "body_template": "Hello {customer_name},\n\nYour order #{order_id} status has been updated to: {status}.\n\nThank you for shopping with us!",
        "is_active": True,
    },
    {
        "event_type": "shipping_dispatches",
        "channel": "email",
        "name": "Shipping Dispatch Alert",
        "subject": "Your Order #{order_id} Has Been Shipped!",
        "body_template": "Hello {customer_name},\n\nGreat news! Order #{order_id} has shipped via {carrier}. Tracking Number: {tracking_number}.\n\nTrack package: {tracking_url}",
        "is_active": True,
    },
    {
        "event_type": "payment_receipts",
        "channel": "email",
        "name": "Payment Receipt Confirmation",
        "subject": "Payment Receipt for Order #{order_id}",
        "body_template": "Hello {customer_name},\n\nWe received your payment of {amount} for Order #{order_id}.\nPayment Ref: {payment_ref}.",
        "is_active": True,
    },
    {
        "event_type": "low_stock_alerts",
        "channel": "in_app",
        "name": "Low Stock Reorder Alert",
        "subject": "Low Stock Warning: {item_name}",
        "body_template": "Attention Store Admin,\n\nItem '{item_name}' (SKU: {sku}) in warehouse '{warehouse_name}' is down to {current_stock} units (Reorder Threshold: {reorder_level}).",
        "is_active": True,
    },
]


@router.get("/notifications/manage", response_class=HTMLResponse)
def manage_notifications(
    request: Request,
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "orders", "view")),
    db: Session = Depends(get_db),
):
    target_business_id = resolve_business_id(current_user, business_id)
    businesses = db.query(BusinessProfile).all() if current_user.is_superuser else []

    templates_list = service.get_templates(db, business_id=target_business_id)
    
    # Ensure default templates exist if none present
    if not templates_list and target_business_id:
        from app.modules.ecommerce.notifications.schemas import NotificationTemplateCreate
        for dt in DEFAULT_TEMPLATES:
            service.upsert_template(
                db,
                NotificationTemplateCreate(
                    business_id=target_business_id,
                    event_type=dt["event_type"],
                    channel=dt["channel"],
                    name=dt["name"],
                    subject=dt["subject"],
                    body_template=dt["body_template"],
                    is_active=dt["is_active"],
                ),
            )
        templates_list = service.get_templates(db, business_id=target_business_id)

    logs = service.get_business_notifications(db, business_id=target_business_id, limit=200)

    return templates.TemplateResponse(
        "modules/ecommerce/notifications/notifications_manage.html",
        {
            "request": request,
            "current_user": current_user,
            "business_id": target_business_id,
            "businesses": businesses,
            "notification_templates": templates_list,
            "notification_logs": logs,
            "active_page": "ecommerce_notifications",
        },
    )
