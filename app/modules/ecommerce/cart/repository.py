import uuid
from decimal import Decimal

from sqlalchemy.orm import Session

from app.modules.ecommerce.cart.models import Cart, CartItem
from app.modules.ecommerce.cart.schemas import CartCreate, CartItemCreate, CartItemUpdate


class CartRepository:
    def create_cart(self, db: Session, data: CartCreate) -> Cart:
        cart = Cart(**data.model_dump())
        db.add(cart)
        db.commit()
        db.refresh(cart)
        return cart

    def get_cart_by_id(
        self, db: Session, cart_id: uuid.UUID, business_id: int = 1
    ) -> Cart | None:
        return (
            db.query(Cart)
            .filter(Cart.id == cart_id, Cart.business_id == business_id)
            .first()
        )

    def get_cart_by_user(
        self, db: Session, user_id: uuid.UUID, business_id: int = 1
    ) -> Cart | None:
        return (
            db.query(Cart)
            .filter(
                Cart.user_id == user_id,
                Cart.business_id == business_id,
                Cart.status == "active",
            )
            .first()
        )

    def get_cart_by_session(
        self, db: Session, session_id: str, business_id: int = 1
    ) -> Cart | None:
        return (
            db.query(Cart)
            .filter(
                Cart.session_id == session_id,
                Cart.business_id == business_id,
                Cart.status == "active",
            )
            .first()
        )

    def add_item_to_cart(
        self, db: Session, cart: Cart, data: CartItemCreate, unit_price: Decimal
    ) -> CartItem:
        existing = (
            db.query(CartItem)
            .filter(CartItem.cart_id == cart.id, CartItem.variant_id == data.variant_id)
            .first()
        )
        if existing:
            existing.quantity += data.quantity
            existing.price_snapshot = unit_price
            db.commit()
            db.refresh(existing)
            return existing

        item = CartItem(
            cart_id=cart.id,
            variant_id=data.variant_id,
            quantity=data.quantity,
            price_snapshot=unit_price,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    def update_cart_item(
        self, db: Session, item: CartItem, data: CartItemUpdate
    ) -> CartItem:
        item.quantity = data.quantity
        db.commit()
        db.refresh(item)
        return item

    def delete_cart_item(self, db: Session, item: CartItem) -> None:
        db.delete(item)
        db.commit()

    def get_cart_item_by_id(self, db: Session, item_id: uuid.UUID) -> CartItem | None:
        return db.query(CartItem).filter(CartItem.id == item_id).first()

    def delete_cart(self, db: Session, cart: Cart) -> None:
        db.delete(cart)
        db.commit()
