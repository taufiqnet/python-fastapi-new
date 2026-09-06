
from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.ecommerce.inventory.models import (
    ReservationStatus,
    StockMovementReason,
)
from app.modules.ecommerce.inventory.service import InventoryService
from app.modules.ecommerce.products.service import ProductService

router = APIRouter(prefix="", tags=["Inventory Views"])
templates = Jinja2Templates(directory="app/templates")
inventory_service = InventoryService()
business_service = BusinessService()
product_service = ProductService()


@router.get("/inventory/manage", response_class=HTMLResponse)
def inventory_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    db: Session = Depends(get_db),
):
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    selected_business_id = business_id or (businesses[0].id if businesses else 1)

    warehouses = inventory_service.get_warehouses(db, business_id=selected_business_id, skip=0, limit=500)
    inventory_items = inventory_service.get_inventory_items(db, skip=skip, limit=limit)

    # Filter items that belong to warehouses of selected business profile
    warehouse_ids = {w.id for w in warehouses}
    if warehouse_ids:
        inventory_items = [item for item in inventory_items if item.warehouse_id in warehouse_ids]

    products = product_service.get_products(db, business_id=selected_business_id, skip=0, limit=500)
    variants_map = {}
    for p in products:
        for v in p.variants:
            variants_map[v.id] = {
                "sku": v.sku,
                "title": p.title,
                "price": float(v.price),
            }

    warehouses_map = {w.id: w.name for w in warehouses}

    total_items = len(inventory_items)
    total_on_hand = sum(item.quantity_on_hand for item in inventory_items)
    total_reserved = sum(item.quantity_reserved for item in inventory_items)
    low_stock_count = sum(
        1 for item in inventory_items if item.reorder_point and item.quantity_available <= item.reorder_point
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/inventory/inventory_list.html",
        context={
            "inventory_items": inventory_items,
            "warehouses": warehouses,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "variants_map": variants_map,
            "warehouses_map": warehouses_map,
            "total_items": total_items,
            "total_on_hand": total_on_hand,
            "total_reserved": total_reserved,
            "low_stock_count": low_stock_count,
            "reasons": [r.value for r in StockMovementReason],
            "active_page": "inventory",
        },
    )


@router.get("/inventory/warehouses/manage", response_class=HTMLResponse)
def warehouse_list_page(
    request: Request,
    business_id: int | None = None,
    db: Session = Depends(get_db),
):
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    selected_business_id = business_id or (businesses[0].id if businesses else 1)

    warehouses = inventory_service.get_warehouses(db, business_id=selected_business_id, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/inventory/warehouse_list.html",
        context={
            "warehouses": warehouses,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "active_page": "inventory",
        },
    )


@router.get("/inventory/movements/manage", response_class=HTMLResponse)
def stock_movements_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    db: Session = Depends(get_db),
):
    movements = inventory_service.get_stock_movements(db, skip=skip, limit=limit)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/inventory/stock_movements.html",
        context={
            "movements": movements,
            "active_page": "inventory",
        },
    )


@router.get("/inventory/reservations/manage", response_class=HTMLResponse)
def stock_reservations_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    db: Session = Depends(get_db),
):
    reservations = inventory_service.get_reservations(db, skip=skip, limit=limit)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/inventory/stock_reservations.html",
        context={
            "reservations": reservations,
            "reservation_statuses": [s.value for s in ReservationStatus],
            "active_page": "inventory",
        },
    )
