import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.ecommerce.categories.service import CategoryService
from app.modules.ecommerce.customer.service import CustomerService
from app.modules.ecommerce.inventory.service import InventoryService
from app.modules.ecommerce.pos.service import POSService
from app.modules.ecommerce.products.service import ProductService

router = APIRouter(prefix="", tags=["POS Views"])
templates = Jinja2Templates(directory="app/templates")

pos_service = POSService()
business_service = BusinessService()
inventory_service = InventoryService()
category_service = CategoryService()
customer_service = CustomerService()
product_service = ProductService()


@router.get("/pos/terminal", response_class=HTMLResponse)
def pos_terminal_page(
    request: Request,
    register_id: Optional[uuid.UUID] = Query(None),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "pos", "create")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    if current_user and not current_user.is_superuser and current_user.business_id:
        businesses = [b for b in businesses if b.id == current_user.business_id]
    selected_business_id = resolved_business_id or (businesses[0].id if businesses else 1)

    # Available registers for this business
    registers = pos_service.list_registers(db, business_id=selected_business_id, is_active=True)
    warehouses = inventory_service.get_warehouses(db, business_id=selected_business_id, is_active=True)

    # Check if register or cashier has an open session
    active_session = None
    if register_id:
        active_session = pos_service.get_active_session_for_register(db, register_id)
    if not active_session:
        active_session = pos_service.get_active_session_for_user(db, current_user.id)

    selected_register_id = register_id or (active_session.register_id if active_session else (registers[0].id if registers else None))

    # Categories for quick touch-tabs
    categories = category_service.get_categories(db, skip=0, limit=100)

    # Customers for initial quick cache (Top 10 recent customers; typeahead will dynamically search 1M+ records)
    customers = customer_service.get_customers(db, business_id=selected_business_id, skip=0, limit=10)

    return templates.TemplateResponse(
        "modules/ecommerce/pos/terminal.html",
        {
            "request": request,
            "current_user": current_user,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "selected_register_id": selected_register_id,
            "registers": registers,
            "warehouses": warehouses,
            "active_session": active_session,
            "categories": categories,
            "customers": customers,
            "active_page": "pos_terminal",
        },
    )


@router.get("/pos/registers/manage", response_class=HTMLResponse)
def pos_registers_page(
    request: Request,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "pos", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    if current_user and not current_user.is_superuser and current_user.business_id:
        businesses = [b for b in businesses if b.id == current_user.business_id]
    selected_business_id = resolved_business_id or (businesses[0].id if businesses else 1)

    registers = pos_service.list_registers(db, business_id=selected_business_id)
    warehouses = inventory_service.get_warehouses(db, business_id=selected_business_id, is_active=True)

    return templates.TemplateResponse(
        "modules/ecommerce/pos/registers.html",
        {
            "request": request,
            "current_user": current_user,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "registers": registers,
            "warehouses": warehouses,
            "active_page": "pos_registers",
        },
    )
