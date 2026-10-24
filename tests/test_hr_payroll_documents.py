import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user, get_current_user_optional
from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile
from app.database import Base, get_db
from app.main import app
from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.organization.models import Department, JobTitle

sync_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
SyncTestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)


@pytest.fixture
def sync_db():
    Base.metadata.create_all(bind=sync_engine)
    db = SyncTestingSessionLocal()
    try:
        biz = BusinessProfile(
            id=1,
            name_en="Onoda Global Corp",
            email="hr@onodaglobal.com",
            phone="+8801700000000",
        )
        db.add(biz)
        db.commit()
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=sync_engine)


@pytest_asyncio.fixture
async def client(sync_db):
    def _override_get_db():
        yield sync_db

    dummy_user = User(
        id=1,
        username="admin",
        email="admin@example.com",
        is_active=True,
        is_superuser=True,
        business_id=1,
    )

    def _override_get_current_user(request=None):
        return dummy_user

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = _override_get_current_user
    app.dependency_overrides[get_current_user_optional] = _override_get_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def sample_employee(sync_db):
    dept = Department(name="Engineering & Tech", code="ENG", slug="engineering-tech", business_id=1)
    sync_db.add(dept)
    sync_db.flush()

    job = JobTitle(name="Principal Architect", department_id=dept.id, business_id=1)
    sync_db.add(job)
    sync_db.flush()

    emp = Employee(
        business_id=1,
        employee_id="EMP-9001",
        first_name="Taufiqur",
        last_name="Rahman",
        work_email="taufiq@example.com",
        phone="+8801711223344",
        department_id=dept.id,
        job_title_id=job.id,
        start_date=date(2023, 1, 1),
        is_active=True,
    )
    sync_db.add(emp)
    sync_db.commit()
    sync_db.refresh(emp)
    return emp


# ===========================================================================
# 1. Document Categories & Seeding
# ===========================================================================
@pytest.mark.asyncio
async def test_document_category_crud_and_seeding(client, sync_db):
    # GET categories should trigger auto-seeding of defaults
    res = await client.get("/documents/categories?business_id=1")
    assert res.status_code == 200
    cats = res.json()
    assert len(cats) >= 8
    nid_cat = next((c for c in cats if c["code"] == "NID_SMART"), None)
    assert nid_cat is not None
    assert nid_cat["is_mandatory"] is True

    # Create Custom Category
    payload = {
        "business_id": 1,
        "name": "Project Portfolio Documents",
        "code": "PROJ_PORTFOLIO",
        "description": "Architectural diagrams and design artifacts",
        "is_mandatory": False,
        "has_expiry": False,
        "confidentiality_level": "internal",
        "allowed_extensions": "pdf,png,zip",
        "max_file_size_mb": 25,
        "is_active": True,
    }
    create_res = await client.post("/documents/categories", json=payload)
    assert create_res.status_code == 201
    custom_id = create_res.json()["id"]

    # Update Custom Category
    update_res = await client.put(f"/documents/categories/{custom_id}", json={"max_file_size_mb": 30})
    assert update_res.status_code == 200
    assert update_res.json()["max_file_size_mb"] == 30

    # Delete Custom Category
    del_res = await client.delete(f"/documents/categories/{custom_id}")
    assert del_res.status_code == 204


# ===========================================================================
# 2. Document Templates & Merge Token Processor
# ===========================================================================
@pytest.mark.asyncio
async def test_document_template_and_preview(client, sync_db, sample_employee):
    # List auto-seeded templates
    res = await client.get("/documents/templates?business_id=1")
    assert res.status_code == 200
    templates = res.json()
    assert len(templates) >= 3

    tpl_id = templates[0]["id"]

    # Preview Template with Employee Tokens
    preview_req = {
        "template_id": tpl_id,
        "employee_id": str(sample_employee.id),
        "custom_tokens": {"gross_salary": "BDT 150,000"},
    }
    preview_res = await client.post("/documents/templates/preview", json=preview_req)
    assert preview_res.status_code == 200
    preview_data = preview_res.json()
    assert "Taufiqur Rahman" in preview_data["rendered_subject"] or "Taufiqur Rahman" in preview_data["rendered_html"]


