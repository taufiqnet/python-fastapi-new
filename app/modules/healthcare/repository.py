import uuid
from datetime import datetime, timezone
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.modules.healthcare.models import (
    DiagnosticDepartmentEnum,
    DiagnosticOrder,
    DiagnosticOrderItem,
    DiagnosticOrderStatusEnum,
    DiagnosticSample,
    DiagnosticTest,
    DiagnosticTestParameter,
    DoctorProfile,
    Patient,
    SampleStatusEnum,
)
from app.modules.healthcare.schemas import (
    DiagnosticTestCreate,
    DiagnosticTestParameterCreate,
    DiagnosticTestUpdate,
    DoctorProfileCreate,
    DoctorProfileUpdate,
    PatientCreate,
    PatientUpdate,
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
