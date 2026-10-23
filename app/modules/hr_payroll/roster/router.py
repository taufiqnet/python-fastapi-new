import uuid
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user_optional, require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.database import get_db
from app.modules.hr_payroll.roster.models import (
    DutyAssignmentStatusEnum,
    DutyBatchStatusEnum,
    MonthlyRosterStatusEnum,
    RosterChangeStatusEnum,
    RosterExchangeStatusEnum,
)
from app.modules.hr_payroll.roster.schemas import (
    DepartmentRosterStatusOut,
    DepartmentRosterToggle,
    DutyAssignBatchCreate,
    DutyAssignBatchOut,
    DutyAssignBatchReview,
    DutyAssignmentOut,
    MonthlyRosterBulkCellUpdate,
    MonthlyRosterMatrixOut,
    MonthlyRosterOut,
    MonthlyRosterReview,
    RosterChangeCreate,
    RosterChangeOut,
    RosterChangeReview,
    RosterExchangeCreate,
    RosterExchangeManagerReview,
    RosterExchangeOut,
    RosterExchangePeerReview,
    ShiftCreate,
    ShiftOut,
    ShiftUpdate,
)
from app.modules.hr_payroll.roster.service import RosterService

router = APIRouter(prefix="/roster", tags=["Roster Management"])
roster_service = RosterService()


# ── 1. Shift Setup ──────────────────────────────────────────────────
@router.get("/shifts", response_model=list[ShiftOut])
def get_shifts(
    is_active: bool | None = Query(None),
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return roster_service.get_shifts(db, resolved_business_id, is_active=is_active)


@router.post("/shifts", response_model=ShiftOut, status_code=status.HTTP_201_CREATED)
def create_shift(
    payload: ShiftCreate,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "create")),
):
    resolved_business_id = resolve_business_id(current_user, business_id or payload.business_id)
    return roster_service.create_shift(db, payload, resolved_business_id)


@router.put("/shifts/{shift_id}", response_model=ShiftOut)
def update_shift(
    shift_id: uuid.UUID,
    payload: ShiftUpdate,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "update")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return roster_service.update_shift(db, shift_id, payload, resolved_business_id)


@router.delete("/shifts/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shift(
    shift_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "delete")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    roster_service.delete_shift(db, shift_id, resolved_business_id)
    return None


