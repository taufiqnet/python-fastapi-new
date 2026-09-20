import json
import uuid
from datetime import date

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, Request, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user_optional, require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.database import get_db
from app.modules.hr_payroll.attendance.schemas import (
    AttendanceCreate,
    AttendanceOut,
    AttendanceUpdate,
)
from app.modules.hr_payroll.attendance.service import AttendanceService
from app.modules.hr_payroll.employees.models import ImportJob

router = APIRouter(tags=["Attendance Management"])
attendance_service = AttendanceService()


def _verify_job_ownership(job: ImportJob, current_user):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    if not current_user.is_superuser and job.business_id != current_user.business_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to access import jobs for another business profile.",
        )


@router.get("/attendance", response_model=list[AttendanceOut])
def get_attendance_records(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    employee_id: uuid.UUID | None = Query(None),
    att_date: date | None = Query(None, alias="date"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "attendance", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return attendance_service.get_records(
        db,
        skip=skip,
        limit=limit,
        business_id=resolved_business_id,
        employee_id=employee_id,
        att_date=att_date,
        start_date=start_date,
        end_date=end_date,
        status_filter=status_filter,
    )


@router.get("/attendance/export-excel")
def export_attendance_excel(
    business_id: int | None = Query(None),
    employee_id: uuid.UUID | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "attendance", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    excel_data = attendance_service.generate_export_excel(
        db,
        business_id=resolved_business_id,
        employee_id=employee_id,
        start_date=start_date,
        end_date=end_date,
        status_filter=status_filter,
    )
    filename = "attendance_export.xlsx" if not resolved_business_id else f"attendance_export_business_{resolved_business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/attendance/export-register-excel")
def export_attendance_monthly_register_excel(
    business_id: int | None = Query(None),
    year: int | None = Query(None),
    month: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "attendance", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    excel_data = attendance_service.generate_monthly_register_excel(
        db,
        business_id=resolved_business_id,
        year=year,
        month=month,
    )
    y_str = str(year) if year else str(date.today().year)
    m_str = f"{month:02d}" if month else f"{date.today().month:02d}"
    filename = (
        f"monthly_attendance_register_{y_str}_{m_str}.xlsx"
        if not resolved_business_id
        else f"monthly_attendance_register_business_{resolved_business_id}_{y_str}_{m_str}.xlsx"
    )
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/attendance/template-excel")
def download_attendance_excel_template(
    business_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "attendance", "create")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    if not resolved_business_id or resolved_business_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business profile ID is mandatory.",
        )
    excel_data = attendance_service.generate_excel_template(db, business_id=resolved_business_id)
    filename = f"attendance_template_business_{resolved_business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/attendance/import-excel", status_code=status.HTTP_202_ACCEPTED)
async def import_attendance_excel(
    background_tasks: BackgroundTasks,
    business_id: int = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "attendance", "create")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    if not resolved_business_id or resolved_business_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business profile ID is mandatory.",
        )
    contents = await file.read()
    user_identifier = current_user.username if current_user else "System"
    job, rows, start_idx = attendance_service.start_import_job(
        db, business_id=resolved_business_id, file_bytes=contents, created_by=user_identifier
    )

    background_tasks.add_task(
        attendance_service.process_import_job_background,
        job_id=job.id,
        business_id=resolved_business_id,
        file_bytes=contents,
        start_idx=start_idx,
    )

    return {
        "job_id": str(job.id),
        "status": job.status,
        "total_rows": job.total_rows,
        "message": "Attendance import background job started successfully",
    }


@router.get("/attendance/import/{job_id}/status")
def get_import_job_status(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
    _perm=Depends(require_permission("hrm", "attendance", "create")),
):
    job = attendance_service.get_import_job_status(db, job_id)
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


@router.post("/attendance/import/{job_id}/cancel")
def cancel_import_job(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
    _perm=Depends(require_permission("hrm", "attendance", "create")),
):
    job = attendance_service.get_import_job_status(db, job_id)
    _verify_job_ownership(job, current_user)
    canceled_job = attendance_service.cancel_import_job(db, job_id)
    return {
        "job_id": str(canceled_job.id),
        "status": canceled_job.status,
        "cancelled": canceled_job.cancelled,
        "message": "Import job cancellation requested",
    }


@router.get("/attendance/import/{job_id}/errors-csv")
def download_import_errors_csv(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
    _perm=Depends(require_permission("hrm", "attendance", "create")),
):
    job = attendance_service.get_import_job_status(db, job_id)
    _verify_job_ownership(job, current_user)
    csv_data = attendance_service.generate_errors_csv(db, job_id)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_import_errors_{job_id}.csv"},
    )


@router.post("/attendance/bulk-delete", status_code=status.HTTP_200_OK)
@router.delete("/attendance/bulk-delete", status_code=status.HTTP_200_OK)
async def bulk_delete_attendance(
    request: Request,
    business_id: int | None = Query(None),
    delete_all: bool = Query(False),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
):
    if not current_user or not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only system admin user can delete attendance records in bulk.",
        )

    req_attendance_ids = None
    req_business_id = business_id
    req_delete_all = delete_all

    try:
        body = await request.json()
        if isinstance(body, dict):
            if "attendance_ids" in body and body["attendance_ids"]:
                req_attendance_ids = [uuid.UUID(str(i)) for i in body["attendance_ids"]]
            if "business_id" in body and body["business_id"] is not None:
                req_business_id = int(body["business_id"])
            if "delete_all" in body and body["delete_all"]:
                req_delete_all = bool(body["delete_all"])
    except Exception:
        pass

    count = attendance_service.bulk_delete_records(
        db,
        attendance_ids=req_attendance_ids,
        business_id=req_business_id,
        delete_all=req_delete_all,
    )
    return {
        "deleted_count": count,
        "message": f"Successfully deleted {count} attendance record(s).",
    }


@router.get("/attendance/{attendance_id}", response_model=AttendanceOut)
def get_attendance_record(
    attendance_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "attendance", "view")),
):
    return attendance_service.get_record(db, attendance_id, current_user=current_user)


@router.post(
    "/attendance",
    response_model=AttendanceOut,
    status_code=status.HTTP_201_CREATED,
)
def create_attendance_record(
    attendance_data: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "attendance", "create")),
):
    resolved_business_id = resolve_business_id(current_user, attendance_data.business_id)
    if not current_user.is_superuser:
        attendance_data.business_id = current_user.business_id
    elif attendance_data.business_id is None:
        attendance_data.business_id = resolved_business_id

    return attendance_service.create_record(
        db, attendance_data, current_user=current_user
    )


@router.put("/attendance/{attendance_id}", response_model=AttendanceOut)
def update_attendance_record(
    attendance_id: uuid.UUID,
    attendance_data: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "attendance", "update")),
):
    if not current_user.is_superuser:
        attendance_data.business_id = current_user.business_id

    return attendance_service.update_record(
        db, attendance_id, attendance_data, current_user=current_user
    )


@router.delete(
    "/attendance/{attendance_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_attendance_record(
    attendance_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "attendance", "delete")),
):
    attendance_service.delete_record(db, attendance_id, current_user=current_user)
    return None
