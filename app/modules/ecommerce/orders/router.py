import uuid

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id, verify_record_ownership
from app.database import get_db
from app.modules.ecommerce.orders.models import (
    OrderFulfillmentStatus,
    OrderPaymentStatus,
)
from app.modules.ecommerce.orders.schemas import (
    OrderCreate,
    OrderDetail,
    OrderStatusUpdate,
    OrderSummary,
    OrderUpdate,
)
from app.modules.ecommerce.orders.service import OrderService

router = APIRouter(prefix="/orders", tags=["Orders"])
service = OrderService()


@router.get("/template-excel")
def download_orders_excel_template(
    business_id: int = Query(...),
    current_user: User = Depends(require_permission("ecommerce", "orders", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    excel_data = service.generate_excel_template(db, business_id=resolved_business_id or business_id)
    filename = f"order_template_business_{resolved_business_id or business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/import-excel")
async def import_orders_excel(
    business_id: int = Query(...),
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission("ecommerce", "orders", "create")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    contents = await file.read()
    return service.import_orders_excel(
        db, business_id=resolved_business_id or business_id, file_bytes=contents
    )


@router.post("", response_model=OrderDetail, status_code=status.HTTP_201_CREATED)
def create_order(
    data: OrderCreate,
    current_user: User = Depends(require_permission("ecommerce", "orders", "create")),
    db: Session = Depends(get_db),
):
    data.business_id = resolve_business_id(current_user, data.business_id)
    return service.create_order(db, data)


@router.get("", response_model=list[OrderSummary])
def get_orders(
    business_id: int | None = Query(None),
    user_id: uuid.UUID | None = Query(None),
    payment_status: OrderPaymentStatus | None = Query(None),
    fulfillment_status: OrderFulfillmentStatus | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_permission("ecommerce", "orders", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return service.get_orders(
        db,
        business_id=resolved_business_id,
        user_id=user_id,
        payment_status=payment_status,
        fulfillment_status=fulfillment_status,
        skip=skip,
        limit=limit,
    )


@router.get("/{order_id}", response_model=OrderDetail)
def get_order(
    order_id: uuid.UUID,
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "orders", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    order = service.get_order(db, order_id=order_id, business_id=resolved_business_id)
    verify_record_ownership(order, current_user)
    return order


@router.put("/{order_id}/status", response_model=OrderDetail)
def update_order_status(
    order_id: uuid.UUID,
    data: OrderStatusUpdate,
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "orders", "update")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    order = service.get_order(db, order_id=order_id, business_id=resolved_business_id)
    verify_record_ownership(order, current_user)
    return service.update_order_status(
        db, order_id=order_id, update_data=data, business_id=resolved_business_id
    )


@router.put("/{order_id}", response_model=OrderDetail)
def update_order(
    order_id: uuid.UUID,
    data: OrderUpdate,
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "orders", "update")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    order = service.get_order(db, order_id=order_id, business_id=resolved_business_id)
    verify_record_ownership(order, current_user)
    return service.update_order(
        db, order_id=order_id, data=data, business_id=resolved_business_id
    )


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: uuid.UUID,
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "orders", "delete")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    order = service.get_order(db, order_id=order_id, business_id=resolved_business_id)
    verify_record_ownership(order, current_user)
    service.delete_order(db, order_id=order_id, business_id=resolved_business_id)
    return None
