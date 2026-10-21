import uuid
from datetime import datetime, timezone
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

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
    DiagnosticTestParameter,
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
from app.modules.healthcare.schemas import (
    AppointmentCreate,
    AppointmentUpdate,
    DiagnosticTestCreate,
    DiagnosticTestParameterCreate,
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
)


# ── Patient Repository ──────────────────────────────────────────────────────
class PatientRepository:
    def get_by_id(self, db: Session, patient_id: uuid.UUID) -> Patient | None:
        return db.query(Patient).filter(Patient.id == patient_id).first()

    def get_by_uhid(self, db: Session, business_id: int, uhid: str) -> Patient | None:
        return (
            db.query(Patient)
            .filter(Patient.business_id == business_id, Patient.uhid == uhid.strip())
            .first()
        )

    def get_by_phone(self, db: Session, business_id: int, phone: str) -> Patient | None:
        return (
            db.query(Patient)
            .filter(Patient.business_id == business_id, Patient.phone == phone.strip())
            .first()
        )

    def get_all(
        self,
        db: Session,
        business_id: int | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Patient]:
        query = db.query(Patient)
        if business_id is not None:
            query = query.filter(Patient.business_id == business_id)

        if search:
            q = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(Patient.full_name).like(q),
                    func.lower(Patient.uhid).like(q),
                    Patient.phone.like(q),
                    Patient.national_id.like(q),
                )
            )

        return query.order_by(Patient.created_at.desc()).offset(skip).limit(limit).all()

    def get_next_sequence(self, db: Session, business_id: int, year: int) -> int:
        prefix = f"UHID-{business_id}-{year}-"
        count = (
            db.query(func.count(Patient.id))
            .filter(Patient.business_id == business_id, Patient.uhid.like(f"{prefix}%"))
            .scalar()
            or 0
        )
        return count + 1

    def create(self, db: Session, data: PatientCreate, uhid: str) -> Patient:
        patient_data = data.model_dump()
        patient = Patient(**patient_data, uhid=uhid)
        db.add(patient)
        db.commit()
        db.refresh(patient)
        return patient

    def update(self, db: Session, patient: Patient, data: PatientUpdate) -> Patient:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(patient, key, value)
        db.commit()
        db.refresh(patient)
        return patient

    def delete(self, db: Session, patient: Patient) -> None:
        db.delete(patient)
        db.commit()


# ── Doctor Profile Repository ───────────────────────────────────────────────
class DoctorProfileRepository:
    def get_by_id(self, db: Session, doctor_id: uuid.UUID) -> DoctorProfile | None:
        return db.query(DoctorProfile).filter(DoctorProfile.id == doctor_id).first()

    def get_all(
        self,
        db: Session,
        business_id: int | None = None,
        search: str | None = None,
        is_active: bool | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[DoctorProfile]:
        query = db.query(DoctorProfile)
        if business_id is not None:
            query = query.filter(DoctorProfile.business_id == business_id)
        if is_active is not None:
            query = query.filter(DoctorProfile.is_active == is_active)

        if search:
            q = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(DoctorProfile.full_name).like(q),
                    func.lower(DoctorProfile.specialization).like(q),
                    func.lower(DoctorProfile.chamber_name).like(q),
                )
            )

        return query.order_by(DoctorProfile.full_name.asc()).offset(skip).limit(limit).all()

    def create(self, db: Session, data: DoctorProfileCreate) -> DoctorProfile:
        doc = DoctorProfile(**data.model_dump())
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc

    def update(self, db: Session, doc: DoctorProfile, data: DoctorProfileUpdate) -> DoctorProfile:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(doc, key, value)
        db.commit()
        db.refresh(doc)
        return doc

    def delete(self, db: Session, doc: DoctorProfile) -> None:
        db.delete(doc)
        db.commit()


