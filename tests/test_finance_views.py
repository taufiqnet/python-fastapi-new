from datetime import date
from decimal import Decimal
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models_registry  # noqa: F401
from app.database import Base, get_async_db, get_db
from app.main import app
from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile
from app.core.deps import get_current_user, get_current_user_optional
from app.modules.finance.seed import seed_default_chart_of_accounts_sync

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

    biz = BusinessProfile(id=1, name_en="Test View Biz", vat_number="BD123456789", is_active=True)
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
    db.commit()

    seed_default_chart_of_accounts_sync(db, 1)

    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=sync_engine)


class AsyncSessionWrapper:
    def __init__(self, db):
        self.db = db

    async def execute(self, query):
        return self.db.execute(query)

    async def commit(self):
        self.db.commit()

    async def flush(self):
        self.db.flush()

    async def refresh(self, obj):
        self.db.refresh(obj)

    def add(self, obj):
        self.db.add(obj)


@pytest_asyncio.fixture
async def client(sync_db):
    def _override_get_db():
        yield sync_db

    async def _override_get_async_db():
        yield AsyncSessionWrapper(sync_db)

    superuser = sync_db.query(User).filter(User.username == "admin").first()

    def _override_get_current_user():
        return superuser

    async def _override_get_current_user_optional(*args, **kwargs):
        return superuser

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_async_db] = _override_get_async_db
    app.dependency_overrides[get_current_user] = _override_get_current_user
    app.dependency_overrides[get_current_user_optional] = _override_get_current_user_optional

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_finance_html_view_routes(client: AsyncClient):
    # 1. Accounts Manage View
    res = await client.get("/finance/accounts/manage")
    assert res.status_code == 200
    assert "Chart of Accounts" in res.text

    # 2. Fiscal Years Manage View
    res = await client.get("/finance/fiscal-years/manage")
    assert res.status_code == 200
    assert "Fiscal Years" in res.text

    # 3. Journal Vouchers Manage View
    res = await client.get("/finance/vouchers/manage")
    assert res.status_code == 200
    assert "Journal Vouchers" in res.text

    # 4. Sales Invoices Manage View
    res = await client.get("/finance/invoices/manage")
    assert res.status_code == 200
    assert "Sales Invoices" in res.text

    # 5. Financial Reports Manage View
    res = await client.get("/finance/reports/manage")
    assert res.status_code == 200
    assert "Financial Statements" in res.text
