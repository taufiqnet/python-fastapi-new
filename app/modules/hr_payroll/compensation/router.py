import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.database import get_db
from app.modules.hr_payroll.compensation.schemas import (
    EmployeeSalaryCreate,
    EmployeeSalaryOut,
    EmployeeSalaryUpdate,
)
from app.modules.hr_payroll.compensation.service import EmployeeSalaryService

router = APIRouter(prefix="/compensation", tags=["Compensation Management"])

salary_service = EmployeeSalaryService()


@router.get("/export-excel")
def export_compensation_excel(
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "compensation", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    excel_data = salary_service.generate_export_excel(db, business_id=resolved_business_id)
    filename = "compensation_export.xlsx" if not resolved_business_id else f"compensation_business_{resolved_business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/template-excel")
def download_compensation_excel_template(
    business_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "compensation", "create")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    if not resolved_business_id or resolved_business_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business profile ID is mandatory.",
        )
    excel_data = salary_service.generate_excel_template(db, business_id=resolved_business_id)
    filename = f"compensation_template_business_{resolved_business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/import-excel")
async def import_compensation_excel(
    business_id: int = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "compensation", "create")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    if not resolved_business_id or resolved_business_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business profile ID is mandatory.",
        )
    contents = await file.read()
    return salary_service.import_salaries_excel(
        db, business_id=resolved_business_id, file_bytes=contents
    )


@router.get("/salaries", response_model=list[EmployeeSalaryOut])
def get_salaries(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    employee_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "compensation", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return salary_service.get_salaries(
        db,
        skip=skip,
        limit=limit,
        business_id=resolved_business_id,
        employee_id=employee_id,
    )


@router.get("/salaries/employee/{employee_id}", response_model=EmployeeSalaryOut)
def get_salary_by_employee(
    employee_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "compensation", "view")),
):
    return salary_service.get_salary_by_employee(db, employee_id, current_user=current_user)


@router.get("/salaries/{salary_id}", response_model=EmployeeSalaryOut)
def get_salary(
    salary_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "compensation", "view")),
):
    return salary_service.get_salary(db, salary_id, current_user=current_user)


@router.post(
    "/salaries",
    response_model=EmployeeSalaryOut,
    status_code=status.HTTP_201_CREATED,
)
def create_salary(
    salary_data: EmployeeSalaryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "compensation", "create")),
):
    resolved_business_id = resolve_business_id(current_user, salary_data.business_id)
    if not current_user.is_superuser:
        salary_data.business_id = current_user.business_id
    elif salary_data.business_id is None:
        salary_data.business_id = resolved_business_id
    return salary_service.create_salary_structure(db, salary_data)


@router.put("/salaries/{salary_id}", response_model=EmployeeSalaryOut)
def update_salary(
    salary_id: uuid.UUID,
    salary_data: EmployeeSalaryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "compensation", "update")),
):
    if not current_user.is_superuser:
        salary_data.business_id = current_user.business_id
    return salary_service.update_salary_structure(
        db, salary_id, salary_data, current_user=current_user
    )


@router.delete("/salaries/{salary_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_salary(
    salary_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "compensation", "delete")),
):
    salary_service.delete_salary_structure(db, salary_id, current_user=current_user)
    return None