# ===========================================================================
# 3. Employee Document Upload, Verification & Dossier Scorecard
# ===========================================================================
@pytest.mark.asyncio
async def test_employee_document_dossier_scorecard(client, sync_db, sample_employee):
    # Fetch categories
    cat_res = await client.get("/documents/categories?business_id=1")
    cats = cat_res.json()
    nid_cat = next(c for c in cats if c["code"] == "NID_SMART")
    tin_cat = next(c for c in cats if c["code"] == "ETIN_CERT")

    # Initial Dossier Summary (completeness should be 0%)
    summary_res = await client.get(f"/documents/dossier/summary/{sample_employee.id}?business_id=1")
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["completeness_percentage"] == 0.0

    # Upload NID
    nid_payload = {
        "business_id": 1,
        "employee_id": str(sample_employee.id),
        "category_id": nid_cat["id"],
        "document_title": "National ID Smart Card",
        "document_number": "1990123456",
        "file_url": "/uploads/documents/nid.pdf",
        "file_name": "nid.pdf",
        "file_size_bytes": 102400,
        "mime_type": "application/pdf",
        "confidentiality_level": "confidential",
    }
    doc_res = await client.post("/documents/dossier", json=nid_payload)
    assert doc_res.status_code == 201
    doc_id = doc_res.json()["id"]

    # Verify Document
    verify_res = await client.put(
        f"/documents/dossier/{doc_id}/verify",
        json={"status": "verified"},
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["verification_status"] == "verified"

    # Completeness percentage should now be positive
    summary_after = (await client.get(f"/documents/dossier/summary/{sample_employee.id}?business_id=1")).json()
    assert summary_after["completed_mandatory_categories"] >= 1
    assert summary_after["completeness_percentage"] > 0.0


# ===========================================================================
# 4. Identity Records Validation & Expiry Alerts
# ===========================================================================
@pytest.mark.asyncio
async def test_identity_records_and_expiry_alerts(client, sync_db, sample_employee):
    # Validation failure: 9 digits Smart NID (invalid)
    inv_nid = {
        "business_id": 1,
        "employee_id": str(sample_employee.id),
        "identity_type": "nid_smart_card",
        "document_number": "123456789",  # 9 digits -> invalid
        "issuing_country": "Bangladesh",
    }
    res_bad = await client.post("/documents/identity-records", json=inv_nid)
    assert res_bad.status_code == 400

    # Valid Smart NID (10 digits)
    val_nid = {
        "business_id": 1,
        "employee_id": str(sample_employee.id),
        "identity_type": "nid_smart_card",
        "document_number": "1234567890",  # 10 digits
        "issuing_country": "Bangladesh",
    }
    res_good = await client.post("/documents/identity-records", json=val_nid)
    assert res_good.status_code == 201

    # Add Expiring Passport (expires in 20 days)
    exp_date = (date.today() + timedelta(days=20)).isoformat()
    passport_data = {
        "business_id": 1,
        "employee_id": str(sample_employee.id),
        "identity_type": "passport",
        "document_number": "A09876543",
        "issuing_country": "Bangladesh",
        "issue_date": (date.today() - timedelta(days=365 * 4)).isoformat(),
        "expiry_date": exp_date,
        "alert_threshold_days": 30,
    }
    pass_res = await client.post("/documents/identity-records", json=passport_data)
    assert pass_res.status_code == 201

    # Trigger Expiry Scan
    scan_res = await client.post("/documents/expiry-alerts/scan?business_id=1")
    assert scan_res.status_code == 200
    assert scan_res.json()["alerts_recorded"] >= 1

    # List Alerts
    alerts = (await client.get("/documents/expiry-alerts?business_id=1")).json()
    assert len(alerts) >= 1
    alert_item = alerts[0]
    assert alert_item["days_remaining"] <= 20

    # Update Alert Renewal Tracking
    up_alert = await client.put(
        f"/documents/expiry-alerts/{alert_item['id']}",
        json={
            "renewal_status": "in_progress",
            "tracking_reference": "GOVT-PASSPORT-APP-9988",
            "notes": "Submitted application to Agargaon Passport Office.",
        },
    )
    assert up_alert.status_code == 200
    assert up_alert.json()["renewal_status"] == "in_progress"


# ===========================================================================
# 5. Employee Agreements & Contract Renewal
# ===========================================================================
@pytest.mark.asyncio
async def test_employee_agreement_lifecycle_and_renewal(client, sync_db, sample_employee):
    start = date.today().isoformat()
    end = (date.today() + timedelta(days=365)).isoformat()

    agreement_data = {
        "business_id": 1,
        "employee_id": str(sample_employee.id),
        "agreement_type": "fixed_term_contract",
        "reference_no": "AGR-2026-001",
        "title": "Fixed Term Employment Contract",
        "start_date": start,
        "end_date": end,
        "notice_period_days": 60,
        "probation_months": 3,
        "bond_amount": 50000.0,
        "governing_law": "Bangladesh Labour Act 2006",
        "status": "active",
    }
    res = await client.post("/documents/agreements", json=agreement_data)
    assert res.status_code == 201
    agr_id = res.json()["id"]

    # Renew Agreement
    new_start = (date.today() + timedelta(days=366)).isoformat()
    new_end = (date.today() + timedelta(days=730)).isoformat()
    renew_res = await client.post(
        f"/documents/agreements/{agr_id}/renew",
        json={"new_start_date": new_start, "new_end_date": new_end, "new_reference_no": "AGR-2027-001"},
    )
    assert renew_res.status_code == 200
    new_agr = renew_res.json()
    assert new_agr["reference_no"] == "AGR-2027-001"
    assert new_agr["status"] == "active"

    # Check original agreement is marked renewed
    orig_agr = (await client.get(f"/documents/agreements/{agr_id}")).json()
    assert orig_agr["status"] == "renewed"


# ===========================================================================
# 6. Bulk Letter Generation
# ===========================================================================
@pytest.mark.asyncio
async def test_bulk_letter_generation(client, sync_db, sample_employee):
    # Fetch template
    templates = (await client.get("/documents/templates?business_id=1")).json()
    confirm_tpl = next((t for t in templates if t["template_type"] == "confirmation"), templates[0])

    job_data = {
        "business_id": 1,
        "job_type": "confirmation",
        "template_id": confirm_tpl["id"],
        "batch_title": "Q4 Probation Confirmation Batch",
        "reference_prefix": "HR/CONF",
        "issue_date": date.today().isoformat(),
        "employee_ids": [str(sample_employee.id)],
    }
    gen_res = await client.post("/documents/bulk-letters/generate", json=job_data)
    assert gen_res.status_code == 201
    job = gen_res.json()
    assert job["successful_count"] == 1
    assert job["status"] == "completed"

    # List items
    items = (await client.get(f"/documents/bulk-letters/jobs/{job['id']}/items")).json()
    assert len(items) == 1
    assert "HR/CONF" in items[0]["reference_no"]
    assert items[0]["recipient_name"] == "Taufiqur Rahman"


# ===========================================================================
# 7. Digital Signature (ICT Act 2006 Compliant) & Audit Verification
# ===========================================================================
@pytest.mark.asyncio
async def test_digital_signature_and_certificate_verification(client, sync_db, sample_employee):
    sign_payload = {
        "business_id": 1,
        "employee_id": str(sample_employee.id),
        "document_content_to_hash": "I accept all terms of the employment agreement dated 2026-10-24.",
        "signature_mode": "drawn_canvas",
        "signature_image_base64_or_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "signer_full_name": "Taufiqur Rahman",
        "signer_email": "taufiq@example.com",
        "acknowledgement_text": "I hereby confirm that I have read, understood, and accept all the terms and conditions outlined in this document.",
    }

    sign_res = await client.post("/documents/signatures/sign", json=sign_payload)
    assert sign_res.status_code == 201
    ack = sign_res.json()
    assert ack["audit_certificate_no"].startswith("CERT-DOC-")
    assert len(ack["document_checksum_sha256"]) == 64  # SHA-256 length

    # Public Verification Endpoint
    cert_no = ack["audit_certificate_no"]
    verify_res = await client.get(f"/documents/signatures/verify/{cert_no}")
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["is_valid"] is True
    assert v_data["signer_full_name"] == "Taufiqur Rahman"
    assert v_data["document_checksum_sha256"] == ack["document_checksum_sha256"]
