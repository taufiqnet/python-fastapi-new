import uuid

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.hr_payroll.leave.schemas import (
    LeaveAllocationCreate,
    LeaveAllocationOut,
    LeaveAllocationUpdate,
    LeaveApplicationCreate,
    LeaveApplicationOut,
    LeaveApplicationReview,
    LeaveApplicationUpdate,
    LeaveTypeCreate,
    LeaveTypeOut,
    LeaveTypeUpdate,
)
from app.modules.hr_payroll.leave.service import (
    LeaveAllocationService,
    LeaveApplicationService,
    LeaveTypeService,
)

router = APIRouter(tags=["Leave Management"])

leave_type_service = LeaveTypeService()
leave_allocation_service = LeaveAllocationService()
leave_application_service = LeaveApplicationService()


# TODO: move this into schemas.py as LeaveApplicationCancel once that file
# is available to edit — kept local here so this router is self-contained.
class LeaveApplicationCancelRequest(BaseModel):
    actor_id: uuid.UUID


# ── Leave Types Endpoints ───────────────────────────────────────────────
@router.get("/leave-types", response_model=list[LeaveTypeOut])
def get_leave_types(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return leave_type_service.get_leave_types(
        db, skip=skip, limit=limit, business_id=business_id
    )


@router.get("/leave-types/{leave_type_id}", response_model=LeaveTypeOut)
def get_leave_type(leave_type_id: uuid.UUID, db: Session = Depends(get_db)):
    return leave_type_service.get_leave_type(db, leave_type_id)


@router.post(
    "/leave-types",
    response_model=LeaveTypeOut,
    status_code=status.HTTP_201_CREATED,
)
def create_leave_type(leave_type_data: LeaveTypeCreate, db: Session = Depends(get_db)):
    return leave_type_service.create_leave_type(db, leave_type_data)


@router.put("/leave-types/{leave_type_id}", response_model=LeaveTypeOut)
def update_leave_type(
    leave_type_id: uuid.UUID,
    leave_type_data: LeaveTypeUpdate,
    db: Session = Depends(get_db),
):
    return leave_type_service.update_leave_type(db, leave_type_id, leave_type_data)


@router.delete("/leave-types/{leave_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_leave_type(leave_type_id: uuid.UUID, db: Session = Depends(get_db)):
    leave_type_service.delete_leave_type(db, leave_type_id)
    return None


# ── Leave Allocations Endpoints ──────────────────────────────────────────
@router.get("/leave-allocations", response_model=list[LeaveAllocationOut])
def get_leave_allocations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    employee_id: uuid.UUID | None = Query(None),
    year: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return leave_allocation_service.get_allocations(
        db,
        skip=skip,
        limit=limit,
        business_id=business_id,
        employee_id=employee_id,
        year=year,
    )


@router.get("/leave-allocations/{allocation_id}", response_model=LeaveAllocationOut)
def get_leave_allocation(allocation_id: uuid.UUID, db: Session = Depends(get_db)):
    return leave_allocation_service.get_allocation(db, allocation_id)


@router.post(
    "/leave-allocations",
    response_model=LeaveAllocationOut,
    status_code=status.HTTP_201_CREATED,
)
def create_leave_allocation(
    allocation_data: LeaveAllocationCreate, db: Session = Depends(get_db)
):
    return leave_allocation_service.create_allocation(db, allocation_data)


@router.put("/leave-allocations/{allocation_id}", response_model=LeaveAllocationOut)
def update_leave_allocation(
    allocation_id: uuid.UUID,
    allocation_data: LeaveAllocationUpdate,
    db: Session = Depends(get_db),
):
    return leave_allocation_service.update_allocation(
        db, allocation_id, allocation_data
    )


@router.delete(
    "/leave-allocations/{allocation_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_leave_allocation(allocation_id: uuid.UUID, db: Session = Depends(get_db)):
    leave_allocation_service.delete_allocation(db, allocation_id)
    return None


# ── Leave Applications Endpoints ─────────────────────────────────────────
@router.get("/leave-applications", response_model=list[LeaveApplicationOut])
def get_leave_applications(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    employee_id: uuid.UUID | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    return leave_application_service.get_applications(
        db,
        skip=skip,
        limit=limit,
        business_id=business_id,
        employee_id=employee_id,
        status_filter=status_filter,
    )


@router.get("/leave-applications/{application_id}", response_model=LeaveApplicationOut)
def get_leave_application(application_id: uuid.UUID, db: Session = Depends(get_db)):
    return leave_application_service.get_application(db, application_id)


@router.post(
    "/leave-applications",
    response_model=LeaveApplicationOut,
    status_code=status.HTTP_201_CREATED,
)
def create_leave_application(
    application_data: LeaveApplicationCreate, db: Session = Depends(get_db)
):
    return leave_application_service.create_application(db, application_data)


@router.put("/leave-applications/{application_id}", response_model=LeaveApplicationOut)
def update_leave_application(
    application_id: uuid.UUID,
    application_data: LeaveApplicationUpdate,
    db: Session = Depends(get_db),
):
    """Edit a PENDING leave application (dates, reason, document_url, etc.).
    Rejected in the service layer once the application is no longer PENDING."""
    return leave_application_service.update_application(
        db, application_id, application_data
    )


@router.post(
    "/leave-applications/{application_id}/review",
    response_model=LeaveApplicationOut,
)
def review_leave_application(
    application_id: uuid.UUID,
    review_data: LeaveApplicationReview,
    db: Session = Depends(get_db),
):
    """Approve or reject a PENDING application. Approval validates and
    deducts from the employee's LeaveAllocation for that leave type/year."""
    return leave_application_service.review_application(db, application_id, review_data)


@router.post(
    "/leave-applications/{application_id}/cancel",
    response_model=LeaveApplicationOut,
)
def cancel_leave_application(
    application_id: uuid.UUID,
    cancel_data: LeaveApplicationCancelRequest,
    db: Session = Depends(get_db),
):
    """Cancel a PENDING or APPROVED application. If it was APPROVED, restores
    the days back to the employee's LeaveAllocation."""
    return leave_application_service.cancel_application(
        db, application_id, cancel_data.actor_id
    )


@router.delete(
    "/leave-applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_leave_application(application_id: uuid.UUID, db: Session = Depends(get_db)):
    leave_application_service.delete_application(db, application_id)
    return None