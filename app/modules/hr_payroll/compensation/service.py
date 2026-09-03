import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.hr_payroll.compensation.models import EmployeeSalary
from app.modules.hr_payroll.compensation.repository import EmployeeSalaryRepository
from app.modules.hr_payroll.compensation.schemas import (
    EmployeeSalaryCreate,
    EmployeeSalaryUpdate,
)
from app.modules.hr_payroll.employees.repository import EmployeeRepository


class EmployeeSalaryService:
    def __init__(
        self,
        repository: EmployeeSalaryRepository | None = None,
        employee_repository: EmployeeRepository | None = None,
    ):
        self.repository = repository or EmployeeSalaryRepository()
        self.employee_repository = employee_repository or EmployeeRepository()

    def _compute_totals(
        self,
        basic_salary: float,
        house_rent: float,
        medical_allowance: float,
        transport_allowance: float,
        food_allowance: float,
        other_allowance: float,
        tax: float,
        provident_fund: float,
        other_deduction: float,
    ) -> tuple[float, float]:
        gross = (
            float(basic_salary)
            + float(house_rent)
            + float(medical_allowance)
            + float(transport_allowance)
            + float(food_allowance)
            + float(other_allowance)
        )
        deductions = float(tax) + float(provident_fund) + float(other_deduction)
        net = gross - deductions
        return round(gross, 2), round(net, 2)

    def get_salaries(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        employee_id: uuid.UUID | None = None,
    ) -> list[EmployeeSalary]:
        return self.repository.get_all(
            db,
            skip=skip,
            limit=limit,
            business_id=business_id,
            employee_id=employee_id,
        )

    def get_salary(self, db: Session, salary_uuid: uuid.UUID) -> EmployeeSalary:
        salary = self.repository.get_by_id(db, salary_uuid)
        if not salary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee salary structure not found",
            )
        return salary

    def get_salary_by_employee(
        self, db: Session, employee_id: uuid.UUID
    ) -> EmployeeSalary:
        salary = self.repository.get_by_employee_id(db, employee_id)
        if not salary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Salary structure for employee id '{employee_id}' not found",
            )
        return salary

    def create_salary_structure(
        self, db: Session, data: EmployeeSalaryCreate
    ) -> EmployeeSalary:
        employee = self.employee_repository.get_by_id(db, data.employee_id)
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with id '{data.employee_id}' not found",
            )

        existing = self.repository.get_by_employee_id(db, data.employee_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Salary structure already exists for employee "
                    f"'{data.employee_id}'"
                ),
            )

        gross_salary, net_salary = self._compute_totals(
            basic_salary=data.basic_salary,
            house_rent=data.house_rent,
            medical_allowance=data.medical_allowance,
            transport_allowance=data.transport_allowance,
            food_allowance=data.food_allowance,
            other_allowance=data.other_allowance,
            tax=data.tax,
            provident_fund=data.provident_fund,
            other_deduction=data.other_deduction,
        )

        return self.repository.create(
            db, data=data, gross_salary=gross_salary, net_salary=net_salary
        )

    def update_salary_structure(
        self, db: Session, salary_uuid: uuid.UUID, data: EmployeeSalaryUpdate
    ) -> EmployeeSalary:
        salary = self.get_salary(db, salary_uuid)

        basic_salary = (
            data.basic_salary
            if data.basic_salary is not None
            else float(salary.basic_salary)
        )
        house_rent = (
            data.house_rent if data.house_rent is not None else float(salary.house_rent)
        )
        medical_allowance = (
            data.medical_allowance
            if data.medical_allowance is not None
            else float(salary.medical_allowance)
        )
        transport_allowance = (
            data.transport_allowance
            if data.transport_allowance is not None
            else float(salary.transport_allowance)
        )
        food_allowance = (
            data.food_allowance
            if data.food_allowance is not None
            else float(salary.food_allowance)
        )
        other_allowance = (
            data.other_allowance
            if data.other_allowance is not None
            else float(salary.other_allowance)
        )
        tax = data.tax if data.tax is not None else float(salary.tax)
        provident_fund = (
            data.provident_fund
            if data.provident_fund is not None
            else float(salary.provident_fund)
        )
        other_deduction = (
            data.other_deduction
            if data.other_deduction is not None
            else float(salary.other_deduction)
        )

        gross_salary, net_salary = self._compute_totals(
            basic_salary=basic_salary,
            house_rent=house_rent,
            medical_allowance=medical_allowance,
            transport_allowance=transport_allowance,
            food_allowance=food_allowance,
            other_allowance=other_allowance,
            tax=tax,
            provident_fund=provident_fund,
            other_deduction=other_deduction,
        )

        return self.repository.update(
            db,
            salary=salary,
            data=data,
            gross_salary=gross_salary,
            net_salary=net_salary,
        )

    def upsert_salary_structure(
        self, db: Session, data: EmployeeSalaryCreate
    ) -> EmployeeSalary:
        existing = self.repository.get_by_employee_id(db, data.employee_id)
        if existing:
            update_data = EmployeeSalaryUpdate(**data.model_dump(exclude_unset=True))
            return self.update_salary_structure(db, existing.id, update_data)
        return self.create_salary_structure(db, data)

    def delete_salary_structure(self, db: Session, salary_uuid: uuid.UUID) -> None:
        salary = self.get_salary(db, salary_uuid)
        self.repository.delete(db, salary)
