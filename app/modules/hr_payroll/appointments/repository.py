import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.hr_payroll.appointments.models import AppointmentLetter


class AppointmentLetterRepository:
    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
    ) -> list[AppointmentLetter]:
        query = select(AppointmentLetter)
        if business_id is not None:
            query = query.where(AppointmentLetter.business_id == business_id)
        return list(
            db.scalars(
                query.order_by(AppointmentLetter.created_at.desc())
                .offset(skip)
                .limit(limit)
            ).all()
        )

    def get_by_id(
        self, db: Session, appointment_id: uuid.UUID
    ) -> AppointmentLetter | None:
        return db.get(AppointmentLetter, appointment_id)

    def create(self, db: Session, obj_in: AppointmentLetter) -> AppointmentLetter:
        db.add(obj_in)
        db.commit()
        db.refresh(obj_in)
        return obj_in

    def update(
        self, db: Session, db_obj: AppointmentLetter, update_data: dict
    ) -> AppointmentLetter:
        for field, value in update_data.items():
            if value is not None:
                setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, db_obj: AppointmentLetter) -> None:
        db.delete(db_obj)
        db.commit()
