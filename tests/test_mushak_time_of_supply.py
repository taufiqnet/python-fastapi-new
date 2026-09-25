import uuid
from datetime import date
from decimal import Decimal
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models_registry  # noqa: F401
from app.database import Base
from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile
from app.modules.ecommerce.orders.models import (
    Order,
    OrderFulfillmentStatus,
    OrderItem,
    OrderPaymentStatus,
)
from app.modules.ecommerce.orders.schemas import OrderStatusUpdate
from app.modules.ecommerce.orders.service import OrderService
from app.modules.finance.models import MushakChallan, SalesInvoice
from app.modules.finance.seed import seed_default_chart_of_accounts_sync
from app.modules.finance.services import generateMushak63, Mushak63Service

sync_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
SyncTestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=sync_engine
)


@pytest.fixture
def db():
    Base.metadata.create_all(bind=sync_engine)
    session = SyncTestingSessionLocal()

    biz = BusinessProfile(id=1, name_en="WBSOFT", vat_number="BD999999999", is_active=True)
    session.add(biz)

    user = User(
        id=1,
        username="admin",
        email="admin@example.com",
        password_hash="fakehash",
        is_superuser=True,
        is_active=True,
        business_id=1,
    )
    session.add(user)
    session.commit()

    seed_default_chart_of_accounts_sync(session, 1)

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=sync_engine)


def _create_sample_order(db, order_number="ORD-2026-1001", payment_status=OrderPaymentStatus.UNPAID, fulfillment_status=OrderFulfillmentStatus.PENDING):
    order = Order(
        id=uuid.uuid4(),
        business_id=1,
        order_number=order_number,
        guest_email="buyer@example.com",
        payment_status=payment_status,
        fulfillment_status=fulfillment_status,
        subtotal_amount=Decimal("1000.00"),
        tax_amount=Decimal("150.00"),
        shipping_amount=Decimal("50.00"),
        discount_amount=Decimal("0.00"),
        total_amount=Decimal("1200.00"),
        currency="BDT",
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    item = OrderItem(
        id=uuid.uuid4(),
        order_id=order.id,
        variant_id=uuid.uuid4(),
        product_title="Sample Product",
        product_sku="SKU-100",
        quantity=1,
        unit_price=Decimal("1000.00"),
        subtotal=Decimal("1000.00"),
    )
    db.add(item)
    db.commit()
    db.refresh(order)
    return order


def test_mushak_time_of_supply_unpaid_unshipped_rejected(db):
    order = _create_sample_order(db, "ORD-COD-01", OrderPaymentStatus.UNPAID, OrderFulfillmentStatus.PENDING)
    
    # 1. Check eligibility
    eligible, reason = Mushak63Service.is_order_mushak_eligible(order, db_sync=db)
    assert eligible is False
    assert "Pending Trigger" in reason

    # 2. Attempting generation directly should raise HTTP 400 Bad Request
    with pytest.raises(Exception) as exc_info:
        Mushak63Service.generate_mushak_from_order_sync(db, 1, 1, order.id)
    assert "not yet eligible" in str(exc_info.value.detail)


def test_mushak_time_of_supply_trigger_on_payment(db):
    order = _create_sample_order(db, "ORD-COD-02", OrderPaymentStatus.UNPAID, OrderFulfillmentStatus.PENDING)
    order_service = OrderService()

    # Update payment status to paid
    updated = order_service.update_order_status(
        db, order.id, OrderStatusUpdate(payment_status=OrderPaymentStatus.PAID), business_id=1
    )

    # Check that Mushak 6.3 was automatically generated
    mushak = db.query(MushakChallan).join(SalesInvoice).filter(SalesInvoice.so_number == order.order_number).first()
    assert mushak is not None
    assert mushak.mushak_number.startswith("M6.3-BD999999999-")


def test_mushak_time_of_supply_trigger_on_dispatch(db):
    order = _create_sample_order(db, "ORD-COD-03", OrderPaymentStatus.UNPAID, OrderFulfillmentStatus.PENDING)
    order_service = OrderService()

    # Update fulfillment status to shipped
    updated = order_service.update_order_status(
        db, order.id, OrderStatusUpdate(fulfillment_status=OrderFulfillmentStatus.SHIPPED), business_id=1
    )

    # Check that Mushak 6.3 was generated for COD / unpaid order on dispatch
    mushak = db.query(MushakChallan).join(SalesInvoice).filter(SalesInvoice.so_number == order.order_number).first()
    assert mushak is not None
    assert mushak.mushak_number.startswith("M6.3-BD999999999-")


def test_mushak_idempotency_sequential_triggers(db):
    order = _create_sample_order(db, "ORD-COD-04", OrderPaymentStatus.UNPAID, OrderFulfillmentStatus.PENDING)
    order_service = OrderService()

    # Trigger 1: Goods Dispatched
    order_service.update_order_status(
        db, order.id, OrderStatusUpdate(fulfillment_status=OrderFulfillmentStatus.SHIPPED), business_id=1
    )

    count_after_trigger_1 = db.query(MushakChallan).count()
    mushak_1 = db.query(MushakChallan).first()
    assert count_after_trigger_1 == 1

    # Trigger 2: Payment Received later
    order_service.update_order_status(
        db, order.id, OrderStatusUpdate(payment_status=OrderPaymentStatus.PAID), business_id=1
    )

    count_after_trigger_2 = db.query(MushakChallan).count()
    mushak_2 = db.query(MushakChallan).first()

    # Ensure no duplicate Mushak was created
    assert count_after_trigger_2 == 1
    assert mushak_1.id == mushak_2.id
    assert mushak_1.mushak_number == mushak_2.mushak_number


def test_generate_mushak_63_helper(db):
    order = _create_sample_order(db, "ORD-COD-05", OrderPaymentStatus.PAID, OrderFulfillmentStatus.PENDING)
    mushak = generateMushak63(order.id, db=db, business_id=1)
    assert mushak is not None
    assert mushak.mushak_number.startswith("M6.3-BD999999999-")
