import uuid
from datetime import date, datetime
from typing import List, Optional, Tuple

from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.orm import Session, selectinload

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
)
from app.modules.hr_payroll.employees.models import Employee


# ===========================================================================
# 1. Document Category Repository
# ===========================================================================
class DocumentCategoryRepository:
    def get_by_id(self, db: Session, category_id: uuid.UUID) -> Optional[DocumentCategory]:
        return db.get(DocumentCategory, category_id)

    def get_by_code(self, db: Session, business_id: int, code: str) -> Optional[DocumentCategory]:
        stmt = select(DocumentCategory).where(
            DocumentCategory.business_id == business_id,
            DocumentCategory.code == code,
        )
        return db.execute(stmt).scalar_one_or_none()

    def list_by_business(
        self, db: Session, business_id: int, is_active: Optional[bool] = None
    ) -> List[DocumentCategory]:
        stmt = select(DocumentCategory).where(DocumentCategory.business_id == business_id)
        if is_active is not None:
            stmt = stmt.where(DocumentCategory.is_active == is_active)
        stmt = stmt.order_by(DocumentCategory.is_mandatory.desc(), DocumentCategory.name.asc())
        return list(db.execute(stmt).scalars().all())

    def create(self, db: Session, category: DocumentCategory) -> DocumentCategory:
        db.add(category)
        db.commit()
        db.refresh(category)
        return category

    def update(self, db: Session, category: DocumentCategory) -> DocumentCategory:
        db.commit()
        db.refresh(category)
        return category

    def delete(self, db: Session, category: DocumentCategory) -> None:
        db.delete(category)
        db.commit()


# ===========================================================================
# 2. Document Template Repository
# ===========================================================================
class DocumentTemplateRepository:
    def get_by_id(self, db: Session, template_id: uuid.UUID) -> Optional[DocumentTemplate]:
        stmt = (
            select(DocumentTemplate)
            .options(selectinload(DocumentTemplate.category))
            .where(DocumentTemplate.id == template_id)
        )
        return db.execute(stmt).scalar_one_or_none()

    def list_by_business(
        self,
        db: Session,
        business_id: int,
        template_type: Optional[BulkLetterTypeEnum] = None,
        is_active: Optional[bool] = None,
    ) -> List[DocumentTemplate]:
        stmt = (
            select(DocumentTemplate)
            .options(selectinload(DocumentTemplate.category))
            .where(DocumentTemplate.business_id == business_id)
        )
        if template_type:
            stmt = stmt.where(DocumentTemplate.template_type == template_type)
        if is_active is not None:
            stmt = stmt.where(DocumentTemplate.is_active == is_active)
        stmt = stmt.order_by(DocumentTemplate.name.asc())
        return list(db.execute(stmt).scalars().all())

    def create(self, db: Session, template: DocumentTemplate) -> DocumentTemplate:
        db.add(template)
        db.commit()
        db.refresh(template)
        return template

    def update(self, db: Session, template: DocumentTemplate) -> DocumentTemplate:
        db.commit()
        db.refresh(template)
        return template

    def delete(self, db: Session, template: DocumentTemplate) -> None:
        db.delete(template)
        db.commit()


# ===========================================================================
# 3. Employee Document Repository (e-Dossier)
# ===========================================================================
class EmployeeDocumentRepository:
    def get_by_id(self, db: Session, doc_id: uuid.UUID) -> Optional[EmployeeDocument]:
        stmt = (
            select(EmployeeDocument)
            .options(
                selectinload(EmployeeDocument.employee).selectinload(Employee.department),
                selectinload(EmployeeDocument.category),
            )
            .where(EmployeeDocument.id == doc_id)
        )
        return db.execute(stmt).scalar_one_or_none()

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
        stmt = (
            select(EmployeeDocument)
            .options(
                selectinload(EmployeeDocument.employee).selectinload(Employee.department),
                selectinload(EmployeeDocument.category),
            )
            .where(EmployeeDocument.business_id == business_id)
        )
        if employee_id:
            stmt = stmt.where(EmployeeDocument.employee_id == employee_id)
        if category_id:
            stmt = stmt.where(EmployeeDocument.category_id == category_id)
        if verification_status:
            stmt = stmt.where(EmployeeDocument.verification_status == verification_status)

        stmt = stmt.order_by(EmployeeDocument.created_at.desc()).offset(skip).limit(limit)
        return list(db.execute(stmt).scalars().all())

    def create(self, db: Session, doc: EmployeeDocument) -> EmployeeDocument:
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc

    def update(self, db: Session, doc: EmployeeDocument) -> EmployeeDocument:
        db.commit()
        db.refresh(doc)
        return doc

    def delete(self, db: Session, doc: EmployeeDocument) -> None:
        db.delete(doc)
        db.commit()


