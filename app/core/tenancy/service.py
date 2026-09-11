from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.tenancy.models import BusinessProfile
from app.core.tenancy.repository import BusinessRepository
from app.core.tenancy.schemas import BusinessProfileCreate


class BusinessService:
    def __init__(self):
        self.repository = BusinessRepository()

    def create_business(self, db: Session, data: BusinessProfileCreate):
        cr = data.cr_number.strip() if data.cr_number else None
        vat = data.vat_number.strip() if data.vat_number else None

        if cr and self.repository.get_by_cr_number(db, cr):
            raise HTTPException(status_code=400, detail="CR number already exists")

        if vat and self.repository.get_by_vat_number(db, vat):
            raise HTTPException(status_code=400, detail="VAT number already exists")

        dump = data.model_dump()
        dump["cr_number"] = cr
        dump["vat_number"] = vat

        if dump.get("subscription_plan_id") is None:
            from app.core.billing.models import SubscriptionPlan
            free_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == "Free").first()
            dump["subscription_plan_id"] = free_plan.id if free_plan else 1

        business = BusinessProfile(**dump)

        return self.repository.create(db, business)

    def get_business(self, db: Session, business_id: int):
        business = self.repository.get_by_id(db, business_id)

        if not business:
            raise HTTPException(status_code=404, detail="Business profile not found")

        return business

    def list_businesses(self, db: Session, skip: int = 0, limit: int = 100):
        return self.repository.get_all(db, skip, limit)

    def update_business(
        self, db: Session, business_id: int, data: BusinessProfileCreate
    ):
        business = self.get_business(db, business_id)

        cr = data.cr_number.strip() if data.cr_number else None
        vat = data.vat_number.strip() if data.vat_number else None

        if cr and cr != business.cr_number:
            if self.repository.get_by_cr_number(db, cr):
                raise HTTPException(status_code=400, detail="CR number already exists")

        if vat and vat != business.vat_number:
            if self.repository.get_by_vat_number(db, vat):
                raise HTTPException(status_code=400, detail="VAT number already exists")

        dump = data.model_dump()
        dump["cr_number"] = cr
        dump["vat_number"] = vat

        if dump.get("subscription_plan_id") is None:
            if business.subscription_plan_id:
                dump["subscription_plan_id"] = business.subscription_plan_id
            else:
                from app.core.billing.models import SubscriptionPlan
                free_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == "Free").first()
                dump["subscription_plan_id"] = free_plan.id if free_plan else 1

        return self.repository.update(db, business, dump)

    def delete_business(self, db: Session, business_id: int):
        business = self.get_business(db, business_id)
        self.repository.delete(db, business)
