import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user_optional
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.database import get_db
from app.modules.healthcare.models import (
    DiagnosticDepartmentEnum,
    DiagnosticOrderStatusEnum,
    SampleStatusEnum,
)
from app.modules.healthcare.schemas import (
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
    PatientCreate,
    PatientOut,
    PatientUpdate,
)
from app.modules.healthcare.service import (
    diagnostic_catalog_service,
    diagnostic_order_service,
    diagnostic_sample_service,
    doctor_service,
    patient_service,
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
    current_user: User | None = Depends(get_current_user_optional),
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
    current_user: User | None = Depends(get_current_user_optional),
):
    if current_user and not current_user.is_superuser:
        patient_data.business_id = current_user.business_id
    return patient_service.register_patient(db, patient_data, current_user=current_user)


@router.get("/patients/{patient_id}", response_model=PatientOut)
def get_patient(
    patient_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    return patient_service.get_patient(db, patient_id, current_user=current_user)


@router.put("/patients/{patient_id}", response_model=PatientOut)
def update_patient(
    patient_id: uuid.UUID,
    patient_data: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    return patient_service.update_patient(
        db, patient_id, patient_data, current_user=current_user
    )


@router.delete("/patients/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
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
    current_user: User | None = Depends(get_current_user_optional),
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
    current_user: User | None = Depends(get_current_user_optional),
):
    if current_user and not current_user.is_superuser:
        doctor_data.business_id = current_user.business_id
    return doctor_service.create_doctor(db, doctor_data, current_user=current_user)


@router.get("/doctors/{doctor_id}", response_model=DoctorProfileOut)
def get_doctor(
    doctor_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    return doctor_service.get_doctor(db, doctor_id, current_user=current_user)


@router.put("/doctors/{doctor_id}", response_model=DoctorProfileOut)
def update_doctor(
    doctor_id: uuid.UUID,
    doctor_data: DoctorProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    return doctor_service.update_doctor(
        db, doctor_id, doctor_data, current_user=current_user
    )


@router.delete("/doctors/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor(
    doctor_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
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
    current_user: User | None = Depends(get_current_user_optional),
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
    current_user: User | None = Depends(get_current_user_optional),
):
    if current_user and not current_user.is_superuser:
        test_data.business_id = current_user.business_id
    return diagnostic_catalog_service.create_test(db, test_data, current_user=current_user)


@router.get("/diagnostic-tests/{test_id}", response_model=DiagnosticTestOut)
def get_diagnostic_test(
    test_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    return diagnostic_catalog_service.get_test(db, test_id, current_user=current_user)


@router.put("/diagnostic-tests/{test_id}", response_model=DiagnosticTestOut)
def update_diagnostic_test(
    test_id: uuid.UUID,
    test_data: DiagnosticTestUpdate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    return diagnostic_catalog_service.update_test(
        db, test_id, test_data, current_user=current_user
    )


@router.delete("/diagnostic-tests/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_diagnostic_test(
    test_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
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
    current_user: User | None = Depends(get_current_user_optional),
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
    current_user: User | None = Depends(get_current_user_optional),
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
    current_user: User | None = Depends(get_current_user_optional),
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
    current_user: User | None = Depends(get_current_user_optional),
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
    current_user: User | None = Depends(get_current_user_optional),
):
    return diagnostic_sample_service.collect_sample(
        db, sample_id, data, current_user=current_user
    )
