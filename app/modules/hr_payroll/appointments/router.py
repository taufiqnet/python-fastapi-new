import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.database import get_db
from app.modules.hr_payroll.appointments.schemas import (
    AppointmentLetterCreate,
    AppointmentLetterOut,
    AppointmentLetterUpdate,
)
from app.modules.hr_payroll.appointments.service import AppointmentLetterService
from app.modules.hr_payroll.employees.schemas import EmployeeOut

router = APIRouter(prefix="/appointment-letters", tags=["Appointment Letters"])
service = AppointmentLetterService()


@router.get("", response_model=list[AppointmentLetterOut])
def get_appointment_letters(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "appointment_letters", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return service.get_appointments(db, skip=skip, limit=limit, business_id=resolved_business_id)


@router.get("/{appointment_id}", response_model=AppointmentLetterOut)
def get_appointment_letter(
    appointment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "appointment_letters", "view")),
):
    return service.get_appointment(db, appointment_id, current_user=current_user)


@router.post(
    "",
    response_model=AppointmentLetterOut,
    status_code=status.HTTP_201_CREATED,
)
def create_appointment_letter(
    appt_data: AppointmentLetterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "appointment_letters", "create")),
):
    resolved_business_id = resolve_business_id(current_user, appt_data.business_id)
    if not current_user.is_superuser:
        appt_data.business_id = current_user.business_id
    elif appt_data.business_id is None:
        appt_data.business_id = resolved_business_id
    return service.create_appointment(db, appt_data)


@router.put("/{appointment_id}", response_model=AppointmentLetterOut)
def update_appointment_letter(
    appointment_id: uuid.UUID,
    appt_data: AppointmentLetterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "appointment_letters", "update")),
):
    return service.update_appointment(db, appointment_id, appt_data, current_user=current_user)


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment_letter(
    appointment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "appointment_letters", "delete")),
):
    service.delete_appointment(db, appointment_id, current_user=current_user)
    return None


@router.post("/{appointment_id}/convert-to-employee", response_model=EmployeeOut)
def convert_appointment_to_employee(
    appointment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "appointment_letters", "create")),
):
    return service.convert_to_employee(db, appointment_id, current_user=current_user)
