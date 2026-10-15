import datetime
import uuid
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.identity.models import User
from app.modules.ecommerce.inventory.models import (
    CostLayer,
    InventoryItem,
    StockLot,
    StockMovement,
    StockMovementReason,
    Warehouse,
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
    GRNItemOut,
    GRNOut,
    PurchaseOrderCreate,
    PurchaseOrderDetailOut,
    PurchaseOrderItemOut,
    PurchaseOrderOut,
    PurchaseOrderUpdate,
    SupplierCreate,
    SupplierOut,
    SupplierUpdate,
)
from app.modules.ecommerce.products.models import ProductVariant


class ProcurementService:

    # --- Supplier Management ---
    def list_suppliers(
        self, db: Session, business_id: int, is_active: Optional[bool] = None
    ) -> List[Supplier]:
        query = select(Supplier).where(Supplier.business_id == business_id)
        if is_active is not None:
            query = query.where(Supplier.is_active == is_active)
        return list(db.scalars(query.order_by(Supplier.name)).all())

    def get_supplier(
        self, db: Session, supplier_id: uuid.UUID, business_id: Optional[int] = None
    ) -> Supplier:
        query = select(Supplier).where(Supplier.id == supplier_id)
        if business_id:
            query = query.where(Supplier.business_id == business_id)
        supplier = db.scalar(query)
        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Supplier '{supplier_id}' not found.",
            )
        return supplier

    def create_supplier(self, db: Session, data: SupplierCreate) -> Supplier:
        existing = db.scalar(
            select(Supplier).where(
                Supplier.business_id == data.business_id, Supplier.code == data.code
            )
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Supplier with code '{data.code}' already exists.",
            )

        supplier = Supplier(
            business_id=data.business_id,
            name=data.name,
            code=data.code,
            contact_name=data.contact_name,
            email=data.email,
            phone=data.phone,
            address=data.address,
            city=data.city,
            country=data.country,
            tax_id=data.tax_id,
            payment_terms=data.payment_terms,
            is_active=data.is_active,
        )
        db.add(supplier)
        db.commit()
        db.refresh(supplier)
        return supplier

    def update_supplier(
        self, db: Session, supplier_id: uuid.UUID, data: SupplierUpdate, business_id: int
    ) -> Supplier:
        supplier = self.get_supplier(db, supplier_id, business_id)
        for field, value in data.dict(exclude_unset=True).items():
            setattr(supplier, field, value)
        db.commit()
        db.refresh(supplier)
        return supplier

    # --- Purchase Order Management ---
    def list_purchase_orders(
        self,
        db: Session,
        business_id: int,
        supplier_id: Optional[uuid.UUID] = None,
        status_filter: Optional[PurchaseOrderStatus] = None,
    ) -> List[PurchaseOrderOut]:
        query = select(PurchaseOrder).where(PurchaseOrder.business_id == business_id)
        if supplier_id:
            query = query.where(PurchaseOrder.supplier_id == supplier_id)
        if status_filter:
            query = query.where(PurchaseOrder.status == status_filter)

        pos = list(db.scalars(query.order_by(PurchaseOrder.created_at.desc())).all())
        output = []
        for po in pos:
            po_out = PurchaseOrderOut.from_orm(po)
            po_out.supplier_name = po.supplier.name if po.supplier else None
            po_out.warehouse_name = (
                po.destination_warehouse.name if po.destination_warehouse else None
            )
            output.append(po_out)
        return output

    def get_purchase_order(
        self, db: Session, po_id: uuid.UUID, business_id: Optional[int] = None
    ) -> PurchaseOrderDetailOut:
        query = select(PurchaseOrder).where(PurchaseOrder.id == po_id)
        if business_id:
            query = query.where(PurchaseOrder.business_id == business_id)
        po = db.scalar(query)
        if not po:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Purchase Order '{po_id}' not found.",
            )

        items_out = []
        for it in po.items:
            it_out = PurchaseOrderItemOut.from_orm(it)
            it_out.product_title = (
                it.variant.product.title if it.variant and it.variant.product else None
            )
            it_out.sku = it.variant.sku if it.variant else None
            items_out.append(it_out)

        po_out = PurchaseOrderDetailOut.from_orm(po)
        po_out.supplier_name = po.supplier.name if po.supplier else None
        po_out.warehouse_name = (
            po.destination_warehouse.name if po.destination_warehouse else None
        )
        po_out.items = items_out
        return po_out

    def create_purchase_order(
        self, db: Session, data: PurchaseOrderCreate
    ) -> PurchaseOrderDetailOut:
        supplier = self.get_supplier(db, data.supplier_id, data.business_id)
        warehouse = db.scalar(
            select(Warehouse).where(Warehouse.id == data.destination_warehouse_id)
        )
        if not warehouse:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Destination warehouse does not exist.",
            )

        today_str = datetime.datetime.utcnow().strftime("%Y%m%d")
        rand_suffix = str(uuid.uuid4())[:6].upper()
        po_number = f"PO-{today_str}-{rand_suffix}"

        # Calculate totals
        subtotal = Decimal("0.00")
        total_tax = Decimal("0.00")
        for it in data.items:
            line_subtotal = it.unit_cost * it.quantity_ordered
            subtotal += line_subtotal
            total_tax += it.tax_amount

        total_amount = subtotal + total_tax + data.shipping_amount

        po = PurchaseOrder(
            business_id=data.business_id,
            po_number=po_number,
            supplier_id=data.supplier_id,
            destination_warehouse_id=data.destination_warehouse_id,
            status=PurchaseOrderStatus.DRAFT,
            order_date=data.order_date,
            expected_delivery_date=data.expected_delivery_date,
            subtotal_amount=subtotal,
            tax_amount=total_tax,
            shipping_amount=data.shipping_amount,
            total_amount=total_amount,
            currency=data.currency,
            notes=data.notes,
        )
        db.add(po)
        db.flush()

        for it in data.items:
            variant = db.scalar(
                select(ProductVariant).where(ProductVariant.id == it.variant_id)
            )
            if not variant:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Variant '{it.variant_id}' not found.",
                )

            line_subtotal = it.unit_cost * it.quantity_ordered
            po_item = PurchaseOrderItem(
                purchase_order_id=po.id,
                variant_id=variant.id,
                item_id=variant.item_id,
                quantity_ordered=it.quantity_ordered,
                quantity_received=0,
                unit_cost=it.unit_cost,
                tax_amount=it.tax_amount,
                subtotal=line_subtotal,
            )
            db.add(po_item)

        db.commit()
        return self.get_purchase_order(db, po.id, data.business_id)

    def update_purchase_order(
        self,
        db: Session,
        po_id: uuid.UUID,
        data: PurchaseOrderUpdate,
        business_id: int,
    ) -> PurchaseOrderDetailOut:
        po = db.scalar(
            select(PurchaseOrder).where(
                PurchaseOrder.id == po_id, PurchaseOrder.business_id == business_id
            )
        )
        if not po:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Purchase Order '{po_id}' not found.",
            )

        if data.status:
            po.status = data.status
        if data.expected_delivery_date is not None:
            po.expected_delivery_date = data.expected_delivery_date
        if data.notes is not None:
            po.notes = data.notes
        if data.shipping_amount is not None:
            po.shipping_amount = data.shipping_amount
            po.total_amount = po.subtotal_amount + po.tax_amount + po.shipping_amount

        db.commit()
        return self.get_purchase_order(db, po.id, business_id)

    # --- Goods Receiving Flow (GRN -> Stock Movement & FIFO Valuation) ---
    def receive_goods(
        self,
        db: Session,
        user: User,
        po_id: uuid.UUID,
        business_id: int,
        req: GRNCreateRequest,
    ) -> GRNOut:
        po = db.scalar(
            select(PurchaseOrder).where(
                PurchaseOrder.id == po_id, PurchaseOrder.business_id == business_id
            )
        )
        if not po:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Purchase Order '{po_id}' not found.",
            )

        if po.status in (PurchaseOrderStatus.CANCELLED, PurchaseOrderStatus.RECEIVED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot receive goods for PO in status '{po.status.value}'.",
            )

        today_str = datetime.datetime.utcnow().strftime("%Y%m%d")
        rand_suffix = str(uuid.uuid4())[:6].upper()
        grn_number = f"GRN-{today_str}-{rand_suffix}"

        grn = GoodsReceivedNote(
            business_id=business_id,
            grn_number=grn_number,
            purchase_order_id=po.id,
            received_at=datetime.datetime.utcnow(),
            received_by_id=user.id,
            supplier_invoice_no=req.supplier_invoice_no,
            notes=req.notes,
        )
        db.add(grn)
        db.flush()

        warehouse_id = po.destination_warehouse_id
        grn_items_out = []

        for item_data in req.items:
            po_item = db.scalar(
                select(PurchaseOrderItem).where(
                    PurchaseOrderItem.id == item_data.po_item_id,
                    PurchaseOrderItem.purchase_order_id == po.id,
                )
            )
            if not po_item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"PO item '{item_data.po_item_id}' not found on this PO.",
                )

            qty = item_data.quantity_received
            unit_cost = (
                item_data.unit_cost
                if item_data.unit_cost is not None
                else po_item.unit_cost
            )

            # Update PO item received quantity
            po_item.quantity_received += qty

            # Create GRN line item
            grn_item = GoodsReceivedNoteItem(
                grn_id=grn.id,
                po_item_id=po_item.id,
                variant_id=po_item.variant_id,
                quantity_received=qty,
                unit_cost=unit_cost,
                lot_number=item_data.lot_number,
                expiry_date=item_data.expiry_date,
            )
            db.add(grn_item)

            # --- INVENTORY RECEIVING INTEGRATION ---
            variant = po_item.variant

            # 1. Update/Create InventoryItem in Destination Warehouse
            inv_item = db.scalar(
                select(InventoryItem).where(
                    InventoryItem.variant_id == variant.id,
                    InventoryItem.warehouse_id == warehouse_id,
                )
            )
            if inv_item:
                inv_item.quantity_on_hand += qty
                inv_item_id = inv_item.id
            else:
                inv_item = InventoryItem(
                    variant_id=variant.id,
                    item_id=variant.item_id,
                    warehouse_id=warehouse_id,
                    quantity_on_hand=qty,
                )
                db.add(inv_item)
                db.flush()
                inv_item_id = inv_item.id

            # 2. Update ProductVariant denormalized total stock and cost price
            variant.stock_qty += qty
            variant.cost_price = unit_cost

            # 3. Create Double-Entry StockMovement(RECEIPT)
            movement = StockMovement(
                inventory_item_id=inv_item_id,
                delta=qty,
                reason=StockMovementReason.RECEIPT,
                reference_id=po.po_number,
                source_type="purchase_order",
                source_id=grn.grn_number,
                actor_id=user.id,
                actor_type="user",
                unit_cost=unit_cost,
                batch_number=item_data.lot_number,
                expiry_date=item_data.expiry_date,
                notes=f"Inbound receiving via {grn_number} from {po.supplier.name}",
            )
            db.add(movement)

            # 4. Create FIFO CostLayer for Inventory Valuation
            cost_layer = CostLayer(
                business_id=business_id,
                item_id=variant.item_id,
                warehouse_id=warehouse_id,
                received_at=datetime.datetime.utcnow(),
                quantity_remaining=qty,
                unit_cost=unit_cost,
                source_type="grn",
                source_id=grn.grn_number,
            )
            if variant.item_id:
                db.add(cost_layer)

            # 5. If Lot/Batch tracking enabled, record StockLot
            if item_data.lot_number:
                lot = db.scalar(
                    select(StockLot).where(
                        StockLot.business_id == business_id,
                        StockLot.item_id == variant.item_id,
                        StockLot.warehouse_id == warehouse_id,
                        StockLot.lot_number == item_data.lot_number,
                    )
                )
                if lot:
                    lot.quantity += qty
                    if item_data.expiry_date:
                        lot.expiry_date = item_data.expiry_date
                elif variant.item_id:
                    new_lot = StockLot(
                        business_id=business_id,
                        item_id=variant.item_id,
                        warehouse_id=warehouse_id,
                        lot_number=item_data.lot_number,
                        quantity=qty,
                        expiry_date=item_data.expiry_date,
                    )
                    db.add(new_lot)

            grn_items_out.append(
                GRNItemOut(
                    id=grn_item.id,
                    po_item_id=po_item.id,
                    variant_id=variant.id,
                    product_title=variant.product.title,
                    sku=variant.sku,
                    quantity_received=qty,
                    unit_cost=unit_cost,
                    lot_number=item_data.lot_number,
                    expiry_date=item_data.expiry_date,
                )
            )

        # Evaluate PO Completion Status
        all_completed = all(it.quantity_received >= it.quantity_ordered for it in po.items)
        if all_completed:
            po.status = PurchaseOrderStatus.RECEIVED
        else:
            po.status = PurchaseOrderStatus.PARTIALLY_RECEIVED

        db.commit()

        return GRNOut(
            id=grn.id,
            business_id=business_id,
            grn_number=grn.grn_number,
            purchase_order_id=po.id,
            received_at=grn.received_at,
            supplier_invoice_no=grn.supplier_invoice_no,
            notes=grn.notes,
            items=grn_items_out,
        )
