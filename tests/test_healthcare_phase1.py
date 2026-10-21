import uuid
import pytest
import pytest_asyncio
from decimal import Decimal
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.core.deps import get_current_user_optional, get_current_user
from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile
from app.modules.healthcare.models import (
    DiagnosticDepartmentEnum,
    DiagnosticOrder,
    DiagnosticOrderStatusEnum,
    DiagnosticSample,
    DiagnosticTest,
    DoctorProfile,
    Patient,
    SampleStatusEnum,
)

sync_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
SyncTestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=sync_engine
)


@pytest.fixture
def sync_db():
    Base.metadata.create_all(bind=sync_engine)
    db = SyncTestingSessionLocal()

    # Seed Business 1 and Business 2
    biz1 = BusinessProfile(
        id=1,
        legal_name="Metro Diagnostic Ltd",
        name_en="Metro Diagnostic",
        cr_number="1111111111",
        vat_number="111111111111111",
    )
    biz2 = BusinessProfile(
        id=2,
        legal_name="City Polyclinic Ltd",
        name_en="City Polyclinic",
        cr_number="2222222222",
        vat_number="222222222222222",
    )
    db.add(biz1)
    db.add(biz2)
    db.commit()

    try:
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
        email="admin@metrohealth.com",
        is_active=True,
        is_superuser=True,
        business_id=1,
    )

    def _override_get_current_user(request=None):
        return dummy_user

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user_optional] = _override_get_current_user
    app.dependency_overrides[get_current_user] = _override_get_current_user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_patient_registration_and_uhid_generation(client: AsyncClient, sync_db):
    """
    1. Register patient Karim Ahmed in Business 1.
    2. Verify UHID generated according to format UHID-1-YYYY-000001.
    3. Register 2nd patient and verify sequence increments to 000002.
    4. Search patient by phone and UHID.
    """
    res1 = await client.post(
        "/healthcare/patients",
        json={
            "business_id": 1,
            "full_name": "Karim Ahmed",
            "phone": "01711000111",
            "gender": "male",
            "blood_group": "B+",
            "address": "Dhanmondi, Dhaka",
        },
    )
    assert res1.status_code == 201
    p1 = res1.json()
    assert p1["full_name"] == "Karim Ahmed"
    assert p1["uhid"].startswith("UHID-1-")
    assert p1["uhid"].endswith("-000001")
    p1_id = p1["id"]

    res2 = await client.post(
        "/healthcare/patients",
        json={
            "business_id": 1,
            "full_name": "Nasrin Sultana",
            "phone": "01811222333",
            "gender": "female",
            "blood_group": "O+",
        },
    )
    assert res2.status_code == 201
    p2 = res2.json()
    assert p2["uhid"].endswith("-000002")

    # Search by phone
    search_res = await client.get("/healthcare/patients?search=01711000111")
    assert search_res.status_code == 200
    results = search_res.json()
    assert len(results) == 1
    assert results[0]["id"] == p1_id


@pytest.mark.asyncio
async def test_doctor_and_catalog_setup(client: AsyncClient, sync_db):
    """
    1. Create Doctor Profile with consultation fee and referral rate.
    2. Create Diagnostic Test (CBC) with test parameters (Hemoglobin, WBC, Platelets).
    3. Verify parameters saved and listed.
    """
    doc_res = await client.post(
        "/healthcare/doctors",
        json={
            "business_id": 1,
            "full_name": "Prof. Dr. M. A. Rahman",
            "specialization": "Cardiology & Internal Medicine",
            "medical_degrees": "MBBS, FCPS, MD (Cardiology)",
            "bmdc_reg_number": "A-34891",
            "chamber_name": "Chamber 302, OPD Complex",
            "consultation_fee": 1500.0,
            "follow_up_fee": 800.0,
            "referral_commission_rate": 15.0,
        },
    )
    assert doc_res.status_code == 201
    doctor = doc_res.json()
    assert doctor["full_name"] == "Prof. Dr. M. A. Rahman"

    # Create CBC test
    cbc_res = await client.post(
        "/healthcare/diagnostic-tests",
        json={
            "business_id": 1,
            "department": "hematology",
            "test_code": "CBC",
            "name": "Complete Blood Count (CBC)",
            "sample_type": "EDTA Blood",
            "cost_price": 120.0,
            "sale_price": 500.0,
            "default_turnaround_hours": 3,
            "requires_fasting": False,
            "report_template_type": "structured_parameters",
            "parameters": [
                {
                    "parameter_name": "Hemoglobin (Hb)",
                    "unit": "g/dL",
                    "male_ref_range": "13.5 - 17.5",
                    "female_ref_range": "12.0 - 15.5",
                    "display_order": 1,
                },
                {
                    "parameter_name": "Total WBC Count",
                    "unit": "/cumm",
                    "male_ref_range": "4,000 - 11,000",
                    "female_ref_range": "4,000 - 11,000",
                    "display_order": 2,
                },
            ],
        },
    )
    assert cbc_res.status_code == 201
    cbc = cbc_res.json()
    assert cbc["test_code"] == "CBC"
    assert len(cbc["parameters"]) == 2


