from datetime import date, timedelta
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
from app.modules.finance.models import Account, JournalVoucher, FiscalYear, SalesInvoice
from app.modules.finance.seed import seed_default_chart_of_accounts_sync
from app.modules.finance.schemas import SalesInvoiceCreate, SalesInvoiceLineCreate
from app.modules.finance.services import InvoiceService, Mushak63Service
from app.modules.finance.utils import number_to_words_bdt

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

    biz = BusinessProfile(id=1, name_en="Test Finance Biz", vat_number="BD123456789", is_active=True)
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

    # Seed BD Chart of Accounts
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


def test_chart_of_accounts_seeding(sync_db):
    accounts = sync_db.query(Account).filter(Account.business_id == 1).all()
    assert len(accounts) >= 20
    cash_acc = sync_db.query(Account).filter(Account.business_id == 1, Account.code == "1010").first()
    assert cash_acc is not None
    assert cash_acc.name == "Cash on Hand"
    assert cash_acc.account_type == "asset"


def test_number_to_words_bdt():
    assert number_to_words_bdt(0) == "Taka Zero Only"
    assert number_to_words_bdt(1000) == "Taka One Thousand Only"
    assert number_to_words_bdt(125000.50) == "Taka One Lakh Twenty-Five Thousand and Fifty Poisha Only"


@pytest.mark.asyncio
async def test_invoice_creation_and_mushak_63(sync_db):
    async_db = AsyncSessionWrapper(sync_db)

    create_data = SalesInvoiceCreate(
        business_id=1,
        issue_date=date(2025, 1, 15),
        buyer_name="ABC Trading Ltd",
        buyer_bin="BD987654321",
        buyer_address="Motijheel, Dhaka",
        delivery_destination="Tejgaon, Dhaka",
        lines=[
            SalesInvoiceLineCreate(
                description="Industrial Equipment A",
                uom="Pcs",
                quantity=Decimal("10.00"),
                unit_price=Decimal("1000.00"),
                sd_rate=Decimal("5.00"),
                vat_rate=Decimal("15.00"),
            )
        ]
    )

    # 1. Create Invoice
    invoice = await InvoiceService.create_invoice(async_db, 1, None, create_data)
    assert invoice.invoice_number.startswith("INV-202501-")
    assert invoice.total_subtotal == Decimal("10000.00")
    assert invoice.total_sd == Decimal("500.00")  # 5% of 10000 = 500
    assert invoice.total_vat == Decimal("1575.00")  # 15% of (10000 + 500) = 1575
    assert invoice.total_payable == Decimal("12075.00")
    assert invoice.status == "draft"

    # 2. Post Invoice
    posted_inv = await InvoiceService.post_invoice(async_db, 1, None, invoice.id)
    assert posted_inv.status == "posted"
    assert posted_inv.voucher_id is not None

    # 3. Issue Mushak 6.3
    json_view = await Mushak63Service.generate_mushak_json(async_db, 1, invoice.id)
    assert json_view.header.mushak_number.startswith("M6.3-BD123456789-20242025-")
    assert json_view.buyer.name == "ABC Trading Ltd"
    assert json_view.summary.total_payable == Decimal("12075.00")
    assert "Taka Twelve Thousand" in json_view.summary.total_in_words
