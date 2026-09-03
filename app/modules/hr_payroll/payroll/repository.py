import uuid

from sqlalchemy.orm import Session

from app.modules.hr_payroll.payroll.models import (
    Holiday,
    HolidayTypeEnum,
    PayrollPeriod,
    PayrollPeriodStatusEnum,
    PayrollRecord,
)
from app.modules.hr_payroll.payroll.schemas import (
    HolidayCreate,
    HolidayUpdate,
    PayrollPeriodCreate,
    PayrollPeriodUpdate,
    PayrollRecordCreate,
    PayrollRecordUpdate,
)


class HolidayRepository:
    def get_by_id(self, db: Session, holiday_uuid: uuid.UUID) -> Holiday | None:
        return db.query(Holiday).filter(Holiday.id == holiday_uuid).first()

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        holiday_type: str | HolidayTypeEnum | None = None,
    ) -> list[Holiday]:
        query = db.query(Holiday)
        if business_id is not None:
            query = query.filter(Holiday.business_id == business_id)
        if holiday_type is not None:
            query = query.filter(Holiday.holiday_type == holiday_type)
        return query.offset(skip).limit(limit).all()

    def create(self, db: Session, data: HolidayCreate) -> Holiday:
        holiday_data = data.model_dump()
        holiday = Holiday(**holiday_data)
        db.add(holiday)
        db.commit()
        db.refresh(holiday)
        return holiday

    def update(self, db: Session, holiday: Holiday, data: HolidayUpdate) -> Holiday:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(holiday, field, value)

        db.commit()
        db.refresh(holiday)
        return holiday

    def delete(self, db: Session, holiday: Holiday) -> None:
        db.delete(holiday)
        db.commit()


class PayrollPeriodRepository:
    def get_by_id(self, db: Session, period_uuid: uuid.UUID) -> PayrollPeriod | None:
        return db.query(PayrollPeriod).filter(PayrollPeriod.id == period_uuid).first()

    def get_by_name(
        self, db: Session, name: str, business_id: int
    ) -> PayrollPeriod | None:
        return (
            db.query(PayrollPeriod)
            .filter(
                PayrollPeriod.name == name,
                PayrollPeriod.business_id == business_id,
            )
            .first()
        )

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        status: str | PayrollPeriodStatusEnum | None = None,
    ) -> list[PayrollPeriod]:
        query = db.query(PayrollPeriod)
        if business_id is not None:
            query = query.filter(PayrollPeriod.business_id == business_id)
        if status is not None:
            query = query.filter(PayrollPeriod.status == status)
        return query.offset(skip).limit(limit).all()

    def create(self, db: Session, data: PayrollPeriodCreate) -> PayrollPeriod:
        period_data = data.model_dump()
        period = PayrollPeriod(**period_data)
        db.add(period)
        db.commit()
        db.refresh(period)
        return period

    def update(
        self, db: Session, period: PayrollPeriod, data: PayrollPeriodUpdate
    ) -> PayrollPeriod:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(period, field, value)

        db.commit()
        db.refresh(period)
        return period

    def delete(self, db: Session, period: PayrollPeriod) -> None:
        db.delete(period)
        db.commit()


class PayrollRecordRepository:
    def get_by_id(self, db: Session, record_uuid: uuid.UUID) -> PayrollRecord | None:
        return db.query(PayrollRecord).filter(PayrollRecord.id == record_uuid).first()

    def get_by_period_employee(
        self, db: Session, period_id: uuid.UUID, employee_id: uuid.UUID
    ) -> PayrollRecord | None:
        return (
            db.query(PayrollRecord)
            .filter(
                PayrollRecord.period_id == period_id,
                PayrollRecord.employee_id == employee_id,
            )
            .first()
        )

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        period_id: uuid.UUID | None = None,
        employee_id: uuid.UUID | None = None,
        is_paid: bool | None = None,
    ) -> list[PayrollRecord]:
        query = db.query(PayrollRecord)
        if business_id is not None:
            query = query.filter(PayrollRecord.business_id == business_id)
        if period_id is not None:
            query = query.filter(PayrollRecord.period_id == period_id)
        if employee_id is not None:
            query = query.filter(PayrollRecord.employee_id == employee_id)
        if is_paid is not None:
            query = query.filter(PayrollRecord.is_paid == is_paid)
        return query.offset(skip).limit(limit).all()

    def create(
        self,
        db: Session,
        data: PayrollRecordCreate,
        gross_salary: float,
        total_deduction: float,
        net_salary: float,
    ) -> PayrollRecord:
        record_data = data.model_dump()
        record_data["gross_salary"] = gross_salary
        record_data["total_deduction"] = total_deduction
        record_data["net_salary"] = net_salary
        record = PayrollRecord(**record_data)
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    def update(
        self,
        db: Session,
        record: PayrollRecord,
        data: PayrollRecordUpdate,
        gross_salary: float,
        total_deduction: float,
        net_salary: float,
    ) -> PayrollRecord:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(record, field, value)

        record.gross_salary = gross_salary
        record.total_deduction = total_deduction
        record.net_salary = net_salary

        db.commit()
        db.refresh(record)
        return record

    def delete(self, db: Session, record: PayrollRecord) -> None:
        db.delete(record)
        db.commit()
