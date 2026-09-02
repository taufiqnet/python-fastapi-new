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
