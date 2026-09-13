import enum

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Enum as SAEnum

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


class OfferLetterStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    REVOKED = "revoked"


class OfferLetter(Base, UUIDMixin, TimestampMixin):
    """Offer Letter model representing official offer letters issued to candidates."""

    __tablename__ = "offer_letters"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    letter_no: Mapped[str] = mapped_column(String(50), nullable=False)
    candidate_name: Mapped[str] = mapped_column(String(255), nullable=False)
    candidate_email: Mapped[str] = mapped_column(String(255), nullable=False)
    candidate_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    job_title: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    offered_salary: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0.0, nullable=False
    )
    joining_date: Mapped[Date] = mapped_column(Date, nullable=False)
    issue_date: Mapped[Date] = mapped_column(Date, nullable=False)
    valid_until: Mapped[Date | None] = mapped_column(Date, nullable=True)
    status: Mapped[OfferLetterStatusEnum] = mapped_column(
        SAEnum(OfferLetterStatusEnum, name="offer_letter_status"),
        default=OfferLetterStatusEnum.DRAFT,
        nullable=False,
    )
    terms: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<OfferLetter {self.letter_no} - {self.candidate_name} ({self.status})>"