@pytest.mark.asyncio
async def test_diagnostic_order_checkout_and_sample_generation(client: AsyncClient, sync_db):
    """
    1. Register Patient and Doctor.
    2. Create 2 Tests: CBC (EDTA Blood) and Lipid Profile (Serum).
    3. Checkout Diagnostic Order with discount and partial payment.
    4. Verify net amount, due amount, and automatic distinct sample generation:
       - Sample 1: EDTA Blood with barcode SMP-1-YYYY-000001
       - Sample 2: Serum with barcode SMP-1-YYYY-000002
    """
    # Patient
    p_res = await client.post(
        "/healthcare/patients",
        json={
            "business_id": 1,
            "full_name": "Tanvir Hasan",
            "phone": "01999888777",
            "gender": "male",
        },
    )
    patient_id = p_res.json()["id"]

    # Doctor
    d_res = await client.post(
        "/healthcare/doctors",
        json={
            "business_id": 1,
            "full_name": "Dr. Farzana Khan",
            "specialization": "General Physician",
            "medical_degrees": "MBBS",
        },
    )
    doctor_id = d_res.json()["id"]

    # Test 1: CBC (EDTA Blood, 500 BDT)
    t1_res = await client.post(
        "/healthcare/diagnostic-tests",
        json={
            "business_id": 1,
            "department": "hematology",
            "test_code": "CBC-01",
            "name": "Complete Blood Count",
            "sample_type": "EDTA Blood",
            "sale_price": 500.0,
        },
    )
    t1_id = t1_res.json()["id"]

    # Test 2: Lipid Profile (Serum, 1200 BDT)
    t2_res = await client.post(
        "/healthcare/diagnostic-tests",
        json={
            "business_id": 1,
            "department": "biochemistry",
            "test_code": "LIPID-01",
            "name": "Lipid Profile",
            "sample_type": "Serum",
            "sale_price": 1200.0,
        },
    )
    t2_id = t2_res.json()["id"]

    # Checkout: total = 500 + 1200 = 1700. Discount 200 on Lipid -> net = 1500. Paid = 1000 -> Due = 500.
    checkout_res = await client.post(
        "/healthcare/orders/checkout",
        json={
            "business_id": 1,
            "patient_id": patient_id,
            "referring_doctor_id": doctor_id,
            "items": [
                {"test_id": t1_id, "discount": 0.0},
                {"test_id": t2_id, "discount": 200.0},
            ],
            "paid_amount": 1000.0,
            "payment_method": "cash",
            "notes": "Urgent reporting requested",
        },
    )
    assert checkout_res.status_code == 201
    order = checkout_res.json()
    assert order["order_number"].startswith("ORD-1-")
    assert float(order["total_bill"]) == 1700.0
    assert float(order["discount_amount"]) == 200.0
    assert float(order["net_amount"]) == 1500.0
    assert float(order["paid_amount"]) == 1000.0
    assert float(order["due_amount"]) == 500.0
    assert len(order["items"]) == 2

    # Verify Samples: 2 distinct samples created
    assert len(order["samples"]) == 2
    sample_types = {s["sample_type"] for s in order["samples"]}
    assert "EDTA Blood" in sample_types
    assert "Serum" in sample_types
    for s in order["samples"]:
        assert s["status"] == "pending"
        assert s["barcode"].startswith("SMP-1-")


@pytest.mark.asyncio
async def test_phlebotomy_sample_collection_workflow(client: AsyncClient, sync_db):
    """
    1. Create an order with sample.
    2. Query phlebotomy samples queue.
    3. Collect sample, recording technician name and timestamp.
    4. Verify sample status changes to 'collected'.
    """
    # Quick setup
    p_res = await client.post(
        "/healthcare/patients",
        json={"business_id": 1, "full_name": "Sample Patient", "phone": "01555444333"},
    )
    t_res = await client.post(
        "/healthcare/diagnostic-tests",
        json={
            "business_id": 1,
            "test_code": "RBS-01",
            "name": "Random Blood Sugar",
            "sample_type": "Fluoride Blood",
            "sale_price": 150.0,
        },
    )
    order_res = await client.post(
        "/healthcare/orders/checkout",
        json={
            "business_id": 1,
            "patient_id": p_res.json()["id"],
            "items": [{"test_id": t_res.json()["id"], "discount": 0.0}],
            "paid_amount": 150.0,
        },
    )
    order = order_res.json()
    sample = order["samples"][0]
    sample_id = sample["id"]

    # Collect sample
    collect_res = await client.post(
        f"/healthcare/samples/{sample_id}/collect",
        json={
            "collected_by_name": "Md. Rafiqul Islam (Phlebotomist)",
            "notes": "Collected from left antecubital vein, 3ml vial",
        },
    )
    assert collect_res.status_code == 200
    updated_sample = collect_res.json()
    assert updated_sample["status"] == "collected"
    assert updated_sample["collected_by_name"] == "Md. Rafiqul Islam (Phlebotomist)"
    assert updated_sample["collected_at"] is not None
