import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.hr_payroll.certificates.models import SalaryCertificate


class SalaryCertificateRepository:
    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        employee_id: uuid.UUID | None = None,
    ) -> list[SalaryCertificate]:
        query = select(SalaryCertificate)
        if business_id is not None:
            query = query.where(SalaryCertificate.business_id == business_id)
        if employee_id is not None:
            query = query.where(SalaryCertificate.employee_id == employee_id)
        return list(
            db.scalars(
                query.order_by(SalaryCertificate.created_at.desc())
                .offset(skip)
                .limit(limit)
            ).all()
        )

    def get_by_id(self, db: Session, cert_id: uuid.UUID) -> SalaryCertificate | None:
        return db.get(SalaryCertificate, cert_id)

    def count_by_business(self, db: Session, business_id: int) -> int:
        query = (
            select(func.count())
            .select_from(SalaryCertificate)
            .where(SalaryCertificate.business_id == business_id)
        )
        return db.scalar(query) or 0

    def create(self, db: Session, obj_in: SalaryCertificate) -> SalaryCertificate:
        db.add(obj_in)
        db.commit()
        db.refresh(obj_in)
        return obj_in

    def update(
        self, db: Session, db_obj: SalaryCertificate, update_data: dict
    ) -> SalaryCertificate:
        for field, value in update_data.items():
            if value is not None:
                setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, db_obj: SalaryCertificate) -> None:
        db.delete(db_obj)
        db.commit()
