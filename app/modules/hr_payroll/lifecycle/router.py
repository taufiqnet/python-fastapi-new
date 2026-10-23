import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.common.timezone import today_bd
from app.core.deps import get_current_user
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.database import get_db
from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.lifecycle.models import CareerMovement, DisciplinaryCase, ProbationReview
from app.modules.hr_payroll.lifecycle.schemas import (
    ActionIssue,
    CaseCreate,
    CaseOut,
    ExplanationIn,
    IncrementPreview,
    IncrementPreviewIn,
    LifecycleStats,
    MovementCreate,
    MovementDecision,
    MovementOut,
    ProbationDecision,
    ProbationDeskRow,
    ProbationReviewCreate,
    ProbationReviewOut,
    ShowCauseIssue,
)
from app.modules.hr_payroll.lifecycle.service import LifecycleService, full_name
from app.modules.hr_payroll.organization.models import JobTitle

router = APIRouter(prefix="/lifecycle", tags=["Career Lifecycle"])
svc = LifecycleService()


def _is_admin(user: User) -> bool:
    return bool(user.is_superuser or user.has_role("admin"))


def _require_admin(user: User):
    if not _is_admin(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can perform this action.")


def _bid(user: User, business_id: Optional[int]) -> int:
    bid = resolve_business_id(user, business_id)
    if bid is None:
        raise HTTPException(status_code=400, detail="business_id is required.")
    return bid


def _title(db: Session, tid) -> Optional[str]:
    if not tid:
        return None
    jt = db.get(JobTitle, tid)
    return jt.name if jt else None


def _review_out(r: ProbationReview) -> ProbationReviewOut:
    out = ProbationReviewOut.model_validate(r)
    out.employee_name = full_name(r.employee)
    return out


def _movement_out(db: Session, m: CareerMovement) -> MovementOut:
    out = MovementOut.model_validate(m)
    out.employee_name = full_name(m.employee)
    out.previous_job_title_name = _title(db, m.previous_job_title_id)
    out.new_job_title_name = _title(db, m.new_job_title_id)
    return out


def _case_out(c: DisciplinaryCase) -> CaseOut:
    out = CaseOut.model_validate(c)
    out.employee_name = full_name(c.employee)
    return out


# ============================ Stats ============================
@router.get("/overview/stats", response_model=LifecycleStats)
def get_stats(
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return svc.stats(db, resolve_business_id(current_user, business_id))


# ============================ Probation ============================
@router.get("/probation", response_model=List[ProbationDeskRow])
def probation_desk(
    search: Optional[str] = None,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return svc.probation_desk(db, resolve_business_id(current_user, business_id), search)


@router.get("/probation/reviews", response_model=List[ProbationReviewOut])
def list_probation_reviews(
    status_filter: Optional[str] = Query(None, alias="status"),
    employee_id: Optional[uuid.UUID] = None,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = svc.list_probation_reviews(db, resolve_business_id(current_user, business_id), status_filter, employee_id)
    return [_review_out(r) for r in rows]


@router.post("/probation/reviews", response_model=ProbationReviewOut, status_code=201)
def create_probation_review(
    data: ProbationReviewCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _review_out(svc.create_probation_review(db, _bid(current_user, business_id), data))


@router.post("/probation/reviews/{review_id}/decide", response_model=ProbationReviewOut)
def decide_probation(
    review_id: uuid.UUID,
    data: ProbationDecision,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    return _review_out(svc.decide_probation(db, resolve_business_id(current_user, business_id), review_id, current_user.id, data))


@router.get("/probation/reviews/{review_id}/letter")
def probation_letter(
    review_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = svc.get_probation_review(db, resolve_business_id(current_user, business_id), review_id)
    if r.status != "approved":
        raise HTTPException(status_code=400, detail="Letter is available only after the review is approved.")
    name = full_name(r.employee)
    titles = {"confirm": "Confirmation of Employment", "extend_probation": "Extension of Probation", "extend": "Extension of Probation", "terminate": "Termination during Probation"}
    bodies = {
        "confirm": f"We are pleased to confirm your employment with effect from {r.effective_confirmation_date}.",
        "extend_probation": f"Your probation period is extended by {r.extension_months} month(s).",
        "extend": f"Your probation period is extended by {r.extension_months} month(s).",
        "terminate": "Your services will not be continued following the probation review.",
    }
    return {
        "reference_no": r.letter_reference_no or r.review_number,
        "title": titles.get(r.recommendation, "Probation Review Outcome"),
        "date": str(today_bd()),
        "employee": name,
        "body": f"Dear {name}, {bodies.get(r.recommendation, '')}",
    }


# ============================ Movements ============================
@router.post("/movements/preview-increment", response_model=IncrementPreview)
def preview_increment(
    data: IncrementPreviewIn,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return svc.preview_increment(db, resolve_business_id(current_user, business_id), data.employee_id, data.increment_type, data.increment_value)


@router.get("/movements", response_model=List[MovementOut])
def list_movements(
    action_type: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    employee_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = Query(100, le=500),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = svc.list_movements(db, resolve_business_id(current_user, business_id), action_type, status_filter, employee_id, skip, limit)
    return [_movement_out(db, m) for m in rows]


@router.post("/movements", response_model=MovementOut, status_code=201)
def create_movement(
    data: MovementCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _movement_out(db, svc.create_movement(db, _bid(current_user, business_id), data))


@router.post("/movements/{movement_id}/decide", response_model=MovementOut)
def decide_movement(
    movement_id: uuid.UUID,
    data: MovementDecision,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    return _movement_out(db, svc.decide_movement(db, resolve_business_id(current_user, business_id), movement_id, current_user.id, data))


@router.get("/movements/{movement_id}/letter")
def movement_letter(
    movement_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    m = svc.get_movement(db, resolve_business_id(current_user, business_id), movement_id)
    if m.status != "applied":
        raise HTTPException(status_code=400, detail="Letter is available only after the movement is applied.")
    name = full_name(m.employee)
    parts = []
    if m.new_job_title_id:
        parts.append(f"promoted to {_title(db, m.new_job_title_id)}")
    if m.new_branch_id or m.new_department_id:
        parts.append("transferred to your new posting")
    if m.new_gross_salary:
        parts.append(f"your gross salary is revised to {m.new_gross_salary}")
    return {
        "reference_no": m.letter_reference_no or m.movement_number,
        "title": m.action_type.replace("_", " ").title() + " Letter",
        "date": str(today_bd()),
        "employee": name,
        "body": f"Dear {name}, with effect from {m.effective_date} you are " + "; ".join(parts) + ".",
    }


# ============================ Disciplinary ============================
@router.get("/disciplinary/cases", response_model=List[CaseOut])
def list_cases(
    stage: Optional[str] = None,
    employee_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(100, le=500),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    rows = svc.list_cases(db, resolve_business_id(current_user, business_id), stage, employee_id, search, skip, limit)
    return [_case_out(c) for c in rows]


@router.post("/disciplinary/cases", response_model=CaseOut, status_code=201)
def create_case(
    data: CaseCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    return _case_out(svc.create_case(db, _bid(current_user, business_id), data))


@router.get("/disciplinary/cases/{case_id}", response_model=CaseOut)
def get_case(
    case_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    c = svc.get_case(db, resolve_business_id(current_user, business_id), case_id)
    if not _is_admin(current_user):
        me = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not me or me.id != c.employee_id:
            raise HTTPException(status_code=403, detail="Not permitted.")
    return _case_out(c)


@router.post("/disciplinary/cases/{case_id}/show-cause", response_model=CaseOut)
def issue_show_cause(
    case_id: uuid.UUID,
    data: ShowCauseIssue,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    return _case_out(svc.issue_show_cause(db, resolve_business_id(current_user, business_id), case_id, data))


@router.post("/disciplinary/cases/{case_id}/explanation", response_model=CaseOut)
def record_explanation(
    case_id: uuid.UUID,
    data: ExplanationIn,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    c = svc.get_case(db, resolve_business_id(current_user, business_id), case_id)
    if not _is_admin(current_user):
        me = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not me or me.id != c.employee_id:
            raise HTTPException(status_code=403, detail="Not permitted.")
    return _case_out(svc.record_explanation(db, resolve_business_id(current_user, business_id), case_id, data))


@router.post("/disciplinary/cases/{case_id}/action", response_model=CaseOut)
def issue_action(
    case_id: uuid.UUID,
    data: ActionIssue,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    return _case_out(svc.issue_action(db, resolve_business_id(current_user, business_id), case_id, current_user.id, data))


@router.get("/disciplinary/cases/{case_id}/letter")
def case_letter(
    case_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    c = svc.get_case(db, resolve_business_id(current_user, business_id), case_id)
    name = full_name(c.employee)
    if c.actions:
        a = c.actions[-1]
        return {
            "reference_no": a.letter_reference_no,
            "title": a.sanction_type.replace("_", " ").title(),
            "date": str(a.effective_date),
            "employee": name,
            "body": f"Dear {name}, following case {c.case_number} ({c.allegation_title}), the sanction '{a.sanction_type}' is imposed effective {a.effective_date}. {a.remarks or ''}".strip(),
        }
    if c.notices:
        n = c.notices[-1]
        return {
            "reference_no": n.notice_number,
            "title": "Show Cause Notice",
            "date": str(n.issue_date),
            "employee": name,
            "body": f"Dear {name}, {n.notice_content} Respond by {n.response_deadline}.",
        }
    raise HTTPException(status_code=400, detail="No notice or action has been issued yet.")
