import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.database import get_db
from app.modules.ecommerce.procurement.models import PurchaseOrderStatus
from app.modules.ecommerce.procurement.schemas import (
    GRNCreateRequest,
    GRNOut,
    PurchaseOrderCreate,
    PurchaseOrderDetailOut,
    PurchaseOrderOut,
    PurchaseOrderUpdate,
    SupplierCreate,
    SupplierOut,
    SupplierUpdate,
)
from app.modules.ecommerce.procurement.service import ProcurementService

router = APIRouter(prefix="/procurement", tags=["Procurement & Supplier Management"])
service = ProcurementService()


# --- Suppliers Endpoints ---
@router.get("/suppliers", response_model=List[SupplierOut])
def list_suppliers(
    business_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "inventory", "view")),
    db: Session = Depends(get_db),
):
    resolved_id = resolve_business_id(current_user, business_id)
    suppliers = service.list_suppliers(db, business_id=resolved_id, is_active=is_active)
    return [SupplierOut.from_orm(s) for s in suppliers]


@router.post("/suppliers", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
def create_supplier(
    data: SupplierCreate,
    current_user: User = Depends(require_permission("ecommerce", "inventory", "create")),
    db: Session = Depends(get_db),
):
    data.business_id = resolve_business_id(current_user, data.business_id)
    supplier = service.create_supplier(db, data)
    return SupplierOut.from_orm(supplier)


@router.get("/suppliers/{supplier_id}", response_model=SupplierOut)
def get_supplier(
    supplier_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "inventory", "view")),
    db: Session = Depends(get_db),
):
    resolved_id = resolve_business_id(current_user, business_id)
    supplier = service.get_supplier(db, supplier_id, resolved_id)
    return SupplierOut.from_orm(supplier)


@router.put("/suppliers/{supplier_id}", response_model=SupplierOut)
def update_supplier(
    supplier_id: uuid.UUID,
    data: SupplierUpdate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "inventory", "update")),
    db: Session = Depends(get_db),
):
    resolved_id = resolve_business_id(current_user, business_id)
    supplier = service.update_supplier(db, supplier_id, data, resolved_id)
    return SupplierOut.from_orm(supplier)


@router.delete("/suppliers/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    supplier_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "inventory", "delete")),
    db: Session = Depends(get_db),
):
    resolved_id = resolve_business_id(current_user, business_id)
    service.delete_supplier(db, supplier_id, resolved_id)
    from fastapi.responses import Response
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Purchase Orders Endpoints ---
@router.get("/purchase-orders", response_model=List[PurchaseOrderOut])
def list_purchase_orders(
    supplier_id: Optional[uuid.UUID] = Query(None),
    status_filter: Optional[PurchaseOrderStatus] = Query(None, alias="status"),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "inventory", "view")),
    db: Session = Depends(get_db),
):
    resolved_id = resolve_business_id(current_user, business_id)
    return service.list_purchase_orders(
        db, business_id=resolved_id, supplier_id=supplier_id, status_filter=status_filter
    )


@router.post("/purchase-orders", response_model=PurchaseOrderDetailOut, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    data: PurchaseOrderCreate,
    current_user: User = Depends(require_permission("ecommerce", "inventory", "create")),
    db: Session = Depends(get_db),
):
    data.business_id = resolve_business_id(current_user, data.business_id)
    return service.create_purchase_order(db, data)


@router.get("/purchase-orders/{po_id}", response_model=PurchaseOrderDetailOut)
def get_purchase_order(
    po_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "inventory", "view")),
    db: Session = Depends(get_db),
):
    resolved_id = resolve_business_id(current_user, business_id)
    return service.get_purchase_order(db, po_id, resolved_id)


@router.put("/purchase-orders/{po_id}", response_model=PurchaseOrderDetailOut)
def update_purchase_order(
    po_id: uuid.UUID,
    data: PurchaseOrderUpdate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "inventory", "update")),
    db: Session = Depends(get_db),
):
    resolved_id = resolve_business_id(current_user, business_id)
    return service.update_purchase_order(db, po_id, data, resolved_id)


# --- Goods Receiving Note (GRN) Endpoint ---
@router.post("/purchase-orders/{po_id}/receive", response_model=GRNOut, status_code=status.HTTP_201_CREATED)
def receive_goods(
    po_id: uuid.UUID,
    data: GRNCreateRequest,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resolved_id = resolve_business_id(current_user, business_id)
    return service.receive_goods(db, current_user, po_id, resolved_id, data)
