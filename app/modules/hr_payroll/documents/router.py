import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.database import get_db
from app.modules.hr_payroll.documents.models import (
    AgreementStatusEnum,
    AgreementTypeEnum,
    BulkLetterTypeEnum,
    DocumentVerificationStatusEnum,
    IdentityTypeEnum,
)
from app.modules.hr_payroll.documents.schemas import (
    BulkLetterItemOut,
    BulkLetterJobCreate,
    BulkLetterJobOut,
    DocumentAcknowledgementOut,
    DocumentCategoryCreate,
    DocumentCategoryOut,
    DocumentCategoryUpdate,
    DocumentRenewalAlertOut,
    DocumentRenewalAlertUpdate,
    DocumentSignRequest,
    DocumentTemplateCreate,
    DocumentTemplateOut,
    DocumentTemplateUpdate,
    DossierSummaryOut,
    EmployeeAgreementCreate,
    EmployeeAgreementOut,
    EmployeeAgreementRenew,
    EmployeeAgreementUpdate,
    EmployeeDocumentCreate,
    EmployeeDocumentOut,
    EmployeeDocumentUpdate,
    EmployeeDocumentVerify,
    EmployeeIdentityRecordCreate,
    EmployeeIdentityRecordOut,
    EmployeeIdentityRecordUpdate,
    SignatureVerificationOut,
    TemplatePreviewRequest,
    TemplatePreviewOut,
)
from app.modules.hr_payroll.documents.service import (
    BulkLetterService,
    DocumentCategoryService,
    DocumentRenewalAlertService,
    DocumentSignatureService,
    DocumentTemplateService,
    EmployeeAgreementService,
    EmployeeDocumentService,
    EmployeeIdentityRecordService,
)

router = APIRouter(prefix="/documents", tags=["HR Employee Document Management"])

cat_service = DocumentCategoryService()
tpl_service = DocumentTemplateService()
doc_service = EmployeeDocumentService()
agr_service = EmployeeAgreementService()
ident_service = EmployeeIdentityRecordService()
alert_service = DocumentRenewalAlertService()
bulk_service = BulkLetterService()
sign_service = DocumentSignatureService()


# ===========================================================================
# 1. Document Categories
# ===========================================================================
@router.get("/categories", response_model=List[DocumentCategoryOut])
def list_categories(
    business_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "document_categories", "view")),
):
    biz_id = resolve_business_id(current_user, business_id)
    return cat_service.list_by_business(db, biz_id, is_active)


@router.post("/categories", response_model=DocumentCategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    data: DocumentCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "document_categories", "create")),
):
    resolve_business_id(current_user, data.business_id)
    try:
        return cat_service.create(db, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/categories/{category_id}", response_model=DocumentCategoryOut)
def get_category(
    category_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "document_categories", "view")),
):
    cat = cat_service.get_by_id(db, category_id)
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
    resolve_business_id(current_user, cat.business_id)
    return cat


@router.put("/categories/{category_id}", response_model=DocumentCategoryOut)
def update_category(
    category_id: uuid.UUID,
    data: DocumentCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "document_categories", "update")),
):
    cat = cat_service.get_by_id(db, category_id)
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
    resolve_business_id(current_user, cat.business_id)
    try:
        return cat_service.update(db, category_id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "document_categories", "delete")),
):
    cat = cat_service.get_by_id(db, category_id)
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
    resolve_business_id(current_user, cat.business_id)
    try:
        cat_service.delete(db, category_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ===========================================================================
# 2. Document Templates
# ===========================================================================
@router.get("/templates", response_model=List[DocumentTemplateOut])
def list_templates(
    business_id: Optional[int] = Query(None),
    template_type: Optional[BulkLetterTypeEnum] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "document_templates", "view")),
):
    biz_id = resolve_business_id(current_user, business_id)
    return tpl_service.list_by_business(db, biz_id, template_type, is_active)


