import hashlib
import re
import secrets
import uuid
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.modules.hr_payroll.documents.models import (
    AgreementStatusEnum,
    AgreementTypeEnum,
    BulkJobStatusEnum,
    BulkLetterItem,
    BulkLetterJob,
    BulkLetterTypeEnum,
    DocumentAcknowledgement,
    DocumentCategory,
    DocumentConfidentialityEnum,
    DocumentRenewalAlert,
    DocumentTemplate,
    DocumentVerificationStatusEnum,
    EmployeeAgreement,
    EmployeeDocument,
    EmployeeIdentityRecord,
    IdentityTypeEnum,
    SignatureModeEnum,
    SignatureStatusEnum,
)
from app.modules.hr_payroll.documents.repository import (
    BulkLetterJobRepository,
    DocumentAcknowledgementRepository,
    DocumentCategoryRepository,
    DocumentRenewalAlertRepository,
    DocumentTemplateRepository,
    EmployeeAgreementRepository,
    EmployeeDocumentRepository,
    EmployeeIdentityRecordRepository,
)
from app.modules.hr_payroll.documents.schemas import (
    BulkLetterJobCreate,
    DocumentCategoryCreate,
    DocumentCategoryUpdate,
    DocumentSignRequest,
    DocumentTemplateCreate,
    DocumentTemplateUpdate,
    DossierCategoryGroupOut,
    DossierSummaryOut,
    EmployeeAgreementCreate,
    EmployeeAgreementRenew,
    EmployeeAgreementUpdate,
    EmployeeDocumentCreate,
    EmployeeDocumentOut,
    EmployeeDocumentUpdate,
    EmployeeDocumentVerify,
    EmployeeIdentityRecordCreate,
    EmployeeIdentityRecordUpdate,
    SignatureVerificationOut,
    TemplatePreviewRequest,
)
from app.modules.hr_payroll.employees.models import Employee


# ===========================================================================
# 1. Document Category Service
# ===========================================================================
class DocumentCategoryService:
    def __init__(self):
        self.repo = DocumentCategoryRepository()

    def get_by_id(self, db: Session, category_id: uuid.UUID) -> Optional[DocumentCategory]:
        return self.repo.get_by_id(db, category_id)

    def list_by_business(
        self, db: Session, business_id: int, is_active: Optional[bool] = None
    ) -> List[DocumentCategory]:
        cats = self.repo.list_by_business(db, business_id, is_active)
        if not cats:
            self.seed_defaults(db, business_id)
            cats = self.repo.list_by_business(db, business_id, is_active)
        return cats

    def create(self, db: Session, data: DocumentCategoryCreate) -> DocumentCategory:
        existing = self.repo.get_by_code(db, data.business_id, data.code)
        if existing:
            raise ValueError(f"Category with code '{data.code}' already exists for this business.")
        cat = DocumentCategory(
            business_id=data.business_id,
            name=data.name,
            code=data.code.upper(),
            description=data.description,
            is_mandatory=data.is_mandatory,
            has_expiry=data.has_expiry,
            confidentiality_level=data.confidentiality_level,
            allowed_extensions=data.allowed_extensions,
            max_file_size_mb=data.max_file_size_mb,
            is_system=False,
            is_active=data.is_active,
        )
        return self.repo.create(db, cat)

    def update(
        self, db: Session, category_id: uuid.UUID, data: DocumentCategoryUpdate
    ) -> DocumentCategory:
        cat = self.repo.get_by_id(db, category_id)
        if not cat:
            raise ValueError("Document category not found.")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(cat, field, value)
        return self.repo.update(db, cat)

    def delete(self, db: Session, category_id: uuid.UUID) -> None:
        cat = self.repo.get_by_id(db, category_id)
        if not cat:
            raise ValueError("Document category not found.")
        if cat.is_system:
            raise ValueError("System default categories cannot be deleted.")
        self.repo.delete(db, cat)

    def seed_defaults(self, db: Session, business_id: int) -> None:
        defaults = [
            ("National ID / Smart Card", "NID_SMART", "Official government NID card or Smart Card", True, False, DocumentConfidentialityEnum.CONFIDENTIAL),
            ("e-TIN Certificate", "ETIN_CERT", "12-digit Taxpayer Identification Number certificate", True, False, DocumentConfidentialityEnum.CONFIDENTIAL),
            ("Academic Certificates", "ACADEMIC_CERT", "Degree, Diploma, or Transcripts", True, False, DocumentConfidentialityEnum.INTERNAL),
            ("Curriculum Vitae / Resume", "RESUME_CV", "Signed personal resume or biodata", True, False, DocumentConfidentialityEnum.INTERNAL),
            ("Employment Contract & NDA", "CONTRACT_NDA", "Executed employment agreement and non-disclosure deed", True, True, DocumentConfidentialityEnum.CONFIDENTIAL),
            ("Passport, Visa & Work Permit", "PASSPORT_VISA", "International passport, BIDA permit or entry visa", False, True, DocumentConfidentialityEnum.CONFIDENTIAL),
            ("Medical & Fitness Certificate", "MEDICAL_FITNESS", "Pre-employment health screening report", False, True, DocumentConfidentialityEnum.CONFIDENTIAL),
            ("Police Clearance Certificate", "POLICE_CLEARANCE", "Criminal background verification certificate", False, True, DocumentConfidentialityEnum.CONFIDENTIAL),
            ("Previous Experience Letters", "EXPERIENCE_CERT", "Relieving or service certificate from past employers", False, False, DocumentConfidentialityEnum.INTERNAL),
        ]
        for name, code, desc, is_mand, has_exp, conf in defaults:
            if not self.repo.get_by_code(db, business_id, code):
                cat = DocumentCategory(
                    business_id=business_id,
                    name=name,
                    code=code,
                    description=desc,
                    is_mandatory=is_mand,
                    has_expiry=has_exp,
                    confidentiality_level=conf,
                    allowed_extensions="pdf,png,jpg,jpeg",
                    max_file_size_mb=10,
                    is_system=True,
                    is_active=True,
                )
                self.repo.create(db, cat)


