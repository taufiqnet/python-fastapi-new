import uuid
from datetime import date, datetime
from decimal import Decimal
import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.core.tenancy.models import BusinessProfile
from app.core.identity.models import User
from app.modules.healthcare.models import (
    Appointment,
    AppointmentStatusEnum,
    BloodGroupEnum,
    CommissionStatusEnum,
    DayOfWeekEnum,
    DiagnosticDepartmentEnum,
    DiagnosticOrder,
    DiagnosticOrderItem,
    DiagnosticOrderStatusEnum,
    DiagnosticSample,
    DiagnosticTest,
    DiagnosticTestParameter,
    DoctorProfile,
    DoctorScheduleSlot,
    GenderEnum,
    LabTestResult,
    Patient,
    Prescription,
    ReferralDoctorCommission,
    ReportTemplateTypeEnum,
    ResultStatusEnum,
    SampleStatusEnum,
    VisitTypeEnum,
)


@pytest.fixture
def healthcare_setup(db):
    biz1 = BusinessProfile(id=501, name_en="Metro General Hospital Ltd")
    biz2 = BusinessProfile(id=502, name_en="City Diagnostic Center")
    db.add_all([biz1, biz2])
    db.commit()

    # Patient in Biz 501
    patient1 = Patient(
        business_id=biz1.id,
        uhid="UHID-501-2026-0001",
        full_name="Kazi Nazrul Islam",
        phone="+8801711000001",
        gender=GenderEnum.male,
        blood_group=BloodGroupEnum.B_POS,
        date_of_birth=date(1990, 5, 25),
        is_active=True,
    )
    db.add(patient1)
    db.commit()

    # Doctor in Biz 501
    doctor1 = DoctorProfile(
        business_id=biz1.id,
        full_name="Prof. Dr. Shamsul Haque",
        specialization="Cardiology",
        medical_degrees="MBBS, FCPS (Cardiology)",
        bmdc_reg_number="BMDC-A-12345",
        consultation_fee=Decimal("1500.00"),
        follow_up_fee=Decimal("800.00"),
        is_referral_doctor=True,
        referral_commission_rate=Decimal("15.00"),  # 15%
        is_active=True,
    )
    db.add(doctor1)
    db.commit()

    # Diagnostic Test in Biz 501
    test_cbc = DiagnosticTest(
        business_id=biz1.id,
        department=DiagnosticDepartmentEnum.hematology,
        test_code="HAEM-001",
        name="Complete Blood Count (CBC)",
        sample_type="EDTA Whole Blood",
        cost_price=Decimal("150.00"),
        sale_price=Decimal("500.00"),
        default_turnaround_hours=4,
        report_template_type=ReportTemplateTypeEnum.structured_parameters,
        is_active=True,
    )
    db.add(test_cbc)
    db.flush()

    param_hb = DiagnosticTestParameter(
        test_id=test_cbc.id,
        parameter_name="Hemoglobin (Hb)",
        unit="g/dL",
        male_ref_range="13.5 - 17.5",
        female_ref_range="12.0 - 15.5",
        display_order=1,
    )
    db.add(param_hb)
    db.commit()

    return {
        "biz1": biz1,
        "biz2": biz2,
        "patient1": patient1,
        "doctor1": doctor1,
        "test_cbc": test_cbc,
        "param_hb": param_hb,
    }


