import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.database import get_db
from app.modules.healthcare.models import (
    AppointmentStatusEnum,
    CommissionStatusEnum,
    DiagnosticDepartmentEnum,
    DiagnosticOrderStatusEnum,
    SampleStatusEnum,
)
from app.modules.healthcare.schemas import (
    AppointmentCreate,
    AppointmentOut,
    AppointmentUpdate,
    DiagnosticCheckoutRequest,
    DiagnosticOrderOut,
    DiagnosticSampleCollect,
    DiagnosticSampleOut,
    DiagnosticTestCreate,
    DiagnosticTestOut,
    DiagnosticTestUpdate,
    DoctorProfileCreate,
    DoctorProfileOut,
    DoctorProfileUpdate,
    DoctorScheduleSlotCreate,
    DoctorScheduleSlotOut,
    LabResultBatchRequest,
    LabTestResultOut,
    LabVerificationRequest,
    PatientCreate,
    PatientOut,
    PatientUpdate,
    PrescriptionCreate,
    PrescriptionOut,
    PrescriptionUpdate,
    RadiologyReportCreate,
    RadiologyReportOut,
    ReferralDoctorCommissionOut,
    ReferralPayoutRequest,
)
from app.modules.healthcare.service import (
    appointment_service,
    diagnostic_catalog_service,
    diagnostic_order_service,
    diagnostic_sample_service,
    doctor_schedule_service,
    doctor_service,
    lis_service,
    patient_service,
    prescription_service,
    radiology_service,
    referral_commission_service,
)

router = APIRouter(prefix="/healthcare", tags=["Healthcare"])


# ── Patient Registry (MPI) ──────────────────────────────────────────────────
@router.get("/patients", response_model=list[PatientOut])
def list_patients(
    business_id: int | None = Query(None),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "patients", "view")),
):
    resolved_bid = resolve_business_id(current_user, business_id)
    return patient_service.list_patients(
        db,
        business_id=resolved_bid,
        search=search,
        skip=skip,
        limit=limit,
        current_user=current_user,
    )


@router.post("/patients", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def register_patient(
    patient_data: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "patients", "create")),
):
    if current_user and not current_user.is_superuser:
        patient_data.business_id = current_user.business_id
    return patient_service.register_patient(db, patient_data, current_user=current_user)


@router.get("/patients/{patient_id}", response_model=PatientOut)
def get_patient(
    patient_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "patients", "view")),
):
    return patient_service.get_patient(db, patient_id, current_user=current_user)


@router.put("/patients/{patient_id}", response_model=PatientOut)
def update_patient(
    patient_id: uuid.UUID,
    patient_data: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "patients", "update")),
):
    return patient_service.update_patient(
        db, patient_id, patient_data, current_user=current_user
    )


@router.delete("/patients/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "patients", "delete")),
):
    patient_service.delete_patient(db, patient_id, current_user=current_user)


# ── Doctor Profiles & Chambers ──────────────────────────────────────────────
@router.get("/doctors", response_model=list[DoctorProfileOut])
def list_doctors(
    business_id: int | None = Query(None),
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "doctors", "view")),
):
    resolved_bid = resolve_business_id(current_user, business_id)
    return doctor_service.list_doctors(
        db,
        business_id=resolved_bid,
        search=search,
        is_active=is_active,
        skip=skip,
        limit=limit,
        current_user=current_user,
    )


@router.post("/doctors", response_model=DoctorProfileOut, status_code=status.HTTP_201_CREATED)
def create_doctor(
    doctor_data: DoctorProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "doctors", "create")),
):
    if current_user and not current_user.is_superuser:
        doctor_data.business_id = current_user.business_id
    return doctor_service.create_doctor(db, doctor_data, current_user=current_user)


@router.get("/doctors/{doctor_id}", response_model=DoctorProfileOut)
def get_doctor(
    doctor_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "doctors", "view")),
):
    return doctor_service.get_doctor(db, doctor_id, current_user=current_user)


