import datetime
import uuid
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.hr_payroll.recruitment.models import (
    CandidateStatusEnum,
    InterviewStageEnum,
    InterviewStatusEnum,
    RecommendationEnum,
)


class CandidateBase(BaseModel):
    business_id: int
    first_name: str
    last_name: str | None = None
    email: EmailStr
    phone: str | None = None
    resume_path: str | None = None
    job_title_id: uuid.UUID | None = None


class CandidateCreate(CandidateBase):
    pass


class CandidateUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    resume_path: str | None = None
    job_title_id: uuid.UUID | None = None
    status: CandidateStatusEnum | None = None


class CandidateOut(CandidateBase):
    id: uuid.UUID
    status: CandidateStatusEnum
    full_name: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class InterviewBase(BaseModel):
    business_id: int
    candidate_id: uuid.UUID
    interviewer_id: uuid.UUID
    stage: InterviewStageEnum = InterviewStageEnum.TECHNICAL
    scheduled_at: datetime.datetime
    duration_minutes: int = 60
    location_link: str | None = None


class InterviewCreate(InterviewBase):
    pass


class InterviewUpdate(BaseModel):
    interviewer_id: uuid.UUID | None = None
    stage: InterviewStageEnum | None = None
    scheduled_at: datetime.datetime | None = None
    duration_minutes: int | None = None
    location_link: str | None = None
    status: InterviewStatusEnum | None = None


class InterviewOut(InterviewBase):
    id: uuid.UUID
    status: InterviewStatusEnum
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class InterviewEvaluationBase(BaseModel):
    interview_id: uuid.UUID
    evaluator_id: uuid.UUID
    technical_score: int = Field(default=3, ge=1, le=5)
    communication_score: int = Field(default=3, ge=1, le=5)
    culture_fit_score: int = Field(default=3, ge=1, le=5)
    recommendation: RecommendationEnum
    feedback_notes: str | None = None


class InterviewEvaluationCreate(InterviewEvaluationBase):
    pass


class InterviewEvaluationOut(InterviewEvaluationBase):
    id: uuid.UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
