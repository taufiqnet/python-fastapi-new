import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.ecommerce.inventory.models import (
    StockMovementReason,
)
from app.modules.ecommerce.inventory.schemas import StockAdjustmentRequest
from app.modules.ecommerce.inventory.service import InventoryService
from app.modules.ecommerce.orders.models import (
    OrderFulfillmentStatus,
    OrderPaymentStatus,
)
from app.modules.ecommerce.orders.repository import OrderRepository
from app.modules.ecommerce.orders.schemas import (
    OrderCreate,
    OrderDetail,
    OrderStatusUpdate,
    OrderSummary,
    OrderUpdate,
)
from app.modules.ecommerce.products.models import Product, ProductVariant


class OrderService:
    def __init__(
        self,
        repository: OrderRepository | None = None,
        inventory_service: InventoryService | None = None,
    ):
        self.repository = repository or OrderRepository()
        self.inventory_service = inventory_service or InventoryService()

    def _process_inventory_deduction_for_order(self, db: Session, order) -> None:
        """Deducts inventory stock for each order line item when status is completed or delivered."""
        # Find default warehouse for the business or fallback to any warehouse
        warehouses = self.inventory_service.get_warehouses(
            db, business_id=order.business_id, is_active=True
        )
        if not warehouses:
            # Fallback to default or any active warehouse
            warehouses = self.inventory_service.get_warehouses(db, is_active=True)
        
        if not warehouses:
            # If no warehouse exists, create a default warehouse for the business profile
            from app.modules.ecommerce.inventory.schemas import WarehouseCreate
            wh = self.inventory_service.create_warehouse(
                db,
                WarehouseCreate(
                    name="Main Warehouse",
                    code=f"MAIN-WH-{order.business_id}",
                    business_id=order.business_id,
                    is_active=True,
                    is_default=True,
                ),
            )
            warehouse_id = wh.id
        else:
            default_wh = next((w for w in warehouses if w.is_default), warehouses[0])
            warehouse_id = default_wh.id

        for item in order.items:
            # Check or create inventory item for the variant
            inv_items = self.inventory_service.repository.get_inventory_items(
                db, variant_id=item.variant_id, warehouse_id=warehouse_id
            )
            if inv_items:
                inv_item = inv_items[0]
            else:
                from app.modules.ecommerce.inventory.schemas import InventoryItemCreate
                inv_item = self.inventory_service.repository.create_inventory_item(
                    db,
                    InventoryItemCreate(
                        variant_id=item.variant_id,
                        warehouse_id=warehouse_id,
                        quantity_on_hand=item.quantity,  # set initial stock before deduction or 0
                    ),
                )

            # Record stock deduction movement
            adj_data = StockAdjustmentRequest(
                inventory_item_id=inv_item.id,
                delta=-item.quantity,
                reason=StockMovementReason.ORDER,
                reference_id=str(order.id),
                notes=f"Stock deducted for completed order {order.order_number}",
            )
            self.inventory_service.adjust_stock(db, adj_data)

    def create_order(self, db: Session, data: OrderCreate) -> OrderDetail:
        calculated_total = Decimal("0.00")
        items_with_prices = []

        for item in data.items:
            variant = (
                db.query(ProductVariant)
                .filter(ProductVariant.id == item.variant_id)
                .first()
            )
            if not variant:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Variant with ID {item.variant_id} not found",
                )

            product = db.query(Product).filter(Product.id == variant.product_id).first()
            seller_id = product.seller_id if product else None

            unit_price = variant.price
            subtotal = unit_price * item.quantity
            calculated_total += subtotal

            items_with_prices.append(
                (
                    variant.id,
                    seller_id,
                    product.title if product else "Product",
                    variant.sku,
                    variant.attributes,
                    item.quantity,
                    unit_price,
                    subtotal,
                )
            )

        order = self.repository.create_order(
            db,
            data=data,
            calculated_total=calculated_total,
            items_with_prices=items_with_prices,
        )
        return OrderDetail.model_validate(order)

    def get_order(
        self, db: Session, order_id: uuid.UUID, business_id: int = 1
    ) -> OrderDetail:
        order = self.repository.get_order_by_id(db, order_id, business_id=business_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
            )
        return OrderDetail.model_validate(order)

    def get_orders(
        self,
        db: Session,
        business_id: int = 1,
        user_id: uuid.UUID | None = None,
        payment_status: OrderPaymentStatus | None = None,
        fulfillment_status: OrderFulfillmentStatus | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[OrderSummary]:
        orders = self.repository.get_orders(
            db,
            business_id=business_id,
            user_id=user_id,
            payment_status=payment_status,
            fulfillment_status=fulfillment_status,
            skip=skip,
            limit=limit,
        )
        return [OrderSummary.model_validate(o) for o in orders]

    def update_order_status(
        self,
        db: Session,
        order_id: uuid.UUID,
        update_data: OrderStatusUpdate,
        business_id: int = 1,
    ) -> OrderDetail:
        order = self.repository.get_order_by_id(db, order_id, business_id=business_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
            )
        
        prev_f_status = getattr(order.fulfillment_status, "value", order.fulfillment_status)
        updated = self.repository.update_order_status(db, order, update_data)
        new_f_status = getattr(updated.fulfillment_status, "value", updated.fulfillment_status)

        # Trigger inventory deduction if status transitions to completed or delivered
        if new_f_status in ("delivered", "completed") and prev_f_status not in ("delivered", "completed"):
            self._process_inventory_deduction_for_order(db, updated)

        return OrderDetail.model_validate(updated)

    def update_order(
        self,
        db: Session,
        order_id: uuid.UUID,
        data: OrderUpdate,
        business_id: int = 1,
    ) -> OrderDetail:
        order = self.repository.get_order_by_id(db, order_id, business_id=business_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
            )

        calculated_total = None
        items_with_prices = None

        if data.items is not None:
            calculated_total = Decimal("0.00")
            items_with_prices = []

            for item in data.items:
                variant = (
                    db.query(ProductVariant)
                    .filter(ProductVariant.id == item.variant_id)
                    .first()
                )
                if not variant:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Variant with ID {item.variant_id} not found",
                    )

                product = db.query(Product).filter(Product.id == variant.product_id).first()
                seller_id = product.seller_id if product else None

                unit_price = variant.price
                subtotal = unit_price * item.quantity
                calculated_total += subtotal

                items_with_prices.append(
                    (
                        variant.id,
                        seller_id,
                        product.title if product else "Product",
                        variant.sku,
                        variant.attributes,
                        item.quantity,
                        unit_price,
                        subtotal,
                    )
                )

        prev_f_status = getattr(order.fulfillment_status, "value", order.fulfillment_status)
        updated = self.repository.update_order(
            db,
            order=order,
            data=data,
            calculated_total=calculated_total,
            items_with_prices=items_with_prices,
        )
        new_f_status = getattr(updated.fulfillment_status, "value", updated.fulfillment_status)

        # Trigger inventory deduction if status transitions to completed or delivered
        if new_f_status in ("delivered", "completed") and prev_f_status not in ("delivered", "completed"):
            self._process_inventory_deduction_for_order(db, updated)

        return OrderDetail.model_validate(updated)

    def delete_order(
        self,
        db: Session,
        order_id: uuid.UUID,
        business_id: int = 1,
    ) -> None:
        order = self.repository.get_order_by_id(db, order_id, business_id=business_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
            )
        self.repository.delete_order(db, order)

    def generate_excel_template(self, db: Session, business_id: int) -> bytes:
        import io

        import openpyxl

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Orders"
        ws.append([
            "Recipient Name", "Street", "City", "State", "Zip Code", "Country",
            "Product SKU", "Quantity", "Currency", "Payment Status", "Fulfillment Status"
        ])
        ws.append([
            "Sample Customer", "123 Main St", "Sample City", "NY", "10001", "USA",
            "SKU-12345", 2, "USD", "unpaid", "pending"
        ])
        excel_file = io.BytesIO()
        wb.save(excel_file)
        return excel_file.getvalue()

    def import_orders_excel(self, db: Session, business_id: int, file_bytes: bytes) -> dict:
        import io

        import openpyxl

        wb = openpyxl.load_workbook(io.BytesIO(file_bytes))
        ws = wb.active
        imported_count = 0
        errors = []

        rows = list(ws.iter_rows(values_only=True))
        if not rows or len(rows) < 2:
            return {"imported_count": 0, "errors": ["Excel file is empty or missing headers"]}

        for idx, row in enumerate(rows[1:], start=2):
            if not row or not any(row):
                continue
            try:
                rec_name, street, city, state, zip_code, country, sku, qty, currency, p_stat, f_stat = row[:11]
                if not rec_name or not street or not city or not sku:
                    errors.append(f"Row {idx}: Missing required fields (Recipient Name, Street, City, SKU)")
                    continue

                variant = db.query(ProductVariant).filter(ProductVariant.sku == str(sku).strip()).first()
                if not variant:
                    errors.append(f"Row {idx}: Product SKU '{sku}' not found")
                    continue

                order_create = OrderCreate(
                    business_id=business_id,
                    user_id=uuid.uuid4(),
                    currency=str(currency).strip() if currency else "USD",
                    items=[{"variant_id": variant.id, "quantity": int(qty or 1)}],
                    shipping_address={
                        "address_type": "shipping",
                        "recipient_name": str(rec_name).strip(),
                        "street": str(street).strip(),
                        "city": str(city).strip(),
                        "state": str(state).strip() if state else None,
                        "zip_code": str(zip_code).strip() if zip_code else None,
                        "country": str(country).strip() if country else "USA",
                    }
                )
                created_order = self.create_order(db, order_create)

                p_enum = OrderPaymentStatus(str(p_stat).strip().lower()) if p_stat and str(p_stat).strip().lower() in [s.value for s in OrderPaymentStatus] else None
                f_enum = OrderFulfillmentStatus(str(f_stat).strip().lower()) if f_stat and str(f_stat).strip().lower() in [s.value for s in OrderFulfillmentStatus] else None

                if p_enum or f_enum:
                    self.update_order_status(
                        db,
                        order_id=created_order.id,
                        update_data=OrderStatusUpdate(payment_status=p_enum, fulfillment_status=f_enum, note="Imported via Excel"),
                        business_id=business_id
                    )

                imported_count += 1
            except Exception as e:
                errors.append(f"Row {idx}: {str(e)}")

        return {"imported_count": imported_count, "errors": errors}
