import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.ecommerce.inventory.service import InventoryService
from app.modules.ecommerce.procurement.models import PurchaseOrderStatus
from app.modules.ecommerce.procurement.service import ProcurementService
from app.modules.ecommerce.products.service import ProductService

router = APIRouter(prefix="", tags=["Procurement Views"])
templates = Jinja2Templates(directory="app/templates")

procurement_service = ProcurementService()
business_service = BusinessService()
inventory_service = InventoryService()
product_service = ProductService()


@router.get("/procurement/suppliers/manage", response_class=HTMLResponse)
def suppliers_manage_page(
    request: Request,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "procurement", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    if current_user and not current_user.is_superuser and current_user.business_id:
        businesses = [b for b in businesses if b.id == current_user.business_id]
    selected_business_id = resolved_business_id or (businesses[0].id if businesses else 1)

    suppliers = procurement_service.list_suppliers(db, business_id=selected_business_id)

    return templates.TemplateResponse(
        "modules/ecommerce/procurement/suppliers_list.html",
        {
            "request": request,
            "current_user": current_user,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "suppliers": suppliers,
            "active_page": "procurement_suppliers",
        },
    )


@router.get("/procurement/purchase-orders/manage", response_class=HTMLResponse)
def purchase_orders_page(
    request: Request,
    business_id: Optional[int] = Query(None),
    status_filter: Optional[PurchaseOrderStatus] = Query(None, alias="status"),
    current_user: User = Depends(require_permission("ecommerce", "procurement", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    if current_user and not current_user.is_superuser and current_user.business_id:
        businesses = [b for b in businesses if b.id == current_user.business_id]
    selected_business_id = resolved_business_id or (businesses[0].id if businesses else 1)

    purchase_orders = procurement_service.list_purchase_orders(
        db, business_id=selected_business_id, status_filter=status_filter
    )
    suppliers = procurement_service.list_suppliers(db, business_id=selected_business_id)

    return templates.TemplateResponse(
        "modules/ecommerce/procurement/po_list.html",
        {
            "request": request,
            "current_user": current_user,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "purchase_orders": purchase_orders,
            "suppliers": suppliers,
            "selected_status": status_filter.value if status_filter else "",
            "active_page": "procurement_po",
        },
    )


@router.get("/procurement/purchase-orders/create", response_class=HTMLResponse)
def purchase_order_create_page(
    request: Request,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "procurement", "create")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    if current_user and not current_user.is_superuser and current_user.business_id:
        businesses = [b for b in businesses if b.id == current_user.business_id]
    selected_business_id = resolved_business_id or (businesses[0].id if businesses else 1)

    suppliers = procurement_service.list_suppliers(db, business_id=selected_business_id, is_active=True)
    warehouses = inventory_service.get_warehouses(db, business_id=selected_business_id, is_active=True)
    products = product_service.get_products(db, business_id=selected_business_id, skip=0, limit=500)

    return templates.TemplateResponse(
        "modules/ecommerce/procurement/po_form.html",
        {
            "request": request,
            "current_user": current_user,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "suppliers": suppliers,
            "warehouses": warehouses,
            "products": products,
            "active_page": "procurement_po",
        },
    )


@router.get("/procurement/purchase-orders/{po_id}", response_class=HTMLResponse)
def purchase_order_detail_page(
    request: Request,
    po_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "procurement", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    po = procurement_service.get_purchase_order(db, po_id=po_id, business_id=resolved_business_id)

    return templates.TemplateResponse(
        "modules/ecommerce/procurement/po_detail.html",
        {
            "request": request,
            "current_user": current_user,
            "po": po,
            "active_page": "procurement_po",
        },
    )
