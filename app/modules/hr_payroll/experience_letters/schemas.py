import datetime
import uuid

from pydantic import BaseModel, ConfigDict

from app.modules.hr_payroll.experience_letters.models import ExperienceLetterStatusEnum


class ExperienceLetterBase(BaseModel):
    business_id: int
    employee_id: uuid.UUID
    issue_date: datetime.date
    joining_date: datetime.date
    relieving_date: datetime.date
    designation: str
    department: str | None = None
    addressed_to: str | None = None
    conduct_and_character: str | None = "Good"
    notes: str | None = None


class ExperienceLetterCreate(BaseModel):
    business_id: int
    employee_id: uuid.UUID
    issue_date: datetime.date
    joining_date: datetime.date | None = None
    relieving_date: datetime.date
    designation: str | None = None
    department: str | None = None
    addressed_to: str | None = None
    conduct_and_character: str | None = "Good"
    notes: str | None = None


class ExperienceLetterUpdate(BaseModel):
    issue_date: datetime.date | None = None
    joining_date: datetime.date | None = None
    relieving_date: datetime.date | None = None
    designation: str | None = None
    department: str | None = None
    addressed_to: str | None = None
    status: ExperienceLetterStatusEnum | None = None
    conduct_and_character: str | None = None
    notes: str | None = None


class ExperienceLetterOut(ExperienceLetterBase):
    id: uuid.UUID
    letter_no: str
    status: ExperienceLetterStatusEnum
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
