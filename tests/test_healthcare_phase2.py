import uuid
import pytest
import pytest_asyncio
from datetime import date
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
    Appointment,
    AppointmentStatusEnum,
    CommissionStatusEnum,
    DayOfWeekEnum,
    DiagnosticDepartmentEnum,
    DiagnosticOrder,
    DiagnosticOrderItem,
    DiagnosticOrderStatusEnum,
    DiagnosticTest,
    DiagnosticTestParameter,
    DoctorProfile,
    DoctorScheduleSlot,
    LabTestResult,
    Patient,
    Prescription,
    ReferralDoctorCommission,
    ReportTemplateTypeEnum,
    ResultStatusEnum,
    VisitTypeEnum,
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

    biz = BusinessProfile(
        id=1,
        legal_name="Apex Healthcare Center",
        name_en="Apex Healthcare",
        cr_number="1234567890",
        vat_number="123456789012345",
    )
    db.add(biz)
    db.commit()

    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=sync_engine)


@pytest_asyncio.fixture
async def client(sync_db):
    def override_get_db():
        db = SyncTestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    dummy_user = User(
        id=uuid.uuid4(),
        email="admin@apexhealth.com",
        business_id=1,
        is_active=True,
        is_superuser=True,
    )

    def override_current_user(request=None):
        return dummy_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user_optional] = override_current_user
    app.dependency_overrides[get_current_user] = override_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_doctor_schedule_slots_and_appointments(client, sync_db):
    # 1. Create Patient
    pt_res = await client.post(
        "/api/v1/healthcare/patients",
        json={
            "business_id": 1,
            "full_name": "Rahim Uddin",
            "phone": "01700112233",
            "gender": "male",
        },
    )
    assert pt_res.status_code == 201
    patient_id = pt_res.json()["id"]

    # 2. Create Doctor
    doc_res = await client.post(
        "/api/v1/healthcare/doctors",
        json={
            "business_id": 1,
            "full_name": "Prof. Dr. Zahid Hasan",
            "specialization": "Cardiologist",
            "medical_degrees": "MBBS, FCPS (Cardiology)",
            "consultation_fee": "1200.00",
            "follow_up_fee": "600.00",
            "chamber_name": "Chamber 302",
        },
    )
    assert doc_res.status_code == 201
    doctor_id = doc_res.json()["id"]

    # 3. Add Schedule Slot
    slot_res = await client.post(
        f"/api/v1/healthcare/doctors/{doctor_id}/slots",
        json={
            "business_id": 1,
            "doctor_id": doctor_id,
            "day_of_week": "saturday",
            "start_time": "17:00",
            "end_time": "21:00",
            "max_patients": 25,
            "slot_duration_minutes": 15,
        },
    )
    assert slot_res.status_code == 201
    assert slot_res.json()["day_of_week"] == "saturday"

    # 4. Book 1st Appointment
    appt1_res = await client.post(
        "/api/v1/healthcare/appointments",
        json={
            "business_id": 1,
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "appointment_date": str(date.today()),
            "scheduled_time": "17:00",
            "visit_type": "new",
            "consultation_fee": "1200.00",
            "is_paid": True,
            "chief_complaints": "Chest discomfort and shortness of breath",
        },
    )
    assert appt1_res.status_code == 201
    appt1_data = appt1_res.json()
    assert appt1_data["serial_number"] == 1
    assert appt1_data["status"] == "booked"

    # 5. Book 2nd Appointment (Same doctor, same date -> Token #2)
    appt2_res = await client.post(
        "/api/v1/healthcare/appointments",
        json={
            "business_id": 1,
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "appointment_date": str(date.today()),
            "scheduled_time": "17:15",
            "visit_type": "follow_up",
            "consultation_fee": "600.00",
            "is_paid": False,
        },
    )
    assert appt2_res.status_code == 201
    assert appt2_res.json()["serial_number"] == 2

    # 6. Update status to checked_in
    patch_res = await client.put(
        f"/api/v1/healthcare/appointments/{appt1_data['id']}",
        json={"status": "checked_in"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "checked_in"


@pytest.mark.asyncio
async def test_doctor_prescription_builder(client, sync_db):
    # Setup Patient and Doctor
    pt_res = await client.post(
        "/api/v1/healthcare/patients",
        json={"business_id": 1, "full_name": "Nasima Begum", "phone": "01811223344", "gender": "female"},
    )
    assert pt_res.status_code == 201, f"Patient creation failed: {pt_res.status_code} - {pt_res.text}"
    doc_res = await client.post(
        "/api/v1/healthcare/doctors",
        json={
            "business_id": 1,
            "full_name": "Dr. Farhana Yasmin",
            "specialization": "Gynecologist",
            "medical_degrees": "MBBS, DGO",
        },
    )
    assert doc_res.status_code == 201, f"Doctor creation failed: {doc_res.status_code} - {doc_res.text}"
    patient_id = pt_res.json()["id"]
    doctor_id = doc_res.json()["id"]

    # Book Appointment
    appt_res = await client.post(
        "/api/v1/healthcare/appointments",
        json={
            "business_id": 1,
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "appointment_date": str(date.today()),
            "consultation_fee": "800.00",
        },
    )
    appt_id = appt_res.json()["id"]

    # Create Digital Prescription
    rx_payload = {
        "business_id": 1,
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "appointment_id": appt_id,
        "vitals": {
            "bp_systolic": 120,
            "bp_diastolic": 80,
            "pulse": 76,
            "temperature": 98.4,
            "spo2": 99,
            "weight_kg": 58.5,
            "height_cm": 158.0,
            "bmi": 23.4,
        },
        "clinical_findings": "Mild lower abdominal discomfort, no palpable masses.",
        "provisional_diagnosis": "Dysmenorrhea (N94.6)",
        "medicines": [
            {
                "drug_name": "Tab. Drotaverine 40mg",
                "dosage_form": "Tablet",
                "frequency": "1+0+1",
                "timing": "After meal",
                "duration": "3 days",
                "instructions": "Take only if severe pain persists",
            },
            {
                "drug_name": "Cap. Omeprazole 20mg",
                "dosage_form": "Capsule",
                "frequency": "1+0+1",
                "timing": "Before meal",
                "duration": "14 days",
            },
        ],
        "advised_investigations": ["USG of Lower Abdomen", "Urine R/M/E"],
        "special_advice": "Drink adequate water, avoid oily food, warm compress if needed.",
        "follow_up_date": str(date.today()),
    }

    rx_res = await client.post("/api/v1/healthcare/prescriptions", json=rx_payload)
    assert rx_res.status_code == 201
    rx_data = rx_res.json()
    assert rx_data["prescription_number"].startswith("RX-1-")
    assert len(rx_data["medicines"]) == 2
    assert rx_data["vitals"]["bp_systolic"] == 120

    # Verify Appointment was automatically updated to completed
    appt_check = await client.get(f"/api/v1/healthcare/appointments/{appt_id}")
    assert appt_check.json()["status"] == "completed"


@pytest.mark.asyncio
async def test_lis_technician_result_entry_and_pathologist_verification(client, sync_db):
    # Setup Patient, Doctor, and Test with Parameters
    pt_res = await client.post(
        "/api/v1/healthcare/patients",
        json={"business_id": 1, "full_name": "Tanvir Ahmed", "phone": "01999887766"},
    )
    patient_id = pt_res.json()["id"]

    test_res = await client.post(
        "/api/v1/healthcare/diagnostic-tests",
        json={
            "business_id": 1,
            "department": "hematology",
            "test_code": "CBC_DIFF",
            "name": "Complete Blood Count",
            "sale_price": "500.00",
            "sample_type": "EDTA Blood",
            "parameters": [
                {
                    "parameter_name": "Hemoglobin",
                    "unit": "g/dL",
                    "male_ref_range": "13.5 - 17.5",
                    "display_order": 1,
                },
                {
                    "parameter_name": "Total WBC",
                    "unit": "/cumm",
                    "male_ref_range": "4000 - 11000",
                    "display_order": 2,
                },
            ],
        },
    )
    test_id = test_res.json()["id"]

    # Checkout Order
    order_res = await client.post(
        "/api/v1/healthcare/orders/checkout",
        json={
            "business_id": 1,
            "patient_id": patient_id,
            "items": [{"test_id": test_id, "discount": "0.0"}],
            "paid_amount": "500.00",
        },
    )
    order_data = order_res.json()
    order_item_id = order_data["items"][0]["id"]

    # 1. Technician Enters Results (Hemoglobin low = 11.0, should auto-flag abnormal)
    entry_res = await client.post(
        "/api/v1/healthcare/lis/results/batch",
        json={
            "business_id": 1,
            "order_item_id": order_item_id,
            "technician_name": "Technologist Kabir",
            "results": [
                {
                    "parameter_name": "Hemoglobin",
                    "observed_value": "11.0",
                    "unit": "g/dL",
                    "ref_range": "13.5 - 17.5",
                },
                {
                    "parameter_name": "Total WBC",
                    "observed_value": "7200",
                    "unit": "/cumm",
                    "ref_range": "4000 - 11000",
                },
            ],
        },
    )
    assert entry_res.status_code == 200
    results = entry_res.json()
    assert len(results) == 2
    hb_res = next(r for r in results if r["parameter_name"] == "Hemoglobin")
    assert hb_res["is_abnormal"] is True
    wbc_res = next(r for r in results if r["parameter_name"] == "Total WBC")
    assert wbc_res["is_abnormal"] is False

    # 2. Consultant Pathologist Verifies Results
    verify_res = await client.post(
        f"/api/v1/healthcare/lis/order-items/{order_item_id}/verify",
        json={
            "verified_by_name": "Dr. M. S. Islam, MD (Pathology)",
            "remarks": "Microcytic hypochromic blood picture noted.",
        },
    )
    assert verify_res.status_code == 200
    verified = verify_res.json()
    assert all(r["result_status"] == "verified" for r in verified)
    assert verified[0]["verified_by_name"] == "Dr. M. S. Islam, MD (Pathology)"

    # 3. Check Order Status automatically completed
    order_check = await client.get(f"/api/v1/healthcare/diagnostic-orders/{order_data['id']}")
    assert order_check.json()["status"] == "completed"


@pytest.mark.asyncio
async def test_referral_doctor_commission_accrual_and_payout(client, sync_db):
    # Create Referring Doctor with 15% commission
    doc_res = await client.post(
        "/api/v1/healthcare/doctors",
        json={
            "business_id": 1,
            "full_name": "Dr. Anisur Rahman",
            "specialization": "General Practitioner",
            "medical_degrees": "MBBS",
            "is_referral_doctor": True,
            "referral_commission_rate": "15.00",
        },
    )
    doctor_id = doc_res.json()["id"]

    pt_res = await client.post(
        "/api/v1/healthcare/patients",
        json={"business_id": 1, "full_name": "Salma Khatun", "phone": "01788776655"},
    )
    patient_id = pt_res.json()["id"]

    test_res = await client.post(
        "/api/v1/healthcare/diagnostic-tests",
        json={
            "business_id": 1,
            "department": "biochemistry",
            "test_code": "LIPID_PROF",
            "name": "Lipid Profile Panel",
            "sale_price": "1000.00",
        },
    )
    test_id = test_res.json()["id"]

    # Checkout Order referred by Dr. Anisur Rahman
    order_res = await client.post(
        "/api/v1/healthcare/orders/checkout",
        json={
            "business_id": 1,
            "patient_id": patient_id,
            "referring_doctor_id": doctor_id,
            "items": [{"test_id": test_id, "discount": "0.0"}],
            "paid_amount": "1000.00",
        },
    )
    assert order_res.status_code == 201

    # Check Referral Commission Ledger
    comm_res = await client.get(f"/api/v1/healthcare/referrals/commissions?referring_doctor_id={doctor_id}")
    assert comm_res.status_code == 200
    comm_list = comm_res.json()
    assert len(comm_list) == 1
    commission = comm_list[0]
    # 15% of 1000.00 = 150.00
    assert Decimal(str(commission["commission_amount"])) == Decimal("150.00")
    assert commission["payment_status"] == "accrued"

    # Process Payout
    payout_res = await client.post(
        f"/api/v1/healthcare/referrals/commissions/{commission['id']}/payout",
        json={
            "payment_reference": "CHEQUE-445566",
            "notes": "Settled via monthly referral check",
        },
    )
    assert payout_res.status_code == 200
    payout_data = payout_res.json()
    assert payout_data["payment_status"] == "paid"
    assert payout_data["payment_reference"] == "CHEQUE-445566"
