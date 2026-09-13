import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.hr_payroll.experience_letters.schemas import (
    ExperienceLetterCreate,
    ExperienceLetterOut,
    ExperienceLetterUpdate,
)
from app.modules.hr_payroll.experience_letters.service import ExperienceLetterService

router = APIRouter(prefix="/experience-letters", tags=["Experience Letters"])
service = ExperienceLetterService()


@router.get("", response_model=list[ExperienceLetterOut])
def get_experience_letters(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    employee_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.get_letters(
        db, skip=skip, limit=limit, business_id=business_id, employee_id=employee_id
    )


@router.get("/{letter_id}", response_model=ExperienceLetterOut)
def get_experience_letter(letter_id: uuid.UUID, db: Session = Depends(get_db)):
    return service.get_letter(db, letter_id)


@router.post(
    "",
    response_model=ExperienceLetterOut,
    status_code=status.HTTP_201_CREATED,
)
def create_experience_letter(
    letter_data: ExperienceLetterCreate, db: Session = Depends(get_db)
):
    return service.create_letter(db, letter_data)


@router.put("/{letter_id}", response_model=ExperienceLetterOut)
def update_experience_letter(
    letter_id: uuid.UUID,
    letter_data: ExperienceLetterUpdate,
    db: Session = Depends(get_db),
):
    return service.update_letter(db, letter_id, letter_data)


@router.delete("/{letter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_experience_letter(letter_id: uuid.UUID, db: Session = Depends(get_db)):
    service.delete_letter(db, letter_id)
    return None
