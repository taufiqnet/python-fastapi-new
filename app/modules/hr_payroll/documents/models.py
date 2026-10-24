import enum
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base
from app.modules.hr_payroll.employees.models import Employee


# ===========================================================================
# Enums
# ===========================================================================
class DocumentConfidentialityEnum(str, enum.Enum):
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    STRICTLY_CONFIDENTIAL = "strictly_confidential"


class DocumentVerificationStatusEnum(str, enum.Enum):
    UNVERIFIED = "unverified"
    VERIFIED = "verified"
    REJECTED = "rejected"


class AgreementTypeEnum(str, enum.Enum):
    PERMANENT_CONTRACT = "permanent_contract"
    PROBATION_CONTRACT = "probation_contract"
    FIXED_TERM_CONTRACT = "fixed_term_contract"
    NDA = "nda"
    NON_COMPETE = "non_compete"
    TRAINING_BOND = "training_bond"
    CONSULTANCY_AGREEMENT = "consultancy_agreement"


class AgreementStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    PENDING_SIGNATURE = "pending_signature"
    ACTIVE = "active"
    AMENDED = "amended"
    RENEWED = "renewed"
    EXPIRED = "expired"
    TERMINATED = "terminated"


class IdentityTypeEnum(str, enum.Enum):
    NID_SMART_CARD = "nid_smart_card"
    NID_CLASSIC = "nid_classic"
    PASSPORT = "passport"
    WORK_PERMIT_BIDA = "work_permit_bida"
    WORK_PERMIT_BEPZA = "work_permit_bepza"
    WORK_VISA = "work_visa"
    TIN_CERTIFICATE = "tin_certificate"
    BIRTH_REGISTRATION = "birth_registration"
    DRIVING_LICENSE = "driving_license"
    POLICE_CLEARANCE = "police_clearance"


class IdentityStatusEnum(str, enum.Enum):
    VALID = "valid"
    EXPIRING_SOON = "expiring_soon"
    EXPIRED = "expired"
    RENEWAL_IN_PROGRESS = "renewal_in_progress"
    CANCELLED = "cancelled"


class BulkLetterTypeEnum(str, enum.Enum):
    APPOINTMENT = "appointment"
    CONFIRMATION = "confirmation"
    INCREMENT = "increment"
    TRANSFER = "transfer"
    PROMOTION = "promotion"
    BONUS = "bonus"


class BulkJobStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    PROCESSING = "processing"
    COMPLETED = "completed"
    PARTIAL_FAILED = "partial_failed"


class SignatureModeEnum(str, enum.Enum):
    DRAWN_CANVAS = "drawn_canvas"
    TYPED_SIGNATURE = "typed_signature"
    PROFILE_STAMP = "profile_stamp"
    CLICKWRAP_ACKNOWLEDGE = "clickwrap_acknowledge"


class SignatureStatusEnum(str, enum.Enum):
    PENDING = "pending"
    SIGNED = "signed"
    DECLINED = "declined"
    REVOKED = "revoked"


# ===========================================================================
# 1. Document Category
# ===========================================================================
class DocumentCategory(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "hr_document_categories"

    business_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_expiry: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    confidentiality_level: Mapped[DocumentConfidentialityEnum] = mapped_column(
        Enum(DocumentConfidentialityEnum, native_enum=False, length=30),
        default=DocumentConfidentialityEnum.INTERNAL,
        nullable=False,
    )
    allowed_extensions: Mapped[str] = mapped_column(String(100), default="pdf,png,jpg,jpeg", nullable=False)
    max_file_size_mb: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    documents: Mapped[list["EmployeeDocument"]] = relationship("EmployeeDocument", back_populates="category", cascade="all, delete-orphan")
    templates: Mapped[list["DocumentTemplate"]] = relationship("DocumentTemplate", back_populates="category")


# ===========================================================================
# 2. Document Template
# ===========================================================================
class DocumentTemplate(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "hr_document_templates"

    business_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("hr_document_categories.id", ondelete="SET NULL"), nullable=True
    )
    template_type: Mapped[BulkLetterTypeEnum] = mapped_column(
        Enum(BulkLetterTypeEnum, native_enum=False, length=30),
        default=BulkLetterTypeEnum.APPOINTMENT,
        nullable=False,
    )
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    content_html: Mapped[str] = mapped_column(Text, nullable=False)
    header_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    footer_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    signatory_title: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    requires_employee_signature: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    category: Mapped[Optional["DocumentCategory"]] = relationship("DocumentCategory", back_populates="templates")


# ===========================================================================
# 3. Employee Document (Digital e-Dossier / 201 File)
# ===========================================================================
class EmployeeDocument(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "hr_employee_documents"

    business_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("hr_document_categories.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    document_title: Mapped[str] = mapped_column(String(200), nullable=False)
    document_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), default="application/pdf", nullable=False)
    issue_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    issuing_authority: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    confidentiality_level: Mapped[DocumentConfidentialityEnum] = mapped_column(
        Enum(DocumentConfidentialityEnum, native_enum=False, length=30),
        default=DocumentConfidentialityEnum.INTERNAL,
        nullable=False,
    )
    verification_status: Mapped[DocumentVerificationStatusEnum] = mapped_column(
        Enum(DocumentVerificationStatusEnum, native_enum=False, length=20),
        default=DocumentVerificationStatusEnum.UNVERIFIED,
        nullable=False,
        index=True,
    )
    verified_by_user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id])
    category: Mapped["DocumentCategory"] = relationship("DocumentCategory", back_populates="documents")


