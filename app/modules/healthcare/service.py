import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.tenancy.scoping import verify_record_ownership
from app.modules.healthcare.models import (
    Appointment,
    AppointmentStatusEnum,
    CommissionStatusEnum,
    DayOfWeekEnum,
    DiagnosticDepartmentEnum,
    DiagnosticOrder,
    DiagnosticOrderItem,
    DiagnosticOrderStatusEnum,
    DiagnosticSample,
    DiagnosticTest,
    DoctorProfile,
    DoctorScheduleSlot,
    LabTestResult,
    Patient,
    Prescription,
    RadiologyReport,
    ReferralDoctorCommission,
    ResultStatusEnum,
    SampleStatusEnum,
    VisitTypeEnum,
)
from app.modules.healthcare.repository import (
    AppointmentRepository,
    DiagnosticOrderRepository,
    DiagnosticSampleRepository,
    DiagnosticTestRepository,
    DoctorProfileRepository,
    DoctorScheduleSlotRepository,
    LabTestResultRepository,
    PatientRepository,
    PrescriptionRepository,
    RadiologyReportRepository,
    ReferralCommissionRepository,
)
from app.modules.healthcare.schemas import (
    AppointmentCreate,
    AppointmentUpdate,
    DiagnosticCheckoutRequest,
    DiagnosticSampleCollect,
    DiagnosticTestCreate,
    DiagnosticTestUpdate,
    DoctorProfileCreate,
    DoctorProfileUpdate,
    DoctorScheduleSlotCreate,
    LabResultBatchRequest,
    LabVerificationRequest,
    PatientCreate,
    PatientUpdate,
    PrescriptionCreate,
    PrescriptionUpdate,
    RadiologyReportCreate,
    RadiologyReportUpdate,
    ReferralPayoutRequest,
)


class PatientService:
    def __init__(self, repository: PatientRepository | None = None):
        self.repository = repository or PatientRepository()

    def get_patient(self, db: Session, patient_id: uuid.UUID, current_user=None) -> Patient:
        patient = self.repository.get_by_id(db, patient_id)
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient with id '{patient_id}' not found",
            )
        verify_record_ownership(patient, current_user)
        return patient

    def list_patients(
        self,
        db: Session,
        business_id: int | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 100,
        current_user=None,
    ) -> list[Patient]:
        bid = business_id
        if current_user and not current_user.is_superuser:
            bid = current_user.business_id
        return self.repository.get_all(db, business_id=bid, search=search, skip=skip, limit=limit)

    def register_patient(
        self, db: Session, data: PatientCreate, current_user=None
    ) -> Patient:
        bid = data.business_id
        if current_user and not current_user.is_superuser:
            bid = current_user.business_id
            data.business_id = bid

        # Generate unique UHID: UHID-{business_id}-{year}-{seq:06d}
        year = datetime.now(timezone.utc).year
        seq = self.repository.get_next_sequence(db, bid, year)
        uhid = f"UHID-{bid}-{year}-{seq:06d}"

        # Double check uniqueness
        while self.repository.get_by_uhid(db, bid, uhid):
            seq += 1
            uhid = f"UHID-{bid}-{year}-{seq:06d}"

        return self.repository.create(db, data, uhid=uhid)

    def update_patient(
        self, db: Session, patient_id: uuid.UUID, data: PatientUpdate, current_user=None
    ) -> Patient:
        patient = self.get_patient(db, patient_id, current_user=current_user)
        return self.repository.update(db, patient, data)

    def delete_patient(self, db: Session, patient_id: uuid.UUID, current_user=None) -> None:
        patient = self.get_patient(db, patient_id, current_user=current_user)
        self.repository.delete(db, patient)


