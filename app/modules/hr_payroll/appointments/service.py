import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.hr_payroll.appointments.models import (
    AppointmentLetter,
    AppointmentStatusEnum,
)
from app.modules.hr_payroll.appointments.repository import AppointmentLetterRepository
from app.modules.hr_payroll.appointments.schemas import (
    AppointmentLetterCreate,
    AppointmentLetterUpdate,
)
from app.modules.hr_payroll.compensation.models import EmployeeSalary
from app.modules.hr_payroll.employees.models import Employee


class AppointmentLetterService:
    def __init__(self, repo: AppointmentLetterRepository | None = None):
        self.repo = repo or AppointmentLetterRepository()

    def get_appointments(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
    ) -> list[AppointmentLetter]:
        return self.repo.get_all(db, skip=skip, limit=limit, business_id=business_id)

    def get_appointment(
        self, db: Session, appointment_id: uuid.UUID
    ) -> AppointmentLetter:
        appt = self.repo.get_by_id(db, appointment_id)
        if not appt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Appointment letter with ID '{appointment_id}' not found.",
            )
        return appt

    def create_appointment(
        self, db: Session, appt_in: AppointmentLetterCreate
    ) -> AppointmentLetter:
        appt = AppointmentLetter(
            business_id=appt_in.business_id,
            candidate_name=appt_in.candidate_name,
            candidate_email=appt_in.candidate_email,
            candidate_phone=appt_in.candidate_phone,
            job_title_id=appt_in.job_title_id,
            department_id=appt_in.department_id,
            offered_joining_date=appt_in.offered_joining_date,
            probation_period_months=appt_in.probation_period_months,
            employment_type=appt_in.employment_type,
            offered_basic_salary=appt_in.offered_basic_salary,
            offered_gross_salary=appt_in.offered_gross_salary,
            allowance_details=appt_in.allowance_details,
            status=AppointmentStatusEnum.DRAFT,
            issue_date=appt_in.issue_date,
            valid_until=appt_in.valid_until,
            terms_and_conditions=appt_in.terms_and_conditions,
        )
        return self.repo.create(db, appt)

    def update_appointment(
        self, db: Session, appointment_id: uuid.UUID, appt_in: AppointmentLetterUpdate
    ) -> AppointmentLetter:
        appt = self.get_appointment(db, appointment_id)
        update_data = appt_in.model_dump(exclude_unset=True)
        return self.repo.update(db, appt, update_data)

    def delete_appointment(self, db: Session, appointment_id: uuid.UUID) -> None:
        appt = self.get_appointment(db, appointment_id)
        self.repo.delete(db, appt)

    def convert_to_employee(self, db: Session, appointment_id: uuid.UUID) -> Employee:
        appt = self.get_appointment(db, appointment_id)
        if appt.employee_id:
            emp = db.get(Employee, appt.employee_id)
            if emp:
                return emp

        name_parts = appt.candidate_name.strip().split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else None

        # Generate unique employee_id
        emp_code = f"EMP-{uuid.uuid4().hex[:6].upper()}"

        emp = Employee(
            business_id=appt.business_id,
            first_name=first_name,
            last_name=last_name,
            employee_id=emp_code,
            work_email=appt.candidate_email,
            phone=appt.candidate_phone,
            job_title_id=appt.job_title_id,
            department_id=appt.department_id,
            employment_type=appt.employment_type,
            start_date=appt.offered_joining_date,
            is_active=True,
        )
        db.add(emp)
        db.flush()

        # Create base compensation profile
        salary = EmployeeSalary(
            business_id=appt.business_id,
            employee_id=emp.id,
            basic_salary=appt.offered_basic_salary,
            gross_salary=appt.offered_gross_salary,
            net_salary=appt.offered_gross_salary,
            effective_from=appt.offered_joining_date,
        )
        db.add(salary)

        # Update appointment letter status
        appt.status = AppointmentStatusEnum.ACCEPTED
        appt.employee_id = emp.id
        db.commit()
        db.refresh(emp)
        return emp