@router.post("/templates", response_model=DocumentTemplateOut, status_code=status.HTTP_201_CREATED)
def create_template(
    data: DocumentTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "document_templates", "create")),
):
    resolve_business_id(current_user, data.business_id)
    return tpl_service.create(db, data)


@router.post("/templates/preview", response_model=TemplatePreviewOut)
def preview_template(
    req: TemplatePreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "document_templates", "view")),
):
    return tpl_service.preview_template(db, req)


@router.get("/templates/{template_id}", response_model=DocumentTemplateOut)
def get_template(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "document_templates", "view")),
):
    tpl = tpl_service.get_by_id(db, template_id)
    if not tpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found.")
    resolve_business_id(current_user, tpl.business_id)
    return tpl


@router.put("/templates/{template_id}", response_model=DocumentTemplateOut)
def update_template(
    template_id: uuid.UUID,
    data: DocumentTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "document_templates", "update")),
):
    tpl = tpl_service.get_by_id(db, template_id)
    if not tpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found.")
    resolve_business_id(current_user, tpl.business_id)
    try:
        return tpl_service.update(db, template_id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "document_templates", "delete")),
):
    tpl = tpl_service.get_by_id(db, template_id)
    if not tpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found.")
    resolve_business_id(current_user, tpl.business_id)
    tpl_service.delete(db, template_id)


# ===========================================================================
# 3. Employee Documents (e-Dossier / 201 File)
# ===========================================================================
@router.get("/dossier", response_model=List[EmployeeDocumentOut])
def list_dossier_documents(
    business_id: Optional[int] = Query(None),
    employee_id: Optional[uuid.UUID] = Query(None),
    category_id: Optional[uuid.UUID] = Query(None),
    verification_status: Optional[DocumentVerificationStatusEnum] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "employee_documents", "view")),
):
    biz_id = resolve_business_id(current_user, business_id)
    return doc_service.list_by_business(
        db, biz_id, employee_id, category_id, verification_status, skip, limit
    )


@router.post("/dossier", response_model=EmployeeDocumentOut, status_code=status.HTTP_201_CREATED)
def upload_dossier_document(
    data: EmployeeDocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "employee_documents", "create")),
):
    resolve_business_id(current_user, data.business_id)
    try:
        return doc_service.create(db, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/dossier/summary/{employee_id}", response_model=DossierSummaryOut)
def get_employee_dossier_summary(
    employee_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "employee_documents", "view")),
):
    biz_id = resolve_business_id(current_user, business_id)
    try:
        return doc_service.get_dossier_summary(db, biz_id, employee_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/dossier/{doc_id}", response_model=EmployeeDocumentOut)
def get_dossier_document(
    doc_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "employee_documents", "view")),
):
    doc = doc_service.get_by_id(db, doc_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    resolve_business_id(current_user, doc.business_id)
    return doc


@router.put("/dossier/{doc_id}", response_model=EmployeeDocumentOut)
def update_dossier_document(
    doc_id: uuid.UUID,
    data: EmployeeDocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "employee_documents", "update")),
):
    doc = doc_service.get_by_id(db, doc_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    resolve_business_id(current_user, doc.business_id)
    try:
        return doc_service.update(db, doc_id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/dossier/{doc_id}/verify", response_model=EmployeeDocumentOut)
def verify_dossier_document(
    doc_id: uuid.UUID,
    data: EmployeeDocumentVerify,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "employee_documents", "update")),
):
    doc = doc_service.get_by_id(db, doc_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    resolve_business_id(current_user, doc.business_id)
    return doc_service.verify_document(db, doc_id, data, verified_by_user_id=current_user.id)


@router.delete("/dossier/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dossier_document(
    doc_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "employee_documents", "delete")),
):
    doc = doc_service.get_by_id(db, doc_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    resolve_business_id(current_user, doc.business_id)
    doc_service.delete(db, doc_id)


# ===========================================================================
# 4. Agreements (Contracts & NDAs)
# ===========================================================================
@router.get("/agreements", response_model=List[EmployeeAgreementOut])
def list_agreements(
    business_id: Optional[int] = Query(None),
    employee_id: Optional[uuid.UUID] = Query(None),
    agreement_type: Optional[AgreementTypeEnum] = Query(None),
    agreement_status: Optional[AgreementStatusEnum] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "employee_agreements", "view")),
):
    biz_id = resolve_business_id(current_user, business_id)
    return agr_service.list_by_business(db, biz_id, employee_id, agreement_type, agreement_status)


