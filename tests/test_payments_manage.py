import uuid
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user, get_current_user_optional
from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile
from app.database import Base, get_db
from app.main import app
from app.modules.ecommerce.orders.models import Order
from app.modules.ecommerce.payments.models import Payment, PaymentGatewayConfig, PaymentStatus

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
    biz = BusinessProfile(id=1, name_en="Bangladesh Ecommerce Corp", is_active=True)
    db.add(biz)

    user = User(
        id=1,
        username="admin",
        email="admin@example.com",
        password_hash="fakehash",
        is_superuser=True,
        is_active=True,
        business_id=1,
    )
    db.add(user)

    order = Order(
        id=uuid.uuid4(),
        business_id=1,
        order_number="ORD-BD-1001",
        guest_email="customer@example.com",
        subtotal_amount=Decimal("2500.00"),
        total_amount=Decimal("2500.00"),
        currency="BDT",
    )
    db.add(order)
    db.commit()

    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=sync_engine)


@pytest_asyncio.fixture
async def client(sync_db):
    def _override_get_db():
        yield sync_db

    superuser = sync_db.query(User).filter(User.username == "admin").first()

    def _override_get_current_user():
        return superuser

    async def _override_get_current_user_optional(*args, **kwargs):
        return superuser

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = _override_get_current_user
    app.dependency_overrides[get_current_user_optional] = _override_get_current_user_optional

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_payment_gateway_config_api(client: AsyncClient, sync_db):
    # 1. Save bKash config
    res = await client.post(
        "/payments/gateways/config",
        json={
            "business_id": 1,
            "provider": "bkash",
            "merchant_id": "BKASH_STORE_123",
            "api_key": "bkash_key_abc",
            "api_secret": "bkash_secret_xyz",
            "mode": "sandbox",
            "is_enabled": True,
            "currency": "BDT",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["provider"] == "bkash"
    assert data["merchant_id"] == "BKASH_STORE_123"

    # 2. Get gateway configs
    res = await client.get("/payments/gateways/config?business_id=1")
    assert res.status_code == 200
    configs = res.json()
    assert len(configs) >= 1
    assert any(c["provider"] == "bkash" for c in configs)


@pytest.mark.asyncio
async def test_payments_intent_capture_refund_flow(client: AsyncClient, sync_db):
    order = sync_db.query(Order).first()

    # 1. Create Payment Intent for bKash
    res = await client.post(
        "/payments",
        json={
            "business_id": 1,
            "order_id": str(order.id),
            "provider": "bkash",
            "amount": 2500.00,
            "currency": "BDT",
        },
    )
    assert res.status_code == 201
    payment = res.json()
    payment_id = payment["id"]
    tx_id = payment["transaction_id"]
    assert payment["status"] == "pending"

    # 2. Capture Payment
    res = await client.post(f"/payments/{payment_id}/capture?business_id=1")
    assert res.status_code == 200
    captured = res.json()
    assert captured["status"] == "captured"

    # 3. Process Refund
    res = await client.post(
        f"/payments/{payment_id}/refund?business_id=1",
        json={"amount": 1000.00, "reason": "Defective item returned"},
    )
    assert res.status_code == 200
    refund = res.json()
    assert refund["amount"] == 1000.00
    assert refund["status"] == "processed"

    # 4. List refunds
    res = await client.get("/payments/refunds?business_id=1")
    assert res.status_code == 200
    refunds = res.json()
    assert len(refunds) >= 1

    # 5. Simulate IPN Webhook callback for SSLCommerz
    res = await client.post(
        "/payments/webhook/sslcommerz",
        json={
            "transaction_id": tx_id,
            "status": "captured",
        },
    )
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_payment_manage_html_view(client: AsyncClient, sync_db):
    res = await client.get("/payments/manage?business_id=1")
    assert res.status_code == 200
    assert "Payment Gateways &amp; Refunds Console" in res.text or "Payment Gateways & Refunds Console" in res.text
    assert "bKash Payment Gateway" in res.text
    assert "SSLCommerz Gateway" in res.text
