import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.deps import get_current_user_optional, require_permission
from app.core.tenancy.scoping import resolve_business_id
from app.core.tenancy.service import BusinessService
from app.database import get_async_db, get_db
from app.modules.hr_payroll.compensation.service import EmployeeSalaryService
from app.modules.hr_payroll.employees.service import EmployeeService

router = APIRouter(prefix="", tags=["Compensation Views"])
templates = Jinja2Templates(directory="app/templates")

compensation_service = EmployeeSalaryService()
employee_service = EmployeeService()
business_service = BusinessService()


@router.get("/compensation/manage", response_class=HTMLResponse)
async def compensation_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    employee_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    async_db = Depends(get_async_db),
    _perm = Depends(require_permission("hrm", "compensation", "view")),
):
    current_user = await get_current_user_optional(request, None, async_db)
    resolved_business_id = resolve_business_id(current_user, business_id)
    salaries = compensation_service.get_salaries(
        db, skip=skip, limit=limit, business_id=resolved_business_id, employee_id=employee_id
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500, business_id=resolved_business_id)

    if current_user and not current_user.is_superuser:
        businesses = [b for b in businesses if b.id == current_user.business_id]

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
            "current_user": current_user,
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
async def compensation_create_page(
    request: Request,
    db: Session = Depends(get_db),
    async_db = Depends(get_async_db),
    _perm = Depends(require_permission("hrm", "compensation", "create")),
):
    current_user = await get_current_user_optional(request, None, async_db)
    resolved_business_id = resolve_business_id(current_user, None)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500, business_id=resolved_business_id)

    if current_user and not current_user.is_superuser:
        businesses = [b for b in businesses if b.id == current_user.business_id]

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/compensation/salary_form.html",
        context={
            "current_user": current_user,
            "salary": None,
            "is_edit": False,
            "businesses": businesses,
            "employees": employees,
            "active_page": "compensation",
        },
    )


@router.get("/compensation/edit/{salary_id}", response_class=HTMLResponse)
async def compensation_edit_page(
    salary_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    async_db = Depends(get_async_db),
    _perm = Depends(require_permission("hrm", "compensation", "update")),
):
    current_user = await get_current_user_optional(request, None, async_db)
    salary = compensation_service.get_salary(db, salary_id, current_user=current_user)
    emp_biz_id = None if (current_user and current_user.is_superuser) else current_user.business_id
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500, business_id=emp_biz_id)

    if current_user and not current_user.is_superuser:
        businesses = [b for b in businesses if b.id == current_user.business_id]

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/compensation/salary_form.html",
        context={
            "current_user": current_user,
            "salary": salary,
            "is_edit": True,
            "businesses": businesses,
            "employees": employees,
            "active_page": "compensation",
        },
    )


@router.get("/compensation/detail/{salary_id}", response_class=HTMLResponse)
async def compensation_detail_page(
    salary_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    async_db = Depends(get_async_db),
    _perm = Depends(require_permission("hrm", "compensation", "view")),
):
    current_user = await get_current_user_optional(request, None, async_db)
    salary = compensation_service.get_salary(db, salary_id, current_user=current_user)
    business = None
    if salary.business_id:
        business = business_service.get_business(db, salary.business_id)

    employee = None
    if salary.employee_id:
        employee = employee_service.get_employee(db, salary.employee_id, current_user=current_user)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/compensation/salary_detail.html",
        context={
            "current_user": current_user,
            "salary": salary,
            "business": business,
            "employee": employee,
            "active_page": "compensation",
        },
    )
