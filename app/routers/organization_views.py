import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.hr_payroll.organization.service import (
    DepartmentService,
    JobTitleService,
)

router = APIRouter(prefix="", tags=["Organization Views"])
templates = Jinja2Templates(directory="app/templates")

department_service = DepartmentService()
job_title_service = JobTitleService()
business_service = BusinessService()


# --- Department Views ---
@router.get("/departments/manage", response_class=HTMLResponse)
def department_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    db: Session = Depends(get_db),
):
    departments = department_service.get_departments(
        db, skip=skip, limit=limit, business_id=business_id
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    biz_map = {b.id: b.name_en for b in businesses}

    total_count = len(departments)
    active_count = sum(1 for d in departments if getattr(d, "is_active", True))
    inactive_count = total_count - active_count
    multi_head_count = sum(
        1 for d in departments if getattr(d, "multiple_heads_allowed", False)
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/organization/departments/department_list.html",
        context={
            "departments": departments,
            "businesses": businesses,
            "biz_map": biz_map,
            "total_count": total_count,
            "active_count": active_count,
            "inactive_count": inactive_count,
            "multi_head_count": multi_head_count,
            "active_page": "departments",
        },
    )


@router.get("/departments/create", response_class=HTMLResponse)
def department_create_page(request: Request, db: Session = Depends(get_db)):
    businesses = business_service.list_businesses(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/organization/departments/department_form.html",
        context={
            "department": None,
            "is_edit": False,
            "businesses": businesses,
            "active_page": "departments",
        },
    )


@router.get("/departments/detail/{department_id}", response_class=HTMLResponse)
def department_detail_page(
    department_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    department = department_service.get_department(db, department_id)
    business = None
    if department.business_id:
        business = business_service.get_business(db, department.business_id)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/organization/departments/department_detail.html",
        context={
            "department": department,
            "business": business,
            "active_page": "departments",
        },
    )


@router.get("/departments/edit/{department_id}", response_class=HTMLResponse)
def department_edit_page(
    department_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    department = department_service.get_department(db, department_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/organization/departments/department_form.html",
        context={
            "department": department,
            "is_edit": True,
            "businesses": businesses,
            "active_page": "departments",
        },
    )


# --- Job Title Views ---
@router.get("/job-titles/manage", response_class=HTMLResponse)
def job_title_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    department_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
):
    job_titles = job_title_service.get_job_titles(
        db,
        skip=skip,
        limit=limit,
        business_id=business_id,
        department_id=department_id,
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    departments = department_service.get_departments(db, skip=0, limit=500)

    biz_map = {b.id: b.name_en for b in businesses}
    dept_map = {d.id: d.name for d in departments}

    total_count = len(job_titles)
    active_count = sum(1 for j in job_titles if getattr(j, "is_active", True))
    inactive_count = total_count - active_count
    assigned_dept_count = sum(
        1 for j in job_titles if getattr(j, "department_id", None) is not None
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/organization/job_titles/job_title_list.html",
        context={
            "job_titles": job_titles,
            "businesses": businesses,
            "departments": departments,
            "biz_map": biz_map,
            "dept_map": dept_map,
            "total_count": total_count,
            "active_count": active_count,
            "inactive_count": inactive_count,
            "assigned_dept_count": assigned_dept_count,
            "active_page": "job_titles",
        },
    )


@router.get("/job-titles/create", response_class=HTMLResponse)
def job_title_create_page(request: Request, db: Session = Depends(get_db)):
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    departments = department_service.get_departments(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/organization/job_titles/job_title_form.html",
        context={
            "job_title": None,
            "is_edit": False,
            "businesses": businesses,
            "departments": departments,
            "active_page": "job_titles",
        },
    )


@router.get("/job-titles/detail/{job_title_id}", response_class=HTMLResponse)
def job_title_detail_page(
    job_title_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    job_title = job_title_service.get_job_title(db, job_title_id)
    business = None
    if job_title.business_id:
        business = business_service.get_business(db, job_title.business_id)

    department = None
    if job_title.department_id:
        department = department_service.get_department(db, job_title.department_id)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/organization/job_titles/job_title_detail.html",
        context={
            "job_title": job_title,
            "business": business,
            "department": department,
            "active_page": "job_titles",
        },
    )


@router.get("/job-titles/edit/{job_title_id}", response_class=HTMLResponse)
def job_title_edit_page(
    job_title_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    job_title = job_title_service.get_job_title(db, job_title_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    departments = department_service.get_departments(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/organization/job_titles/job_title_form.html",
        context={
            "job_title": job_title,
            "is_edit": True,
            "businesses": businesses,
            "departments": departments,
            "active_page": "job_titles",
        },
    )
