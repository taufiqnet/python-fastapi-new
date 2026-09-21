from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.ecommerce.inventory.models import (
    CostLayer,
    InventoryItem,
    Item,
    StockLot,
    StockMovement,
    Warehouse,
)
from app.modules.ecommerce.orders.models import Order, OrderFulfillmentStatus, OrderItem
from app.modules.ecommerce.products.models import ProductVariant
from app.modules.reports.schemas import (
    FulfillmentReportFilter,
    FulfillmentSLAMetric,
    FulfillmentSLAReport,
    InventoryReportFilter,
    LotExpiryItem,
    LotExpiryReport,
    PaymentBreakdownReport,
    PaymentMethodBreakdownItem,
    ProfitMarginAuditReport,
    ProfitMarginItem,
    ReorderThresholdItem,
    RevenueIntervalItem,
    RevenueSummaryReport,
    SalesReportFilter,
    StockMovementAuditItem,
    StockMovementAuditReport,
    StockReplenishmentReport,
    StockValuationSnapshotReport,
    TaxReconciliationItem,
    TaxReconciliationReport,
    WarehouseValuationItem,
)


class ReportAggregationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # -------------------------------------------------------------------------
    # 1. Sales & Financials
    # -------------------------------------------------------------------------

    async def get_sales_revenue_summary(
        self, business_id: int, filters: SalesReportFilter
    ) -> RevenueSummaryReport:
        query = select(Order).where(Order.business_id == business_id)

        if filters.start_date:
            query = query.where(func.date(Order.created_at) >= filters.start_date)
        if filters.end_date:
            query = query.where(func.date(Order.created_at) <= filters.end_date)
        if filters.payment_method:
            query = query.where(Order.payment_method == filters.payment_method)

        res = await self.db.execute(query)
        orders = list(res.scalars().all())

        grouped: dict[str, list[Order]] = {}
        for order in orders:
            dt = order.created_at
            if filters.interval == "weekly":
                label = f"{dt.year}-W{dt.isocalendar()[1]:02d}"
            elif filters.interval == "monthly":
                label = dt.strftime("%Y-%m")
            else:
                label = dt.strftime("%Y-%m-%d")

            grouped.setdefault(label, []).append(order)

        interval_items: list[RevenueIntervalItem] = []
        tot_gross = Decimal("0.00")
        tot_net = Decimal("0.00")
        tot_tax = Decimal("0.00")
        tot_disc = Decimal("0.00")
        tot_ship = Decimal("0.00")

        for label, grp in sorted(grouped.items()):
            g_sales = sum((o.subtotal_amount for o in grp), Decimal("0.00"))
            t_tax = sum((o.tax_amount for o in grp), Decimal("0.00"))
            t_disc = sum((o.discount_amount for o in grp), Decimal("0.00"))
            t_ship = sum((o.shipping_amount for o in grp), Decimal("0.00"))
            n_sales = g_sales - t_disc

            tot_gross += g_sales
            tot_net += n_sales
            tot_tax += t_tax
            tot_disc += t_disc
            tot_ship += t_ship

            interval_items.append(
                RevenueIntervalItem(
                    interval_label=label,
                    gross_sales=g_sales,
                    net_sales=n_sales,
                    tax_amount=t_tax,
                    discount_amount=t_disc,
                    shipping_amount=t_ship,
                    order_count=len(grp),
                )
            )

        currency = orders[0].currency if orders else "USD"

        return RevenueSummaryReport(
            currency=currency,
            total_gross_sales=tot_gross,
            total_net_sales=tot_net,
            total_taxes=tot_tax,
            total_discounts=tot_disc,
            total_shipping_fees=tot_ship,
            total_orders=len(orders),
            intervals=interval_items,
        )

    async def get_profit_margin_audit(
        self, business_id: int, filters: SalesReportFilter
    ) -> ProfitMarginAuditReport:
        query = (
            select(OrderItem, Order, ProductVariant)
            .join(Order, OrderItem.order_id == Order.id)
            .outerjoin(ProductVariant, OrderItem.variant_id == ProductVariant.id)
            .where(Order.business_id == business_id)
        )

        if filters.start_date:
            query = query.where(func.date(Order.created_at) >= filters.start_date)
        if filters.end_date:
            query = query.where(func.date(Order.created_at) <= filters.end_date)

        res = await self.db.execute(query)
        rows = res.all()

        items: list[ProfitMarginItem] = []
        tot_revenue = Decimal("0.00")
        tot_cost = Decimal("0.00")

        for order_item, order, variant in rows:
            sell_price = order_item.unit_price
            cost_price = variant.cost_price if (variant and variant.cost_price is not None) else Decimal("0.00")
            qty = order_item.quantity
            rev = sell_price * qty
            cst = cost_price * qty
            profit = rev - cst
            margin = (profit / rev * 100) if rev > 0 else Decimal("0.00")

            tot_revenue += rev
            tot_cost += cst

            items.append(
                ProfitMarginItem(
                    order_number=order.order_number,
                    order_date=order.created_at,
                    product_title=order_item.product_title,
                    sku=order_item.product_sku,
                    quantity=qty,
                    unit_selling_price=sell_price,
                    unit_cost_price=cost_price,
                    revenue=rev,
                    total_cost=cst,
                    gross_profit=profit,
                    margin_percentage=round(margin, 2),
                )
            )

        tot_profit = tot_revenue - tot_cost
        overall_margin = (tot_profit / tot_revenue * 100) if tot_revenue > 0 else Decimal("0.00")

        return ProfitMarginAuditReport(
            total_revenue=tot_revenue,
            total_cost=tot_cost,
            total_gross_profit=tot_profit,
            overall_margin_percentage=round(overall_margin, 2),
            items=items,
        )

    async def get_tax_reconciliation(
        self, business_id: int, filters: SalesReportFilter
    ) -> TaxReconciliationReport:
        query = select(Order).where(Order.business_id == business_id)
        if filters.start_date:
            query = query.where(func.date(Order.created_at) >= filters.start_date)
        if filters.end_date:
            query = query.where(func.date(Order.created_at) <= filters.end_date)

        res = await self.db.execute(query)
        orders = list(res.scalars().all())

        # Group by tax rule / jurisdiction
        reconciled: dict[str, dict[str, Any]] = {}
        for order in orders:
            jurisdiction = "Default Jurisdiction"
            rule = "Standard Sales Tax"
            key = f"{jurisdiction}:{rule}"

            if key not in reconciled:
                reconciled[key] = {
                    "jurisdiction": jurisdiction,
                    "tax_rule": rule,
                    "taxable_amount": Decimal("0.00"),
                    "tax_collected": Decimal("0.00"),
                    "order_count": 0,
                }

            reconciled[key]["taxable_amount"] += order.subtotal_amount
            reconciled[key]["tax_collected"] += order.tax_amount
            reconciled[key]["order_count"] += 1

        rule_items = [TaxReconciliationItem(**item) for item in reconciled.values()]
        tot_taxable = sum((r.taxable_amount for r in rule_items), Decimal("0.00"))
        tot_collected = sum((r.tax_collected for r in rule_items), Decimal("0.00"))

        return TaxReconciliationReport(
            total_taxable_amount=tot_taxable,
            total_tax_collected=tot_collected,
            rules=rule_items,
        )

    async def get_payment_breakdown(
        self, business_id: int, filters: SalesReportFilter
    ) -> PaymentBreakdownReport:
        query = select(Order).where(Order.business_id == business_id)
        if filters.start_date:
            query = query.where(func.date(Order.created_at) >= filters.start_date)
        if filters.end_date:
            query = query.where(func.date(Order.created_at) <= filters.end_date)

        res = await self.db.execute(query)
        orders = list(res.scalars().all())

        breakdown_dict: dict[str, dict[str, Any]] = {}
        for order in orders:
            method = order.payment_method or "Unspecified"
            if method not in breakdown_dict:
                breakdown_dict[method] = {
                    "payment_method": method,
                    "transaction_count": 0,
                    "total_amount": Decimal("0.00"),
                    "refunded_amount": Decimal("0.00"),
                    "net_amount": Decimal("0.00"),
                }

            breakdown_dict[method]["transaction_count"] += 1
            breakdown_dict[method]["total_amount"] += order.total_amount
            # Check for refunded quantity / status
            if order.payment_status in ("refunded", "partially_refunded"):
                ref = order.total_amount if order.payment_status == "refunded" else order.total_amount * Decimal("0.5")
                breakdown_dict[method]["refunded_amount"] += ref

            breakdown_dict[method]["net_amount"] = (
                breakdown_dict[method]["total_amount"] - breakdown_dict[method]["refunded_amount"]
            )

        items = [PaymentMethodBreakdownItem(**v) for v in breakdown_dict.values()]
        tot_proc = sum((i.total_amount for i in items), Decimal("0.00"))
        tot_ref = sum((i.refunded_amount for i in items), Decimal("0.00"))

        return PaymentBreakdownReport(
            total_processed=tot_proc,
            total_refunded=tot_ref,
            net_processed=tot_proc - tot_ref,
            breakdown=items,
        )

    # -------------------------------------------------------------------------
    # 2. Inventory & Operations
    # -------------------------------------------------------------------------

    async def get_stock_valuation_snapshot(
        self, business_id: int, filters: InventoryReportFilter
    ) -> StockValuationSnapshotReport:
        query = (
            select(CostLayer)
            .join(Item, CostLayer.item_id == Item.id)
            .join(Warehouse, CostLayer.warehouse_id == Warehouse.id)
            .where(CostLayer.business_id == business_id)
            .where(CostLayer.quantity_remaining > 0)
        )

        if filters.warehouse_id:
            query = query.where(CostLayer.warehouse_id == filters.warehouse_id)
        if filters.item_id:
            query = query.where(CostLayer.item_id == filters.item_id)

        res = await self.db.execute(query)
        layers = res.scalars().all()

        items: list[WarehouseValuationItem] = []
        tot_units = 0
        tot_valuation = Decimal("0.00")

        for cl in layers:
            item_val = cl.quantity_remaining * cl.unit_cost
            tot_units += cl.quantity_remaining
            tot_valuation += item_val

            items.append(
                WarehouseValuationItem(
                    warehouse_id=cl.warehouse_id,
                    warehouse_name=cl.warehouse.name,
                    warehouse_code=cl.warehouse.code,
                    sku=cl.item.sku,
                    item_name=cl.item.name,
                    quantity_on_hand=cl.quantity_remaining,
                    fifo_unit_cost=cl.unit_cost,
                    total_valuation=item_val,
                )
            )

        return StockValuationSnapshotReport(
            valuation_date=datetime.now(timezone.utc),
            costing_model="FIFO",
            total_units=tot_units,
            total_valuation_amount=tot_valuation,
            items=items,
        )

    async def get_stock_replenishment_alerts(
        self, business_id: int, filters: InventoryReportFilter
    ) -> StockReplenishmentReport:
        query = (
            select(InventoryItem)
            .join(Warehouse, InventoryItem.warehouse_id == Warehouse.id)
            .options(selectinload(InventoryItem.item), selectinload(InventoryItem.warehouse))
            .where(Warehouse.business_id == business_id)
            .where(InventoryItem.reorder_point.isnot(None))
        )

        if filters.warehouse_id:
            query = query.where(InventoryItem.warehouse_id == filters.warehouse_id)

        res = await self.db.execute(query)
        inv_items = res.scalars().all()

        alert_items: list[ReorderThresholdItem] = []

        for inv in inv_items:
            available = inv.quantity_on_hand - inv.quantity_reserved
            reorder_pt = inv.reorder_point or 0
            if available <= reorder_pt:
                reorder_qty = inv.reorder_quantity or 50
                suggested = max(0, reorder_qty + (reorder_pt - available))

                item_sku = inv.item.sku if inv.item else "N/A"
                item_name = inv.item.name if inv.item else "N/A"

                alert_items.append(
                    ReorderThresholdItem(
                        warehouse_id=inv.warehouse_id,
                        warehouse_name=inv.warehouse.name,
                        sku=item_sku,
                        item_name=item_name,
                        quantity_on_hand=inv.quantity_on_hand,
                        quantity_reserved=inv.quantity_reserved,
                        quantity_available=available,
                        reorder_point=reorder_pt,
                        reorder_quantity=reorder_qty,
                        suggested_replenishment=suggested,
                    )
                )

        return StockReplenishmentReport(
            total_alert_count=len(alert_items),
            items=alert_items,
        )

    async def get_stock_movements_audit(
        self, business_id: int, filters: InventoryReportFilter
    ) -> StockMovementAuditReport:
        query = (
            select(StockMovement)
            .join(InventoryItem, StockMovement.inventory_item_id == InventoryItem.id)
            .join(Warehouse, InventoryItem.warehouse_id == Warehouse.id)
            .options(selectinload(StockMovement.inventory_item).selectinload(InventoryItem.item))
            .where(Warehouse.business_id == business_id)
        )

        if filters.start_date:
            query = query.where(func.date(StockMovement.created_at) >= filters.start_date)
        if filters.end_date:
            query = query.where(func.date(StockMovement.created_at) <= filters.end_date)
        if filters.warehouse_id:
            query = query.where(InventoryItem.warehouse_id == filters.warehouse_id)

        res = await self.db.execute(query)
        movements = res.scalars().all()

        items: list[StockMovementAuditItem] = []
        for m in movements:
            inv = m.inventory_item
            wh_name = inv.warehouse.name if inv and inv.warehouse else "Unknown"
            sku = inv.item.sku if inv and inv.item else "N/A"
            item_name = inv.item.name if inv and inv.item else "N/A"

            items.append(
                StockMovementAuditItem(
                    movement_id=m.id,
                    timestamp=m.created_at,
                    warehouse_name=wh_name,
                    sku=sku,
                    item_name=item_name,
                    delta=m.delta,
                    reason=m.reason.value if hasattr(m.reason, "value") else str(m.reason),
                    source_type=m.source_type,
                    source_id=m.source_id,
                    reference_id=m.reference_id,
                    actor=m.actor_type,
                )
            )

        return StockMovementAuditReport(
            total_movements=len(items),
            movements=items,
        )

    async def get_lot_expiry_report(
        self, business_id: int, filters: InventoryReportFilter
    ) -> LotExpiryReport:
        query = (
            select(StockLot)
            .join(Warehouse, StockLot.warehouse_id == Warehouse.id)
            .options(selectinload(StockLot.item), selectinload(StockLot.warehouse))
            .where(StockLot.business_id == business_id)
        )

        if filters.warehouse_id:
            query = query.where(StockLot.warehouse_id == filters.warehouse_id)

        res = await self.db.execute(query)
        lots = res.scalars().all()

        now = datetime.now(timezone.utc)
        lot_items: list[LotExpiryItem] = []
        expired_cnt = 0
        expiring_soon_cnt = 0
        threshold_days = filters.expiring_days or 30

        for lot in lots:
            days_left = None
            status = "Normal"

            if lot.expiry_date:
                expiry_dt = lot.expiry_date
                if expiry_dt.tzinfo is None:
                    expiry_dt = expiry_dt.replace(tzinfo=timezone.utc)
                delta = expiry_dt - now
                days_left = delta.days

                if days_left < 0:
                    status = "Expired"
                    expired_cnt += 1
                elif days_left <= threshold_days:
                    status = "Expiring Soon"
                    expiring_soon_cnt += 1

            lot_items.append(
                LotExpiryItem(
                    warehouse_name=lot.warehouse.name if lot.warehouse else "N/A",
                    sku=lot.item.sku if lot.item else "N/A",
                    item_name=lot.item.name if lot.item else "N/A",
                    lot_number=lot.lot_number,
                    manufacture_date=lot.manufacture_date,
                    expiry_date=lot.expiry_date,
                    days_to_expiry=days_left,
                    quantity=lot.quantity,
                    status=status,
                )
            )

        return LotExpiryReport(
            total_lots=len(lots),
            expired_lots_count=expired_cnt,
            expiring_soon_count=expiring_soon_cnt,
            lots=lot_items,
        )

    # -------------------------------------------------------------------------
    # 3. Fulfillment & Shipping
    # -------------------------------------------------------------------------

    async def get_fulfillment_sla_report(
        self, business_id: int, filters: FulfillmentReportFilter
    ) -> FulfillmentSLAReport:
        query = select(Order).where(Order.business_id == business_id)

        if filters.start_date:
            query = query.where(func.date(Order.created_at) >= filters.start_date)
        if filters.end_date:
            query = query.where(func.date(Order.created_at) <= filters.end_date)
        if filters.carrier:
            query = query.where(Order.courier_company == filters.carrier)

        res = await self.db.execute(query)
        orders = res.scalars().all()

        metrics: list[FulfillmentSLAMetric] = []
        tot_latency = 0.0
        shipped_count = 0
        sla_met_count = 0

        for order in orders:
            latency = None
            shipped_at = order.updated_at if order.fulfillment_status in (
                OrderFulfillmentStatus.SHIPPED, OrderFulfillmentStatus.DELIVERED
            ) else None

            if shipped_at and order.created_at:
                diff = shipped_at - order.created_at
                latency = diff.total_seconds() / 3600.0
                tot_latency += latency
                shipped_count += 1

            sla_met = latency is not None and latency <= 24.0  # SLA target: 24h
            if sla_met:
                sla_met_count += 1

            metrics.append(
                FulfillmentSLAMetric(
                    order_number=order.order_number,
                    created_at=order.created_at,
                    shipped_at=shipped_at,
                    fulfillment_status=order.fulfillment_status.value if hasattr(order.fulfillment_status, "value") else str(order.fulfillment_status),
                    carrier=order.courier_company,
                    tracking_id=order.tracking_id,
                    fulfillment_latency_hours=round(latency, 2) if latency is not None else None,
                    sla_met=sla_met,
                )
            )

        avg_latency = (tot_latency / shipped_count) if shipped_count > 0 else 0.0
        compliance_rate = (sla_met_count / len(orders) * 100) if orders else 0.0

        return FulfillmentSLAReport(
            total_orders_analyzed=len(orders),
            avg_fulfillment_latency_hours=round(avg_latency, 2),
            sla_compliance_rate_percentage=round(compliance_rate, 2),
            orders=metrics,
        )
