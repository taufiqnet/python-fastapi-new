import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user_optional, require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.database import get_db
from app.modules.hr_payroll.organization.schemas import (
    BranchCreate,
    BranchOut,
    BranchUpdate,
    DepartmentCreate,
    DepartmentOut,
    DepartmentTreeNode,
    DepartmentUpdate,
    JobTitleCreate,
    JobTitleOut,
    JobTitleUpdate,
    OrganogramEmployeeNode,
    OrganogramStructureTree,
)
from app.modules.hr_payroll.organization.service import (
    BranchService,
    DepartmentService,
    JobTitleService,
    OrganogramService,
)

router = APIRouter(tags=["Organization"])

department_service = DepartmentService()
job_title_service = JobTitleService()
branch_service = BranchService()
organogram_service = OrganogramService()


# --- Departments Endpoints ---
@router.get("/departments/export-excel")
def export_departments_excel(
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "departments", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    excel_data = department_service.generate_export_excel(db, business_id=resolved_business_id)
    filename = "departments_export.xlsx" if not resolved_business_id else f"departments_export_business_{resolved_business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/departments/template-excel")
def download_departments_excel_template(
    business_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "departments", "create")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    if not resolved_business_id or resolved_business_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business profile ID is mandatory.",
        )
    excel_data = department_service.generate_excel_template(db, business_id=resolved_business_id)
    filename = f"department_template_business_{resolved_business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/departments/import-excel")
async def import_departments_excel(
    business_id: int = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "departments", "create")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    if not resolved_business_id or resolved_business_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business profile ID is mandatory.",
        )
    contents = await file.read()
    return department_service.import_departments_excel(
        db, business_id=resolved_business_id, file_bytes=contents
    )


@router.get("/departments", response_model=list[DepartmentOut])
def get_departments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "departments", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return department_service.get_departments(
        db, skip=skip, limit=limit, business_id=resolved_business_id, search=search
    )


@router.get("/departments/tree", response_model=list[DepartmentTreeNode])
def get_department_tree(
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "departments", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return department_service.get_department_tree(db, business_id=resolved_business_id)


@router.get("/departments/{department_id}", response_model=DepartmentOut)
def get_department(
    department_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "departments", "view")),
):
    return department_service.get_department(db, department_id, current_user=current_user)


@router.post(
    "/departments",
    response_model=DepartmentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_department(
    department_data: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "departments", "create")),
):
    resolved_business_id = resolve_business_id(current_user, department_data.business_id)
    if not current_user.is_superuser:
        department_data.business_id = current_user.business_id
    elif department_data.business_id is None:
        department_data.business_id = resolved_business_id
    return department_service.create_department(db, department_data)


@router.put("/departments/{department_id}", response_model=DepartmentOut)
def update_department(
    department_id: uuid.UUID,
    department_data: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "departments", "update")),
):
    if not current_user.is_superuser:
        department_data.business_id = current_user.business_id
    return department_service.update_department(
        db, department_id, department_data, current_user=current_user
    )


@router.delete("/departments/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    department_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "departments", "delete")),
):
    department_service.delete_department(db, department_id, current_user=current_user)
    return None


# --- Job Titles Endpoints ---
@router.get("/job-titles/export-excel")
def export_job_titles_excel(
    business_id: int | None = Query(None),
    department_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "job_titles", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    excel_data = job_title_service.generate_export_excel(
        db, business_id=resolved_business_id, department_id=department_id
    )
    filename = "job_titles_export.xlsx" if not resolved_business_id else f"job_titles_export_business_{resolved_business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/job-titles/template-excel")
def download_job_titles_excel_template(
    business_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "job_titles", "create")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    if not resolved_business_id or resolved_business_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business profile ID is mandatory.",
        )
    excel_data = job_title_service.generate_excel_template(db, business_id=resolved_business_id)
    filename = f"job_title_template_business_{resolved_business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/job-titles/import-excel")
async def import_job_titles_excel(
    business_id: int = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "job_titles", "create")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    if not resolved_business_id or resolved_business_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business profile ID is mandatory.",
        )
    contents = await file.read()
    return job_title_service.import_job_titles_excel(
        db, business_id=resolved_business_id, file_bytes=contents
    )