# ── 2. Department-Wise Roster Status ─────────────────────────────────
@router.get("/departments", response_model=list[DepartmentRosterStatusOut])
def get_departments_roster_status(
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return roster_service.get_departments_config(db, resolved_business_id)


@router.patch("/departments/{department_id}/toggle", response_model=DepartmentRosterStatusOut)
def toggle_department_roster(
    department_id: uuid.UUID,
    payload: DepartmentRosterToggle,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "update")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return roster_service.toggle_department_roster(
        db, department_id, payload, resolved_business_id
    )


# ── 3. Monthly Roster Application & Matrix Planner ───────────────────
@router.get("/monthly-rosters", response_model=list[MonthlyRosterOut])
def get_monthly_rosters(
    department_id: uuid.UUID | None = Query(None),
    year: int | None = Query(None),
    month: int | None = Query(None),
    status_filter: MonthlyRosterStatusEnum | None = Query(None, alias="status"),
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    rosters = roster_service.repo.get_monthly_rosters(
        db,
        business_id=resolved_business_id,
        department_id=department_id,
        year=year,
        month=month,
        status=status_filter,
    )
    res = []
    for r in rosters:
        res.append(
            MonthlyRosterOut(
                id=r.id,
                business_id=r.business_id,
                department_id=r.department_id,
                department_name=r.department.name if r.department else None,
                year=r.year,
                month=r.month,
                status=r.status,
                submitted_by_id=r.submitted_by_id,
                submitted_by_name=r.submitted_by.full_name if r.submitted_by else None,
                submitted_at=r.submitted_at,
                approved_by_id=r.approved_by_id,
                approved_by_name=r.approved_by.full_name if r.approved_by else None,
                approved_at=r.approved_at,
                rejection_reason=r.rejection_reason,
                notes=r.notes,
                total_assignments=len(r.duty_assignments) if r.duty_assignments else 0,
                created_at=r.created_at,
            )
        )
    return res


@router.get("/monthly-rosters/matrix", response_model=MonthlyRosterMatrixOut)
def get_monthly_roster_matrix(
    department_id: uuid.UUID = Query(...),
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return roster_service.get_monthly_roster_matrix(
        db, department_id, year, month, resolved_business_id
    )


@router.put("/monthly-rosters/matrix")
def save_monthly_roster_matrix_cells(
    department_id: uuid.UUID = Query(...),
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    payload: MonthlyRosterBulkCellUpdate = ...,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "create")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return roster_service.save_monthly_roster_cells(
        db, department_id, year, month, payload, resolved_business_id
    )


@router.post("/monthly-rosters/{roster_id}/submit", response_model=MonthlyRosterOut)
def submit_monthly_roster(
    roster_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "create")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    roster = roster_service.submit_monthly_roster(
        db, roster_id, resolved_business_id, current_user
    )
    return MonthlyRosterOut(
        id=roster.id,
        business_id=roster.business_id,
        department_id=roster.department_id,
        department_name=roster.department.name if roster.department else None,
        year=roster.year,
        month=roster.month,
        status=roster.status,
        submitted_by_id=roster.submitted_by_id,
        submitted_by_name=roster.submitted_by.full_name if roster.submitted_by else None,
        submitted_at=roster.submitted_at,
        approved_by_id=roster.approved_by_id,
        approved_by_name=roster.approved_by.full_name if roster.approved_by else None,
        approved_at=roster.approved_at,
        rejection_reason=roster.rejection_reason,
        notes=roster.notes,
        created_at=roster.created_at,
    )


# ── 4. Roster Approval ──────────────────────────────────────────────
@router.post("/monthly-rosters/{roster_id}/review", response_model=MonthlyRosterOut)
def review_monthly_roster(
    roster_id: uuid.UUID,
    payload: MonthlyRosterReview,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "approve")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    roster = roster_service.review_monthly_roster(
        db, roster_id, payload, resolved_business_id, current_user
    )
    return MonthlyRosterOut(
        id=roster.id,
        business_id=roster.business_id,
        department_id=roster.department_id,
        department_name=roster.department.name if roster.department else None,
        year=roster.year,
        month=roster.month,
        status=roster.status,
        submitted_by_id=roster.submitted_by_id,
        submitted_by_name=roster.submitted_by.full_name if roster.submitted_by else None,
        submitted_at=roster.submitted_at,
        approved_by_id=roster.approved_by_id,
        approved_by_name=roster.approved_by.full_name if roster.approved_by else None,
        approved_at=roster.approved_at,
        rejection_reason=roster.rejection_reason,
        notes=roster.notes,
        created_at=roster.created_at,
    )


# ── 5. Duty Assign & Duty Assign Approval ───────────────────────────
@router.get("/duty-assignments", response_model=list[DutyAssignmentOut])
def get_duty_assignments(
    department_id: uuid.UUID | None = Query(None),
    employee_id: uuid.UUID | None = Query(None),
    start_date: date_type | None = Query(None),
    end_date: date_type | None = Query(None),
    status_filter: DutyAssignmentStatusEnum | None = Query(None, alias="status"),
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    assignments = roster_service.repo.get_assignments(
        db,
        business_id=resolved_business_id,
        department_id=department_id,
        employee_id=employee_id,
        start_date=start_date,
        end_date=end_date,
        status=status_filter,
    )
    res = []
    for a in assignments:
        res.append(
            DutyAssignmentOut(
                id=a.id,
                business_id=a.business_id,
                monthly_roster_id=a.monthly_roster_id,
                batch_id=a.batch_id,
                employee_id=a.employee_id,
                department_id=a.department_id,
                date=a.date,
                shift_id=a.shift_id,
                status=a.status,
                source=a.source,
                notes=a.notes,
                created_at=a.created_at,
                updated_at=a.updated_at,
                employee_name=a.employee.full_name if a.employee else None,
                employee_code=a.employee.employee_code if a.employee else None,
                department_name=a.department.name if a.department else None,
                shift=ShiftOut.model_validate(a.shift) if a.shift else None,
            )
        )
    return res


@router.get("/duty-assign-batches", response_model=list[DutyAssignBatchOut])
def get_duty_assign_batches(
    department_id: uuid.UUID | None = Query(None),
    status_filter: DutyBatchStatusEnum | None = Query(None, alias="status"),
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    batches = roster_service.repo.get_batches(
        db,
        business_id=resolved_business_id,
        department_id=department_id,
        status=status_filter,
    )
    res = []
    for b in batches:
        res.append(
            DutyAssignBatchOut(
                id=b.id,
                business_id=b.business_id,
                department_id=b.department_id,
                department_name=b.department.name if b.department else None,
                title=b.title,
                start_date=b.start_date,
                end_date=b.end_date,
                assigned_count=b.assigned_count,
                status=b.status,
                submitted_by_id=b.submitted_by_id,
                submitted_by_name=b.submitted_by.full_name if b.submitted_by else None,
                submitted_at=b.submitted_at,
                approved_by_id=b.approved_by_id,
                approved_by_name=b.approved_by.full_name if b.approved_by else None,
                approved_at=b.approved_at,
                rejection_reason=b.rejection_reason,
            )
        )
    return res


@router.post(
    "/duty-assign-batches",
    response_model=DutyAssignBatchOut,
    status_code=status.HTTP_201_CREATED,
)
def create_duty_assign_batch(
    payload: DutyAssignBatchCreate,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "create")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    b = roster_service.create_duty_assign_batch(
        db, payload, resolved_business_id, current_user
    )
    return DutyAssignBatchOut(
        id=b.id,
        business_id=b.business_id,
        department_id=b.department_id,
        department_name=b.department.name if b.department else None,
        title=b.title,
        start_date=b.start_date,
        end_date=b.end_date,
        assigned_count=b.assigned_count,
        status=b.status,
        submitted_by_id=b.submitted_by_id,
        submitted_by_name=b.submitted_by.full_name if b.submitted_by else None,
        submitted_at=b.submitted_at,
        approved_by_id=b.approved_by_id,
        approved_by_name=b.approved_by.full_name if b.approved_by else None,
        approved_at=b.approved_at,
        rejection_reason=b.rejection_reason,
    )


@router.post("/duty-assign-batches/{batch_id}/review", response_model=DutyAssignBatchOut)
def review_duty_assign_batch(
    batch_id: uuid.UUID,
    payload: DutyAssignBatchReview,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "approve")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    b = roster_service.review_duty_assign_batch(
        db, batch_id, payload, resolved_business_id, current_user
    )
    return DutyAssignBatchOut(
        id=b.id,
        business_id=b.business_id,
        department_id=b.department_id,
        department_name=b.department.name if b.department else None,
        title=b.title,
        start_date=b.start_date,
        end_date=b.end_date,
        assigned_count=b.assigned_count,
        status=b.status,
        submitted_by_id=b.submitted_by_id,
        submitted_by_name=b.submitted_by.full_name if b.submitted_by else None,
        submitted_at=b.submitted_at,
        approved_by_id=b.approved_by_id,
        approved_by_name=b.approved_by.full_name if b.approved_by else None,
        approved_at=b.approved_at,
        rejection_reason=b.rejection_reason,
    )


# ── 6. Roster Change Application & Approval ─────────────────────────
@router.get("/change-requests", response_model=list[RosterChangeOut])
def get_change_requests(
    employee_id: uuid.UUID | None = Query(None),
    status_filter: RosterChangeStatusEnum | None = Query(None, alias="status"),
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    requests = roster_service.repo.get_change_requests(
        db,
        business_id=resolved_business_id,
        employee_id=employee_id,
        status=status_filter,
    )
    res = []
    for r in requests:
        res.append(
            RosterChangeOut(
                id=r.id,
                business_id=r.business_id,
                employee_id=r.employee_id,
                employee_name=r.employee.full_name if r.employee else None,
                employee_code=r.employee.employee_code if r.employee else None,
                duty_assignment_id=r.duty_assignment_id,
                date=r.date,
                current_shift_id=r.current_shift_id,
                current_shift=ShiftOut.model_validate(r.current_shift) if r.current_shift else None,
                requested_shift_id=r.requested_shift_id,
                requested_shift=ShiftOut.model_validate(r.requested_shift) if r.requested_shift else None,
                reason=r.reason,
                status=r.status,
                applied_at=r.applied_at,
                reviewed_by_id=r.reviewed_by_id,
                reviewed_by_name=r.reviewed_by.full_name if r.reviewed_by else None,
                reviewed_at=r.reviewed_at,
                review_note=r.review_note,
            )
        )
    return res


@router.post(
    "/change-requests",
    response_model=RosterChangeOut,
    status_code=status.HTTP_201_CREATED,
)
def create_change_request(
    payload: RosterChangeCreate,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "create")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    r = roster_service.create_roster_change_request(
        db, payload, resolved_business_id
    )
    return RosterChangeOut(
        id=r.id,
        business_id=r.business_id,
        employee_id=r.employee_id,
        employee_name=r.employee.full_name if r.employee else None,
        employee_code=r.employee.employee_code if r.employee else None,
        duty_assignment_id=r.duty_assignment_id,
        date=r.date,
        current_shift_id=r.current_shift_id,
        current_shift=ShiftOut.model_validate(r.current_shift) if r.current_shift else None,
        requested_shift_id=r.requested_shift_id,
        requested_shift=ShiftOut.model_validate(r.requested_shift) if r.requested_shift else None,
        reason=r.reason,
        status=r.status,
        applied_at=r.applied_at,
        reviewed_by_id=r.reviewed_by_id,
        reviewed_by_name=r.reviewed_by.full_name if r.reviewed_by else None,
        reviewed_at=r.reviewed_at,
        review_note=r.review_note,
    )


@router.post("/change-requests/{req_id}/review", response_model=RosterChangeOut)
def review_change_request(
    req_id: uuid.UUID,
    payload: RosterChangeReview,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "approve")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    r = roster_service.review_roster_change_request(
        db, req_id, payload, resolved_business_id, current_user
    )
    return RosterChangeOut(
        id=r.id,
        business_id=r.business_id,
        employee_id=r.employee_id,
        employee_name=r.employee.full_name if r.employee else None,
        employee_code=r.employee.employee_code if r.employee else None,
        duty_assignment_id=r.duty_assignment_id,
        date=r.date,
        current_shift_id=r.current_shift_id,
        current_shift=ShiftOut.model_validate(r.current_shift) if r.current_shift else None,
        requested_shift_id=r.requested_shift_id,
        requested_shift=ShiftOut.model_validate(r.requested_shift) if r.requested_shift else None,
        reason=r.reason,
        status=r.status,
        applied_at=r.applied_at,
        reviewed_by_id=r.reviewed_by_id,
        reviewed_by_name=r.reviewed_by.full_name if r.reviewed_by else None,
        reviewed_at=r.reviewed_at,
        review_note=r.review_note,
    )


# ── 7. Roster Exchange Application & Approval ───────────────────────
@router.get("/exchange-requests", response_model=list[RosterExchangeOut])
def get_exchange_requests(
    employee_id: uuid.UUID | None = Query(None),
    status_filter: RosterExchangeStatusEnum | None = Query(None, alias="status"),
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    requests = roster_service.repo.get_exchange_requests(
        db,
        business_id=resolved_business_id,
        employee_id=employee_id,
        status=status_filter,
    )
    res = []
    for r in requests:
        res.append(
            RosterExchangeOut(
                id=r.id,
                business_id=r.business_id,
                requesting_employee_id=r.requesting_employee_id,
                requesting_employee_name=r.requesting_employee.full_name if r.requesting_employee else None,
                target_employee_id=r.target_employee_id,
                target_employee_name=r.target_employee.full_name if r.target_employee else None,
                requesting_date=r.requesting_date,
                requesting_shift_id=r.requesting_shift_id,
                requesting_shift=ShiftOut.model_validate(r.requesting_shift) if r.requesting_shift else None,
                target_date=r.target_date,
                target_shift_id=r.target_shift_id,
                target_shift=ShiftOut.model_validate(r.target_shift) if r.target_shift else None,
                reason=r.reason,
                status=r.status,
                applied_at=r.applied_at,
                peer_reviewed_at=r.peer_reviewed_at,
                peer_note=r.peer_note,
                reviewed_by_id=r.reviewed_by_id,
                reviewed_by_name=r.reviewed_by.full_name if r.reviewed_by else None,
                reviewed_at=r.reviewed_at,
                review_note=r.review_note,
            )
        )
    return res


@router.post(
    "/exchange-requests",
    response_model=RosterExchangeOut,
    status_code=status.HTTP_201_CREATED,
)
def create_exchange_request(
    payload: RosterExchangeCreate,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "create")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    r = roster_service.create_roster_exchange_request(
        db, payload, resolved_business_id
    )
    return RosterExchangeOut(
        id=r.id,
        business_id=r.business_id,
        requesting_employee_id=r.requesting_employee_id,
        requesting_employee_name=r.requesting_employee.full_name if r.requesting_employee else None,
        target_employee_id=r.target_employee_id,
        target_employee_name=r.target_employee.full_name if r.target_employee else None,
        requesting_date=r.requesting_date,
        requesting_shift_id=r.requesting_shift_id,
        requesting_shift=ShiftOut.model_validate(r.requesting_shift) if r.requesting_shift else None,
        target_date=r.target_date,
        target_shift_id=r.target_shift_id,
        target_shift=ShiftOut.model_validate(r.target_shift) if r.target_shift else None,
        reason=r.reason,
        status=r.status,
        applied_at=r.applied_at,
        peer_reviewed_at=r.peer_reviewed_at,
        peer_note=r.peer_note,
        reviewed_by_id=r.reviewed_by_id,
        reviewed_by_name=r.reviewed_by.full_name if r.reviewed_by else None,
        reviewed_at=r.reviewed_at,
        review_note=r.review_note,
    )


@router.post("/exchange-requests/{req_id}/peer-review", response_model=RosterExchangeOut)
def peer_review_exchange(
    req_id: uuid.UUID,
    payload: RosterExchangePeerReview,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "create")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    r = roster_service.peer_review_exchange(
        db, req_id, payload, resolved_business_id, current_user
    )
    return RosterExchangeOut(
        id=r.id,
        business_id=r.business_id,
        requesting_employee_id=r.requesting_employee_id,
        requesting_employee_name=r.requesting_employee.full_name if r.requesting_employee else None,
        target_employee_id=r.target_employee_id,
        target_employee_name=r.target_employee.full_name if r.target_employee else None,
        requesting_date=r.requesting_date,
        requesting_shift_id=r.requesting_shift_id,
        requesting_shift=ShiftOut.model_validate(r.requesting_shift) if r.requesting_shift else None,
        target_date=r.target_date,
        target_shift_id=r.target_shift_id,
        target_shift=ShiftOut.model_validate(r.target_shift) if r.target_shift else None,
        reason=r.reason,
        status=r.status,
        applied_at=r.applied_at,
        peer_reviewed_at=r.peer_reviewed_at,
        peer_note=r.peer_note,
        reviewed_by_id=r.reviewed_by_id,
        reviewed_by_name=r.reviewed_by.full_name if r.reviewed_by else None,
        reviewed_at=r.reviewed_at,
        review_note=r.review_note,
    )


@router.post("/exchange-requests/{req_id}/manager-review", response_model=RosterExchangeOut)
def manager_review_exchange(
    req_id: uuid.UUID,
    payload: RosterExchangeManagerReview,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "roster", "approve")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    r = roster_service.manager_review_exchange(
        db, req_id, payload, resolved_business_id, current_user
    )
    return RosterExchangeOut(
        id=r.id,
        business_id=r.business_id,
        requesting_employee_id=r.requesting_employee_id,
        requesting_employee_name=r.requesting_employee.full_name if r.requesting_employee else None,
        target_employee_id=r.target_employee_id,
        target_employee_name=r.target_employee.full_name if r.target_employee else None,
        requesting_date=r.requesting_date,
        requesting_shift_id=r.requesting_shift_id,
        requesting_shift=ShiftOut.model_validate(r.requesting_shift) if r.requesting_shift else None,
        target_date=r.target_date,
        target_shift_id=r.target_shift_id,
        target_shift=ShiftOut.model_validate(r.target_shift) if r.target_shift else None,
        reason=r.reason,
        status=r.status,
        applied_at=r.applied_at,
        peer_reviewed_at=r.peer_reviewed_at,
        peer_note=r.peer_note,
        reviewed_by_id=r.reviewed_by_id,
        reviewed_by_name=r.reviewed_by.full_name if r.reviewed_by else None,
        reviewed_at=r.reviewed_at,
        review_note=r.review_note,
    )