# ===========================================================================
# 4. Employee Agreement Repository
# ===========================================================================
class EmployeeAgreementRepository:
    def get_by_id(self, db: Session, agreement_id: uuid.UUID) -> Optional[EmployeeAgreement]:
        stmt = (
            select(EmployeeAgreement)
            .options(
                selectinload(EmployeeAgreement.employee).selectinload(Employee.department),
                selectinload(EmployeeAgreement.template),
            )
            .where(EmployeeAgreement.id == agreement_id)
        )
        return db.execute(stmt).scalar_one_or_none()

    def list_by_business(
        self,
        db: Session,
        business_id: int,
        employee_id: Optional[uuid.UUID] = None,
        agreement_type: Optional[AgreementTypeEnum] = None,
        status: Optional[AgreementStatusEnum] = None,
    ) -> List[EmployeeAgreement]:
        stmt = (
            select(EmployeeAgreement)
            .options(
                selectinload(EmployeeAgreement.employee).selectinload(Employee.department),
                selectinload(EmployeeAgreement.template),
            )
            .where(EmployeeAgreement.business_id == business_id)
        )
        if employee_id:
            stmt = stmt.where(EmployeeAgreement.employee_id == employee_id)
        if agreement_type:
            stmt = stmt.where(EmployeeAgreement.agreement_type == agreement_type)
        if status:
            stmt = stmt.where(EmployeeAgreement.status == status)

        stmt = stmt.order_by(EmployeeAgreement.start_date.desc())
        return list(db.execute(stmt).scalars().all())

    def create(self, db: Session, agreement: EmployeeAgreement) -> EmployeeAgreement:
        db.add(agreement)
        db.commit()
        db.refresh(agreement)
        return agreement

    def update(self, db: Session, agreement: EmployeeAgreement) -> EmployeeAgreement:
        db.commit()
        db.refresh(agreement)
        return agreement

    def delete(self, db: Session, agreement: EmployeeAgreement) -> None:
        db.delete(agreement)
        db.commit()


# ===========================================================================
# 5. Employee Identity Record Repository
# ===========================================================================
class EmployeeIdentityRecordRepository:
    def get_by_id(self, db: Session, record_id: uuid.UUID) -> Optional[EmployeeIdentityRecord]:
        stmt = (
            select(EmployeeIdentityRecord)
            .options(selectinload(EmployeeIdentityRecord.employee).selectinload(Employee.department))
            .where(EmployeeIdentityRecord.id == record_id)
        )
        return db.execute(stmt).scalar_one_or_none()

    def list_by_business(
        self,
        db: Session,
        business_id: int,
        employee_id: Optional[uuid.UUID] = None,
        identity_type: Optional[IdentityTypeEnum] = None,
        country: Optional[str] = None,
    ) -> List[EmployeeIdentityRecord]:
        stmt = (
            select(EmployeeIdentityRecord)
            .options(selectinload(EmployeeIdentityRecord.employee).selectinload(Employee.department))
            .where(EmployeeIdentityRecord.business_id == business_id)
        )
        if employee_id:
            stmt = stmt.where(EmployeeIdentityRecord.employee_id == employee_id)
        if identity_type:
            stmt = stmt.where(EmployeeIdentityRecord.identity_type == identity_type)
        if country:
            stmt = stmt.where(EmployeeIdentityRecord.issuing_country.ilike(f"%{country}%"))

        stmt = stmt.order_by(EmployeeIdentityRecord.created_at.desc())
        return list(db.execute(stmt).scalars().all())

    def create(self, db: Session, record: EmployeeIdentityRecord) -> EmployeeIdentityRecord:
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    def update(self, db: Session, record: EmployeeIdentityRecord) -> EmployeeIdentityRecord:
        db.commit()
        db.refresh(record)
        return record

    def delete(self, db: Session, record: EmployeeIdentityRecord) -> None:
        db.delete(record)
        db.commit()


