import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.hr_payroll.employees.service import EmployeeService
from app.modules.hr_payroll.leave.models import GenderApplicabilityEnum
from app.modules.hr_payroll.leave.service import (
    LeaveAllocationService,
    LeaveApplicationService,
    LeaveTypeService,
)

router = APIRouter(prefix="", tags=["Leave Views"])
templates = Jinja2Templates(directory="app/templates")

leave_type_service = LeaveTypeService()
leave_allocation_service = LeaveAllocationService()
leave_application_service = LeaveApplicationService()
employee_service = EmployeeService()
business_service = BusinessService()


# --- Leave Type Views ---
@router.get("/leave/types/manage", response_class=HTMLResponse)
def leave_type_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    db: Session = Depends(get_db),
):
    leave_types = leave_type_service.get_leave_types(
        db, skip=skip, limit=limit, business_id=business_id
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    biz_map = {b.id: b.name_en for b in businesses}

    total_count = len(leave_types)
    active_count = sum(1 for lt in leave_types if getattr(lt, "is_active", True))
    inactive_count = total_count - active_count
    paid_count = sum(1 for lt in leave_types if getattr(lt, "is_paid", True))

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/leave/leave_type_list.html",
        context={
            "leave_types": leave_types,
            "businesses": businesses,
            "biz_map": biz_map,
            "total_count": total_count,
            "active_count": active_count,
            "inactive_count": inactive_count,
            "paid_count": paid_count,
            "active_page": "leave_types",
        },
    )


@router.get("/leave/types/create", response_class=HTMLResponse)
def leave_type_create_page(request: Request, db: Session = Depends(get_db)):
    businesses = business_service.list_businesses(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/leave/leave_type_form.html",
        context={
            "leave_type": None,
            "is_edit": False,
            "businesses": businesses,
            "gender_options": GenderApplicabilityEnum,
            "active_page": "leave_types",
        },
    )


@router.get("/leave/types/edit/{leave_type_id}", response_class=HTMLResponse)
def leave_type_edit_page(
    leave_type_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    leave_type = leave_type_service.get_leave_type(db, leave_type_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/leave/leave_type_form.html",
        context={
            "leave_type": leave_type,
            "is_edit": True,
            "businesses": businesses,
            "gender_options": GenderApplicabilityEnum,
            "active_page": "leave_types",
        },
    )


# --- Leave Allocation Views ---
@router.get("/leave/allocations/manage", response_class=HTMLResponse)
def leave_allocation_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    employee_id: uuid.UUID | None = None,
    year: int | None = None,
    db: Session = Depends(get_db),
):
    allocations = leave_allocation_service.get_allocations(
        db,
        skip=skip,
        limit=limit,
        business_id=business_id,
        employee_id=employee_id,
        year=year,
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    leave_types = leave_type_service.get_leave_types(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    biz_map = {b.id: b.name_en for b in businesses}
    lt_map = {lt.id: lt.name for lt in leave_types}
    emp_map = {e.id: e.full_name for e in employees}

    total_count = len(allocations)
    total_allocated_days = sum(float(a.allocated_days) for a in allocations)
    total_used_days = sum(float(a.used_days) for a in allocations)
    total_remaining_days = sum(a.remaining_days for a in allocations)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/leave/leave_allocation_list.html",
        context={
            "allocations": allocations,
            "businesses": businesses,
            "leave_types": leave_types,
            "employees": employees,
            "biz_map": biz_map,
            "lt_map": lt_map,
            "emp_map": emp_map,
            "total_count": total_count,
            "total_allocated_days": total_allocated_days,
            "total_used_days": total_used_days,
            "total_remaining_days": total_remaining_days,
            "active_page": "leave_allocations",
        },
    )


@router.get("/leave/allocations/create", response_class=HTMLResponse)
def leave_allocation_create_page(request: Request, db: Session = Depends(get_db)):
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    leave_types = leave_type_service.get_leave_types(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/leave/leave_allocation_form.html",
        context={
            "allocation": None,
            "is_edit": False,
            "businesses": businesses,
            "leave_types": leave_types,
            "employees": employees,
            "active_page": "leave_allocations",
        },
    )


@router.get("/leave/allocations/edit/{allocation_id}", response_class=HTMLResponse)
def leave_allocation_edit_page(
    allocation_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    allocation = leave_allocation_service.get_allocation(db, allocation_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    leave_types = leave_type_service.get_leave_types(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/leave/leave_allocation_form.html",
        context={
            "allocation": allocation,
            "is_edit": True,
            "businesses": businesses,
            "leave_types": leave_types,
            "employees": employees,
            "active_page": "leave_allocations",
        },
    )


# --- Leave Application Views ---
@router.get("/leave/applications/manage", response_class=HTMLResponse)
def leave_application_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    employee_id: uuid.UUID | None = None,
    status_filter: str | None = None,
    db: Session = Depends(get_db),
):
    applications = leave_application_service.get_applications(
        db,
        skip=skip,
        limit=limit,
        business_id=business_id,
        employee_id=employee_id,
        status_filter=status_filter,
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    leave_types = leave_type_service.get_leave_types(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    biz_map = {b.id: b.name_en for b in businesses}
    lt_map = {lt.id: lt.name for lt in leave_types}
    emp_map = {e.id: e.full_name for e in employees}

    total_count = len(applications)
    pending_count = sum(
        1
        for app in applications
        if getattr(app.status, "value", app.status) == "pending"
    )
    approved_count = sum(
        1
        for app in applications
        if getattr(app.status, "value", app.status) == "approved"
    )
    rejected_count = sum(
        1
        for app in applications
        if getattr(app.status, "value", app.status) == "rejected"
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/leave/leave_application_list.html",
        context={
            "applications": applications,
            "businesses": businesses,
            "leave_types": leave_types,
            "employees": employees,
            "biz_map": biz_map,
            "lt_map": lt_map,
            "emp_map": emp_map,
            "total_count": total_count,
            "pending_count": pending_count,
            "approved_count": approved_count,
            "rejected_count": rejected_count,
            "active_page": "leave_applications",
        },
    )


@router.get("/leave/applications/create", response_class=HTMLResponse)
def leave_application_create_page(request: Request, db: Session = Depends(get_db)):
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    leave_types = leave_type_service.get_leave_types(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/leave/leave_application_form.html",
        context={
            "application": None,
            "is_edit": False,
            "businesses": businesses,
            "leave_types": leave_types,
            "employees": employees,
            "active_page": "leave_applications",
        },
    )


@router.get("/leave/applications/edit/{application_id}", response_class=HTMLResponse)
def leave_application_edit_page(
    application_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    application = leave_application_service.get_application(db, application_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    leave_types = leave_type_service.get_leave_types(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/leave/leave_application_form.html",
        context={
            "application": application,
            "is_edit": True,
            "businesses": businesses,
            "leave_types": leave_types,
            "employees": employees,
            "active_page": "leave_applications",
        },
    )


@router.get("/leave/applications/detail/{application_id}", response_class=HTMLResponse)
def leave_application_detail_page(
    application_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    application = leave_application_service.get_application(db, application_id)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/leave/leave_application_detail.html",
        context={
            "application": application,
            "employees": employees,
            "active_page": "leave_applications",
        },
    )