class DoctorProfileService:
    def __init__(self, repository: DoctorProfileRepository | None = None):
        self.repository = repository or DoctorProfileRepository()

    def get_doctor(self, db: Session, doctor_id: uuid.UUID, current_user=None) -> DoctorProfile:
        doc = self.repository.get_by_id(db, doctor_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Doctor profile with id '{doctor_id}' not found",
            )
        verify_record_ownership(doc, current_user)
        return doc

    def list_doctors(
        self,
        db: Session,
        business_id: int | None = None,
        search: str | None = None,
        is_active: bool | None = None,
        skip: int = 0,
        limit: int = 100,
        current_user=None,
    ) -> list[DoctorProfile]:
        bid = business_id
        if current_user and not current_user.is_superuser:
            bid = current_user.business_id
        return self.repository.get_all(
            db, business_id=bid, search=search, is_active=is_active, skip=skip, limit=limit
        )

    def create_doctor(
        self, db: Session, data: DoctorProfileCreate, current_user=None
    ) -> DoctorProfile:
        if current_user and not current_user.is_superuser:
            data.business_id = current_user.business_id
        return self.repository.create(db, data)

    def update_doctor(
        self, db: Session, doctor_id: uuid.UUID, data: DoctorProfileUpdate, current_user=None
    ) -> DoctorProfile:
        doc = self.get_doctor(db, doctor_id, current_user=current_user)
        return self.repository.update(db, doc, data)

    def delete_doctor(self, db: Session, doctor_id: uuid.UUID, current_user=None) -> None:
        doc = self.get_doctor(db, doctor_id, current_user=current_user)
        self.repository.delete(db, doc)


class DiagnosticCatalogService:
    def __init__(self, repository: DiagnosticTestRepository | None = None):
        self.repository = repository or DiagnosticTestRepository()

    def get_test(self, db: Session, test_id: uuid.UUID, current_user=None) -> DiagnosticTest:
        test = self.repository.get_by_id(db, test_id)
        if not test:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Diagnostic test with id '{test_id}' not found",
            )
        verify_record_ownership(test, current_user)
        return test

    def list_tests(
        self,
        db: Session,
        business_id: int | None = None,
        department: DiagnosticDepartmentEnum | None = None,
        search: str | None = None,
        is_active: bool | None = None,
        skip: int = 0,
        limit: int = 100,
        current_user=None,
    ) -> list[DiagnosticTest]:
        bid = business_id
        if current_user and not current_user.is_superuser:
            bid = current_user.business_id
        return self.repository.get_all(
            db,
            business_id=bid,
            department=department,
            search=search,
            is_active=is_active,
            skip=skip,
            limit=limit,
        )

    def create_test(
        self, db: Session, data: DiagnosticTestCreate, current_user=None
    ) -> DiagnosticTest:
        bid = data.business_id
        if current_user and not current_user.is_superuser:
            bid = current_user.business_id
            data.business_id = bid

        existing = self.repository.get_by_code(db, bid, data.test_code)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Diagnostic test code '{data.test_code}' already exists in this organization",
            )
        return self.repository.create(db, data)

    def update_test(
        self, db: Session, test_id: uuid.UUID, data: DiagnosticTestUpdate, current_user=None
    ) -> DiagnosticTest:
        test = self.get_test(db, test_id, current_user=current_user)
        if data.test_code and data.test_code.upper() != test.test_code.upper():
            existing = self.repository.get_by_code(db, test.business_id, data.test_code)
            if existing and existing.id != test_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Test code '{data.test_code}' is already used by another test",
                )
        return self.repository.update(db, test, data)

    def delete_test(self, db: Session, test_id: uuid.UUID, current_user=None) -> None:
        test = self.get_test(db, test_id, current_user=current_user)
        self.repository.delete(db, test)


