import enum
import uuid

from sqlalchemy import DateTime, ForeignKey, Integer, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID, Enum as SAEnum

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


class CandidateStatusEnum(str, enum.Enum):
    APPLIED = "applied"
    SCREENING = "screening"
    INTERVIEW_SCHEDULED = "interview_scheduled"
    OFFERED = "offered"
    HIRED = "hired"
    REJECTED = "rejected"


class InterviewStageEnum(str, enum.Enum):
    INITIAL_SCREENING = "initial_screening"
    TECHNICAL = "technical"
    HR_ROUND = "hr_round"
    FINAL_ROUND = "final_round"


class InterviewStatusEnum(str, enum.Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    RESCHEDULED = "rescheduled"


class RecommendationEnum(str, enum.Enum):
    STRONG_HIRE = "strong_hire"
    HIRE = "hire"
    NEUTRAL = "neutral"
    NO_HIRE = "no_hire"


class Candidate(Base, UUIDMixin, TimestampMixin):
    """Job application candidate profile."""

    __tablename__ = "recruitment_candidates"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    resume_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    job_title_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("job_titles.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[CandidateStatusEnum] = mapped_column(
        SAEnum(CandidateStatusEnum, name="candidate_status"),
        default=CandidateStatusEnum.APPLIED,
        nullable=False,
    )

    # Relationships
    job_title: Mapped["JobTitle | None"] = relationship("JobTitle", lazy="selectin")  # noqa: F821
    interviews: Mapped[list["Interview"]] = relationship(
        "Interview", back_populates="candidate", cascade="all, delete-orphan"
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip() if self.last_name else self.first_name

    def __repr__(self) -> str:
        return f"<Candidate {self.full_name} [{self.status}]>"


class Interview(Base, UUIDMixin, TimestampMixin):
    """Interview schedule entity."""

    __tablename__ = "interviews"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recruitment_candidates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    interviewer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
    )
    stage: Mapped[InterviewStageEnum] = mapped_column(
        SAEnum(InterviewStageEnum, name="interview_stage"),
        default=InterviewStageEnum.TECHNICAL,
        nullable=False,
    )
    scheduled_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    location_link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[InterviewStatusEnum] = mapped_column(
        SAEnum(InterviewStatusEnum, name="interview_status"),
        default=InterviewStatusEnum.SCHEDULED,
        nullable=False,
    )

    # Relationships
    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="interviews", lazy="selectin")
    interviewer: Mapped["Employee"] = relationship("Employee", lazy="selectin")  # noqa: F821
    evaluations: Mapped[list["InterviewEvaluation"]] = relationship(
        "InterviewEvaluation", back_populates="interview", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Interview {self.stage} for Candidate {self.candidate_id}>"


class InterviewEvaluation(Base, UUIDMixin, TimestampMixin):
    """Interview feedback & scores submit by panel interviewers."""

    __tablename__ = "interview_evaluations"

    interview_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("interviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evaluator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
    )
    technical_score: Mapped[int] = mapped_column(SmallInteger, default=3, nullable=False)
    communication_score: Mapped[int] = mapped_column(SmallInteger, default=3, nullable=False)
    culture_fit_score: Mapped[int] = mapped_column(SmallInteger, default=3, nullable=False)
    recommendation: Mapped[RecommendationEnum] = mapped_column(
        SAEnum(RecommendationEnum, name="evaluation_recommendation"),
        nullable=False,
    )
    feedback_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    interview: Mapped["Interview"] = relationship("Interview", back_populates="evaluations", lazy="selectin")
    evaluator: Mapped["Employee"] = relationship("Employee", lazy="selectin")  # noqa: F821

    def __repr__(self) -> str:
        return f"<InterviewEvaluation {self.recommendation} by {self.evaluator_id}>"
