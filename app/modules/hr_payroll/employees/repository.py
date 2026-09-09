import uuid

from sqlalchemy.orm import Session

from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.employees.schemas import (
    EmployeeCreate,
    EmployeeUpdate,
)


class EmployeeRepository:

    def get_by_id(self, db: Session, employee_uuid: uuid.UUID) -> Employee | None:
        return db.query(Employee).filter(Employee.id == employee_uuid).first()

    def get_by_employee_id(
        self, db: Session, employee_id: str, business_id: int
    ) -> Employee | None:
        return (
            db.query(Employee)
            .filter(
                Employee.employee_id == employee_id,
                Employee.business_id == business_id,
            )
            .first()
        )

    def get_by_work_email(
        self, db: Session, work_email: str, business_id: int
    ) -> Employee | None:
        return (
            db.query(Employee)
            .filter(
                Employee.work_email == work_email,
                Employee.business_id == business_id,
            )
            .first()
        )

    def get_by_phone(
        self, db: Session, phone: str, business_id: int
    ) -> Employee | None:
        return (
            db.query(Employee)
            .filter(
                Employee.phone == phone,
                Employee.business_id == business_id,
            )
            .first()
        )

    def get_active_department_head(
        self, db: Session, department_id: uuid.UUID, business_id: int
    ) -> Employee | None:
        return (
            db.query(Employee)
            .filter(
                Employee.department_id == department_id,
                Employee.business_id == business_id,
                Employee.is_department_head.is_(True),
                Employee.is_active.is_(True),
            )
            .first()
        )

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        department_id: uuid.UUID | None = None,
    ) -> list[Employee]:
        query = db.query(Employee)
        if business_id is not None:
            query = query.filter(Employee.business_id == business_id)
        if department_id is not None:
            query = query.filter(Employee.department_id == department_id)
        return query.offset(skip).limit(limit).all()

    def count_employees(
        self,
        db: Session,
        business_id: int | None = None,
        department_id: uuid.UUID | None = None,
        status: str | None = None,
    ) -> int:
        query = db.query(Employee)
        if business_id is not None:
            query = query.filter(Employee.business_id == business_id)
        if department_id is not None:
            query = query.filter(Employee.department_id == department_id)
        if status is not None:
            s_lower = status.strip().lower()
            if s_lower in ("active", "true", "1"):
                query = query.filter(Employee.is_active.is_(True))
            elif s_lower in ("inactive", "false", "0"):
                query = query.filter(Employee.is_active.is_(False))
        return query.count()

    def count_employees_by_department(
        self,
        db: Session,
        business_id: int | None = None,
    ) -> list[tuple[str, int]]:
        from sqlalchemy import func
        from app.modules.hr_payroll.organization.models import Department

        query = (
            db.query(
                func.coalesce(Department.name, "Unassigned").label("dept_name"),
                func.count(Employee.id).label("emp_count"),
            )
            .outerjoin(Department, Employee.department_id == Department.id)
        )
        if business_id is not None:
            query = query.filter(Employee.business_id == business_id)
        query = query.group_by(Department.name)
        results = query.all()
        return [(str(r[0]), int(r[1])) for r in results]

    def search_employees(
        self,
        db: Session,
        search: str | None = None,
        business_id: int | None = None,
        department_id: uuid.UUID | None = None,
        status: str | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Employee], int]:
        from sqlalchemy import or_

        query = db.query(Employee)
        if business_id is not None:
            query = query.filter(Employee.business_id == business_id)
        if department_id is not None:
            query = query.filter(Employee.department_id == department_id)
        if status is not None:
            s_lower = status.strip().lower()
            if s_lower in ("active", "true", "1"):
                query = query.filter(Employee.is_active.is_(True))
            elif s_lower in ("inactive", "false", "0"):
                query = query.filter(Employee.is_active.is_(False))

        if search:
            pattern = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Employee.first_name.ilike(pattern),
                    Employee.middle_name.ilike(pattern),
                    Employee.last_name.ilike(pattern),
                    Employee.employee_id.ilike(pattern),
                    Employee.work_email.ilike(pattern),
                )
            )

        total = query.count()
        employees = query.offset(skip).limit(limit).all()
        return employees, total

    def create(self, db: Session, data: EmployeeCreate) -> Employee:
        employee_data = data.model_dump()
        employee = Employee(**employee_data)
        db.add(employee)
        db.commit()
        db.refresh(employee)
        return employee

    def update(
        self, db: Session, employee: Employee, data: EmployeeUpdate
    ) -> Employee:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(employee, field, value)

        db.commit()
        db.refresh(employee)
        return employee

    def delete(self, db: Session, employee: Employee) -> None:
        db.delete(employee)
        db.commit()