# ── Diagnostic Catalog Repository ───────────────────────────────────────────
class DiagnosticTestRepository:
    def get_by_id(self, db: Session, test_id: uuid.UUID) -> DiagnosticTest | None:
        return db.query(DiagnosticTest).filter(DiagnosticTest.id == test_id).first()

    def get_by_code(self, db: Session, business_id: int, code: str) -> DiagnosticTest | None:
        return (
            db.query(DiagnosticTest)
            .filter(
                DiagnosticTest.business_id == business_id,
                func.upper(DiagnosticTest.test_code) == code.strip().upper(),
            )
            .first()
        )

    def get_all(
        self,
        db: Session,
        business_id: int | None = None,
        department: DiagnosticDepartmentEnum | None = None,
        search: str | None = None,
        is_active: bool | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[DiagnosticTest]:
        query = db.query(DiagnosticTest)
        if business_id is not None:
            query = query.filter(DiagnosticTest.business_id == business_id)
        if department is not None:
            query = query.filter(DiagnosticTest.department == department)
        if is_active is not None:
            query = query.filter(DiagnosticTest.is_active == is_active)

        if search:
            q = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(DiagnosticTest.name).like(q),
                    func.lower(DiagnosticTest.test_code).like(q),
                    func.lower(DiagnosticTest.category_name).like(q),
                )
            )

        return query.order_by(DiagnosticTest.name.asc()).offset(skip).limit(limit).all()

    def create(self, db: Session, data: DiagnosticTestCreate) -> DiagnosticTest:
        test_data = data.model_dump(exclude={"parameters"})
        test = DiagnosticTest(**test_data)
        db.add(test)
        db.flush()

        if data.parameters:
            for p in data.parameters:
                param = DiagnosticTestParameter(**p.model_dump(), test_id=test.id)
                db.add(param)

        db.commit()
        db.refresh(test)
        return test

    def update(self, db: Session, test: DiagnosticTest, data: DiagnosticTestUpdate) -> DiagnosticTest:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(test, key, value)
        db.commit()
        db.refresh(test)
        return test

    def delete(self, db: Session, test: DiagnosticTest) -> None:
        db.delete(test)
        db.commit()


# ── Diagnostic Order Repository ─────────────────────────────────────────────
class DiagnosticOrderRepository:
    def get_by_id(self, db: Session, order_id: uuid.UUID) -> DiagnosticOrder | None:
        return db.query(DiagnosticOrder).filter(DiagnosticOrder.id == order_id).first()

    def get_by_number(self, db: Session, business_id: int, order_number: str) -> DiagnosticOrder | None:
        return (
            db.query(DiagnosticOrder)
            .filter(
                DiagnosticOrder.business_id == business_id,
                DiagnosticOrder.order_number == order_number.strip(),
            )
            .first()
        )

    def get_all(
        self,
        db: Session,
        business_id: int | None = None,
        patient_id: uuid.UUID | None = None,
        status: DiagnosticOrderStatusEnum | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[DiagnosticOrder]:
        query = db.query(DiagnosticOrder)
        if business_id is not None:
            query = query.filter(DiagnosticOrder.business_id == business_id)
        if patient_id is not None:
            query = query.filter(DiagnosticOrder.patient_id == patient_id)
        if status is not None:
            query = query.filter(DiagnosticOrder.status == status)

        return query.order_by(DiagnosticOrder.created_at.desc()).offset(skip).limit(limit).all()

    def get_next_sequence(self, db: Session, business_id: int, year: int) -> int:
        prefix = f"ORD-{business_id}-{year}-"
        count = (
            db.query(func.count(DiagnosticOrder.id))
            .filter(DiagnosticOrder.business_id == business_id, DiagnosticOrder.order_number.like(f"{prefix}%"))
            .scalar()
            or 0
        )
        return count + 1

    def create(self, db: Session, order: DiagnosticOrder) -> DiagnosticOrder:
        db.add(order)
        db.commit()
        db.refresh(order)
        return order


# ── Diagnostic Sample Repository ────────────────────────────────────────────
class DiagnosticSampleRepository:
    def get_by_id(self, db: Session, sample_id: uuid.UUID) -> DiagnosticSample | None:
        return db.query(DiagnosticSample).filter(DiagnosticSample.id == sample_id).first()

    def get_by_barcode(self, db: Session, business_id: int, barcode: str) -> DiagnosticSample | None:
        return (
            db.query(DiagnosticSample)
            .filter(
                DiagnosticSample.business_id == business_id,
                DiagnosticSample.barcode == barcode.strip(),
            )
            .first()
        )

    def get_all(
        self,
        db: Session,
        business_id: int | None = None,
        order_id: uuid.UUID | None = None,
        status: SampleStatusEnum | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[DiagnosticSample]:
        query = db.query(DiagnosticSample)
        if business_id is not None:
            query = query.filter(DiagnosticSample.business_id == business_id)
        if order_id is not None:
            query = query.filter(DiagnosticSample.order_id == order_id)
        if status is not None:
            query = query.filter(DiagnosticSample.status == status)
        if search:
            q = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(DiagnosticSample.barcode).like(q),
                    func.lower(DiagnosticSample.sample_type).like(q),
                    func.lower(DiagnosticSample.collected_by_name).like(q),
                )
            )

        return query.order_by(DiagnosticSample.created_at.desc()).offset(skip).limit(limit).all()

    def get_next_sequence(self, db: Session, business_id: int, year: int) -> int:
        prefix = f"SMP-{business_id}-{year}-"
        count = (
            db.query(func.count(DiagnosticSample.id))
            .filter(DiagnosticSample.business_id == business_id, DiagnosticSample.barcode.like(f"{prefix}%"))
            .scalar()
            or 0
        )
        return count + 1

    def update_collected(
        self,
        db: Session,
        sample: DiagnosticSample,
        collected_by_name: str,
        notes: str | None = None,
    ) -> DiagnosticSample:
        sample.status = SampleStatusEnum.collected
        sample.collected_at = datetime.now(timezone.utc)
        sample.collected_by_name = collected_by_name
        if notes:
            sample.notes = notes
        db.commit()
        db.refresh(sample)
        return sample