@router.post("/agreements", response_model=EmployeeAgreementOut, status_code=status.HTTP_201_CREATED)
def create_agreement(
    data: EmployeeAgreementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "employee_agreements", "create")),
):
    resolve_business_id(current_user, data.business_id)
    return agr_service.create(db, data)


@router.get("/agreements/{agreement_id}", response_model=EmployeeAgreementOut)
def get_agreement(
    agreement_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "employee_agreements", "view")),
):
    agr = agr_service.get_by_id(db, agreement_id)
    if not agr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agreement not found.")
    resolve_business_id(current_user, agr.business_id)
    return agr


@router.put("/agreements/{agreement_id}", response_model=EmployeeAgreementOut)
def update_agreement(
    agreement_id: uuid.UUID,
    data: EmployeeAgreementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "employee_agreements", "update")),
):
    agr = agr_service.get_by_id(db, agreement_id)
    if not agr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agreement not found.")
    resolve_business_id(current_user, agr.business_id)
    try:
        return agr_service.update(db, agreement_id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/agreements/{agreement_id}/renew", response_model=EmployeeAgreementOut)
def renew_agreement(
    agreement_id: uuid.UUID,
    data: EmployeeAgreementRenew,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "employee_agreements", "update")),
):
    agr = agr_service.get_by_id(db, agreement_id)
    if not agr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agreement not found.")
    resolve_business_id(current_user, agr.business_id)
    try:
        return agr_service.renew(db, agreement_id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/agreements/{agreement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agreement(
    agreement_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "employee_agreements", "delete")),
):
    agr = agr_service.get_by_id(db, agreement_id)
    if not agr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agreement not found.")
    resolve_business_id(current_user, agr.business_id)
    agr_service.delete(db, agreement_id)


# ===========================================================================
# 5. Identity Records (NID, Passport, Work Permit, TIN)
# ===========================================================================
@router.get("/identity-records", response_model=List[EmployeeIdentityRecordOut])
def list_identity_records(
    business_id: Optional[int] = Query(None),
    employee_id: Optional[uuid.UUID] = Query(None),
    identity_type: Optional[IdentityTypeEnum] = Query(None),
    country: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "identity_tracking", "view")),
):
    biz_id = resolve_business_id(current_user, business_id)
    return ident_service.list_by_business(db, biz_id, employee_id, identity_type, country)


@router.post("/identity-records", response_model=EmployeeIdentityRecordOut, status_code=status.HTTP_201_CREATED)
def create_identity_record(
    data: EmployeeIdentityRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "identity_tracking", "create")),
):
    resolve_business_id(current_user, data.business_id)
    try:
        return ident_service.create(db, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/identity-records/{record_id}", response_model=EmployeeIdentityRecordOut)
def get_identity_record(
    record_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "identity_tracking", "view")),
):
    rec = ident_service.get_by_id(db, record_id)
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Identity record not found.")
    resolve_business_id(current_user, rec.business_id)
    return rec


@router.put("/identity-records/{record_id}", response_model=EmployeeIdentityRecordOut)
def update_identity_record(
    record_id: uuid.UUID,
    data: EmployeeIdentityRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "identity_tracking", "update")),
):
    rec = ident_service.get_by_id(db, record_id)
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Identity record not found.")
    resolve_business_id(current_user, rec.business_id)
    try:
        return ident_service.update(db, record_id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/identity-records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_identity_record(
    record_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "identity_tracking", "delete")),
):
    rec = ident_service.get_by_id(db, record_id)
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Identity record not found.")
    resolve_business_id(current_user, rec.business_id)
    ident_service.delete(db, record_id)


