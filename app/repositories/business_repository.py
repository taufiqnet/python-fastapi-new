from sqlalchemy.orm import Session

from app.models.business import BusinessProfile


class BusinessRepository:

    def get_by_id(self, db: Session, business_id: int):
        return db.query(BusinessProfile).filter(BusinessProfile.id == business_id).first()

    def get_by_cr_number(self, db: Session, cr_number: str):
        return db.query(BusinessProfile).filter(BusinessProfile.cr_number == cr_number).first()

    def get_by_vat_number(self, db: Session, vat_number: str):
        return db.query(BusinessProfile).filter(BusinessProfile.vat_number == vat_number).first()

    def get_all(self, db: Session, skip: int = 0, limit: int = 100):
        return db.query(BusinessProfile).offset(skip).limit(limit).all()

    def create(self, db: Session, business: BusinessProfile):
        db.add(business)
        db.commit()
        db.refresh(business)
        return business

    def update(self, db: Session, business: BusinessProfile, data: dict):
        for field, value in data.items():
            setattr(business, field, value)
        db.commit()
        db.refresh(business)
        return business

    def delete(self, db: Session, business: BusinessProfile):
        db.delete(business)
        db.commit()