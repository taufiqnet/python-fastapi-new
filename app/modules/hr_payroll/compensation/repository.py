import uuid

from sqlalchemy.orm import Session

from app.modules.hr_payroll.compensation.models import EmployeeSalary
from app.modules.hr_payroll.compensation.schemas import (
    EmployeeSalaryCreate,
    EmployeeSalaryUpdate,
)


class EmployeeSalaryRepository:
    def get_by_id(self, db: Session, salary_uuid: uuid.UUID) -> EmployeeSalary | None:
        return db.query(EmployeeSalary).filter(EmployeeSalary.id == salary_uuid).first()

    def get_by_employee_id(
        self,
        db: Session,
        employee_id: uuid.UUID,
        business_id: int | None = None,
    ) -> EmployeeSalary | None:
        query = db.query(EmployeeSalary).filter(
            EmployeeSalary.employee_id == employee_id
        )
        if business_id is not None:
            query = query.filter(EmployeeSalary.business_id == business_id)
        return query.first()

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        employee_id: uuid.UUID | None = None,
    ) -> list[EmployeeSalary]:
        query = db.query(EmployeeSalary)
        if business_id is not None:
            query = query.filter(EmployeeSalary.business_id == business_id)
        if employee_id is not None:
            query = query.filter(EmployeeSalary.employee_id == employee_id)
        return query.offset(skip).limit(limit).all()

    def create(
        self,
        db: Session,
        data: EmployeeSalaryCreate,
        gross_salary: float,
        net_salary: float,
    ) -> EmployeeSalary:
        salary_data = data.model_dump()
        salary_data["gross_salary"] = gross_salary
        salary_data["net_salary"] = net_salary
        salary = EmployeeSalary(**salary_data)
        db.add(salary)
        db.commit()
        db.refresh(salary)
        return salary

    def update(
        self,
        db: Session,
        salary: EmployeeSalary,
        data: EmployeeSalaryUpdate,
        gross_salary: float | None = None,
        net_salary: float | None = None,
    ) -> EmployeeSalary:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(salary, field, value)

        if gross_salary is not None:
            salary.gross_salary = gross_salary
        if net_salary is not None:
            salary.net_salary = net_salary

        db.commit()
        db.refresh(salary)
        return salary

    def delete(self, db: Session, salary: EmployeeSalary) -> None:
        db.delete(salary)
        db.commit()
