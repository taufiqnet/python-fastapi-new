import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.hr_payroll.offer_letters.models import OfferLetter


class OfferLetterRepository:
    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
    ) -> list[OfferLetter]:
        query = select(OfferLetter)
        if business_id is not None:
            query = query.where(OfferLetter.business_id == business_id)
        return list(
            db.scalars(
                query.order_by(OfferLetter.created_at.desc())
                .offset(skip)
                .limit(limit)
            ).all()
        )

    def get_by_id(self, db: Session, letter_id: uuid.UUID) -> OfferLetter | None:
        return db.get(OfferLetter, letter_id)

    def count_by_business(self, db: Session, business_id: int) -> int:
        query = (
            select(func.count())
            .select_from(OfferLetter)
            .where(OfferLetter.business_id == business_id)
        )
        return db.scalar(query) or 0

    def create(self, db: Session, obj_in: OfferLetter) -> OfferLetter:
        db.add(obj_in)
        db.commit()
        db.refresh(obj_in)
        return obj_in

    def update(
        self, db: Session, db_obj: OfferLetter, update_data: dict
    ) -> OfferLetter:
        for field, value in update_data.items():
            if value is not None:
                setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, db_obj: OfferLetter) -> None:
        db.delete(db_obj)
        db.commit()
