import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.hr_payroll.certificates.service import SalaryCertificateService
from app.modules.hr_payroll.employees.service import EmployeeService

router = APIRouter(prefix="/salary-certificates", tags=["Salary Certificate Views"])
templates = Jinja2Templates(directory="app/templates")

certificate_service = SalaryCertificateService()
employee_service = EmployeeService()
business_service = BusinessService()


@router.get("/manage", response_class=HTMLResponse)
def certificate_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    employee_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    _perm = Depends(require_permission("hrm", "salary_certificates", "view")),
):
    certificates = certificate_service.get_certificates(
        db, skip=skip, limit=limit, business_id=business_id, employee_id=employee_id
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    biz_map = {b.id: b.name_en for b in businesses}
    emp_map = {e.id: e.full_name for e in employees}

    total_count = len(certificates)
    issued_count = sum(1 for c in certificates if c.status == "issued")
    draft_count = sum(1 for c in certificates if c.status == "draft")
    revoked_count = sum(1 for c in certificates if c.status == "revoked")

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/certificates/certificate_list.html",
        context={
            "certificates": certificates,
            "businesses": businesses,
            "employees": employees,
            "biz_map": biz_map,
            "emp_map": emp_map,
            "total_count": total_count,
            "issued_count": issued_count,
            "draft_count": draft_count,
            "revoked_count": revoked_count,
            "active_page": "salary_certificates",
        },
    )


@router.get("/create", response_class=HTMLResponse)
def certificate_create_page(
    request: Request,
    db: Session = Depends(get_db),
    _perm = Depends(require_permission("hrm", "salary_certificates", "create")),
):
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/certificates/certificate_form.html",
        context={
            "certificate": None,
            "is_edit": False,
            "businesses": businesses,
            "employees": employees,
            "active_page": "salary_certificates",
        },
    )


@router.get("/detail/{cert_id}", response_class=HTMLResponse)
def certificate_detail_page(
    cert_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    _perm = Depends(require_permission("hrm", "salary_certificates", "view")),
):
    certificate = certificate_service.get_certificate(db, cert_id)
    business = (
        business_service.get_business(db, certificate.business_id)
        if certificate.business_id
        else None
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/certificates/printable_certificate.html",
        context={
            "certificate": certificate,
            "business": business,
            "active_page": "salary_certificates",
        },
    )


@router.get("/edit/{cert_id}", response_class=HTMLResponse)
def certificate_edit_page(
    cert_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    _perm = Depends(require_permission("hrm", "salary_certificates", "update")),
):
    certificate = certificate_service.get_certificate(db, cert_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/certificates/certificate_form.html",
        context={
            "certificate": certificate,
            "is_edit": True,
            "businesses": businesses,
            "employees": employees,
            "active_page": "salary_certificates",
        },
    )
