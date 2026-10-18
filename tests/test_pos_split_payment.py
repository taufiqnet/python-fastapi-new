import pytest
import pytest_asyncio
from decimal import Decimal
import uuid
import datetime
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.core.identity.models import User
from app.modules.ecommerce.pos.models import (
    POSRegister,
    POSSession,
    SessionStatus,
    POSPayment,
    POSPaymentMethod,
)
from app.modules.ecommerce.customer.models import Customer
from app.modules.ecommerce.products.models import Product, ProductVariant
from app.modules.ecommerce.orders.models import Order
from app.modules.ecommerce.inventory.models import Warehouse, InventoryItem


sync_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
SyncTestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=sync_engine
)


@pytest.fixture
def sync_db():
    Base.metadata.create_all(bind=sync_engine)
    db = SyncTestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=sync_engine)


@pytest_asyncio.fixture
async def client(sync_db):
    from app.core.deps import get_current_user, get_current_user_optional

    admin_user = User(
        id=1,
        username="cashier_jane",
        email="cashier@example.com",
        is_superuser=True,
        is_active=True,
        business_id=1,
    )

    def _override_get_db():
        yield sync_db

    def _override_user(request=None):
        return admin_user

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = _override_user
    app.dependency_overrides[get_current_user_optional] = _override_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_pos_split_tender_checkout(client, sync_db):
    """
    Test true multi-method split checkout ($30 Cash + $45 Card + $15 Store Credit = $90 total).
    Verifies that all tender items are recorded and returned on the receipt.
    """
    # 1. Setup Warehouse & Register
    warehouse = Warehouse(
        id=uuid.uuid4(),
        business_id=1,
        name="Main Flagship Store",
        code="WH-MAIN",
        is_active=True,
    )
    sync_db.add(warehouse)

    register = POSRegister(
        id=uuid.uuid4(),
        business_id=1,
        warehouse_id=warehouse.id,
        name="Register 01",
        code="REG-01",
        is_active=True,
    )
    sync_db.add(register)

    # 2. Setup POS Session
    session = POSSession(
        id=uuid.uuid4(),
        business_id=1,
        register_id=register.id,
        user_id=1,
        status=SessionStatus.OPEN,
        opened_at=datetime.datetime.utcnow(),
        opening_cash=Decimal("100.00"),
    )
    sync_db.add(session)

    # 3. Setup Product & Variant
    product = Product(
        id=uuid.uuid4(),
        business_id=1,
        title="Nike Air Pegasus",
        slug="nike-air-pegasus",
    )
    sync_db.add(product)

    variant = ProductVariant(
        id=uuid.uuid4(),
        product_id=product.id,
        sku="PEG-001",
        barcode="8888001122",
        price=Decimal("90.00"),
        cost_price=Decimal("45.00"),
        stock_qty=10,
    )
    sync_db.add(variant)

    inv_item = InventoryItem(
        id=uuid.uuid4(),
        variant_id=variant.id,
        warehouse_id=warehouse.id,
        quantity_on_hand=10,
    )
    sync_db.add(inv_item)
    sync_db.commit()

    # 4. Perform Split-Tender Checkout ($30 Cash + $45 Card + $15 Store Credit)
    payload = {
        "session_id": str(session.id),
        "customer_id": None,
        "guest_name": "Walk-in Customer",
        "items": [
            {
                "variant_id": str(variant.id),
                "quantity": 1,
                "unit_price": "90.00",
                "discount_amount": "0.00",
            }
        ],
        "payments": [
            {
                "payment_method": "cash",
                "amount": "30.00",
                "tendered_amount": "50.00",
                "change_amount": "20.00",
                "reference_number": None,
            },
            {
                "payment_method": "card",
                "amount": "45.00",
                "tendered_amount": "45.00",
                "change_amount": "0.00",
                "reference_number": "VISA-4242",
            },
            {
                "payment_method": "gift_card",
                "amount": "15.00",
                "tendered_amount": "15.00",
                "change_amount": "0.00",
                "reference_number": "STORE-CREDIT-992",
            },
        ],
        "discount_amount": "0.00",
        "tax_amount": "0.00",
    }

    response = await client.post("/pos/checkout?business_id=1", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()

    # Verify Response Data
    assert Decimal(str(data["total_amount"])) == Decimal("90.00")
    assert Decimal(str(data["total_paid"])) == Decimal("90.00")
    assert Decimal(str(data["change_amount"])) == Decimal("20.00")
    assert len(data["payments"]) == 3

    # Check individual split payment items
    pay_methods = [p["payment_method"] for p in data["payments"]]
    assert "cash" in pay_methods
    assert "card" in pay_methods
    assert "gift_card" in pay_methods

    # Check database records
    db_payments = list(
        sync_db.scalars(
            select(POSPayment).where(POSPayment.session_id == session.id)
        ).all()
    )
    assert len(db_payments) == 3

    card_payment = next(
        p for p in db_payments if p.payment_method == POSPaymentMethod.CARD
    )
    assert card_payment.amount == Decimal("45.00")
    assert card_payment.reference_number == "VISA-4242"

    cash_payment = next(
        p for p in db_payments if p.payment_method == POSPaymentMethod.CASH
    )
    assert cash_payment.amount == Decimal("30.00")
    assert cash_payment.tendered_amount == Decimal("50.00")
    assert cash_payment.change_amount == Decimal("20.00")

    gift_payment = next(
        p for p in db_payments if p.payment_method == POSPaymentMethod.GIFT_CARD
    )
    assert gift_payment.amount == Decimal("15.00")
    assert gift_payment.reference_number == "STORE-CREDIT-992"


@pytest.mark.asyncio
async def test_pos_line_adjustments_checkout(client, sync_db):
    """Test line-item discounts, manager price override, item notes, and tax-exempt lines."""
    # 1. Setup Environment
    warehouse = Warehouse(
        id=uuid.uuid4(),
        business_id=1,
        name="Line Adjust Warehouse",
        code=f"WH-ADJ-{uuid.uuid4().hex[:4]}",
    )
    sync_db.add(warehouse)

    register = POSRegister(
        id=uuid.uuid4(),
        business_id=1,
        warehouse_id=warehouse.id,
        name="Adjust Register",
        code=f"REG-{uuid.uuid4().hex[:4]}",
        is_active=True,
    )
    sync_db.add(register)

    session = POSSession(
        id=uuid.uuid4(),
        business_id=1,
        register_id=register.id,
        user_id=1,
        status=SessionStatus.OPEN,
        opened_at=datetime.datetime.utcnow(),
        opening_cash=Decimal("200.00"),
    )
    sync_db.add(session)

    product = Product(
        id=uuid.uuid4(),
        business_id=1,
        title="Custom Desk Lamp",
        slug=f"custom-desk-lamp-{uuid.uuid4().hex[:4]}",
    )
    sync_db.add(product)

    variant = ProductVariant(
        id=uuid.uuid4(),
        product_id=product.id,
        sku="LAMP-001",
        barcode="9988776655",
        price=Decimal("100.00"),  # Catalog Price
        cost_price=Decimal("40.00"),
        stock_qty=15,
    )
    sync_db.add(variant)

    inv_item = InventoryItem(
        id=uuid.uuid4(),
        variant_id=variant.id,
        warehouse_id=warehouse.id,
        quantity_on_hand=15,
    )
    sync_db.add(inv_item)
    sync_db.commit()

    # Manager price override from $100 -> $80, plus $10 damage discount, with note and tax_exempt
    payload = {
        "session_id": str(session.id),
        "customer_id": None,
        "guest_name": "Walk-in Customer",
        "items": [
            {
                "variant_id": str(variant.id),
                "quantity": 1,
                "unit_price": "80.00",  # Overridden from 100.00
                "discount_amount": "10.00",  # 10.00 flat discount
                "note": "Floor sample display model",
                "tax_exempt": True,
            }
        ],
        "payments": [
            {
                "payment_method": "cash",
                "amount": "70.00",
                "tendered_amount": "100.00",
                "change_amount": "30.00",
            }
        ],
        "discount_amount": "0.00",
        "tax_amount": "0.00",
    }

    response = await client.post("/pos/checkout?business_id=1", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()

    assert Decimal(str(data["subtotal_amount"])) == Decimal("70.00")
    assert Decimal(str(data["total_amount"])) == Decimal("70.00")
    assert Decimal(str(data["change_amount"])) == Decimal("30.00")

    receipt_item = data["items"][0]
    assert Decimal(str(receipt_item["unit_price"])) == Decimal("80.00")
    assert Decimal(str(receipt_item["discount_amount"])) == Decimal("10.00")
    assert Decimal(str(receipt_item["subtotal"])) == Decimal("70.00")
    assert receipt_item["note"] == "Floor sample display model"
    assert "Floor sample display model" in receipt_item["product_title"]


@pytest.mark.asyncio
async def test_pos_order_discount_and_coupon_audit(client: AsyncClient, sync_db: Session):
    """Test order-level discount and coupon code with audit trail in order notes."""
    warehouse = Warehouse(
        id=uuid.uuid4(),
        business_id=1,
        name="Discount Audit Warehouse",
        code=f"WH-DISC-{uuid.uuid4().hex[:4]}",
    )
    sync_db.add(warehouse)

    register = POSRegister(
        id=uuid.uuid4(),
        business_id=1,
        warehouse_id=warehouse.id,
        name="Register Discount",
        code=f"REG-DISC-{uuid.uuid4().hex[:4]}",
    )
    sync_db.add(register)

    session = POSSession(
        id=uuid.uuid4(),
        business_id=1,
        register_id=register.id,
        user_id=1,
        status=SessionStatus.OPEN,
        opened_at=datetime.datetime.utcnow(),
        opening_cash=Decimal("100.00"),
    )
    sync_db.add(session)

    product = Product(
        id=uuid.uuid4(),
        business_id=1,
        title="Gaming Headset",
        slug=f"gaming-headset-{uuid.uuid4().hex[:4]}",
    )
    sync_db.add(product)

    variant = ProductVariant(
        id=uuid.uuid4(),
        product_id=product.id,
        sku="HEADSET-01",
        barcode="1122334455",
        price=Decimal("100.00"),
        cost_price=Decimal("50.00"),
        stock_qty=20,
    )
    sync_db.add(variant)

    inv_item = InventoryItem(
        id=uuid.uuid4(),
        variant_id=variant.id,
        warehouse_id=warehouse.id,
        quantity_on_hand=20,
    )
    sync_db.add(inv_item)
    sync_db.commit()

    payload = {
        "session_id": str(session.id),
        "customer_id": None,
        "guest_name": "VIP Member",
        "items": [
            {
                "variant_id": str(variant.id),
                "quantity": 1,
                "unit_price": "100.00",
                "discount_amount": "0.00",
            }
        ],
        "payments": [
            {
                "payment_method": "cash",
                "amount": "80.00",
                "tendered_amount": "100.00",
                "change_amount": "20.00",
            }
        ],
        "discount_amount": "20.00",
        "discount_reason": "Seasonal Sale / Campaign Promo",
        "coupon_code": "SAVE20NOW",
        "tax_amount": "0.00",
        "customer_note": "Customer requested gift wrap",
    }

    response = await client.post("/pos/checkout?business_id=1", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()

    assert Decimal(str(data["subtotal_amount"])) == Decimal("100.00")
    assert Decimal(str(data["discount_amount"])) == Decimal("20.00")
    assert Decimal(str(data["total_amount"])) == Decimal("80.00")
    assert data["discount_reason"] == "Seasonal Sale / Campaign Promo"
    assert data["coupon_code"] == "SAVE20NOW"

    # Verify audit note in Order record
    order = sync_db.query(Order).filter(Order.order_number == data["order_number"]).first()
    assert order is not None
    assert "Customer requested gift wrap" in order.customer_note
    assert "Coupon: SAVE20NOW" in order.customer_note
    assert "Discount Reason: Seasonal Sale / Campaign Promo" in order.customer_note


@pytest.mark.asyncio
async def test_pos_customer_loyalty_and_store_credit_checkout(client: AsyncClient, sync_db: Session):
    """Test customer loyalty points earning, points redemption, and store credit tender payment."""
    customer = Customer(
        id=uuid.uuid4(),
        business_id=1,
        first_name="Alice",
        last_name="VIP",
        phone="+1234567890",
        loyalty_points=550,
        store_credit=Decimal("50.00"),
        membership_tier="Gold",
    )
    sync_db.add(customer)

    warehouse = Warehouse(
        id=uuid.uuid4(),
        business_id=1,
        name="Loyalty Warehouse",
        code=f"WH-LOY-{uuid.uuid4().hex[:4]}",
    )
    sync_db.add(warehouse)

    register = POSRegister(
        id=uuid.uuid4(),
        business_id=1,
        warehouse_id=warehouse.id,
        name="Register Loyalty",
        code=f"REG-LOY-{uuid.uuid4().hex[:4]}",
    )
    sync_db.add(register)

    session = POSSession(
        id=uuid.uuid4(),
        business_id=1,
        register_id=register.id,
        user_id=1,
        status=SessionStatus.OPEN,
        opened_at=datetime.datetime.utcnow(),
        opening_cash=Decimal("100.00"),
    )
    sync_db.add(session)

    product = Product(
        id=uuid.uuid4(),
        business_id=1,
        title="Premium Espresso Beans",
        slug=f"espresso-beans-{uuid.uuid4().hex[:4]}",
    )
    sync_db.add(product)

    variant = ProductVariant(
        id=uuid.uuid4(),
        product_id=product.id,
        sku="BEANS-01",
        barcode="2000142012501",  # Variable weight barcode (1.250 kg)
        price=Decimal("40.00"),
        cost_price=Decimal("20.00"),
        stock_qty=50,
    )
    sync_db.add(variant)

    inv_item = InventoryItem(
        id=uuid.uuid4(),
        variant_id=variant.id,
        warehouse_id=warehouse.id,
        quantity_on_hand=50,
    )
    sync_db.add(inv_item)
    sync_db.commit()

    # Sale total: $40.00.
    # Redeem 200 loyalty points -> $2.00 discount. Net total: $38.00.
    # Payment: $20.00 store credit (GIFT_CARD) + $18.00 cash.
    payload = {
        "session_id": str(session.id),
        "customer_id": str(customer.id),
        "guest_name": "Alice VIP",
        "items": [
            {
                "variant_id": str(variant.id),
                "quantity": 1,
                "unit_price": "40.00",
                "discount_amount": "0.00",
                "note": "Weight: 1.250 kg ($40.00/kg)",
            }
        ],
        "payments": [
            {
                "payment_method": "gift_card",  # Store credit
                "amount": "20.00",
                "tendered_amount": "20.00",
                "change_amount": "0.00",
                "reference_number": "Cust-Credit",
            },
            {
                "payment_method": "cash",
                "amount": "18.00",
                "tendered_amount": "20.00",
                "change_amount": "2.00",
            }
        ],
        "discount_amount": "2.00",
        "discount_reason": "VIP / Loyalty Club Reward (200 pts)",
        "points_redeemed": 200,
        "tax_amount": "0.00",
    }

    response = await client.post("/pos/checkout?business_id=1", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()

    assert Decimal(str(data["total_amount"])) == Decimal("38.00")
    assert data["points_earned"] == 38
    # Initial 550 - 200 redeemed + 38 earned = 388 pts
    assert data["points_balance"] == 388
    # Store credit: $50.00 - $20.00 = $30.00
    assert Decimal(str(data["store_credit_balance"])) == Decimal("30.00")

    # Verify database update on customer
    sync_db.refresh(customer)
    assert customer.loyalty_points == 388
    assert customer.store_credit == Decimal("30.00")


@pytest.mark.asyncio
async def test_pos_order_lookup_and_return_refund(client, sync_db):
    """
    Test Improvement 9: Returns, Refunds & Receipt Lookup Mode.
    1. Cashier looks up order by receipt order_number.
    2. Validates purchase items and returnable quantities.
    3. Processes partial return with automatic inventory restocking and store credit issuance.
    4. Validates over-return rejection.
    5. Completes remaining return with cash refund and verifies order status transitions to 'refunded'.
    """
    # 1. Setup Warehouse & Register
    warehouse = Warehouse(
        id=uuid.uuid4(),
        business_id=1,
        name="Return Hub Warehouse",
        code="WH-RET",
        is_active=True,
    )
    sync_db.add(warehouse)

    register = POSRegister(
        id=uuid.uuid4(),
        business_id=1,
        warehouse_id=warehouse.id,
        name="Returns Counter 01",
        code="RET-01",
        is_active=True,
    )
    sync_db.add(register)

    session = POSSession(
        id=uuid.uuid4(),
        business_id=1,
        register_id=register.id,
        user_id=1,
        status=SessionStatus.OPEN,
        opened_at=datetime.datetime.now(datetime.timezone.utc),
        opening_cash=Decimal("500.00"),
    )
    sync_db.add(session)

    # 2. Customer
    customer = Customer(
        id=uuid.uuid4(),
        business_id=1,
        first_name="Alice",
        last_name="Shopper",
        email="alice.return@example.com",
        phone="+15559876543",
        store_credit=Decimal("10.00"),
    )
    sync_db.add(customer)

    # 3. Products
    prod = Product(
        id=uuid.uuid4(),
        business_id=1,
        title="Wireless Headphones",
        slug="wireless-headphones-pos-ret",
        status="active",
    )
    sync_db.add(prod)

    variant = ProductVariant(
        id=uuid.uuid4(),
        product_id=prod.id,
        sku="WH-HD-001",
        barcode="8901234500019",
        price=Decimal("50.00"),
        cost_price=Decimal("25.00"),
        stock_qty=10,
    )
    sync_db.add(variant)

    inv = InventoryItem(
        id=uuid.uuid4(),
        variant_id=variant.id,
        warehouse_id=warehouse.id,
        quantity_on_hand=10,
    )
    sync_db.add(inv)
    sync_db.commit()

    # 4. Perform an initial checkout of 3 headphones ($150 total)
    checkout_payload = {
        "session_id": str(session.id),
        "customer_id": str(customer.id),
        "guest_name": "Alice Shopper",
        "items": [
            {
                "variant_id": str(variant.id),
                "quantity": 3,
                "unit_price": "50.00",
                "discount_amount": "0.00",
            }
        ],
        "payments": [
            {
                "payment_method": "cash",
                "amount": "150.00",
                "tendered_amount": "150.00",
                "change_amount": "0.00",
            }
        ],
        "discount_amount": "0.00",
        "tax_amount": "0.00",
    }
    checkout_res = await client.post("/pos/checkout?business_id=1", json=checkout_payload)
    assert checkout_res.status_code == 201, checkout_res.text
    sale_data = checkout_res.json()
    order_number = sale_data["order_number"]

    # Verify inventory was decremented from 10 to 7
    sync_db.refresh(variant)
    sync_db.refresh(inv)
    assert variant.stock_qty == 7
    assert inv.quantity_on_hand == 7

    # 5. Receipt Lookup API
    lookup_res = await client.get(f"/pos/orders/lookup?order_number={order_number}&business_id=1")
    assert lookup_res.status_code == 200, lookup_res.text
    lookup_data = lookup_res.json()
    assert lookup_data["order_number"] == order_number
    assert len(lookup_data["items"]) == 1
    line_item_id = lookup_data["items"][0]["item_id"]
    assert lookup_data["items"][0]["quantity"] == 3
    assert lookup_data["items"][0]["refunded_quantity"] == 0
    assert lookup_data["items"][0]["returnable_quantity"] == 3

    # 6. Test partial return of 1 item with store credit refund
    return_payload = {
        "session_id": str(session.id),
        "order_number": order_number,
        "customer_id": str(customer.id),
        "refund_method": "store_credit",
        "refund_reason": "Customer Choice - Changed mind",
        "items": [
            {
                "order_item_id": line_item_id,
                "quantity": 1,
                "restock": True,
            }
        ],
    }
    return_res = await client.post("/pos/orders/return?business_id=1", json=return_payload)
    assert return_res.status_code == 200, return_res.text
    ret_data = return_res.json()

    assert Decimal(str(ret_data["total_refund_amount"])) == Decimal("50.00")
    assert ret_data["refund_method"] == "store_credit"
    # Customer had $10.00 + $50.00 refunded = $60.00 store credit
    assert Decimal(str(ret_data["customer_store_credit_balance"])) == Decimal("60.00")

    # Verify stock was restocked from 7 back to 8
    sync_db.refresh(variant)
    sync_db.refresh(inv)
    assert variant.stock_qty == 8
    assert inv.quantity_on_hand == 8

    # Verify customer credit updated in DB
    sync_db.refresh(customer)
    assert customer.store_credit == Decimal("60.00")

    # 7. Check lookup again: returnable quantity should now be 2
    lookup_res2 = await client.get(f"/pos/orders/lookup?order_number={order_number}&business_id=1")
    assert lookup_res2.status_code == 200
    lookup_data2 = lookup_res2.json()
    assert lookup_data2["payment_status"] == "partially_refunded"
    assert lookup_data2["items"][0]["refunded_quantity"] == 1
    assert lookup_data2["items"][0]["returnable_quantity"] == 2

    # 8. Try to over-return (e.g. 5 items when only 2 remain) -> 400 Bad Request
    invalid_return = {
        "session_id": str(session.id),
        "order_number": order_number,
        "refund_method": "cash",
        "items": [
            {
                "order_item_id": line_item_id,
                "quantity": 5,
                "restock": True,
            }
        ],
    }
    bad_res = await client.post("/pos/orders/return?business_id=1", json=invalid_return)
    assert bad_res.status_code == 400
    assert "Maximum returnable quantity" in bad_res.json()["detail"]

    # 9. Complete remaining 2 items return via cash
    cash_return_payload = {
        "session_id": str(session.id),
        "order_number": order_number,
        "refund_method": "cash",
        "refund_reason": "Unopened return",
        "items": [
            {
                "order_item_id": line_item_id,
                "quantity": 2,
                "restock": True,
            }
        ],
    }
    final_res = await client.post("/pos/orders/return?business_id=1", json=cash_return_payload)
    assert final_res.status_code == 200, final_res.text
    final_data = final_res.json()
    assert Decimal(str(final_data["total_refund_amount"])) == Decimal("100.00")

    # Stock should be fully back to initial 10 (8 + 2)
    sync_db.refresh(variant)
    sync_db.refresh(inv)
    assert variant.stock_qty == 10
    assert inv.quantity_on_hand == 10

    # Order lookup should show fully refunded
    lookup_res3 = await client.get(f"/pos/orders/lookup?order_number={order_number}&business_id=1")
    assert lookup_res3.status_code == 200
    assert lookup_res3.json()["payment_status"] == "refunded"
    assert lookup_res3.json()["fulfillment_status"] == "returned"
    assert lookup_res3.json()["items"][0]["returnable_quantity"] == 0




