import datetime
import uuid
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.hr_payroll.appointments.models import AppointmentStatusEnum
from app.modules.hr_payroll.employees.models import EmploymentTypeEnum


class AppointmentLetterBase(BaseModel):
    business_id: int
    candidate_name: str
    candidate_email: EmailStr
    candidate_phone: str | None = None
    job_title_id: uuid.UUID | None = None
    department_id: uuid.UUID | None = None
    offered_joining_date: datetime.date
    probation_period_months: int = 3
    employment_type: EmploymentTypeEnum = EmploymentTypeEnum.FULL_TIME
    offered_basic_salary: float
    offered_gross_salary: float
    allowance_details: str | None = None
    issue_date: datetime.date
    valid_until: datetime.date
    terms_and_conditions: str | None = None


class AppointmentLetterCreate(AppointmentLetterBase):
    pass


class AppointmentLetterUpdate(BaseModel):
    candidate_name: str | None = None
    candidate_email: EmailStr | None = None
    candidate_phone: str | None = None
    job_title_id: uuid.UUID | None = None
    department_id: uuid.UUID | None = None
    offered_joining_date: datetime.date | None = None
    probation_period_months: int | None = None
    employment_type: EmploymentTypeEnum | None = None
    offered_basic_salary: float | None = None
    offered_gross_salary: float | None = None
    allowance_details: str | None = None
    status: AppointmentStatusEnum | None = None
    issue_date: datetime.date | None = None
    valid_until: datetime.date | None = None
    terms_and_conditions: str | None = None


class AppointmentLetterOut(AppointmentLetterBase):
    id: uuid.UUID
    status: AppointmentStatusEnum
    employee_id: uuid.UUID | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
