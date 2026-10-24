import uuid
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.database import get_db
from app.modules.hr_payroll.separation.schemas import (
    AssetHandoverItem,
    DepartmentClearanceOut,
    DepartmentClearanceSignOff,
    EmployeeSeparationCreate,
    EmployeeSeparationOut,
    EmployeeSeparationUpdate,
    ExitInterviewCreate,
    ExitInterviewOut,
    ExitInterviewUpdate,
    FinalSettlementComputeRequest,
    FinalSettlementDisburse,
    FinalSettlementOut,
    ReleaseLetterCreate,
    ReleaseLetterOut,
    ResignationApplicationCreate,
    ResignationApplicationOut,
    ResignationApplicationReview,
)
from app.modules.hr_payroll.separation.service import SeparationService

router = APIRouter(prefix="/separation", tags=["HR Offboarding & Separation"])
service = SeparationService()


# ===========================================================================
# 1. Resignation Endpoints
# ===========================================================================
@router.post("/resignations", response_model=ResignationApplicationOut, status_code=status.HTTP_201_CREATED)
def submit_resignation(
    data: ResignationApplicationCreate,
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "resignations", "create")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    return service.submit_resignation(db, resolved_biz, current_user, data)


@router.get("/resignations", response_model=list[ResignationApplicationOut])
def list_resignations(
    business_id: Optional[int] = Query(None),
    employee_id: Optional[uuid.UUID] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "resignations", "view")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    return service.resignation_repo.get_all(
        db, business_id=resolved_biz, employee_id=employee_id, status=status, skip=skip, limit=limit
    )


@router.get("/resignations/{resignation_id}", response_model=ResignationApplicationOut)
def get_resignation(
    resignation_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "resignations", "view")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    res = service.resignation_repo.get_by_id(db, resignation_id, business_id=resolved_biz)
    if not res:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resignation application not found")
    return res


@router.post("/resignations/{resignation_id}/review", response_model=ResignationApplicationOut)
def review_resignation(
    resignation_id: uuid.UUID,
    review_data: ResignationApplicationReview,
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "resignations", "update")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    return service.review_resignation(db, resolved_biz, current_user, resignation_id, review_data)


@router.post("/resignations/{resignation_id}/withdraw", response_model=ResignationApplicationOut)
def withdraw_resignation(
    resignation_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "resignations", "update")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    return service.withdraw_resignation(db, resolved_biz, current_user, resignation_id)


# ===========================================================================
# 2. Employee Separation Master Endpoints
# ===========================================================================
@router.post("/separations", response_model=EmployeeSeparationOut, status_code=status.HTTP_201_CREATED)
def initiate_separation(
    data: EmployeeSeparationCreate,
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "separations", "create")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    return service.initiate_separation(db, resolved_biz, current_user, data)


@router.get("/separations", response_model=list[EmployeeSeparationOut])
def list_separations(
    business_id: Optional[int] = Query(None),
    employee_id: Optional[uuid.UUID] = Query(None),
    separation_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "separations", "view")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    return service.separation_repo.get_all(
        db,
        business_id=resolved_biz,
        employee_id=employee_id,
        separation_type=separation_type,
        status=status,
        skip=skip,
        limit=limit,
    )


@router.get("/separations/{separation_id}", response_model=EmployeeSeparationOut)
def get_separation(
    separation_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "separations", "view")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    sep = service.separation_repo.get_by_id(db, separation_id, business_id=resolved_biz)
    if not sep:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Separation record not found")
    return sep


@router.put("/separations/{separation_id}", response_model=EmployeeSeparationOut)
def update_separation(
    separation_id: uuid.UUID,
    data: EmployeeSeparationUpdate,
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "separations", "update")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    return service.update_separation(db, resolved_biz, current_user, separation_id, data)


