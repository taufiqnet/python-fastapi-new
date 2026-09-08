import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.tenancy.repository import BusinessRepository
from app.modules.hr_payroll.organization.models import Department, JobTitle
from app.modules.hr_payroll.organization.repository import (
    DepartmentRepository,
    JobTitleRepository,
)
from app.modules.hr_payroll.organization.schemas import (
    DepartmentCreate,
    DepartmentUpdate,
    JobTitleCreate,
    JobTitleUpdate,
)
from io import BytesIO
import openpyxl
import re


class DepartmentService:

    def __init__(self, repository: DepartmentRepository | None = None):
        self.repository = repository or DepartmentRepository()

    def get_departments(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
    ) -> list[Department]:
        return self.repository.get_all(
            db, skip=skip, limit=limit, business_id=business_id
        )

    def get_department(self, db: Session, department_id: uuid.UUID) -> Department:
        department = self.repository.get_by_id(db, department_id)
        if not department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found",
            )
        return department

    def create_department(self, db: Session, data: DepartmentCreate) -> Department:
        if self.repository.get_by_slug(db, data.slug, data.business_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Department with slug '{data.slug}' already exists",
            )
        if self.repository.get_by_name(db, data.name, data.business_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Department with name '{data.name}' already exists",
            )

        return self.repository.create(db, data)

    def update_department(
        self, db: Session, department_id: uuid.UUID, data: DepartmentUpdate
    ) -> Department:
        department = self.get_department(db, department_id)

        target_business_id = (
            data.business_id
            if data.business_id is not None
            else department.business_id
        )

        if data.slug is not None and data.slug != department.slug:
            existing = self.repository.get_by_slug(
                db, data.slug, target_business_id
            )
            if existing and existing.id != department_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Department with slug '{data.slug}' already exists",
                )

        if data.name is not None and data.name != department.name:
            existing_name = self.repository.get_by_name(
                db, data.name, target_business_id
            )
            if existing_name and existing_name.id != department_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Department with name '{data.name}' already exists",
                )

        return self.repository.update(db, department, data)

    def delete_department(self, db: Session, department_id: uuid.UUID) -> None:
        department = self.get_department(db, department_id)
        self.repository.delete(db, department)

    def generate_export_excel(self, db: Session, business_id: int | None = None) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Departments"

        headers = [
            "Department ID",
            "Department Name",
            "Slug",
            "Description",
            "Business Profile ID",
            "Business Profile Name",
            "Multiple Heads Allowed",
            "Status",
        ]
        ws.append(headers)

        departments = self.repository.get_all(db, skip=0, limit=2000, business_id=business_id)
        biz_repo = BusinessRepository()
        businesses = {b.id: b.name_en for b in biz_repo.get_all(db, skip=0, limit=1000)}

        for d in departments:
            ws.append([
                str(d.id),
                d.name or "",
                d.slug or "",
                d.description or "",
                str(d.business_id) if d.business_id else "",
                businesses.get(d.business_id, "") if d.business_id else "Global",
                "Yes" if d.multiple_heads_allowed else "No",
                "Active" if d.is_active else "Inactive",
            ])

        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

        output = BytesIO()
        wb.save(output)
        return output.getvalue()

    def generate_excel_template(self, db: Session, business_id: int) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Department Template"

        headers = [
            "Department Name",
            "Slug",
            "Description",
            "Multiple Heads Allowed (yes/no)",
        ]
        ws.append(headers)

        ws.append([
            "Engineering",
            "engineering",
            "Software engineering and technology department",
            "no",
        ])
        ws.append([
            "Human Resources",
            "human-resources",
            "HR and talent management department",
            "no",
        ])

        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 14)

        output = BytesIO()
        wb.save(output)
        return output.getvalue()

    def import_departments_excel(
        self, db: Session, business_id: int, file_bytes: bytes
    ) -> dict[str, int | list[str]]:
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

        success_count = 0
        error_messages: list[str] = []

        header = [str(cell or "").strip().lower() for cell in rows[0]]
        start_idx = 1 if "department name" in header or "name" in header or "slug" in header else 0

        for row_idx, row in enumerate(rows[start_idx:], start=start_idx + 1):
            if not row or not any(row):
                continue

            name_raw = str(row[0] or "").strip()
            slug_raw = str(row[1] or "").strip().lower() if len(row) > 1 and row[1] else ""
            desc_raw = str(row[2] or "").strip() if len(row) > 2 and row[2] else None
            multi_head_raw = str(row[3] or "no").strip().lower() if len(row) > 3 and row[3] is not None else "no"

            if not name_raw:
                error_messages.append(f"Row {row_idx}: Missing Department Name.")
                continue

            if not slug_raw:
                slug_raw = re.sub(r"[^\w\s-]", "", name_raw).strip().lower().replace(" ", "-")

            # Check duplicate name or slug
            existing_slug = self.repository.get_by_slug(db, slug_raw, business_id)
            existing_name = self.repository.get_by_name(db, name_raw, business_id)

            if existing_slug or existing_name:
                warning_reason = []
                if existing_name:
                    warning_reason.append(f"Department name '{name_raw}' already exists")
                if existing_slug:
                    warning_reason.append(f"Slug '{slug_raw}' already exists")
                error_messages.append(f"Row {row_idx}: Skipped - {', '.join(warning_reason)}.")
                continue

            multi_head = multi_head_raw in ("yes", "true", "1")

            create_data = DepartmentCreate(
                business_id=business_id,
                name=name_raw,
                slug=slug_raw,
                description=desc_raw,
                is_active=True,
                multiple_heads_allowed=multi_head,
            )

            try:
                self.create_department(db, create_data)
                success_count += 1
            except HTTPException as hexp:
                error_messages.append(f"Row {row_idx}: {hexp.detail}")
            except Exception as ex:
                error_messages.append(f"Row {row_idx}: Failed to create department - {str(ex)}")

        return {
            "imported_count": success_count,
            "errors": error_messages,
        }


