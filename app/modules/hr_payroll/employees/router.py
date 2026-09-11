import uuid

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.database import get_db
from app.modules.hr_payroll.employees.schemas import (
    EmployeeCreate,
    EmployeeOut,
    EmployeeUpdate,
)
from app.modules.hr_payroll.employees.service import EmployeeService

router = APIRouter(tags=["Employees"])

employee_service = EmployeeService()


@router.get("/employees/export-excel")
def export_employees_excel(
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    _perm=Depends(require_permission("hrm", "employees", "view")),
):
    excel_data = employee_service.generate_export_excel(db, business_id=business_id)
    filename = "employees_export.xlsx" if not business_id else f"employees_export_business_{business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/employees/template-excel")
def download_employees_excel_template(
    business_id: int = Query(...),
    db: Session = Depends(get_db),
    _perm=Depends(require_permission("hrm", "employees", "create")),
):
    excel_data = employee_service.generate_excel_template(db, business_id=business_id)
    filename = f"employee_template_business_{business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/employees/import-excel")
async def import_employees_excel(
    business_id: int = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _perm=Depends(require_permission("hrm", "employees", "create")),
):
    contents = await file.read()
    return employee_service.import_employees_excel(
        db, business_id=business_id, file_bytes=contents
    )


@router.get("/employees", response_model=list[EmployeeOut])
def get_employees(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    department_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
    _perm=Depends(require_permission("hrm", "employees", "view")),
):
    return employee_service.get_employees(
        db,
        skip=skip,
        limit=limit,
        business_id=business_id,
        department_id=department_id,
    )


@router.get("/employees/{employee_id}", response_model=EmployeeOut)
def get_employee(
    employee_id: uuid.UUID,
    db: Session = Depends(get_db),
    _perm=Depends(require_permission("hrm", "employees", "view")),
):
    return employee_service.get_employee(db, employee_id)


@router.post(
    "/employees",
    response_model=EmployeeOut,
    status_code=status.HTTP_201_CREATED,
)
def create_employee(
    employee_data: EmployeeCreate,
    db: Session = Depends(get_db),
    _perm=Depends(require_permission("hrm", "employees", "create")),
):
    return employee_service.create_employee(db, employee_data)


@router.put("/employees/{employee_id}", response_model=EmployeeOut)
def update_employee(
    employee_id: uuid.UUID,
    employee_data: EmployeeUpdate,
    db: Session = Depends(get_db),
    _perm=Depends(require_permission("hrm", "employees", "update")),
):
    return employee_service.update_employee(db, employee_id, employee_data)


@router.delete("/employees/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: uuid.UUID,
    db: Session = Depends(get_db),
    _perm=Depends(require_permission("hrm", "employees", "delete")),
):
    employee_service.delete_employee(db, employee_id)
    return None
