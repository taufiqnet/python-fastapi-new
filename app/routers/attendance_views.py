import calendar
import uuid
from datetime import date, datetime

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.hr_payroll.attendance.models import (
    AttendanceSourceEnum,
    AttendanceStatusEnum,
)
from app.modules.hr_payroll.attendance.service import AttendanceService
from app.modules.hr_payroll.employees.service import EmployeeService

router = APIRouter(prefix="", tags=["Attendance Views"])
templates = Jinja2Templates(directory="app/templates")

attendance_service = AttendanceService()
employee_service = EmployeeService()
business_service = BusinessService()


@router.get("/attendance/manage", response_class=HTMLResponse)
def attendance_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: str | None = Query(None),
    employee_id: str | None = Query(None),
    att_date: str | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status_filter"),
    db: Session = Depends(get_db),
):
    parsed_biz_id: int | None = None
    if business_id and business_id.strip():
        try:
            parsed_biz_id = int(business_id.strip())
        except ValueError:
            parsed_biz_id = None

    parsed_emp_id: uuid.UUID | None = None
    if employee_id and employee_id.strip():
        try:
            parsed_emp_id = uuid.UUID(employee_id.strip())
        except ValueError:
            parsed_emp_id = None

    parsed_att_date: date | None = None
    if att_date and att_date.strip():
        try:
            parsed_att_date = datetime.strptime(att_date.strip(), "%Y-%m-%d").date()
        except ValueError:
            parsed_att_date = None

    parsed_start_date: date | None = None
    if start_date and start_date.strip():
        try:
            parsed_start_date = datetime.strptime(start_date.strip(), "%Y-%m-%d").date()
        except ValueError:
            parsed_start_date = None

    parsed_end_date: date | None = None
    if end_date and end_date.strip():
        try:
            parsed_end_date = datetime.strptime(end_date.strip(), "%Y-%m-%d").date()
        except ValueError:
            parsed_end_date = None

    clean_status = status_filter.strip() if status_filter and status_filter.strip() else None

    records = attendance_service.get_records(
        db,
        skip=skip,
        limit=limit,
        business_id=parsed_biz_id,
        employee_id=parsed_emp_id,
        att_date=parsed_att_date,
        start_date=parsed_start_date,
        end_date=parsed_end_date,
        status_filter=clean_status,
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    biz_map = {b.id: b.name_en for b in businesses}
    emp_map = {e.id: e for e in employees}

    total_count = len(records)
    present_count = sum(
        1
        for r in records
        if getattr(r.status, "value", r.status) == "present"
    )
    absent_count = sum(
        1
        for r in records
        if getattr(r.status, "value", r.status) == "absent"
    )
    leave_count = sum(
        1
        for r in records
        if getattr(r.status, "value", r.status) == "on_leave"
    )
    late_count = sum(
        1
        for r in records
        if getattr(r.status, "value", r.status) == "late"
    )
    half_day_count = sum(
        1
        for r in records
        if getattr(r.status, "value", r.status) == "half_day"
    )
    total_work_hours = sum(float(r.work_hours or 0) for r in records)
    total_overtime_hours = sum(float(r.overtime_hours or 0) for r in records)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/attendance/attendance_list.html",
        context={
            "records": records,
            "businesses": businesses,
            "employees": employees,
            "biz_map": biz_map,
            "emp_map": emp_map,
            "total_count": total_count,
            "present_count": present_count,
            "absent_count": absent_count,
            "leave_count": leave_count,
            "late_count": late_count,
            "half_day_count": half_day_count,
            "total_work_hours": round(total_work_hours, 2),
            "total_overtime_hours": round(total_overtime_hours, 2),
            "start_date": parsed_start_date.strftime("%Y-%m-%d") if parsed_start_date else "",
            "end_date": parsed_end_date.strftime("%Y-%m-%d") if parsed_end_date else "",
            "active_page": "attendance",
        },
    )


@router.get("/attendance/create", response_class=HTMLResponse)
def attendance_create_page(request: Request, db: Session = Depends(get_db)):
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/attendance/attendance_form.html",
        context={
            "record": None,
            "is_edit": False,
            "businesses": businesses,
            "employees": employees,
            "status_options": AttendanceStatusEnum,
            "source_options": AttendanceSourceEnum,
            "active_page": "attendance",
        },
    )


@router.get("/attendance/edit/{attendance_id}", response_class=HTMLResponse)
def attendance_edit_page(
    attendance_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    record = attendance_service.get_record(db, attendance_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/attendance/attendance_form.html",
        context={
            "record": record,
            "is_edit": True,
            "businesses": businesses,
            "employees": employees,
            "status_options": AttendanceStatusEnum,
            "source_options": AttendanceSourceEnum,
            "active_page": "attendance",
        },
    )


@router.get("/attendance/detail/{attendance_id}", response_class=HTMLResponse)
def attendance_detail_page(
    attendance_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    record = attendance_service.get_record(db, attendance_id)
    business = None
    if record.business_id:
        business = business_service.get_business(db, record.business_id)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/attendance/attendance_detail.html",
        context={
            "record": record,
            "business": business,
            "active_page": "attendance",
        },
    )
