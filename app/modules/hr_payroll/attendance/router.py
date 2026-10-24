import json
import uuid
from datetime import date
from app.common.timezone import today_bd

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, Request, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user_optional, require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.database import get_db
from app.modules.hr_payroll.attendance.models import (
    ApprovalStatusEnum,
    AttendanceStatusEnum,
    PeriodApprovalStatusEnum,
)
from app.modules.hr_payroll.attendance.schemas import (
    AttendanceBatchSyncRequest,
    AttendanceCreate,
    AttendanceOut,
    AttendancePeriodApprovalCreate,
    AttendancePeriodApprovalOut,
    AttendanceRegularizationCreate,
    AttendanceRegularizationOut,
    AttendanceRegularizationReview,
    AttendanceSettingsOut,
    AttendanceSettingsUpdate,
    AttendanceUpdate,
    BiometricDeviceCreate,
    BiometricDeviceOut,
    BiometricDeviceUpdate,
    MonthlyAttendanceSummaryOut,
    OutdoorDutyCreate,
    OutdoorDutyOut,
    OutdoorDutyReview,
    OvertimeCreate,
    OvertimeOut,
    OvertimeReview,
    RawAttendanceLogOut,
    RawAttendancePushBatch,
)
from app.modules.hr_payroll.attendance.service import (
    AttendanceService,
    attendance_consolidation_service,
    attendance_period_approval_service,
    attendance_regularization_service,
    attendance_service,
    attendance_settings_service,
    biometric_device_service,
    outdoor_duty_service,
    overtime_service,
    raw_attendance_service,
)
from app.modules.hr_payroll.employees.models import ImportJob

router = APIRouter(tags=["Attendance Management"])


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
    y_str = str(year) if year else str(today_bd().year)
    m_str = f"{month:02d}" if month else f"{today_bd().month:02d}"
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


# ===========================================================================
# 1. Attendance & Biometric Settings
# ===========================================================================
@router.get("/attendance/settings", response_model=AttendanceSettingsOut)
def get_attendance_settings(
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "attendance", "view")),
):
    resolved_bid = resolve_business_id(current_user, business_id)
    return attendance_settings_service.get_settings(db, resolved_bid)


@router.put("/attendance/settings", response_model=AttendanceSettingsOut)
def update_attendance_settings(
    payload: AttendanceSettingsUpdate,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "attendance", "update")),
):
    resolved_bid = resolve_business_id(current_user, business_id)
    return attendance_settings_service.update_settings(db, resolved_bid, payload)


# ===========================================================================
# 2. Biometric Devices
# ===========================================================================
@router.get("/attendance/devices", response_model=list[BiometricDeviceOut])
def get_biometric_devices(
    business_id: int | None = Query(None),
    is_active: bool | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "biometric_devices", "view")),
):
    resolved_bid = resolve_business_id(current_user, business_id)
    return biometric_device_service.list_devices(
        db, resolved_bid, is_active=is_active, skip=skip, limit=limit
    )


@router.post(
    "/attendance/devices",
    response_model=BiometricDeviceOut,
    status_code=status.HTTP_201_CREATED,
)
def create_biometric_device(
    payload: BiometricDeviceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "biometric_devices", "create")),
):
    resolved_bid = resolve_business_id(current_user, payload.business_id)
    payload.business_id = resolved_bid
    return biometric_device_service.create_device(db, payload)


@router.get("/attendance/devices/{device_id}", response_model=BiometricDeviceOut)
def get_biometric_device(
    device_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "biometric_devices", "view")),
):
    return biometric_device_service.get_device(db, device_id)


@router.put("/attendance/devices/{device_id}", response_model=BiometricDeviceOut)
def update_biometric_device(
    device_id: uuid.UUID,
    payload: BiometricDeviceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "biometric_devices", "update")),
):
    return biometric_device_service.update_device(db, device_id, payload)


@router.delete(
    "/attendance/devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_biometric_device(
    device_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "biometric_devices", "delete")),
):
    biometric_device_service.delete_device(db, device_id)
    return None


@router.post("/attendance/devices/{device_id}/ping")
def ping_biometric_device(
    device_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "biometric_devices", "view")),
):
    return biometric_device_service.ping_device(db, device_id)