# ===========================================================================
# 6. Document Renewal Alert Repository
# ===========================================================================
class DocumentRenewalAlertRepository:
    def get_by_id(self, db: Session, alert_id: uuid.UUID) -> Optional[DocumentRenewalAlert]:
        stmt = (
            select(DocumentRenewalAlert)
            .options(selectinload(DocumentRenewalAlert.employee).selectinload(Employee.department))
            .where(DocumentRenewalAlert.id == alert_id)
        )
        return db.execute(stmt).scalar_one_or_none()

    def list_by_business(
        self,
        db: Session,
        business_id: int,
        renewal_status: Optional[str] = None,
        days_remaining_max: Optional[int] = None,
    ) -> List[DocumentRenewalAlert]:
        stmt = (
            select(DocumentRenewalAlert)
            .options(selectinload(DocumentRenewalAlert.employee).selectinload(Employee.department))
            .where(DocumentRenewalAlert.business_id == business_id)
        )
        if renewal_status:
            stmt = stmt.where(DocumentRenewalAlert.renewal_status == renewal_status)
        if days_remaining_max is not None:
            stmt = stmt.where(DocumentRenewalAlert.days_remaining <= days_remaining_max)

        stmt = stmt.order_by(DocumentRenewalAlert.days_remaining.asc())
        return list(db.execute(stmt).scalars().all())

    def create_or_update(self, db: Session, alert: DocumentRenewalAlert) -> DocumentRenewalAlert:
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return alert

    def clear_stale_alerts(self, db: Session, business_id: int) -> None:
        stmt = select(DocumentRenewalAlert).where(
            DocumentRenewalAlert.business_id == business_id,
            DocumentRenewalAlert.renewal_status != "renewed",
        )
        alerts = db.execute(stmt).scalars().all()
        for a in alerts:
            db.delete(a)
        db.commit()


# ===========================================================================
# 7. Bulk Letter Job Repository
# ===========================================================================
class BulkLetterJobRepository:
    def get_by_id(self, db: Session, job_id: uuid.UUID) -> Optional[BulkLetterJob]:
        stmt = (
            select(BulkLetterJob)
            .options(
                selectinload(BulkLetterJob.template),
                selectinload(BulkLetterJob.items),
            )
            .where(BulkLetterJob.id == job_id)
        )
        return db.execute(stmt).scalar_one_or_none()

    def list_by_business(
        self, db: Session, business_id: int, job_type: Optional[BulkLetterTypeEnum] = None
    ) -> List[BulkLetterJob]:
        stmt = (
            select(BulkLetterJob)
            .options(selectinload(BulkLetterJob.template))
            .where(BulkLetterJob.business_id == business_id)
        )
        if job_type:
            stmt = stmt.where(BulkLetterJob.job_type == job_type)
        stmt = stmt.order_by(BulkLetterJob.created_at.desc())
        return list(db.execute(stmt).scalars().all())

    def create(self, db: Session, job: BulkLetterJob) -> BulkLetterJob:
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    def update(self, db: Session, job: BulkLetterJob) -> BulkLetterJob:
        db.commit()
        db.refresh(job)
        return job

    def list_items_by_job(self, db: Session, job_id: uuid.UUID) -> List[BulkLetterItem]:
        stmt = (
            select(BulkLetterItem)
            .where(BulkLetterItem.job_id == job_id)
            .order_by(BulkLetterItem.recipient_name.asc())
        )
        return list(db.execute(stmt).scalars().all())

    def get_item_by_id(self, db: Session, item_id: uuid.UUID) -> Optional[BulkLetterItem]:
        return db.get(BulkLetterItem, item_id)


# ===========================================================================
# 8. Document Acknowledgement Repository
# ===========================================================================
class DocumentAcknowledgementRepository:
    def get_by_id(self, db: Session, ack_id: uuid.UUID) -> Optional[DocumentAcknowledgement]:
        stmt = (
            select(DocumentAcknowledgement)
            .options(selectinload(DocumentAcknowledgement.employee))
            .where(DocumentAcknowledgement.id == ack_id)
        )
        return db.execute(stmt).scalar_one_or_none()

    def get_by_certificate_no(self, db: Session, cert_no: str) -> Optional[DocumentAcknowledgement]:
        stmt = (
            select(DocumentAcknowledgement)
            .options(selectinload(DocumentAcknowledgement.employee))
            .where(DocumentAcknowledgement.audit_certificate_no == cert_no)
        )
        return db.execute(stmt).scalar_one_or_none()

    def create(self, db: Session, ack: DocumentAcknowledgement) -> DocumentAcknowledgement:
        db.add(ack)
        db.commit()
        db.refresh(ack)
        return ack
