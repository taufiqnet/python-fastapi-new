import datetime
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.experience_letters.models import (
    ExperienceLetter,
    ExperienceLetterStatusEnum,
)
from app.modules.hr_payroll.experience_letters.repository import (
    ExperienceLetterRepository,
)
from app.modules.hr_payroll.experience_letters.schemas import (
    ExperienceLetterCreate,
    ExperienceLetterUpdate,
)


class ExperienceLetterService:
    def __init__(self, repo: ExperienceLetterRepository | None = None):
        self.repo = repo or ExperienceLetterRepository()

    def _generate_letter_no(self, db: Session, business_id: int) -> str:
        count = self.repo.count_by_business(db, business_id) + 1
        year = datetime.date.today().year
        return f"EL-{year}-{count:04d}"

    def get_letters(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        employee_id: uuid.UUID | None = None,
    ) -> list[ExperienceLetter]:
        return self.repo.get_all(
            db, skip=skip, limit=limit, business_id=business_id, employee_id=employee_id
        )

    def get_letter(self, db: Session, letter_id: uuid.UUID) -> ExperienceLetter:
        letter = self.repo.get_by_id(db, letter_id)
        if not letter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Experience letter with ID '{letter_id}' not found.",
            )
        return letter

    def create_letter(
        self, db: Session, letter_in: ExperienceLetterCreate
    ) -> ExperienceLetter:
        employee = db.get(Employee, letter_in.employee_id)
        if not employee or employee.business_id != letter_in.business_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"Employee with ID '{letter_in.employee_id}' "
                    f"not found in business '{letter_in.business_id}'."
                ),
            )

        joining_date = letter_in.joining_date or employee.start_date or datetime.date.today()
        designation = (
            letter_in.designation
            or (employee.job_title.name if employee.job_title else "Employee")
        )
        department = (
            letter_in.department
            or (employee.department.name if employee.department else None)
        )

        letter_no = self._generate_letter_no(db, letter_in.business_id)

        letter = ExperienceLetter(
            business_id=letter_in.business_id,
            employee_id=letter_in.employee_id,
            letter_no=letter_no,
            issue_date=letter_in.issue_date,
            joining_date=joining_date,
            relieving_date=letter_in.relieving_date,
            designation=designation,
            department=department,
            addressed_to=letter_in.addressed_to,
            status=ExperienceLetterStatusEnum.DRAFT,
            conduct_and_character=letter_in.conduct_and_character or "Good",
            notes=letter_in.notes,
        )
        return self.repo.create(db, letter)

    def update_letter(
        self, db: Session, letter_id: uuid.UUID, letter_in: ExperienceLetterUpdate
    ) -> ExperienceLetter:
        letter = self.get_letter(db, letter_id)
        update_data = letter_in.model_dump(exclude_unset=True)
        return self.repo.update(db, letter, update_data)

    def delete_letter(self, db: Session, letter_id: uuid.UUID) -> None:
        letter = self.get_letter(db, letter_id)
        self.repo.delete(db, letter)
