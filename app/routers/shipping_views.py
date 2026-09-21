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
from app.modules.ecommerce.shipping.models import ShipmentStatus
from app.modules.ecommerce.shipping.service import ShippingService

router = APIRouter(prefix="", tags=["Shipping Views"])
templates = Jinja2Templates(directory="app/templates")

shipping_service = ShippingService()
order_service = OrderService()
business_service = BusinessService()


@router.get("/shipping/manage", response_class=HTMLResponse)
def shipping_manage_page(
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

    selected_business_id = resolved_business_id or (businesses[0].id if businesses else 1)

    zones = shipping_service.get_shipping_zones(db, business_id=selected_business_id)
    shipments = shipping_service.get_shipments(db, business_id=selected_business_id)
    orders = order_service.get_orders(db, business_id=selected_business_id, skip=skip, limit=limit)

    total_zones = len(zones)
    total_shipments = len(shipments)
    in_transit_count = sum(
        1
        for s in shipments
        if (getattr(s.status, "value", s.status) == ShipmentStatus.IN_TRANSIT.value)
    )
    delivered_count = sum(
        1
        for s in shipments
        if (getattr(s.status, "value", s.status) == ShipmentStatus.DELIVERED.value)
    )

    statuses = [s.value for s in ShipmentStatus]

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/shipping/shipping_manage.html",
        context={
            "zones": zones,
            "shipments": shipments,
            "orders": orders,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "total_zones": total_zones,
            "total_shipments": total_shipments,
            "in_transit_count": in_transit_count,
            "delivered_count": delivered_count,
            "shipment_statuses": statuses,
            "active_page": "shipping",
            "current_user": current_user,
        },
    )
