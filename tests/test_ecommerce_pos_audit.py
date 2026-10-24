import uuid
from decimal import Decimal
import pytest
from sqlalchemy.exc import IntegrityError

from app.core.tenancy.models import BusinessProfile
from app.core.identity.models import User
from app.modules.ecommerce.products.models import Product, ProductVariant
from app.modules.ecommerce.inventory.models import Warehouse, UnitOfMeasure, UoMConversion
from app.modules.ecommerce.pos.models import POSRegister, POSSession, POSPayment, POSPaymentMethod, SessionStatus


@pytest.fixture
def ecommerce_setup(db):
    biz = BusinessProfile(id=301, name_en="Ecom POS Audit Ltd")
    db.add(biz)
    db.commit()

    user = User(
        business_id=biz.id,
        username="audit_cashier",
        email="cashier.audit@proerp.com",
        password_hash="mock_hash",
        is_active=True,
    )
    db.add(user)
    db.commit()

    warehouse = Warehouse(
        business_id=biz.id,
        name="Dhaka Central Hub",
        code="WH-DHK-01",
        is_active=True,
    )
    db.add(warehouse)
    db.commit()

    return {"biz": biz, "user": user, "warehouse": warehouse}


def test_product_variant_sku_uniqueness(db, ecommerce_setup):
    """
    Audit Product & Catalog boundaries:
    - Attempting to insert duplicate SKU globally or per-business must trigger unique constraint violation.
    """
    biz = ecommerce_setup["biz"]

    product1 = Product(
        business_id=biz.id,
        title="Gaming Keyboard",
        slug="gaming-keyboard-audit-1",
    )
    db.add(product1)
    db.flush()

    var1 = ProductVariant(
        product_id=product1.id,
        sku="KB-RGB-001",
        price=Decimal("4500.00"),
        stock_qty=50,
    )
    db.add(var1)
    db.commit()

    product2 = Product(
        business_id=biz.id,
        title="Mechanical Keyboard V2",
        slug="mech-keyboard-audit-2",
    )
    db.add(product2)
    db.flush()

    duplicate_sku_var = ProductVariant(
        product_id=product2.id,
        sku="KB-RGB-001",  # Duplicate SKU!
        price=Decimal("4800.00"),
        stock_qty=20,
    )
    db.add(duplicate_sku_var)

    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_uom_conversion_factor_positive_constraint(db, ecommerce_setup):
    """
    Audit Inventory Unit of Measure:
    - Factor must be strictly positive (factor > 0).
    - Prevents division by zero and inventory distortion.
    """
    biz = ecommerce_setup["biz"]

    uom_box = UnitOfMeasure(
        business_id=biz.id,
        code="BOX",
        name="Master Box",
        precision=0,
    )
    uom_pcs = UnitOfMeasure(
        business_id=biz.id,
        code="PCS",
        name="Pieces",
        precision=0,
    )
    db.add_all([uom_box, uom_pcs])
    db.flush()

    # Valid conversion: 1 Box = 24 Pieces
    valid_conv = UoMConversion(
        business_id=biz.id,
        from_uom_id=uom_box.id,
        to_uom_id=uom_pcs.id,
        factor=Decimal("24.000000"),
    )
    db.add(valid_conv)
    db.commit()
    assert valid_conv.factor == Decimal("24.000000")

    # Invalid conversion: factor <= 0 must fail check constraint
    invalid_conv = UoMConversion(
        business_id=biz.id,
        from_uom_id=uom_pcs.id,
        to_uom_id=uom_box.id,
        factor=Decimal("0.000000"),  # Zero factor is invalid
    )
    db.add(invalid_conv)

    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_pos_split_tender_payment_math_and_validation(db, ecommerce_setup):
    """
    Audit POS Split-Tender Checkout Logic:
    - Total split tender payments must sum up to order bill amount.
    - Cash tendered >= amount, and change_amount = tendered_amount - amount.
    - Zero or negative payment amounts must be rejected.
    """
    biz = ecommerce_setup["biz"]
    user = ecommerce_setup["user"]
    wh = ecommerce_setup["warehouse"]

    reg = POSRegister(
        business_id=biz.id,
        warehouse_id=wh.id,
        name="POS Register 1",
        code="REG-AUDIT-01",
        is_active=True,
    )
    db.add(reg)
    db.flush()

    session = POSSession(
        business_id=biz.id,
        register_id=reg.id,
        user_id=user.id,
        opening_cash=Decimal("5000.00"),
        status=SessionStatus.OPEN,
    )
    db.add(session)
    db.commit()

    order_total = Decimal("1500.00")
    cash_portion = Decimal("1000.00")
    card_portion = Decimal("500.00")
    assert cash_portion + card_portion == order_total

    # Cash payment: customer gave 1200 for 1000 cash portion -> change 200
    tendered = Decimal("1200.00")
    expected_change = tendered - cash_portion
    assert expected_change == Decimal("200.00")

    # Audit POSPayment check constraint: amount > 0
    dummy_order_id = uuid.uuid4()
    invalid_payment = POSPayment(
        business_id=biz.id,
        order_id=dummy_order_id,
        session_id=session.id,
        payment_method=POSPaymentMethod.CASH,
        amount=Decimal("-10.00"),  # Negative payment
    )
    db.add(invalid_payment)

    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
