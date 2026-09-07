import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.hr_payroll.recruitment.models import Candidate, Interview, InterviewEvaluation


class RecruitmentRepository:
    # Candidates
    def get_candidates(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
    ) -> list[Candidate]:
        query = select(Candidate)
        if business_id is not None:
            query = query.where(Candidate.business_id == business_id)
        return list(
            db.scalars(
                query.order_by(Candidate.created_at.desc()).offset(skip).limit(limit)
            ).all()
        )

    def get_candidate(self, db: Session, candidate_id: uuid.UUID) -> Candidate | None:
        return db.get(Candidate, candidate_id)

    def create_candidate(self, db: Session, obj_in: Candidate) -> Candidate:
        db.add(obj_in)
        db.commit()
        db.refresh(obj_in)
        return obj_in

    def update_candidate(self, db: Session, db_obj: Candidate, update_data: dict) -> Candidate:
        for field, value in update_data.items():
            if value is not None:
                setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete_candidate(self, db: Session, db_obj: Candidate) -> None:
        db.delete(db_obj)
        db.commit()

    # Interviews
    def get_interviews(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        candidate_id: uuid.UUID | None = None,
    ) -> list[Interview]:
        query = select(Interview)
        if business_id is not None:
            query = query.where(Interview.business_id == business_id)
        if candidate_id is not None:
            query = query.where(Interview.candidate_id == candidate_id)
        return list(
            db.scalars(
                query.order_by(Interview.scheduled_at.asc()).offset(skip).limit(limit)
            ).all()
        )

    def get_interview(self, db: Session, interview_id: uuid.UUID) -> Interview | None:
        return db.get(Interview, interview_id)

    def create_interview(self, db: Session, obj_in: Interview) -> Interview:
        db.add(obj_in)
        db.commit()
        db.refresh(obj_in)
        return obj_in

    def update_interview(self, db: Session, db_obj: Interview, update_data: dict) -> Interview:
        for field, value in update_data.items():
            if value is not None:
                setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete_interview(self, db: Session, db_obj: Interview) -> None:
        db.delete(db_obj)
        db.commit()

    # Evaluations
    def create_evaluation(self, db: Session, obj_in: InterviewEvaluation) -> InterviewEvaluation:
        db.add(obj_in)
        db.commit()
        db.refresh(obj_in)
        return obj_in

    def get_evaluations_for_interview(
        self, db: Session, interview_id: uuid.UUID
    ) -> list[InterviewEvaluation]:
        query = (
            select(InterviewEvaluation)
            .where(InterviewEvaluation.interview_id == interview_id)
            .order_by(InterviewEvaluation.created_at.desc())
        )
        return list(db.scalars(query).all())