# ── Doctor Schedule Slot Repository ─────────────────────────────────────────
class DoctorScheduleSlotRepository:
    def get_by_id(self, db: Session, slot_id: uuid.UUID) -> DoctorScheduleSlot | None:
        return db.query(DoctorScheduleSlot).filter(DoctorScheduleSlot.id == slot_id).first()

    def get_by_doctor(
        self, db: Session, doctor_id: uuid.UUID, is_active: bool | None = None
    ) -> list[DoctorScheduleSlot]:
        query = db.query(DoctorScheduleSlot).filter(DoctorScheduleSlot.doctor_id == doctor_id)
        if is_active is not None:
            query = query.filter(DoctorScheduleSlot.is_active == is_active)
        return query.order_by(DoctorScheduleSlot.day_of_week.asc(), DoctorScheduleSlot.start_time.asc()).all()

    def create(self, db: Session, data: DoctorScheduleSlotCreate) -> DoctorScheduleSlot:
        slot = DoctorScheduleSlot(**data.model_dump())
        db.add(slot)
        db.commit()
        db.refresh(slot)
        return slot

    def delete(self, db: Session, slot: DoctorScheduleSlot) -> None:
        db.delete(slot)
        db.commit()


# ── Appointment Repository ──────────────────────────────────────────────────
class AppointmentRepository:
    def get_by_id(self, db: Session, appointment_id: uuid.UUID) -> Appointment | None:
        return db.query(Appointment).filter(Appointment.id == appointment_id).first()

    def get_all(
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
    ) -> list[Appointment]:
        query = db.query(Appointment)
        if business_id is not None:
            query = query.filter(Appointment.business_id == business_id)
        if doctor_id is not None:
            query = query.filter(Appointment.doctor_id == doctor_id)
        if patient_id is not None:
            query = query.filter(Appointment.patient_id == patient_id)
        if appointment_date is not None:
            query = query.filter(Appointment.appointment_date == appointment_date)
        if status is not None:
            query = query.filter(Appointment.status == status)

        if search:
            q = f"%{search.strip().lower()}%"
            query = query.join(Appointment.patient).filter(
                or_(
                    func.lower(Patient.full_name).like(q),
                    func.lower(Patient.phone).like(q),
                    func.lower(Patient.uhid).like(q),
                )
            )

        return (
            query.order_by(Appointment.appointment_date.desc(), Appointment.serial_number.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_next_serial(
        self, db: Session, business_id: int, doctor_id: uuid.UUID, appt_date
    ) -> int:
        max_serial = (
            db.query(func.max(Appointment.serial_number))
            .filter(
                Appointment.business_id == business_id,
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date == appt_date,
            )
            .scalar()
        )
        return (max_serial or 0) + 1

    def create(self, db: Session, data: AppointmentCreate, serial_number: int) -> Appointment:
        appt = Appointment(**data.model_dump(), serial_number=serial_number)
        db.add(appt)
        db.commit()
        db.refresh(appt)
        return appt

    def update(self, db: Session, appt: Appointment, data: AppointmentUpdate) -> Appointment:
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(appt, k, v)
        db.commit()
        db.refresh(appt)
        return appt

    def delete(self, db: Session, appt: Appointment) -> None:
        db.delete(appt)
        db.commit()


# ── Prescription Repository ─────────────────────────────────────────────────
class PrescriptionRepository:
    def get_by_id(self, db: Session, prescription_id: uuid.UUID) -> Prescription | None:
        return db.query(Prescription).filter(Prescription.id == prescription_id).first()

    def get_by_number(self, db: Session, business_id: int, prescription_number: str) -> Prescription | None:
        return (
            db.query(Prescription)
            .filter(
                Prescription.business_id == business_id,
                Prescription.prescription_number == prescription_number.strip(),
            )
            .first()
        )

    def get_all(
        self,
        db: Session,
        business_id: int | None = None,
        patient_id: uuid.UUID | None = None,
        doctor_id: uuid.UUID | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Prescription]:
        query = db.query(Prescription)
        if business_id is not None:
            query = query.filter(Prescription.business_id == business_id)
        if patient_id is not None:
            query = query.filter(Prescription.patient_id == patient_id)
        if doctor_id is not None:
            query = query.filter(Prescription.doctor_id == doctor_id)

        if search:
            q = f"%{search.strip().lower()}%"
            query = query.join(Prescription.patient).filter(
                or_(
                    func.lower(Prescription.prescription_number).like(q),
                    func.lower(Patient.full_name).like(q),
                    func.lower(Patient.uhid).like(q),
                )
            )

        return query.order_by(Prescription.created_at.desc()).offset(skip).limit(limit).all()

    def get_next_sequence(self, db: Session, business_id: int, year: int) -> int:
        prefix = f"RX-{business_id}-{year}-"
        count = (
            db.query(func.count(Prescription.id))
            .filter(Prescription.business_id == business_id, Prescription.prescription_number.like(f"{prefix}%"))
            .scalar()
            or 0
        )
        return count + 1

    def create(self, db: Session, prescription: Prescription) -> Prescription:
        db.add(prescription)
        db.commit()
        db.refresh(prescription)
        return prescription

    def update(self, db: Session, prescription: Prescription, data: PrescriptionUpdate) -> Prescription:
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(prescription, k, v)
        db.commit()
        db.refresh(prescription)
        return prescription

    def delete(self, db: Session, prescription: Prescription) -> None:
        db.delete(prescription)
        db.commit()


# ── Lab Test Result (LIS) Repository ────────────────────────────────────────
class LabTestResultRepository:
    def get_by_id(self, db: Session, result_id: uuid.UUID) -> LabTestResult | None:
        return db.query(LabTestResult).filter(LabTestResult.id == result_id).first()

    def get_by_order_item(self, db: Session, order_item_id: uuid.UUID) -> list[LabTestResult]:
        return (
            db.query(LabTestResult)
            .filter(LabTestResult.order_item_id == order_item_id)
            .order_by(LabTestResult.created_at.asc())
            .all()
        )

    def get_all(
        self,
        db: Session,
        business_id: int | None = None,
        order_id: uuid.UUID | None = None,
        status: ResultStatusEnum | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[LabTestResult]:
        query = db.query(LabTestResult)
        if business_id is not None:
            query = query.filter(LabTestResult.business_id == business_id)
        if order_id is not None:
            query = query.filter(LabTestResult.order_id == order_id)
        if status is not None:
            query = query.filter(LabTestResult.result_status == status)
        return query.order_by(LabTestResult.created_at.desc()).offset(skip).limit(limit).all()

    def batch_save(
        self,
        db: Session,
        business_id: int,
        order_id: uuid.UUID,
        order_item_id: uuid.UUID,
        technician_name: str | None,
        items: list,
    ) -> list[LabTestResult]:
        # Delete existing draft results for this order item to allow re-entry
        db.query(LabTestResult).filter(
            LabTestResult.order_item_id == order_item_id,
            LabTestResult.result_status == ResultStatusEnum.entered,
        ).delete(synchronize_session=False)

        results: list[LabTestResult] = []
        for it in items:
            res = LabTestResult(
                business_id=business_id,
                order_id=order_id,
                order_item_id=order_item_id,
                parameter_id=it.parameter_id,
                parameter_name=it.parameter_name,
                observed_value=it.observed_value,
                unit=it.unit,
                ref_range=it.ref_range,
                is_abnormal=it.is_abnormal,
                is_critical=it.is_critical,
                result_status=ResultStatusEnum.critical if it.is_critical else ResultStatusEnum.entered,
                technician_name=technician_name,
                remarks=it.remarks,
            )
            db.add(res)
            results.append(res)

        db.commit()
        for r in results:
            db.refresh(r)
        return results

    def verify_order_item_results(
        self, db: Session, order_item_id: uuid.UUID, verified_by_name: str, remarks: str | None = None
    ) -> list[LabTestResult]:
        results = (
            db.query(LabTestResult)
            .filter(LabTestResult.order_item_id == order_item_id)
            .all()
        )
        now = datetime.now(timezone.utc)
        for r in results:
            r.result_status = ResultStatusEnum.verified
            r.verified_by_name = verified_by_name
            r.verified_at = now
            if remarks:
                r.remarks = f"{r.remarks or ''} [Verified: {remarks}]".strip()

        db.commit()
        for r in results:
            db.refresh(r)
        return results


# ── Radiology Report Repository ─────────────────────────────────────────────
class RadiologyReportRepository:
    def get_by_order_item(self, db: Session, order_item_id: uuid.UUID) -> RadiologyReport | None:
        return db.query(RadiologyReport).filter(RadiologyReport.order_item_id == order_item_id).first()

    def create_or_update(
        self, db: Session, data: RadiologyReportCreate
    ) -> RadiologyReport:
        report = self.get_by_order_item(db, data.order_item_id)
        if report:
            for k, v in data.model_dump().items():
                setattr(report, k, v)
        else:
            report = RadiologyReport(**data.model_dump())
            db.add(report)

        db.commit()
        db.refresh(report)
        return report

    def verify_report(
        self, db: Session, report: RadiologyReport, verified_by_name: str
    ) -> RadiologyReport:
        report.verified_by_name = verified_by_name
        report.verified_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(report)
        return report


# ── Referral Commission Repository ──────────────────────────────────────────
class ReferralCommissionRepository:
    def get_by_id(self, db: Session, comm_id: uuid.UUID) -> ReferralDoctorCommission | None:
        return db.query(ReferralDoctorCommission).filter(ReferralDoctorCommission.id == comm_id).first()

    def get_all(
        self,
        db: Session,
        business_id: int | None = None,
        referring_doctor_id: uuid.UUID | None = None,
        payment_status: CommissionStatusEnum | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[ReferralDoctorCommission]:
        query = db.query(ReferralDoctorCommission)
        if business_id is not None:
            query = query.filter(ReferralDoctorCommission.business_id == business_id)
        if referring_doctor_id is not None:
            query = query.filter(ReferralDoctorCommission.referring_doctor_id == referring_doctor_id)
        if payment_status is not None:
            query = query.filter(ReferralDoctorCommission.payment_status == payment_status)

        return query.order_by(ReferralDoctorCommission.created_at.desc()).offset(skip).limit(limit).all()

    def create(self, db: Session, comm: ReferralDoctorCommission) -> ReferralDoctorCommission:
        db.add(comm)
        db.commit()
        db.refresh(comm)
        return comm

    def record_payout(
        self, db: Session, comm: ReferralDoctorCommission, payment_reference: str, notes: str | None = None
    ) -> ReferralDoctorCommission:
        comm.payment_status = CommissionStatusEnum.paid
        comm.paid_at = datetime.now(timezone.utc)
        comm.payment_reference = payment_reference
        if notes:
            comm.notes = notes
        db.commit()
        db.refresh(comm)
        return comm
