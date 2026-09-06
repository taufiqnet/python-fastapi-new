import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.ecommerce.customer.service import CustomerService

router = APIRouter(prefix="", tags=["Customer Views"])
templates = Jinja2Templates(directory="app/templates")
customer_service = CustomerService()
business_service = BusinessService()


@router.get("/customers/manage", response_class=HTMLResponse)
def customer_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    db: Session = Depends(get_db),
):
    customers = customer_service.get_customers(
        db, skip=skip, limit=limit, business_id=business_id
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    biz_map = {b.id: b.name_en for b in businesses}

    total_count = len(customers)
    active_count = sum(1 for c in customers if getattr(c, "is_active", True))
    inactive_count = total_count - active_count
    with_email_count = sum(1 for c in customers if c.email)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/customer/customer_list.html",
        context={
            "customers": customers,
            "businesses": businesses,
            "biz_map": biz_map,
            "total_count": total_count,
            "active_count": active_count,
            "inactive_count": inactive_count,
            "with_email_count": with_email_count,
            "active_page": "customers",
        },
    )


@router.get("/customers/create", response_class=HTMLResponse)
def customer_create_page(request: Request, db: Session = Depends(get_db)):
    businesses = business_service.list_businesses(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/customer/customer_form.html",
        context={
            "customer": None,
            "is_edit": False,
            "businesses": businesses,
            "active_page": "customers",
        },
    )


@router.get("/customers/detail/{customer_id}", response_class=HTMLResponse)
def customer_detail_page(
    customer_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    customer = customer_service.get_customer(db, customer_id)
    business = None
    if customer.business_id:
        business = business_service.get_business(db, customer.business_id)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/customer/customer_detail.html",
        context={
            "customer": customer,
            "business": business,
            "active_page": "customers",
        },
    )


@router.get("/customers/edit/{customer_id}", response_class=HTMLResponse)
def customer_edit_page(
    customer_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    customer = customer_service.get_customer(db, customer_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/customer/customer_form.html",
        context={
            "customer": customer,
            "is_edit": True,
            "businesses": businesses,
            "active_page": "customers",
        },
    )
