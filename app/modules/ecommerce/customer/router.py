import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.security import get_current_user_optional
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id, verify_record_ownership
from app.database import get_db
from app.modules.ecommerce.customer.schemas import (
    CustomerCreate,
    CustomerOut,
    CustomerUpdate,
)
from app.modules.ecommerce.customer.service import CustomerService

router = APIRouter(prefix="/customers", tags=["Customers"])
service = CustomerService()


@router.get("/", response_model=list[CustomerOut])
def get_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    is_active: bool | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "customers", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return service.get_customers(
        db, skip=skip, limit=limit, business_id=resolved_business_id, is_active=is_active
    )


@router.get("/check-phone")
def check_phone(
    phone: str = Query(...),
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "customers", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    existing = service.repository.get_by_phone(db, phone.strip(), business_id=resolved_business_id)
    if existing:
        return {
            "exists": True,
            "message": "A customer with this phone number already exists."
        }
    return {"exists": False, "message": None}


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: uuid.UUID,
    current_user: User = Depends(require_permission("ecommerce", "customers", "view")),
    db: Session = Depends(get_db),
):
    customer = service.get_customer(db, customer_id)
    verify_record_ownership(customer, current_user)
    return customer


@router.post("/", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer_data: CustomerCreate,
    current_user: User = Depends(require_permission("ecommerce", "customers", "create")),
    db: Session = Depends(get_db),
):
    customer_data.business_id = resolve_business_id(current_user, customer_data.business_id)
    return service.create_customer(db, customer_data)


@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: uuid.UUID,
    customer_data: CustomerUpdate,
    current_user: User = Depends(require_permission("ecommerce", "customers", "update")),
    db: Session = Depends(get_db),
):
    customer = service.get_customer(db, customer_id)
    verify_record_ownership(customer, current_user)
    if customer_data.business_id is not None or (current_user and not current_user.is_superuser):
        customer_data.business_id = resolve_business_id(current_user, customer_data.business_id)
    return service.update_customer(db, customer_id, customer_data)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: uuid.UUID,
    current_user: User = Depends(require_permission("ecommerce", "customers", "delete")),
    db: Session = Depends(get_db),
):
    customer = service.get_customer(db, customer_id)
    verify_record_ownership(customer, current_user)
    service.delete_customer(db, customer_id)
    return None
