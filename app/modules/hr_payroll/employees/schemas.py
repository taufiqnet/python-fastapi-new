import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.hr_payroll.employees.models import (
    EmploymentTypeEnum,
    GenderEnum,
    MaritalStatusEnum,
    WorkArrangementEnum,
)


class EmployeeBase(BaseModel):
    # Basic Information
    first_name: str = Field(..., max_length=255)
    middle_name: str | None = Field(None, max_length=255)
    last_name: str | None = Field(None, max_length=255)
    employee_id: str = Field(..., max_length=50)
    date_of_birth: date | None = None
    gender: GenderEnum | None = None
    marital_status: MaritalStatusEnum | None = None
    nationality: str | None = Field(None, max_length=100)
    national_id: str | None = Field(None, max_length=50)
    passport_no: str | None = Field(None, max_length=50)

    # Contact Information
    work_email: str = Field(..., max_length=255)
    personal_email: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=20)
    emergency_contact: str | None = None
    linkedin: str | None = Field(None, max_length=500)
    residential_address: str | None = None

    # Job Information
    job_title_id: uuid.UUID | None = None
    department_id: uuid.UUID | None = None
    team: str | None = Field(None, max_length=255)
    direct_manager_id: uuid.UUID | None = None

    # Employment Details
    employment_type: EmploymentTypeEnum | None = None
    start_date: date | None = None
    contract_end_date: date | None = None
    probation_end_date: date | None = None
    work_arrangement: WorkArrangementEnum | None = None
    working_hours: str | None = Field(None, max_length=100)
    working_days_per_week: int | None = None
    working_days: str | None = Field(None, max_length=255)

    # Skills & Department Head
    skills_expertise: str | None = None
    is_department_head: bool = False
    is_active: bool = True

    business_id: int


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    first_name: str | None = Field(None, max_length=255)
    middle_name: str | None = Field(None, max_length=255)
    last_name: str | None = Field(None, max_length=255)
    employee_id: str | None = Field(None, max_length=50)
    date_of_birth: date | None = None
    gender: GenderEnum | None = None
    marital_status: MaritalStatusEnum | None = None
    nationality: str | None = Field(None, max_length=100)
    national_id: str | None = Field(None, max_length=50)
    passport_no: str | None = Field(None, max_length=50)

    work_email: str | None = Field(None, max_length=255)
    personal_email: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=20)
    emergency_contact: str | None = None
    linkedin: str | None = Field(None, max_length=500)
    residential_address: str | None = None

    job_title_id: uuid.UUID | None = None
    department_id: uuid.UUID | None = None
    team: str | None = Field(None, max_length=255)
    direct_manager_id: uuid.UUID | None = None

    employment_type: EmploymentTypeEnum | None = None
    start_date: date | None = None
    contract_end_date: date | None = None
    probation_end_date: date | None = None
    work_arrangement: WorkArrangementEnum | None = None
    working_hours: str | None = Field(None, max_length=100)
    working_days_per_week: int | None = None
    working_days: str | None = Field(None, max_length=255)

    skills_expertise: str | None = None
    is_department_head: bool | None = None
    is_active: bool | None = None

    business_id: int | None = None


class EmployeeOut(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    created_at: datetime
    updated_at: datetime
