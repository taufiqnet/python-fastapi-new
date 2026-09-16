import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.hr_payroll.employees.service import EmployeeService
from app.modules.hr_payroll.experience_letters.service import ExperienceLetterService

router = APIRouter(prefix="/experience-letters", tags=["Experience Letter Views"])
templates = Jinja2Templates(directory="app/templates")

experience_letter_service = ExperienceLetterService()
employee_service = EmployeeService()
business_service = BusinessService()


@router.get("/manage", response_class=HTMLResponse)
def experience_letter_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    employee_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "experience_letters", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    letters = experience_letter_service.get_letters(
        db, skip=skip, limit=limit, business_id=resolved_business_id, employee_id=employee_id
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    if not current_user.is_superuser:
        businesses = [b for b in businesses if b.id == resolved_business_id]
    employees = employee_service.get_employees(
        db, skip=0, limit=500, business_id=resolved_business_id
    )

    biz_map = {b.id: b.name_en for b in businesses}
    emp_map = {e.id: e.full_name for e in employees}

    total_count = len(letters)
    issued_count = sum(1 for l in letters if l.status == "issued")
    draft_count = sum(1 for l in letters if l.status == "draft")
    revoked_count = sum(1 for l in letters if l.status == "revoked")

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/experience_letters/experience_letter_list.html",
        context={
            "letters": letters,
            "businesses": businesses,
            "employees": employees,
            "biz_map": biz_map,
            "emp_map": emp_map,
            "total_count": total_count,
            "issued_count": issued_count,
            "draft_count": draft_count,
            "revoked_count": revoked_count,
            "active_page": "experience_letters",
            "current_user": current_user,
        },
    )


@router.get("/create", response_class=HTMLResponse)
def experience_letter_create_page(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "experience_letters", "create")),
):
    resolved_business_id = resolve_business_id(current_user, None)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    if not current_user.is_superuser:
        businesses = [b for b in businesses if b.id == resolved_business_id]
    employees = employee_service.get_employees(
        db, skip=0, limit=500, business_id=resolved_business_id
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/experience_letters/experience_letter_form.html",
        context={
            "letter": None,
            "is_edit": False,
            "businesses": businesses,
            "employees": employees,
            "active_page": "experience_letters",
            "current_user": current_user,
        },
    )


@router.get("/detail/{letter_id}", response_class=HTMLResponse)
def experience_letter_detail_page(
    letter_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "experience_letters", "view")),
):
    letter = experience_letter_service.get_letter(db, letter_id, current_user=current_user)
    business = (
        business_service.get_business(db, letter.business_id)
        if letter.business_id
        else None
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/experience_letters/printable_experience_letter.html",
        context={
            "letter": letter,
            "business": business,
            "active_page": "experience_letters",
            "current_user": current_user,
        },
    )


@router.get("/edit/{letter_id}", response_class=HTMLResponse)
def experience_letter_edit_page(
    letter_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "experience_letters", "update")),
):
    letter = experience_letter_service.get_letter(db, letter_id, current_user=current_user)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    if not current_user.is_superuser:
        businesses = [b for b in businesses if b.id == letter.business_id]
    employees = employee_service.get_employees(
        db, skip=0, limit=500, business_id=letter.business_id
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/experience_letters/experience_letter_form.html",
        context={
            "letter": letter,
            "is_edit": True,
            "businesses": businesses,
            "employees": employees,
            "active_page": "experience_letters",
            "current_user": current_user,
        },
    )
