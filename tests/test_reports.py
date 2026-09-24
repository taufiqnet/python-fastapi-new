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
from app.modules.ecommerce.orders.models import Order, OrderPaymentStatus, OrderFulfillmentStatus
from app.modules.ecommerce.reports.exporters import ExcelExporter, PdfExporter
from app.modules.ecommerce.reports.schemas import SalesReportFilter, InventoryReportFilter, FulfillmentReportFilter
from app.modules.ecommerce.reports.services import ReportAggregationService

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

    biz = BusinessProfile(id=1, name_en="Test Business", is_active=True)
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
        business_id=1,
        order_number="ORD-REPORT-001",
        guest_email="buyer@example.com",
        payment_status=OrderPaymentStatus.PAID,
        fulfillment_status=OrderFulfillmentStatus.SHIPPED,
        subtotal_amount=Decimal("200.00"),
        tax_amount=Decimal("15.00"),
        shipping_amount=Decimal("10.00"),
        discount_amount=Decimal("5.00"),
        total_amount=Decimal("220.00"),
        currency="USD",
        payment_method="Stripe",
        courier_company="FedEx",
        tracking_id="TRK12345678",
    )
    db.add(order)
    db.commit()

    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=sync_engine)


class AsyncSessionWrapper:
    """Adapts synchronous Session for AsyncSession in ReportAggregationService."""
    def __init__(self, db):
        self.db = db

    async def execute(self, query):
        res = self.db.scalars(query).all()

        class ResultWrapper:
            def __init__(self, res):
                self._res = res

            def scalars(self):
                return self

            def all(self):
                return self._res

        return ResultWrapper(res)


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
async def test_report_aggregation_services(sync_db):
    service = ReportAggregationService(AsyncSessionWrapper(sync_db))

    # 1. Sales Revenue Summary
    sales_filter = SalesReportFilter(interval="daily")
    sales_res = await service.get_sales_revenue_summary(1, sales_filter)
    assert sales_res.total_orders == 1
    assert sales_res.total_gross_sales == Decimal("200.00")
    assert sales_res.total_net_sales == Decimal("195.00")
    assert len(sales_res.intervals) == 1

    # 2. Profit Margin Audit
    profit_res = await service.get_profit_margin_audit(1, sales_filter)
    assert len(profit_res.items) == 0

    # 3. Tax Reconciliation
    tax_res = await service.get_tax_reconciliation(1, sales_filter)
    assert tax_res.total_tax_collected == Decimal("15.00")

    # 4. Payment Breakdown
    pay_res = await service.get_payment_breakdown(1, sales_filter)
    assert pay_res.total_processed == Decimal("220.00")
    assert pay_res.breakdown[0].payment_method == "Stripe"

    # 5. Inventory Valuation Snapshot
    inv_filter = InventoryReportFilter()
    inv_res = await service.get_stock_valuation_snapshot(1, inv_filter)
    assert inv_res.total_units == 0

    # 6. Fulfillment SLA Report
    ful_filter = FulfillmentReportFilter()
    ful_res = await service.get_fulfillment_sla_report(1, ful_filter)
    assert ful_res.total_orders_analyzed == 1
    assert ful_res.orders[0].order_number == "ORD-REPORT-001"


def test_exporters():
    headers = ["Col1", "Col2"]
    data = [["A", 10], ["B", 20]]
    excel_bytes = ExcelExporter.export_sheet("Test Sheet", headers, data, summary_formula_cols=[2])
    assert len(excel_bytes) > 0
    assert isinstance(excel_bytes, bytes)

    html = "<html><body><h1>Test PDF</h1></body></html>"
    pdf_bytes = PdfExporter.render_pdf_from_html(html)
    assert len(pdf_bytes) > 0
    assert isinstance(pdf_bytes, bytes)


@pytest.mark.asyncio
async def test_reports_api_endpoints(client: AsyncClient, sync_db):
    # GET /reports/sales (JSON)
    res = await client.get("/reports/sales?business_id=1")
    assert res.status_code == 200
    json_data = res.json()
    assert json_data["report_type"] == "sales_revenue_summary"

    # GET /reports/sales (XLSX)
    res_xlsx = await client.get("/reports/sales?business_id=1&format=xlsx")
    assert res_xlsx.status_code == 200
    assert "spreadsheetml" in res_xlsx.headers["content-type"]

    # GET /reports/sales (PDF)
    res_pdf = await client.get("/reports/sales?business_id=1&format=pdf")
    assert res_pdf.status_code == 200
    assert "pdf" in res_pdf.headers["content-type"]

    # GET /reports/inventory
    res_inv = await client.get("/reports/inventory?business_id=1")
    assert res_inv.status_code == 200
    assert res_inv.json()["report_type"] == "stock_valuation_snapshot"

    # GET /reports/fulfillment
    res_ful = await client.get("/reports/fulfillment?business_id=1")
    assert res_ful.status_code == 200
    assert res_ful.json()["report_type"] == "fulfillment_sla_report"

    # POST /reports/async-generate
    res_async = await client.post("/reports/async-generate?report_type=sales")
    assert res_async.status_code == 202
    assert res_async.json()["status"] == "queued"
