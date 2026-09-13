import datetime
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr

from app.modules.hr_payroll.offer_letters.models import OfferLetterStatusEnum


class OfferLetterBase(BaseModel):
    business_id: int
    candidate_name: str
    candidate_email: EmailStr
    candidate_phone: str | None = None
    job_title: str
    department: str | None = None
    offered_salary: float = 0.0
    joining_date: datetime.date
    issue_date: datetime.date
    valid_until: datetime.date | None = None
    terms: str | None = None
    notes: str | None = None


class OfferLetterCreate(OfferLetterBase):
    pass


class OfferLetterUpdate(BaseModel):
    candidate_name: str | None = None
    candidate_email: EmailStr | None = None
    candidate_phone: str | None = None
    job_title: str | None = None
    department: str | None = None
    offered_salary: float | None = None
    joining_date: datetime.date | None = None
    issue_date: datetime.date | None = None
    valid_until: datetime.date | None = None
    status: OfferLetterStatusEnum | None = None
    terms: str | None = None
    notes: str | None = None


class OfferLetterOut(OfferLetterBase):
    id: uuid.UUID
    letter_no: str
    status: OfferLetterStatusEnum
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