@router.get("/job-titles", response_model=list[JobTitleOut])
def get_job_titles(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    department_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "job_titles", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return job_title_service.get_job_titles(
        db,
        skip=skip,
        limit=limit,
        business_id=resolved_business_id,
        department_id=department_id,
    )


@router.get("/job-titles/{job_title_id}", response_model=JobTitleOut)
def get_job_title(
    job_title_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "job_titles", "view")),
):
    return job_title_service.get_job_title(db, job_title_id, current_user=current_user)


@router.post(
    "/job-titles",
    response_model=JobTitleOut,
    status_code=status.HTTP_201_CREATED,
)
def create_job_title(
    job_title_data: JobTitleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "job_titles", "create")),
):
    resolved_business_id = resolve_business_id(current_user, job_title_data.business_id)
    if not current_user.is_superuser:
        job_title_data.business_id = current_user.business_id
    elif job_title_data.business_id is None:
        job_title_data.business_id = resolved_business_id
    return job_title_service.create_job_title(db, job_title_data)


@router.put("/job-titles/{job_title_id}", response_model=JobTitleOut)
def update_job_title(
    job_title_id: uuid.UUID,
    job_title_data: JobTitleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "job_titles", "update")),
):
    if not current_user.is_superuser:
        job_title_data.business_id = current_user.business_id
    return job_title_service.update_job_title(
        db, job_title_id, job_title_data, current_user=current_user
    )


@router.delete("/job-titles/{job_title_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_title(
    job_title_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "job_titles", "delete")),
):
    job_title_service.delete_job_title(db, job_title_id, current_user=current_user)
    return None


# --- Branches Endpoints ---
@router.get("/branches/export-excel")
def export_branches_excel(
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "departments", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    excel_data = branch_service.generate_export_excel(db, business_id=resolved_business_id)
    filename = (
        "branches_export.xlsx"
        if not resolved_business_id
        else f"branches_export_business_{resolved_business_id}.xlsx"
    )
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/branches", response_model=list[BranchOut])
def get_branches(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    search: str | None = Query(None),
    branch_type: str | None = Query(None),
    is_active: bool | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "departments", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return branch_service.get_branches(
        db,
        skip=skip,
        limit=limit,
        business_id=resolved_business_id,
        search=search,
        branch_type=branch_type,
        is_active=is_active,
    )


@router.post("/branches", response_model=BranchOut, status_code=status.HTTP_201_CREATED)
def create_branch(
    branch_data: BranchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "departments", "create")),
):
    resolved_business_id = resolve_business_id(current_user, branch_data.business_id)
    if not current_user.is_superuser:
        branch_data.business_id = current_user.business_id
    elif branch_data.business_id is None:
        branch_data.business_id = resolved_business_id
    return branch_service.create_branch(db, branch_data)


@router.get("/branches/{branch_id}", response_model=BranchOut)
def get_branch(
    branch_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "departments", "view")),
):
    return branch_service.get_branch(db, branch_id, current_user=current_user)


@router.put("/branches/{branch_id}", response_model=BranchOut)
def update_branch(
    branch_id: uuid.UUID,
    branch_data: BranchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "departments", "update")),
):
    if not current_user.is_superuser:
        branch_data.business_id = current_user.business_id
    return branch_service.update_branch(
        db, branch_id, branch_data, current_user=current_user
    )


@router.delete("/branches/{branch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_branch(
    branch_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "departments", "delete")),
):
    branch_service.delete_branch(db, branch_id, current_user=current_user)
    return None


# --- Organogram Endpoints ---
@router.get("/organization/organogram/reporting", response_model=list[OrganogramEmployeeNode])
def get_reporting_organogram(
    business_id: int | None = Query(None),
    branch_id: uuid.UUID | None = Query(None),
    department_id: uuid.UUID | None = Query(None),
    root_employee_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "employees", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return organogram_service.get_reporting_organogram(
        db,
        business_id=resolved_business_id,
        branch_id=branch_id,
        department_id=department_id,
        root_employee_id=root_employee_id,
    )


@router.get("/organization/organogram/structure", response_model=OrganogramStructureTree)
def get_structure_organogram(
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "departments", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    if not resolved_business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business profile ID is required for organization structure.",
        )
    return organogram_service.get_structure_organogram(db, business_id=resolved_business_id)

