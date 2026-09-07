import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.ecommerce.customer.models import Customer
from app.modules.ecommerce.customer.repository import CustomerRepository
from app.modules.ecommerce.customer.schemas import CustomerCreate, CustomerUpdate


class CustomerService:

    def __init__(self, repository: CustomerRepository | None = None):
        self.repository = repository or CustomerRepository()

    def get_customers(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        is_active: bool | None = None,
    ) -> list[Customer]:
        return self.repository.get_all(
            db, skip=skip, limit=limit, business_id=business_id, is_active=is_active
        )

    def get_customer(self, db: Session, customer_id: uuid.UUID) -> Customer:
        customer = self.repository.get_by_id(db, customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found",
            )
        return customer

    def create_customer(self, db: Session, data: CustomerCreate) -> Customer:
        if not data.first_name or not data.first_name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="First name is required",
            )
        if not data.phone or not data.phone.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number is required",
            )
        if not data.address or not data.address.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Full Address is required",
            )

        return self.repository.create(db, data)

    def update_customer(
        self, db: Session, customer_id: uuid.UUID, data: CustomerUpdate
    ) -> Customer:
        customer = self.get_customer(db, customer_id)

        if data.first_name is not None and not data.first_name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="First name cannot be empty",
            )
        if data.phone is not None and not data.phone.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number cannot be empty",
            )
        if data.address is not None and not data.address.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Full Address cannot be empty",
            )

        return self.repository.update(db, customer, data)

    def delete_customer(self, db: Session, customer_id: uuid.UUID) -> None:
        customer = self.get_customer(db, customer_id)
        self.repository.delete(db, customer)