class JobTitleService:

    def __init__(
        self,
        repository: JobTitleRepository | None = None,
        department_repository: DepartmentRepository | None = None,
    ):
        self.repository = repository or JobTitleRepository()
        self.department_repository = (
            department_repository or DepartmentRepository()
        )

    def get_job_titles(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        department_id: uuid.UUID | None = None,
    ) -> list[JobTitle]:
        return self.repository.get_all(
            db,
            skip=skip,
            limit=limit,
            business_id=business_id,
            department_id=department_id,
        )

    def get_job_title(self, db: Session, job_title_id: uuid.UUID) -> JobTitle:
        job_title = self.repository.get_by_id(db, job_title_id)
        if not job_title:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job title not found",
            )
        return job_title

    def create_job_title(self, db: Session, data: JobTitleCreate) -> JobTitle:
        if data.department_id is not None:
            dept = self.department_repository.get_by_id(db, data.department_id)
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Department with id '{data.department_id}' not found",
                )
            existing = self.repository.get_by_name(
                db, data.name, department_id=data.department_id
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Job title with name '{data.name}' already exists in"
                        " this department"
                    ),
                )

        return self.repository.create(db, data)

    def update_job_title(
        self, db: Session, job_title_id: uuid.UUID, data: JobTitleUpdate
    ) -> JobTitle:
        job_title = self.get_job_title(db, job_title_id)

        target_department_id = (
            data.department_id
            if data.department_id is not None
            else job_title.department_id
        )

        if target_department_id is not None:
            dept = self.department_repository.get_by_id(db, target_department_id)
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Department with id '{target_department_id}' not found",
                )

            target_name = data.name if data.name is not None else job_title.name
            existing = self.repository.get_by_name(
                db, target_name, department_id=target_department_id
            )
            if existing and existing.id != job_title_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Job title with name '{target_name}' already exists in"
                        " this department"
                    ),
                )

        return self.repository.update(db, job_title, data)

    def delete_job_title(self, db: Session, job_title_id: uuid.UUID) -> None:
        job_title = self.get_job_title(db, job_title_id)
        self.repository.delete(db, job_title)

    def generate_export_excel(
        self,
        db: Session,
        business_id: int | None = None,
        department_id: uuid.UUID | None = None,
    ) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Job Titles"

        headers = [
            "Job Title ID",
            "Job Title Name",
            "Short Name",
            "Department",
            "Business Profile ID",
            "Business Profile Name",
            "Description",
            "Status",
        ]
        ws.append(headers)

        job_titles = self.repository.get_all(
            db, skip=0, limit=2000, business_id=business_id, department_id=department_id
        )
        departments = {d.id: d.name for d in self.department_repository.get_all(db, limit=1000)}
        biz_repo = BusinessRepository()
        businesses = {b.id: b.name_en for b in biz_repo.get_all(db, skip=0, limit=1000)}

        for j in job_titles:
            ws.append([
                str(j.id),
                j.name or "",
                j.short_name or "",
                departments.get(j.department_id, "") if j.department_id else "Unassigned",
                str(j.business_id) if j.business_id else "",
                businesses.get(j.business_id, "") if j.business_id else "Global",
                j.description or "",
                "Active" if j.is_active else "Inactive",
            ])

        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

        output = BytesIO()
        wb.save(output)
        return output.getvalue()

    def generate_excel_template(self, db: Session, business_id: int) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Job Title Template"

        headers = [
            "Job Title Name",
            "Short Name",
            "Department Name",
            "Description",
        ]
        ws.append(headers)

        departments = self.department_repository.get_all(db, business_id=business_id, limit=10)
        sample_dept = departments[0].name if departments else "Engineering"

        ws.append([
            "Senior Software Engineer",
            "Sr. SE",
            sample_dept,
            "Lead software engineer role",
        ])
        ws.append([
            "Product Manager",
            "PM",
            sample_dept,
            "Product management role",
        ])

        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 14)

        output = BytesIO()
        wb.save(output)
        return output.getvalue()

    def import_job_titles_excel(
        self, db: Session, business_id: int, file_bytes: bytes
    ) -> dict[str, int | list[str]]:
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

        departments = self.department_repository.get_all(db, business_id=business_id, limit=500)
        dept_map = {d.name.strip().lower(): d for d in departments if d.name}

        success_count = 0
        error_messages: list[str] = []

        header = [str(cell or "").strip().lower() for cell in rows[0]]
        start_idx = 1 if "job title name" in header or "name" in header or "short name" in header else 0

        for row_idx, row in enumerate(rows[start_idx:], start=start_idx + 1):
            if not row or not any(row):
                continue

            name_raw = str(row[0] or "").strip()
            short_name_raw = str(row[1] or "").strip() if len(row) > 1 and row[1] else None
            dept_raw = str(row[2] or "").strip() if len(row) > 2 and row[2] else None
            desc_raw = str(row[3] or "").strip() if len(row) > 3 and row[3] else None

            if not name_raw:
                error_messages.append(f"Row {row_idx}: Missing Job Title Name.")
                continue

            dept_obj = dept_map.get(dept_raw.lower()) if dept_raw else None
            dept_id = dept_obj.id if dept_obj else None

            if dept_raw and not dept_obj:
                error_messages.append(f"Row {row_idx}: Department '{dept_raw}' not found.")
                continue

            if dept_id:
                existing = self.repository.get_by_name(db, name_raw, department_id=dept_id)
                if existing:
                    error_messages.append(
                        f"Row {row_idx}: Skipped - Job title '{name_raw}' already exists in department '{dept_raw}'."
                    )
                    continue

            create_data = JobTitleCreate(
                business_id=business_id,
                department_id=dept_id,
                name=name_raw,
                short_name=short_name_raw,
                description=desc_raw,
                is_active=True,
            )

            try:
                self.create_job_title(db, create_data)
                success_count += 1
            except HTTPException as hexp:
                error_messages.append(f"Row {row_idx}: {hexp.detail}")
            except Exception as ex:
                error_messages.append(f"Row {row_idx}: Failed to create job title - {str(ex)}")

        return {
            "imported_count": success_count,
            "errors": error_messages,
        }