@router.put("/doctors/{doctor_id}", response_model=DoctorProfileOut)
def update_doctor(
    doctor_id: uuid.UUID,
    doctor_data: DoctorProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "doctors", "update")),
):
    return doctor_service.update_doctor(
        db, doctor_id, doctor_data, current_user=current_user
    )


@router.delete("/doctors/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor(
    doctor_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "doctors", "delete")),
):
    doctor_service.delete_doctor(db, doctor_id, current_user=current_user)


# ── Diagnostic Catalog (Tests & Parameters) ─────────────────────────────────
@router.get("/diagnostic-tests", response_model=list[DiagnosticTestOut])
def list_diagnostic_tests(
    business_id: int | None = Query(None),
    department: DiagnosticDepartmentEnum | None = Query(None),
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "diagnostic_catalog", "view")),
):
    resolved_bid = resolve_business_id(current_user, business_id)
    return diagnostic_catalog_service.list_tests(
        db,
        business_id=resolved_bid,
        department=department,
        search=search,
        is_active=is_active,
        skip=skip,
        limit=limit,
        current_user=current_user,
    )


@router.post("/diagnostic-tests", response_model=DiagnosticTestOut, status_code=status.HTTP_201_CREATED)
def create_diagnostic_test(
    test_data: DiagnosticTestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "diagnostic_catalog", "create")),
):
    if current_user and not current_user.is_superuser:
        test_data.business_id = current_user.business_id
    return diagnostic_catalog_service.create_test(db, test_data, current_user=current_user)


@router.get("/diagnostic-tests/{test_id}", response_model=DiagnosticTestOut)
def get_diagnostic_test(
    test_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "diagnostic_catalog", "view")),
):
    return diagnostic_catalog_service.get_test(db, test_id, current_user=current_user)


@router.put("/diagnostic-tests/{test_id}", response_model=DiagnosticTestOut)
def update_diagnostic_test(
    test_id: uuid.UUID,
    test_data: DiagnosticTestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "diagnostic_catalog", "update")),
):
    return diagnostic_catalog_service.update_test(
        db, test_id, test_data, current_user=current_user
    )


@router.delete("/diagnostic-tests/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_diagnostic_test(
    test_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "diagnostic_catalog", "delete")),
):
    diagnostic_catalog_service.delete_test(db, test_id, current_user=current_user)


# ── Diagnostic Orders (Counter Billing / Booking) ───────────────────────────
@router.get("/diagnostic-orders", response_model=list[DiagnosticOrderOut])
def list_diagnostic_orders(
    business_id: int | None = Query(None),
    patient_id: uuid.UUID | None = Query(None),
    status: DiagnosticOrderStatusEnum | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "diagnostic_billing", "view")),
):
    resolved_bid = resolve_business_id(current_user, business_id)
    return diagnostic_order_service.list_orders(
        db,
        business_id=resolved_bid,
        patient_id=patient_id,
        status=status,
        skip=skip,
        limit=limit,
        current_user=current_user,
    )


@router.post("/orders/checkout", response_model=DiagnosticOrderOut, status_code=status.HTTP_201_CREATED)
def checkout_diagnostic_order(
    checkout_data: DiagnosticCheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "diagnostic_billing", "create")),
):
    if current_user and not current_user.is_superuser:
        checkout_data.business_id = current_user.business_id
    return diagnostic_order_service.checkout_order(
        db, checkout_data, current_user=current_user
    )


@router.get("/diagnostic-orders/{order_id}", response_model=DiagnosticOrderOut)
def get_diagnostic_order(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "diagnostic_billing", "view")),
):
    return diagnostic_order_service.get_order(db, order_id, current_user=current_user)