class DiagnosticOrderService:
    def __init__(
        self,
        order_repository: DiagnosticOrderRepository | None = None,
        test_repository: DiagnosticTestRepository | None = None,
        sample_repository: DiagnosticSampleRepository | None = None,
        patient_repository: PatientRepository | None = None,
        doctor_repository: DoctorProfileRepository | None = None,
    ):
        self.order_repository = order_repository or DiagnosticOrderRepository()
        self.test_repository = test_repository or DiagnosticTestRepository()
        self.sample_repository = sample_repository or DiagnosticSampleRepository()
        self.patient_repository = patient_repository or PatientRepository()
        self.doctor_repository = doctor_repository or DoctorProfileRepository()

    def get_order(self, db: Session, order_id: uuid.UUID, current_user=None) -> DiagnosticOrder:
        order = self.order_repository.get_by_id(db, order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Diagnostic order with id '{order_id}' not found",
            )
        verify_record_ownership(order, current_user)
        return order

    def list_orders(
        self,
        db: Session,
        business_id: int | None = None,
        patient_id: uuid.UUID | None = None,
        status: DiagnosticOrderStatusEnum | None = None,
        skip: int = 0,
        limit: int = 100,
        current_user=None,
    ) -> list[DiagnosticOrder]:
        bid = business_id
        if current_user and not current_user.is_superuser:
            bid = current_user.business_id
        return self.order_repository.get_all(
            db, business_id=bid, patient_id=patient_id, status=status, skip=skip, limit=limit
        )

    def checkout_order(
        self, db: Session, request: DiagnosticCheckoutRequest, current_user=None
    ) -> DiagnosticOrder:
        bid = request.business_id
        if current_user and not current_user.is_superuser:
            bid = current_user.business_id
            request.business_id = bid

        # 1. Validate Patient
        patient = self.patient_repository.get_by_id(db, request.patient_id)
        if not patient or patient.business_id != bid:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient with id '{request.patient_id}' not found",
            )

        # 2. Validate Referring Doctor (if provided)
        if request.referring_doctor_id:
            doctor = self.doctor_repository.get_by_id(db, request.referring_doctor_id)
            if not doctor or doctor.business_id != bid:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Referring doctor with id '{request.referring_doctor_id}' not found",
                )

        # 3. Generate Order Number: ORD-{business_id}-{year}-{seq:06d}
        year = datetime.now(timezone.utc).year
        seq = self.order_repository.get_next_sequence(db, bid, year)
        order_number = f"ORD-{bid}-{year}-{seq:06d}"
        while self.order_repository.get_by_number(db, bid, order_number):
            seq += 1
            order_number = f"ORD-{bid}-{year}-{seq:06d}"

        # 4. Process line items and compute totals
        total_bill = Decimal("0.0")
        total_discount = Decimal("0.0")
        order_items: list[DiagnosticOrderItem] = []
        sample_types_needed: set[str] = set()

        for item_req in request.items:
            test = self.test_repository.get_by_id(db, item_req.test_id)
            if not test or test.business_id != bid:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Diagnostic test with id '{item_req.test_id}' not found",
                )

            unit_price = Decimal(str(test.sale_price))
            item_disc = Decimal(str(item_req.discount or 0.0))
            if item_disc > unit_price:
                item_disc = unit_price
            net_item_price = unit_price - item_disc

            total_bill += unit_price
            total_discount += item_disc

            order_items.append(
                DiagnosticOrderItem(
                    test_id=test.id,
                    test_name=test.name,
                    test_code=test.test_code,
                    unit_price=unit_price,
                    discount=item_disc,
                    net_price=net_item_price,
                    status="pending",
                )
            )

            # Check if this test requires a specimen
            if test.sample_type and test.sample_type.strip().lower() not in ("none", "n/a", ""):
                sample_types_needed.add(test.sample_type.strip())

        net_amount = total_bill - total_discount
        paid_amount = Decimal(str(request.paid_amount or 0.0))
        if paid_amount > net_amount:
            paid_amount = net_amount
        due_amount = max(Decimal("0.0"), net_amount - paid_amount)

        # 5. Build DiagnosticOrder
        order = DiagnosticOrder(
            business_id=bid,
            order_number=order_number,
            patient_id=patient.id,
            referring_doctor_id=request.referring_doctor_id,
            status=DiagnosticOrderStatusEnum.ordered,
            total_bill=total_bill,
            discount_amount=total_discount,
            net_amount=net_amount,
            paid_amount=paid_amount,
            due_amount=due_amount,
            payment_method=request.payment_method,
            notes=request.notes,
            items=order_items,
        )

        # 6. Generate Diagnostic Samples for distinct required specimens
        sample_seq = self.sample_repository.get_next_sequence(db, bid, year)
        samples: list[DiagnosticSample] = []
        for st in sorted(sample_types_needed):
            barcode = f"SMP-{bid}-{year}-{sample_seq:06d}"
            while self.sample_repository.get_by_barcode(db, bid, barcode):
                sample_seq += 1
                barcode = f"SMP-{bid}-{year}-{sample_seq:06d}"

            samples.append(
                DiagnosticSample(
                    business_id=bid,
                    barcode=barcode,
                    sample_type=st,
                    status=SampleStatusEnum.pending,
                )
            )
            sample_seq += 1

        order.samples = samples

        # 7. Generate Referral Commission if referring doctor has referral commission rate
        if request.referring_doctor_id:
            doctor = self.doctor_repository.get_by_id(db, request.referring_doctor_id)
            if doctor and doctor.is_referral_doctor and doctor.referral_commission_rate > Decimal("0.0"):
                comm_pct = Decimal(str(doctor.referral_commission_rate))
                comm_amount = (net_amount * comm_pct) / Decimal("100.0")
                comm = ReferralDoctorCommission(
                    business_id=bid,
                    referring_doctor_id=doctor.id,
                    bill_amount=net_amount,
                    commission_rate=comm_pct,
                    commission_amount=comm_amount.quantize(Decimal("0.01")),
                    payment_status=CommissionStatusEnum.accrued,
                )
                order.referral_commissions = [comm]

        return self.order_repository.create(db, order)


