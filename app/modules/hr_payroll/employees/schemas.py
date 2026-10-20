import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.hr_payroll.employees.models import (
    EmploymentTypeEnum,
    GenderEnum,
    MaritalStatusEnum,
    WorkArrangementEnum,
)


class EmployeeNomineeBase(BaseModel):
    nominee_name: str = Field(..., max_length=255)
    nominee_name_bangla: str | None = Field(None, max_length=255)
    relation: str = Field(..., max_length=100)
    nid_or_birth_cert: str | None = Field(None, max_length=50)
    dob: date | None = None
    share_percentage: float = Field(100.0, ge=0.0, le=100.0)
    phone: str | None = Field(None, max_length=20)
    address: str | None = None
    photo_url: str | None = Field(None, max_length=500)
    is_minor: bool = False
    guardian_name: str | None = Field(None, max_length=255)
    guardian_relation: str | None = Field(None, max_length=100)
    guardian_nid: str | None = Field(None, max_length=50)
    guardian_phone: str | None = Field(None, max_length=20)
    guardian_address: str | None = None


class EmployeeNomineeCreate(EmployeeNomineeBase):
    pass


class EmployeeNomineeUpdate(BaseModel):
    nominee_name: str | None = Field(None, max_length=255)
    nominee_name_bangla: str | None = Field(None, max_length=255)
    relation: str | None = Field(None, max_length=100)
    nid_or_birth_cert: str | None = Field(None, max_length=50)
    dob: date | None = None
    share_percentage: float | None = Field(None, ge=0.0, le=100.0)
    phone: str | None = Field(None, max_length=20)
    address: str | None = None
    photo_url: str | None = Field(None, max_length=500)
    is_minor: bool | None = None
    guardian_name: str | None = Field(None, max_length=255)
    guardian_relation: str | None = Field(None, max_length=100)
    guardian_nid: str | None = Field(None, max_length=50)
    guardian_phone: str | None = Field(None, max_length=20)
    guardian_address: str | None = None


