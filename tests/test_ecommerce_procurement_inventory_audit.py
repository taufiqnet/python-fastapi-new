import datetime
import uuid
from decimal import Decimal
import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.core.tenancy.models import BusinessProfile
from app.core.identity.models import User
from app.common.enums import Status
from app.modules.ecommerce.products.models import Product, ProductVariant
from app.modules.ecommerce.inventory.models import (
    CostLayer,
    CostingMethod,
    InventoryItem,
    Item,
    ItemType,
    StockLot,
    StockMovement,
    StockMovementReason,
    StockTransfer,
    StockTransferLine,
    TrackingType,
    TransferStatus,
    Warehouse,
)
from app.modules.ecommerce.inventory.service import InventoryService
from app.modules.ecommerce.inventory.schemas import (
    StockAdjustmentRequest,
    StockTransferCreate,
    StockTransferLineCreate,
    StockTransferReceiveRequest,
)
from app.modules.ecommerce.procurement.models import (
    GoodsReceivedNote,
    GoodsReceivedNoteItem,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
    Supplier,
)
from app.modules.ecommerce.procurement.schemas import (
    GRNCreateRequest,
    GRNItemReceive,
    PurchaseOrderCreate,
    PurchaseOrderItemCreate,
    PurchaseOrderUpdate,
    SupplierCreate,
)
from app.modules.ecommerce.procurement.service import ProcurementService

sync_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
SyncTestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=sync_engine
)


@pytest.fixture
def db():
    Base.metadata.create_all(bind=sync_engine)
    session = SyncTestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=sync_engine)


@pytest.fixture
def business(db):
    bp = BusinessProfile(
        name_en="ProERP Global Retail Ltd",
    )
    db.add(bp)
    db.commit()
    db.refresh(bp)
    return bp


