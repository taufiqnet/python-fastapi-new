import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app

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
    def _override_get_db():
        yield sync_db

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_notifications_flow(client: AsyncClient, sync_db):
    user_id = str(uuid.uuid4())

    # 1. Create Notification
    create_resp = await client.post(
        "/notifications",
        json={
            "business_id": 1,
            "user_id": user_id,
            "type": "order_shipped",
            "title": "Order Shipped!",
            "body": "Your order #1234 has been shipped.",
            "data": {"order_id": "1234"},
        },
    )
    assert create_resp.status_code == 201
    notif_data = create_resp.json()
    notification_id = notif_data["id"]
    assert notif_data["is_read"] is False
    assert notif_data["title"] == "Order Shipped!"

    # 2. Get User Notifications
    get_resp = await client.get(f"/notifications?user_id={user_id}")
    assert get_resp.status_code == 200
    notifs = get_resp.json()
    assert len(notifs) == 1

    # 3. Mark Notification as Read
    read_resp = await client.put(f"/notifications/{notification_id}/read")
    assert read_resp.status_code == 200
    assert read_resp.json()["is_read"] is True

    # 4. Set Notification Preference
    pref_resp = await client.post(
        "/notifications/preferences",
        json={
            "business_id": 1,
            "user_id": user_id,
            "channel": "email",
            "event_type": "order_status",
            "enabled": True,
        },
    )
    assert pref_resp.status_code == 200
    assert pref_resp.json()["channel"] == "email"

    # 5. Get Notification Preferences
    get_pref_resp = await client.get(f"/notifications/preferences?user_id={user_id}")
    assert get_pref_resp.status_code == 200
    prefs = get_pref_resp.json()
    assert len(prefs) == 1