# ── Phlebotomy & Sample Worklist ────────────────────────────────────────────
@router.get("/samples", response_model=list[DiagnosticSampleOut])
def list_samples(
    business_id: int | None = Query(None),
    order_id: uuid.UUID | None = Query(None),
    status: SampleStatusEnum | None = Query(None),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "phlebotomy", "view")),
):
    resolved_bid = resolve_business_id(current_user, business_id)
    return diagnostic_sample_service.list_samples(
        db,
        business_id=resolved_bid,
        order_id=order_id,
        status=status,
        search=search,
        skip=skip,
        limit=limit,
        current_user=current_user,
    )


@router.post("/samples/{sample_id}/collect", response_model=DiagnosticSampleOut)
def collect_sample(
    sample_id: uuid.UUID,
    data: DiagnosticSampleCollect,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "phlebotomy", "update")),
):
    return diagnostic_sample_service.collect_sample(
        db, sample_id, data, current_user=current_user
    )


# ── Doctor OPD Chamber Schedule Slots ───────────────────────────────────────
@router.get("/doctors/{doctor_id}/slots", response_model=list[DoctorScheduleSlotOut])
def list_doctor_slots(
    doctor_id: uuid.UUID,
    is_active: bool | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "doctors", "view")),
):
    return doctor_schedule_service.list_slots(db, doctor_id, is_active=is_active)


@router.post("/doctors/{doctor_id}/slots", response_model=DoctorScheduleSlotOut, status_code=status.HTTP_201_CREATED)
def create_doctor_slot(
    doctor_id: uuid.UUID,
    slot_data: DoctorScheduleSlotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "doctors", "update")),
):
    slot_data.doctor_id = doctor_id
    return doctor_schedule_service.create_slot(db, slot_data, current_user=current_user)


@router.delete("/doctor-slots/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor_slot(
    slot_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "doctors", "delete")),
):
    doctor_schedule_service.delete_slot(db, slot_id, current_user=current_user)


# ── OPD Appointments & Queue Management ─────────────────────────────────────
@router.get("/appointments", response_model=list[AppointmentOut])
def list_appointments(
    business_id: int | None = Query(None),
    doctor_id: uuid.UUID | None = Query(None),
    patient_id: uuid.UUID | None = Query(None),
    appointment_date=Query(None),
    status: AppointmentStatusEnum | None = Query(None),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "appointments", "view")),
):
    resolved_bid = resolve_business_id(current_user, business_id)
    return appointment_service.list_appointments(
        db,
        business_id=resolved_bid,
        doctor_id=doctor_id,
        patient_id=patient_id,
        appointment_date=appointment_date,
        status=status,
        search=search,
        skip=skip,
        limit=limit,
        current_user=current_user,
    )


@router.post("/appointments", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def book_appointment(
    data: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "appointments", "create")),
):
    if current_user and not current_user.is_superuser:
        data.business_id = current_user.business_id
    return appointment_service.book_appointment(db, data, current_user=current_user)


@router.get("/appointments/{appointment_id}", response_model=AppointmentOut)
def get_appointment(
    appointment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "appointments", "view")),
):
    return appointment_service.get_appointment(db, appointment_id, current_user=current_user)


@router.put("/appointments/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    appointment_id: uuid.UUID,
    data: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "appointments", "update")),
):
    return appointment_service.update_appointment(db, appointment_id, data, current_user=current_user)


@router.delete("/appointments/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(
    appointment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "appointments", "delete")),
):
    appointment_service.delete_appointment(db, appointment_id, current_user=current_user)


# ── Prescriptions (EMR) ─────────────────────────────────────────────────────
@router.get("/prescriptions", response_model=list[PrescriptionOut])
def list_prescriptions(
    business_id: int | None = Query(None),
    patient_id: uuid.UUID | None = Query(None),
    doctor_id: uuid.UUID | None = Query(None),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "appointments", "view")),
):
    resolved_bid = resolve_business_id(current_user, business_id)
    return prescription_service.list_prescriptions(
        db,
        business_id=resolved_bid,
        patient_id=patient_id,
        doctor_id=doctor_id,
        search=search,
        skip=skip,
        limit=limit,
        current_user=current_user,
    )