# ===========================================================================
# 6. Expiry & Renewal Alerts
# ===========================================================================
@router.get("/expiry-alerts", response_model=List[DocumentRenewalAlertOut])
def list_expiry_alerts(
    business_id: Optional[int] = Query(None),
    renewal_status: Optional[str] = Query(None),
    days_max: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "document_alerts", "view")),
):
    biz_id = resolve_business_id(current_user, business_id)
    return alert_service.list_by_business(db, biz_id, renewal_status, days_max)


@router.post("/expiry-alerts/scan")
def trigger_alert_scan(
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "document_alerts", "create")),
):
    biz_id = resolve_business_id(current_user, business_id)
    count = alert_service.scan_and_generate_alerts(db, biz_id)
    return {"message": "Document expiry scan completed successfully.", "alerts_recorded": count}


@router.put("/expiry-alerts/{alert_id}", response_model=DocumentRenewalAlertOut)
def update_expiry_alert(
    alert_id: uuid.UUID,
    data: DocumentRenewalAlertUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "document_alerts", "update")),
):
    alert = alert_service.repo.get_by_id(db, alert_id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")
    resolve_business_id(current_user, alert.business_id)
    try:
        return alert_service.update_alert(
            db, alert_id, data.renewal_status, data.tracking_reference, data.notes
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ===========================================================================
# 7. Bulk Letter Generation
# ===========================================================================
@router.get("/bulk-letters/jobs", response_model=List[BulkLetterJobOut])
def list_bulk_letter_jobs(
    business_id: Optional[int] = Query(None),
    job_type: Optional[BulkLetterTypeEnum] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "bulk_letters", "view")),
):
    biz_id = resolve_business_id(current_user, business_id)
    return bulk_service.list_jobs(db, biz_id, job_type)


@router.post("/bulk-letters/generate", response_model=BulkLetterJobOut, status_code=status.HTTP_201_CREATED)
def generate_bulk_letters(
    data: BulkLetterJobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "bulk_letters", "create")),
):
    resolve_business_id(current_user, data.business_id)
    try:
        return bulk_service.execute_bulk_generation(db, data, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/bulk-letters/jobs/{job_id}", response_model=BulkLetterJobOut)
def get_bulk_letter_job(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "bulk_letters", "view")),
):
    job = bulk_service.get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    resolve_business_id(current_user, job.business_id)
    return job


@router.get("/bulk-letters/jobs/{job_id}/items", response_model=List[BulkLetterItemOut])
def list_bulk_letter_job_items(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "bulk_letters", "view")),
):
    job = bulk_service.get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    resolve_business_id(current_user, job.business_id)
    return bulk_service.list_items(db, job_id)


# ===========================================================================
# 8. Digital Signatures & Audit Trail (ICT Act 2006 Compliant)
# ===========================================================================
@router.post("/signatures/sign", response_model=DocumentAcknowledgementOut, status_code=status.HTTP_201_CREATED)
def submit_digital_signature(
    data: DocumentSignRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "document_signatures", "create")),
):
    resolve_business_id(current_user, data.business_id)
    ip_addr = request.client.host if request.client else "127.0.0.1"
    ua = request.headers.get("user-agent", "Unknown")
    return sign_service.sign_document(db, data, ip_address=ip_addr, user_agent=ua)


@router.get("/signatures/verify/{certificate_no}", response_model=SignatureVerificationOut)
def verify_audit_certificate(
    certificate_no: str,
    db: Session = Depends(get_db),
):
    # Public audit certificate validator
    return sign_service.verify_certificate(db, certificate_no)
