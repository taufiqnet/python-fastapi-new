import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.hr_payroll.employees.service import EmployeeService
from app.modules.hr_payroll.organization.service import JobTitleService
from app.modules.hr_payroll.recruitment.service import RecruitmentService

router = APIRouter(prefix="/recruitment", tags=["Recruitment Views"])
templates = Jinja2Templates(directory="app/templates")

recruitment_service = RecruitmentService()
job_title_service = JobTitleService()
employee_service = EmployeeService()
business_service = BusinessService()


# --- Candidate Views ---
@router.get("/candidates/manage", response_class=HTMLResponse)
def candidate_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    db: Session = Depends(get_db),
):
    candidates = recruitment_service.get_candidates(
        db, skip=skip, limit=limit, business_id=business_id
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    biz_map = {b.id: b.name_en for b in businesses}

    total_count = len(candidates)
    applied_count = sum(1 for c in candidates if c.status == "applied")
    interviewing_count = sum(1 for c in candidates if c.status == "interview_scheduled")
    offered_count = sum(1 for c in candidates if c.status == "offered")

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/recruitment/candidate_list.html",
        context={
            "candidates": candidates,
            "businesses": businesses,
            "biz_map": biz_map,
            "total_count": total_count,
            "applied_count": applied_count,
            "interviewing_count": interviewing_count,
            "offered_count": offered_count,
            "active_page": "recruitment_candidates",
        },
    )


@router.get("/candidates/create", response_class=HTMLResponse)
def candidate_create_page(request: Request, db: Session = Depends(get_db)):
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    job_titles = job_title_service.get_job_titles(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/recruitment/candidate_form.html",
        context={
            "candidate": None,
            "is_edit": False,
            "businesses": businesses,
            "job_titles": job_titles,
            "active_page": "recruitment_candidates",
        },
    )


@router.get("/candidates/edit/{candidate_id}", response_class=HTMLResponse)
def candidate_edit_page(
    candidate_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    candidate = recruitment_service.get_candidate(db, candidate_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    job_titles = job_title_service.get_job_titles(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/recruitment/candidate_form.html",
        context={
            "candidate": candidate,
            "is_edit": True,
            "businesses": businesses,
            "job_titles": job_titles,
            "active_page": "recruitment_candidates",
        },
    )


# --- Interview Views ---
@router.get("/interviews/manage", response_class=HTMLResponse)
def interview_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    candidate_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
):
    interviews = recruitment_service.get_interviews(
        db, skip=skip, limit=limit, business_id=business_id, candidate_id=candidate_id
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    biz_map = {b.id: b.name_en for b in businesses}

    total_count = len(interviews)
    scheduled_count = sum(1 for i in interviews if i.status == "scheduled")
    completed_count = sum(1 for i in interviews if i.status == "completed")
    cancelled_count = sum(1 for i in interviews if i.status == "cancelled")

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/recruitment/interview_list.html",
        context={
            "interviews": interviews,
            "businesses": businesses,
            "biz_map": biz_map,
            "total_count": total_count,
            "scheduled_count": scheduled_count,
            "completed_count": completed_count,
            "cancelled_count": cancelled_count,
            "active_page": "recruitment_interviews",
        },
    )


@router.get("/interviews/create", response_class=HTMLResponse)
def interview_create_page(request: Request, db: Session = Depends(get_db)):
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    candidates = recruitment_service.get_candidates(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/recruitment/interview_form.html",
        context={
            "interview": None,
            "is_edit": False,
            "businesses": businesses,
            "candidates": candidates,
            "employees": employees,
            "active_page": "recruitment_interviews",
        },
    )


@router.get("/interviews/{interview_id}/evaluate", response_class=HTMLResponse)
def interview_evaluate_page(
    interview_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    interview = recruitment_service.get_interview(db, interview_id)
    employees = employee_service.get_employees(db, skip=0, limit=500)
    evaluations = recruitment_service.get_evaluations_for_interview(db, interview_id)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/recruitment/evaluation_form.html",
        context={
            "interview": interview,
            "employees": employees,
            "evaluations": evaluations,
            "active_page": "recruitment_interviews",
        },
    )
