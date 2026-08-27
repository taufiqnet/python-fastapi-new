import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.orders.schemas import (
    OrderCreate,
    OrderDetail,
    OrderStatus,
    OrderStatusUpdate,
    OrderSummary,
)
from app.modules.orders.service import OrderService

router = APIRouter(prefix="/orders", tags=["Orders"])
service = OrderService()


@router.post("", response_model=OrderDetail, status_code=status.HTTP_201_CREATED)
def create_order(data: OrderCreate, db: Session = Depends(get_db)):
    return service.create_order(db, data)


@router.get("", response_model=list[OrderSummary])
def get_orders(
    business_id: int = Query(1),
    user_id: uuid.UUID | None = Query(None),
    order_status: OrderStatus | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return service.get_orders(
        db,
        business_id=business_id,
        user_id=user_id,
        status_filter=order_status,
        skip=skip,
        limit=limit,
    )


@router.get("/{order_id}", response_model=OrderDetail)
def get_order(
    order_id: uuid.UUID,
    business_id: int = Query(1),
    db: Session = Depends(get_db),
):
    return service.get_order(db, order_id=order_id, business_id=business_id)


@router.put("/{order_id}/status", response_model=OrderDetail)
def update_order_status(
    order_id: uuid.UUID,
    data: OrderStatusUpdate,
    business_id: int = Query(1),
    db: Session = Depends(get_db),
):
    return service.update_order_status(
        db, order_id=order_id, update_data=data, business_id=business_id
    )
