import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.hr_payroll.attendance.schemas import (
    AttendanceCreate,
    AttendanceOut,
    AttendanceUpdate,
)
from app.modules.hr_payroll.attendance.service import AttendanceService

router = APIRouter(tags=["Attendance Management"])
attendance_service = AttendanceService()


@router.get("/attendance", response_model=list[AttendanceOut])
def get_attendance_records(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    employee_id: uuid.UUID | None = Query(None),
    att_date: date | None = Query(None, alias="date"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    return attendance_service.get_records(
        db,
        skip=skip,
        limit=limit,
        business_id=business_id,
        employee_id=employee_id,
        att_date=att_date,
        start_date=start_date,
        end_date=end_date,
        status_filter=status_filter,
    )


@router.get("/attendance/{attendance_id}", response_model=AttendanceOut)
def get_attendance_record(
    attendance_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    return attendance_service.get_record(db, attendance_id)


@router.post(
    "/attendance",
    response_model=AttendanceOut,
    status_code=status.HTTP_201_CREATED,
)
def create_attendance_record(
    attendance_data: AttendanceCreate,
    db: Session = Depends(get_db),
):
    return attendance_service.create_record(db, attendance_data)


@router.put("/attendance/{attendance_id}", response_model=AttendanceOut)
def update_attendance_record(
    attendance_id: uuid.UUID,
    attendance_data: AttendanceUpdate,
    db: Session = Depends(get_db),
):
    return attendance_service.update_record(db, attendance_id, attendance_data)


@router.delete(
    "/attendance/{attendance_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_attendance_record(
    attendance_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    attendance_service.delete_record(db, attendance_id)
    return None