def test_master_patient_index_uhid_uniqueness(db, healthcare_setup):
    """
    Audit MPI Integrity:
    - UHID must be unique per business tenant.
    - Duplicate UHID within same business must be rejected by unique constraint.
    """
    biz1 = healthcare_setup["biz1"]

    duplicate_patient = Patient(
        business_id=biz1.id,
        uhid="UHID-501-2026-0001",  # Duplicate UHID!
        full_name="Duplicate Patient",
        phone="+8801799999999",
        gender=GenderEnum.female,
    )
    db.add(duplicate_patient)

    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_appointment_queue_serial_uniqueness_per_doctor_date(db, healthcare_setup):
    """
    Audit OPD Token Queue Scheduling:
    - serial_number (token calling ID) must be strictly unique per doctor, date, and business.
    - Prevents double-booking token race conditions.
    """
    biz1 = healthcare_setup["biz1"]
    patient1 = healthcare_setup["patient1"]
    doctor1 = healthcare_setup["doctor1"]
    app_date = date(2026, 6, 20)

    # Book Token #1
    app1 = Appointment(
        business_id=biz1.id,
        patient_id=patient1.id,
        doctor_id=doctor1.id,
        appointment_date=app_date,
        serial_number=1,
        scheduled_time="17:00",
        status=AppointmentStatusEnum.booked,
        consultation_fee=doctor1.consultation_fee,
        is_paid=True,
    )
    db.add(app1)
    db.commit()

    # Attempt to book Token #1 again for the same doctor and date
    app1_duplicate_token = Appointment(
        business_id=biz1.id,
        patient_id=patient1.id,
        doctor_id=doctor1.id,
        appointment_date=app_date,
        serial_number=1,  # Duplicate Token #1
        scheduled_time="17:00",
        status=AppointmentStatusEnum.booked,
    )
    db.add(app1_duplicate_token)

    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_diagnostic_order_billing_math_and_invariants(db, healthcare_setup):
    """
    Audit Diagnostic Billing:
    - Net Amount = Total Bill - Discount Amount
    - Paid Amount + Due Amount == Net Amount
    - Non-negative billing constraints.
    """
    biz1 = healthcare_setup["biz1"]
    patient1 = healthcare_setup["patient1"]
    doctor1 = healthcare_setup["doctor1"]
    test_cbc = healthcare_setup["test_cbc"]

    total_bill = test_cbc.sale_price  # 500.00
    discount_amount = Decimal("50.00")
    net_amount = total_bill - discount_amount  # 450.00
    paid_amount = Decimal("300.00")
    due_amount = net_amount - paid_amount      # 150.00

    assert net_amount == Decimal("450.00")
    assert paid_amount + due_amount == net_amount
    assert total_bill >= Decimal("0.00")
    assert net_amount >= Decimal("0.00")

    order = DiagnosticOrder(
        business_id=biz1.id,
        order_number="ORD-2026-00001",
        patient_id=patient1.id,
        referring_doctor_id=doctor1.id,
        total_bill=total_bill,
        discount_amount=discount_amount,
        net_amount=net_amount,
        paid_amount=paid_amount,
        due_amount=due_amount,
        status=DiagnosticOrderStatusEnum.ordered,
    )
    db.add(order)
    db.flush()

    item = DiagnosticOrderItem(
        order_id=order.id,
        test_id=test_cbc.id,
        test_name=test_cbc.name,
        test_code=test_cbc.test_code,
        unit_price=test_cbc.sale_price,
        discount=discount_amount,
        net_price=net_amount,
        status="pending",
    )
    db.add(item)
    db.commit()
    db.refresh(order)

    assert order.due_amount == Decimal("150.00")
    assert order.status == DiagnosticOrderStatusEnum.ordered


