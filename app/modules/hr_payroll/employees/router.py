import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.hr_payroll.employees.schemas import (
    EmployeeCreate,
    EmployeeOut,
    EmployeeUpdate,
)
from app.modules.hr_payroll.employees.service import EmployeeService

router = APIRouter(tags=["Employees"])

employee_service = EmployeeService()


@router.get("/employees", response_model=list[EmployeeOut])
def get_employees(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    department_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    return employee_service.get_employees(
        db,
        skip=skip,
        limit=limit,
        business_id=business_id,
        department_id=department_id,
    )


@router.get("/employees/{employee_id}", response_model=EmployeeOut)
def get_employee(employee_id: uuid.UUID, db: Session = Depends(get_db)):
    return employee_service.get_employee(db, employee_id)


@router.post(
    "/employees",
    response_model=EmployeeOut,
    status_code=status.HTTP_201_CREATED,
)
def create_employee(
    employee_data: EmployeeCreate, db: Session = Depends(get_db)
):
    return employee_service.create_employee(db, employee_data)


@router.put("/employees/{employee_id}", response_model=EmployeeOut)
def update_employee(
    employee_id: uuid.UUID,
    employee_data: EmployeeUpdate,
    db: Session = Depends(get_db),
):
    return employee_service.update_employee(db, employee_id, employee_data)


@router.delete("/employees/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(employee_id: uuid.UUID, db: Session = Depends(get_db)):
    employee_service.delete_employee(db, employee_id)
    return None