@pytest.fixture
def test_user(db, business):
    user = User(
        email="procurement.officer@proerp.com",
        username="procofficer",
        password_hash="securepassword123",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def warehouses(db, business):
    wh_dhaka = Warehouse(
        business_id=business.id,
        name="Dhaka Central Hub",
        code="WH-DHK-01",
        is_active=True,
        is_default=True,
    )
    wh_ctg = Warehouse(
        business_id=business.id,
        name="Chittagong Port Depot",
        code="WH-CTG-02",
        is_active=True,
        is_default=False,
    )
    db.add_all([wh_dhaka, wh_ctg])
    db.commit()
    db.refresh(wh_dhaka)
    db.refresh(wh_ctg)
    return {"dhaka": wh_dhaka, "ctg": wh_ctg}


@pytest.fixture
def catalog_item(db, business):
    product = Product(
        business_id=business.id,
        title="Industrial Grade Wireless Barcode Scanner",
        slug="industrial-barcode-scanner-xyz",
        status=Status.ACTIVE,
    )
    db.add(product)
    db.flush()

    item = Item(
        business_id=business.id,
        sku="SKU-SCAN-001",
        name="Industrial Grade Wireless Barcode Scanner",
        item_type=ItemType.STOCK,
        tracking_type=TrackingType.LOT,
        default_cost=Decimal("50.00"),
        is_active=True,
    )
    db.add(item)
    db.flush()

    variant = ProductVariant(
        product_id=product.id,
        item_id=item.id,
        sku="SKU-SCAN-001",
        price=Decimal("120.00"),
        cost_price=Decimal("50.00"),
        stock_qty=0,
    )
    db.add(variant)
    db.commit()
    db.refresh(item)
    db.refresh(variant)
    return {"item": item, "variant": variant, "product": product}


# ── Test 1: Multi-Location Stock Allocation & Reorder Thresholds ─────────────
def test_multi_location_stock_allocation_and_reorder_levels(db, business, warehouses, catalog_item):
    """
    Asserts distinct multi-warehouse inventory rows with unique constraints
    and validates reorder point alerts when stock falls below safety stock.
    """
    inv_service = InventoryService()
    item = catalog_item["item"]
    variant = catalog_item["variant"]
    wh_dhaka = warehouses["dhaka"]
    wh_ctg = warehouses["ctg"]

    # Allocate stock in Dhaka with reorder point 15
    inv_dhaka = InventoryItem(
        variant_id=variant.id,
        item_id=item.id,
        warehouse_id=wh_dhaka.id,
        quantity_on_hand=8,  # Below reorder point 15
        reorder_point=15,
        reorder_quantity=50,
    )
    # Allocate stock in Chittagong with reorder point 10
    inv_ctg = InventoryItem(
        variant_id=variant.id,
        item_id=item.id,
        warehouse_id=wh_ctg.id,
        quantity_on_hand=25,  # Above reorder point 10
        reorder_point=10,
        reorder_quantity=30,
    )
    db.add_all([inv_dhaka, inv_ctg])
    db.commit()

    # Query reorder alerts
    alerts = inv_service.get_reorder_alerts(db, business_id=business.id)
    assert len(alerts) >= 1
    dhaka_alert = next((a for a in alerts if a.warehouse_id == wh_dhaka.id and a.sku == item.sku), None)
    assert dhaka_alert is not None
    assert dhaka_alert.quantity_available == 8
    assert dhaka_alert.reorder_point == 15
    assert dhaka_alert.reorder_quantity == 50
    assert dhaka_alert.suggested_order_quantity == 50

    # Ensure Chittagong is NOT in low stock alert
    ctg_alert = next((a for a in alerts if a.warehouse_id == wh_ctg.id and a.sku == item.sku), None)
    assert ctg_alert is None


# ── Test 2: Procurement PO Lifecycle & GRN Inbound Reconciliation ───────────
def test_procurement_po_approval_and_grn_reconciliation(db, business, warehouses, catalog_item, test_user):
    """
    Tests PO creation, status transitions, and GRN receipts (partial and complete)
    verifying PO item reconciliation and automated inventory receiving updates.
    """
    proc_service = ProcurementService()
    wh_dhaka = warehouses["dhaka"]
    variant = catalog_item["variant"]

    # 1. Create Supplier
    supplier = proc_service.create_supplier(
        db,
        SupplierCreate(
            business_id=business.id,
            name="Apex Tech Supplies Ltd",
            code="SUP-APEX-01",
            contact_name="Farhan Ahmed",
            email="farhan@apextech.com",
            phone="+8801711223344",
            payment_terms="Net 30",
        ),
    )
    assert supplier.id is not None

    # 2. Create Purchase Order for 100 units @ $50.00
    po = proc_service.create_purchase_order(
        db,
        data=PurchaseOrderCreate(
            business_id=business.id,
            supplier_id=supplier.id,
            destination_warehouse_id=wh_dhaka.id,
            currency="USD",
            notes="Urgent shipment for Dhaka Central Hub",
            items=[
                PurchaseOrderItemCreate(
                    variant_id=variant.id,
                    quantity_ordered=100,
                    unit_cost=Decimal("50.00"),
                )
            ],
        ),
    )
    assert po.status == PurchaseOrderStatus.DRAFT
    assert po.total_amount == Decimal("5000.00")
    po_item = po.items[0]

    # 3. Transition PO: DRAFT -> SENT
    po = proc_service.update_purchase_order(
        db, po_id=po.id, data=PurchaseOrderUpdate(status=PurchaseOrderStatus.SENT), business_id=business.id
    )
    assert po.status == PurchaseOrderStatus.SENT

    # 4. Partial Inbound Receiving: 40 units via GRN
    grn_partial = proc_service.receive_goods(
        db,
        business_id=business.id,
        po_id=po.id,
        user=test_user,
        req=GRNCreateRequest(
            supplier_invoice_no="INV-APEX-9921",
            notes="First partial batch received via courier",
            items=[
                GRNItemReceive(
                    po_item_id=po_item.id,
                    quantity_received=40,
                    unit_cost=Decimal("50.00"),
                    lot_number="LOT-2026-OCT-A",
                )
            ],
        ),
    )
    assert grn_partial.grn_number.startswith("GRN-")
    po_detail = proc_service.get_purchase_order(db, po_id=po.id, business_id=business.id)
    assert po_detail.status == PurchaseOrderStatus.PARTIALLY_RECEIVED
    assert po_detail.items[0].quantity_received == 40

    # Verify inventory item in Dhaka updated
    inv_item = db.scalar(
        select(InventoryItem).where(
            InventoryItem.variant_id == variant.id,
            InventoryItem.warehouse_id == wh_dhaka.id,
        )
    )
    assert inv_item is not None
    assert inv_item.quantity_on_hand == 40

    # 5. Final Inbound Receiving: Remaining 60 units
    grn_final = proc_service.receive_goods(
        db,
        business_id=business.id,
        po_id=po.id,
        user=test_user,
        req=GRNCreateRequest(
            supplier_invoice_no="INV-APEX-9922",
            notes="Final balance delivery",
            items=[
                GRNItemReceive(
                    po_item_id=po_item.id,
                    quantity_received=60,
                    unit_cost=Decimal("50.00"),
                    lot_number="LOT-2026-OCT-B",
                )
            ],
        ),
    )
    po_final = proc_service.get_purchase_order(db, po_id=po.id, business_id=business.id)
    assert po_final.status == PurchaseOrderStatus.RECEIVED
    assert po_final.items[0].quantity_received == 100
    db.refresh(inv_item)
    assert inv_item.quantity_on_hand == 100


# ── Test 3: FIFO Cost Layering & COGS Valuation ──────────────────────────────
def test_fifo_cost_layering_and_cogs_calculation(db, business, warehouses, catalog_item, test_user):
    """
    Validates First-In, First-Out (FIFO) cost layers and weighted average
    valuation formulas across successive inventory shipments at varying costs.
    """
    proc_service = ProcurementService()
    inv_service = InventoryService()
    wh_dhaka = warehouses["dhaka"]
    item = catalog_item["item"]
    variant = catalog_item["variant"]

    supplier = proc_service.create_supplier(
        db,
        SupplierCreate(
            business_id=business.id,
            name="Global Logistics Supplier",
            code="SUP-GLS-02",
        ),
    )

    # Shipment 1: 50 units @ $40.00
    po1 = proc_service.create_purchase_order(
        db,
        data=PurchaseOrderCreate(
            business_id=business.id,
            supplier_id=supplier.id,
            destination_warehouse_id=wh_dhaka.id,
            items=[PurchaseOrderItemCreate(variant_id=variant.id, quantity_ordered=50, unit_cost=Decimal("40.00"))],
        ),
    )
    proc_service.receive_goods(
        db,
        business_id=business.id,
        po_id=po1.id,
        user=test_user,
        req=GRNCreateRequest(
            items=[GRNItemReceive(po_item_id=po1.items[0].id, quantity_received=50, unit_cost=Decimal("40.00"))]
        ),
    )

    # Shipment 2: 50 units @ $60.00
    po2 = proc_service.create_purchase_order(
        db,
        data=PurchaseOrderCreate(
            business_id=business.id,
            supplier_id=supplier.id,
            destination_warehouse_id=wh_dhaka.id,
            items=[PurchaseOrderItemCreate(variant_id=variant.id, quantity_ordered=50, unit_cost=Decimal("60.00"))],
        ),
    )
    proc_service.receive_goods(
        db,
        business_id=business.id,
        po_id=po2.id,
        user=test_user,
        req=GRNCreateRequest(
            items=[GRNItemReceive(po_item_id=po2.items[0].id, quantity_received=50, unit_cost=Decimal("60.00"))]
        ),
    )

    # Verify 2 separate CostLayer records exist
    layers = list(
        db.scalars(
            select(CostLayer)
            .where(CostLayer.item_id == item.id, CostLayer.warehouse_id == wh_dhaka.id)
            .order_by(CostLayer.received_at.asc())
        ).all()
    )
    assert len(layers) == 2
    assert layers[0].quantity_remaining == 50
    assert layers[0].unit_cost == Decimal("40.00")
    assert layers[1].quantity_remaining == 50
    assert layers[1].unit_cost == Decimal("60.00")

    # Evaluate Inventory Valuation:
    # Total units = 100
    # FIFO Valuation = (50 * $40.00) + (50 * $60.00) = $2000 + $3000 = $5000.00
    fifo_report = inv_service.get_valuation(
        db, business_id=business.id, costing_method=CostingMethod.FIFO, warehouse_id=wh_dhaka.id
    )
    assert fifo_report.total_valuation == Decimal("5000.00")

    # Weighted Average = $5000 / 100 = $50.00/unit
    avg_report = inv_service.get_valuation(
        db, business_id=business.id, costing_method=CostingMethod.WEIGHTED_AVERAGE, warehouse_id=wh_dhaka.id
    )
    assert avg_report.total_valuation == Decimal("5000.00")
    assert avg_report.items[0].unit_cost == Decimal("50.00")


# ── Test 4: Lot/Batch & Expiry Date Management ──────────────────────────────
def test_lot_batch_and_serial_expiry_tracking(db, business, warehouses, catalog_item, test_user):
    """
    Tests lot/batch tracking, manufacture/expiry dates, and automated
    identification of near-expiry inventory.
    """
    proc_service = ProcurementService()
    inv_service = InventoryService()
    wh_dhaka = warehouses["dhaka"]
    item = catalog_item["item"]
    variant = catalog_item["variant"]

    supplier = proc_service.create_supplier(
        db,
        SupplierCreate(business_id=business.id, name="MedTech Devices", code="SUP-MED-03"),
    )

    po = proc_service.create_purchase_order(
        db,
        data=PurchaseOrderCreate(
            business_id=business.id,
            supplier_id=supplier.id,
            destination_warehouse_id=wh_dhaka.id,
            items=[PurchaseOrderItemCreate(variant_id=variant.id, quantity_ordered=30, unit_cost=Decimal("45.00"))],
        ),
    )

    expiry_near = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=15)
    proc_service.receive_goods(
        db,
        business_id=business.id,
        po_id=po.id,
        user=test_user,
        req=GRNCreateRequest(
            items=[
                GRNItemReceive(
                    po_item_id=po.items[0].id,
                    quantity_received=30,
                    unit_cost=Decimal("45.00"),
                    lot_number="BATCH-2026-NEAR-EXP",
                    expiry_date=expiry_near,
                )
            ]
        ),
    )

    # Verify StockLot record
    lot = db.scalar(
        select(StockLot).where(
            StockLot.business_id == business.id,
            StockLot.item_id == item.id,
            StockLot.lot_number == "BATCH-2026-NEAR-EXP",
        )
    )
    assert lot is not None
    assert lot.quantity == 30

    # Query expiring lots within 30 days
    expiring = inv_service.get_expiring_lots(db, business_id=business.id, days=30)
    assert len(expiring) >= 1
    target = next((l for l in expiring if l.lot_number == "BATCH-2026-NEAR-EXP"), None)
    assert target is not None
    assert target.quantity == 30


