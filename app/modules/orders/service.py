import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.orders.repository import OrderRepository
from app.modules.orders.models import OrderFulfillmentStatus, OrderPaymentStatus
from app.modules.orders.schemas import (
    OrderCreate,
    OrderDetail,
    OrderStatusUpdate,
    OrderSummary,
)
from app.modules.products.models import Product, ProductVariant


class OrderService:
    def __init__(self, repository: OrderRepository | None = None):
        self.repository = repository or OrderRepository()

    def create_order(self, db: Session, data: OrderCreate) -> OrderDetail:
        calculated_total = Decimal("0.00")
        items_with_prices = []

        for item in data.items:
            variant = (
                db.query(ProductVariant)
                .filter(ProductVariant.id == item.variant_id)
                .first()
            )
            if not variant:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Variant with ID {item.variant_id} not found",
                )

            product = db.query(Product).filter(Product.id == variant.product_id).first()
            seller_id = product.seller_id if product else None

            unit_price = variant.price
            subtotal = unit_price * item.quantity
            calculated_total += subtotal

            items_with_prices.append(
                (
                    variant.id,
                    seller_id,
                    product.title if product else "Product",
                    variant.sku,
                    variant.attributes,
                    item.quantity,
                    unit_price,
                    subtotal,
                )
            )

        order = self.repository.create_order(
            db,
            data=data,
            calculated_total=calculated_total,
            items_with_prices=items_with_prices,
        )
        return OrderDetail.model_validate(order)

    def get_order(
        self, db: Session, order_id: uuid.UUID, business_id: int = 1
    ) -> OrderDetail:
        order = self.repository.get_order_by_id(db, order_id, business_id=business_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
            )
        return OrderDetail.model_validate(order)

    def get_orders(
        self,
        db: Session,
        business_id: int = 1,
        user_id: uuid.UUID | None = None,
        payment_status: OrderPaymentStatus | None = None,
        fulfillment_status: OrderFulfillmentStatus | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[OrderSummary]:
        orders = self.repository.get_orders(
            db,
            business_id=business_id,
            user_id=user_id,
            payment_status=payment_status,
            fulfillment_status=fulfillment_status,
            skip=skip,
            limit=limit,
        )
        return [OrderSummary.model_validate(o) for o in orders]

    def update_order_status(
        self,
        db: Session,
        order_id: uuid.UUID,
        update_data: OrderStatusUpdate,
        business_id: int = 1,
    ) -> OrderDetail:
        order = self.repository.get_order_by_id(db, order_id, business_id=business_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
            )
        updated = self.repository.update_order_status(db, order, update_data)
        return OrderDetail.model_validate(updated)
