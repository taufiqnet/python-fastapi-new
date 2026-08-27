import uuid
from decimal import Decimal

from sqlalchemy.orm import Session

from app.modules.orders.models import (
    Order,
    OrderAddress,
    OrderItem,
    OrderStatus,
    OrderStatusHistory,
)
from app.modules.orders.schemas import (
    OrderCreate,
    OrderStatusUpdate,
)


class OrderRepository:
    def create_order(
        self,
        db: Session,
        data: OrderCreate,
        calculated_total: Decimal,
        items_with_prices: list[
            tuple[uuid.UUID, uuid.UUID | None, int, Decimal, Decimal]
        ],
    ) -> Order:
        order = Order(
            business_id=data.business_id,
            user_id=data.user_id,
            status=OrderStatus.PENDING,
            total_amount=calculated_total,
            currency=data.currency,
        )
        db.add(order)
        db.flush()

        # Add Order Items
        for variant_id, seller_id, qty, unit_price, subtotal in items_with_prices:
            item = OrderItem(
                order_id=order.id,
                variant_id=variant_id,
                seller_id=seller_id,
                quantity=qty,
                unit_price=unit_price,
                subtotal=subtotal,
            )
            db.add(item)

        # Add Status History
        history = OrderStatusHistory(
            order_id=order.id,
            status=OrderStatus.PENDING,
            note="Order placed.",
        )
        db.add(history)

        # Add Shipping Address
        ship_data = data.shipping_address.model_dump()
        ship_data.pop("address_type", None)
        ship_addr = OrderAddress(
            order_id=order.id,
            address_type="shipping",
            **ship_data,
        )
        db.add(ship_addr)

        if data.billing_address:
            bill_data = data.billing_address.model_dump()
            bill_data.pop("address_type", None)
            bill_addr = OrderAddress(
                order_id=order.id,
                address_type="billing",
                **bill_data,
            )
            db.add(bill_addr)

        db.commit()
        db.refresh(order)
        return order

    def get_order_by_id(
        self, db: Session, order_id: uuid.UUID, business_id: int = 1
    ) -> Order | None:
        return (
            db.query(Order)
            .filter(Order.id == order_id, Order.business_id == business_id)
            .first()
        )

    def get_orders(
        self,
        db: Session,
        business_id: int = 1,
        user_id: uuid.UUID | None = None,
        status: OrderStatus | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Order]:
        query = db.query(Order).filter(Order.business_id == business_id)
        if user_id:
            query = query.filter(Order.user_id == user_id)
        if status:
            query = query.filter(Order.status == status)
        return query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()

    def update_order_status(
        self, db: Session, order: Order, update_data: OrderStatusUpdate
    ) -> Order:
        order.status = update_data.status
        history = OrderStatusHistory(
            order_id=order.id,
            status=update_data.status,
            note=update_data.note,
        )
        db.add(history)
        db.commit()
        db.refresh(order)
        return order