# ===========================================================================
# 3. Raw Attendance Logs
# ===========================================================================
@router.get("/attendance/raw-logs", response_model=list[RawAttendanceLogOut])
def get_raw_attendance_logs(
    business_id: int | None = Query(None),
    employee_id: uuid.UUID | None = Query(None),
    device_id: uuid.UUID | None = Query(None),
    is_processed: bool | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "attendance", "view")),
):
    resolved_bid = resolve_business_id(current_user, business_id)
    logs = raw_attendance_service.list_logs(
        db,
        resolved_bid,
        employee_id=employee_id,
        device_id=device_id,
        is_processed=is_processed,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit,
    )
    result = []
    for lg in logs:
        emp_name = lg.employee.full_name if lg.employee else None
        emp_code = lg.employee.employee_id if lg.employee else None
        dev_name = lg.device.device_name if lg.device else None
        result.append(
            RawAttendanceLogOut(
                id=lg.id,
                business_id=lg.business_id,
                device_id=lg.device_id,
                biometric_user_id=lg.biometric_user_id,
                employee_id=lg.employee_id,
                punch_time=lg.punch_time,
                punch_state=lg.punch_state,
                verification_type=lg.verification_type,
                device_ip=lg.device_ip,
                is_processed=lg.is_processed,
                processed_at=lg.processed_at,
                error_message=lg.error_message,
                employee_name=emp_name,
                employee_code=emp_code,
                device_name=dev_name,
                created_at=lg.created_at,
            )
        )
    return result


@router.post("/attendance/raw-logs/push")
def push_raw_attendance_batch(
    payload: RawAttendancePushBatch,
    db: Session = Depends(get_db),
):
    # Terminal push webhook / background sync endpoint
    return raw_attendance_service.ingest_batch(db, payload)


# ===========================================================================
# 4. Consolidation & Batch Processing
# ===========================================================================
@router.post("/attendance/sync-daily")
def sync_daily_attendance(
    target_date: date = Query(default_factory=today_bd),
    business_id: int | None = Query(None),
    employee_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "attendance", "create")),
):
    resolved_bid = resolve_business_id(current_user, business_id)
    return attendance_consolidation_service.sync_daily_attendance(
        db, resolved_bid, target_date, employee_id=employee_id
    )


@router.post("/attendance/process-period")
def process_period_attendance(
    payload: AttendanceBatchSyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "attendance", "create")),
):
    resolved_bid = resolve_business_id(current_user, payload.business_id)
    return attendance_consolidation_service.process_period_attendance(
        db,
        resolved_bid,
        payload.start_date,
        payload.end_date,
        employee_id=payload.employee_id,
    )


