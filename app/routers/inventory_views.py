
from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.deps import get_current_user_optional
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.ecommerce.inventory.models import (
    CountStatus,
    ReservationStatus,
    StockMovementReason,
    TransferStatus,
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
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    all_businesses = business_service.list_businesses(db, skip=0, limit=500)
    if current_user and not current_user.is_superuser and current_user.business_id:
        businesses = [b for b in all_businesses if b.id == current_user.business_id]
    else:
        businesses = all_businesses

    selected_business_id = resolved_business_id or (businesses[0].id if businesses else 1)

    warehouses = inventory_service.get_warehouses(db, business_id=selected_business_id, skip=0, limit=500)
    all_inventory_items = inventory_service.get_inventory_items(db, skip=skip, limit=limit)

    warehouse_ids = {w.id for w in warehouses}
    inventory_items = [item for item in all_inventory_items if item.warehouse_id in warehouse_ids]

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
        1 for item in inventory_items if item.reorder_point is not None and item.quantity_available <= item.reorder_point
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
            "current_user": current_user,
        },
    )


@router.get("/inventory/transfers/manage", response_class=HTMLResponse)
def stock_transfers_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    all_businesses = business_service.list_businesses(db, skip=0, limit=500)
    if current_user and not current_user.is_superuser and current_user.business_id:
        businesses = [b for b in all_businesses if b.id == current_user.business_id]
    else:
        businesses = all_businesses

    selected_business_id = resolved_business_id or (businesses[0].id if businesses else 1)

    warehouses = inventory_service.get_warehouses(db, business_id=selected_business_id, skip=0, limit=500)
    items = inventory_service.get_items(db, business_id=selected_business_id, skip=0, limit=500)
    transfers = inventory_service.get_transfers(db, business_id=selected_business_id, skip=skip, limit=limit)

    total_transfers = len(transfers)
    draft_count = sum(1 for t in transfers if getattr(t.status, "value", t.status) == "draft")
    in_transit_count = sum(1 for t in transfers if getattr(t.status, "value", t.status) == "in_transit")
    received_count = sum(1 for t in transfers if getattr(t.status, "value", t.status) == "received")

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/inventory/stock_transfer_list.html",
        context={
            "transfers": transfers,
            "warehouses": warehouses,
            "items": items,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "total_transfers": total_transfers,
            "draft_count": draft_count,
            "in_transit_count": in_transit_count,
            "received_count": received_count,
            "transfer_statuses": [s.value for s in TransferStatus],
            "active_page": "inventory",
            "current_user": current_user,
            "getattr": getattr,
        },
    )


@router.get("/inventory/counts/manage", response_class=HTMLResponse)
def stock_counts_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    all_businesses = business_service.list_businesses(db, skip=0, limit=500)
    if current_user and not current_user.is_superuser and current_user.business_id:
        businesses = [b for b in all_businesses if b.id == current_user.business_id]
    else:
        businesses = all_businesses

    selected_business_id = resolved_business_id or (businesses[0].id if businesses else 1)

    warehouses = inventory_service.get_warehouses(db, business_id=selected_business_id, skip=0, limit=500)
    items = inventory_service.get_items(db, business_id=selected_business_id, skip=0, limit=500)
    counts = inventory_service.get_counts(db, business_id=selected_business_id, skip=skip, limit=limit)

    total_counts = len(counts)
    draft_count = sum(1 for c in counts if getattr(c.status, "value", c.status) == "draft")
    in_progress_count = sum(1 for c in counts if getattr(c.status, "value", c.status) == "in_progress")
    completed_count = sum(1 for c in counts if getattr(c.status, "value", c.status) == "completed")

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/inventory/stock_count_list.html",
        context={
            "counts": counts,
            "warehouses": warehouses,
            "items": items,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "total_counts": total_counts,
            "draft_count": draft_count,
            "in_progress_count": in_progress_count,
            "completed_count": completed_count,
            "count_statuses": [s.value for s in CountStatus],
            "active_page": "inventory",
            "current_user": current_user,
            "getattr": getattr,
        },
    )


