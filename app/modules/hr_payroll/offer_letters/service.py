import datetime
import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.tenancy.scoping import verify_record_ownership
from app.modules.hr_payroll.offer_letters.models import (
    OfferLetter,
    OfferLetterStatusEnum,
)
from app.modules.hr_payroll.offer_letters.repository import OfferLetterRepository
from app.modules.hr_payroll.offer_letters.schemas import (
    OfferLetterCreate,
    OfferLetterUpdate,
)


class OfferLetterService:
    def __init__(self, repo: OfferLetterRepository | None = None):
        self.repo = repo or OfferLetterRepository()

    def _generate_letter_no(self, db: Session, business_id: int) -> str:
        count = self.repo.count_by_business(db, business_id) + 1
        year = datetime.date.today().year
        return f"OL-{year}-{count:04d}"

    def get_letters(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
    ) -> list[OfferLetter]:
        return self.repo.get_all(db, skip=skip, limit=limit, business_id=business_id)

    def get_letter(
        self, db: Session, letter_id: uuid.UUID, current_user: Any | None = None
    ) -> OfferLetter:
        letter = self.repo.get_by_id(db, letter_id)
        if current_user is not None:
            return verify_record_ownership(
                letter, current_user, detail=f"Offer letter with ID '{letter_id}' not found."
            )
        if not letter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Offer letter with ID '{letter_id}' not found.",
            )
        return letter

    def create_letter(
        self, db: Session, letter_in: OfferLetterCreate
    ) -> OfferLetter:
        letter_no = self._generate_letter_no(db, letter_in.business_id)

        letter = OfferLetter(
            business_id=letter_in.business_id,
            letter_no=letter_no,
            candidate_name=letter_in.candidate_name,
            candidate_email=letter_in.candidate_email,
            candidate_phone=letter_in.candidate_phone,
            job_title=letter_in.job_title,
            department=letter_in.department,
            offered_salary=letter_in.offered_salary,
            joining_date=letter_in.joining_date,
            issue_date=letter_in.issue_date,
            valid_until=letter_in.valid_until,
            status=OfferLetterStatusEnum.DRAFT,
            terms=letter_in.terms,
            notes=letter_in.notes,
        )
        return self.repo.create(db, letter)

    def update_letter(
        self,
        db: Session,
        letter_id: uuid.UUID,
        letter_in: OfferLetterUpdate,
        current_user: Any | None = None,
    ) -> OfferLetter:
        letter = self.get_letter(db, letter_id, current_user=current_user)
        update_data = letter_in.model_dump(exclude_unset=True)
        return self.repo.update(db, letter, update_data)

    def delete_letter(
        self, db: Session, letter_id: uuid.UUID, current_user: Any | None = None
    ) -> None:
        letter = self.get_letter(db, letter_id, current_user=current_user)
        self.repo.delete(db, letter)