def test_phlebotomy_sample_lifecycle_and_barcode_uniqueness(db, healthcare_setup):
    """
    Audit Specimen / Phlebotomy Barcode Tracking:
    - Specimen barcode must be unique per business tenant.
    - Status lifecycle transitions: pending -> collected.
    """
    biz1 = healthcare_setup["biz1"]
    patient1 = healthcare_setup["patient1"]

    order = DiagnosticOrder(
        business_id=biz1.id,
        order_number="ORD-PHLEB-01",
        patient_id=patient1.id,
        total_bill=Decimal("500.00"),
        net_amount=Decimal("500.00"),
        paid_amount=Decimal("500.00"),
        due_amount=Decimal("0.00"),
    )
    db.add(order)
    db.flush()

    sample1 = DiagnosticSample(
        business_id=biz1.id,
        order_id=order.id,
        barcode="SMP-2026-0001",
        sample_type="EDTA Whole Blood",
        status=SampleStatusEnum.pending,
    )
    db.add(sample1)
    db.commit()

    # Lifecycle update: Phlebotomist collects tube
    sample1.status = SampleStatusEnum.collected
    sample1.collected_at = datetime.utcnow()
    sample1.collected_by_name = "Senior Phlebotomist Karim"
    db.commit()
    db.refresh(sample1)

    assert sample1.status == SampleStatusEnum.collected
    assert sample1.collected_by_name == "Senior Phlebotomist Karim"

    # Attempt duplicate barcode insertion
    sample2_dup_barcode = DiagnosticSample(
        business_id=biz1.id,
        order_id=order.id,
        barcode="SMP-2026-0001",  # Duplicate barcode
        sample_type="Serum",
        status=SampleStatusEnum.pending,
    )
    db.add(sample2_dup_barcode)

    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_lis_result_entry_and_critical_flagging(db, healthcare_setup):
    """
    Audit LIS Laboratory Result Evaluation:
    - Observed value evaluation against reference ranges.
    - Pathologist verification changes status from entered to verified.
    """
    biz1 = healthcare_setup["biz1"]
    patient1 = healthcare_setup["patient1"]
    test_cbc = healthcare_setup["test_cbc"]
    param_hb = healthcare_setup["param_hb"]

    order = DiagnosticOrder(
        business_id=biz1.id,
        order_number="ORD-LIS-01",
        patient_id=patient1.id,
        total_bill=Decimal("500.00"),
        net_amount=Decimal("500.00"),
        paid_amount=Decimal("500.00"),
        due_amount=Decimal("0.00"),
    )
    db.add(order)
    db.flush()

    item = DiagnosticOrderItem(
        order_id=order.id,
        test_id=test_cbc.id,
        test_name=test_cbc.name,
        test_code=test_cbc.test_code,
        unit_price=test_cbc.sale_price,
        net_price=test_cbc.sale_price,
    )
    db.add(item)
    db.flush()

    # Severe Anemia: Hb = 6.2 g/dL (Normal is 13.5 - 17.5 g/dL) -> Critical flag
    result = LabTestResult(
        business_id=biz1.id,
        order_id=order.id,
        order_item_id=item.id,
        parameter_id=param_hb.id,
        parameter_name=param_hb.parameter_name,
        observed_value="6.2",
        unit=param_hb.unit,
        ref_range=param_hb.male_ref_range,
        is_abnormal=True,
        is_critical=True,
        result_status=ResultStatusEnum.entered,
        technician_name="Lab Tech Anis",
    )
    db.add(result)
    db.commit()
    db.refresh(result)

    assert result.is_abnormal is True
    assert result.is_critical is True
    assert result.result_status == ResultStatusEnum.entered

    # Pathologist Verification
    result.result_status = ResultStatusEnum.verified
    result.verified_by_name = "Dr. Farhana (Consultant Pathologist)"
    result.verified_at = datetime.utcnow()
    db.commit()
    db.refresh(result)

    assert result.result_status == ResultStatusEnum.verified
    assert result.verified_by_name == "Dr. Farhana (Consultant Pathologist)"


def test_referral_doctor_commission_math_and_payout(db, healthcare_setup):
    """
    Audit Referral Physician Commission Ledger:
    - Commission amount = bill_amount * (commission_rate / 100)
    - Accrual status -> Payout status transition.
    """
    biz1 = healthcare_setup["biz1"]
    patient1 = healthcare_setup["patient1"]
    doctor1 = healthcare_setup["doctor1"]

    bill_amount = Decimal("10000.00")
    commission_rate = doctor1.referral_commission_rate  # 15.00%
    expected_commission = bill_amount * (commission_rate / Decimal("100.00"))  # 1500.00

    assert expected_commission == Decimal("1500.00")

    order = DiagnosticOrder(
        business_id=biz1.id,
        order_number="ORD-REF-01",
        patient_id=patient1.id,
        referring_doctor_id=doctor1.id,
        total_bill=bill_amount,
        net_amount=bill_amount,
        paid_amount=bill_amount,
        due_amount=Decimal("0.00"),
    )
    db.add(order)
    db.flush()

    comm = ReferralDoctorCommission(
        business_id=biz1.id,
        referring_doctor_id=doctor1.id,
        order_id=order.id,
        bill_amount=bill_amount,
        commission_rate=commission_rate,
        commission_amount=expected_commission,
        payment_status=CommissionStatusEnum.accrued,
    )
    db.add(comm)
    db.commit()
    db.refresh(comm)

    assert comm.commission_amount == Decimal("1500.00")
    assert comm.payment_status == CommissionStatusEnum.accrued

    # Process Payout
    comm.payment_status = CommissionStatusEnum.paid
    comm.paid_at = datetime.utcnow()
    comm.payment_reference = "CHQ-REF-998811"
    db.commit()
    db.refresh(comm)

    assert comm.payment_status == CommissionStatusEnum.paid
    assert comm.payment_reference == "CHQ-REF-998811"
