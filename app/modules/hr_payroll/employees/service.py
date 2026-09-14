import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.employees.repository import EmployeeRepository
from app.modules.hr_payroll.employees.schemas import (
    EmployeeCreate,
    EmployeeUpdate,
)
from app.core.tenancy.repository import BusinessRepository
from app.modules.hr_payroll.organization.repository import (
    DepartmentRepository,
    JobTitleRepository,
)
from datetime import date, datetime
from io import BytesIO, StringIO
import json
import csv
import openpyxl
from app.modules.hr_payroll.employees.models import (
    GenderEnum,
    EmploymentTypeEnum,
    WorkArrangementEnum,
    ImportJob,
)
from app.database import SessionLocal


class EmployeeService:

    def __init__(
        self,
        repository: EmployeeRepository | None = None,
        department_repository: DepartmentRepository | None = None,
        job_title_repository: JobTitleRepository | None = None,
    ):
        self.repository = repository or EmployeeRepository()
        self.department_repository = (
            department_repository or DepartmentRepository()
        )
        self.job_title_repository = job_title_repository or JobTitleRepository()

    def get_employees(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        department_id: uuid.UUID | None = None,
    ) -> list[Employee]:
        return self.repository.get_all(
            db,
            skip=skip,
            limit=limit,
            business_id=business_id,
            department_id=department_id,
        )

    def count_employees(
        self,
        db: Session,
        business_id: int | None = None,
        department_id: uuid.UUID | None = None,
        status: str | None = None,
    ) -> int:
        return self.repository.count_employees(
            db,
            business_id=business_id,
            department_id=department_id,
            status=status,
        )

    def count_employees_by_department(
        self,
        db: Session,
        business_id: int | None = None,
    ) -> list[tuple[str, int]]:
        return self.repository.count_employees_by_department(
            db, business_id=business_id
        )

    def search_employees(
        self,
        db: Session,
        search: str | None = None,
        business_id: int | None = None,
        department_id: uuid.UUID | None = None,
        status: str | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Employee], int]:
        return self.repository.search_employees(
            db,
            search=search,
            business_id=business_id,
            department_id=department_id,
            status=status,
            skip=skip,
            limit=limit,
        )

    def get_employee(self, db: Session, employee_uuid: uuid.UUID) -> Employee:
        employee = self.repository.get_by_id(db, employee_uuid)
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found",
            )
        return employee

    def validate_direct_manager(
        self,
        db: Session,
        manager_id: uuid.UUID,
        employee_id: uuid.UUID | None = None,
        business_id: int | None = None,
    ) -> None:
        """
        Validates direct manager rules:
        - Manager must exist and be active.
        - Employee cannot be their own direct manager.
        - Manager must belong to the same business profile.
        - Prevents management hierarchy cycles (A -> B -> C -> A).
        """
        if employee_id and manager_id == employee_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee cannot be their own direct manager",
            )

        manager = self.repository.get_by_id(db, manager_id)
        if not manager:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Direct manager with id '{manager_id}' not found",
            )

        if business_id is not None and manager.business_id != business_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Direct manager must belong to the same business profile",
            )

        # Cycle detection
        curr_manager_id = manager.direct_manager_id
        visited = {employee_id} if employee_id else set()
        visited.add(manager_id)

        while curr_manager_id:
            if curr_manager_id in visited:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Management hierarchy cycle detected",
                )
            visited.add(curr_manager_id)
            m = self.repository.get_by_id(db, curr_manager_id)
            if not m:
                break
            curr_manager_id = m.direct_manager_id

    def validate_department_head(
        self,
        db: Session,
        is_department_head: bool,
        is_active: bool,
        department_id: uuid.UUID | None,
        business_id: int,
        exclude_employee_id: uuid.UUID | None = None,
    ) -> None:
        """
        Validates department head rules:
        - Department head must be active and have a department assigned.
        - Unless department.multiple_heads_allowed is True, only one active department head
          is allowed per department.
        """
        if is_department_head:
            if not is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Department head must be active",
                )
            if not department_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Department head must be assigned to a department",
                )

            dept = self.department_repository.get_by_id(db, department_id)
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Department with id '{department_id}' not found",
                )

            if not dept.multiple_heads_allowed:
                existing_head = self.repository.get_active_department_head(
                    db, department_id, business_id
                )
                if existing_head and (
                    exclude_employee_id is None
                    or existing_head.id != exclude_employee_id
                ):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Department '{dept.name}' already has an active department head"
                        ),
                    )

    def create_employee(self, db: Session, data: EmployeeCreate) -> Employee:
        # Check uniqueness constraints for employee_id, work_email, phone
        if self.repository.get_by_employee_id(db, data.employee_id, data.business_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee with employee_id '{data.employee_id}' already exists",
            )
        if self.repository.get_by_work_email(db, data.work_email, data.business_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee with work_email '{data.work_email}' already exists",
            )
        if data.phone and self.repository.get_by_phone(db, data.phone, data.business_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee with phone '{data.phone}' already exists",
            )

        # Validate Foreign Keys
        if data.department_id is not None:
            dept = self.department_repository.get_by_id(db, data.department_id)
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Department with id '{data.department_id}' not found",
                )

        if data.job_title_id is not None:
            job_title = self.job_title_repository.get_by_id(db, data.job_title_id)
            if not job_title:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Job title with id '{data.job_title_id}' not found",
                )

        if data.direct_manager_id is not None:
            self.validate_direct_manager(
                db,
                manager_id=data.direct_manager_id,
                employee_id=None,
                business_id=data.business_id,
            )

        # Validate department head rules
        self.validate_department_head(
            db,
            is_department_head=data.is_department_head,
            is_active=data.is_active,
            department_id=data.department_id,
            business_id=data.business_id,
        )

        # Validate Date of Birth cannot be today or future date
        if data.date_of_birth and data.date_of_birth >= date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Date of birth cannot be today or a future date.",
            )

        return self.repository.create(db, data)

    def update_employee(
        self, db: Session, employee_uuid: uuid.UUID, data: EmployeeUpdate
    ) -> Employee:
        employee = self.get_employee(db, employee_uuid)

        target_business_id = (
            data.business_id
            if data.business_id is not None
            else employee.business_id
        )

        # Check unique constraint changes
        if data.employee_id is not None and data.employee_id != employee.employee_id:
            existing = self.repository.get_by_employee_id(
                db, data.employee_id, target_business_id
            )
            if existing and existing.id != employee_uuid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Employee with employee_id '{data.employee_id}' already exists",
                )

        if data.work_email is not None and data.work_email != employee.work_email:
            existing = self.repository.get_by_work_email(
                db, data.work_email, target_business_id
            )
            if existing and existing.id != employee_uuid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Employee with work_email '{data.work_email}' already exists",
                )

        if data.phone is not None and data.phone != employee.phone:
            existing = self.repository.get_by_phone(
                db, data.phone, target_business_id
            )
            if existing and existing.id != employee_uuid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Employee with phone '{data.phone}' already exists",
                )

        # Foreign Key validation
        target_dept_id = (
            data.department_id
            if data.department_id is not None
            else employee.department_id
        )
        if data.department_id is not None and data.department_id != employee.department_id:
            dept = self.department_repository.get_by_id(db, data.department_id)
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Department with id '{data.department_id}' not found",
                )

        if data.job_title_id is not None and data.job_title_id != employee.job_title_id:
            job_title = self.job_title_repository.get_by_id(db, data.job_title_id)
            if not job_title:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Job title with id '{data.job_title_id}' not found",
                )

        if (
            data.direct_manager_id is not None
            and data.direct_manager_id != employee.direct_manager_id
        ):
            self.validate_direct_manager(
                db,
                manager_id=data.direct_manager_id,
                employee_id=employee_uuid,
                business_id=target_business_id,
            )

        # Department head rules
        target_is_dept_head = (
            data.is_department_head
            if data.is_department_head is not None
            else employee.is_department_head
        )
        target_is_active = (
            data.is_active if data.is_active is not None else employee.is_active
        )

        self.validate_department_head(
            db,
            is_department_head=target_is_dept_head,
            is_active=target_is_active,
            department_id=target_dept_id,
            business_id=target_business_id,
            exclude_employee_id=employee_uuid,
        )

        # Validate Date of Birth cannot be today or future date
        if data.date_of_birth and data.date_of_birth >= date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Date of birth cannot be today or a future date.",
            )

        return self.repository.update(db, employee, data)

    def delete_employee(self, db: Session, employee_uuid: uuid.UUID) -> None:
        employee = self.get_employee(db, employee_uuid)
        self.repository.delete(db, employee)

    def bulk_delete_employees(
        self,
        db: Session,
        employee_ids: list[uuid.UUID] | None = None,
        business_id: int | None = None,
        delete_all: bool = False,
    ) -> int:
        return self.repository.bulk_delete(
            db,
            employee_ids=employee_ids,
            business_id=business_id,
            delete_all=delete_all,
        )

    def generate_excel_template(self, db: Session, business_id: int) -> bytes:
        if not business_id or business_id <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Business profile ID is mandatory.",
            )
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Employee Template"

        headers = [
            "Employee ID",
            "First Name",
            "Middle Name",
            "Last Name",
            "Work Email",
            "Phone",
            "Department",
            "Job Title",
            "Employment Type (full_time/part_time/contract/intern)",
            "Work Arrangement (onsite/remote/hybrid)",
            "Start Date (YYYY-MM-DD)",
            "Gender (male/female/other)",
        ]
        ws.append(headers)

        # Sample rows
        departments = self.department_repository.get_all(db, business_id=business_id, limit=10)
        sample_dept = departments[0].name if departments else "Engineering"

        job_titles = self.job_title_repository.get_all(db, business_id=business_id, limit=10)
        sample_jt = job_titles[0].name if job_titles else "Software Engineer"

        ws.append([
            "EMP101",
            "John",
            "A.",
            "Doe",
            "john.doe@example.com",
            "+1234567890",
            sample_dept,
            sample_jt,
            "full_time",
            "onsite",
            date.today().strftime("%Y-%m-%d"),
            "male",
        ])

        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 14)

        output = BytesIO()
        wb.save(output)
        return output.getvalue()

    def generate_export_excel(self, db: Session, business_id: int | None = None) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Employees Directory"

        headers = [
            "Employee ID",
            "First Name",
            "Middle Name",
            "Last Name",
            "Full Name",
            "Work Email",
            "Personal Email",
            "Phone",
            "Department",
            "Job Title",
            "Business Profile ID",
            "Business Profile Name",
            "Employment Type",
            "Work Arrangement",
            "Start Date",
            "Status",
        ]
        ws.append(headers)

        employees = self.repository.get_all(db, skip=0, limit=2000, business_id=business_id)
        departments = {d.id: d.name for d in self.department_repository.get_all(db, limit=1000)}
        job_titles = {j.id: j.name for j in self.job_title_repository.get_all(db, limit=1000)}
        biz_repo = BusinessRepository()
        businesses = {b.id: b.name_en for b in biz_repo.get_all(db, skip=0, limit=1000)}

        for emp in employees:
            ws.append([
                emp.employee_id or "",
                emp.first_name or "",
                emp.middle_name or "",
                emp.last_name or "",
                emp.full_name or "",
                emp.work_email or "",
                emp.personal_email or "",
                emp.phone or "",
                departments.get(emp.department_id, "") if emp.department_id else "",
                job_titles.get(emp.job_title_id, "") if emp.job_title_id else "",
                str(emp.business_id) if emp.business_id else "",
                businesses.get(emp.business_id, "") if emp.business_id else "Global",
                emp.employment_type.value if emp.employment_type else "",
                emp.work_arrangement.value if emp.work_arrangement else "",
                emp.start_date.strftime("%Y-%m-%d") if emp.start_date else "",
                "Active" if emp.is_active else "Inactive",
            ])

        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

        output = BytesIO()
        wb.save(output)
        return output.getvalue()

    def start_import_job(
        self, db: Session, business_id: int, file_bytes: bytes, created_by: str | None = None
    ) -> ImportJob:
        if not business_id or business_id <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Business profile ID is mandatory.",
            )
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
        start_idx = 1 if "employee id" in header or "employee_id" in header or "first name" in header else 0

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

            departments = self.department_repository.get_all(db, business_id=business_id, limit=500)
            dept_map = {d.name.strip().lower(): d for d in departments if d.name}

            job_titles = self.job_title_repository.get_all(db, business_id=business_id, limit=500)
            jt_map = {j.name.strip().lower(): j for j in job_titles if j.name}

            errors_list = []

            header = [str(cell or "").strip().lower() for cell in rows[0]] if rows else []
            has_header = any(h in header for h in ["employee id", "employee_id", "first name", "work email", "email"])

            col_map = {}
            if has_header:
                for idx, h in enumerate(header):
                    if h in ["employee id", "employee_id", "code"]:
                        col_map["emp_code"] = idx
                    elif h in ["first name", "first_name"]:
                        col_map["first_name"] = idx
                    elif h in ["middle name", "middle_name"]:
                        col_map["middle_name"] = idx
                    elif h in ["last name", "last_name"]:
                        col_map["last_name"] = idx
                    elif h in ["work email", "work_email", "email"]:
                        col_map["work_email"] = idx
                    elif h in ["phone", "phone_number"]:
                        col_map["phone"] = idx
                    elif h in ["department", "department_id", "department name"]:
                        col_map["department"] = idx
                    elif h in ["job title", "job_title", "job title name"]:
                        col_map["job_title"] = idx
                    elif "employment type" in h or h in ["employment_type"]:
                        col_map["emp_type"] = idx
                    elif "work arrangement" in h or h in ["work_arrangement"]:
                        col_map["arrangement"] = idx
                    elif "start date" in h or h in ["start_date"]:
                        col_map["start_date"] = idx
                    elif "gender" in h:
                        col_map["gender"] = idx

            for row_idx, row in enumerate(rows[start_idx:], start=start_idx + 1):
                if not row or not any(row):
                    continue

                # Check if cancelled before processing row
                db.refresh(job)
                if job.cancelled:
                    job.status = "cancelled"
                    db.commit()
                    return

                def get_val(key, default_idx):
                    idx = col_map.get(key, default_idx)
                    if idx is not None and idx < len(row) and row[idx] is not None:
                        return row[idx]
                    return None

                emp_code_raw = str(get_val("emp_code", 0) or "").strip()
                first_name_raw = str(get_val("first_name", 1) or "").strip()
                middle_name_raw = str(get_val("middle_name", 2) or "").strip() if get_val("middle_name", 2) else None
                last_name_raw = str(get_val("last_name", 3) or "").strip() if get_val("last_name", 3) else None
                work_email_raw = str(get_val("work_email", 4) or "").strip()
                phone_raw = str(get_val("phone", 5) or "").strip() if get_val("phone", 5) else None
                dept_raw = str(get_val("department", 6) or "").strip() if get_val("department", 6) else None
                jt_raw = str(get_val("job_title", 7) or "").strip() if get_val("job_title", 7) else None
                emp_type_raw = str(get_val("emp_type", 8) or "").strip().lower() if get_val("emp_type", 8) else None
                arrangement_raw = str(get_val("arrangement", 9) or "").strip().lower() if get_val("arrangement", 9) else None
                start_date_raw = get_val("start_date", 10)
                gender_raw = str(get_val("gender", 11) or "").strip().lower() if get_val("gender", 11) else None

                row_error = None
                if not emp_code_raw:
                    row_error = "Missing Employee ID."
                elif not first_name_raw:
                    row_error = "Missing First Name."
                elif not work_email_raw:
                    row_error = "Missing Work Email."

                if row_error:
                    errors_list.append({"row": row_idx, "employee_id": emp_code_raw, "email": work_email_raw, "error": row_error})
                    job.error_count += 1
                    job.processed += 1
                    job.errors = json.dumps(errors_list)
                    db.commit()
                    continue

                existing_by_id = self.repository.get_by_employee_id(db, emp_code_raw, business_id)
                existing_by_email = self.repository.get_by_work_email(db, work_email_raw, business_id)

                if existing_by_id or existing_by_email:
                    warning_reason = []
                    if existing_by_id:
                        warning_reason.append(f"Employee ID '{emp_code_raw}' already exists")
                    if existing_by_email:
                        warning_reason.append(f"Work Email '{work_email_raw}' already exists")
                    row_error = f"Skipped - {', '.join(warning_reason)}."
                    errors_list.append({"row": row_idx, "employee_id": emp_code_raw, "email": work_email_raw, "error": row_error})
                    job.error_count += 1
                    job.processed += 1
                    job.errors = json.dumps(errors_list)
                    db.commit()
                    continue

                dept_obj = dept_map.get(dept_raw.lower()) if dept_raw else None
                dept_id = dept_obj.id if dept_obj else None

                jt_obj = jt_map.get(jt_raw.lower()) if jt_raw else None
                jt_id = jt_obj.id if jt_obj else None

                parsed_start_date: date | None = None
                if isinstance(start_date_raw, (datetime, date)):
                    parsed_start_date = start_date_raw.date() if isinstance(start_date_raw, datetime) else start_date_raw
                elif isinstance(start_date_raw, str) and start_date_raw.strip():
                    try:
                        parsed_start_date = datetime.strptime(start_date_raw.strip(), "%Y-%m-%d").date()
                    except ValueError:
                        try:
                            parsed_start_date = datetime.strptime(start_date_raw.strip(), "%m/%d/%Y").date()
                        except ValueError:
                            pass

                emp_type_enum = None
                if emp_type_raw:
                    try:
                        emp_type_enum = EmploymentTypeEnum(emp_type_raw)
                    except ValueError:
                        pass

                arrangement_enum = None
                if arrangement_raw:
                    try:
                        arrangement_enum = WorkArrangementEnum(arrangement_raw)
                    except ValueError:
                        pass

                gender_enum = None
                if gender_raw:
                    try:
                        gender_enum = GenderEnum(gender_raw)
                    except ValueError:
                        pass

                create_data = EmployeeCreate(
                    business_id=business_id,
                    employee_id=emp_code_raw,
                    first_name=first_name_raw,
                    middle_name=middle_name_raw,
                    last_name=last_name_raw,
                    work_email=work_email_raw,
                    phone=phone_raw,
                    department_id=dept_id,
                    job_title_id=jt_id,
                    employment_type=emp_type_enum,
                    work_arrangement=arrangement_enum,
                    start_date=parsed_start_date,
                    gender=gender_enum,
                    is_active=True,
                )

                try:
                    self.create_employee(db, create_data)
                    job.success_count += 1
                except HTTPException as hexp:
                    errors_list.append({"row": row_idx, "employee_id": emp_code_raw, "email": work_email_raw, "error": hexp.detail})
                    job.error_count += 1
                except Exception as ex:
                    errors_list.append({"row": row_idx, "employee_id": emp_code_raw, "email": work_email_raw, "error": f"Failed to create employee - {str(ex)}"})
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
        writer.writerow(["Row Number", "Employee ID", "Work Email", "Error Reason"])

        for err in errors:
            if isinstance(err, dict):
                writer.writerow([err.get("row", ""), err.get("employee_id", ""), err.get("email", ""), err.get("error", "")])
            else:
                writer.writerow(["", "", "", str(err)])

        return output.getvalue()
