import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.hr_payroll.compensation.service import EmployeeSalaryService
from app.modules.hr_payroll.employees.service import EmployeeService

router = APIRouter(prefix="", tags=["Compensation Views"])
templates = Jinja2Templates(directory="app/templates")

compensation_service = EmployeeSalaryService()
employee_service = EmployeeService()
business_service = BusinessService()


@router.get("/compensation/manage", response_class=HTMLResponse)
def compensation_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    employee_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
):
    salaries = compensation_service.get_salaries(
        db, skip=skip, limit=limit, business_id=business_id, employee_id=employee_id
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    biz_map = {b.id: b.name_en for b in businesses}
    emp_map = {e.id: e.full_name for e in employees}

    total_count = len(salaries)
    total_gross = sum(float(s.gross_salary) for s in salaries)
    total_net = sum(float(s.net_salary) for s in salaries)
    avg_net = (total_net / total_count) if total_count > 0 else 0.0

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/compensation/salary_list.html",
        context={
            "salaries": salaries,
            "businesses": businesses,
            "employees": employees,
            "biz_map": biz_map,
            "emp_map": emp_map,
            "total_count": total_count,
            "total_gross": total_gross,
            "total_net": total_net,
            "avg_net": avg_net,
            "active_page": "compensation",
        },
    )


@router.get("/compensation/create", response_class=HTMLResponse)
def compensation_create_page(request: Request, db: Session = Depends(get_db)):
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/compensation/salary_form.html",
        context={
            "salary": None,
            "is_edit": False,
            "businesses": businesses,
            "employees": employees,
            "active_page": "compensation",
        },
    )


@router.get("/compensation/edit/{salary_id}", response_class=HTMLResponse)
def compensation_edit_page(
    salary_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    salary = compensation_service.get_salary(db, salary_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/compensation/salary_form.html",
        context={
            "salary": salary,
            "is_edit": True,
            "businesses": businesses,
            "employees": employees,
            "active_page": "compensation",
        },
    )


@router.get("/compensation/detail/{salary_id}", response_class=HTMLResponse)
def compensation_detail_page(
    salary_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    salary = compensation_service.get_salary(db, salary_id)
    business = None
    if salary.business_id:
        business = business_service.get_business(db, salary.business_id)

    employee = None
    if salary.employee_id:
        employee = employee_service.get_employee(db, salary.employee_id)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/compensation/salary_detail.html",
        context={
            "salary": salary,
            "business": business,
            "employee": employee,
            "active_page": "compensation",
        },
    )
