import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.tenancy.scoping import verify_record_ownership
from app.modules.healthcare.models import (
    DiagnosticDepartmentEnum,
    DiagnosticOrder,
    DiagnosticOrderItem,
    DiagnosticOrderStatusEnum,
    DiagnosticSample,
    DiagnosticTest,
    DoctorProfile,
    Patient,
    SampleStatusEnum,
)
from app.modules.healthcare.repository import (
    DiagnosticOrderRepository,
    DiagnosticSampleRepository,
    DiagnosticTestRepository,
    DoctorProfileRepository,
    PatientRepository,
)
from app.modules.healthcare.schemas import (
    DiagnosticCheckoutRequest,
    DiagnosticSampleCollect,
    DiagnosticTestCreate,
    DiagnosticTestUpdate,
    DoctorProfileCreate,
    DoctorProfileUpdate,
    PatientCreate,
    PatientUpdate,
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


# Singletons
patient_service = PatientService()
doctor_service = DoctorProfileService()
diagnostic_catalog_service = DiagnosticCatalogService()
diagnostic_order_service = DiagnosticOrderService()
diagnostic_sample_service = DiagnosticSampleService()
