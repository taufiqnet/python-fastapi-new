import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.hr_payroll.appointments.service import AppointmentLetterService
from app.modules.hr_payroll.organization.service import DepartmentService, JobTitleService

router = APIRouter(prefix="/appointment-letters", tags=["Appointment Letter Views"])
templates = Jinja2Templates(directory="app/templates")

appointment_service = AppointmentLetterService()
department_service = DepartmentService()
job_title_service = JobTitleService()
business_service = BusinessService()


@router.get("/manage", response_class=HTMLResponse)
def appointment_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    db: Session = Depends(get_db),
):
    appointments = appointment_service.get_appointments(
        db, skip=skip, limit=limit, business_id=business_id
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)

    biz_map = {b.id: b.name_en for b in businesses}

    total_count = len(appointments)
    accepted_count = sum(1 for a in appointments if a.status == "accepted")
    draft_count = sum(1 for a in appointments if a.status == "draft")
    pending_count = sum(1 for a in appointments if a.status == "sent")

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/appointments/appointment_list.html",
        context={
            "appointments": appointments,
            "businesses": businesses,
            "biz_map": biz_map,
            "total_count": total_count,
            "accepted_count": accepted_count,
            "draft_count": draft_count,
            "pending_count": pending_count,
            "active_page": "appointment_letters",
        },
    )


@router.get("/create", response_class=HTMLResponse)
def appointment_create_page(request: Request, db: Session = Depends(get_db)):
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    departments = department_service.get_departments(db, skip=0, limit=500)
    job_titles = job_title_service.get_job_titles(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/appointments/appointment_form.html",
        context={
            "appointment": None,
            "is_edit": False,
            "businesses": businesses,
            "departments": departments,
            "job_titles": job_titles,
            "active_page": "appointment_letters",
        },
    )


@router.get("/detail/{appointment_id}", response_class=HTMLResponse)
def appointment_detail_page(
    appointment_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    appointment = appointment_service.get_appointment(db, appointment_id)
    business = (
        business_service.get_business(db, appointment.business_id)
        if appointment.business_id
        else None
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/appointments/printable_letter.html",
        context={
            "appointment": appointment,
            "business": business,
            "active_page": "appointment_letters",
        },
    )


@router.get("/edit/{appointment_id}", response_class=HTMLResponse)
def appointment_edit_page(
    appointment_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    appointment = appointment_service.get_appointment(db, appointment_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    departments = department_service.get_departments(db, skip=0, limit=500)
    job_titles = job_title_service.get_job_titles(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/appointments/appointment_form.html",
        context={
            "appointment": appointment,
            "is_edit": True,
            "businesses": businesses,
            "departments": departments,
            "job_titles": job_titles,
            "active_page": "appointment_letters",
        },
    )