class DiagnosticSampleService:
    def __init__(self, repository: DiagnosticSampleRepository | None = None):
        self.repository = repository or DiagnosticSampleRepository()

    def get_sample(self, db: Session, sample_id: uuid.UUID, current_user=None) -> DiagnosticSample:
        sample = self.repository.get_by_id(db, sample_id)
        if not sample:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Diagnostic sample with id '{sample_id}' not found",
            )
        verify_record_ownership(sample, current_user)
        return sample

    def list_samples(
        self,
        db: Session,
        business_id: int | None = None,
        order_id: uuid.UUID | None = None,
        status: SampleStatusEnum | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 100,
        current_user=None,
    ) -> list[DiagnosticSample]:
        bid = business_id
        if current_user and not current_user.is_superuser:
            bid = current_user.business_id
        return self.repository.get_all(
            db,
            business_id=bid,
            order_id=order_id,
            status=status,
            search=search,
            skip=skip,
            limit=limit,
        )

    def collect_sample(
        self,
        db: Session,
        sample_id: uuid.UUID,
        data: DiagnosticSampleCollect,
        current_user=None,
    ) -> DiagnosticSample:
        sample = self.get_sample(db, sample_id, current_user=current_user)
        return self.repository.update_collected(
            db, sample, collected_by_name=data.collected_by_name, notes=data.notes
        )


# ── Phase 2 Services ────────────────────────────────────────────────────────

class DoctorScheduleService:
    def __init__(self, repository: DoctorScheduleSlotRepository | None = None):
        self.repository = repository or DoctorScheduleSlotRepository()

    def list_slots(
        self, db: Session, doctor_id: uuid.UUID, is_active: bool | None = None
    ) -> list[DoctorScheduleSlot]:
        return self.repository.get_by_doctor(db, doctor_id, is_active=is_active)

    def create_slot(
        self, db: Session, data: DoctorScheduleSlotCreate, current_user=None
    ) -> DoctorScheduleSlot:
        if current_user and not current_user.is_superuser:
            data.business_id = current_user.business_id
        return self.repository.create(db, data)

    def delete_slot(self, db: Session, slot_id: uuid.UUID, current_user=None) -> None:
        slot = self.repository.get_by_id(db, slot_id)
        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Doctor schedule slot with id '{slot_id}' not found",
            )
        verify_record_ownership(slot, current_user)
        self.repository.delete(db, slot)


