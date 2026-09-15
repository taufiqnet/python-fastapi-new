import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.database import get_db
from app.modules.hr_payroll.recruitment.schemas import (
    CandidateCreate,
    CandidateOut,
    CandidateUpdate,
    InterviewCreate,
    InterviewEvaluationCreate,
    InterviewEvaluationOut,
    InterviewOut,
    InterviewUpdate,
)
from app.modules.hr_payroll.recruitment.service import RecruitmentService

router = APIRouter(prefix="/recruitment", tags=["Recruitment"])
service = RecruitmentService()


# --- Candidates ---
@router.get("/candidates", response_model=list[CandidateOut])
def get_candidates(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "recruitment", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return service.get_candidates(db, skip=skip, limit=limit, business_id=resolved_business_id)


@router.get("/candidates/{candidate_id}", response_model=CandidateOut)
def get_candidate(
    candidate_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "recruitment", "view")),
):
    return service.get_candidate(db, candidate_id, current_user=current_user)


@router.post(
    "/candidates",
    response_model=CandidateOut,
    status_code=status.HTTP_201_CREATED,
)
def create_candidate(
    cand_data: CandidateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "recruitment", "create")),
):
    resolved_business_id = resolve_business_id(current_user, cand_data.business_id)
    if not current_user.is_superuser:
        cand_data.business_id = current_user.business_id
    elif cand_data.business_id is None:
        cand_data.business_id = resolved_business_id
    return service.create_candidate(db, cand_data)


@router.put("/candidates/{candidate_id}", response_model=CandidateOut)
def update_candidate(
    candidate_id: uuid.UUID,
    cand_data: CandidateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "recruitment", "update")),
):
    return service.update_candidate(db, candidate_id, cand_data, current_user=current_user)


@router.delete("/candidates/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_candidate(
    candidate_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "recruitment", "delete")),
):
    service.delete_candidate(db, candidate_id, current_user=current_user)
    return None


# --- Interviews ---
@router.get("/interviews", response_model=list[InterviewOut])
def get_interviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    candidate_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "recruitment", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return service.get_interviews(
        db, skip=skip, limit=limit, business_id=resolved_business_id, candidate_id=candidate_id
    )


@router.get("/interviews/{interview_id}", response_model=InterviewOut)
def get_interview(
    interview_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "recruitment", "view")),
):
    return service.get_interview(db, interview_id, current_user=current_user)


@router.post(
    "/interviews",
    response_model=InterviewOut,
    status_code=status.HTTP_201_CREATED,
)
def create_interview(
    interview_data: InterviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "recruitment", "create")),
):
    resolved_business_id = resolve_business_id(current_user, interview_data.business_id)
    if not current_user.is_superuser:
        interview_data.business_id = current_user.business_id
    elif interview_data.business_id is None:
        interview_data.business_id = resolved_business_id
    return service.create_interview(db, interview_data, current_user=current_user)


@router.put("/interviews/{interview_id}", response_model=InterviewOut)
def update_interview(
    interview_id: uuid.UUID,
    interview_data: InterviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "recruitment", "update")),
):
    return service.update_interview(db, interview_id, interview_data, current_user=current_user)


@router.delete("/interviews/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_interview(
    interview_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "recruitment", "delete")),
):
    service.delete_interview(db, interview_id, current_user=current_user)
    return None


# --- Evaluations ---
@router.post(
    "/evaluations",
    response_model=InterviewEvaluationOut,
    status_code=status.HTTP_201_CREATED,
)
def create_evaluation(
    eval_data: InterviewEvaluationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "recruitment", "create")),
):
    return service.create_evaluation(db, eval_data, current_user=current_user)


@router.get(
    "/interviews/{interview_id}/evaluations",
    response_model=list[InterviewEvaluationOut],
)
def get_interview_evaluations(
    interview_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "recruitment", "view")),
):
    return service.get_evaluations_for_interview(db, interview_id, current_user=current_user)
