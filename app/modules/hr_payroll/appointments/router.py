import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

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
):
    return service.get_appointments(db, skip=skip, limit=limit, business_id=business_id)


@router.get("/{appointment_id}", response_model=AppointmentLetterOut)
def get_appointment_letter(appointment_id: uuid.UUID, db: Session = Depends(get_db)):
    return service.get_appointment(db, appointment_id)


@router.post(
    "",
    response_model=AppointmentLetterOut,
    status_code=status.HTTP_201_CREATED,
)
def create_appointment_letter(
    appt_data: AppointmentLetterCreate, db: Session = Depends(get_db)
):
    return service.create_appointment(db, appt_data)


@router.put("/{appointment_id}", response_model=AppointmentLetterOut)
def update_appointment_letter(
    appointment_id: uuid.UUID,
    appt_data: AppointmentLetterUpdate,
    db: Session = Depends(get_db),
):
    return service.update_appointment(db, appointment_id, appt_data)


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment_letter(appointment_id: uuid.UUID, db: Session = Depends(get_db)):
    service.delete_appointment(db, appointment_id)
    return None


@router.post("/{appointment_id}/convert-to-employee", response_model=EmployeeOut)
def convert_appointment_to_employee(
    appointment_id: uuid.UUID, db: Session = Depends(get_db)
):
    return service.convert_to_employee(db, appointment_id)