# ===========================================================================
# 4. Employee Agreement (Contracts, NDAs & Bonds)
# ===========================================================================
class EmployeeAgreement(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "hr_employee_agreements"

    business_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    template_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("hr_document_templates.id", ondelete="SET NULL"), nullable=True
    )
    agreement_type: Mapped[AgreementTypeEnum] = mapped_column(
        Enum(AgreementTypeEnum, native_enum=False, length=35),
        default=AgreementTypeEnum.PERMANENT_CONTRACT,
        nullable=False,
    )
    reference_no: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    notice_period_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    probation_months: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    bond_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2), nullable=True)
    governing_law: Mapped[str] = mapped_column(String(100), default="Laws of Bangladesh (BLA 2006)", nullable=False)
    document_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    content_snapshot: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[AgreementStatusEnum] = mapped_column(
        Enum(AgreementStatusEnum, native_enum=False, length=25),
        default=AgreementStatusEnum.DRAFT,
        nullable=False,
        index=True,
    )
    signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id])
    template: Mapped[Optional["DocumentTemplate"]] = relationship("DocumentTemplate")


# ===========================================================================
# 5. Employee Identity Record (NID, Passport, Work Permit, TIN)
# ===========================================================================
class EmployeeIdentityRecord(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "hr_employee_identity_records"

    business_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    identity_type: Mapped[IdentityTypeEnum] = mapped_column(
        Enum(IdentityTypeEnum, native_enum=False, length=30),
        default=IdentityTypeEnum.NID_SMART_CARD,
        nullable=False,
    )
    document_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    issuing_country: Mapped[str] = mapped_column(String(100), default="Bangladesh", nullable=False)
    issuing_authority: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    issue_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    visa_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    place_of_issue: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    document_file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    verification_status: Mapped[DocumentVerificationStatusEnum] = mapped_column(
        Enum(DocumentVerificationStatusEnum, native_enum=False, length=20),
        default=DocumentVerificationStatusEnum.UNVERIFIED,
        nullable=False,
    )
    alert_threshold_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id])


# ===========================================================================
# 6. Document Renewal Alert
# ===========================================================================
class DocumentRenewalAlert(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "hr_document_renewal_alerts"

    business_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("hr_employee_documents.id", ondelete="CASCADE"), nullable=True
    )
    identity_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("hr_employee_identity_records.id", ondelete="CASCADE"), nullable=True
    )
    agreement_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("hr_employee_agreements.id", ondelete="CASCADE"), nullable=True
    )
    alert_type: Mapped[str] = mapped_column(String(50), nullable=False)  # passport, work_permit, visa, contract, etc.
    document_title: Mapped[str] = mapped_column(String(200), nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    days_remaining: Mapped[int] = mapped_column(Integer, nullable=False)
    renewal_status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)  # pending, in_progress, renewed
    tracking_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id])


# ===========================================================================
# 7. Bulk Letter Job & Letter Items
# ===========================================================================
class BulkLetterJob(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "hr_bulk_letter_jobs"

    business_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    job_type: Mapped[BulkLetterTypeEnum] = mapped_column(
        Enum(BulkLetterTypeEnum, native_enum=False, length=30), nullable=False
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("hr_document_templates.id", ondelete="RESTRICT"), nullable=False
    )
    batch_title: Mapped[str] = mapped_column(String(200), nullable=False)
    reference_prefix: Mapped[str] = mapped_column(String(50), default="HR/LTR", nullable=False)
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_recipients: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    successful_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[BulkJobStatusEnum] = mapped_column(
        Enum(BulkJobStatusEnum, native_enum=False, length=20),
        default=BulkJobStatusEnum.DRAFT,
        nullable=False,
    )
    created_by_user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    template: Mapped["DocumentTemplate"] = relationship("DocumentTemplate")
    items: Mapped[list["BulkLetterItem"]] = relationship("BulkLetterItem", back_populates="job", cascade="all, delete-orphan")


class BulkLetterItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "hr_bulk_letter_items"

    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("hr_bulk_letter_jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    business_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reference_no: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    recipient_name: Mapped[str] = mapped_column(String(150), nullable=False)
    recipient_email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    designation: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rendered_content: Mapped[str] = mapped_column(Text, nullable=False)
    pdf_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_signed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    job: Mapped["BulkLetterJob"] = relationship("BulkLetterJob", back_populates="items")
    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id])


# ===========================================================================
# 8. Document Acknowledgement & Digital Signature Audit Trail
# ===========================================================================
class DocumentAcknowledgement(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "hr_document_acknowledgements"

    business_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("hr_employee_documents.id", ondelete="SET NULL"), nullable=True
    )
    agreement_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("hr_employee_agreements.id", ondelete="SET NULL"), nullable=True
    )
    letter_item_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("hr_bulk_letter_items.id", ondelete="SET NULL"), nullable=True
    )
    document_checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    signature_mode: Mapped[SignatureModeEnum] = mapped_column(
        Enum(SignatureModeEnum, native_enum=False, length=30),
        default=SignatureModeEnum.DRAWN_CANVAS,
        nullable=False,
    )
    signature_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    signer_full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    signer_email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    signer_ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    signer_user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    acknowledgement_text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[SignatureStatusEnum] = mapped_column(
        Enum(SignatureStatusEnum, native_enum=False, length=20),
        default=SignatureStatusEnum.SIGNED,
        nullable=False,
    )
    signed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    audit_certificate_no: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id])
