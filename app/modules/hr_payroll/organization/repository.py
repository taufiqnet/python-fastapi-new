import uuid

from sqlalchemy.orm import Session

from app.modules.hr_payroll.organization.models import Branch, Department, JobTitle
from app.modules.hr_payroll.organization.schemas import (
    BranchCreate,
    BranchUpdate,
    DepartmentCreate,
    DepartmentUpdate,
    JobTitleCreate,
    JobTitleUpdate,
)


class BranchRepository:

    def get_by_id(self, db: Session, branch_id: uuid.UUID) -> Branch | None:
        return db.query(Branch).filter(Branch.id == branch_id).first()

    def get_by_code(
        self, db: Session, code: str, business_id: int | None = None
    ) -> Branch | None:
        query = db.query(Branch).filter(Branch.code == code)
        if business_id is not None:
            query = query.filter(Branch.business_id == business_id)
        return query.first()

    def get_by_name(
        self, db: Session, name: str, business_id: int | None = None
    ) -> Branch | None:
        query = db.query(Branch).filter(Branch.name == name)
        if business_id is not None:
            query = query.filter(Branch.business_id == business_id)
        return query.first()

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        search: str | None = None,
        is_active: bool | None = None,
        branch_type: str | None = None,
    ) -> list[Branch]:
        query = db.query(Branch)
        if business_id is not None:
            query = query.filter(Branch.business_id == business_id)
        if is_active is not None:
            query = query.filter(Branch.is_active == is_active)
        if branch_type:
            query = query.filter(Branch.branch_type == branch_type)
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                (Branch.name.ilike(search_pattern))
                | (Branch.code.ilike(search_pattern))
                | (Branch.city.ilike(search_pattern))
            )
        return (
            query.order_by(Branch.is_head_office.desc(), Branch.name.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count(
        self,
        db: Session,
        business_id: int | None = None,
        search: str | None = None,
        is_active: bool | None = None,
    ) -> int:
        query = db.query(Branch)
        if business_id is not None:
            query = query.filter(Branch.business_id == business_id)
        if is_active is not None:
            query = query.filter(Branch.is_active == is_active)
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                (Branch.name.ilike(search_pattern))
                | (Branch.code.ilike(search_pattern))
            )
        return query.count()

    def create(self, db: Session, data: BranchCreate) -> Branch:
        branch = Branch(
            name=data.name,
            code=data.code,
            branch_type=data.branch_type,
            manager_employee_id=data.manager_employee_id,
            phone=data.phone,
            email=data.email,
            address=data.address,
            city=data.city,
            state=data.state,
            country=data.country,
            zip_code=data.zip_code,
            is_head_office=data.is_head_office,
            is_active=data.is_active,
            business_id=data.business_id,
        )
        db.add(branch)
        db.commit()
        db.refresh(branch)
        return branch

    def update(
        self, db: Session, branch: Branch, data: BranchUpdate
    ) -> Branch:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(branch, field, value)

        db.commit()
        db.refresh(branch)
        return branch

    def delete(self, db: Session, branch: Branch) -> None:
        db.delete(branch)
        db.commit()


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
        search: str | None = None,
        parent_id: uuid.UUID | None = None,
    ) -> list[Department]:
        query = db.query(Department)
        if business_id is not None:
            query = query.filter(Department.business_id == business_id)
        if parent_id is not None:
            query = query.filter(Department.parent_department_id == parent_id)
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                (Department.name.ilike(search_pattern)) | (Department.slug.ilike(search_pattern))
            )
        return query.order_by(Department.name.asc()).offset(skip).limit(limit).all()

    def create(self, db: Session, data: DepartmentCreate) -> Department:
        department = Department(
            name=data.name,
            code=data.code,
            slug=data.slug,
            description=data.description,
            is_active=data.is_active,
            multiple_heads_allowed=data.multiple_heads_allowed,
            parent_department_id=data.parent_department_id,
            head_employee_id=data.head_employee_id,
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
        return (
            query.order_by(JobTitle.level_rank.asc(), JobTitle.name.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def create(self, db: Session, data: JobTitleCreate) -> JobTitle:
        job_title = JobTitle(
            name=data.name,
            short_name=data.short_name,
            description=data.description,
            level_rank=data.level_rank,
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