class AppointmentService:
    def __init__(
        self,
        repository: AppointmentRepository | None = None,
        doctor_repository: DoctorProfileRepository | None = None,
        patient_repository: PatientRepository | None = None,
    ):
        self.repository = repository or AppointmentRepository()
        self.doctor_repository = doctor_repository or DoctorProfileRepository()
        self.patient_repository = patient_repository or PatientRepository()

    def get_appointment(self, db: Session, appointment_id: uuid.UUID, current_user=None) -> Appointment:
        appt = self.repository.get_by_id(db, appointment_id)
        if not appt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Appointment with id '{appointment_id}' not found",
            )
        verify_record_ownership(appt, current_user)
        return appt

    def book_appointment(
        self, db: Session, data: AppointmentCreate, current_user=None
    ) -> Appointment:
        bid = data.business_id
        if current_user and not current_user.is_superuser:
            bid = current_user.business_id
            data.business_id = bid

        patient = self.patient_repository.get_by_id(db, data.patient_id)
        if not patient or patient.business_id != bid:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient with id '{data.patient_id}' not found",
            )

        doctor = self.doctor_repository.get_by_id(db, data.doctor_id)
        if not doctor or doctor.business_id != bid:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Doctor with id '{data.doctor_id}' not found",
            )

        serial = self.repository.get_next_serial(db, bid, doctor.id, data.appointment_date)
        return self.repository.create(db, data, serial_number=serial)

    def list_appointments(
        self,
        db: Session,
        business_id: int | None = None,
        doctor_id: uuid.UUID | None = None,
        patient_id: uuid.UUID | None = None,
        appointment_date=None,
        status: AppointmentStatusEnum | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 100,
        current_user=None,
    ) -> list[Appointment]:
        bid = business_id
        if current_user and not current_user.is_superuser:
            bid = current_user.business_id
        return self.repository.get_all(
            db,
            business_id=bid,
            doctor_id=doctor_id,
            patient_id=patient_id,
            appointment_date=appointment_date,
            status=status,
            search=search,
            skip=skip,
            limit=limit,
        )

    def update_appointment(
        self, db: Session, appointment_id: uuid.UUID, data: AppointmentUpdate, current_user=None
    ) -> Appointment:
        appt = self.get_appointment(db, appointment_id, current_user=current_user)
        return self.repository.update(db, appt, data)

    def delete_appointment(self, db: Session, appointment_id: uuid.UUID, current_user=None) -> None:
        appt = self.get_appointment(db, appointment_id, current_user=current_user)
        self.repository.delete(db, appt)


class PrescriptionService:
    def __init__(
        self,
        repository: PrescriptionRepository | None = None,
        appointment_repository: AppointmentRepository | None = None,
        patient_repository: PatientRepository | None = None,
        doctor_repository: DoctorProfileRepository | None = None,
    ):
        self.repository = repository or PrescriptionRepository()
        self.appointment_repository = appointment_repository or AppointmentRepository()
        self.patient_repository = patient_repository or PatientRepository()
        self.doctor_repository = doctor_repository or DoctorProfileRepository()

    def get_prescription(self, db: Session, prescription_id: uuid.UUID, current_user=None) -> Prescription:
        rx = self.repository.get_by_id(db, prescription_id)
        if not rx:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prescription with id '{prescription_id}' not found",
            )
        verify_record_ownership(rx, current_user)
        return rx

    def create_prescription(
        self, db: Session, data: PrescriptionCreate, current_user=None
    ) -> Prescription:
        bid = data.business_id
        if current_user and not current_user.is_superuser:
            bid = current_user.business_id
            data.business_id = bid

        patient = self.patient_repository.get_by_id(db, data.patient_id)
        if not patient or patient.business_id != bid:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient with id '{data.patient_id}' not found",
            )

        doctor = self.doctor_repository.get_by_id(db, data.doctor_id)
        if not doctor or doctor.business_id != bid:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Doctor with id '{data.doctor_id}' not found",
            )

        year = datetime.now(timezone.utc).year
        seq = self.repository.get_next_sequence(db, bid, year)
        rx_number = f"RX-{bid}-{year}-{seq:06d}"
        while self.repository.get_by_number(db, bid, rx_number):
            seq += 1
            rx_number = f"RX-{bid}-{year}-{seq:06d}"

        prescription = Prescription(
            **data.model_dump(),
            prescription_number=rx_number,
        )

        created_rx = self.repository.create(db, prescription)

        # If linked to an appointment, mark appointment as completed
        if data.appointment_id:
            appt = self.appointment_repository.get_by_id(db, data.appointment_id)
            if appt and appt.business_id == bid:
                appt.status = AppointmentStatusEnum.completed
                db.commit()

        return created_rx

    def list_prescriptions(
        self,
        db: Session,
        business_id: int | None = None,
        patient_id: uuid.UUID | None = None,
        doctor_id: uuid.UUID | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 100,
        current_user=None,
    ) -> list[Prescription]:
        bid = business_id
        if current_user and not current_user.is_superuser:
            bid = current_user.business_id
        return self.repository.get_all(
            db,
            business_id=bid,
            patient_id=patient_id,
            doctor_id=doctor_id,
            search=search,
            skip=skip,
            limit=limit,
        )

    def update_prescription(
        self, db: Session, prescription_id: uuid.UUID, data: PrescriptionUpdate, current_user=None
    ) -> Prescription:
        rx = self.get_prescription(db, prescription_id, current_user=current_user)
        return self.repository.update(db, rx, data)


