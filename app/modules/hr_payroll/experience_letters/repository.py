import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.hr_payroll.experience_letters.models import ExperienceLetter


class ExperienceLetterRepository:
    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        employee_id: uuid.UUID | None = None,
    ) -> list[ExperienceLetter]:
        query = select(ExperienceLetter)
        if business_id is not None:
            query = query.where(ExperienceLetter.business_id == business_id)
        if employee_id is not None:
            query = query.where(ExperienceLetter.employee_id == employee_id)
        return list(
            db.scalars(
                query.order_by(ExperienceLetter.created_at.desc())
                .offset(skip)
                .limit(limit)
            ).all()
        )

    def get_by_id(self, db: Session, letter_id: uuid.UUID) -> ExperienceLetter | None:
        return db.get(ExperienceLetter, letter_id)

    def count_by_business(self, db: Session, business_id: int) -> int:
        query = (
            select(func.count())
            .select_from(ExperienceLetter)
            .where(ExperienceLetter.business_id == business_id)
        )
        return db.scalar(query) or 0

    def create(self, db: Session, obj_in: ExperienceLetter) -> ExperienceLetter:
        db.add(obj_in)
        db.commit()
        db.refresh(obj_in)
        return obj_in

    def update(
        self, db: Session, db_obj: ExperienceLetter, update_data: dict
    ) -> ExperienceLetter:
        for field, value in update_data.items():
            if value is not None:
                setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, db_obj: ExperienceLetter) -> None:
        db.delete(db_obj)
        db.commit()
