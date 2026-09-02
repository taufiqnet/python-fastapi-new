import uuid

from sqlalchemy.orm import Session

from app.modules.hr_payroll.organization.models import Department, JobTitle
from app.modules.hr_payroll.organization.schemas import (
    DepartmentCreate,
    DepartmentUpdate,
    JobTitleCreate,
    JobTitleUpdate,
)


class DepartmentRepository:

    def get_by_id(self, db: Session, department_id: uuid.UUID) -> Department | None:
        return db.query(Department).filter(Department.id == department_id).first()

    def get_by_slug(
        self, db: Session, slug: str, business_id: int | None = None
    ) -> Department | None:
        query = db.query(Department).filter(Department.slug == slug)
        if business_id is not None:
            query = query.filter(Department.business_id == business_id)
        return query.first()

    def get_by_name(
        self, db: Session, name: str, business_id: int | None = None
    ) -> Department | None:
        query = db.query(Department).filter(Department.name == name)
        if business_id is not None:
            query = query.filter(Department.business_id == business_id)
        return query.first()

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
    ) -> list[Department]:
        query = db.query(Department)
        if business_id is not None:
            query = query.filter(Department.business_id == business_id)
        return query.offset(skip).limit(limit).all()

    def create(self, db: Session, data: DepartmentCreate) -> Department:
        department = Department(
            name=data.name,
            slug=data.slug,
            description=data.description,
            is_active=data.is_active,
            multiple_heads_allowed=data.multiple_heads_allowed,
            business_id=data.business_id,
        )
        db.add(department)
        db.commit()
        db.refresh(department)
        return department

    def update(
        self, db: Session, department: Department, data: DepartmentUpdate
    ) -> Department:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(department, field, value)

        db.commit()
        db.refresh(department)
        return department

    def delete(self, db: Session, department: Department) -> None:
        db.delete(department)
        db.commit()


class JobTitleRepository:

    def get_by_id(self, db: Session, job_title_id: uuid.UUID) -> JobTitle | None:
        return db.query(JobTitle).filter(JobTitle.id == job_title_id).first()

    def get_by_name(
        self, db: Session, name: str, department_id: uuid.UUID | None = None
    ) -> JobTitle | None:
        query = db.query(JobTitle).filter(JobTitle.name == name)
        if department_id is not None:
            query = query.filter(JobTitle.department_id == department_id)
        return query.first()

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        department_id: uuid.UUID | None = None,
    ) -> list[JobTitle]:
        query = db.query(JobTitle)
        if business_id is not None:
            query = query.filter(JobTitle.business_id == business_id)
        if department_id is not None:
            query = query.filter(JobTitle.department_id == department_id)
        return query.offset(skip).limit(limit).all()

    def create(self, db: Session, data: JobTitleCreate) -> JobTitle:
        job_title = JobTitle(
            name=data.name,
            short_name=data.short_name,
            description=data.description,
            is_active=data.is_active,
            department_id=data.department_id,
            business_id=data.business_id,
        )
        db.add(job_title)
        db.commit()
        db.refresh(job_title)
        return job_title

    def update(
        self, db: Session, job_title: JobTitle, data: JobTitleUpdate
    ) -> JobTitle:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(job_title, field, value)

        db.commit()
        db.refresh(job_title)
        return job_title

    def delete(self, db: Session, job_title: JobTitle) -> None:
        db.delete(job_title)
        db.commit()