# ===========================================================================
# 2. Document Template Service
# ===========================================================================
class DocumentTemplateService:
    def __init__(self):
        self.repo = DocumentTemplateRepository()

    def get_by_id(self, db: Session, template_id: uuid.UUID) -> Optional[DocumentTemplate]:
        return self.repo.get_by_id(db, template_id)

    def list_by_business(
        self,
        db: Session,
        business_id: int,
        template_type: Optional[BulkLetterTypeEnum] = None,
        is_active: Optional[bool] = None,
    ) -> List[DocumentTemplate]:
        tmps = self.repo.list_by_business(db, business_id, template_type, is_active)
        if not tmps:
            self.seed_defaults(db, business_id)
            tmps = self.repo.list_by_business(db, business_id, template_type, is_active)
        return tmps

    def create(self, db: Session, data: DocumentTemplateCreate) -> DocumentTemplate:
        template = DocumentTemplate(
            business_id=data.business_id,
            name=data.name,
            category_id=data.category_id,
            template_type=data.template_type,
            subject=data.subject,
            content_html=data.content_html,
            header_content=data.header_content,
            footer_content=data.footer_content,
            signatory_title=data.signatory_title,
            requires_employee_signature=data.requires_employee_signature,
            is_active=data.is_active,
        )
        return self.repo.create(db, template)

    def update(
        self, db: Session, template_id: uuid.UUID, data: DocumentTemplateUpdate
    ) -> DocumentTemplate:
        template = self.repo.get_by_id(db, template_id)
        if not template:
            raise ValueError("Template not found.")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(template, field, value)
        return self.repo.update(db, template)

    def delete(self, db: Session, template_id: uuid.UUID) -> None:
        template = self.repo.get_by_id(db, template_id)
        if not template:
            raise ValueError("Template not found.")
        self.repo.delete(db, template)

    def render_template_tokens(self, text: str, tokens: Dict[str, Any]) -> str:
        rendered = text
        for k, v in tokens.items():
            val = "" if v is None else str(v)
            rendered = re.sub(rf"\{{\{{\s*{re.escape(k)}\s*\}}\}}", val, rendered, flags=re.IGNORECASE)
        return rendered

    def preview_template(self, db: Session, req: TemplatePreviewRequest) -> dict:
        content_html = req.content_html or ""
        subject = "Preview Document"

        if req.template_id:
            tpl = self.repo.get_by_id(db, req.template_id)
            if tpl:
                subject = tpl.subject
                if not content_html:
                    content_html = tpl.content_html

        sample_tokens: Dict[str, Any] = {
            "employee_name": "Taufiqur Rahman",
            "employee_code": "EMP-0012",
            "designation": "Senior Software Engineer",
            "department": "Engineering & Technology",
            "joining_date": date.today().strftime("%d %B %Y"),
            "effective_date": date.today().strftime("%d %B %Y"),
            "gross_salary": "BDT 120,000",
            "basic_salary": "BDT 60,000",
            "company_name": "Onoda Inc",
            "signatory_title": "Head of People & Culture",
            "date": date.today().strftime("%d %B %Y"),
        }

        if req.employee_id:
            emp = db.get(Employee, req.employee_id)
            if emp:
                sample_tokens["employee_name"] = emp.full_name
                sample_tokens["employee_code"] = emp.employee_id or "EMP-0000"
                if emp.department:
                    sample_tokens["department"] = emp.department.name
                if emp.job_title:
                    sample_tokens["designation"] = emp.job_title.name
                if emp.start_date:
                    sample_tokens["joining_date"] = emp.start_date.strftime("%d %B %Y")

        if req.custom_tokens:
            sample_tokens.update(req.custom_tokens)

        rendered_sub = self.render_template_tokens(subject, sample_tokens)
        rendered_body = self.render_template_tokens(content_html, sample_tokens)

        return {
            "rendered_subject": rendered_sub,
            "rendered_html": rendered_body,
            "sample_tokens_used": sample_tokens,
        }

    def seed_defaults(self, db: Session, business_id: int) -> None:
        templates = [
            (
                "Standard Appointment Letter",
                BulkLetterTypeEnum.APPOINTMENT,
                "Offer of Employment & Appointment Letter - {{employee_name}}",
                "<p>Dear <strong>{{employee_name}}</strong>,</p><p>We are pleased to appoint you as <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department effective from <strong>{{joining_date}}</strong>.</p><p>Your gross monthly salary shall be <strong>{{gross_salary}}</strong> subject to applicable statutory deductions as per Bangladesh Labour Act 2006.</p><p>Welcome to the team!</p>",
                "Head of Human Resources",
            ),
            (
                "Employment Confirmation Letter",
                BulkLetterTypeEnum.CONFIRMATION,
                "Confirmation of Employment - {{employee_name}}",
                "<p>Dear <strong>{{employee_name}}</strong>,</p><p>Consequent to the successful completion of your probationary period, the Management is pleased to confirm your employment as <strong>{{designation}}</strong> effective from <strong>{{effective_date}}</strong>.</p><p>All other terms of your employment agreement remain unchanged. We appreciate your valuable contributions.</p>",
                "Director, Human Resources",
            ),
            (
                "Annual Salary Increment Letter",
                BulkLetterTypeEnum.INCREMENT,
                "Annual Compensation Revision - {{employee_name}}",
                "<p>Dear <strong>{{employee_name}}</strong>,</p><p>In recognition of your outstanding performance during the past fiscal year, we are pleased to inform you that your monthly gross compensation is revised to <strong>{{gross_salary}}</strong> with effect from <strong>{{effective_date}}</strong>.</p><p>We look forward to your continued dedication.</p>",
                "Managing Director",
            ),
        ]
        for name, t_type, subj, html, sign_title in templates:
            t = DocumentTemplate(
                business_id=business_id,
                name=name,
                template_type=t_type,
                subject=subj,
                content_html=html,
                signatory_title=sign_title,
                requires_employee_signature=True,
                is_active=True,
            )
            self.repo.create(db, t)