# ===========================================================================
# 5. Regularizations
# ===========================================================================
@router.get(
    "/attendance/regularizations",
    response_model=list[AttendanceRegularizationOut],
)
def get_regularizations(
    business_id: int | None = Query(None),
    employee_id: uuid.UUID | None = Query(None),
    status_filter: ApprovalStatusEnum | None = Query(None, alias="status"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("hrm", "attendance_regularizations", "view")
    ),
):
    resolved_bid = resolve_business_id(current_user, business_id)
    reqs = attendance_regularization_service.list_requests(
        db,
        resolved_bid,
        employee_id=employee_id,
        status_filter=status_filter,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit,
    )
    result = []
    for r in reqs:
        result.append(
            AttendanceRegularizationOut(
                id=r.id,
                business_id=r.business_id,
                employee_id=r.employee_id,
                attendance_date=r.attendance_date,
                request_type=r.request_type,
                requested_check_in=r.requested_check_in,
                requested_check_out=r.requested_check_out,
                reason=r.reason,
                supporting_doc_url=r.supporting_doc_url,
                status=r.status,
                reviewed_by_id=r.reviewed_by_id,
                reviewed_at=r.reviewed_at,
                review_remarks=r.review_remarks,
                employee_name=r.employee.full_name if r.employee else None,
                employee_code=r.employee.employee_id if r.employee else None,
                department_name=r.employee.department_name if r.employee else None,
                reviewer_name=r.reviewed_by.email if r.reviewed_by else None,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
        )
    return result


@router.post(
    "/attendance/regularizations",
    response_model=AttendanceRegularizationOut,
    status_code=status.HTTP_201_CREATED,
)
def create_regularization(
    payload: AttendanceRegularizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("hrm", "attendance_regularizations", "create")
    ),
):
    resolved_bid = resolve_business_id(current_user, payload.business_id)
    payload.business_id = resolved_bid
    r = attendance_regularization_service.create_request(db, payload)
    return AttendanceRegularizationOut(
        id=r.id,
        business_id=r.business_id,
        employee_id=r.employee_id,
        attendance_date=r.attendance_date,
        request_type=r.request_type,
        requested_check_in=r.requested_check_in,
        requested_check_out=r.requested_check_out,
        reason=r.reason,
        supporting_doc_url=r.supporting_doc_url,
        status=r.status,
        reviewed_by_id=r.reviewed_by_id,
        reviewed_at=r.reviewed_at,
        review_remarks=r.review_remarks,
        employee_name=r.employee.full_name if r.employee else None,
        employee_code=r.employee.employee_id if r.employee else None,
        department_name=r.employee.department_name if r.employee else None,
        reviewer_name=None,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


@router.patch(
    "/attendance/regularizations/{reg_id}/review",
    response_model=AttendanceRegularizationOut,
)
def review_regularization(
    reg_id: uuid.UUID,
    payload: AttendanceRegularizationReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("hrm", "attendance_regularizations", "update")
    ),
):
    r = attendance_regularization_service.review_request(
        db,
        reg_id,
        payload.status,
        current_user.id,
        payload.review_remarks,
    )
    return AttendanceRegularizationOut(
        id=r.id,
        business_id=r.business_id,
        employee_id=r.employee_id,
        attendance_date=r.attendance_date,
        request_type=r.request_type,
        requested_check_in=r.requested_check_in,
        requested_check_out=r.requested_check_out,
        reason=r.reason,
        supporting_doc_url=r.supporting_doc_url,
        status=r.status,
        reviewed_by_id=r.reviewed_by_id,
        reviewed_at=r.reviewed_at,
        review_remarks=r.review_remarks,
        employee_name=r.employee.full_name if r.employee else None,
        employee_code=r.employee.employee_id if r.employee else None,
        department_name=r.employee.department_name if r.employee else None,
        reviewer_name=current_user.email,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


# ===========================================================================
# 6. Outdoor Duty
# ===========================================================================
@router.get("/attendance/outdoor-duties", response_model=list[OutdoorDutyOut])
def get_outdoor_duties(
    business_id: int | None = Query(None),
    employee_id: uuid.UUID | None = Query(None),
    status_filter: ApprovalStatusEnum | None = Query(None, alias="status"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "outdoor_duties", "view")),
):
    resolved_bid = resolve_business_id(current_user, business_id)
    ods = outdoor_duty_service.list_applications(
        db,
        resolved_bid,
        employee_id=employee_id,
        status_filter=status_filter,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit,
    )
    result = []
    for od in ods:
        result.append(
            OutdoorDutyOut(
                id=od.id,
                business_id=od.business_id,
                employee_id=od.employee_id,
                start_date=od.start_date,
                end_date=od.end_date,
                is_full_day=od.is_full_day,
                visit_type=od.visit_type,
                destination_or_client=od.destination_or_client,
                purpose=od.purpose,
                status=od.status,
                reviewed_by_id=od.reviewed_by_id,
                reviewed_at=od.reviewed_at,
                review_remarks=od.review_remarks,
                employee_name=od.employee.full_name if od.employee else None,
                employee_code=od.employee.employee_id if od.employee else None,
                department_name=od.employee.department_name if od.employee else None,
                reviewer_name=od.reviewed_by.email if od.reviewed_by else None,
                created_at=od.created_at,
                updated_at=od.updated_at,
            )
        )
    return result


@router.post(
    "/attendance/outdoor-duties",
    response_model=OutdoorDutyOut,
    status_code=status.HTTP_201_CREATED,
)
def create_outdoor_duty(
    payload: OutdoorDutyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "outdoor_duties", "create")),
):
    resolved_bid = resolve_business_id(current_user, payload.business_id)
    payload.business_id = resolved_bid
    od = outdoor_duty_service.create_application(db, payload)
    return OutdoorDutyOut(
        id=od.id,
        business_id=od.business_id,
        employee_id=od.employee_id,
        start_date=od.start_date,
        end_date=od.end_date,
        is_full_day=od.is_full_day,
        visit_type=od.visit_type,
        destination_or_client=od.destination_or_client,
        purpose=od.purpose,
        status=od.status,
        reviewed_by_id=od.reviewed_by_id,
        reviewed_at=od.reviewed_at,
        review_remarks=od.review_remarks,
        employee_name=od.employee.full_name if od.employee else None,
        employee_code=od.employee.employee_id if od.employee else None,
        department_name=od.employee.department_name if od.employee else None,
        reviewer_name=None,
        created_at=od.created_at,
        updated_at=od.updated_at,
    )


