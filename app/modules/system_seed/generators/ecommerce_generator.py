"""
Seed data generator for E-Commerce & Retail / POS module.
Generates categories, brands, products, product variants, warehouses,
inventory stock levels, sample customer orders, and transaction payments.
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Callable, Dict
from sqlalchemy.orm import Session

from app.common.enums import Status
from app.modules.ecommerce.categories.models import Category
from app.modules.ecommerce.brands.models import Brand
from app.modules.ecommerce.products.models import (
    Product,
    ProductVariant,
    ProductCondition,
    ProductType,
)
from app.modules.ecommerce.inventory.models import Warehouse, InventoryItem
from app.modules.ecommerce.orders.models import (
    Order,
    OrderItem,
    OrderPaymentStatus,
    OrderFulfillmentStatus,
    OrderItemStatus,
)
from app.modules.ecommerce.payments.models import Payment, PaymentStatus


def seed_ecommerce_data(db: Session, business_id: int, log_record: Callable[[str, str], None]) -> Dict[str, int]:
    counts = {
        "categories": 0,
        "brands": 0,
        "products": 0,
        "product_variants": 0,
        "warehouses": 0,
        "inventory_items": 0,
        "orders": 0,
        "order_items": 0,
        "payments": 0,
    }

    # 1. Categories
    category_specs = [
        ("Industrial Equipment [SEED]", f"seed-ind-equip-{business_id}", "Industrial grade hardware and sensors"),
        ("Office IT & Electronics [SEED]", f"seed-office-it-{business_id}", "Enterprise IT, printers, and scanners"),
        ("Safety & Protective Gear [SEED]", f"seed-ppe-safety-{business_id}", "PPE and industrial occupational safety apparel"),
    ]

    created_categories = []
    for name, slug, desc in category_specs:
        cat = Category(
            business_id=business_id,
            name=name,
            slug=slug,
            description=desc,
            is_active=True,
        )
        db.add(cat)
        db.flush()
        log_record("categories", str(cat.id))
        created_categories.append(cat)
        counts["categories"] += 1

    # 2. Brands
    brand_specs = [
        ("Apex Industrial [SEED]", f"seed-apex-ind-{business_id}", "Leading Bangladesh manufacturer of protective footwear & gear"),
        ("Walton Enterprise [SEED]", f"seed-walton-ent-{business_id}", "High-reliability commercial electronics and computing hardware"),
    ]

    created_brands = []
    for name, slug, desc in brand_specs:
        brand = Brand(
            business_id=business_id,
            name=name,
            slug=slug,
            description=desc,
            is_active=True,
        )
        db.add(brand)
        db.flush()
        log_record("brands", str(brand.id))
        created_brands.append(brand)
        counts["brands"] += 1

    # 3. Products & Product Variants
    product_specs = [
        (
            "Enterprise Barcode Scanner 2D Wireless [SEED]",
            f"seed-prod-scanner-{business_id}",
            "Industrial 2D QR and barcode scanner with Bluetooth base station and 50m range.",
            created_categories[1].id,
            created_brands[1].id,
            f"SEED-SKU-001-{business_id % 1000}",
            Decimal("14500.00"),
            Decimal("11000.00"),
            80,
        ),
        (
            "Thermal POS Receipt Printer 80mm [SEED]",
            f"seed-prod-pos-printer-{business_id}",
            "Heavy-duty thermal receipt printer with auto-cutter and Ethernet/USB interfaces.",
            created_categories[1].id,
            created_brands[1].id,
            f"SEED-SKU-002-{business_id % 1000}",
            Decimal("8900.00"),
            Decimal("6500.00"),
            60,
        ),
        (
            "High-Visibility Reflective Safety Vest [SEED]",
            f"seed-prod-safety-vest-{business_id}",
            "EN ISO 20471 Class 2 compliant reflective safety vest with breathable mesh.",
            created_categories[2].id,
            created_brands[0].id,
            f"SEED-SKU-003-{business_id % 1000}",
            Decimal("1850.00"),
            Decimal("1200.00"),
            250,
        ),
        (
            "Heavy-Duty Steel Toe Safety Boots S3 [SEED]",
            f"seed-prod-safety-boots-{business_id}",
            "Anti-static, puncture-resistant steel toe safety boots suitable for port & manufacturing facilities.",
            created_categories[2].id,
            created_brands[0].id,
            f"SEED-SKU-004-{business_id % 1000}",
            Decimal("4200.00"),
            Decimal("2900.00"),
            120,
        ),
    ]

    created_variants = []
    for title, slug, desc, cat_id, brand_id, sku, price, cost, stock in product_specs:
        product = Product(
            business_id=business_id,
            title=title,
            slug=slug,
            description=desc,
            category_id=cat_id,
            brand_id=brand_id,
            status=Status.ACTIVE,
            condition=ProductCondition.NEW,
            product_type=ProductType.PHYSICAL,
            requires_shipping=True,
            is_featured=True,
        )
        db.add(product)
        db.flush()
        log_record("products", str(product.id))
        counts["products"] += 1

        variant = ProductVariant(
            product_id=product.id,
            sku=sku,
            price=price,
            cost_price=cost,
            currency="BDT",
            stock_qty=stock,
            low_stock_threshold=10,
            is_default=True,
            weight=Decimal("1.500"),
            weight_unit="kg",
        )
        db.add(variant)
        db.flush()
        log_record("product_variants", str(variant.id))
        created_variants.append(variant)
        counts["product_variants"] += 1

    # 4. Warehouses
    warehouse_specs = [
        ("Dhaka Central Distribution Hub [SEED]", f"SEED-WH-DHK-{business_id}", "Tejgaon Industrial Area, Dhaka", "Dhaka", "1208", True),
        ("Chattogram Port Logistics Depot [SEED]", f"SEED-WH-CTG-{business_id}", "Agrabad Commercial Area, Chattogram", "Chattogram", "4100", False),
    ]

    created_warehouses = []
    for name, code, addr, city, post, is_def in warehouse_specs:
        wh = Warehouse(
            business_id=business_id,
            name=name,
            code=code,
            address_line1=addr,
            city=city,
            postal_code=post,
            country="BD",
            region=city,
            is_active=True,
            is_default=is_def,
        )
        db.add(wh)
        db.flush()
        log_record("warehouses", str(wh.id))
        created_warehouses.append(wh)
        counts["warehouses"] += 1

    # 5. Inventory Items (Stock allocated per warehouse)
    for variant in created_variants:
        # Central Hub has 70% of stock
        inv_dhk = InventoryItem(
            variant_id=variant.id,
            warehouse_id=created_warehouses[0].id,
            quantity_on_hand=int(variant.stock_qty * 0.7),
            quantity_reserved=0,
            quantity_incoming=0,
            aisle="A-01",
            bin_code="BIN-101",
        )
        db.add(inv_dhk)
        db.flush()
        log_record("inventory_items", str(inv_dhk.id))
        counts["inventory_items"] += 1

        # Chattogram Depot has 30% of stock
        inv_ctg = InventoryItem(
            variant_id=variant.id,
            warehouse_id=created_warehouses[1].id,
            quantity_on_hand=int(variant.stock_qty * 0.3),
            quantity_reserved=0,
            quantity_incoming=0,
            aisle="B-03",
            bin_code="BIN-204",
        )
        db.add(inv_ctg)
        db.flush()
        log_record("inventory_items", str(inv_ctg.id))
        counts["inventory_items"] += 1

    # 6. Customer Orders
    order_specs = [
        (
            f"SEED-ORD-2026-001-{business_id % 1000}",
            f"procurement.{business_id}@seedclient-dhaka.com",
            OrderPaymentStatus.PAID,
            OrderFulfillmentStatus.DELIVERED,
            [
                (created_variants[0], 2),  # 2x Barcode Scanner
                (created_variants[2], 10), # 10x Safety Vest
            ],
            "bKash Merchant Payment",
        ),
        (
            f"SEED-ORD-2026-002-{business_id % 1000}",
            f"logistics.{business_id}@seedclient-ctg.com",
            OrderPaymentStatus.PAID,
            OrderFulfillmentStatus.SHIPPED,
            [
                (created_variants[1], 1),  # 1x POS Printer
                (created_variants[3], 5),  # 5x Safety Boots
            ],
            "Bank Wire Transfer",
        ),
    ]

    for ord_num, guest_email, pay_status, ful_status, line_items, note in order_specs:
        subtotal = Decimal("0.00")
        for var, qty in line_items:
            subtotal += var.price * Decimal(qty)

        tax = (subtotal * Decimal("0.05")).quantize(Decimal("0.01"))  # 5% statutory VAT
        shipping = Decimal("150.00")
        total = subtotal + tax + shipping

        order = Order(
            business_id=business_id,
            order_number=ord_num,
            guest_email=guest_email,
            payment_status=pay_status,
            fulfillment_status=ful_status,
            subtotal_amount=subtotal,
            tax_amount=tax,
            shipping_amount=shipping,
            discount_amount=Decimal("0.00"),
            total_amount=total,
            currency="BDT",
            customer_note=f"Sample enterprise test order [SEED]: {note}",
        )
        db.add(order)
        db.flush()
        log_record("orders", str(order.id))
        counts["orders"] += 1

        for var, qty in line_items:
            line_subtotal = var.price * Decimal(qty)
            line_tax = (line_subtotal * Decimal("0.05")).quantize(Decimal("0.01"))
            item = OrderItem(
                order_id=order.id,
                variant_id=var.id,
                product_title=f"Sample Product item for {var.sku}",
                product_sku=var.sku,
                quantity=qty,
                unit_price=var.price,
                tax_amount=line_tax,
                discount_amount=Decimal("0.00"),
                subtotal=line_subtotal,
                status=OrderItemStatus.DELIVERED if ful_status == OrderFulfillmentStatus.DELIVERED else OrderItemStatus.SHIPPED,
            )
            db.add(item)
            db.flush()
            log_record("order_items", str(item.id))
            counts["order_items"] += 1

        # 7. Payment for order
        payment = Payment(
            business_id=business_id,
            order_id=order.id,
            provider="bkash" if "bKash" in note else "bank_transfer",
            transaction_id=f"TRX-SEED-{uuid.uuid4().hex[:10].upper()}",
            amount=total,
            currency="BDT",
            status=PaymentStatus.CAPTURED,
        )
        db.add(payment)
        db.flush()
        log_record("payments", str(payment.id))
        counts["payments"] += 1

    return counts
