import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.modules.hr_payroll.documents.models import (
    AgreementStatusEnum,
    AgreementTypeEnum,
    BulkJobStatusEnum,
    BulkLetterTypeEnum,
    DocumentConfidentialityEnum,
    DocumentVerificationStatusEnum,
    IdentityStatusEnum,
    IdentityTypeEnum,
    SignatureModeEnum,
    SignatureStatusEnum,
)


# ===========================================================================
# 1. Document Category Schemas
# ===========================================================================
class DocumentCategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=50)
    description: Optional[str] = None
    is_mandatory: bool = False
    has_expiry: bool = False
    confidentiality_level: DocumentConfidentialityEnum = DocumentConfidentialityEnum.INTERNAL
    allowed_extensions: str = "pdf,png,jpg,jpeg"
    max_file_size_mb: int = Field(default=10, ge=1, le=50)
    is_active: bool = True


class DocumentCategoryCreate(DocumentCategoryBase):
    business_id: int


class DocumentCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_mandatory: Optional[bool] = None
    has_expiry: Optional[bool] = None
    confidentiality_level: Optional[DocumentConfidentialityEnum] = None
    allowed_extensions: Optional[str] = None
    max_file_size_mb: Optional[int] = None
    is_active: Optional[bool] = None


class DocumentCategoryOut(DocumentCategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    is_system: bool
    created_at: datetime
    updated_at: datetime


# ===========================================================================
# 2. Document Template Schemas
# ===========================================================================
class DocumentTemplateBase(BaseModel):
    name: str = Field(..., max_length=150)
    category_id: Optional[uuid.UUID] = None
    template_type: BulkLetterTypeEnum = BulkLetterTypeEnum.APPOINTMENT
    subject: str = Field(..., max_length=200)
    content_html: str
    header_content: Optional[str] = None
    footer_content: Optional[str] = None
    signatory_title: Optional[str] = None
    requires_employee_signature: bool = True
    is_active: bool = True


class DocumentTemplateCreate(DocumentTemplateBase):
    business_id: int


class DocumentTemplateUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    template_type: Optional[BulkLetterTypeEnum] = None
    subject: Optional[str] = None
    content_html: Optional[str] = None
    header_content: Optional[str] = None
    footer_content: Optional[str] = None
    signatory_title: Optional[str] = None
    requires_employee_signature: Optional[bool] = None
    is_active: Optional[bool] = None


class DocumentTemplateOut(DocumentTemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    category_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class TemplatePreviewRequest(BaseModel):
    template_id: Optional[uuid.UUID] = None
    content_html: Optional[str] = None
    employee_id: Optional[uuid.UUID] = None
    custom_tokens: Optional[dict[str, Any]] = None


class TemplatePreviewOut(BaseModel):
    rendered_subject: str
    rendered_html: str
    sample_tokens_used: dict[str, Any]


# ===========================================================================
# 3. Employee Document Schemas (e-Dossier)
# ===========================================================================
class EmployeeDocumentCreate(BaseModel):
    business_id: int
    employee_id: uuid.UUID
    category_id: uuid.UUID
    document_title: str = Field(..., max_length=200)
    document_number: Optional[str] = None
    file_url: str = Field(..., max_length=500)
    file_name: str = Field(..., max_length=255)
    file_size_bytes: int = 0
    mime_type: str = "application/pdf"
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    issuing_authority: Optional[str] = None
    confidentiality_level: DocumentConfidentialityEnum = DocumentConfidentialityEnum.INTERNAL
    notes: Optional[str] = None


class EmployeeDocumentUpdate(BaseModel):
    document_title: Optional[str] = None
    document_number: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    issuing_authority: Optional[str] = None
    confidentiality_level: Optional[DocumentConfidentialityEnum] = None
    notes: Optional[str] = None


class EmployeeDocumentVerify(BaseModel):
    status: DocumentVerificationStatusEnum
    rejection_reason: Optional[str] = None


class EmployeeDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    category_id: uuid.UUID
    document_title: str
    document_number: Optional[str] = None
    file_url: str
    file_name: str
    file_size_bytes: int
    mime_type: str
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    issuing_authority: Optional[str] = None
    confidentiality_level: DocumentConfidentialityEnum
    verification_status: DocumentVerificationStatusEnum
    verified_by_user_id: Optional[int] = None
    verified_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    version: int
    notes: Optional[str] = None
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department_name: Optional[str] = None
    category_name: Optional[str] = None
    category_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DossierCategoryGroupOut(BaseModel):
    category_id: uuid.UUID
    category_name: str
    category_code: str
    is_mandatory: bool
    uploaded_count: int
    verified_count: int
    is_compliant: bool
    documents: List[EmployeeDocumentOut] = []


class DossierSummaryOut(BaseModel):
    employee_id: uuid.UUID
    employee_name: str
    employee_code: str
    department_name: Optional[str] = None
    total_mandatory_categories: int
    completed_mandatory_categories: int
    completeness_percentage: float
    total_documents: int
    verified_documents: int
    pending_verification: int
    rejected_documents: int
    categories: List[DossierCategoryGroupOut] = []


# ===========================================================================
# 4. Employee Agreement Schemas
# ===========================================================================
class EmployeeAgreementCreate(BaseModel):
    business_id: int
    employee_id: uuid.UUID
    template_id: Optional[uuid.UUID] = None
    agreement_type: AgreementTypeEnum = AgreementTypeEnum.PERMANENT_CONTRACT
    reference_no: str = Field(..., max_length=100)
    title: str = Field(..., max_length=200)
    start_date: date
    end_date: Optional[date] = None
    notice_period_days: int = 30
    probation_months: int = 3
    bond_amount: Optional[Decimal] = None
    governing_law: str = "Laws of Bangladesh (BLA 2006)"
    document_url: Optional[str] = None
    content_snapshot: Optional[str] = None
    status: AgreementStatusEnum = AgreementStatusEnum.DRAFT


class EmployeeAgreementUpdate(BaseModel):
    title: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notice_period_days: Optional[int] = None
    probation_months: Optional[int] = None
    bond_amount: Optional[Decimal] = None
    governing_law: Optional[str] = None
    document_url: Optional[str] = None
    content_snapshot: Optional[str] = None
    status: Optional[AgreementStatusEnum] = None


class EmployeeAgreementRenew(BaseModel):
    new_start_date: date
    new_end_date: Optional[date] = None
    new_reference_no: Optional[str] = None
    renewal_notes: Optional[str] = None


class EmployeeAgreementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    template_id: Optional[uuid.UUID] = None
    agreement_type: AgreementTypeEnum
    reference_no: str
    title: str
    start_date: date
    end_date: Optional[date] = None
    notice_period_days: int
    probation_months: int
    bond_amount: Optional[Decimal] = None
    governing_law: str
    document_url: Optional[str] = None
    content_snapshot: Optional[str] = None
    status: AgreementStatusEnum
    signed_at: Optional[datetime] = None
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ===========================================================================
# 5. Identity Record Schemas (NID, Passport, Work Permit)
# ===========================================================================
class EmployeeIdentityRecordCreate(BaseModel):
    business_id: int
    employee_id: uuid.UUID
    identity_type: IdentityTypeEnum = IdentityTypeEnum.NID_SMART_CARD
    document_number: str = Field(..., max_length=100)
    issuing_country: str = "Bangladesh"
    issuing_authority: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    visa_category: Optional[str] = None
    place_of_issue: Optional[str] = None
    document_file_url: Optional[str] = None
    alert_threshold_days: int = 30
    is_primary: bool = True


class EmployeeIdentityRecordUpdate(BaseModel):
    document_number: Optional[str] = None
    issuing_country: Optional[str] = None
    issuing_authority: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    visa_category: Optional[str] = None
    place_of_issue: Optional[str] = None
    document_file_url: Optional[str] = None
    verification_status: Optional[DocumentVerificationStatusEnum] = None
    alert_threshold_days: Optional[int] = None
    is_primary: Optional[bool] = None


class EmployeeIdentityRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    identity_type: IdentityTypeEnum
    document_number: str
    issuing_country: str
    issuing_authority: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    visa_category: Optional[str] = None
    place_of_issue: Optional[str] = None
    document_file_url: Optional[str] = None
    verification_status: DocumentVerificationStatusEnum
    alert_threshold_days: int
    is_primary: bool
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ===========================================================================
# 6. Document Renewal Alert Schemas
# ===========================================================================
class DocumentRenewalAlertUpdate(BaseModel):
    renewal_status: str  # pending, in_progress, renewed
    tracking_reference: Optional[str] = None
    notes: Optional[str] = None


class DocumentRenewalAlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    document_id: Optional[uuid.UUID] = None
    identity_id: Optional[uuid.UUID] = None
    agreement_id: Optional[uuid.UUID] = None
    alert_type: str
    document_title: str
    expiry_date: date
    days_remaining: int
    renewal_status: str
    tracking_reference: Optional[str] = None
    notes: Optional[str] = None
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ===========================================================================
# 7. Bulk Letter Job & Item Schemas
# ===========================================================================
class BulkLetterItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    job_id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    reference_no: str
    recipient_name: str
    recipient_email: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    rendered_content: str
    pdf_url: Optional[str] = None
    is_signed: bool
    signed_at: Optional[datetime] = None
    created_at: datetime


class BulkLetterJobCreate(BaseModel):
    business_id: int
    job_type: BulkLetterTypeEnum
    template_id: uuid.UUID
    batch_title: str = Field(..., max_length=200)
    reference_prefix: str = Field(default="HR/LTR", max_length=50)
    issue_date: date
    employee_ids: List[uuid.UUID] = Field(..., min_length=1)


class BulkLetterJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    job_type: BulkLetterTypeEnum
    template_id: uuid.UUID
    batch_title: str
    reference_prefix: str
    issue_date: date
    total_recipients: int
    successful_count: int
    failed_count: int
    status: BulkJobStatusEnum
    created_by_user_id: Optional[int] = None
    template_name: Optional[str] = None
    items: List[BulkLetterItemOut] = []
    created_at: datetime
    updated_at: datetime


# ===========================================================================
# 8. Document Acknowledgement & Digital Signature Schemas
# ===========================================================================
class DocumentSignRequest(BaseModel):
    business_id: int
    employee_id: uuid.UUID
    document_id: Optional[uuid.UUID] = None
    agreement_id: Optional[uuid.UUID] = None
    letter_item_id: Optional[uuid.UUID] = None
    document_content_to_hash: str
    signature_mode: SignatureModeEnum = SignatureModeEnum.DRAWN_CANVAS
    signature_image_base64_or_url: Optional[str] = None
    signer_full_name: str
    signer_email: Optional[str] = None
    acknowledgement_text: str = "I hereby confirm that I have read, understood, and accept all the terms and conditions outlined in this document."


class DocumentAcknowledgementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    employee_id: uuid.UUID
    document_id: Optional[uuid.UUID] = None
    agreement_id: Optional[uuid.UUID] = None
    letter_item_id: Optional[uuid.UUID] = None
    document_checksum_sha256: str
    signature_mode: SignatureModeEnum
    signature_image_url: Optional[str] = None
    signer_full_name: str
    signer_email: Optional[str] = None
    signer_ip_address: Optional[str] = None
    signer_user_agent: Optional[str] = None
    acknowledgement_text: str
    status: SignatureStatusEnum
    signed_at: datetime
    audit_certificate_no: str
    employee_name: Optional[str] = None
    created_at: datetime


class SignatureVerificationOut(BaseModel):
    is_valid: bool
    audit_certificate_no: str
    signer_full_name: str
    document_checksum_sha256: str
    signed_at: datetime
    signature_mode: str
    ip_address_masked: Optional[str] = None
    verification_message: str
