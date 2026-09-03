import uuid
from datetime import date, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.hr_payroll.attendance.models import Attendance, AttendanceStatusEnum
from app.modules.hr_payroll.attendance.repository import AttendanceRepository
from app.modules.hr_payroll.attendance.schemas import (
    AttendanceCreate,
    AttendanceUpdate,
)
from app.modules.hr_payroll.employees.repository import EmployeeRepository


class AttendanceService:
    def __init__(
        self,
        repository: AttendanceRepository | None = None,
        employee_repository: EmployeeRepository | None = None,
    ):
        self.repository = repository or AttendanceRepository()
        self.employee_repository = employee_repository or EmployeeRepository()

    def _compute_hours(
        self,
        data: AttendanceCreate | AttendanceUpdate,
        existing: Attendance | None = None,
    ) -> tuple[float, float]:
        check_in = (
            data.check_in
            if data.check_in is not None
            else (existing.check_in if existing else None)
        )
        check_out = (
            data.check_out
            if data.check_out is not None
            else (existing.check_out if existing else None)
        )

        if data.work_hours is not None and data.work_hours > 0.0:
            work_hours = float(data.work_hours)
        elif check_in and check_out:
            today = date.today()
            dt_in = datetime.combine(today, check_in)
            dt_out = datetime.combine(today, check_out)
            if dt_out < dt_in:
                dt_out += timedelta(days=1)
            diff = dt_out - dt_in
            work_hours = round(diff.total_seconds() / 3600.0, 2)
        else:
            work_hours = (
                float(existing.work_hours)
                if (existing and existing.work_hours is not None)
                else 0.0
            )

        if data.overtime_hours is not None:
            overtime_hours = float(data.overtime_hours)
        elif work_hours > 8.0:
            overtime_hours = round(work_hours - 8.0, 2)
        else:
            overtime_hours = 0.0

        return work_hours, overtime_hours

    def get_records(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        employee_id: uuid.UUID | None = None,
        att_date: date | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        status_filter: str | AttendanceStatusEnum | None = None,
    ) -> list[Attendance]:
        return self.repository.get_all(
            db,
            skip=skip,
            limit=limit,
            business_id=business_id,
            employee_id=employee_id,
            att_date=att_date,
            start_date=start_date,
            end_date=end_date,
            status=status_filter,
        )

    def get_record(self, db: Session, attendance_uuid: uuid.UUID) -> Attendance:
        record = self.repository.get_by_id(db, attendance_uuid)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance record not found",
            )
        return record

    def create_record(self, db: Session, data: AttendanceCreate) -> Attendance:
        employee = self.employee_repository.get_by_id(db, data.employee_id)
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with id '{data.employee_id}' not found",
            )

        existing = self.repository.get_by_emp_date(
            db,
            employee_id=data.employee_id,
            att_date=data.date,
            business_id=data.business_id,
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Attendance record already exists for employee on {data.date}",
            )

        work_hours, overtime_hours = self._compute_hours(data)
        data.work_hours = work_hours
        data.overtime_hours = overtime_hours

        return self.repository.create(db, data)

    def update_record(
        self,
        db: Session,
        attendance_uuid: uuid.UUID,
        data: AttendanceUpdate,
    ) -> Attendance:
        record = self.get_record(db, attendance_uuid)

        target_emp_id = data.employee_id or record.employee_id
        target_date = data.date or record.date
        target_biz_id = (
            data.business_id
            if data.business_id is not None
            else record.business_id
        )

        if (target_emp_id != record.employee_id) or (target_date != record.date):
            existing = self.repository.get_by_emp_date(
                db,
                employee_id=target_emp_id,
                att_date=target_date,
                business_id=target_biz_id,
            )
            if existing and existing.id != attendance_uuid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Attendance record already exists for "
                        f"employee on {target_date}"
                    ),
                )

        work_hours, overtime_hours = self._compute_hours(data, existing=record)
        data.work_hours = work_hours
        data.overtime_hours = overtime_hours

        return self.repository.update(db, record, data)

    def delete_record(self, db: Session, attendance_uuid: uuid.UUID) -> None:
        record = self.get_record(db, attendance_uuid)
        self.repository.delete(db, record)
