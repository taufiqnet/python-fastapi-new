import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.database import get_db
from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.performance.models import EmployeeGoal, PerformanceAppraisal
from app.modules.hr_payroll.performance.schemas import (
    AppraisalCreate,
    AppraisalOut,
    CalibrateIn,
    CycleCreate,
    CycleOut,
    CycleUpdate,
    GoalCreate,
    GoalOut,
    GoalUpdate,
    ManagerReviewIn,
    PerformanceStats,
    SelfReviewIn,
)
from app.modules.hr_payroll.performance.service import PerformanceService, employee_full_name

router = APIRouter(prefix="/performance", tags=["Performance Management"])
svc = PerformanceService()


def _is_admin(user: User) -> bool:
    return bool(user.is_superuser or user.has_role("admin"))


def _my_employee(db: Session, user: User) -> Employee:
    emp = db.query(Employee).filter(Employee.user_id == user.id).first()
    if not emp:
        raise HTTPException(status_code=400, detail="Current user is not linked to an employee profile.")
    return emp


def _goal_out(g: EmployeeGoal) -> GoalOut:
    out = GoalOut.model_validate(g)
    out.employee_name = employee_full_name(g.employee)
    out.achievement_pct = svc.achievement_pct(g)
    return out


def _appraisal_out(a: PerformanceAppraisal) -> AppraisalOut:
    out = AppraisalOut.model_validate(a)
    out.employee_name = employee_full_name(a.employee)
    out.cycle_title = a.cycle.title if a.cycle else None
    return out


def _assert_owner_or_admin(db: Session, user: User, appraisal: PerformanceAppraisal, allow_reviewer: bool = False):
    if _is_admin(user):
        return
    emp = db.query(Employee).filter(Employee.user_id == user.id).first()
    if emp and (emp.id == appraisal.employee_id or (allow_reviewer and emp.id == appraisal.reviewer_id)):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not permitted to act on this appraisal.")


# ============================ Stats ============================
@router.get("/overview/stats", response_model=PerformanceStats)
def get_stats(
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return svc.stats(db, resolve_business_id(current_user, business_id))


# ============================ Portal (self-service) ============================
@router.get("/portal/my-goals", response_model=List[GoalOut])
def my_goals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    emp = _my_employee(db, current_user)
    return [_goal_out(g) for g in svc.list_goals(db, emp.business_id, employee_id=emp.id, limit=500)]


@router.get("/portal/my-appraisals", response_model=List[AppraisalOut])
def my_appraisals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    emp = _my_employee(db, current_user)
    return [_appraisal_out(a) for a in svc.list_appraisals(db, emp.business_id, employee_id=emp.id, limit=200)]


# ============================ Cycles ============================
@router.post("/cycles", response_model=CycleOut, status_code=status.HTTP_201_CREATED)
def create_cycle(
    data: CycleCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return svc.create_cycle(db, resolve_business_id(current_user, business_id), data)


@router.get("/cycles", response_model=List[CycleOut])
def list_cycles(
    status_filter: Optional[str] = Query(None, alias="status"),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return svc.list_cycles(db, resolve_business_id(current_user, business_id), status_filter)


@router.put("/cycles/{cycle_id}", response_model=CycleOut)
def update_cycle(
    cycle_id: uuid.UUID,
    data: CycleUpdate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return svc.update_cycle(db, resolve_business_id(current_user, business_id), cycle_id, data)


# ============================ Goals ============================
@router.post("/goals", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(
    data: GoalCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _goal_out(svc.create_goal(db, resolve_business_id(current_user, business_id), data))


@router.get("/goals", response_model=List[GoalOut])
def list_goals(
    employee_id: Optional[uuid.UUID] = Query(None),
    cycle_id: Optional[uuid.UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goals = svc.list_goals(
        db, resolve_business_id(current_user, business_id), employee_id, cycle_id, status_filter, search, skip, limit
    )
    return [_goal_out(g) for g in goals]


@router.put("/goals/{goal_id}", response_model=GoalOut)
def update_goal(
    goal_id: uuid.UUID,
    data: GoalUpdate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _goal_out(svc.update_goal(db, resolve_business_id(current_user, business_id), goal_id, data))


@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc.delete_goal(db, resolve_business_id(current_user, business_id), goal_id)
    return None


# ============================ Appraisals ============================
@router.post("/appraisals", response_model=AppraisalOut, status_code=status.HTTP_201_CREATED)
def create_appraisal(
    data: AppraisalCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _appraisal_out(svc.create_appraisal(db, resolve_business_id(current_user, business_id), data))


@router.get("/appraisals", response_model=List[AppraisalOut])
def list_appraisals(
    employee_id: Optional[uuid.UUID] = Query(None),
    cycle_id: Optional[uuid.UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = svc.list_appraisals(
        db, resolve_business_id(current_user, business_id), employee_id, cycle_id, status_filter, skip, limit
    )
    return [_appraisal_out(a) for a in items]


@router.post("/appraisals/{appraisal_id}/self-review", response_model=AppraisalOut)
def self_review(
    appraisal_id: uuid.UUID,
    data: SelfReviewIn,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz = resolve_business_id(current_user, business_id)
    _assert_owner_or_admin(db, current_user, svc.get_appraisal(db, biz, appraisal_id))
    return _appraisal_out(svc.submit_self_review(db, biz, appraisal_id, data))


@router.post("/appraisals/{appraisal_id}/manager-review", response_model=AppraisalOut)
def manager_review(
    appraisal_id: uuid.UUID,
    data: ManagerReviewIn,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz = resolve_business_id(current_user, business_id)
    appraisal = svc.get_appraisal(db, biz, appraisal_id)
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not _is_admin(current_user) and not (emp and emp.id == appraisal.reviewer_id):
        raise HTTPException(status_code=403, detail="Only the assigned reviewer or HR can submit the manager review.")
    return _appraisal_out(svc.submit_manager_review(db, biz, appraisal_id, data))


@router.post("/appraisals/{appraisal_id}/calibrate", response_model=AppraisalOut)
def calibrate(
    appraisal_id: uuid.UUID,
    data: CalibrateIn,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Only HR / administrators can calibrate appraisals.")
    return _appraisal_out(svc.calibrate(db, resolve_business_id(current_user, business_id), appraisal_id, data))


@router.post("/appraisals/{appraisal_id}/acknowledge", response_model=AppraisalOut)
def acknowledge(
    appraisal_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz = resolve_business_id(current_user, business_id)
    _assert_owner_or_admin(db, current_user, svc.get_appraisal(db, biz, appraisal_id))
    return _appraisal_out(svc.acknowledge(db, biz, appraisal_id))
