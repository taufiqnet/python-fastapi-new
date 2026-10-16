import datetime
import uuid
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile
from app.modules.ecommerce.customer.models import Customer
from app.modules.ecommerce.inventory.models import (
    InventoryItem,
    StockMovement,
    StockMovementReason,
    Warehouse,
)
from app.modules.ecommerce.orders.models import (
    Order,
    OrderFulfillmentStatus,
    OrderItem,
    OrderItemStatus,
    OrderPaymentStatus,
)
from app.modules.ecommerce.pos.models import (
    POSPayment,
    POSPaymentMethod,
    POSRegister,
    POSSession,
    SessionStatus,
)
from app.modules.ecommerce.pos.schemas import (
    POSCheckoutRequest,
    POSCheckoutResponse,
    POSPaymentOut,
    POSProductSearchOut,
    POSReceiptLineItem,
    POSRegisterCreate,
    POSRegisterUpdate,
    POSSessionCloseRequest,
    POSSessionOpenRequest,
    POSSessionOut,
    POSSessionSummaryOut,
)
from app.modules.ecommerce.products.models import Product, ProductVariant


class POSService:

    # --- Register Management ---
    def list_registers(
        self, db: Session, business_id: int, is_active: Optional[bool] = None
    ) -> List[POSRegister]:
        query = select(POSRegister).where(POSRegister.business_id == business_id)
        if is_active is not None:
            query = query.where(POSRegister.is_active == is_active)
        return list(db.scalars(query.order_by(POSRegister.name)).all())

    def get_register(
        self, db: Session, register_id: uuid.UUID, business_id: Optional[int] = None
    ) -> POSRegister:
        query = select(POSRegister).where(POSRegister.id == register_id)
        if business_id:
            query = query.where(POSRegister.business_id == business_id)
        register = db.scalar(query)
        if not register:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"POS Register '{register_id}' not found.",
            )
        return register

    def create_register(self, db: Session, data: POSRegisterCreate) -> POSRegister:
        # Check warehouse belongs to same business
        warehouse = db.scalar(
            select(Warehouse).where(
                Warehouse.id == data.warehouse_id,
                or_(Warehouse.business_id == data.business_id, Warehouse.business_id.is_(None)),
            )
        )
        if not warehouse:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected warehouse is invalid or does not belong to this business.",
            )

        register = POSRegister(
            business_id=data.business_id,
            warehouse_id=data.warehouse_id,
            name=data.name,
            code=data.code,
            is_active=data.is_active,
            receipt_header=data.receipt_header,
            receipt_footer=data.receipt_footer,
        )
        db.add(register)
        db.commit()
        db.refresh(register)
        return register

    def update_register(
        self, db: Session, register_id: uuid.UUID, data: POSRegisterUpdate, business_id: int
    ) -> POSRegister:
        register = self.get_register(db, register_id, business_id)
        if data.name is not None:
            register.name = data.name
        if data.code is not None:
            register.code = data.code
        if data.warehouse_id is not None:
            register.warehouse_id = data.warehouse_id
        if data.is_active is not None:
            register.is_active = data.is_active
        if data.receipt_header is not None:
            register.receipt_header = data.receipt_header
        if data.receipt_footer is not None:
            register.receipt_footer = data.receipt_footer

        db.commit()
        db.refresh(register)
        return register

    # --- Shift / Session Management ---
    def get_active_session_for_user(
        self, db: Session, user_id: int, register_id: Optional[uuid.UUID] = None
    ) -> Optional[POSSession]:
        query = select(POSSession).where(
            POSSession.user_id == user_id,
            POSSession.status == SessionStatus.OPEN,
        )
        if register_id:
            query = query.where(POSSession.register_id == register_id)
        return db.scalar(query.order_by(POSSession.opened_at.desc()))

    def open_session(
        self, db: Session, user: User, business_id: int, request: POSSessionOpenRequest
    ) -> POSSession:
        # Check if user already has an active open session
        existing_session = self.get_active_session_for_user(db, user.id)
        if existing_session:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You already have an open shift (Session {existing_session.id}). Please close it first.",
            )

        # Check register status
        register = self.get_register(db, request.register_id, business_id)
        if not register.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This register is marked as inactive.",
            )

        # Check if register is currently in use by another user
        in_use = db.scalar(
            select(POSSession).where(
                POSSession.register_id == register.id,
                POSSession.status == SessionStatus.OPEN,
            )
        )
        if in_use:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This register is currently open in another session. Please close it first.",
            )

        session = POSSession(
            business_id=business_id,
            register_id=register.id,
            user_id=user.id,
            status=SessionStatus.OPEN,
            opened_at=datetime.datetime.utcnow(),
            opening_cash=request.opening_cash,
            notes=request.notes,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    def get_session(
        self, db: Session, session_id: uuid.UUID, business_id: Optional[int] = None
    ) -> POSSession:
        query = select(POSSession).where(POSSession.id == session_id)
        if business_id:
            query = query.where(POSSession.business_id == business_id)
        session = db.scalar(query)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"POS Session '{session_id}' not found.",
            )
        return session

    def get_session_summary(
        self, db: Session, session_id: uuid.UUID, business_id: Optional[int] = None
    ) -> POSSessionSummaryOut:
        session = self.get_session(db, session_id, business_id)

        # Calculate payments made during this session
        payments = list(
            db.scalars(select(POSPayment).where(POSPayment.session_id == session_id)).all()
        )

        total_sales = Decimal("0.00")
        cash_sales = Decimal("0.00")
        card_sales = Decimal("0.00")
        mobile_sales = Decimal("0.00")
        other_sales = Decimal("0.00")
        order_ids = set()

        for p in payments:
            order_ids.add(p.order_id)
            total_sales += p.amount
            if p.payment_method == POSPaymentMethod.CASH:
                cash_sales += p.amount
            elif p.payment_method == POSPaymentMethod.CARD:
                card_sales += p.amount
            elif p.payment_method == POSPaymentMethod.MOBILE_WALLET:
                mobile_sales += p.amount
            else:
                other_sales += p.amount

        expected_drawer_cash = session.opening_cash + cash_sales

        session_out = POSSessionOut.from_orm(session)
        session_out.register_name = session.register.name if session.register else None
        session_out.cashier_name = (
            getattr(session.user, "username", None)
            or getattr(session.user, "email", None)
            or "Cashier"
        )

        return POSSessionSummaryOut(
            session=session_out,
            total_sales_amount=total_sales,
            total_orders_count=len(order_ids),
            cash_sales_amount=cash_sales,
            card_sales_amount=card_sales,
            mobile_wallet_sales_amount=mobile_sales,
            other_sales_amount=other_sales,
            expected_drawer_cash=expected_drawer_cash,
        )

    def close_session(
        self,
        db: Session,
        session_id: uuid.UUID,
        user_id: int,
        business_id: int,
        request: POSSessionCloseRequest,
    ) -> POSSession:
        session = self.get_session(db, session_id, business_id)
        if session.status == SessionStatus.CLOSED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This shift is already closed.",
            )

        summary = self.get_session_summary(db, session_id, business_id)
        expected_cash = summary.expected_drawer_cash
        difference = request.closing_cash_counted - expected_cash

        session.status = SessionStatus.CLOSED
        session.closed_at = datetime.datetime.utcnow()
        session.closing_cash_counted = request.closing_cash_counted
        session.closing_cash_expected = expected_cash
        session.cash_difference = difference
        if request.notes:
            session.notes = (
                f"{session.notes}\nClose Notes: {request.notes}"
                if session.notes
                else request.notes
            )

        db.commit()
        db.refresh(session)
        return session

    # --- High-Speed Product Catalog Search for POS ---
    def search_products_for_pos(
        self,
        db: Session,
        business_id: int,
        warehouse_id: uuid.UUID,
        query: Optional[str] = None,
        category_id: Optional[uuid.UUID] = None,
        limit: int = 40,
    ) -> List[POSProductSearchOut]:
        stmt = (
            select(ProductVariant, Product, InventoryItem)
            .join(Product, ProductVariant.product_id == Product.id)
            .outerjoin(
                InventoryItem,
                (InventoryItem.variant_id == ProductVariant.id)
                & (InventoryItem.warehouse_id == warehouse_id),
            )
            .where(
                Product.business_id == business_id,
            )
        )

        if category_id:
            stmt = stmt.where(Product.category_id == category_id)

        if query:
            q_clean = query.strip()
            # Barcode exact match first priority or SKU / Title search
            stmt = stmt.where(
                or_(
                    ProductVariant.barcode == q_clean,
                    ProductVariant.sku.ilike(f"%{q_clean}%"),
                    Product.title.ilike(f"%{q_clean}%"),
                )
            )

        stmt = stmt.limit(limit)
        results = db.execute(stmt).all()

        output = []
        for variant, product, inv_item in results:
            stock = inv_item.quantity_on_hand if inv_item else variant.stock_qty
            image_url = None
            if product.images and len(product.images) > 0:
                image_url = product.images[0].url

            output.append(
                POSProductSearchOut(
                    product_id=product.id,
                    variant_id=variant.id,
                    title=f"{product.title} ({variant.sku})",
                    sku=variant.sku,
                    barcode=variant.barcode,
                    price=variant.price,
                    compare_at_price=variant.compare_at_price,
                    cost_price=variant.cost_price,
                    category_name=product.category.name if product.category else None,
                    stock_qty=stock,
                    image_url=image_url,
                )
            )
        return output

    # --- Fast Lane Checkout ---
    def fast_checkout(
        self, db: Session, user: User, business_id: int, req: POSCheckoutRequest
    ) -> POSCheckoutResponse:
        session = self.get_session(db, req.session_id, business_id)
        if session.status != SessionStatus.OPEN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="POS Session is closed. Open a shift before processing sales.",
            )

        warehouse_id = session.register.warehouse_id
        if not req.items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot checkout with empty items list.",
            )

        # 1. Calculate Items, check pricing & reserve inventory
        subtotal = Decimal("0.00")
        line_items_data = []

        for cart_item in req.items:
            variant = db.scalar(
                select(ProductVariant).where(ProductVariant.id == cart_item.variant_id)
            )
            if not variant:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Variant {cart_item.variant_id} not found.",
                )

            product = variant.product
            line_subtotal = (cart_item.unit_price * cart_item.quantity) - cart_item.discount_amount
            if line_subtotal < 0:
                line_subtotal = Decimal("0.00")
            subtotal += line_subtotal

            line_items_data.append(
                {
                    "variant": variant,
                    "product": product,
                    "quantity": cart_item.quantity,
                    "unit_price": cart_item.unit_price,
                    "discount_amount": cart_item.discount_amount,
                    "subtotal": line_subtotal,
                }
            )

        total_amount = subtotal + req.tax_amount - req.discount_amount
        if total_amount < 0:
            total_amount = Decimal("0.00")

        # 2. Verify Payments
        total_paid = Decimal("0.00")
        total_change = Decimal("0.00")
        for p in req.payments:
            total_paid += p.amount
            if p.change_amount:
                total_change += p.change_amount

        if total_paid < total_amount:
            payment_status = OrderPaymentStatus.UNPAID
        else:
            payment_status = OrderPaymentStatus.PAID

        # 3. Resolve Customer Name
        customer_name = req.guest_name or "Walk-in Customer"
        if req.customer_id:
            cust = db.scalar(select(Customer).where(Customer.id == req.customer_id))
            if cust:
                customer_name = cust.full_name

        # 4. Generate Order Number
        today_str = datetime.datetime.utcnow().strftime("%Y%m%d")
        rand_suffix = str(uuid.uuid4())[:6].upper()
        order_number = f"POS-{today_str}-{rand_suffix}"

        # 5. Create Order
        primary_payment_method = (
            req.payments[0].payment_method.value if req.payments else "cash"
        )
        order = Order(
            business_id=business_id,
            order_number=order_number,
            user_id=None,
            guest_email=f"pos-walkin-{rand_suffix.lower()}@pos.local",
            payment_status=payment_status,
            fulfillment_status=OrderFulfillmentStatus.DELIVERED,
            subtotal_amount=subtotal,
            tax_amount=req.tax_amount,
            shipping_amount=Decimal("0.00"),
            discount_amount=req.discount_amount,
            total_amount=total_amount,
            currency="USD",
            customer_note=req.customer_note,
            payment_method=primary_payment_method,
            payment_channel="POS",
            delivery_method="In-Store",
        )
        db.add(order)
        db.flush()

        receipt_items = []

        # 6. Create Line Items and Decrement Stock
        for item_data in line_items_data:
            variant = item_data["variant"]
            prod = item_data["product"]
            qty = item_data["quantity"]

            order_item = OrderItem(
                order_id=order.id,
                variant_id=variant.id,
                seller_id=prod.seller_id,
                product_title=prod.title,
                product_sku=variant.sku,
                variant_attributes=variant.attributes,
                quantity=qty,
                unit_price=item_data["unit_price"],
                discount_amount=item_data["discount_amount"],
                subtotal=item_data["subtotal"],
                status=OrderItemStatus.DELIVERED,
            )
            db.add(order_item)

            # Update InventoryItem in the register's warehouse
            inv_item = db.scalar(
                select(InventoryItem).where(
                    InventoryItem.variant_id == variant.id,
                    InventoryItem.warehouse_id == warehouse_id,
                )
            )
            if inv_item:
                inv_item.quantity_on_hand -= qty
                inv_item_id = inv_item.id
            else:
                # Create if it didn't exist yet
                new_inv = InventoryItem(
                    variant_id=variant.id,
                    warehouse_id=warehouse_id,
                    quantity_on_hand=max(0, variant.stock_qty - qty),
                )
                db.add(new_inv)
                db.flush()
                inv_item_id = new_inv.id

            # Decrement denormalized variant stock
            variant.stock_qty = max(0, variant.stock_qty - qty)

            # Record double-entry StockMovement
            movement = StockMovement(
                inventory_item_id=inv_item_id,
                delta=-qty,
                reason=StockMovementReason.SALE,
                reference_id=order.order_number,
                source_type="pos_checkout",
                source_id=str(order.id),
                actor_id=str(user.id) if user and getattr(user, "id", None) else None,
                actor_type="user",
                unit_cost=variant.cost_price,
                notes=f"POS Sale at {session.register.name}",
            )
            db.add(movement)

            receipt_items.append(
                POSReceiptLineItem(
                    product_title=prod.title,
                    sku=variant.sku,
                    barcode=variant.barcode,
                    quantity=qty,
                    unit_price=item_data["unit_price"],
                    discount_amount=item_data["discount_amount"],
                    subtotal=item_data["subtotal"],
                )
            )

        # 7. Record POS Payments
        recorded_payments = []
        for p in req.payments:
            pos_pay = POSPayment(
                business_id=business_id,
                order_id=order.id,
                session_id=session.id,
                payment_method=p.payment_method,
                amount=p.amount,
                tendered_amount=p.tendered_amount,
                change_amount=p.change_amount,
                reference_number=p.reference_number,
            )
            db.add(pos_pay)
            db.flush()
            recorded_payments.append(POSPaymentOut.from_orm(pos_pay))

        db.commit()

        # 8. Assemble structured response
        biz = db.scalar(select(BusinessProfile).where(BusinessProfile.id == business_id))
        biz_name = biz.name_en if biz else "Store"
        cashier_name = (
            getattr(user, "username", None)
            or getattr(user, "email", None)
            or "Cashier"
        )

        return POSCheckoutResponse(
            order_id=order.id,
            order_number=order.order_number,
            created_at=order.created_at,
            business_name=biz_name,
            register_name=session.register.name,
            cashier_name=cashier_name,
            customer_name=customer_name,
            items=receipt_items,
            subtotal_amount=subtotal,
            discount_amount=req.discount_amount,
            tax_amount=req.tax_amount,
            total_amount=total_amount,
            total_paid=total_paid,
            change_amount=total_change,
            payments=recorded_payments,
            receipt_header=session.register.receipt_header,
            receipt_footer=session.register.receipt_footer,
        )
