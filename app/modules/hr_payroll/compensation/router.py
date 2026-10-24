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


# ============================================================
# Salary Components Endpoints
# ============================================================
from app.modules.hr_payroll.compensation.schemas import (
    SalaryComponentCreate,
    SalaryComponentOut,
    SalaryComponentUpdate,
    SalaryStructureCreate,
    SalaryStructureOut,
    SalaryStructureUpdate,
)
from app.modules.hr_payroll.compensation.service import (
    SalaryComponentService,
    SalaryStructureService,
)

component_service = SalaryComponentService()
structure_service = SalaryStructureService()


@router.get("/components", response_model=list[SalaryComponentOut])
def get_salary_components(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    is_active: bool | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "compensation", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return component_service.get_components(
        db,
        skip=skip,
        limit=limit,
        business_id=resolved_business_id,
        is_active=is_active,
    )


@router.post(
    "/components",
    response_model=SalaryComponentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_salary_component(
    component_data: SalaryComponentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "compensation", "create")),
):
    resolved_business_id = resolve_business_id(current_user, component_data.business_id)
    if not current_user.is_superuser:
        component_data.business_id = current_user.business_id
    elif component_data.business_id is None:
        component_data.business_id = resolved_business_id
    return component_service.create_component(db, component_data)


@router.put("/components/{component_id}", response_model=SalaryComponentOut)
def update_salary_component(
    component_id: uuid.UUID,
    component_data: SalaryComponentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "compensation", "update")),
):
    return component_service.update_component(
        db, component_id, component_data, current_user=current_user
    )


@router.delete("/components/{component_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_salary_component(
    component_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "compensation", "delete")),
):
    component_service.delete_component(db, component_id, current_user=current_user)
    return None


# ============================================================
# Salary Structures Endpoints
# ============================================================
@router.get("/structures", response_model=list[SalaryStructureOut])
def get_salary_structures(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    is_active: bool | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "compensation", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return structure_service.get_structures(
        db,
        skip=skip,
        limit=limit,
        business_id=resolved_business_id,
        is_active=is_active,
    )


@router.post(
    "/structures",
    response_model=SalaryStructureOut,
    status_code=status.HTTP_201_CREATED,
)
def create_salary_structure_template(
    structure_data: SalaryStructureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "compensation", "create")),
):
    resolved_business_id = resolve_business_id(current_user, structure_data.business_id)
    if not current_user.is_superuser:
        structure_data.business_id = current_user.business_id
    elif structure_data.business_id is None:
        structure_data.business_id = resolved_business_id
    return structure_service.create_structure(db, structure_data)


@router.put("/structures/{structure_id}", response_model=SalaryStructureOut)
def update_salary_structure_template(
    structure_id: uuid.UUID,
    structure_data: SalaryStructureUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "compensation", "update")),
):
    return structure_service.update_structure(
        db, structure_id, structure_data, current_user=current_user
    )


@router.delete("/structures/{structure_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_salary_structure_template(
    structure_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "compensation", "delete")),
):
    structure_service.delete_structure(db, structure_id, current_user=current_user)
    return None