@router.patch(
    "/attendance/outdoor-duties/{od_id}/review", response_model=OutdoorDutyOut
)
def review_outdoor_duty(
    od_id: uuid.UUID,
    payload: OutdoorDutyReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "outdoor_duties", "update")),
):
    od = outdoor_duty_service.review_application(
        db, od_id, payload.status, current_user.id, payload.review_remarks
    )
    return OutdoorDutyOut(
        id=od.id,
        business_id=od.business_id,
        employee_id=od.employee_id,
        start_date=od.start_date,
        end_date=od.end_date,
        is_full_day=od.is_full_day,
        visit_type=od.visit_type,
        destination_or_client=od.destination_or_client,
        purpose=od.purpose,
        status=od.status,
        reviewed_by_id=od.reviewed_by_id,
        reviewed_at=od.reviewed_at,
        review_remarks=od.review_remarks,
        employee_name=od.employee.full_name if od.employee else None,
        employee_code=od.employee.employee_id if od.employee else None,
        department_name=od.employee.department_name if od.employee else None,
        reviewer_name=current_user.email,
        created_at=od.created_at,
        updated_at=od.updated_at,
    )


# ===========================================================================
# 7. Overtime
# ===========================================================================
@router.get("/attendance/overtime", response_model=list[OvertimeOut])
def get_overtime_records(
    business_id: int | None = Query(None),
    employee_id: uuid.UUID | None = Query(None),
    status_filter: ApprovalStatusEnum | None = Query(None, alias="status"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("hrm", "overtime_applications", "view")
    ),
):
    resolved_bid = resolve_business_id(current_user, business_id)
    ots = overtime_service.list_applications(
        db,
        resolved_bid,
        employee_id=employee_id,
        status_filter=status_filter,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit,
    )
    result = []
    for ot in ots:
        result.append(
            OvertimeOut(
                id=ot.id,
                business_id=ot.business_id,
                employee_id=ot.employee_id,
                ot_date=ot.ot_date,
                start_time=ot.start_time,
                end_time=ot.end_time,
                claimed_hours=ot.claimed_hours,
                approved_hours=ot.approved_hours,
                purpose=ot.purpose,
                project_name_or_task=ot.project_name_or_task,
                status=ot.status,
                approved_by_id=ot.approved_by_id,
                approved_at=ot.approved_at,
                manager_remarks=ot.manager_remarks,
                employee_name=ot.employee.full_name if ot.employee else None,
                employee_code=ot.employee.employee_id if ot.employee else None,
                department_name=ot.employee.department_name if ot.employee else None,
                approver_name=ot.approved_by.email if ot.approved_by else None,
                created_at=ot.created_at,
                updated_at=ot.updated_at,
            )
        )
    return result


@router.post(
    "/attendance/overtime",
    response_model=OvertimeOut,
    status_code=status.HTTP_201_CREATED,
)
def create_overtime(
    payload: OvertimeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("hrm", "overtime_applications", "create")
    ),
):
    resolved_bid = resolve_business_id(current_user, payload.business_id)
    payload.business_id = resolved_bid
    ot = overtime_service.create_application(db, payload)
    return OvertimeOut(
        id=ot.id,
        business_id=ot.business_id,
        employee_id=ot.employee_id,
        ot_date=ot.ot_date,
        start_time=ot.start_time,
        end_time=ot.end_time,
        claimed_hours=ot.claimed_hours,
        approved_hours=ot.approved_hours,
        purpose=ot.purpose,
        project_name_or_task=ot.project_name_or_task,
        status=ot.status,
        approved_by_id=ot.approved_by_id,
        approved_at=ot.approved_at,
        manager_remarks=ot.manager_remarks,
        employee_name=ot.employee.full_name if ot.employee else None,
        employee_code=ot.employee.employee_id if ot.employee else None,
        department_name=ot.employee.department_name if ot.employee else None,
        approver_name=None,
        created_at=ot.created_at,
        updated_at=ot.updated_at,
    )


@router.patch("/attendance/overtime/{ot_id}/review", response_model=OvertimeOut)
def review_overtime(
    ot_id: uuid.UUID,
    payload: OvertimeReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("hrm", "overtime_applications", "update")
    ),
):
    ot = overtime_service.review_application(
        db,
        ot_id,
        payload.status,
        payload.approved_hours,
        current_user.id,
        payload.manager_remarks,
    )
    return OvertimeOut(
        id=ot.id,
        business_id=ot.business_id,
        employee_id=ot.employee_id,
        ot_date=ot.ot_date,
        start_time=ot.start_time,
        end_time=ot.end_time,
        claimed_hours=ot.claimed_hours,
        approved_hours=ot.approved_hours,
        purpose=ot.purpose,
        project_name_or_task=ot.project_name_or_task,
        status=ot.status,
        approved_by_id=ot.approved_by_id,
        approved_at=ot.approved_at,
        manager_remarks=ot.manager_remarks,
        employee_name=ot.employee.full_name if ot.employee else None,
        employee_code=ot.employee.employee_id if ot.employee else None,
        department_name=ot.employee.department_name if ot.employee else None,
        approver_name=current_user.email,
        created_at=ot.created_at,
        updated_at=ot.updated_at,
    )


