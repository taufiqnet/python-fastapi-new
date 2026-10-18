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
    POSOrderLookupItem,
    POSOrderLookupResponse,
    POSOrderReturnRequest,
    POSOrderReturnResponse,
    POSPaymentOut,
    POSProductSearchOut,
    POSReceiptLineItem,
    POSRegisterCreate,
    POSRegisterUpdate,
    POSReturnItemReceipt,
    POSReturnItemRequest,
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

    def get_active_session_for_register(
        self, db: Session, register_id: uuid.UUID
    ) -> Optional[POSSession]:
        return db.scalar(
            select(POSSession)
            .where(
                POSSession.register_id == register_id,
                POSSession.status == SessionStatus.OPEN,
            )
            .order_by(POSSession.opened_at.desc())
        )

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
                    "note": cart_item.note,
                    "tax_exempt": cart_item.tax_exempt,
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
        audit_notes = []
        if req.customer_note:
            audit_notes.append(req.customer_note)
        if req.coupon_code:
            audit_notes.append(f"Coupon: {req.coupon_code}")
        if req.discount_reason:
            audit_notes.append(f"Discount Reason: {req.discount_reason}")
        combined_note = " | ".join(audit_notes) if audit_notes else None

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
            customer_note=combined_note,
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

            item_title = prod.title
            if item_data.get("note"):
                item_title = f"{prod.title} [{item_data['note']}]"

            order_item = OrderItem(
                order_id=order.id,
                variant_id=variant.id,
                seller_id=prod.seller_id,
                product_title=item_title,
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
                    product_title=item_title,
                    sku=variant.sku,
                    barcode=variant.barcode,
                    quantity=qty,
                    unit_price=item_data["unit_price"],
                    discount_amount=item_data["discount_amount"],
                    subtotal=item_data["subtotal"],
                    note=item_data.get("note"),
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

        # 8. Customer Loyalty & Store Credit Reconciliation
        points_earned = 0
        points_balance = None
        store_credit_balance = None
        membership_tier = None

        if req.customer_id:
            customer = db.query(Customer).filter(Customer.id == req.customer_id).first()
            if customer:
                # Deduct store credit payments (gift card or other store credit tender)
                store_credit_used = Decimal("0.00")
                for pay_item in req.payments:
                    if pay_item.payment_method == POSPaymentMethod.GIFT_CARD:
                        store_credit_used += pay_item.amount
                if store_credit_used > 0:
                    customer.store_credit = max(Decimal("0.00"), customer.store_credit - store_credit_used)

                # Deduct redeemed points
                if req.points_redeemed and req.points_redeemed > 0:
                    customer.loyalty_points = max(0, customer.loyalty_points - req.points_redeemed)

                # Award 1 point per $1 total spent
                earned = max(0, int(total_amount))
                customer.loyalty_points += earned
                points_earned = earned

                # Auto-upgrade membership tier
                if customer.loyalty_points >= 1000:
                    customer.membership_tier = "VIP"
                elif customer.loyalty_points >= 500:
                    customer.membership_tier = "Gold"
                elif customer.loyalty_points >= 200:
                    customer.membership_tier = "Silver"
                else:
                    customer.membership_tier = "Regular"

                points_balance = customer.loyalty_points
                store_credit_balance = customer.store_credit
                membership_tier = customer.membership_tier
                db.flush()

        db.commit()

        # 9. Assemble structured response
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
            discount_reason=req.discount_reason,
            coupon_code=req.coupon_code,
            points_earned=points_earned,
            points_balance=points_balance,
            store_credit_balance=store_credit_balance,
            membership_tier=membership_tier,
            receipt_header=session.register.receipt_header,
            receipt_footer=session.register.receipt_footer,
        )

    # --- Returns & Refunds Management ---
    def lookup_order_for_return(
        self, db: Session, business_id: int, order_number: str
    ) -> POSOrderLookupResponse:
        cleaned_no = order_number.strip()
        order = db.scalar(
            select(Order).where(
                Order.business_id == business_id,
                func.lower(Order.order_number) == cleaned_no.lower(),
            )
        )
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order '{order_number}' not found for this store.",
            )

        customer_name = "Walk-in Customer"
        customer_id = None
        if order.user_id:
            cust = db.query(Customer).filter(Customer.id == order.user_id).first()
            if cust:
                customer_name = f"{cust.first_name} {cust.last_name}".strip()
                customer_id = cust.id
        elif order.guest_email and "@" in order.guest_email and not order.guest_email.startswith("pos-walkin"):
            customer_name = order.guest_email

        lookup_items = []
        for it in order.items:
            ret_qty = max(0, it.quantity - it.refunded_quantity - it.cancelled_quantity)
            net_unit_price = (
                (it.subtotal / Decimal(it.quantity)).quantize(Decimal("0.01"))
                if it.quantity > 0
                else it.unit_price
            )
            variant = db.scalar(select(ProductVariant).where(ProductVariant.id == it.variant_id))
            barcode = variant.barcode if variant else None

            lookup_items.append(
                POSOrderLookupItem(
                    item_id=it.id,
                    variant_id=it.variant_id,
                    product_title=it.product_title,
                    sku=it.product_sku,
                    barcode=barcode,
                    unit_price=it.unit_price,
                    discount_amount=it.discount_amount,
                    net_unit_price=net_unit_price,
                    quantity=it.quantity,
                    refunded_quantity=it.refunded_quantity,
                    returnable_quantity=ret_qty,
                    subtotal=it.subtotal,
                )
            )

        p_status = order.payment_status.value if hasattr(order.payment_status, "value") else str(order.payment_status)
        f_status = order.fulfillment_status.value if hasattr(order.fulfillment_status, "value") else str(order.fulfillment_status)

        return POSOrderLookupResponse(
            order_id=order.id,
            order_number=order.order_number,
            created_at=order.created_at,
            customer_name=customer_name,
            customer_id=customer_id,
            total_amount=order.total_amount,
            payment_status=p_status,
            fulfillment_status=f_status,
            items=lookup_items,
        )

    def process_order_return(
        self,
        db: Session,
        user: User,
        business_id: int,
        req: POSOrderReturnRequest,
    ) -> POSOrderReturnResponse:
        session = self.get_session(db, req.session_id, business_id)
        if session.status != SessionStatus.OPEN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="POS Register Shift is closed. Cannot process returns.",
            )

        order = db.scalar(
            select(Order).where(
                Order.business_id == business_id,
                func.lower(Order.order_number) == req.order_number.strip().lower(),
            )
        )
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order '{req.order_number}' not found.",
            )

        if not req.items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No items selected for return.",
            )

        warehouse_id = session.register.warehouse_id
        items_by_id = {item.id: item for item in order.items}

        total_refund_amount = Decimal("0.00")
        returned_receipt_items: List[POSReturnItemReceipt] = []

        for ret_item in req.items:
            if ret_item.quantity <= 0:
                continue
            order_item = items_by_id.get(ret_item.order_item_id)
            if not order_item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Order line item '{ret_item.order_item_id}' not found in order {order.order_number}.",
                )

            max_returnable = max(0, order_item.quantity - order_item.refunded_quantity - order_item.cancelled_quantity)
            if ret_item.quantity > max_returnable:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot return {ret_item.quantity} of '{order_item.product_title}'. Maximum returnable quantity is {max_returnable}.",
                )

            net_unit_price = (
                (order_item.subtotal / Decimal(order_item.quantity)).quantize(Decimal("0.01"))
                if order_item.quantity > 0
                else order_item.unit_price
            )
            item_refund = (net_unit_price * Decimal(ret_item.quantity)).quantize(Decimal("0.01"))
            total_refund_amount += item_refund

            order_item.refunded_quantity += ret_item.quantity
            if order_item.refunded_quantity >= order_item.quantity:
                order_item.status = OrderItemStatus.RETURNED

            # Inventory restocking
            if ret_item.restock:
                variant = db.scalar(select(ProductVariant).where(ProductVariant.id == order_item.variant_id))
                if variant:
                    variant.stock_qty += ret_item.quantity

                inv_item = db.scalar(
                    select(InventoryItem).where(
                        InventoryItem.variant_id == order_item.variant_id,
                        InventoryItem.warehouse_id == warehouse_id,
                    )
                )
                if inv_item:
                    inv_item.quantity_on_hand += ret_item.quantity
                    inv_item_id = inv_item.id
                else:
                    new_inv = InventoryItem(
                        variant_id=order_item.variant_id,
                        warehouse_id=warehouse_id,
                        quantity_on_hand=ret_item.quantity,
                    )
                    db.add(new_inv)
                    db.flush()
                    inv_item_id = new_inv.id

                movement = StockMovement(
                    inventory_item_id=inv_item_id,
                    delta=ret_item.quantity,
                    reason=StockMovementReason.RETURN,
                    reference_id=f"RET-{order.order_number}",
                    source_type="pos_return",
                    source_id=str(order.id),
                    actor_id=str(user.id) if user and getattr(user, "id", None) else None,
                    actor_type="user",
                    unit_cost=variant.cost_price if variant else None,
                    notes=f"POS Return at {session.register.name}: {req.refund_reason or 'Customer return'}",
                )
                db.add(movement)

            returned_receipt_items.append(
                POSReturnItemReceipt(
                    product_title=order_item.product_title,
                    sku=order_item.product_sku,
                    returned_quantity=ret_item.quantity,
                    unit_price=net_unit_price,
                    refund_subtotal=item_refund,
                    restocked=ret_item.restock,
                )
            )

        if total_refund_amount <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Total refund amount must be greater than zero.",
            )

        all_refunded = all(it.refunded_quantity >= it.quantity for it in order.items)
        if all_refunded:
            order.payment_status = OrderPaymentStatus.REFUNDED
            order.fulfillment_status = OrderFulfillmentStatus.RETURNED
        else:
            order.payment_status = OrderPaymentStatus.PARTIALLY_REFUNDED

        ret_id = f"RET-{order.order_number}-{uuid.uuid4().hex[:6].upper()}"
        audit_note = (
            f"\n[POS Return {ret_id} on {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M')}: "
            f"{req.refund_method.upper()} refund of ${total_refund_amount:.2f} "
            f"by {getattr(user, 'username', 'Cashier')} | Reason: {req.refund_reason or 'None'}]"
        )
        order.customer_note = (order.customer_note or "") + audit_note

        new_store_credit_balance = None
        cust_id_to_check = req.customer_id or order.user_id
        if cust_id_to_check:
            cust = db.query(Customer).filter(Customer.id == cust_id_to_check).first()
            if cust:
                if req.refund_method == "store_credit":
                    cust.store_credit = (cust.store_credit or Decimal("0.00")) + total_refund_amount
                new_store_credit_balance = cust.store_credit

        db.commit()

        biz = db.scalar(select(BusinessProfile).where(BusinessProfile.id == business_id))
        biz_name = biz.name_en if biz else "Store"
        cashier_name = (
            getattr(user, "username", None)
            or getattr(user, "email", None)
            or "Cashier"
        )

        customer_name = "Customer"
        if cust_id_to_check:
            cust = db.query(Customer).filter(Customer.id == cust_id_to_check).first()
            if cust:
                customer_name = f"{cust.first_name} {cust.last_name}".strip()

        return POSOrderReturnResponse(
            return_id=ret_id,
            order_id=order.id,
            order_number=order.order_number,
            created_at=datetime.datetime.utcnow(),
            business_name=biz_name,
            register_name=session.register.name,
            cashier_name=cashier_name,
            customer_name=customer_name,
            refund_method=req.refund_method,
            refund_reason=req.refund_reason,
            total_refund_amount=total_refund_amount,
            items_returned=returned_receipt_items,
            customer_store_credit_balance=new_store_credit_balance,
            receipt_header=session.register.receipt_header,
            receipt_footer=session.register.receipt_footer,
        )