class LISService:
    def __init__(
        self,
        repository: LabTestResultRepository | None = None,
        order_repository: DiagnosticOrderRepository | None = None,
    ):
        self.repository = repository or LabTestResultRepository()
        self.order_repository = order_repository or DiagnosticOrderRepository()

    def get_order_item_results(
        self, db: Session, order_item_id: uuid.UUID, current_user=None
    ) -> list[LabTestResult]:
        order_item = (
            db.query(DiagnosticOrderItem).filter(DiagnosticOrderItem.id == order_item_id).first()
        )
        if not order_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order item with id '{order_item_id}' not found",
            )
        order = self.order_repository.get_by_id(db, order_item.order_id)
        if order:
            verify_record_ownership(order, current_user)
        return self.repository.get_by_order_item(db, order_item_id)

    def batch_enter_results(
        self, db: Session, request: LabResultBatchRequest, current_user=None
    ) -> list[LabTestResult]:
        bid = request.business_id
        if current_user and not current_user.is_superuser:
            bid = current_user.business_id
            request.business_id = bid

        order_item = (
            db.query(DiagnosticOrderItem).filter(DiagnosticOrderItem.id == request.order_item_id).first()
        )
        if not order_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order item with id '{request.order_item_id}' not found",
            )
        order = self.order_repository.get_by_id(db, order_item.order_id)
        if not order or order.business_id != bid:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent diagnostic order not found for this item",
            )

        # Automatic reference range analysis
        for it in request.results:
            if it.ref_range and not it.is_abnormal:
                # Try parsing numeric range e.g. "12.0 - 15.5" or "10-20"
                parts = it.ref_range.replace("–", "-").split("-")
                if len(parts) == 2:
                    try:
                        low = float(parts[0].strip())
                        high = float(parts[1].strip())
                        val = float(it.observed_value.strip())
                        if val < low or val > high:
                            it.is_abnormal = True
                    except (ValueError, TypeError):
                        pass

        results = self.repository.batch_save(
            db,
            business_id=bid,
            order_id=order.id,
            order_item_id=order_item.id,
            technician_name=request.technician_name,
            items=request.results,
        )

        order_item.status = "reported"
        db.commit()
        return results

    def verify_results(
        self, db: Session, order_item_id: uuid.UUID, req: LabVerificationRequest, current_user=None
    ) -> list[LabTestResult]:
        order_item = (
            db.query(DiagnosticOrderItem).filter(DiagnosticOrderItem.id == order_item_id).first()
        )
        if not order_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order item with id '{order_item_id}' not found",
            )
        order = self.order_repository.get_by_id(db, order_item.order_id)
        if order:
            verify_record_ownership(order, current_user)

        verified_results = self.repository.verify_order_item_results(
            db, order_item_id, verified_by_name=req.verified_by_name, remarks=req.remarks
        )
        order_item.status = "verified"

        # Check if all items on the order are completed/verified
        all_items = (
            db.query(DiagnosticOrderItem)
            .filter(DiagnosticOrderItem.order_id == order_item.order_id)
            .all()
        )
        if all(i.status == "verified" for i in all_items):
            if order:
                order.status = DiagnosticOrderStatusEnum.completed

        db.commit()
        return verified_results


