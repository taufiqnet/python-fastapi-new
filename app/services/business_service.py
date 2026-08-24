from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.business import BusinessProfile
from app.repositories.business_repository import BusinessRepository
from app.schemas.business import BusinessProfileCreate


class BusinessService:

    def __init__(self):
        self.repository = BusinessRepository()

    def create_business(self, db: Session, data: BusinessProfileCreate):
        if data.cr_number and self.repository.get_by_cr_number(db, data.cr_number):
            raise HTTPException(status_code=400, detail="CR number already exists")

        if data.vat_number and self.repository.get_by_vat_number(db, data.vat_number):
            raise HTTPException(status_code=400, detail="VAT number already exists")

        business = BusinessProfile(**data.model_dump())

        return self.repository.create(db, business)

    def get_business(self, db: Session, business_id: int):
        business = self.repository.get_by_id(db, business_id)

        if not business:
            raise HTTPException(status_code=404, detail="Business profile not found")

        return business

    def list_businesses(self, db: Session, skip: int = 0, limit: int = 100):
        return self.repository.get_all(db, skip, limit)

    def update_business(self, db: Session, business_id: int, data: BusinessProfileCreate):
        business = self.get_business(db, business_id)

        if data.cr_number and data.cr_number != business.cr_number:
            if self.repository.get_by_cr_number(db, data.cr_number):
                raise HTTPException(status_code=400, detail="CR number already exists")

        if data.vat_number and data.vat_number != business.vat_number:
            if self.repository.get_by_vat_number(db, data.vat_number):
                raise HTTPException(status_code=400, detail="VAT number already exists")

        return self.repository.update(db, business, data.model_dump())

    def delete_business(self, db: Session, business_id: int):
        business = self.get_business(db, business_id)
        self.repository.delete(db, business)