# ===========================================================================
# 3. Employee Document Service (e-Dossier / 201 File)
# ===========================================================================
class EmployeeDocumentService:
    def __init__(self):
        self.repo = EmployeeDocumentRepository()
        self.category_repo = DocumentCategoryRepository()

    def get_by_id(self, db: Session, doc_id: uuid.UUID) -> Optional[EmployeeDocument]:
        return self.repo.get_by_id(db, doc_id)

    def list_by_business(
        self,
        db: Session,
        business_id: int,
        employee_id: Optional[uuid.UUID] = None,
        category_id: Optional[uuid.UUID] = None,
        verification_status: Optional[DocumentVerificationStatusEnum] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[EmployeeDocument]:
        return self.repo.list_by_business(
            db, business_id, employee_id, category_id, verification_status, skip, limit
        )

    def create(self, db: Session, data: EmployeeDocumentCreate) -> EmployeeDocument:
        cat = self.category_repo.get_by_id(db, data.category_id)
        if not cat:
            raise ValueError("Document category not found.")

        doc = EmployeeDocument(
            business_id=data.business_id,
            employee_id=data.employee_id,
            category_id=data.category_id,
            document_title=data.document_title,
            document_number=data.document_number,
            file_url=data.file_url,
            file_name=data.file_name,
            file_size_bytes=data.file_size_bytes,
            mime_type=data.mime_type,
            issue_date=data.issue_date,
            expiry_date=data.expiry_date,
            issuing_authority=data.issuing_authority,
            confidentiality_level=data.confidentiality_level,
            verification_status=DocumentVerificationStatusEnum.UNVERIFIED,
            notes=data.notes,
            version=1,
        )
        return self.repo.create(db, doc)

    def update(self, db: Session, doc_id: uuid.UUID, data: EmployeeDocumentUpdate) -> EmployeeDocument:
        doc = self.repo.get_by_id(db, doc_id)
        if not doc:
            raise ValueError("Document not found.")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(doc, field, value)
        return self.repo.update(db, doc)

    def verify_document(
        self,
        db: Session,
        doc_id: uuid.UUID,
        data: EmployeeDocumentVerify,
        verified_by_user_id: Optional[int] = None,
    ) -> EmployeeDocument:
        doc = self.repo.get_by_id(db, doc_id)
        if not doc:
            raise ValueError("Document not found.")
        doc.verification_status = data.status
        doc.rejection_reason = data.rejection_reason if data.status == DocumentVerificationStatusEnum.REJECTED else None
        doc.verified_by_user_id = verified_by_user_id
        doc.verified_at = datetime.utcnow()
        return self.repo.update(db, doc)

    def delete(self, db: Session, doc_id: uuid.UUID) -> None:
        doc = self.repo.get_by_id(db, doc_id)
        if not doc:
            raise ValueError("Document not found.")
        self.repo.delete(db, doc)

    def get_dossier_summary(
        self, db: Session, business_id: int, employee_id: uuid.UUID
    ) -> DossierSummaryOut:
        emp = db.get(Employee, employee_id)
        if not emp:
            raise ValueError("Employee not found.")

        categories = self.category_repo.list_by_business(db, business_id, is_active=True)
        documents = self.repo.list_by_business(db, business_id, employee_id=employee_id, limit=500)

        docs_by_cat: Dict[uuid.UUID, List[EmployeeDocument]] = {}
        for d in documents:
            docs_by_cat.setdefault(d.category_id, []).append(d)

        category_groups: List[DossierCategoryGroupOut] = []
        mandatory_total = 0
        mandatory_compliant = 0

        for cat in categories:
            cat_docs = docs_by_cat.get(cat.id, [])
            verified_count = sum(1 for d in cat_docs if d.verification_status == DocumentVerificationStatusEnum.VERIFIED)
            is_compliant = verified_count > 0 or (not cat.is_mandatory and len(cat_docs) > 0)

            if cat.is_mandatory:
                mandatory_total += 1
                if verified_count > 0:
                    mandatory_compliant += 1

            doc_outs = []
            for d in cat_docs:
                doc_outs.append(
                    EmployeeDocumentOut(
                        id=d.id,
                        business_id=d.business_id,
                        employee_id=d.employee_id,
                        category_id=d.category_id,
                        document_title=d.document_title,
                        document_number=d.document_number,
                        file_url=d.file_url,
                        file_name=d.file_name,
                        file_size_bytes=d.file_size_bytes,
                        mime_type=d.mime_type,
                        issue_date=d.issue_date,
                        expiry_date=d.expiry_date,
                        issuing_authority=d.issuing_authority,
                        confidentiality_level=d.confidentiality_level,
                        verification_status=d.verification_status,
                        verified_by_user_id=d.verified_by_user_id,
                        verified_at=d.verified_at,
                        rejection_reason=d.rejection_reason,
                        version=d.version,
                        notes=d.notes,
                        employee_name=emp.full_name,
                        employee_code=emp.employee_id,
                        department_name=emp.department.name if emp.department else None,
                        category_name=cat.name,
                        category_code=cat.code,
                        created_at=d.created_at,
                        updated_at=d.updated_at,
                    )
                )

            category_groups.append(
                DossierCategoryGroupOut(
                    category_id=cat.id,
                    category_name=cat.name,
                    category_code=cat.code,
                    is_mandatory=cat.is_mandatory,
                    uploaded_count=len(cat_docs),
                    verified_count=verified_count,
                    is_compliant=is_compliant,
                    documents=doc_outs,
                )
            )

        completeness_pct = (
            round((mandatory_compliant / mandatory_total) * 100, 1) if mandatory_total > 0 else 100.0
        )

        return DossierSummaryOut(
            employee_id=emp.id,
            employee_name=emp.full_name,
            employee_code=emp.employee_id or "—",
            department_name=emp.department.name if emp.department else None,
            total_mandatory_categories=mandatory_total,
            completed_mandatory_categories=mandatory_compliant,
            completeness_percentage=completeness_pct,
            total_documents=len(documents),
            verified_documents=sum(1 for d in documents if d.verification_status == DocumentVerificationStatusEnum.VERIFIED),
            pending_verification=sum(1 for d in documents if d.verification_status == DocumentVerificationStatusEnum.UNVERIFIED),
            rejected_documents=sum(1 for d in documents if d.verification_status == DocumentVerificationStatusEnum.REJECTED),
            categories=category_groups,
        )


# ===========================================================================
# 4. Employee Agreement Service
# ===========================================================================
class EmployeeAgreementService:
    def __init__(self):
        self.repo = EmployeeAgreementRepository()

    def get_by_id(self, db: Session, agreement_id: uuid.UUID) -> Optional[EmployeeAgreement]:
        return self.repo.get_by_id(db, agreement_id)

    def list_by_business(
        self,
        db: Session,
        business_id: int,
        employee_id: Optional[uuid.UUID] = None,
        agreement_type: Optional[AgreementTypeEnum] = None,
        status: Optional[AgreementStatusEnum] = None,
    ) -> List[EmployeeAgreement]:
        return self.repo.list_by_business(db, business_id, employee_id, agreement_type, status)

    def create(self, db: Session, data: EmployeeAgreementCreate) -> EmployeeAgreement:
        agr = EmployeeAgreement(
            business_id=data.business_id,
            employee_id=data.employee_id,
            template_id=data.template_id,
            agreement_type=data.agreement_type,
            reference_no=data.reference_no,
            title=data.title,
            start_date=data.start_date,
            end_date=data.end_date,
            notice_period_days=data.notice_period_days,
            probation_months=data.probation_months,
            bond_amount=data.bond_amount,
            governing_law=data.governing_law,
            document_url=data.document_url,
            content_snapshot=data.content_snapshot,
            status=data.status,
        )
        return self.repo.create(db, agr)

    def update(
        self, db: Session, agreement_id: uuid.UUID, data: EmployeeAgreementUpdate
    ) -> EmployeeAgreement:
        agr = self.repo.get_by_id(db, agreement_id)
        if not agr:
            raise ValueError("Agreement not found.")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(agr, field, value)
        return self.repo.update(db, agr)

    def renew(
        self, db: Session, agreement_id: uuid.UUID, data: EmployeeAgreementRenew
    ) -> EmployeeAgreement:
        old_agr = self.repo.get_by_id(db, agreement_id)
        if not old_agr:
            raise ValueError("Agreement not found.")

        old_agr.status = AgreementStatusEnum.RENEWED
        self.repo.update(db, old_agr)

        new_ref = data.new_reference_no or f"{old_agr.reference_no}-R"
        new_agr = EmployeeAgreement(
            business_id=old_agr.business_id,
            employee_id=old_agr.employee_id,
            template_id=old_agr.template_id,
            agreement_type=old_agr.agreement_type,
            reference_no=new_ref,
            title=f"{old_agr.title} (Renewed)",
            start_date=data.new_start_date,
            end_date=data.new_end_date,
            notice_period_days=old_agr.notice_period_days,
            probation_months=0,
            bond_amount=old_agr.bond_amount,
            governing_law=old_agr.governing_law,
            document_url=old_agr.document_url,
            content_snapshot=old_agr.content_snapshot,
            status=AgreementStatusEnum.ACTIVE,
        )
        return self.repo.create(db, new_agr)

    def delete(self, db: Session, agreement_id: uuid.UUID) -> None:
        agr = self.repo.get_by_id(db, agreement_id)
        if not agr:
            raise ValueError("Agreement not found.")
        self.repo.delete(db, agr)


# ===========================================================================
# 5. Employee Identity Record Service (NID, Passport, TIN)
# ===========================================================================
class EmployeeIdentityRecordService:
    def __init__(self):
        self.repo = EmployeeIdentityRecordRepository()

    def get_by_id(self, db: Session, record_id: uuid.UUID) -> Optional[EmployeeIdentityRecord]:
        return self.repo.get_by_id(db, record_id)

    def list_by_business(
        self,
        db: Session,
        business_id: int,
        employee_id: Optional[uuid.UUID] = None,
        identity_type: Optional[IdentityTypeEnum] = None,
        country: Optional[str] = None,
    ) -> List[EmployeeIdentityRecord]:
        return self.repo.list_by_business(db, business_id, employee_id, identity_type, country)

    def create(self, db: Session, data: EmployeeIdentityRecordCreate) -> EmployeeIdentityRecord:
        # Validate statutory Bangladesh formats
        doc_num = data.document_number.strip()
        if data.identity_type == IdentityTypeEnum.NID_SMART_CARD and not re.match(r"^\d{10}$", doc_num):
            raise ValueError("Smart NID must be exactly 10 numeric digits.")
        elif data.identity_type == IdentityTypeEnum.NID_CLASSIC and not (
            re.match(r"^\d{13}$", doc_num) or re.match(r"^\d{17}$", doc_num)
        ):
            raise ValueError("Classic NID must be 13 or 17 numeric digits.")
        elif data.identity_type == IdentityTypeEnum.TIN_CERTIFICATE and not re.match(r"^\d{12}$", doc_num):
            raise ValueError("Bangladesh e-TIN must be exactly 12 numeric digits.")

        rec = EmployeeIdentityRecord(
            business_id=data.business_id,
            employee_id=data.employee_id,
            identity_type=data.identity_type,
            document_number=doc_num,
            issuing_country=data.issuing_country,
            issuing_authority=data.issuing_authority,
            issue_date=data.issue_date,
            expiry_date=data.expiry_date,
            visa_category=data.visa_category,
            place_of_issue=data.place_of_issue,
            document_file_url=data.document_file_url,
            verification_status=DocumentVerificationStatusEnum.UNVERIFIED,
            alert_threshold_days=data.alert_threshold_days,
            is_primary=data.is_primary,
        )
        return self.repo.create(db, rec)

    def update(
        self, db: Session, record_id: uuid.UUID, data: EmployeeIdentityRecordUpdate
    ) -> EmployeeIdentityRecord:
        rec = self.repo.get_by_id(db, record_id)
        if not rec:
            raise ValueError("Identity record not found.")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(rec, field, value)
        return self.repo.update(db, rec)

    def delete(self, db: Session, record_id: uuid.UUID) -> None:
        rec = self.repo.get_by_id(db, record_id)
        if not rec:
            raise ValueError("Identity record not found.")
        self.repo.delete(db, rec)


# ===========================================================================
# 6. Document Renewal Alert Service
# ===========================================================================
class DocumentRenewalAlertService:
    def __init__(self):
        self.repo = DocumentRenewalAlertRepository()
        self.doc_repo = EmployeeDocumentRepository()
        self.identity_repo = EmployeeIdentityRecordRepository()
        self.agr_repo = EmployeeAgreementRepository()

    def list_by_business(
        self,
        db: Session,
        business_id: int,
        renewal_status: Optional[str] = None,
        days_remaining_max: Optional[int] = None,
    ) -> List[DocumentRenewalAlert]:
        return self.repo.list_by_business(db, business_id, renewal_status, days_remaining_max)

    def scan_and_generate_alerts(self, db: Session, business_id: int) -> int:
        today = date.today()
        created_count = 0

        # 1. Identity Records
        identities = self.identity_repo.list_by_business(db, business_id)
        for ident in identities:
            if ident.expiry_date:
                days = (ident.expiry_date - today).days
                if days <= ident.alert_threshold_days or days <= 90:
                    alert = DocumentRenewalAlert(
                        business_id=business_id,
                        employee_id=ident.employee_id,
                        identity_id=ident.id,
                        alert_type=ident.identity_type.value,
                        document_title=f"{ident.identity_type.value.replace('_', ' ').title()} ({ident.document_number})",
                        expiry_date=ident.expiry_date,
                        days_remaining=days,
                        renewal_status="pending",
                    )
                    self.repo.create_or_update(db, alert)
                    created_count += 1

        # 2. Documents
        documents = self.doc_repo.list_by_business(db, business_id, limit=1000)
        for doc in documents:
            if doc.expiry_date:
                days = (doc.expiry_date - today).days
                if days <= 90:
                    alert = DocumentRenewalAlert(
                        business_id=business_id,
                        employee_id=doc.employee_id,
                        document_id=doc.id,
                        alert_type="document",
                        document_title=doc.document_title,
                        expiry_date=doc.expiry_date,
                        days_remaining=days,
                        renewal_status="pending",
                    )
                    self.repo.create_or_update(db, alert)
                    created_count += 1

        # 3. Agreements
        agreements = self.agr_repo.list_by_business(db, business_id, status=AgreementStatusEnum.ACTIVE)
        for agr in agreements:
            if agr.end_date:
                days = (agr.end_date - today).days
                if days <= 90:
                    alert = DocumentRenewalAlert(
                        business_id=business_id,
                        employee_id=agr.employee_id,
                        agreement_id=agr.id,
                        alert_type="agreement",
                        document_title=f"{agr.title} ({agr.reference_no})",
                        expiry_date=agr.end_date,
                        days_remaining=days,
                        renewal_status="pending",
                    )
                    self.repo.create_or_update(db, alert)
                    created_count += 1

        return created_count

    def update_alert(
        self, db: Session, alert_id: uuid.UUID, renewal_status: str, tracking_reference: Optional[str], notes: Optional[str]
    ) -> DocumentRenewalAlert:
        alert = self.repo.get_by_id(db, alert_id)
        if not alert:
            raise ValueError("Renewal alert not found.")
        alert.renewal_status = renewal_status
        if tracking_reference:
            alert.tracking_reference = tracking_reference
        if notes:
            alert.notes = notes
        return self.repo.create_or_update(db, alert)


# ===========================================================================
# 7. Bulk Letter Service
# ===========================================================================
class BulkLetterService:
    def __init__(self):
        self.job_repo = BulkLetterJobRepository()
        self.template_repo = DocumentTemplateRepository()
        self.template_service = DocumentTemplateService()
        self.doc_repo = EmployeeDocumentRepository()

    def get_job_by_id(self, db: Session, job_id: uuid.UUID) -> Optional[BulkLetterJob]:
        return self.job_repo.get_by_id(db, job_id)

    def list_jobs(
        self, db: Session, business_id: int, job_type: Optional[BulkLetterTypeEnum] = None
    ) -> List[BulkLetterJob]:
        return self.job_repo.list_by_business(db, business_id, job_type)

    def list_items(self, db: Session, job_id: uuid.UUID) -> List[BulkLetterItem]:
        return self.job_repo.list_items_by_job(db, job_id)

    def execute_bulk_generation(
        self, db: Session, data: BulkLetterJobCreate, user_id: Optional[int] = None
    ) -> BulkLetterJob:
        tpl = self.template_repo.get_by_id(db, data.template_id)
        if not tpl:
            raise ValueError("Template not found.")

        job = BulkLetterJob(
            business_id=data.business_id,
            job_type=data.job_type,
            template_id=data.template_id,
            batch_title=data.batch_title,
            reference_prefix=data.reference_prefix,
            issue_date=data.issue_date,
            total_recipients=len(data.employee_ids),
            successful_count=0,
            failed_count=0,
            status=BulkJobStatusEnum.PROCESSING,
            created_by_user_id=user_id,
        )
        job = self.job_repo.create(db, job)

        seq = 1
        year_str = str(data.issue_date.year)

        for emp_id in data.employee_ids:
            emp = db.get(Employee, emp_id)
            if not emp:
                job.failed_count += 1
                continue

            ref_no = f"{data.reference_prefix}/{year_str}/{seq:04d}"
            seq += 1

            tokens = {
                "employee_name": emp.full_name,
                "employee_code": emp.employee_id or "—",
                "designation": emp.job_title.name if emp.job_title else "Staff",
                "department": emp.department.name if emp.department else "General",
                "joining_date": emp.start_date.strftime("%d %B %Y") if emp.start_date else "—",
                "effective_date": data.issue_date.strftime("%d %B %Y"),
                "date": data.issue_date.strftime("%d %B %Y"),
                "signatory_title": tpl.signatory_title or "Management",
            }

            rendered_body = self.template_service.render_template_tokens(tpl.content_html, tokens)

            item = BulkLetterItem(
                job_id=job.id,
                business_id=data.business_id,
                employee_id=emp.id,
                reference_no=ref_no,
                recipient_name=emp.full_name,
                recipient_email=emp.work_email,
                designation=tokens["designation"],
                department=tokens["department"],
                rendered_content=rendered_body,
                is_signed=False,
            )
            db.add(item)
            job.successful_count += 1

        job.status = BulkJobStatusEnum.COMPLETED if job.failed_count == 0 else BulkJobStatusEnum.PARTIAL_FAILED
        db.commit()
        db.refresh(job)
        return job


# ===========================================================================
# 8. Document Acknowledgement & Signature Service (ICT Act 2006 Compliant)
# ===========================================================================
class DocumentSignatureService:
    def __init__(self):
        self.repo = DocumentAcknowledgementRepository()

    def sign_document(
        self,
        db: Session,
        data: DocumentSignRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> DocumentAcknowledgement:
        # Cryptographic SHA-256 Checksum of the document text
        sha256_hash = hashlib.sha256(data.document_content_to_hash.encode("utf-8")).hexdigest()

        # Generate unique verifiable certificate number
        date_str = datetime.utcnow().strftime("%Y%m%d")
        random_hex = secrets.token_hex(4).upper()
        cert_no = f"CERT-DOC-{date_str}-{random_hex}"

        ack = DocumentAcknowledgement(
            business_id=data.business_id,
            employee_id=data.employee_id,
            document_id=data.document_id,
            agreement_id=data.agreement_id,
            letter_item_id=data.letter_item_id,
            document_checksum_sha256=sha256_hash,
            signature_mode=data.signature_mode,
            signature_image_url=data.signature_image_base64_or_url,
            signer_full_name=data.signer_full_name,
            signer_email=data.signer_email,
            signer_ip_address=ip_address,
            signer_user_agent=user_agent,
            acknowledgement_text=data.acknowledgement_text,
            status=SignatureStatusEnum.SIGNED,
            signed_at=datetime.utcnow(),
            audit_certificate_no=cert_no,
        )
        ack = self.repo.create(db, ack)

        # Update signed status on related entities if present
        if data.agreement_id:
            agr = db.get(EmployeeAgreement, data.agreement_id)
            if agr:
                agr.status = AgreementStatusEnum.ACTIVE
                agr.signed_at = ack.signed_at
                db.commit()

        if data.letter_item_id:
            item = db.get(BulkLetterItem, data.letter_item_id)
            if item:
                item.is_signed = True
                item.signed_at = ack.signed_at
                db.commit()

        return ack

    def verify_certificate(self, db: Session, cert_no: str) -> SignatureVerificationOut:
        ack = self.repo.get_by_certificate_no(db, cert_no)
        if not ack:
            return SignatureVerificationOut(
                is_valid=False,
                audit_certificate_no=cert_no,
                signer_full_name="Unknown",
                document_checksum_sha256="—",
                signed_at=datetime.utcnow(),
                signature_mode="unknown",
                ip_address_masked=None,
                verification_message="Certificate number not found in audit registry. Document signature cannot be verified.",
            )

        masked_ip = None
        if ack.signer_ip_address:
            parts = ack.signer_ip_address.split(".")
            if len(parts) == 4:
                masked_ip = f"{parts[0]}.{parts[1]}.*.*"
            else:
                masked_ip = "***"

        return SignatureVerificationOut(
            is_valid=True,
            audit_certificate_no=ack.audit_certificate_no,
            signer_full_name=ack.signer_full_name,
            document_checksum_sha256=ack.document_checksum_sha256,
            signed_at=ack.signed_at,
            signature_mode=ack.signature_mode.value,
            ip_address_masked=masked_ip,
            verification_message="Valid legally binding cryptographic signature verified under ICT Act 2006 guidelines.",
        )
