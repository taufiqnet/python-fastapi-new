import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.tenancy.service import BusinessService
from app.database import get_db
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
def order_create_page(request: Request, db: Session = Depends(get_db)):
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    products = product_service.get_products(db, skip=0, limit=500)

    variants_list = []
    for p in products:
        for v in p.variants:
            variants_list.append({
                "id": str(v.id),
                "sku": v.sku,
                "price": float(v.price),
                "product_title": p.title,
                "stock_qty": v.stock_qty,
            })

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/orders/order_form.html",
        context={
            "order": None,
            "is_edit": False,
            "businesses": businesses,
            "variants_list": variants_list,
            "currencies": ["USD", "EUR", "GBP", "CAD"],
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
    business = business_service.get_business(db, order.business_id) if order.business_id else None

    shipping_address = next((a for a in order.addresses if a.address_type == "shipping"), None)
    billing_address = next((a for a in order.addresses if a.address_type == "billing"), shipping_address)

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
    products = product_service.get_products(db, skip=0, limit=500)

    variants_list = []
    for p in products:
        for v in p.variants:
            variants_list.append({
                "id": str(v.id),
                "sku": v.sku,
                "price": float(v.price),
                "product_title": p.title,
                "stock_qty": v.stock_qty,
            })

    shipping_address = next((a for a in order.addresses if a.address_type == "shipping"), None)
    billing_address = next((a for a in order.addresses if a.address_type == "billing"), shipping_address)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/orders/order_form.html",
        context={
            "order": order,
            "is_edit": True,
            "businesses": businesses,
            "variants_list": variants_list,
            "shipping_address": shipping_address,
            "billing_address": billing_address,
            "payment_statuses": [s.value for s in OrderPaymentStatus],
            "fulfillment_statuses": [s.value for s in OrderFulfillmentStatus],
            "currencies": ["USD", "EUR", "GBP", "CAD"],
            "active_page": "orders",
        },
    )