@router.post("/prescriptions", response_model=PrescriptionOut, status_code=status.HTTP_201_CREATED)
def create_prescription(
    data: PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "appointments", "create")),
):
    if current_user and not current_user.is_superuser:
        data.business_id = current_user.business_id
    return prescription_service.create_prescription(db, data, current_user=current_user)


@router.get("/prescriptions/{prescription_id}", response_model=PrescriptionOut)
def get_prescription(
    prescription_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "appointments", "view")),
):
    return prescription_service.get_prescription(db, prescription_id, current_user=current_user)


@router.put("/prescriptions/{prescription_id}", response_model=PrescriptionOut)
def update_prescription(
    prescription_id: uuid.UUID,
    data: PrescriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "appointments", "update")),
):
    return prescription_service.update_prescription(db, prescription_id, data, current_user=current_user)


# ── Laboratory Information System (LIS) Results ─────────────────────────────
@router.get("/lis/order-items/{order_item_id}/results", response_model=list[LabTestResultOut])
def get_order_item_results(
    order_item_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "lis_worklist", "view")),
):
    return lis_service.get_order_item_results(db, order_item_id, current_user=current_user)


@router.post("/lis/results/batch", response_model=list[LabTestResultOut])
def batch_enter_lab_results(
    data: LabResultBatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "lis_worklist", "update")),
):
    if current_user and not current_user.is_superuser:
        data.business_id = current_user.business_id
    return lis_service.batch_enter_results(db, data, current_user=current_user)


@router.post("/lis/order-items/{order_item_id}/verify", response_model=list[LabTestResultOut])
def verify_lab_results(
    order_item_id: uuid.UUID,
    req: LabVerificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "verification", "update")),
):
    return lis_service.verify_results(db, order_item_id, req, current_user=current_user)


# ── Radiology & Imaging Reports ─────────────────────────────────────────────
@router.get("/radiology/order-items/{order_item_id}", response_model=RadiologyReportOut | None)
def get_radiology_report(
    order_item_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "radiology", "view")),
):
    return radiology_service.get_report(db, order_item_id, current_user=current_user)


@router.post("/radiology/reports", response_model=RadiologyReportOut)
def save_radiology_report(
    data: RadiologyReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "radiology", "create")),
):
    if current_user and not current_user.is_superuser:
        data.business_id = current_user.business_id
    return radiology_service.save_report(db, data, current_user=current_user)


@router.post("/radiology/order-items/{order_item_id}/verify", response_model=RadiologyReportOut)
def verify_radiology_report(
    order_item_id: uuid.UUID,
    req: LabVerificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "radiology", "update")),
):
    return radiology_service.verify_report(
        db, order_item_id, verified_by_name=req.verified_by_name, current_user=current_user
    )


# ── Referral Doctor Commissions ─────────────────────────────────────────────
@router.get("/referrals/commissions", response_model=list[ReferralDoctorCommissionOut])
def list_referral_commissions(
    business_id: int | None = Query(None),
    referring_doctor_id: uuid.UUID | None = Query(None),
    status: CommissionStatusEnum | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "referrals", "view")),
):
    resolved_bid = resolve_business_id(current_user, business_id)
    return referral_commission_service.list_commissions(
        db,
        business_id=resolved_bid,
        referring_doctor_id=referring_doctor_id,
        status=status,
        skip=skip,
        limit=limit,
        current_user=current_user,
    )


@router.post("/referrals/commissions/{commission_id}/payout", response_model=ReferralDoctorCommissionOut)
def record_referral_payout(
    commission_id: uuid.UUID,
    data: ReferralPayoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("healthcare", "referrals", "update")),
):
    return referral_commission_service.record_payout(
        db, commission_id, data, current_user=current_user
    )
