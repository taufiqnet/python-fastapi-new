import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.database import get_db
from app.modules.ecommerce.cart.schemas import (
    CartItemCreate,
    CartItemUpdate,
    CartMergeRequest,
    CartOut,
)
from app.modules.ecommerce.cart.service import CartService

router = APIRouter(prefix="/cart", tags=["Cart"])
service = CartService()


@router.get("", response_model=CartOut)
def get_cart(
    business_id: int = Query(1),
    user_id: uuid.UUID | None = Query(None),
    session_id: str | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "orders", "view")),
    db: Session = Depends(get_db),
):
    return service.get_or_create_cart(
        db, business_id=business_id, user_id=user_id, session_id=session_id
    )


@router.post("/items", response_model=CartOut, status_code=status.HTTP_201_CREATED)
def add_item_to_cart(
    cart_id: uuid.UUID = Query(...),
    data: CartItemCreate = ...,
    business_id: int = Query(1),
    current_user: User = Depends(require_permission("ecommerce", "orders", "create")),
    db: Session = Depends(get_db),
):
    return service.add_item_to_cart(
        db, cart_id=cart_id, data=data, business_id=business_id
    )


@router.put("/items/{item_id}", response_model=CartOut)
def update_cart_item(
    item_id: uuid.UUID,
    data: CartItemUpdate,
    current_user: User = Depends(require_permission("ecommerce", "orders", "update")),
    db: Session = Depends(get_db),
):
    return service.update_cart_item(db, item_id=item_id, data=data)


@router.delete("/items/{item_id}", response_model=CartOut)
def remove_cart_item(
    item_id: uuid.UUID,
    current_user: User = Depends(require_permission("ecommerce", "orders", "delete")),
    db: Session = Depends(get_db),
):
    return service.remove_cart_item(db, item_id=item_id)


@router.post("/merge", response_model=CartOut)
def merge_carts(
    req: CartMergeRequest,
    current_user: User = Depends(require_permission("ecommerce", "orders", "create")),
    db: Session = Depends(get_db),
):
    return service.merge_carts(db, req)