class RadiologyService:
    def __init__(
        self,
        repository: RadiologyReportRepository | None = None,
        order_repository: DiagnosticOrderRepository | None = None,
    ):
        self.repository = repository or RadiologyReportRepository()
        self.order_repository = order_repository or DiagnosticOrderRepository()

    def get_report(self, db: Session, order_item_id: uuid.UUID, current_user=None) -> RadiologyReport | None:
        order_item = (
            db.query(DiagnosticOrderItem).filter(DiagnosticOrderItem.id == order_item_id).first()
        )
        if not order_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order item with id '{order_item_id}' not found",
            )
        order = self.order_repository.get_by_id(db, order_item.order_id)
        if order:
            verify_record_ownership(order, current_user)
        return self.repository.get_by_order_item(db, order_item_id)

    def save_report(
        self, db: Session, data: RadiologyReportCreate, current_user=None
    ) -> RadiologyReport:
        bid = data.business_id
        if current_user and not current_user.is_superuser:
            bid = current_user.business_id
            data.business_id = bid

        order_item = (
            db.query(DiagnosticOrderItem).filter(DiagnosticOrderItem.id == data.order_item_id).first()
        )
        if not order_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order item with id '{data.order_item_id}' not found",
            )
        order = self.order_repository.get_by_id(db, order_item.order_id)
        if not order or order.business_id != bid:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent diagnostic order not found for this item",
            )

        report = self.repository.create_or_update(db, data)
        order_item.status = "reported"
        db.commit()
        return report

    def verify_report(
        self, db: Session, order_item_id: uuid.UUID, verified_by_name: str, current_user=None
    ) -> RadiologyReport:
        report = self.get_report(db, order_item_id, current_user=current_user)
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Radiology report has not been written yet",
            )

        verified = self.repository.verify_report(db, report, verified_by_name=verified_by_name)
        order_item = (
            db.query(DiagnosticOrderItem).filter(DiagnosticOrderItem.id == order_item_id).first()
        )
        if order_item:
            order_item.status = "verified"

            all_items = (
                db.query(DiagnosticOrderItem)
                .filter(DiagnosticOrderItem.order_id == order_item.order_id)
                .all()
            )
            if all(i.status == "verified" for i in all_items):
                order = self.order_repository.get_by_id(db, order_item.order_id)
                if order:
                    order.status = DiagnosticOrderStatusEnum.completed

        db.commit()
        return verified


class ReferralCommissionService:
    def __init__(self, repository: ReferralCommissionRepository | None = None):
        self.repository = repository or ReferralCommissionRepository()

    def list_commissions(
        self,
        db: Session,
        business_id: int | None = None,
        referring_doctor_id: uuid.UUID | None = None,
        status: CommissionStatusEnum | None = None,
        skip: int = 0,
        limit: int = 100,
        current_user=None,
    ) -> list[ReferralDoctorCommission]:
        bid = business_id
        if current_user and not current_user.is_superuser:
            bid = current_user.business_id
        return self.repository.get_all(
            db,
            business_id=bid,
            referring_doctor_id=referring_doctor_id,
            payment_status=status,
            skip=skip,
            limit=limit,
        )

    def record_payout(
        self, db: Session, commission_id: uuid.UUID, data: ReferralPayoutRequest, current_user=None
    ) -> ReferralDoctorCommission:
        comm = self.repository.get_by_id(db, commission_id)
        if not comm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Referral commission with id '{commission_id}' not found",
            )
        verify_record_ownership(comm, current_user)
        return self.repository.record_payout(
            db, comm, payment_reference=data.payment_reference, notes=data.notes
        )


# Singletons
patient_service = PatientService()
doctor_service = DoctorProfileService()
doctor_schedule_service = DoctorScheduleService()
appointment_service = AppointmentService()
prescription_service = PrescriptionService()
diagnostic_catalog_service = DiagnosticCatalogService()
diagnostic_order_service = DiagnosticOrderService()
diagnostic_sample_service = DiagnosticSampleService()
lis_service = LISService()
radiology_service = RadiologyService()
referral_commission_service = ReferralCommissionService()