@router.get("/inventory/warehouses/manage", response_class=HTMLResponse)
def warehouse_list_page(
    request: Request,
    business_id: int | None = None,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    all_businesses = business_service.list_businesses(db, skip=0, limit=500)
    if current_user and not current_user.is_superuser and current_user.business_id:
        businesses = [b for b in all_businesses if b.id == current_user.business_id]
    else:
        businesses = all_businesses

    selected_business_id = resolved_business_id or (businesses[0].id if businesses else 1)

    warehouses = inventory_service.get_warehouses(db, business_id=selected_business_id, skip=0, limit=500)

    total_warehouses = len(warehouses)
    default_warehouses = sum(1 for w in warehouses if getattr(w, "is_default", False))
    active_warehouses = sum(1 for w in warehouses if getattr(w, "is_active", True))

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/inventory/warehouse_list.html",
        context={
            "warehouses": warehouses,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "total_warehouses": total_warehouses,
            "default_warehouses": default_warehouses,
            "active_warehouses": active_warehouses,
            "active_page": "inventory",
            "current_user": current_user,
        },
    )


@router.get("/inventory/movements/manage", response_class=HTMLResponse)
def stock_movements_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    all_businesses = business_service.list_businesses(db, skip=0, limit=500)
    if current_user and not current_user.is_superuser and current_user.business_id:
        businesses = [b for b in all_businesses if b.id == current_user.business_id]
    else:
        businesses = all_businesses

    selected_business_id = resolved_business_id or (businesses[0].id if businesses else 1)

    warehouses = inventory_service.get_warehouses(db, business_id=selected_business_id, skip=0, limit=500)
    warehouse_ids = {w.id for w in warehouses}
    warehouses_map = {w.id: w.name for w in warehouses}

    all_inventory_items = inventory_service.get_inventory_items(db, skip=0, limit=1000)
    scoped_items = [item for item in all_inventory_items if item.warehouse_id in warehouse_ids]
    scoped_item_ids = {item.id for item in scoped_items}
    item_map = {item.id: item for item in scoped_items}

    products = product_service.get_products(db, business_id=selected_business_id, skip=0, limit=500)
    variants_map = {}
    for p in products:
        for v in p.variants:
            variants_map[v.id] = {
                "sku": v.sku,
                "title": p.title,
                "price": float(v.price),
            }

    all_movements = inventory_service.get_stock_movements(db, skip=skip, limit=limit)
    movements = [m for m in all_movements if m.inventory_item_id in scoped_item_ids]

    total_movements = len(movements)
    inbound_count = sum(1 for m in movements if m.delta > 0)
    outbound_count = sum(1 for m in movements if m.delta < 0)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/inventory/stock_movements.html",
        context={
            "movements": movements,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "item_map": item_map,
            "variants_map": variants_map,
            "warehouses_map": warehouses_map,
            "total_movements": total_movements,
            "inbound_count": inbound_count,
            "outbound_count": outbound_count,
            "active_page": "inventory",
            "current_user": current_user,
        },
    )


@router.get("/inventory/reservations/manage", response_class=HTMLResponse)
def stock_reservations_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    all_businesses = business_service.list_businesses(db, skip=0, limit=500)
    if current_user and not current_user.is_superuser and current_user.business_id:
        businesses = [b for b in all_businesses if b.id == current_user.business_id]
    else:
        businesses = all_businesses

    selected_business_id = resolved_business_id or (businesses[0].id if businesses else 1)

    warehouses = inventory_service.get_warehouses(db, business_id=selected_business_id, skip=0, limit=500)
    warehouse_ids = {w.id for w in warehouses}
    warehouses_map = {w.id: w.name for w in warehouses}

    all_inventory_items = inventory_service.get_inventory_items(db, skip=0, limit=1000)
    scoped_items = [item for item in all_inventory_items if item.warehouse_id in warehouse_ids]
    scoped_item_ids = {item.id for item in scoped_items}
    item_map = {item.id: item for item in scoped_items}

    products = product_service.get_products(db, business_id=selected_business_id, skip=0, limit=500)
    variants_map = {}
    for p in products:
        for v in p.variants:
            variants_map[v.id] = {
                "sku": v.sku,
                "title": p.title,
                "price": float(v.price),
            }

    all_reservations = inventory_service.get_reservations(db, skip=skip, limit=limit)
    reservations = [r for r in all_reservations if r.inventory_item_id in scoped_item_ids]

    total_reservations = len(reservations)
    active_count = sum(
        1 for r in reservations if (getattr(r.status, "value", r.status) == "active")
    )
    committed_count = sum(
        1 for r in reservations if (getattr(r.status, "value", r.status) == "committed")
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/inventory/stock_reservations.html",
        context={
            "reservations": reservations,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "item_map": item_map,
            "variants_map": variants_map,
            "warehouses_map": warehouses_map,
            "total_reservations": total_reservations,
            "active_count": active_count,
            "committed_count": committed_count,
            "reservation_statuses": [s.value for s in ReservationStatus],
            "active_page": "inventory",
            "current_user": current_user,
        },
    )
