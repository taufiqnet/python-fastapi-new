import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.ecommerce.customer.service import CustomerService
from app.modules.ecommerce.orders.models import (
    OrderFulfillmentStatus,
    OrderPaymentStatus,
)
from app.modules.ecommerce.orders.service import OrderService
from app.modules.ecommerce.products.service import ProductService

router = APIRouter(prefix="", tags=["Order Views"])
templates = Jinja2Templates(directory="app/templates")
order_service = OrderService()
product_service = ProductService()
business_service = BusinessService()
customer_service = CustomerService()


@router.get("/orders/manage", response_class=HTMLResponse)
def order_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    db: Session = Depends(get_db),
):
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    selected_business_id = business_id or (businesses[0].id if businesses else 1)

    orders = order_service.get_orders(
        db, skip=skip, limit=limit, business_id=selected_business_id
    )

    biz_map = {b.id: b.name_en for b in businesses}

    total_count = len(orders)
    paid_count = sum(
        1
        for o in orders
        if (
            getattr(o.payment_status, "value", o.payment_status)
            == OrderPaymentStatus.PAID.value
        )
    )
    pending_fulfillment_count = sum(
        1
        for o in orders
        if (
            getattr(o.fulfillment_status, "value", o.fulfillment_status)
            == OrderFulfillmentStatus.PENDING.value
        )
    )
    delivered_count = sum(
        1
        for o in orders
        if (
            getattr(o.fulfillment_status, "value", o.fulfillment_status)
            == OrderFulfillmentStatus.DELIVERED.value
        )
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/orders/order_list.html",
        context={
            "orders": orders,
            "businesses": businesses,
            "biz_map": biz_map,
            "selected_business_id": selected_business_id,
            "total_count": total_count,
            "paid_count": paid_count,
            "pending_fulfillment_count": pending_fulfillment_count,
            "delivered_count": delivered_count,
            "payment_statuses": [s.value for s in OrderPaymentStatus],
            "fulfillment_statuses": [s.value for s in OrderFulfillmentStatus],
            "active_page": "orders",
        },
    )


@router.get("/orders/create", response_class=HTMLResponse)
def order_create_page(
    request: Request,
    business_id: int | None = None,
    db: Session = Depends(get_db),
):
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    selected_business_id = business_id or (businesses[0].id if businesses else 1)

    products = product_service.get_products(
        db, business_id=selected_business_id, skip=0, limit=500
    )
    if not products:
        products = product_service.get_products(db, skip=0, limit=500)

    customers = customer_service.get_customers(
        db, business_id=selected_business_id, is_active=True, skip=0, limit=500
    )

    products_data = []
    for p in products:
        variants_data = []
        for v in p.variants:
            attr_summary = (
                ", ".join([f"{val}" for val in v.attributes.values()])
                if v.attributes and isinstance(v.attributes, dict)
                else ""
            )
            variants_data.append(
                {
                    "id": str(v.id),
                    "sku": v.sku,
                    "price": float(v.price) if v.price is not None else 0.0,
                    "cost_price": (
                        float(v.cost_price) if v.cost_price is not None else 0.0
                    ),
                    "stock_qty": v.stock_qty,
                    "attr_summary": attr_summary,
                }
            )
        products_data.append(
            {
                "id": str(p.id),
                "title": p.title,
                "variants": variants_data,
            }
        )

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/orders/order_form.html",
        context={
            "order": None,
            "is_edit": False,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "customers": customers,
            "products": products,
            "products_data": products_data,
            "currencies": ["USD", "EUR", "GBP", "CAD", "BDT"],
            "active_page": "orders",
        },
    )


