import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile

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
    biz = BusinessProfile(id=1, name_en="WBSOFT", is_active=True)
    db.add(biz)
    db.commit()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=sync_engine)


@pytest_asyncio.fixture
async def client(sync_db):
    from app.core.deps import get_current_user, get_current_user_optional

    admin_user = User(id=1, username="admin", email="admin@example.com", is_superuser=True, is_active=True, business_id=1)

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
async def test_discount_rules_and_coupons_flow(client: AsyncClient, sync_db):
    business_id = 1

    # 1. Create a Discount Rule
    rule_res = await client.post(
        "/pricing/discount-rules",
        json={
            "business_id": business_id,
            "name": "Summer Special 20%",
            "code": "SUMMER20",
            "discount_type": "percentage",
            "discount_value": 20.0,
            "min_order_amount": 50.0,
            "is_active": True,
        },
    )
    assert rule_res.status_code == 201
    rule_data = rule_res.json()
    rule_id = rule_data["id"]
    assert rule_data["name"] == "Summer Special 20%"

    # 2. Get Discount Rules list
    rules_res = await client.get(f"/pricing/discount-rules?business_id={business_id}")
    assert rules_res.status_code == 200
    assert len(rules_res.json()) >= 1

    # 3. Create Coupon Code
    coupon_res = await client.post(
        "/pricing/coupons",
        json={
            "business_id": business_id,
            "code": "SAVE20NOW",
            "discount_rule_id": rule_id,
            "max_uses": 5,
            "is_active": True,
        },
    )
    assert coupon_res.status_code == 201
    coupon_data = coupon_res.json()
    coupon_id = coupon_data["id"]
    assert coupon_data["code"] == "SAVE20NOW"

    # 4. Get Coupons list
    coupons_res = await client.get(f"/pricing/coupons?business_id={business_id}")
    assert coupons_res.status_code == 200
    assert len(coupons_res.json()) >= 1

    # 5. Validate Coupon Code (Valid case)
    val_res = await client.post(
        "/pricing/coupons/validate",
        json={
            "business_id": business_id,
            "code": "SAVE20NOW",
            "cart_amount": 100.0,
        },
    )
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["is_valid"] is True
    assert val_data["discount_amount"] == 20.0

    # 6. Validate Coupon Code below min_order_amount
    val_low = await client.post(
        "/pricing/coupons/validate",
        json={
            "business_id": business_id,
            "code": "SAVE20NOW",
            "cart_amount": 30.0,
        },
    )
    assert val_low.status_code == 200
    assert val_low.json()["is_valid"] is False

    # 7. Promotional Cart Calculation
    calc_res = await client.post(
        "/pricing/calculate",
        json={
            "business_id": business_id,
            "items": [{"unit_price": 50.0, "quantity": 2}],
            "coupon_code": "SAVE20NOW",
        },
    )
    assert calc_res.status_code == 200
    calc_data = calc_res.json()
    assert calc_data["subtotal"] == 100.0
    assert calc_data["discount_amount"] == 20.0
    assert calc_data["total"] == 80.0

    # 8. Test HTML view endpoints
    pricing_page = await client.get(f"/pricing/manage?business_id={business_id}")
    assert pricing_page.status_code == 200
    assert "Pricing, Tax & Dynamic Discount Rules" in pricing_page.text

    coupons_page = await client.get(f"/coupons/manage?business_id={business_id}")
    assert coupons_page.status_code == 200
    assert "Coupons & Promotional Campaigns" in coupons_page.text

    # 9. Cleanup - Delete coupon & rule
    del_c = await client.delete(f"/pricing/coupons/{coupon_id}?business_id={business_id}")
    assert del_c.status_code == 204

    del_r = await client.delete(f"/pricing/discount-rules/{rule_id}?business_id={business_id}")
    assert del_r.status_code == 204