class EmployeeNomineeOut(EmployeeNomineeBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: uuid.UUID
    business_id: int
    created_at: datetime
    updated_at: datetime


class EmployeeBase(BaseModel):
    # Basic Information
    first_name: str = Field(..., max_length=255)
    middle_name: str | None = Field(None, max_length=255)
    last_name: str | None = Field(None, max_length=255)
    bangla_name: str | None = Field(None, max_length=255)
    employee_id: str = Field(..., max_length=50)
    date_of_birth: date | None = None
    gender: GenderEnum | None = None
    marital_status: MaritalStatusEnum | None = None
    religion: str | None = Field(None, max_length=50)
    blood_group: str | None = Field(None, max_length=10)
    nationality: str | None = Field("Bangladeshi", max_length=100)
    national_id: str | None = Field(None, max_length=50)
    passport_no: str | None = Field(None, max_length=50)
    tin: str | None = Field(None, max_length=50)
    photo_url: str | None = Field(None, max_length=500)

    # Family Information (BLA 2006)
    father_name: str | None = Field(None, max_length=255)
    mother_name: str | None = Field(None, max_length=255)
    spouse_name: str | None = Field(None, max_length=255)

    # Contact Information
    work_email: str = Field(..., max_length=255)
    personal_email: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=20)
    emergency_contact: str | None = None
    emergency_contact_name: str | None = Field(None, max_length=255)
    emergency_contact_relation: str | None = Field(None, max_length=100)
    emergency_contact_phone: str | None = Field(None, max_length=20)
    linkedin: str | None = Field(None, max_length=500)

    # Addresses (Present vs Permanent)
    residential_address: str | None = None
    present_address: str | None = None
    present_thana: str | None = Field(None, max_length=100)
    present_district: str | None = Field(None, max_length=100)
    present_division: str | None = Field(None, max_length=100)
    present_post_code: str | None = Field(None, max_length=20)

    permanent_address: str | None = None
    permanent_thana: str | None = Field(None, max_length=100)
    permanent_district: str | None = Field(None, max_length=100)
    permanent_division: str | None = Field(None, max_length=100)
    permanent_post_code: str | None = Field(None, max_length=20)

    # Salary Disbursement (Banking / MFS)
    disbursement_method: str | None = Field("bank_transfer", max_length=50)
    bank_name: str | None = Field(None, max_length=255)
    bank_branch: str | None = Field(None, max_length=255)
    bank_account_no: str | None = Field(None, max_length=50)
    bank_account_title: str | None = Field(None, max_length=255)
    bank_routing_number: str | None = Field(None, max_length=20)
    mfs_provider: str | None = Field(None, max_length=50)
    mfs_number: str | None = Field(None, max_length=20)

    # Job Information
    job_title_id: uuid.UUID | None = None
    department_id: uuid.UUID | None = None
    branch_id: uuid.UUID | None = None
    salary_grade_id: uuid.UUID | None = None
    team: str | None = Field(None, max_length=255)
    direct_manager_id: uuid.UUID | None = None

    # Employment Details & Terms
    employee_category: str | None = Field("management", max_length=50)
    employment_type: EmploymentTypeEnum | None = None
    start_date: date | None = None
    confirmation_date: date | None = None
    contract_end_date: date | None = None
    probation_period_months: int | None = 3
    probation_end_date: date | None = None
    notice_period_days: int | None = 30
    is_overtime_eligible: bool = False
    work_arrangement: WorkArrangementEnum | None = None
    working_hours: str | None = Field(None, max_length=100)
    working_days_per_week: int | None = None
    working_days: str | None = Field(None, max_length=255)

    # Access Control & Biometrics
    biometric_user_id: str | None = Field(None, max_length=50)
    rfid_card_number: str | None = Field(None, max_length=50)

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
    bangla_name: str | None = Field(None, max_length=255)
    employee_id: str | None = Field(None, max_length=50)
    date_of_birth: date | None = None
    gender: GenderEnum | None = None
    marital_status: MaritalStatusEnum | None = None
    religion: str | None = Field(None, max_length=50)
    blood_group: str | None = Field(None, max_length=10)
    nationality: str | None = Field(None, max_length=100)
    national_id: str | None = Field(None, max_length=50)
    passport_no: str | None = Field(None, max_length=50)
    tin: str | None = Field(None, max_length=50)
    photo_url: str | None = Field(None, max_length=500)

    father_name: str | None = Field(None, max_length=255)
    mother_name: str | None = Field(None, max_length=255)
    spouse_name: str | None = Field(None, max_length=255)

    work_email: str | None = Field(None, max_length=255)
    personal_email: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=20)
    emergency_contact: str | None = None
    emergency_contact_name: str | None = Field(None, max_length=255)
    emergency_contact_relation: str | None = Field(None, max_length=100)
    emergency_contact_phone: str | None = Field(None, max_length=20)
    linkedin: str | None = Field(None, max_length=500)

    residential_address: str | None = None
    present_address: str | None = None
    present_thana: str | None = Field(None, max_length=100)
    present_district: str | None = Field(None, max_length=100)
    present_division: str | None = Field(None, max_length=100)
    present_post_code: str | None = Field(None, max_length=20)

    permanent_address: str | None = None
    permanent_thana: str | None = Field(None, max_length=100)
    permanent_district: str | None = Field(None, max_length=100)
    permanent_division: str | None = Field(None, max_length=100)
    permanent_post_code: str | None = Field(None, max_length=20)

    disbursement_method: str | None = Field(None, max_length=50)
    bank_name: str | None = Field(None, max_length=255)
    bank_branch: str | None = Field(None, max_length=255)
    bank_account_no: str | None = Field(None, max_length=50)
    bank_account_title: str | None = Field(None, max_length=255)
    bank_routing_number: str | None = Field(None, max_length=20)
    mfs_provider: str | None = Field(None, max_length=50)
    mfs_number: str | None = Field(None, max_length=20)

    job_title_id: uuid.UUID | None = None
    department_id: uuid.UUID | None = None
    branch_id: uuid.UUID | None = None
    salary_grade_id: uuid.UUID | None = None
    team: str | None = Field(None, max_length=255)
    direct_manager_id: uuid.UUID | None = None

    employee_category: str | None = Field(None, max_length=50)
    employment_type: EmploymentTypeEnum | None = None
    start_date: date | None = None
    confirmation_date: date | None = None
    contract_end_date: date | None = None
    probation_period_months: int | None = None
    probation_end_date: date | None = None
    notice_period_days: int | None = None
    is_overtime_eligible: bool | None = None
    work_arrangement: WorkArrangementEnum | None = None
    working_hours: str | None = Field(None, max_length=100)
    working_days_per_week: int | None = None
    working_days: str | None = Field(None, max_length=255)

    biometric_user_id: str | None = Field(None, max_length=50)
    rfid_card_number: str | None = Field(None, max_length=50)

    skills_expertise: str | None = None
    is_department_head: bool | None = None
    is_active: bool | None = None

    business_id: int | None = None


class EmployeeOut(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    branch_name: str | None = None
    department_name: str | None = None
    job_title_name: str | None = None
    manager_name: str | None = None
    nominees: list[EmployeeNomineeOut] = []
    created_at: datetime
    updated_at: datetime


class BulkDeleteEmployeesRequest(BaseModel):
    employee_ids: list[uuid.UUID] | None = None
    business_id: int | None = None
    delete_all: bool = False


class OrgChartNodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: str
    name: str
    bangla_name: str | None = None
    job_title: str | None = None
    department: str | None = None
    branch: str | None = None
    salary_grade: str | None = None
    photo_url: str | None = None
    email: str
    phone: str | None = None
    direct_manager_id: uuid.UUID | None = None
    reports: list["OrgChartNodeOut"] = []


class IDCardDataOut(BaseModel):
    employee_id: str
    full_name: str
    bangla_name: str | None = None
    photo_url: str | None = None
    job_title: str | None = None
    department: str | None = None
    branch: str | None = None
    blood_group: str | None = None
    emergency_contact_phone: str | None = None
    joining_date: date | None = None
    biometric_user_id: str | None = None
    rfid_card_number: str | None = None
    company_name: str
    company_address: str | None = None
    company_logo_url: str | None = None
    verification_url: str

