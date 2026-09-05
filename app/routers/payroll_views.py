import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.hr_payroll.employees.service import EmployeeService
from app.modules.hr_payroll.payroll.models import (
    HolidayTypeEnum,
    PaymentMethodEnum,
    PayrollPeriodStatusEnum,
)
from app.modules.hr_payroll.payroll.service import (
    HolidayService,
    PayrollPeriodService,
    PayrollRecordService,
    PayrollSettingsService,
)

router = APIRouter(prefix="", tags=["Payroll Views"])
templates = Jinja2Templates(directory="app/templates")

holiday_service = HolidayService()
period_service = PayrollPeriodService()
record_service = PayrollRecordService()
settings_service = PayrollSettingsService()
employee_service = EmployeeService()
business_service = BusinessService()


# ── Holiday Views ──────────────────────────────────────────────────────
@router.get("/holidays/manage", response_class=HTMLResponse)
def holiday_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    holiday_type: str | None = None,
    db: Session = Depends(get_db),
):
    holidays = holiday_service.get_holidays(
        db, skip=skip, limit=limit, business_id=business_id, holiday_type=holiday_type
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    biz_map = {b.id: b.name_en for b in businesses}

    total_count = len(holidays)
    paid_count = sum(1 for h in holidays if getattr(h, "is_paid", True))
    unpaid_count = total_count - paid_count

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/payroll/holidays/holiday_list.html",
        context={
            "holidays": holidays,
            "businesses": businesses,
            "biz_map": biz_map,
            "total_count": total_count,
            "paid_count": paid_count,
            "unpaid_count": unpaid_count,
            "holiday_types": HolidayTypeEnum,
            "active_page": "holidays",
        },
    )


@router.get("/holidays/create", response_class=HTMLResponse)
def holiday_create_page(request: Request, db: Session = Depends(get_db)):
    businesses = business_service.list_businesses(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/payroll/holidays/holiday_form.html",
        context={
            "holiday": None,
            "is_edit": False,
            "businesses": businesses,
            "holiday_types": HolidayTypeEnum,
            "active_page": "holidays",
        },
    )


