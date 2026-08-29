import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.ecommerce.cart.models import Cart
from app.modules.ecommerce.cart.repository import CartRepository
from app.modules.ecommerce.cart.schemas import (
    CartCreate,
    CartItemCreate,
    CartItemUpdate,
    CartMergeRequest,
    CartOut,
)
from app.modules.ecommerce.products.models import ProductVariant


class CartService:
    def __init__(self, repository: CartRepository | None = None):
        self.repository = repository or CartRepository()

    def get_or_create_cart(
        self,
        db: Session,
        business_id: int = 1,
        user_id: uuid.UUID | None = None,
        session_id: str | None = None,
    ) -> CartOut:
        cart = None
        if user_id:
            cart = self.repository.get_cart_by_user(
                db, user_id=user_id, business_id=business_id
            )
        elif session_id:
            cart = self.repository.get_cart_by_session(
                db, session_id=session_id, business_id=business_id
            )

        if not cart:
            cart = self.repository.create_cart(
                db,
                CartCreate(
                    business_id=business_id, user_id=user_id, session_id=session_id
                ),
            )
        return CartOut.model_validate(cart)

    def add_item_to_cart(
        self,
        db: Session,
        cart_id: uuid.UUID,
        data: CartItemCreate,
        business_id: int = 1,
    ) -> CartOut:
        cart = self.repository.get_cart_by_id(db, cart_id, business_id=business_id)
        if not cart:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found"
            )

        variant = (
            db.query(ProductVariant)
            .filter(ProductVariant.id == data.variant_id)
            .first()
        )
        if not variant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product variant not found",
            )

        self.repository.add_item_to_cart(db, cart, data, unit_price=variant.price)
        db.refresh(cart)
        return CartOut.model_validate(cart)

    def update_cart_item(
        self, db: Session, item_id: uuid.UUID, data: CartItemUpdate
    ) -> CartOut:
        item = self.repository.get_cart_item_by_id(db, item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found"
            )
        self.repository.update_cart_item(db, item, data)
        cart = self.repository.get_cart_by_id(db, item.cart_id)
        return CartOut.model_validate(cart)

    def remove_cart_item(self, db: Session, item_id: uuid.UUID) -> CartOut:
        item = self.repository.get_cart_item_by_id(db, item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found"
            )
        cart_id = item.cart_id
        self.repository.delete_cart_item(db, item)
        cart = db.query(Cart).filter(Cart.id == cart_id).first()
        return CartOut.model_validate(cart)

    def merge_carts(self, db: Session, req: CartMergeRequest) -> CartOut:
        guest_cart = self.repository.get_cart_by_session(
            db, session_id=req.guest_session_id, business_id=req.business_id
        )
        user_cart = self.repository.get_cart_by_user(
            db, user_id=req.user_id, business_id=req.business_id
        )

        if not guest_cart:
            if user_cart:
                return CartOut.model_validate(user_cart)
            return self.get_or_create_cart(
                db, business_id=req.business_id, user_id=req.user_id
            )

        if not user_cart:
            guest_cart.user_id = req.user_id
            guest_cart.session_id = None
            db.commit()
            db.refresh(guest_cart)
            return CartOut.model_validate(guest_cart)

        # Merge items from guest_cart to user_cart
        for item in guest_cart.items:
            self.repository.add_item_to_cart(
                db,
                user_cart,
                CartItemCreate(variant_id=item.variant_id, quantity=item.quantity),
                unit_price=item.price_snapshot,
            )

        self.repository.delete_cart(db, guest_cart)
        db.refresh(user_cart)
        return CartOut.model_validate(user_cart)