@router.get("/orders/detail/{order_id}", response_class=HTMLResponse)
def order_detail_page(
    order_id: uuid.UUID,
    request: Request,
    business_id: int = 1,
    db: Session = Depends(get_db),
):
    order = order_service.get_order(db, order_id=order_id, business_id=business_id)
    business = (
        business_service.get_business(db, order.business_id)
        if order.business_id
        else None
    )

    shipping_address = next(
        (a for a in order.addresses if a.address_type == "shipping"), None
    )
    billing_address = next(
        (a for a in order.addresses if a.address_type == "billing"), shipping_address
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/orders/order_detail.html",
        context={
            "order": order,
            "business": business,
            "shipping_address": shipping_address,
            "billing_address": billing_address,
            "payment_statuses": [s.value for s in OrderPaymentStatus],
            "fulfillment_statuses": [s.value for s in OrderFulfillmentStatus],
            "active_page": "orders",
        },
    )


@router.get("/orders/edit/{order_id}", response_class=HTMLResponse)
def order_edit_page(
    order_id: uuid.UUID,
    request: Request,
    business_id: int = 1,
    db: Session = Depends(get_db),
):
    order = order_service.get_order(db, order_id=order_id, business_id=business_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    selected_business_id = order.business_id or business_id

    from app.modules.ecommerce.products.models import ProductVariant

    # Scope to the order's business first (mirrors order_create_page), then
    # fall back to the full catalog. Prevents a variant belonging to a
    # product outside a hard limit/other business from silently having no
    # matching <option>, which left the product/variant dropdowns blank.
    all_products = product_service.get_products(
        db, business_id=selected_business_id, skip=0, limit=1000
    )
    if not all_products:
        all_products = product_service.get_products(db, skip=0, limit=1000)

    customers = customer_service.get_customers(
        db, business_id=selected_business_id, is_active=True, skip=0, limit=500
    )

    products_data = []
    variant_to_product_map = {}
    for p in all_products:
        variants_data = []
        for v in p.variants:
            variant_to_product_map[str(v.id)] = str(p.id)
            attr_summary = (
                ", ".join([f"{val}" for val in v.attributes.values()])
                if v.attributes and isinstance(v.attributes, dict)
                else ""
            )
            variants_data.append(
                {
                    "id": str(v.id),
                    "sku": v.sku,
                    "price": float(v.price) if v.price is not None else 0.0,
                    "cost_price": (
                        float(v.cost_price) if v.cost_price is not None else 0.0
                    ),
                    "stock_qty": v.stock_qty,
                    "attr_summary": attr_summary,
                }
            )
        products_data.append(
            {
                "id": str(p.id),
                "title": p.title,
                "variants": variants_data,
            }
        )

    order_items_data = []
    if order and order.items:
        for item in order.items:
            var_id_str = str(item.variant_id)
            if var_id_str not in variant_to_product_map:
                v_obj = db.query(ProductVariant).filter(ProductVariant.id == item.variant_id).first()
                if v_obj:
                    variant_to_product_map[var_id_str] = str(v_obj.product_id)

            prod_id_str = variant_to_product_map.get(var_id_str, "")
            order_items_data.append(
                {
                    "variant_id": var_id_str,
                    "product_id": prod_id_str,
                    "quantity": item.quantity,
                    "unit_price": float(item.unit_price) if item.unit_price is not None else 0.0,
                    "subtotal": float(item.subtotal) if item.subtotal is not None else 0.0,
                }
            )

    shipping_address = next(
        (a for a in order.addresses if a.address_type == "shipping"), None
    )
    billing_address = next(
        (a for a in order.addresses if a.address_type == "billing"), shipping_address
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/orders/order_form.html",
        context={
            "order": order,
            "is_edit": True,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "customers": customers,
            "products": all_products,
            "products_data": products_data,
            "order_items_data": order_items_data,
            "shipping_address": shipping_address,
            "billing_address": billing_address,
            "payment_statuses": [s.value for s in OrderPaymentStatus],
            "fulfillment_statuses": [s.value for s in OrderFulfillmentStatus],
            "currencies": ["USD", "EUR", "GBP", "CAD", "BDT"],
            "active_page": "orders",
        },
    )