import enum
import uuid

from sqlalchemy import Boolean, Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID
from sqlalchemy.types import Enum as SAEnum

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


class CertificateStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    REVOKED = "revoked"


class CertificatePurposeEnum(str, enum.Enum):
    BANK_LOAN = "bank_loan"
    VISA_APPLICATION = "visa_application"
    TENANCY = "tenancy"
    GENERAL = "general"


class SalaryCertificate(Base, UUIDMixin, TimestampMixin):
    """Salary Certificate model representing official salary certificates."""

    __tablename__ = "salary_certificates"

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
    certificate_no: Mapped[str] = mapped_column(String(50), nullable=False)
    issue_date: Mapped[Date] = mapped_column(Date, nullable=False)
    purpose: Mapped[CertificatePurposeEnum] = mapped_column(
        SAEnum(CertificatePurposeEnum, name="certificate_purpose"),
        default=CertificatePurposeEnum.GENERAL,
        nullable=False,
    )
    addressed_to: Mapped[str | None] = mapped_column(String(255), nullable=True)
    include_breakdown: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    status: Mapped[CertificateStatusEnum] = mapped_column(
        SAEnum(CertificateStatusEnum, name="certificate_status"),
        default=CertificateStatusEnum.DRAFT,
        nullable=False,
    )

    # Fiscal year context and breakdown details
    fiscal_year: Mapped[str] = mapped_column(String(20), default="2022-2023", nullable=False)
    assessment_year: Mapped[str | None] = mapped_column(String(20), nullable=True)
    start_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[Date | None] = mapped_column(Date, nullable=True)

    # Aggregated salary components across fiscal year
    basic_salary: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0.0, nullable=False
    )
    house_rent: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0.0, nullable=False
    )
    medical_allowance: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0.0, nullable=False
    )
    conveyance: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0.0, nullable=False
    )
    others_allowance: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0.0, nullable=False
    )
    bonus: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0.0, nullable=False
    )
    gross_salary: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0.0, nullable=False
    )
    tax_deducted: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0.0, nullable=False
    )
    net_salary: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0.0, nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")  # noqa: F821

    def __repr__(self) -> str:
        return f"<SalaryCertificate {self.certificate_no} - {self.status}>"
