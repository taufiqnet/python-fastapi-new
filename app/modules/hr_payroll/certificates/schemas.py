import datetime
import uuid

from pydantic import BaseModel, ConfigDict

from app.modules.hr_payroll.certificates.models import (
    CertificatePurposeEnum,
    CertificateStatusEnum,
)


class SalaryCertificateBase(BaseModel):
    business_id: int
    employee_id: uuid.UUID
    issue_date: datetime.date
    purpose: CertificatePurposeEnum = CertificatePurposeEnum.GENERAL
    addressed_to: str | None = None
    include_breakdown: bool = True
    notes: str | None = None


class SalaryCertificateCreate(SalaryCertificateBase):
    pass


class SalaryCertificateUpdate(BaseModel):
    issue_date: datetime.date | None = None
    purpose: CertificatePurposeEnum | None = None
    addressed_to: str | None = None
    include_breakdown: bool | None = None
    status: CertificateStatusEnum | None = None
    basic_salary: float | None = None
    gross_salary: float | None = None
    net_salary: float | None = None
    notes: str | None = None


class SalaryCertificateOut(SalaryCertificateBase):
    id: uuid.UUID
    certificate_no: str
    status: CertificateStatusEnum
    basic_salary: float
    gross_salary: float
    net_salary: float
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
