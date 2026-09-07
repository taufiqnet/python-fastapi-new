import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.hr_payroll.recruitment.models import (
    Candidate,
    CandidateStatusEnum,
    Interview,
    InterviewEvaluation,
    InterviewStatusEnum,
)
from app.modules.hr_payroll.recruitment.repository import RecruitmentRepository
from app.modules.hr_payroll.recruitment.schemas import (
    CandidateCreate,
    CandidateUpdate,
    InterviewCreate,
    InterviewEvaluationCreate,
    InterviewUpdate,
)


class RecruitmentService:
    def __init__(self, repo: RecruitmentRepository | None = None):
        self.repo = repo or RecruitmentRepository()

    # Candidates
    def get_candidates(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
    ) -> list[Candidate]:
        return self.repo.get_candidates(db, skip=skip, limit=limit, business_id=business_id)

    def get_candidate(self, db: Session, candidate_id: uuid.UUID) -> Candidate:
        cand = self.repo.get_candidate(db, candidate_id)
        if not cand:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Candidate with ID '{candidate_id}' not found.",
            )
        return cand

    def create_candidate(self, db: Session, cand_in: CandidateCreate) -> Candidate:
        cand = Candidate(
            business_id=cand_in.business_id,
            first_name=cand_in.first_name,
            last_name=cand_in.last_name,
            email=cand_in.email,
            phone=cand_in.phone,
            resume_path=cand_in.resume_path,
            job_title_id=cand_in.job_title_id,
            status=CandidateStatusEnum.APPLIED,
        )
        return self.repo.create_candidate(db, cand)

    def update_candidate(
        self, db: Session, candidate_id: uuid.UUID, cand_in: CandidateUpdate
    ) -> Candidate:
        cand = self.get_candidate(db, candidate_id)
        update_data = cand_in.model_dump(exclude_unset=True)
        return self.repo.update_candidate(db, cand, update_data)

    def delete_candidate(self, db: Session, candidate_id: uuid.UUID) -> None:
        cand = self.get_candidate(db, candidate_id)
        self.repo.delete_candidate(db, cand)

    # Interviews
    def get_interviews(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        candidate_id: uuid.UUID | None = None,
    ) -> list[Interview]:
        return self.repo.get_interviews(
            db, skip=skip, limit=limit, business_id=business_id, candidate_id=candidate_id
        )

    def get_interview(self, db: Session, interview_id: uuid.UUID) -> Interview:
        interview = self.repo.get_interview(db, interview_id)
        if not interview:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Interview with ID '{interview_id}' not found.",
            )
        return interview

    def create_interview(self, db: Session, interview_in: InterviewCreate) -> Interview:
        candidate = self.get_candidate(db, interview_in.candidate_id)
        interview = Interview(
            business_id=interview_in.business_id,
            candidate_id=interview_in.candidate_id,
            interviewer_id=interview_in.interviewer_id,
            stage=interview_in.stage,
            scheduled_at=interview_in.scheduled_at,
            duration_minutes=interview_in.duration_minutes,
            location_link=interview_in.location_link,
            status=InterviewStatusEnum.SCHEDULED,
        )
        created_interview = self.repo.create_interview(db, interview)

        # Automatically transition candidate status to INTERVIEW_SCHEDULED
        if candidate.status in (CandidateStatusEnum.APPLIED, CandidateStatusEnum.SCREENING):
            candidate.status = CandidateStatusEnum.INTERVIEW_SCHEDULED
            db.commit()

        return created_interview

    def update_interview(
        self, db: Session, interview_id: uuid.UUID, interview_in: InterviewUpdate
    ) -> Interview:
        interview = self.get_interview(db, interview_id)
        update_data = interview_in.model_dump(exclude_unset=True)
        return self.repo.update_interview(db, interview, update_data)

    def delete_interview(self, db: Session, interview_id: uuid.UUID) -> None:
        interview = self.get_interview(db, interview_id)
        self.repo.delete_interview(db, interview)

    # Evaluations
    def create_evaluation(
        self, db: Session, eval_in: InterviewEvaluationCreate
    ) -> InterviewEvaluation:
        interview = self.get_interview(db, eval_in.interview_id)
        evaluation = InterviewEvaluation(
            interview_id=eval_in.interview_id,
            evaluator_id=eval_in.evaluator_id,
            technical_score=eval_in.technical_score,
            communication_score=eval_in.communication_score,
            culture_fit_score=eval_in.culture_fit_score,
            recommendation=eval_in.recommendation,
            feedback_notes=eval_in.feedback_notes,
        )
        res = self.repo.create_evaluation(db, evaluation)
        interview.status = InterviewStatusEnum.COMPLETED
        db.commit()
        return res

    def get_evaluations_for_interview(
        self, db: Session, interview_id: uuid.UUID
    ) -> list[InterviewEvaluation]:
        self.get_interview(db, interview_id)
        return self.repo.get_evaluations_for_interview(db, interview_id)