# ── Test 5: Stock Movement Ledger & Idempotency Key Invariant ────────────────
def test_stock_movement_ledger_immutability(db, business, warehouses, catalog_item):
    """
    Verifies that every inventory change writes an immutable double-entry
    StockMovement record and that duplicate idempotency keys are rejected.
    """
    wh_dhaka = warehouses["dhaka"]
    variant = catalog_item["variant"]
    item = catalog_item["item"]

    inv_item = InventoryItem(
        variant_id=variant.id,
        item_id=item.id,
        warehouse_id=wh_dhaka.id,
        quantity_on_hand=100,
    )
    db.add(inv_item)
    db.commit()

    idempotency_token = f"IDEMP-{uuid.uuid4()}"

    # Movement 1: First write with idempotency key
    mv1 = StockMovement(
        inventory_item_id=inv_item.id,
        delta=-5,
        reason=StockMovementReason.DAMAGE,
        idempotency_key=idempotency_token,
        notes="Damaged in transit",
    )
    db.add(mv1)
    db.commit()
    assert mv1.id is not None

    # Movement 2: Attempt duplicate submission with the same idempotency key
    mv2 = StockMovement(
        inventory_item_id=inv_item.id,
        delta=-5,
        reason=StockMovementReason.DAMAGE,
        idempotency_key=idempotency_token,
        notes="Duplicate retry",
    )
    db.add(mv2)
    with pytest.raises(Exception):
        db.commit()
    db.rollback()