# ===========================================================================
# 8. Period Approvals & Lock
# ===========================================================================
@router.get(
    "/attendance/period-approvals",
    response_model=list[AttendancePeriodApprovalOut],
)
def get_period_approvals(
    business_id: int | None = Query(None),
    year: int | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("hrm", "attendance_approvals", "view")
    ),
):
    resolved_bid = resolve_business_id(current_user, business_id)
    records = attendance_period_approval_service.list_approvals(
        db, resolved_bid, year=year, skip=skip, limit=limit
    )
    result = []
    for r in records:
        result.append(
            AttendancePeriodApprovalOut(
                id=r.id,
                business_id=r.business_id,
                year=r.year,
                month=r.month,
                start_date=r.start_date,
                end_date=r.end_date,
                total_employees=r.total_employees,
                present_days_total=r.present_days_total,
                absent_days_total=r.absent_days_total,
                leave_days_total=r.leave_days_total,
                ot_hours_total=r.ot_hours_total,
                status=r.status,
                approved_by_id=r.approved_by_id,
                approved_at=r.approved_at,
                comments=r.comments,
                approver_name=r.approved_by.email if r.approved_by else None,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
        )
    return result


@router.post(
    "/attendance/period-approvals",
    response_model=AttendancePeriodApprovalOut,
    status_code=status.HTTP_201_CREATED,
)
def create_period_approval(
    payload: AttendancePeriodApprovalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("hrm", "attendance_approvals", "create")
    ),
):
    resolved_bid = resolve_business_id(current_user, payload.business_id)
    r = attendance_period_approval_service.create_or_get_approval(
        db, resolved_bid, payload.year, payload.month, payload.comments
    )
    return AttendancePeriodApprovalOut(
        id=r.id,
        business_id=r.business_id,
        year=r.year,
        month=r.month,
        start_date=r.start_date,
        end_date=r.end_date,
        total_employees=r.total_employees,
        present_days_total=r.present_days_total,
        absent_days_total=r.absent_days_total,
        leave_days_total=r.leave_days_total,
        ot_hours_total=r.ot_hours_total,
        status=r.status,
        approved_by_id=r.approved_by_id,
        approved_at=r.approved_at,
        comments=r.comments,
        approver_name=r.approved_by.email if r.approved_by else None,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


@router.post(
    "/attendance/period-approvals/{approval_id}/lock",
    response_model=AttendancePeriodApprovalOut,
)
def lock_attendance_period(
    approval_id: uuid.UUID,
    comments: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission("hrm", "attendance_approvals", "update")
    ),
):
    r = attendance_period_approval_service.lock_period(
        db, approval_id, current_user.id, comments=comments
    )
    return AttendancePeriodApprovalOut(
        id=r.id,
        business_id=r.business_id,
        year=r.year,
        month=r.month,
        start_date=r.start_date,
        end_date=r.end_date,
        total_employees=r.total_employees,
        present_days_total=r.present_days_total,
        absent_days_total=r.absent_days_total,
        leave_days_total=r.leave_days_total,
        ot_hours_total=r.ot_hours_total,
        status=r.status,
        approved_by_id=r.approved_by_id,
        approved_at=r.approved_at,
        comments=r.comments,
        approver_name=current_user.email,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


# ===========================================================================
# 9. Monthly Summary & Excel Export
# ===========================================================================
@router.get(
    "/attendance/monthly-summary",
    response_model=MonthlyAttendanceSummaryOut,
)
def get_monthly_attendance_summary(
    business_id: int | None = Query(None),
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "attendance", "view")),
):
    resolved_bid = resolve_business_id(current_user, business_id)
    return attendance_consolidation_service.get_monthly_summary(
        db, resolved_bid, year, month
    )


@router.get("/attendance/monthly-summary/export-excel")
def export_monthly_attendance_summary_excel(
    business_id: int | None = Query(None),
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "attendance", "view")),
):
    resolved_bid = resolve_business_id(current_user, business_id)
    excel_bytes = attendance_consolidation_service.export_monthly_summary_excel(
        db, resolved_bid, year, month
    )
    filename = f"Attendance_Summary_{year}_{month}.xlsx"
    return Response(
        content=excel_bytes.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ===========================================================================
# 10. Individual Record Routes (Matched Last)
# ===========================================================================
@router.get("/attendance/{attendance_id}", response_model=AttendanceOut)
def get_attendance_record(
    attendance_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "attendance", "view")),
):
    return attendance_service.get_record(db, attendance_id, current_user=current_user)


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


