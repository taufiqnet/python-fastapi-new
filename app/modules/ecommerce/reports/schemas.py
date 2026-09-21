from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, Field

DataT = TypeVar("DataT")


class ReportFormat(str, Enum):
    JSON = "json"
    XLSX = "xlsx"
    PDF = "pdf"


class DateInterval(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"


class BaseReportFilter(BaseModel):
    business_id: int | None = Field(None, description="Scope report to business ID")
    start_date: date | None = Field(None, description="Filter start date (inclusive)")
    end_date: date | None = Field(None, description="Filter end date (inclusive)")


class SalesReportFilter(BaseReportFilter):
    interval: DateInterval = Field(DateInterval.DAILY, description="Aggregation interval")
    warehouse_id: UUID | None = None
    payment_method: str | None = None


class InventoryReportFilter(BaseReportFilter):
    warehouse_id: UUID | None = None
    item_id: UUID | None = None
    category_id: UUID | None = None
    expiring_days: int | None = Field(30, description="Threshold in days for lot expiry report")


class FulfillmentReportFilter(BaseReportFilter):
    carrier: str | None = None
    warehouse_id: UUID | None = None


# --- Sales & Financials Schemas ---

class RevenueIntervalItem(BaseModel):
    interval_label: str
    gross_sales: Decimal
    net_sales: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    shipping_amount: Decimal
    order_count: int


class RevenueSummaryReport(BaseModel):
    currency: str = "USD"
    total_gross_sales: Decimal
    total_net_sales: Decimal
    total_taxes: Decimal
    total_discounts: Decimal
    total_shipping_fees: Decimal
    total_orders: int
    intervals: list[RevenueIntervalItem]


class ProfitMarginItem(BaseModel):
    order_number: str
    order_date: datetime
    product_title: str
    sku: str
    quantity: int
    unit_selling_price: Decimal
    unit_cost_price: Decimal
    revenue: Decimal
    total_cost: Decimal
    gross_profit: Decimal
    margin_percentage: Decimal


class ProfitMarginAuditReport(BaseModel):
    total_revenue: Decimal
    total_cost: Decimal
    total_gross_profit: Decimal
    overall_margin_percentage: Decimal
    items: list[ProfitMarginItem]


class TaxReconciliationItem(BaseModel):
    jurisdiction: str
    tax_rule: str
    taxable_amount: Decimal
    tax_collected: Decimal
    order_count: int


class TaxReconciliationReport(BaseModel):
    total_taxable_amount: Decimal
    total_tax_collected: Decimal
    rules: list[TaxReconciliationItem]


class PaymentMethodBreakdownItem(BaseModel):
    payment_method: str
    transaction_count: int
    total_amount: Decimal
    refunded_amount: Decimal
    net_amount: Decimal


class PaymentBreakdownReport(BaseModel):
    total_processed: Decimal
    total_refunded: Decimal
    net_processed: Decimal
    breakdown: list[PaymentMethodBreakdownItem]


# --- Inventory & Operations Schemas ---

class WarehouseValuationItem(BaseModel):
    warehouse_id: UUID
    warehouse_name: str
    warehouse_code: str
    sku: str
    item_name: str
    quantity_on_hand: int
    fifo_unit_cost: Decimal
    total_valuation: Decimal


class StockValuationSnapshotReport(BaseModel):
    valuation_date: datetime
    costing_model: str = "FIFO"
    total_units: int
    total_valuation_amount: Decimal
    items: list[WarehouseValuationItem]


class ReorderThresholdItem(BaseModel):
    warehouse_id: UUID
    warehouse_name: str
    sku: str
    item_name: str
    quantity_on_hand: int
    quantity_reserved: int
    quantity_available: int
    reorder_point: int
    reorder_quantity: int
    suggested_replenishment: int


class StockReplenishmentReport(BaseModel):
    total_alert_count: int
    items: list[ReorderThresholdItem]


class StockMovementAuditItem(BaseModel):
    movement_id: UUID
    timestamp: datetime
    warehouse_name: str
    sku: str
    item_name: str
    delta: int
    reason: str
    source_type: str | None = None
    source_id: str | None = None
    reference_id: str | None = None
    actor: str | None = None


class StockMovementAuditReport(BaseModel):
    total_movements: int
    movements: list[StockMovementAuditItem]


class LotExpiryItem(BaseModel):
    warehouse_name: str
    sku: str
    item_name: str
    lot_number: str
    manufacture_date: datetime | None = None
    expiry_date: datetime | None = None
    days_to_expiry: int | None = None
    quantity: int
    status: str  # e.g., "Expired", "Expiring Soon", "Normal"


class LotExpiryReport(BaseModel):
    total_lots: int
    expired_lots_count: int
    expiring_soon_count: int
    lots: list[LotExpiryItem]


# --- Fulfillment & Shipping Schemas ---

class FulfillmentSLAMetric(BaseModel):
    order_number: str
    created_at: datetime
    shipped_at: datetime | None = None
    delivered_at: datetime | None = None
    fulfillment_status: str
    carrier: str | None = None
    tracking_id: str | None = None
    fulfillment_latency_hours: float | None = None
    sla_met: bool


class FulfillmentSLAReport(BaseModel):
    total_orders_analyzed: int
    avg_fulfillment_latency_hours: float
    sla_compliance_rate_percentage: float
    orders: list[FulfillmentSLAMetric]


class AsyncReportTaskResponse(BaseModel):
    job_id: UUID
    report_type: str
    status: str
    created_at: datetime
    message: str


class StandardReportEnvelope(BaseModel, Generic[DataT]):
    report_type: str
    generated_at: datetime
    business_id: int
    filter: Any
    data: DataT
