import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.hr_payroll.compensation.schemas import (
    EmployeeSalaryCreate,
    EmployeeSalaryOut,
    EmployeeSalaryUpdate,
)
from app.modules.hr_payroll.compensation.service import EmployeeSalaryService

router = APIRouter(prefix="/compensation", tags=["Compensation Management"])

salary_service = EmployeeSalaryService()


@router.get("/salaries", response_model=list[EmployeeSalaryOut])
def get_salaries(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    employee_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    return salary_service.get_salaries(
        db,
        skip=skip,
        limit=limit,
        business_id=business_id,
        employee_id=employee_id,
    )


@router.get("/salaries/employee/{employee_id}", response_model=EmployeeSalaryOut)
def get_salary_by_employee(
    employee_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    return salary_service.get_salary_by_employee(db, employee_id)


@router.get("/salaries/{salary_id}", response_model=EmployeeSalaryOut)
def get_salary(salary_id: uuid.UUID, db: Session = Depends(get_db)):
    return salary_service.get_salary(db, salary_id)


@router.post(
    "/salaries",
    response_model=EmployeeSalaryOut,
    status_code=status.HTTP_201_CREATED,
)
def create_salary(salary_data: EmployeeSalaryCreate, db: Session = Depends(get_db)):
    return salary_service.create_salary_structure(db, salary_data)


@router.put("/salaries/{salary_id}", response_model=EmployeeSalaryOut)
def update_salary(
    salary_id: uuid.UUID,
    salary_data: EmployeeSalaryUpdate,
    db: Session = Depends(get_db),
):
    return salary_service.update_salary_structure(db, salary_id, salary_data)


@router.delete("/salaries/{salary_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_salary(salary_id: uuid.UUID, db: Session = Depends(get_db)):
    salary_service.delete_salary_structure(db, salary_id)
    return None
