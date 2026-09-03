import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.modules.hr_payroll.attendance.models import Attendance, AttendanceStatusEnum
from app.modules.hr_payroll.attendance.schemas import (
    AttendanceCreate,
    AttendanceUpdate,
)


class AttendanceRepository:
    def get_by_id(self, db: Session, attendance_uuid: uuid.UUID) -> Attendance | None:
        return (
            db.query(Attendance)
            .filter(Attendance.id == attendance_uuid)
            .first()
        )

    def get_by_emp_date(
        self,
        db: Session,
        employee_id: uuid.UUID,
        att_date: date,
        business_id: int | None = None,
    ) -> Attendance | None:
        query = db.query(Attendance).filter(
            Attendance.employee_id == employee_id,
            Attendance.date == att_date,
        )
        if business_id is not None:
            query = query.filter(Attendance.business_id == business_id)
        return query.first()

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        employee_id: uuid.UUID | None = None,
        att_date: date | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        status: str | AttendanceStatusEnum | None = None,
    ) -> list[Attendance]:
        query = db.query(Attendance)
        if business_id is not None:
            query = query.filter(Attendance.business_id == business_id)
        if employee_id is not None:
            query = query.filter(Attendance.employee_id == employee_id)
        if att_date is not None:
            query = query.filter(Attendance.date == att_date)
        if start_date is not None:
            query = query.filter(Attendance.date >= start_date)
        if end_date is not None:
            query = query.filter(Attendance.date <= end_date)
        if status is not None:
            query = query.filter(Attendance.status == status)

        return (
            query.order_by(Attendance.date.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def create(self, db: Session, data: AttendanceCreate) -> Attendance:
        att_data = data.model_dump()
        attendance = Attendance(**att_data)
        db.add(attendance)
        db.commit()
        db.refresh(attendance)
        return attendance

    def update(
        self,
        db: Session,
        attendance: Attendance,
        data: AttendanceUpdate,
    ) -> Attendance:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(attendance, field, value)

        db.commit()
        db.refresh(attendance)
        return attendance

    def delete(self, db: Session, attendance: Attendance) -> None:
        db.delete(attendance)
        db.commit()
