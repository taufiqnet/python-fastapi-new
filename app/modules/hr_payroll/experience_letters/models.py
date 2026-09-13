import enum
import uuid

from sqlalchemy import Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID
from sqlalchemy.types import Enum as SAEnum

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


class ExperienceLetterStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    REVOKED = "revoked"


class ExperienceLetter(Base, UUIDMixin, TimestampMixin):
    """Experience Letter model representing official experience certificates for employees."""

    __tablename__ = "experience_letters"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    letter_no: Mapped[str] = mapped_column(String(50), nullable=False)
    issue_date: Mapped[Date] = mapped_column(Date, nullable=False)
    joining_date: Mapped[Date] = mapped_column(Date, nullable=False)
    relieving_date: Mapped[Date] = mapped_column(Date, nullable=False)
    designation: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    addressed_to: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[ExperienceLetterStatusEnum] = mapped_column(
        SAEnum(ExperienceLetterStatusEnum, name="experience_letter_status"),
        default=ExperienceLetterStatusEnum.DRAFT,
        nullable=False,
    )
    conduct_and_character: Mapped[str | None] = mapped_column(
        String(255), default="Good", nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")  # noqa: F821

    def __repr__(self) -> str:
        return f"<ExperienceLetter {self.letter_no} - {self.status}>"