@router.get("/holidays/edit/{holiday_id}", response_class=HTMLResponse)
def holiday_edit_page(
    holiday_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    holiday = holiday_service.get_holiday(db, holiday_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/payroll/holidays/holiday_form.html",
        context={
            "holiday": holiday,
            "is_edit": True,
            "businesses": businesses,
            "holiday_types": HolidayTypeEnum,
            "active_page": "holidays",
        },
    )


# ── Payroll Period Views ───────────────────────────────────────────────
@router.get("/payroll-periods/manage", response_class=HTMLResponse)
def period_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    status_filter: str | None = None,
    db: Session = Depends(get_db),
):
    periods = period_service.get_periods(
        db, skip=skip, limit=limit, business_id=business_id, status_filter=status_filter
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    biz_map = {b.id: b.name_en for b in businesses}

    total_count = len(periods)
    draft_count = sum(
        1 for p in periods if getattr(p.status, "value", p.status) == "draft"
    )
    processing_count = sum(
        1 for p in periods if getattr(p.status, "value", p.status) == "processing"
    )
    locked_count = sum(
        1 for p in periods if getattr(p.status, "value", p.status) == "locked"
    )
    paid_count = sum(
        1 for p in periods if getattr(p.status, "value", p.status) == "paid"
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/payroll/periods/period_list.html",
        context={
            "periods": periods,
            "businesses": businesses,
            "biz_map": biz_map,
            "total_count": total_count,
            "draft_count": draft_count,
            "processing_count": processing_count,
            "locked_count": locked_count,
            "paid_count": paid_count,
            "status_options": PayrollPeriodStatusEnum,
            "active_page": "payroll_periods",
        },
    )


@router.get("/payroll-periods/create", response_class=HTMLResponse)
def period_create_page(request: Request, db: Session = Depends(get_db)):
    businesses = business_service.list_businesses(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/payroll/periods/period_form.html",
        context={
            "period": None,
            "is_edit": False,
            "businesses": businesses,
            "status_options": PayrollPeriodStatusEnum,
            "active_page": "payroll_periods",
        },
    )


@router.get("/payroll-periods/edit/{period_id}", response_class=HTMLResponse)
def period_edit_page(
    period_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    period = period_service.get_period(db, period_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/payroll/periods/period_form.html",
        context={
            "period": period,
            "is_edit": True,
            "businesses": businesses,
            "status_options": PayrollPeriodStatusEnum,
            "active_page": "payroll_periods",
        },
    )


# ── Payroll Record (Payslip) Views ──────────────────────────────────────
@router.get("/payroll-records/manage", response_class=HTMLResponse)
def record_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    period_id: uuid.UUID | None = None,
    employee_id: uuid.UUID | None = None,
    is_paid: bool | None = None,
    db: Session = Depends(get_db),
):
    records = record_service.get_records(
        db,
        skip=skip,
        limit=limit,
        business_id=business_id,
        period_id=period_id,
        employee_id=employee_id,
        is_paid=is_paid,
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    periods = period_service.get_periods(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    biz_map = {b.id: b.name_en for b in businesses}
    period_map = {p.id: p.name for p in periods}
    emp_map = {e.id: e.full_name for e in employees}

    total_count = len(records)
    total_gross = sum(float(r.gross_salary) for r in records)
    total_deduction = sum(float(r.total_deduction) for r in records)
    total_net = sum(float(r.net_salary) for r in records)
    paid_count = sum(1 for r in records if r.is_paid)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/payroll/records/record_list.html",
        context={
            "records": records,
            "businesses": businesses,
            "periods": periods,
            "employees": employees,
            "biz_map": biz_map,
            "period_map": period_map,
            "emp_map": emp_map,
            "total_count": total_count,
            "total_gross": total_gross,
            "total_deduction": total_deduction,
            "total_net": total_net,
            "paid_count": paid_count,
            "active_page": "payroll_records",
        },
    )


# ── Payroll Settings Views ─────────────────────────────────────────────
@router.get("/payroll-settings/manage", response_class=HTMLResponse)
def settings_manage_page(
    request: Request,
    business_id: int | None = None,
    db: Session = Depends(get_db),
):
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    selected_business_id = business_id or (businesses[0].id if businesses else 1)
    
    settings_obj = settings_service.get_settings(db, business_id=selected_business_id)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/payroll/settings/payroll_settings.html",
        context={
            "settings": settings_obj,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "active_page": "payroll_settings",
        },
    )


@router.get("/payroll-records/create", response_class=HTMLResponse)
def record_create_page(request: Request, db: Session = Depends(get_db)):
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    periods = period_service.get_periods(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/payroll/records/record_form.html",
        context={
            "record": None,
            "is_edit": False,
            "businesses": businesses,
            "periods": periods,
            "employees": employees,
            "payment_methods": PaymentMethodEnum,
            "active_page": "payroll_records",
        },
    )


@router.get("/payroll-records/edit/{record_id}", response_class=HTMLResponse)
def record_edit_page(
    record_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    record = record_service.get_record(db, record_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    periods = period_service.get_periods(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/payroll/records/record_form.html",
        context={
            "record": record,
            "is_edit": True,
            "businesses": businesses,
            "periods": periods,
            "employees": employees,
            "payment_methods": PaymentMethodEnum,
            "active_page": "payroll_records",
        },
    )


@router.get("/payroll-records/detail/{record_id}", response_class=HTMLResponse)
def record_detail_page(
    record_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    record = record_service.get_record(db, record_id)
    business = None
    if record.business_id:
        business = business_service.get_business(db, record.business_id)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/payroll/records/record_detail.html",
        context={
            "record": record,
            "business": business,
            "active_page": "payroll_records",
        },
    )
