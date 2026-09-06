import uuid

from sqlalchemy.orm import Session

from app.modules.ecommerce.customer.models import Customer
from app.modules.ecommerce.customer.schemas import CustomerCreate, CustomerUpdate


class CustomerRepository:
    def get_by_id(self, db: Session, customer_id: uuid.UUID) -> Customer | None:
        return db.query(Customer).filter(Customer.id == customer_id).first()

    def get_by_email(
        self, db: Session, email: str, business_id: int | None = None
    ) -> Customer | None:
        query = db.query(Customer).filter(Customer.email == email)
        if business_id is not None:
            query = query.filter(Customer.business_id == business_id)
        return query.first()

    def get_by_phone(
        self, db: Session, phone: str, business_id: int | None = None
    ) -> Customer | None:
        query = db.query(Customer).filter(Customer.phone == phone)
        if business_id is not None:
            query = query.filter(Customer.business_id == business_id)
        return query.first()

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        is_active: bool | None = None,
    ) -> list[Customer]:
        query = db.query(Customer)
        if business_id is not None:
            query = query.filter(Customer.business_id == business_id)
        if is_active is not None:
            query = query.filter(Customer.is_active == is_active)
        return query.offset(skip).limit(limit).all()

    def create(self, db: Session, data: CustomerCreate) -> Customer:
        customer = Customer(
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email,
            phone=data.phone,
            address=data.address,
            is_active=data.is_active,
            business_id=data.business_id,
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
        return customer

    def update(self, db: Session, customer: Customer, data: CustomerUpdate) -> Customer:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(customer, field, value)

        db.commit()
        db.refresh(customer)
        return customer

    def delete(self, db: Session, customer: Customer) -> None:
        db.delete(customer)
        db.commit()
