import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.hr_payroll.organization.models import Department, JobTitle
from app.modules.hr_payroll.organization.repository import (
    DepartmentRepository,
    JobTitleRepository,
)
from app.modules.hr_payroll.organization.schemas import (
    DepartmentCreate,
    DepartmentUpdate,
    JobTitleCreate,
    JobTitleUpdate,
)


class DepartmentService:

    def __init__(self, repository: DepartmentRepository | None = None):
        self.repository = repository or DepartmentRepository()

    def get_departments(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
    ) -> list[Department]:
        return self.repository.get_all(
            db, skip=skip, limit=limit, business_id=business_id
        )

    def get_department(self, db: Session, department_id: uuid.UUID) -> Department:
        department = self.repository.get_by_id(db, department_id)
        if not department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found",
            )
        return department

    def create_department(self, db: Session, data: DepartmentCreate) -> Department:
        if self.repository.get_by_slug(db, data.slug, data.business_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Department with slug '{data.slug}' already exists",
            )
        if self.repository.get_by_name(db, data.name, data.business_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Department with name '{data.name}' already exists",
            )

        return self.repository.create(db, data)

    def update_department(
        self, db: Session, department_id: uuid.UUID, data: DepartmentUpdate
    ) -> Department:
        department = self.get_department(db, department_id)

        target_business_id = (
            data.business_id
            if data.business_id is not None
            else department.business_id
        )

        if data.slug is not None and data.slug != department.slug:
            existing = self.repository.get_by_slug(
                db, data.slug, target_business_id
            )
            if existing and existing.id != department_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Department with slug '{data.slug}' already exists",
                )

        if data.name is not None and data.name != department.name:
            existing_name = self.repository.get_by_name(
                db, data.name, target_business_id
            )
            if existing_name and existing_name.id != department_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Department with name '{data.name}' already exists",
                )

        return self.repository.update(db, department, data)

    def delete_department(self, db: Session, department_id: uuid.UUID) -> None:
        department = self.get_department(db, department_id)
        self.repository.delete(db, department)


class JobTitleService:

    def __init__(
        self,
        repository: JobTitleRepository | None = None,
        department_repository: DepartmentRepository | None = None,
    ):
        self.repository = repository or JobTitleRepository()
        self.department_repository = (
            department_repository or DepartmentRepository()
        )

    def get_job_titles(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        department_id: uuid.UUID | None = None,
    ) -> list[JobTitle]:
        return self.repository.get_all(
            db,
            skip=skip,
            limit=limit,
            business_id=business_id,
            department_id=department_id,
        )

    def get_job_title(self, db: Session, job_title_id: uuid.UUID) -> JobTitle:
        job_title = self.repository.get_by_id(db, job_title_id)
        if not job_title:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job title not found",
            )
        return job_title

    def create_job_title(self, db: Session, data: JobTitleCreate) -> JobTitle:
        if data.department_id is not None:
            dept = self.department_repository.get_by_id(db, data.department_id)
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Department with id '{data.department_id}' not found",
                )
            existing = self.repository.get_by_name(
                db, data.name, department_id=data.department_id
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Job title with name '{data.name}' already exists in"
                        " this department"
                    ),
                )

        return self.repository.create(db, data)

    def update_job_title(
        self, db: Session, job_title_id: uuid.UUID, data: JobTitleUpdate
    ) -> JobTitle:
        job_title = self.get_job_title(db, job_title_id)

        target_department_id = (
            data.department_id
            if data.department_id is not None
            else job_title.department_id
        )

        if target_department_id is not None:
            dept = self.department_repository.get_by_id(db, target_department_id)
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Department with id '{target_department_id}' not found",
                )

            target_name = data.name if data.name is not None else job_title.name
            existing = self.repository.get_by_name(
                db, target_name, department_id=target_department_id
            )
            if existing and existing.id != job_title_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Job title with name '{target_name}' already exists in"
                        " this department"
                    ),
                )

        return self.repository.update(db, job_title, data)

    def delete_job_title(self, db: Session, job_title_id: uuid.UUID) -> None:
        job_title = self.get_job_title(db, job_title_id)
        self.repository.delete(db, job_title)
