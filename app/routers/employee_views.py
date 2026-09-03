import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.hr_payroll.employees.models import (
    EmploymentTypeEnum,
    GenderEnum,
    MaritalStatusEnum,
    WorkArrangementEnum,
)
from app.modules.hr_payroll.employees.service import EmployeeService
from app.modules.hr_payroll.organization.service import (
    DepartmentService,
    JobTitleService,
)

router = APIRouter(prefix="", tags=["Employee Views"])
templates = Jinja2Templates(directory="app/templates")

employee_service = EmployeeService()
department_service = DepartmentService()
job_title_service = JobTitleService()
business_service = BusinessService()


@router.get("/employees/manage", response_class=HTMLResponse)
def employee_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    department_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
):
    employees = employee_service.get_employees(
        db,
        skip=skip,
        limit=limit,
        business_id=business_id,
        department_id=department_id,
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    departments = department_service.get_departments(db, skip=0, limit=500)
    job_titles = job_title_service.get_job_titles(db, skip=0, limit=500)

    biz_map = {b.id: b.name_en for b in businesses}
    dept_map = {d.id: d.name for d in departments}
    jt_map = {j.id: j.name for j in job_titles}

    total_count = len(employees)
    active_count = sum(1 for e in employees if getattr(e, "is_active", True))
    inactive_count = total_count - active_count
    dept_head_count = sum(
        1 for e in employees if getattr(e, "is_department_head", False)
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/employees/employee_list.html",
        context={
            "employees": employees,
            "businesses": businesses,
            "departments": departments,
            "job_titles": job_titles,
            "biz_map": biz_map,
            "dept_map": dept_map,
            "jt_map": jt_map,
            "total_count": total_count,
            "active_count": active_count,
            "inactive_count": inactive_count,
            "dept_head_count": dept_head_count,
            "active_page": "employees",
        },
    )


@router.get("/employees/create2", response_class=HTMLResponse)
def employee_create2_page(request: Request, db: Session = Depends(get_db)):
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    departments = department_service.get_departments(db, skip=0, limit=500)
    job_titles = job_title_service.get_job_titles(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/employees/employee_form2.html",
        context={
            "employee": None,
            "is_edit": False,
            "businesses": businesses,
            "departments": departments,
            "job_titles": job_titles,
            "all_employees": employees,
            "gender_options": [e.value for e in GenderEnum],
            "marital_status_options": [e.value for e in MaritalStatusEnum],
            "work_arrangement_options": [e.value for e in WorkArrangementEnum],
            "employment_type_options": [e.value for e in EmploymentTypeEnum],
            "active_page": "employees2",
        },
    )


@router.get("/employees/create", response_class=HTMLResponse)
def employee_create_page(request: Request, db: Session = Depends(get_db)):
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    departments = department_service.get_departments(db, skip=0, limit=500)
    job_titles = job_title_service.get_job_titles(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/employees/employee_form2.html",
        context={
            "employee": None,
            "is_edit": False,
            "businesses": businesses,
            "departments": departments,
            "job_titles": job_titles,
            "all_employees": employees,
            "gender_options": [e.value for e in GenderEnum],
            "marital_status_options": [e.value for e in MaritalStatusEnum],
            "work_arrangement_options": [e.value for e in WorkArrangementEnum],
            "employment_type_options": [e.value for e in EmploymentTypeEnum],
            "active_page": "employees",
        },
    )


@router.get("/employees/detail/{employee_id}", response_class=HTMLResponse)
def employee_detail_page(
    employee_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    employee = employee_service.get_employee(db, employee_id)
    business = None
    if employee.business_id:
        try:
            business = business_service.get_business(db, employee.business_id)
        except Exception:
            business = None

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/employees/employee_detail.html",
        context={
            "employee": employee,
            "business": business,
            "active_page": "employees",
        },
    )


@router.get("/employees/edit/{employee_id}", response_class=HTMLResponse)
def employee_edit_page(
    employee_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    employee = employee_service.get_employee(db, employee_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    departments = department_service.get_departments(db, skip=0, limit=500)
    job_titles = job_title_service.get_job_titles(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    # Exclude current employee from manager choices to avoid self-selection
    other_employees = [e for e in employees if e.id != employee_id]

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/employees/employee_form2.html",
        context={
            "employee": employee,
            "is_edit": True,
            "businesses": businesses,
            "departments": departments,
            "job_titles": job_titles,
            "all_employees": other_employees,
            "gender_options": [e.value for e in GenderEnum],
            "marital_status_options": [e.value for e in MaritalStatusEnum],
            "work_arrangement_options": [e.value for e in WorkArrangementEnum],
            "employment_type_options": [e.value for e in EmploymentTypeEnum],
            "active_page": "employees",
        },
    )
