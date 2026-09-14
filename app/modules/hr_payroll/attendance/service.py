import uuid
from datetime import date, datetime, time, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.hr_payroll.attendance.models import (
    Attendance,
    AttendanceSourceEnum,
    AttendanceStatusEnum,
)
from app.modules.hr_payroll.attendance.repository import AttendanceRepository
from app.modules.hr_payroll.attendance.schemas import (
    AttendanceCreate,
    AttendanceUpdate,
)
from io import BytesIO, StringIO
import csv
import json
import openpyxl

from app.core.tenancy.repository import BusinessRepository
from app.modules.hr_payroll.employees.models import ImportJob
from app.modules.hr_payroll.employees.repository import EmployeeRepository
from app.database import SessionLocal


class AttendanceService:
    def __init__(
        self,
        repository: AttendanceRepository | None = None,
        employee_repository: EmployeeRepository | None = None,
    ):
        self.repository = repository or AttendanceRepository()
        self.employee_repository = employee_repository or EmployeeRepository()

    def _compute_hours(
        self,
        data: AttendanceCreate | AttendanceUpdate,
        existing: Attendance | None = None,
    ) -> tuple[float, float]:
        check_in = (
            data.check_in
            if data.check_in is not None
            else (existing.check_in if existing else None)
        )
        check_out = (
            data.check_out
            if data.check_out is not None
            else (existing.check_out if existing else None)
        )

        if data.work_hours is not None and data.work_hours > 0.0:
            work_hours = float(data.work_hours)
        elif check_in and check_out:
            today = date.today()
            dt_in = datetime.combine(today, check_in)
            dt_out = datetime.combine(today, check_out)
            if dt_out < dt_in:
                dt_out += timedelta(days=1)
            diff = dt_out - dt_in
            work_hours = round(diff.total_seconds() / 3600.0, 2)
        else:
            work_hours = (
                float(existing.work_hours)
                if (existing and existing.work_hours is not None)
                else 0.0
            )

        if data.overtime_hours is not None:
            overtime_hours = float(data.overtime_hours)
        elif work_hours > 8.0:
            overtime_hours = round(work_hours - 8.0, 2)
        else:
            overtime_hours = 0.0

        return work_hours, overtime_hours

    def get_records(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        employee_id: uuid.UUID | None = None,
        att_date: date | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        status_filter: str | AttendanceStatusEnum | None = None,
    ) -> list[Attendance]:
        return self.repository.get_all(
            db,
            skip=skip,
            limit=limit,
            business_id=business_id,
            employee_id=employee_id,
            att_date=att_date,
            start_date=start_date,
            end_date=end_date,
            status=status_filter,
        )

    def get_record(self, db: Session, attendance_uuid: uuid.UUID) -> Attendance:
        record = self.repository.get_by_id(db, attendance_uuid)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance record not found",
            )
        return record

    def create_record(self, db: Session, data: AttendanceCreate) -> Attendance:
        employee = self.employee_repository.get_by_id(db, data.employee_id)
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with id '{data.employee_id}' not found",
            )

        existing = self.repository.get_by_emp_date(
            db,
            employee_id=data.employee_id,
            att_date=data.date,
            business_id=data.business_id,
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Attendance record already exists for employee on {data.date}",
            )

        work_hours, overtime_hours = self._compute_hours(data)
        data.work_hours = work_hours
        data.overtime_hours = overtime_hours

        return self.repository.create(db, data)

    def update_record(
        self,
        db: Session,
        attendance_uuid: uuid.UUID,
        data: AttendanceUpdate,
    ) -> Attendance:
        record = self.get_record(db, attendance_uuid)

        target_emp_id = data.employee_id or record.employee_id
        target_date = data.date or record.date
        target_biz_id = (
            data.business_id
            if data.business_id is not None
            else record.business_id
        )

        if (target_emp_id != record.employee_id) or (target_date != record.date):
            existing = self.repository.get_by_emp_date(
                db,
                employee_id=target_emp_id,
                att_date=target_date,
                business_id=target_biz_id,
            )
            if existing and existing.id != attendance_uuid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Attendance record already exists for "
                        f"employee on {target_date}"
                    ),
                )

        work_hours, overtime_hours = self._compute_hours(data, existing=record)
        data.work_hours = work_hours
        data.overtime_hours = overtime_hours

        return self.repository.update(db, record, data)

    def check_in(
        self,
        db: Session,
        business_id: int,
        employee_id: uuid.UUID,
        att_date: date | None = None,
        check_in_time: time | None = None,
        note: str | None = None,
    ) -> Attendance:
        employee = self.employee_repository.get_by_id(db, employee_id)
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with id '{employee_id}' not found",
            )

        now = datetime.now()
        target_date = att_date or now.date()
        target_check_in = check_in_time or now.time().replace(microsecond=0)

        existing = self.repository.get_by_emp_date(
            db,
            employee_id=employee_id,
            att_date=target_date,
            business_id=business_id,
        )

        if existing:
            update_data = AttendanceUpdate(
                check_in=target_check_in,
                note=note or existing.note,
            )
            return self.update_record(db, existing.id, update_data)

        status_val = AttendanceStatusEnum.PRESENT
        if target_check_in > time(9, 15):
            status_val = AttendanceStatusEnum.LATE

        create_data = AttendanceCreate(
            business_id=business_id,
            employee_id=employee_id,
            date=target_date,
            status=status_val,
            check_in=target_check_in,
            source=AttendanceSourceEnum.SYSTEM,
            note=note,
        )
        return self.create_record(db, create_data)

    def check_out(
        self,
        db: Session,
        business_id: int,
        employee_id: uuid.UUID,
        att_date: date | None = None,
        check_out_time: time | None = None,
        note: str | None = None,
    ) -> Attendance:
        employee = self.employee_repository.get_by_id(db, employee_id)
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with id '{employee_id}' not found",
            )

        now = datetime.now()
        target_date = att_date or now.date()
        target_check_out = check_out_time or now.time().replace(microsecond=0)

        existing = self.repository.get_by_emp_date(
            db,
            employee_id=employee_id,
            att_date=target_date,
            business_id=business_id,
        )

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"No check-in record found for employee on {target_date}. "
                    "Please check in first."
                ),
            )

        update_data = AttendanceUpdate(
            check_out=target_check_out,
            note=note or existing.note,
        )
        return self.update_record(db, existing.id, update_data)

    def delete_record(self, db: Session, attendance_uuid: uuid.UUID) -> None:
        record = self.get_record(db, attendance_uuid)
        self.repository.delete(db, record)

    def bulk_delete_records(
        self,
        db: Session,
        attendance_ids: list[uuid.UUID] | None = None,
        business_id: int | None = None,
        delete_all: bool = False,
    ) -> int:
        return self.repository.bulk_delete(
            db,
            attendance_ids=attendance_ids,
            business_id=business_id,
            delete_all=delete_all,
        )

    def generate_excel_template(self, db: Session, business_id: int) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Attendance Template"

        headers = [
            "Employee ID",
            "Employee Name",
            "Date (YYYY-MM-DD)",
            "Status (present/absent/late/half_day/on_leave/holiday/weekend)",
            "Check In (HH:MM)",
            "Check Out (HH:MM)",
            "Work Hours",
            "Overtime Hours",
            "Note",
        ]
        ws.append(headers)

        employees = self.employee_repository.get_all(db, business_id=business_id, limit=500)
        sample_date = date.today().strftime("%Y-%m-%d")

        if employees:
            for emp in employees[:5]:
                ws.append([
                    emp.employee_id,
                    emp.full_name,
                    sample_date,
                    "present",
                    "09:00",
                    "18:00",
                    8.0,
                    1.0,
                    "Bulk imported attendance",
                ])
        else:
            ws.append([
                "EMP001",
                "John Doe",
                sample_date,
                "present",
                "09:00",
                "18:00",
                8.0,
                1.0,
                "Sample entry",
            ])

        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

        output = BytesIO()
        wb.save(output)
        return output.getvalue()

    def generate_export_excel(
        self,
        db: Session,
        business_id: int | None = None,
        employee_id: uuid.UUID | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        status_filter: str | None = None,
    ) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Attendance Records"

        headers = [
            "Attendance ID",
            "Employee ID",
            "Employee Name",
            "Date",
            "Status",
            "Check In",
            "Check Out",
            "Work Hours",
            "Overtime Hours",
            "Source",
            "Note",
            "Business Profile ID",
            "Business Profile Name",
        ]
        ws.append(headers)

        records = self.repository.get_all(
            db,
            skip=0,
            limit=5000,
            business_id=business_id,
            employee_id=employee_id,
            start_date=start_date,
            end_date=end_date,
            status=status_filter,
        )
        employees = {e.id: e for e in self.employee_repository.get_all(db, limit=2000)}
        biz_repo = BusinessRepository()
        businesses = {b.id: b.name_en for b in biz_repo.get_all(db, skip=0, limit=1000)}

        for r in records:
            emp = employees.get(r.employee_id)
            emp_code = emp.employee_id if emp else ""
            emp_name = emp.full_name if emp else ""
            ws.append([
                str(r.id),
                emp_code,
                emp_name,
                r.date.strftime("%Y-%m-%d") if r.date else "",
                r.status.value if r.status else "",
                r.check_in.strftime("%H:%M:%S") if r.check_in else "",
                r.check_out.strftime("%H:%M:%S") if r.check_out else "",
                r.work_hours or 0.0,
                r.overtime_hours or 0.0,
                r.source.value if r.source else "",
                r.note or "",
                str(r.business_id) if r.business_id else "",
                businesses.get(r.business_id, "") if r.business_id else "Global",
            ])

        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

        output = BytesIO()
        wb.save(output)
        return output.getvalue()

    def get_attendance_summary(
        self, db: Session, employee_id: uuid.UUID, period_start, period_end
    ) -> dict:
        # Added for MCP read-only report aggregation
        if isinstance(period_start, str):
            start_dt = datetime.strptime(period_start, "%Y-%m-%d").date()
        else:
            start_dt = period_start

        if isinstance(period_end, str):
            end_dt = datetime.strptime(period_end, "%Y-%m-%d").date()
        else:
            end_dt = period_end

        records = self.repository.get_all(
            db,
            employee_id=employee_id,
            start_date=start_dt,
            end_date=end_dt,
            limit=5000,
        )

        status_counts = {
            "present": 0,
            "absent": 0,
            "late": 0,
            "half_day": 0,
            "on_leave": 0,
            "holiday": 0,
            "weekend": 0,
        }
        total_work_hours = 0.0
        total_overtime_hours = 0.0

        for r in records:
            st_val = str(r.status.value if hasattr(r.status, "value") else r.status).lower()
            if st_val in status_counts:
                status_counts[st_val] += 1
            else:
                status_counts[st_val] = 1

            total_work_hours += float(r.work_hours or 0.0)
            total_overtime_hours += float(r.overtime_hours or 0.0)

        return {
            "employee_id": str(employee_id),
            "period_start": str(start_dt),
            "period_end": str(end_dt),
            "total_records": len(records),
            "status_counts": status_counts,
            "total_work_hours": round(total_work_hours, 2),
            "total_overtime_hours": round(total_overtime_hours, 2),
        }

    def start_import_job(
        self, db: Session, business_id: int, file_bytes: bytes, created_by: str | None = None
    ) -> tuple[ImportJob, list, int]:
        try:
            wb = openpyxl.load_workbook(filename=BytesIO(file_bytes), data_only=True)
            ws = wb.active
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid Excel file format: {str(e)}",
            )

        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Excel file is empty.",
            )

        header = [str(cell or "").strip().lower() for cell in rows[0]]
        start_idx = 1 if "employee id" in header or "employee_id" in header or "date" in header else 0

        valid_rows = [r for r in rows[start_idx:] if r and any(r)]
        total_rows = len(valid_rows)

        MAX_IMPORT_ROWS = 5000
        if total_rows > MAX_IMPORT_ROWS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Excel file exceeds maximum allowed limit of {MAX_IMPORT_ROWS:,} rows (found {total_rows:,} rows).",
            )

        job = ImportJob(
            business_id=business_id,
            status="processing",
            total_rows=total_rows,
            processed=0,
            success_count=0,
            error_count=0,
            errors=json.dumps([]),
            cancelled=False,
            job_type="attendance",
            created_by=created_by,
        )
        job = self.repository.create_import_job(db, job)
        return job, rows, start_idx

    def process_import_job_background(
        self, job_id: uuid.UUID, business_id: int, file_bytes: bytes, start_idx: int, session_factory=None
    ) -> None:
        db = session_factory() if session_factory else SessionLocal()
        try:
            job = self.repository.get_import_job(db, job_id)
            if not job:
                return

            try:
                wb = openpyxl.load_workbook(filename=BytesIO(file_bytes), data_only=True)
                ws = wb.active
                rows = list(ws.iter_rows(values_only=True))
            except Exception as e:
                job.status = "failed"
                job.errors = json.dumps([{"row": 0, "error": f"Failed to open file: {str(e)}"}])
                db.commit()
                return

            employees = self.employee_repository.get_all(db, business_id=business_id, limit=5000)
            emp_map = {str(e.employee_id).strip().lower(): e for e in employees if e.employee_id}

            errors_list = []
            seen_in_file: set[tuple[uuid.UUID, date]] = set()

            def parse_time_val(val) -> time | None:
                if isinstance(val, time):
                    return val
                if isinstance(val, datetime):
                    return val.time()
                if isinstance(val, str) and val.strip():
                    for fmt in ("%H:%M", "%H:%M:%S", "%I:%M %p", "%I:%M:%S %p"):
                        try:
                            return datetime.strptime(val.strip(), fmt).time()
                        except ValueError:
                            pass
                return None

            for row_idx, row in enumerate(rows[start_idx:], start=start_idx + 1):
                if not row or not any(row):
                    continue

                db.refresh(job)
                if job.cancelled:
                    job.status = "cancelled"
                    db.commit()
                    return

                emp_code_raw = str(row[0] or "").strip()
                date_raw = row[2] if len(row) > 2 else None
                status_raw = str(row[3] or "present").strip().lower() if len(row) > 3 and row[3] else "present"
                check_in_raw = row[4] if len(row) > 4 else None
                check_out_raw = row[5] if len(row) > 5 else None
                work_hours_raw = row[6] if len(row) > 6 else None
                overtime_hours_raw = row[7] if len(row) > 7 else None
                note_raw = str(row[8] or "").strip() if len(row) > 8 and row[8] else "Imported via Excel"

                date_str = str(date_raw or "")

                if not emp_code_raw:
                    errors_list.append({"row": row_idx, "employee_id": emp_code_raw, "date": date_str, "error": "Missing Employee ID."})
                    job.error_count += 1
                    job.processed += 1
                    job.errors = json.dumps(errors_list)
                    db.commit()
                    continue

                emp = emp_map.get(emp_code_raw.lower())
                if not emp or emp.business_id != business_id:
                    errors_list.append({"row": row_idx, "employee_id": emp_code_raw, "date": date_str, "error": f"Employee with ID '{emp_code_raw}' not found."})
                    job.error_count += 1
                    job.processed += 1
                    job.errors = json.dumps(errors_list)
                    db.commit()
                    continue

                att_date: date | None = None
                if isinstance(date_raw, (datetime, date)):
                    att_date = date_raw.date() if isinstance(date_raw, datetime) else date_raw
                elif isinstance(date_raw, str) and date_raw.strip():
                    try:
                        att_date = datetime.strptime(date_raw.strip(), "%Y-%m-%d").date()
                    except ValueError:
                        try:
                            att_date = datetime.strptime(date_raw.strip(), "%m/%d/%Y").date()
                        except ValueError:
                            pass

                if not att_date:
                    errors_list.append({"row": row_idx, "employee_id": emp_code_raw, "date": date_str, "error": f"Invalid date format '{date_raw}'. Expected YYYY-MM-DD."})
                    job.error_count += 1
                    job.processed += 1
                    job.errors = json.dumps(errors_list)
                    db.commit()
                    continue

                pair_key = (emp.id, att_date)

                # Check in-file duplicate or DB duplicate
                if pair_key in seen_in_file:
                    errors_list.append({"row": row_idx, "employee_id": emp_code_raw, "date": str(att_date), "error": "duplicate record"})
                    job.error_count += 1
                    job.processed += 1
                    job.errors = json.dumps(errors_list)
                    db.commit()
                    continue

                existing_in_db = self.repository.get_by_emp_date(
                    db, employee_id=emp.id, att_date=att_date, business_id=business_id
                )
                if existing_in_db:
                    errors_list.append({"row": row_idx, "employee_id": emp_code_raw, "date": str(att_date), "error": "duplicate record"})
                    job.error_count += 1
                    job.processed += 1
                    job.errors = json.dumps(errors_list)
                    db.commit()
                    continue

                seen_in_file.add(pair_key)

                check_in_time = parse_time_val(check_in_raw)
                check_out_time = parse_time_val(check_out_raw)

                try:
                    status_enum = AttendanceStatusEnum(status_raw)
                except ValueError:
                    status_enum = AttendanceStatusEnum.PRESENT

                try:
                    work_hrs = float(work_hours_raw) if work_hours_raw is not None and str(work_hours_raw).strip() != "" else None
                except (ValueError, TypeError):
                    work_hrs = None

                try:
                    ot_hrs = float(overtime_hours_raw) if overtime_hours_raw is not None and str(overtime_hours_raw).strip() != "" else None
                except (ValueError, TypeError):
                    ot_hrs = None

                create_data = AttendanceCreate(
                    business_id=business_id,
                    employee_id=emp.id,
                    date=att_date,
                    status=status_enum,
                    check_in=check_in_time,
                    check_out=check_out_time,
                    work_hours=work_hrs or 0.0,
                    overtime_hours=ot_hrs or 0.0,
                    source=AttendanceSourceEnum.MANUAL,
                    note=note_raw,
                )

                try:
                    self.create_record(db, create_data)
                    job.success_count += 1
                except HTTPException as hexp:
                    errors_list.append({"row": row_idx, "employee_id": emp_code_raw, "date": str(att_date), "error": hexp.detail})
                    job.error_count += 1
                except Exception as ex:
                    errors_list.append({"row": row_idx, "employee_id": emp_code_raw, "date": str(att_date), "error": f"Failed to record attendance - {str(ex)}"})
                    job.error_count += 1

                job.processed += 1
                job.errors = json.dumps(errors_list)
                db.commit()

            job.status = "completed"
            db.commit()
        finally:
            db.close()

    def get_import_job_status(self, db: Session, job_id: uuid.UUID) -> ImportJob:
        job = self.repository.get_import_job(db, job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Import job not found",
            )
        return job

    def cancel_import_job(self, db: Session, job_id: uuid.UUID) -> ImportJob:
        job = self.repository.get_import_job(db, job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Import job not found",
            )
        job.cancelled = True
        if job.status == "processing":
            job.status = "cancelled"
        db.commit()
        db.refresh(job)
        return job

    def generate_errors_csv(self, db: Session, job_id: uuid.UUID) -> str:
        job = self.get_import_job_status(db, job_id)
        errors = json.loads(job.errors) if job.errors else []

        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["Row Number", "Employee ID", "Date", "Error Reason"])

        for err in errors:
            if isinstance(err, dict):
                writer.writerow([err.get("row", ""), err.get("employee_id", ""), err.get("date", ""), err.get("error", "")])
            else:
                writer.writerow(["", "", "", str(err)])

        return output.getvalue()
