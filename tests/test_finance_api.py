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
from app.modules.finance.models import Account, JournalVoucher, SalesInvoice
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

    biz = BusinessProfile(id=1, name_en="Test API Biz", vat_number="BD123456789", is_active=True)
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
async def test_finance_accounts_api(client: AsyncClient):
    # GET /finance/accounts
    res = await client.get("/finance/accounts?business_id=1")
    assert res.status_code == 200
    accs = res.json()
    assert len(accs) >= 20

    # GET /finance/accounts/tree
    res_tree = await client.get("/finance/accounts/tree?business_id=1")
    assert res_tree.status_code == 200

    # POST /finance/accounts
    res_create = await client.post(
        "/finance/accounts",
        json={
            "business_id": 1,
            "code": "5999",
            "name": "Custom Test Expense",
            "account_type": "expense",
            "description": "Test expense account",
        },
    )
    assert res_create.status_code == 201
    assert res_create.json()["code"] == "5999"


@pytest.mark.asyncio
async def test_sales_invoice_mushak_and_reports_api(client: AsyncClient, sync_db):
    # Create invoice
    res_inv = await client.post(
        "/finance/invoices",
        json={
            "business_id": 1,
            "issue_date": "2025-01-15",
            "buyer_name": "Metro Retailers Ltd",
            "buyer_bin": "BD887766554",
            "lines": [
                {
                    "description": "Smart Display 55 Inch",
                    "uom": "Pcs",
                    "quantity": 5,
                    "unit_price": 50000.0,
                    "sd_rate": 0.0,
                    "vat_rate": 15.0,
                }
            ],
        },
    )
    assert res_inv.status_code == 201
    inv_data = res_inv.json()
    inv_id = inv_data["id"]

    # Post invoice
    res_post = await client.post(f"/finance/invoices/{inv_id}/post?business_id=1")
    assert res_post.status_code == 200
    assert res_post.json()["status"] == "posted"

    # Generate Mushak 6.3 JSON
    res_mushak = await client.post(f"/finance/invoices/{inv_id}/mushak-6-3?business_id=1")
    assert res_mushak.status_code == 200
    m_json = res_mushak.json()
    assert m_json["header"]["mushak_form"] == "Musak-6.3"
    assert m_json["buyer"]["name"] == "Metro Retailers Ltd"

    # Get Mushak 6.3 PDF/HTML
    res_pdf = await client.get(f"/finance/invoices/{inv_id}/mushak-6-3/pdf?business_id=1")
    assert res_pdf.status_code == 200
    assert "Tax Invoice" in res_pdf.text

    # Financial Reports
    res_tb = await client.get("/finance/reports/trial-balance?as_of_date=2025-12-31&business_id=1")
    assert res_tb.status_code == 200
    assert res_tb.json()["total_debit"] == res_tb.json()["total_credit"]

    res_pnl = await client.get("/finance/reports/profit-and-loss?start_date=2025-01-01&end_date=2025-12-31&business_id=1")
    assert res_pnl.status_code == 200
    assert float(res_pnl.json()["total_income"]) == 250000.0
