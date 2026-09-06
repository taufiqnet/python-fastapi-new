import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

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
    db: Session = Depends(get_db),
):
    return service.get_customers(
        db, skip=skip, limit=limit, business_id=business_id, is_active=is_active
    )


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: uuid.UUID, db: Session = Depends(get_db)):
    return service.get_customer(db, customer_id)


@router.post("/", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(customer_data: CustomerCreate, db: Session = Depends(get_db)):
    return service.create_customer(db, customer_data)


@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: uuid.UUID,
    customer_data: CustomerUpdate,
    db: Session = Depends(get_db),
):
    return service.update_customer(db, customer_id, customer_data)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: uuid.UUID, db: Session = Depends(get_db)):
    service.delete_customer(db, customer_id)
    return None