# ===========================================================================
# 3. Department Clearance (NOC) Endpoints
# ===========================================================================
@router.get("/clearances", response_model=list[DepartmentClearanceOut])
def list_clearances(
    business_id: Optional[int] = Query(None),
    department_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    employee_id: Optional[uuid.UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "department_clearances", "view")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    return service.clearance_repo.get_all(
        db,
        business_id=resolved_biz,
        department_type=department_type,
        status=status,
        employee_id=employee_id,
        skip=skip,
        limit=limit,
    )


@router.get("/separations/{separation_id}/clearances", response_model=list[DepartmentClearanceOut])
def get_separation_clearances(
    separation_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "department_clearances", "view")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    return service.clearance_repo.get_by_separation(db, separation_id, business_id=resolved_biz)


@router.post("/clearances/{clearance_id}/sign-off", response_model=DepartmentClearanceOut)
def sign_off_clearance(
    clearance_id: uuid.UUID,
    data: DepartmentClearanceSignOff,
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "department_clearances", "update")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    return service.sign_off_department_clearance(db, resolved_biz, current_user, clearance_id, data)


# ===========================================================================
# 4. Asset Handover Desk Endpoints
# ===========================================================================
@router.get("/employees/{employee_id}/assets", response_model=list[AssetHandoverItem])
def get_employee_handover_assets(
    employee_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "department_clearances", "view")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    return service.get_asset_handover_items(db, resolved_biz, employee_id)


@router.post("/assets/{assignment_id}/return")
def return_asset(
    assignment_id: uuid.UUID,
    return_condition: str = Body(..., embed=True),
    return_notes: Optional[str] = Body(None, embed=True),
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "department_clearances", "update")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    service.process_asset_return(db, resolved_biz, current_user, assignment_id, return_condition, return_notes)
    return {"message": "Asset returned successfully"}


# ===========================================================================
# 5. Exit Interview Endpoints
# ===========================================================================
@router.post("/exit-interviews", response_model=ExitInterviewOut, status_code=status.HTTP_201_CREATED)
def record_exit_interview(
    data: ExitInterviewCreate,
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "exit_interviews", "create")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    return service.record_exit_interview(db, resolved_biz, current_user, data)


@router.get("/exit-interviews", response_model=list[ExitInterviewOut])
def list_exit_interviews(
    business_id: Optional[int] = Query(None),
    employee_id: Optional[uuid.UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "exit_interviews", "view")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    return service.exit_interview_repo.get_all(db, business_id=resolved_biz, employee_id=employee_id, skip=skip, limit=limit)


@router.get("/separations/{separation_id}/exit-interview", response_model=Optional[ExitInterviewOut])
def get_separation_exit_interview(
    separation_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "exit_interviews", "view")),
):
    return service.exit_interview_repo.get_by_separation(db, separation_id)


# ===========================================================================
# 6. Final Settlement (FnF) Endpoints
# ===========================================================================
@router.get("/settlements", response_model=list[FinalSettlementOut])
def list_final_settlements(
    business_id: Optional[int] = Query(None),
    employee_id: Optional[uuid.UUID] = Query(None),
    payment_status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "final_settlements", "view")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    return service.settlement_repo.get_all(
        db, business_id=resolved_biz, employee_id=employee_id, payment_status=payment_status, skip=skip, limit=limit
    )


@router.get("/settlements/{settlement_id}", response_model=FinalSettlementOut)
def get_final_settlement(
    settlement_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "final_settlements", "view")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    settlement = service.settlement_repo.get_by_id(db, settlement_id, business_id=resolved_biz)
    if not settlement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Final settlement not found")
    return settlement


@router.post("/separations/{separation_id}/settlement/compute", response_model=FinalSettlementOut)
def compute_settlement(
    separation_id: uuid.UUID,
    compute_request: Optional[FinalSettlementComputeRequest] = None,
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "final_settlements", "create")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    return service.compute_final_settlement(db, resolved_biz, current_user, separation_id, compute_request)


@router.post("/settlements/{settlement_id}/disburse", response_model=FinalSettlementOut)
def disburse_settlement(
    settlement_id: uuid.UUID,
    data: FinalSettlementDisburse,
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "final_settlements", "update")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    return service.disburse_settlement(db, resolved_biz, current_user, settlement_id, data)


# ===========================================================================
# 7. Release Letter Endpoints
# ===========================================================================
@router.post("/release-letters", response_model=ReleaseLetterOut, status_code=status.HTTP_201_CREATED)
def generate_release_letter(
    data: ReleaseLetterCreate,
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "release_letters", "create")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    return service.generate_release_letter(db, resolved_biz, current_user, data)


@router.get("/release-letters", response_model=list[ReleaseLetterOut])
def list_release_letters(
    business_id: Optional[int] = Query(None),
    employee_id: Optional[uuid.UUID] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "release_letters", "view")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    return service.release_letter_repo.get_all(
        db, business_id=resolved_biz, employee_id=employee_id, status=status, skip=skip, limit=limit
    )


@router.get("/release-letters/{letter_id}", response_model=ReleaseLetterOut)
def get_release_letter(
    letter_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "release_letters", "view")),
):
    resolved_biz = resolve_business_id(current_user, business_id)
    letter = service.release_letter_repo.get_by_id(db, letter_id, business_id=resolved_biz)
    if not letter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Release letter not found")
    return letter


@router.get("/separations/{separation_id}/release-letter", response_model=Optional[ReleaseLetterOut])
def get_separation_release_letter(
    separation_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "release_letters", "view")),
):
    return service.release_letter_repo.get_by_separation(db, separation_id)
