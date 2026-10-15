import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.database import get_db
from app.modules.ecommerce.pos.schemas import (
    POSCheckoutRequest,
    POSCheckoutResponse,
    POSProductSearchOut,
    POSRegisterCreate,
    POSRegisterOut,
    POSRegisterUpdate,
    POSSessionCloseRequest,
    POSSessionOpenRequest,
    POSSessionOut,
    POSSessionSummaryOut,
)
from app.modules.ecommerce.pos.service import POSService

router = APIRouter(prefix="/pos", tags=["Point of Sale (POS)"])
service = POSService()


# --- Registers ---
@router.get("/registers", response_model=List[POSRegisterOut])
def list_registers(
    business_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "orders", "view")),
    db: Session = Depends(get_db),
):
    resolved_id = resolve_business_id(current_user, business_id)
    return service.list_registers(db, business_id=resolved_id, is_active=is_active)


@router.post("/registers", response_model=POSRegisterOut, status_code=status.HTTP_201_CREATED)
def create_register(
    data: POSRegisterCreate,
    current_user: User = Depends(require_permission("ecommerce", "orders", "create")),
    db: Session = Depends(get_db),
):
    resolve_business_id(current_user, data.business_id)
    return service.create_register(db, data)


@router.get("/registers/{register_id}", response_model=POSRegisterOut)
def get_register(
    register_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "orders", "view")),
    db: Session = Depends(get_db),
):
    resolved_id = resolve_business_id(current_user, business_id)
    return service.get_register(db, register_id, resolved_id)


@router.put("/registers/{register_id}", response_model=POSRegisterOut)
def update_register(
    register_id: uuid.UUID,
    data: POSRegisterUpdate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "orders", "update")),
    db: Session = Depends(get_db),
):
    resolved_id = resolve_business_id(current_user, business_id)
    return service.update_register(db, register_id, data, resolved_id)


# --- Sessions / Shifts ---
@router.get("/sessions/current", response_model=Optional[POSSessionOut])
def get_current_session(
    register_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = service.get_active_session_for_user(db, current_user.id, register_id)
    if not session:
        return None
    session_out = POSSessionOut.from_orm(session)
    session_out.register_name = session.register.name if session.register else None
    session_out.cashier_name = f"{current_user.first_name} {current_user.last_name}".strip()
    return session_out


@router.post("/sessions/open", response_model=POSSessionOut, status_code=status.HTTP_201_CREATED)
def open_session(
    data: POSSessionOpenRequest,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resolved_id = resolve_business_id(current_user, business_id)
    session = service.open_session(db, current_user, resolved_id, data)
    session_out = POSSessionOut.from_orm(session)
    session_out.register_name = session.register.name if session.register else None
    session_out.cashier_name = f"{current_user.first_name} {current_user.last_name}".strip()
    return session_out


@router.get("/sessions/{session_id}/summary", response_model=POSSessionSummaryOut)
def get_session_summary(
    session_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resolved_id = resolve_business_id(current_user, business_id)
    return service.get_session_summary(db, session_id, resolved_id)


@router.post("/sessions/{session_id}/close", response_model=POSSessionOut)
def close_session(
    session_id: uuid.UUID,
    data: POSSessionCloseRequest,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resolved_id = resolve_business_id(current_user, business_id)
    session = service.close_session(db, session_id, current_user.id, resolved_id, data)
    session_out = POSSessionOut.from_orm(session)
    session_out.register_name = session.register.name if session.register else None
    session_out.cashier_name = f"{current_user.first_name} {current_user.last_name}".strip()
    return session_out


# --- Products Scan & Fast Checkout ---
@router.get("/products/search", response_model=List[POSProductSearchOut])
def search_pos_products(
    warehouse_id: uuid.UUID = Query(...),
    q: Optional[str] = Query(None),
    category_id: Optional[uuid.UUID] = Query(None),
    business_id: Optional[int] = Query(None),
    limit: int = Query(40, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resolved_id = resolve_business_id(current_user, business_id)
    return service.search_products_for_pos(
        db,
        business_id=resolved_id,
        warehouse_id=warehouse_id,
        query=q,
        category_id=category_id,
        limit=limit,
    )


@router.post("/checkout", response_model=POSCheckoutResponse, status_code=status.HTTP_201_CREATED)
def pos_checkout(
    data: POSCheckoutRequest,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resolved_id = resolve_business_id(current_user, business_id)
    return service.fast_checkout(db, current_user, resolved_id, data)