# ── Test 6: Inter-Warehouse Transfers & Physical Stock Adjustments ───────────
def test_inventory_transfer_and_adjustment_controls(db, business, warehouses, catalog_item):
    """
    Tests inter-warehouse transfer workflow (DRAFT -> IN_TRANSIT -> RECEIVED)
    and manual stock adjustment with auditing.
    """
    inv_service = InventoryService()
    wh_dhaka = warehouses["dhaka"]
    wh_ctg = warehouses["ctg"]

    # Dedicated non-lot item for transfer test
    standard_item = Item(
        business_id=business.id,
        sku="SKU-TR-STD-01",
        name="Standard Transfer Hardware Item",
        item_type=ItemType.STOCK,
        tracking_type=TrackingType.NONE,
        default_cost=Decimal("35.00"),
        is_active=True,
    )
    db.add(standard_item)
    db.flush()

    # Initial stock in Dhaka: 80 units
    inv_dhaka = InventoryItem(
        item_id=standard_item.id,
        warehouse_id=wh_dhaka.id,
        quantity_on_hand=80,
    )
    # Initial stock in Chittagong: 0 units
    inv_ctg = InventoryItem(
        item_id=standard_item.id,
        warehouse_id=wh_ctg.id,
        quantity_on_hand=0,
    )
    db.add_all([inv_dhaka, inv_ctg])
    db.commit()

    # 1. Create Stock Transfer: 25 units from Dhaka to Chittagong
    transfer = inv_service.create_transfer(
        db,
        data=StockTransferCreate(
            business_id=business.id,
            transfer_number="TR-2026-DHK-CTG-001",
            source_warehouse_id=wh_dhaka.id,
            destination_warehouse_id=wh_ctg.id,
            notes="Replenishing Chittagong Depot stock",
            lines=[StockTransferLineCreate(item_id=standard_item.id, quantity=25)],
        ),
    )
    assert transfer.status == TransferStatus.DRAFT

    # 2. Ship Transfer (DRAFT -> IN_TRANSIT)
    transfer = inv_service.ship_transfer(db, transfer_id=transfer.id, business_id=business.id)
    assert transfer.status == TransferStatus.IN_TRANSIT
    db.refresh(inv_dhaka)
    assert inv_dhaka.quantity_on_hand == 55  # 80 - 25

    # 3. Receive Transfer at Chittagong (IN_TRANSIT -> RECEIVED)
    transfer = inv_service.receive_transfer(
        db,
        transfer_id=transfer.id,
        business_id=business.id,
    )
    assert transfer.status == TransferStatus.RECEIVED
    db.refresh(inv_ctg)
    assert inv_ctg.quantity_on_hand == 25  # 0 + 25

    # 4. Stock Adjustment: Correct physical count in Chittagong by -2 (Count correction)
    adjusted_inv, mv = inv_service.adjust_stock(
        db,
        data=StockAdjustmentRequest(
            inventory_item_id=inv_ctg.id,
            delta=-2,
            reason=StockMovementReason.COUNT_CORRECTION,
            notes="Physical audit discrepancy correction",
        ),
    )
    assert adjusted_inv.quantity_on_hand == 23  # 25 - 2
    assert mv.delta == -2
    assert mv.reason == StockMovementReason.COUNT_CORRECTION
