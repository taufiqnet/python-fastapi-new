import uuid
import json

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, Request, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user_optional, require_permission
from app.database import get_db
from app.modules.hr_payroll.employees.models import ImportJob
from app.modules.hr_payroll.employees.schemas import (
    BulkDeleteEmployeesRequest,
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
    current_user=Depends(get_current_user_optional),
    _perm=Depends(require_permission("hrm", "employees", "create")),
):
    if current_user and not current_user.is_superuser:
        business_id = current_user.business_id
    if not business_id or business_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business profile ID is mandatory.",
        )
    excel_data = employee_service.generate_excel_template(db, business_id=business_id)
    filename = f"employee_template_business_{business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/employees/import-excel", status_code=status.HTTP_202_ACCEPTED)
async def import_employees_excel(
    background_tasks: BackgroundTasks,
    business_id: int = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
    _perm=Depends(require_permission("hrm", "employees", "create")),
):
    if current_user and not current_user.is_superuser:
        business_id = current_user.business_id
    if not business_id or business_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business profile ID is mandatory.",
        )
    contents = await file.read()
    user_identifier = current_user.username if current_user else "System"
    job, rows, start_idx = employee_service.start_import_job(
        db, business_id=business_id, file_bytes=contents, created_by=user_identifier
    )

    background_tasks.add_task(
        employee_service.process_import_job_background,
        job_id=job.id,
        business_id=business_id,
        file_bytes=contents,
        start_idx=start_idx,
    )

    return {
        "job_id": str(job.id),
        "status": job.status,
        "total_rows": job.total_rows,
        "message": "Employee import background job started successfully",
    }


def _verify_job_ownership(job: ImportJob, current_user):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    if not current_user.is_superuser and job.business_id != current_user.business_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to access import jobs for another business profile.",
        )


@router.get("/employees/import/{job_id}/status")
def get_import_job_status(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
    _perm=Depends(require_permission("hrm", "employees", "create")),
):
    job = employee_service.get_import_job_status(db, job_id)
    _verify_job_ownership(job, current_user)
    return {
        "job_id": str(job.id),
        "status": job.status,
        "total_rows": job.total_rows,
        "processed": job.processed,
        "success_count": job.success_count,
        "error_count": job.error_count,
        "errors": json.loads(job.errors) if job.errors else [],
        "cancelled": job.cancelled,
        "created_by": job.created_by,
    }


@router.post("/employees/import/{job_id}/cancel")
def cancel_import_job(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
    _perm=Depends(require_permission("hrm", "employees", "create")),
):
    job = employee_service.get_import_job_status(db, job_id)
    _verify_job_ownership(job, current_user)
    canceled_job = employee_service.cancel_import_job(db, job_id)
    return {
        "job_id": str(canceled_job.id),
        "status": canceled_job.status,
        "cancelled": canceled_job.cancelled,
        "message": "Import job cancellation requested",
    }


@router.get("/employees/import/{job_id}/errors-csv")
def download_import_errors_csv(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
    _perm=Depends(require_permission("hrm", "employees", "create")),
):
    job = employee_service.get_import_job_status(db, job_id)
    _verify_job_ownership(job, current_user)
    csv_data = employee_service.generate_errors_csv(db, job_id)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=import_errors_{job_id}.csv"},
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


@router.post("/employees/bulk-delete", status_code=status.HTTP_200_OK)
@router.delete("/employees/bulk-delete", status_code=status.HTTP_200_OK)
async def bulk_delete_employees(
    request: Request,
    business_id: int | None = Query(None),
    delete_all: bool = Query(False),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
):
    if not current_user or not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only system admin user can delete all employees.",
        )

    req_employee_ids = None
    req_business_id = business_id
    req_delete_all = delete_all

    try:
        body = await request.json()
        if isinstance(body, dict):
            if "employee_ids" in body and body["employee_ids"]:
                req_employee_ids = [uuid.UUID(str(i)) for i in body["employee_ids"]]
            if "business_id" in body and body["business_id"] is not None:
                req_business_id = int(body["business_id"])
            if "delete_all" in body and body["delete_all"]:
                req_delete_all = bool(body["delete_all"])
    except Exception:
        pass

    count = employee_service.bulk_delete_employees(
        db,
        employee_ids=req_employee_ids,
        business_id=req_business_id,
        delete_all=req_delete_all,
    )
    return {
        "deleted_count": count,
        "message": f"Successfully deleted {count} employees.",
    }


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
