import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.employees.repository import EmployeeRepository
from typing import Any
from app.core.tenancy.scoping import verify_record_ownership
from app.modules.hr_payroll.employees.schemas import (
    EmployeeCreate,
    EmployeeNomineeCreate,
    EmployeeNomineeUpdate,
    EmployeeUpdate,
    IDCardDataOut,
    OrgChartNodeOut,
)
from app.core.tenancy.repository import BusinessRepository
from app.modules.hr_payroll.organization.repository import (
    BranchRepository,
    DepartmentRepository,
    JobTitleRepository,
    SalaryGradeRepository,
)
from datetime import date, datetime
from io import BytesIO, StringIO
import json
import csv
import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from app.modules.hr_payroll.employees.models import (
    EmploymentTypeEnum,
    GenderEnum,
    ImportJob,
    MaritalStatusEnum,
    WorkArrangementEnum,
    EmployeeNominee,
)
from app.database import SessionLocal


class EmployeeService:

    def __init__(
        self,
        repository: EmployeeRepository | None = None,
        department_repository: DepartmentRepository | None = None,
        job_title_repository: JobTitleRepository | None = None,
        branch_repository: BranchRepository | None = None,
        salary_grade_repository: SalaryGradeRepository | None = None,
    ):
        self.repository = repository or EmployeeRepository()
        self.department_repository = (
            department_repository or DepartmentRepository()
        )
        self.job_title_repository = job_title_repository or JobTitleRepository()
        self.branch_repository = branch_repository or BranchRepository()
        self.salary_grade_repository = (
            salary_grade_repository or SalaryGradeRepository()
        )

    def get_employees(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        department_id: uuid.UUID | None = None,
        branch_id: uuid.UUID | None = None,
        search: str | None = None,
        status: str | None = None,
    ) -> list[Employee]:
        return self.repository.get_all(
            db,
            skip=skip,
            limit=limit,
            business_id=business_id,
            department_id=department_id,
            branch_id=branch_id,
            search=search,
            status=status,
        )

    def count_employees(
        self,
        db: Session,
        business_id: int | None = None,
        department_id: uuid.UUID | None = None,
        branch_id: uuid.UUID | None = None,
        search: str | None = None,
        status: str | None = None,
    ) -> int:
        return self.repository.count_employees(
            db,
            business_id=business_id,
            department_id=department_id,
            branch_id=branch_id,
            search=search,
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

    def get_employee(
        self, db: Session, employee_uuid: uuid.UUID, current_user: Any | None = None
    ) -> Employee:
        employee = self.repository.get_by_id(db, employee_uuid)
        if current_user is not None:
            return verify_record_ownership(employee, current_user, detail="Employee not found")
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found",
            )
        return employee

    def get_employee_by_id(
        self, db: Session, employee_id: uuid.UUID, business_id: int | None = None
    ) -> Employee:
        emp = self.repository.get_by_id(db, employee_id)
        if not emp or (business_id is not None and emp.business_id != business_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found",
            )
        return emp

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

    def get_next_employee_id(
        self,
        db: Session,
        business_id: int | None,
        prefix: str = "EMP-",
        padding: int = 3,
    ) -> dict:
        import re

        clean_prefix = (prefix or "EMP-").strip()
        base_prefix = clean_prefix.rstrip("-")
        pattern = re.compile(rf"^{re.escape(base_prefix)}[-]?(\d+)$", re.IGNORECASE)

        query = db.query(Employee.employee_id)
        if business_id is not None:
            query = query.filter(Employee.business_id == business_id)

        all_ids = query.all()
        max_num = 0
        for (eid,) in all_ids:
            if not eid:
                continue
            m = pattern.match(eid.strip())
            if m:
                try:
                    num = int(m.group(1))
                    if num > max_num:
                        max_num = num
                except ValueError:
                    pass

        next_seq = max_num + 1
        next_id = f"{clean_prefix}{str(next_seq).zfill(padding)}"
        return {
            "next_employee_id": next_id,
            "sequence": next_seq,
            "prefix": clean_prefix,
            "padding": padding,
        }

    def update_employee(
        self,
        db: Session,
        employee_uuid: uuid.UUID,
        data: EmployeeUpdate,
        current_user: Any | None = None,
    ) -> Employee:
        employee = self.get_employee(db, employee_uuid, current_user=current_user)

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

    def delete_employee(
        self, db: Session, employee_uuid: uuid.UUID, current_user: Any | None = None
    ) -> None:
        employee = self.get_employee(db, employee_uuid, current_user=current_user)
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
            business_id = 1

        wb = openpyxl.Workbook()

        # Styles
        header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        sub_header_fill = PatternFill(start_color="334155", end_color="334155", fill_type="solid")
        title_font = Font(name="Calibri", size=14, bold=True, color="0F172A")
        subtitle_font = Font(name="Calibri", size=10, italic=True, color="64748B")
        border_thin = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="thin", color="CBD5E1"),
        )
        center_align = Alignment(horizontal="center", vertical="center")
        left_align = Alignment(horizontal="left", vertical="center")

        # ── Worksheet 1: Employee Master Demo ──
        ws = wb.active
        ws.title = "Employee Master Demo"

        # Lookup samples from DB
        dept_samples = self.department_repository.get_all(db, business_id=business_id, limit=5)
        dept_1 = dept_samples[0].name if dept_samples else "Engineering & Tech"
        dept_2 = dept_samples[1].name if len(dept_samples) > 1 else "Operations & Supply"

        jt_samples = self.job_title_repository.get_all(db, business_id=business_id, limit=5)
        jt_1 = jt_samples[0].name if jt_samples else "Senior Software Engineer"
        jt_2 = jt_samples[1].name if len(jt_samples) > 1 else "Quality Assurance Officer"

        branch_samples = self.branch_repository.get_all(db, business_id=business_id, limit=5)
        branch_1 = branch_samples[0].name if branch_samples else "Dhaka Corporate HQ"
        branch_2 = branch_samples[1].name if len(branch_samples) > 1 else "Gazipur Operations Hub"

        grade_samples = self.salary_grade_repository.get_all(db, business_id=business_id, limit=5)
        grade_1 = grade_samples[0].name if grade_samples else "Grade 3 (Senior Professional)"
        grade_2 = grade_samples[1].name if len(grade_samples) > 1 else "Grade 5 (Operational Staff)"

        headers = [
            # Basic Information
            "Employee ID *",
            "First Name *",
            "Middle Name",
            "Last Name",
            "Bangla Name",
            "Work Email *",
            "Personal Email",
            "Phone Number",
            "Date of Birth (YYYY-MM-DD)",
            "Gender (male/female/other)",
            "Marital Status (single/married/divorced/widowed)",
            "Religion (Islam/Hinduism/Christianity/Buddhism/Other)",
            "Blood Group (A+/A-/B+/B-/O+/O-/AB+/AB-)",
            "Nationality",
            "National ID / NID",
            "Passport Number",
            "TIN (Tax ID)",
            # Family Information
            "Father's Name",
            "Mother's Name",
            "Spouse's Name",
            # Emergency Contact
            "Emergency Contact Name",
            "Emergency Contact Relation",
            "Emergency Contact Phone",
            # Present Address
            "Present Address",
            "Present Thana / Upazila",
            "Present District",
            "Present Division",
            "Present Post Code",
            # Permanent Address
            "Permanent Address",
            "Permanent Thana / Upazila",
            "Permanent District",
            "Permanent Division",
            "Permanent Post Code",
            # Organization & Job
            "Department (Name or Code)",
            "Job Title / Designation (Name or Code)",
            "Branch / Location (Name or Code)",
            "Salary Grade (Name or Code)",
            "Team",
            "Employee Category (management/executive/officer/staff/worker/trainee/contractual)",
            "Employment Type (full_time/part_time/contract/intern)",
            "Work Arrangement (onsite/remote/hybrid)",
            "Start Date (YYYY-MM-DD)",
            "Confirmation Date (YYYY-MM-DD)",
            "Probation Period (Months)",
            "Notice Period (Days)",
            "Overtime Eligible (Yes/No)",
            # Access & Biometrics
            "Biometric ID",
            "RFID Card Number",
            # Salary Disbursement
            "Disbursement Method (bank_transfer/cash/mfs)",
            "Bank Name",
            "Bank Branch",
            "Bank Account Number",
            "Bank Account Title",
            "Bank Routing Number",
            "MFS Provider (bkash/nagad/rocket)",
            "MFS Number",
        ]

        # Title Row
        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(headers))
        title_cell = ws.cell(row=1, column=1, value="ProERP Enterprise HRIS - Employee Master Onboarding & Import Template")
        title_cell.font = title_font
        title_cell.alignment = left_align

        ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=len(headers))
        sub_cell = ws.cell(row=2, column=1, value="Instructions: Required fields marked with (*). You can fill in full details for Bangladesh statutory compliance (Form 33, NID, Biometrics, Banking/MFS). Delete demo rows before importing.")
        sub_cell.font = subtitle_font
        sub_cell.alignment = left_align

        # Header Row (Row 4)
        for col_idx, h in enumerate(headers, start=1):
            cell = ws.cell(row=4, column=col_idx, value=h)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = center_align
            cell.border = border_thin

        # Demo Row 1: Executive / Tech Professional
        demo_row_1 = [
            "EMP-1001",
            "Tanvir",
            "Hasan",
            "Chowdhury",
            "তানভীর হাসান চৌধুরী",
            "tanvir.chowdhury@example.com",
            "tanvir.personal@gmail.com",
            "+8801711223344",
            "1990-05-15",
            "male",
            "married",
            "Islam",
            "B+",
            "Bangladeshi",
            "19902692015000123",
            "A01234567",
            "123456789012",
            "Late Kamal Chowdhury",
            "Rokeya Begum",
            "Farhana Yasmin",
            "Farhana Yasmin",
            "Spouse",
            "+8801722334455",
            "House 42, Road 11, Sector 4",
            "Uttara",
            "Dhaka",
            "Dhaka",
            "1230",
            "Village Rampur, P.O. Chandpur",
            "Chandpur Sadar",
            "Chandpur",
            "Chittagong",
            "3600",
            dept_1,
            jt_1,
            branch_1,
            grade_1,
            "Core Architecture",
            "executive",
            "full_time",
            "hybrid",
            "2023-01-15",
            "2023-07-15",
            6,
            60,
            "No",
            "BIO-1001",
            "RF-882910",
            "bank_transfer",
            "Eastern Bank PLC",
            "Gulshan Branch",
            "1041060123456",
            "Tanvir Hasan Chowdhury",
            "090271345",
            "",
            "",
        ]

        # Demo Row 2: Operational Officer / Associate
        demo_row_2 = [
            "EMP-1002",
            "Tahmina",
            "Akter",
            "Sultana",
            "তাহমিনা আক্তার সুলতানা",
            "tahmina.akter@example.com",
            "tahmina.personal@yahoo.com",
            "+8801819876543",
            "1994-11-20",
            "female",
            "single",
            "Islam",
            "A+",
            "Bangladeshi",
            "19942692018000456",
            "",
            "987654321098",
            "Kabir Ahmed",
            "Salma Begum",
            "",
            "Kabir Ahmed",
            "Father",
            "+8801811223344",
            "Plot 18, Block B, Bashundhara R/A",
            "Vatara",
            "Dhaka",
            "Dhaka",
            "1229",
            "Chowdhury Bari, South Agrabad",
            "Double Mooring",
            "Chittagong",
            "Chittagong",
            "4100",
            dept_2,
            jt_2,
            branch_2,
            grade_2,
            "Quality Assurance Team",
            "officer",
            "full_time",
            "onsite",
            "2024-03-01",
            "2024-09-01",
            6,
            30,
            "Yes",
            "BIO-1002",
            "RF-882911",
            "mfs",
            "",
            "",
            "",
            "",
            "",
            "bkash",
            "01819876543",
        ]

        ws.append(demo_row_1)
        ws.append(demo_row_2)

        # Style data rows
        for r_idx in range(5, 7):
            for c_idx in range(1, len(headers) + 1):
                cell = ws.cell(row=r_idx, column=c_idx)
                cell.border = border_thin
                cell.alignment = left_align

        # Auto column dimensions
        for col in ws.columns:
            header_val = str(col[3].value or "") if len(col) >= 4 else ""
            max_len = max(len(str(cell.value or "")) for cell in col[3:]) if len(col) >= 4 else 12
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, len(header_val) + 3, 15)

        # ── Worksheet 2: Guidelines & Field Values ──
        ws_guide = wb.create_sheet(title="Field Guide & Accepted Values")
        guide_headers = ["Field Name", "Required?", "Accepted Values / Options", "Bangladesh Context & Statutory Description"]
        ws_guide.append(guide_headers)

        for col_idx, gh in enumerate(guide_headers, start=1):
            c = ws_guide.cell(row=1, column=col_idx)
            c.fill = sub_header_fill
            c.font = header_font
            c.alignment = center_align
            c.border = border_thin

        guide_data = [
            ("Employee ID", "YES (Mandatory)", "Unique string (e.g. EMP-1001, HQ-042)", "Mandatory unique code for punch machines and ERP records."),
            ("First Name", "YES (Mandatory)", "Text", "Employee primary legal name."),
            ("Work Email", "YES (Mandatory)", "Valid email (e.g. name@company.com)", "Corporate email for system login and notifications."),
            ("Bangla Name", "Optional", "Unicode Bengali text (e.g. তানভীর হাসান)", "Required for statutory Bangladesh Form 33 and service books."),
            ("Gender", "Optional", "male, female, other", "Demographic categorization."),
            ("Marital Status", "Optional", "single, married, divorced, widowed", "Used for statutory nominee guardianship considerations."),
            ("Religion", "Optional", "Islam, Hinduism, Christianity, Buddhism, Other", "Used for official holiday entitlement and festival bonus calculation."),
            ("Blood Group", "Optional", "A+, A-, B+, B-, O+, O-, AB+, AB-", "Printed on plastic ID cards for medical emergency preparedness."),
            ("National ID / NID", "Recommended", "10, 13, or 17 digit national ID number", "Bangladesh National Identity Card number."),
            ("Father / Mother / Spouse", "Optional", "Text", "Family record compliance under Bangladesh Labour Act 2006."),
            ("Address Hierarchy", "Recommended", "Address line, Thana, District, Division, Post Code", "Maintains dual Present and Permanent addresses for police/background check."),
            ("Department", "Recommended", "Exact Department Name or Code from Organization Hub", "Automatically links employee to active department."),
            ("Job Title", "Recommended", "Exact Job Title / Designation from Organization Hub", "Automatically links designation and seniority level rank."),
            ("Branch / Location", "Recommended", "Exact Branch Name or Code (e.g. Corporate HQ, Plant 1)", "Stationing branch location for physical operations."),
            ("Salary Grade", "Recommended", "Exact Salary Grade Name or Code (e.g. Grade 1, Grade 3)", "Mapped to compensation bands and minimum wage tiers."),
            ("Employee Category", "Optional", "management, executive, officer, staff, worker, trainee, contractual", "BLA 2006 workforce category."),
            ("Employment Type", "Optional", "full_time, part_time, contract, intern", "Standard contract type."),
            ("Work Arrangement", "Optional", "onsite, remote, hybrid", "Workplace operational structure."),
            ("Overtime Eligible", "Optional", "Yes, No", "Defines eligibility for double-hourly overtime calculation."),
            ("Disbursement Method", "Optional", "bank_transfer, cash, mfs", "Salary payout channel."),
            ("MFS Provider", "Optional", "bkash, nagad, rocket", "Mobile Financial Services provider in Bangladesh."),
            ("Date Format", "Format", "YYYY-MM-DD (e.g. 2024-01-15)", "Standard ISO date format."),
        ]

        for item in guide_data:
            ws_guide.append(list(item))

        for row in ws_guide.iter_rows(min_row=2, max_row=len(guide_data) + 1):
            for cell in row:
                cell.border = border_thin
                cell.alignment = left_align

        ws_guide.column_dimensions["A"].width = 25
        ws_guide.column_dimensions["B"].width = 18
        ws_guide.column_dimensions["C"].width = 35
        ws_guide.column_dimensions["D"].width = 60

        output = BytesIO()
        wb.save(output)
        return output.getvalue()

    def generate_export_excel(self, db: Session, business_id: int | None = None) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Employees Directory"

        header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        border_thin = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="thin", color="CBD5E1"),
        )
        center_align = Alignment(horizontal="center", vertical="center")
        left_align = Alignment(horizontal="left", vertical="center")

        headers = [
            "Employee ID",
            "First Name",
            "Middle Name",
            "Last Name",
            "Full Name",
            "Bangla Name",
            "Work Email",
            "Personal Email",
            "Phone Number",
            "Date of Birth",
            "Gender",
            "Marital Status",
            "Religion",
            "Blood Group",
            "Nationality",
            "National ID / NID",
            "Passport Number",
            "TIN",
            "Father's Name",
            "Mother's Name",
            "Spouse's Name",
            "Emergency Contact Name",
            "Emergency Contact Relation",
            "Emergency Contact Phone",
            "Present Address",
            "Present Thana",
            "Present District",
            "Present Division",
            "Present Post Code",
            "Permanent Address",
            "Permanent Thana",
            "Permanent District",
            "Permanent Division",
            "Permanent Post Code",
            "Department",
            "Job Title / Designation",
            "Branch / Location",
            "Salary Grade",
            "Team",
            "Employee Category",
            "Employment Type",
            "Work Arrangement",
            "Start Date",
            "Confirmation Date",
            "Probation Period (Months)",
            "Notice Period (Days)",
            "Overtime Eligible",
            "Biometric ID",
            "RFID Card Number",
            "Disbursement Method",
            "Bank Name",
            "Bank Branch",
            "Bank Account Number",
            "Bank Account Title",
            "Bank Routing Number",
            "MFS Provider",
            "MFS Number",
            "Status",
        ]

        ws.append(headers)
        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = center_align
            cell.border = border_thin

        employees = self.repository.get_all(db, skip=0, limit=5000, business_id=business_id)
        departments = {d.id: d.name for d in self.department_repository.get_all(db, limit=2000)}
        job_titles = {j.id: j.name for j in self.job_title_repository.get_all(db, limit=2000)}
        branches = {b.id: b.name for b in self.branch_repository.get_all(db, limit=2000)}
        salary_grades = {g.id: g.name for g in self.salary_grade_repository.get_all(db, limit=2000)}

        for emp in employees:
            ws.append([
                emp.employee_id or "",
                emp.first_name or "",
                emp.middle_name or "",
                emp.last_name or "",
                emp.full_name or "",
                emp.bangla_name or "",
                emp.work_email or "",
                emp.personal_email or "",
                emp.phone or "",
                emp.date_of_birth.strftime("%Y-%m-%d") if emp.date_of_birth else "",
                emp.gender.value if emp.gender else "",
                emp.marital_status.value if emp.marital_status else "",
                emp.religion or "",
                emp.blood_group or "",
                emp.nationality or "",
                emp.national_id or "",
                emp.passport_no or "",
                emp.tin or "",
                emp.father_name or "",
                emp.mother_name or "",
                emp.spouse_name or "",
                emp.emergency_contact_name or "",
                emp.emergency_contact_relation or "",
                emp.emergency_contact_phone or "",
                emp.present_address or "",
                emp.present_thana or "",
                emp.present_district or "",
                emp.present_division or "",
                emp.present_post_code or "",
                emp.permanent_address or "",
                emp.permanent_thana or "",
                emp.permanent_district or "",
                emp.permanent_division or "",
                emp.permanent_post_code or "",
                departments.get(emp.department_id, "") if emp.department_id else "",
                job_titles.get(emp.job_title_id, "") if emp.job_title_id else "",
                branches.get(emp.branch_id, "") if emp.branch_id else "",
                salary_grades.get(emp.salary_grade_id, "") if emp.salary_grade_id else "",
                emp.team or "",
                emp.employee_category or "",
                emp.employment_type.value if emp.employment_type else "",
                emp.work_arrangement.value if emp.work_arrangement else "",
                emp.start_date.strftime("%Y-%m-%d") if emp.start_date else "",
                emp.confirmation_date.strftime("%Y-%m-%d") if emp.confirmation_date else "",
                emp.probation_period_months if emp.probation_period_months is not None else "",
                emp.notice_period_days if emp.notice_period_days is not None else "",
                "Yes" if emp.is_overtime_eligible else "No",
                emp.biometric_user_id or "",
                emp.rfid_card_number or "",
                emp.disbursement_method or "",
                emp.bank_name or "",
                emp.bank_branch or "",
                emp.bank_account_no or "",
                emp.bank_account_title or "",
                emp.bank_routing_number or "",
                emp.mfs_provider or "",
                emp.mfs_number or "",
                "Active" if emp.is_active else "Inactive",
            ])

        for row in ws.iter_rows(min_row=2, max_row=ws.max_row):
            for cell in row:
                cell.border = border_thin
                cell.alignment = left_align

        for col in ws.columns:
            header_val = str(col[0].value or "")
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, len(header_val) + 3, 12)

        output = BytesIO()
        wb.save(output)
        return output.getvalue()

    def start_import_job(
        self, db: Session, business_id: int, file_bytes: bytes, created_by: str | None = None
    ) -> tuple[ImportJob, list, int]:
        if not business_id or business_id <= 0:
            business_id = 1
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

        # Look for header row (may be row 1 or row 4 if template title exists)
        start_idx = 0
        for r_idx, r in enumerate(rows[:6]):
            if not r:
                continue
            r_str = " ".join(str(cell or "").lower() for cell in r)
            if "employee id" in r_str or "first name" in r_str or "work email" in r_str:
                start_idx = r_idx + 1
                break

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

            # Lookup mapping dictionaries
            departments = self.department_repository.get_all(db, business_id=business_id, limit=1000)
            dept_map = {}
            for d in departments:
                if d.name:
                    dept_map[d.name.strip().lower()] = d
                if getattr(d, "code", None):
                    dept_map[str(d.code).strip().lower()] = d

            job_titles = self.job_title_repository.get_all(db, business_id=business_id, limit=1000)
            jt_map = {}
            for j in job_titles:
                if j.name:
                    jt_map[j.name.strip().lower()] = j
                if getattr(j, "short_name", None):
                    jt_map[str(j.short_name).strip().lower()] = j

            branches = self.branch_repository.get_all(db, business_id=business_id, limit=1000)
            branch_map = {}
            for b in branches:
                if b.name:
                    branch_map[b.name.strip().lower()] = b
                if getattr(b, "code", None):
                    branch_map[str(b.code).strip().lower()] = b

            grades = self.salary_grade_repository.get_all(db, business_id=business_id, limit=1000)
            grade_map = {}
            for g in grades:
                if g.name:
                    grade_map[g.name.strip().lower()] = g
                if getattr(g, "code", None):
                    grade_map[str(g.code).strip().lower()] = g

            # Header detection
            header_row_idx = max(0, start_idx - 1)
            raw_header = [str(cell or "").strip().lower() for cell in rows[header_row_idx]] if header_row_idx < len(rows) else []

            def clean_h(h: str) -> str:
                return "".join(c for c in h if c.isalnum())

            cleaned_header = [clean_h(h) for h in raw_header]

            def find_col(*aliases) -> int | None:
                for alias in aliases:
                    cleaned_alias = clean_h(alias)
                    for idx, ch in enumerate(cleaned_header):
                        if cleaned_alias == ch or cleaned_alias in ch:
                            return idx
                return None

            col_map = {
                "emp_code": find_col("employeeid", "empcode", "code"),
                "first_name": find_col("firstname", "first"),
                "middle_name": find_col("middlename", "middle"),
                "last_name": find_col("lastname", "last"),
                "bangla_name": find_col("banglaname", "bengaliname"),
                "work_email": find_col("workemail", "email", "officeemail"),
                "personal_email": find_col("personalemail"),
                "phone": find_col("phonenumber", "phone", "mobile"),
                "dob": find_col("dateofbirth", "dob", "birthdate"),
                "gender": find_col("gender", "sex"),
                "marital_status": find_col("maritalstatus", "marital"),
                "religion": find_col("religion"),
                "blood_group": find_col("bloodgroup", "blood"),
                "nationality": find_col("nationality"),
                "national_id": find_col("nationalid", "nid"),
                "passport_no": find_col("passportnumber", "passport"),
                "tin": find_col("tin", "taxid"),
                "father_name": find_col("fathersname", "fathername", "father"),
                "mother_name": find_col("mothersname", "mothername", "mother"),
                "spouse_name": find_col("spousesname", "spousename", "spouse"),
                "emergency_name": find_col("emergencycontactname", "emergencyname"),
                "emergency_relation": find_col("emergencycontactrelation", "emergencyrelation"),
                "emergency_phone": find_col("emergencycontactphone", "emergencyphone"),
                "present_address": find_col("presentaddress"),
                "present_thana": find_col("presentthana", "presentupazila"),
                "present_district": find_col("presentdistrict"),
                "present_division": find_col("presentdivision"),
                "present_post_code": find_col("presentpostcode", "presentpostalcode", "presentzip"),
                "permanent_address": find_col("permanentaddress"),
                "permanent_thana": find_col("permanentthana", "permanentupazila"),
                "permanent_district": find_col("permanentdistrict"),
                "permanent_division": find_col("permanentdivision"),
                "permanent_post_code": find_col("permanentpostcode", "permanentpostalcode", "permanentzip"),
                "department": find_col("department", "dept"),
                "job_title": find_col("jobtitle", "designation", "title"),
                "branch": find_col("branch", "location", "office"),
                "salary_grade": find_col("salarygrade", "grade", "paygrade"),
                "team": find_col("team"),
                "category": find_col("employeecategory", "category"),
                "emp_type": find_col("employmenttype", "type"),
                "arrangement": find_col("workarrangement", "arrangement"),
                "start_date": find_col("startdate", "joiningdate"),
                "confirmation_date": find_col("confirmationdate"),
                "probation_months": find_col("probationperiod", "probationmonths", "probation"),
                "notice_days": find_col("noticeperiod", "noticedays", "notice"),
                "overtime": find_col("overtimeeligible", "overtime", "ot"),
                "biometric_id": find_col("biometricid", "biometricuserid", "biometric"),
                "rfid": find_col("rfidcardnumber", "rfid"),
                "disbursement": find_col("disbursementmethod", "paymentmethod", "disbursement"),
                "bank_name": find_col("bankname"),
                "bank_branch": find_col("bankbranch"),
                "bank_account_no": find_col("bankaccountnumber", "bankaccountno", "accountno"),
                "bank_account_title": find_col("bankaccounttitle", "accounttitle"),
                "bank_routing": find_col("bankroutingnumber", "routingnumber", "routingno"),
                "mfs_provider": find_col("mfsprovider", "mfs"),
                "mfs_number": find_col("mfsnumber", "walletnumber", "mfsphone"),
            }

            errors_list = []

            for row_idx, row in enumerate(rows[start_idx:], start=start_idx + 1):
                if not row or not any(row):
                    continue

                db.refresh(job)
                if job.cancelled:
                    job.status = "cancelled"
                    db.commit()
                    return

                def get_val(key: str, default_idx: int | None = None) -> Any:
                    idx = col_map.get(key)
                    if idx is None:
                        idx = default_idx
                    if idx is not None and idx < len(row) and row[idx] is not None:
                        val = row[idx]
                        if isinstance(val, str):
                            val = val.strip()
                        return val
                    return None

                emp_code_raw = str(get_val("emp_code", 0) or "").strip()
                first_name_raw = str(get_val("first_name", 1) or "").strip()
                work_email_raw = str(get_val("work_email", 5) or "").strip()

                row_error = None
                if not emp_code_raw:
                    row_error = "Missing required Employee ID."
                elif not first_name_raw:
                    row_error = "Missing required First Name."
                elif not work_email_raw:
                    row_error = "Missing required Work Email."

                if row_error:
                    errors_list.append({"row": row_idx, "employee_id": emp_code_raw, "email": work_email_raw, "error": row_error})
                    job.error_count += 1
                    job.processed += 1
                    job.errors = json.dumps(errors_list)
                    db.commit()
                    continue

                # Check duplicates
                existing_by_id = self.repository.get_by_employee_id(db, emp_code_raw, business_id)
                existing_by_email = self.repository.get_by_work_email(db, work_email_raw, business_id)

                if existing_by_id or existing_by_email:
                    reasons = []
                    if existing_by_id:
                        reasons.append(f"Employee ID '{emp_code_raw}' already exists")
                    if existing_by_email:
                        reasons.append(f"Work Email '{work_email_raw}' already exists")
                    row_error = f"Skipped - {', '.join(reasons)}."
                    errors_list.append({"row": row_idx, "employee_id": emp_code_raw, "email": work_email_raw, "error": row_error})
                    job.error_count += 1
                    job.processed += 1
                    job.errors = json.dumps(errors_list)
                    db.commit()
                    continue

                # Helper to parse dates
                def parse_date(val: Any) -> date | None:
                    if not val:
                        return None
                    if isinstance(val, (datetime, date)):
                        return val.date() if isinstance(val, datetime) else val
                    val_str = str(val).strip()
                    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
                        try:
                            return datetime.strptime(val_str, fmt).date()
                        except ValueError:
                            pass
                    return None

                # Lookups
                dept_raw = str(get_val("department") or "").strip().lower()
                dept_obj = dept_map.get(dept_raw) if dept_raw else None

                jt_raw = str(get_val("job_title") or "").strip().lower()
                jt_obj = jt_map.get(jt_raw) if jt_raw else None

                branch_raw = str(get_val("branch") or "").strip().lower()
                branch_obj = branch_map.get(branch_raw) if branch_raw else None

                grade_raw = str(get_val("salary_grade") or "").strip().lower()
                grade_obj = grade_map.get(grade_raw) if grade_raw else None

                # Enums & Options
                gender_raw = str(get_val("gender") or "").strip().lower()
                gender_enum = None
                if gender_raw in ("male", "female", "other"):
                    gender_enum = GenderEnum(gender_raw)

                marital_raw = str(get_val("marital_status") or "").strip().lower()
                marital_enum = None
                if marital_raw in ("single", "married", "divorced", "widowed"):
                    marital_enum = MaritalStatusEnum(marital_raw)

                emp_type_raw = str(get_val("emp_type") or "").strip().lower()
                emp_type_enum = None
                if emp_type_raw in ("full_time", "part_time", "contract", "intern"):
                    emp_type_enum = EmploymentTypeEnum(emp_type_raw)
                elif "full" in emp_type_raw:
                    emp_type_enum = EmploymentTypeEnum.FULL_TIME
                elif "part" in emp_type_raw:
                    emp_type_enum = EmploymentTypeEnum.PART_TIME
                elif "contract" in emp_type_raw:
                    emp_type_enum = EmploymentTypeEnum.CONTRACT
                elif "intern" in emp_type_raw:
                    emp_type_enum = EmploymentTypeEnum.INTERN

                arrangement_raw = str(get_val("arrangement") or "").strip().lower()
                arrangement_enum = None
                if arrangement_raw in ("onsite", "remote", "hybrid"):
                    arrangement_enum = WorkArrangementEnum(arrangement_raw)

                # Numbers & booleans
                overtime_raw = str(get_val("overtime") or "").strip().lower()
                is_ot = overtime_raw in ("yes", "true", "1", "y")

                probation_raw = get_val("probation_months")
                try:
                    probation_months = int(probation_raw) if probation_raw is not None and str(probation_raw).strip() != "" else 3
                except (ValueError, TypeError):
                    probation_months = 3

                notice_raw = get_val("notice_days")
                try:
                    notice_days = int(notice_raw) if notice_raw is not None and str(notice_raw).strip() != "" else 30
                except (ValueError, TypeError):
                    notice_days = 30

                # Disbursement
                disburse_raw = str(get_val("disbursement") or "").strip().lower()
                if "bank" in disburse_raw:
                    disbursement_method = "bank_transfer"
                elif "mfs" in disburse_raw or "bkash" in disburse_raw or "nagad" in disburse_raw:
                    disbursement_method = "mfs"
                elif "cash" in disburse_raw:
                    disbursement_method = "cash"
                else:
                    disbursement_method = disburse_raw or "bank_transfer"

                mfs_provider_raw = str(get_val("mfs_provider") or "").strip().lower()
                if mfs_provider_raw in ("bkash", "nagad", "rocket"):
                    mfs_provider = mfs_provider_raw
                else:
                    mfs_provider = mfs_provider_raw or None

                category_raw = str(get_val("category") or "").strip().lower()
                valid_categories = ("management", "executive", "officer", "staff", "worker", "trainee", "contractual")
                category = category_raw if category_raw in valid_categories else "executive"

                create_data = EmployeeCreate(
                    business_id=business_id,
                    employee_id=emp_code_raw,
                    first_name=first_name_raw,
                    middle_name=str(get_val("middle_name") or "") or None,
                    last_name=str(get_val("last_name") or "") or None,
                    bangla_name=str(get_val("bangla_name") or "") or None,
                    work_email=work_email_raw,
                    personal_email=str(get_val("personal_email") or "") or None,
                    phone=str(get_val("phone") or "") or None,
                    date_of_birth=parse_date(get_val("dob")),
                    gender=gender_enum,
                    marital_status=marital_enum,
                    religion=str(get_val("religion") or "") or None,
                    blood_group=str(get_val("blood_group") or "") or None,
                    nationality=str(get_val("nationality") or "") or "Bangladeshi",
                    national_id=str(get_val("national_id") or "") or None,
                    passport_no=str(get_val("passport_no") or "") or None,
                    tin=str(get_val("tin") or "") or None,
                    father_name=str(get_val("father_name") or "") or None,
                    mother_name=str(get_val("mother_name") or "") or None,
                    spouse_name=str(get_val("spouse_name") or "") or None,
                    emergency_contact_name=str(get_val("emergency_name") or "") or None,
                    emergency_contact_relation=str(get_val("emergency_relation") or "") or None,
                    emergency_contact_phone=str(get_val("emergency_phone") or "") or None,
                    present_address=str(get_val("present_address") or "") or None,
                    present_thana=str(get_val("present_thana") or "") or None,
                    present_district=str(get_val("present_district") or "") or None,
                    present_division=str(get_val("present_division") or "") or None,
                    present_post_code=str(get_val("present_post_code") or "") or None,
                    permanent_address=str(get_val("permanent_address") or "") or None,
                    permanent_thana=str(get_val("permanent_thana") or "") or None,
                    permanent_district=str(get_val("permanent_district") or "") or None,
                    permanent_division=str(get_val("permanent_division") or "") or None,
                    permanent_post_code=str(get_val("permanent_post_code") or "") or None,
                    department_id=dept_obj.id if dept_obj else None,
                    job_title_id=jt_obj.id if jt_obj else None,
                    branch_id=branch_obj.id if branch_obj else None,
                    salary_grade_id=grade_obj.id if grade_obj else None,
                    team=str(get_val("team") or "") or None,
                    employee_category=category,
                    employment_type=emp_type_enum,
                    work_arrangement=arrangement_enum,
                    start_date=parse_date(get_val("start_date")),
                    confirmation_date=parse_date(get_val("confirmation_date")),
                    probation_period_months=probation_months,
                    notice_period_days=notice_days,
                    is_overtime_eligible=is_ot,
                    biometric_user_id=str(get_val("biometric_id") or "") or None,
                    rfid_card_number=str(get_val("rfid") or "") or None,
                    disbursement_method=disbursement_method,
                    bank_name=str(get_val("bank_name") or "") or None,
                    bank_branch=str(get_val("bank_branch") or "") or None,
                    bank_account_no=str(get_val("bank_account_no") or "") or None,
                    bank_account_title=str(get_val("bank_account_title") or "") or None,
                    bank_routing_number=str(get_val("bank_routing") or "") or None,
                    mfs_provider=mfs_provider,
                    mfs_number=str(get_val("mfs_number") or "") or None,
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

    # ── Nominee Management (BLA 2006 / Form 33) ───────────────────
    def create_nominee(
        self,
        db: Session,
        employee_id: uuid.UUID,
        data: EmployeeNomineeCreate,
        business_id: int | None = None,
    ) -> EmployeeNominee:
        emp = self.get_employee_by_id(db, employee_id, business_id=business_id)
        current_nominees = self.repository.get_nominees_by_employee(db, employee_id)
        current_total = sum(n.share_percentage for n in current_nominees)
        if current_total + data.share_percentage > 100.001:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Total nominee share percentage cannot exceed 100%. Current allocated: {current_total:.1f}%, Attempted to add: {data.share_percentage:.1f}%",
            )
        eff_biz_id = business_id if business_id is not None else emp.business_id
        return self.repository.create_nominee(db, data, employee_id, eff_biz_id)

    def get_employee_nominees(
        self,
        db: Session,
        employee_id: uuid.UUID,
        business_id: int | None = None,
    ) -> list[EmployeeNominee]:
        self.get_employee_by_id(db, employee_id, business_id=business_id)
        return self.repository.get_nominees_by_employee(db, employee_id)

    def update_nominee(
        self,
        db: Session,
        employee_id: uuid.UUID,
        nominee_id: uuid.UUID,
        data: EmployeeNomineeUpdate,
        business_id: int | None = None,
    ) -> EmployeeNominee:
        self.get_employee_by_id(db, employee_id, business_id=business_id)
        nominee = self.repository.get_nominee_by_id(db, nominee_id)
        if not nominee or nominee.employee_id != employee_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nominee not found",
            )
        if business_id is not None and nominee.business_id != business_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nominee not found",
            )
        if data.share_percentage is not None:
            current_nominees = self.repository.get_nominees_by_employee(db, employee_id)
            other_total = sum(n.share_percentage for n in current_nominees if n.id != nominee_id)
            if other_total + data.share_percentage > 100.001:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Total nominee share percentage cannot exceed 100%. Other nominees: {other_total:.1f}%, Attempted: {data.share_percentage:.1f}%",
                )
        return self.repository.update_nominee(db, nominee, data)

    def delete_nominee(
        self,
        db: Session,
        employee_id: uuid.UUID,
        nominee_id: uuid.UUID,
        business_id: int | None = None,
    ) -> None:
        self.get_employee_by_id(db, employee_id, business_id=business_id)
        nominee = self.repository.get_nominee_by_id(db, nominee_id)
        if not nominee or nominee.employee_id != employee_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nominee not found",
            )
        if business_id is not None and nominee.business_id != business_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nominee not found",
            )
        self.repository.delete_nominee(db, nominee)

    # ── Org Chart Tree Construction ───────────────────────────────
    def get_org_chart(
        self,
        db: Session,
        business_id: int,
        branch_id: uuid.UUID | None = None,
        department_id: uuid.UUID | None = None,
    ) -> list[OrgChartNodeOut]:
        employees = self.repository.get_all_for_org_chart(
            db, business_id=business_id, branch_id=branch_id, department_id=department_id
        )
        if not employees:
            return []

        node_map: dict[uuid.UUID, OrgChartNodeOut] = {}
        for emp in employees:
            node_map[emp.id] = OrgChartNodeOut(
                id=emp.id,
                employee_id=emp.employee_id,
                name=emp.full_name,
                bangla_name=emp.bangla_name,
                job_title=emp.job_title_name,
                department=emp.department_name,
                branch=emp.branch_name,
                salary_grade=emp.salary_grade.name if emp.salary_grade else None,
                photo_url=emp.photo_url,
                email=emp.work_email,
                phone=emp.phone,
                direct_manager_id=emp.direct_manager_id,
                reports=[],
            )

        roots: list[OrgChartNodeOut] = []
        for emp in employees:
            node = node_map[emp.id]
            if emp.direct_manager_id and emp.direct_manager_id in node_map and emp.direct_manager_id != emp.id:
                node_map[emp.direct_manager_id].reports.append(node)
            else:
                roots.append(node)

        return roots

    # ── Smart ID Card Generation ──────────────────────────────────
    def get_id_card_data(
        self,
        db: Session,
        employee_id: uuid.UUID,
        business_id: int,
    ) -> IDCardDataOut:
        emp = self.get_employee_by_id(db, employee_id, business_id=business_id)
        biz = emp.business_profile
        company_name = getattr(biz, "name_en", None) or getattr(biz, "company_name", None) or "Enterprise Group"
        city_str = f", {biz.city}" if biz and getattr(biz, "city", None) else ""
        addr = getattr(biz, "address_en", None) or getattr(biz, "address", None) or ""
        company_address = f"{addr}{city_str}" if addr else "Dhaka, Bangladesh"
        company_logo_url = getattr(biz, "logo", None) or getattr(biz, "logo_url", None)

        return IDCardDataOut(
            employee_id=emp.employee_id,
            full_name=emp.full_name,
            bangla_name=emp.bangla_name,
            photo_url=emp.photo_url,
            job_title=emp.job_title_name,
            department=emp.department_name,
            branch=emp.branch_name,
            blood_group=emp.blood_group,
            emergency_contact_phone=emp.emergency_contact_phone or emp.phone,
            joining_date=emp.start_date,
            biometric_user_id=emp.biometric_user_id,
            rfid_card_number=emp.rfid_card_number,
            company_name=company_name,
            company_address=company_address.strip(", "),
            company_logo_url=company_logo_url,
            verification_url=f"/verify/emp/{emp.employee_id}",
        )

    def get_unlinked_employees(
        self,
        db: Session,
        business_id: int | None = None,
    ) -> list[Employee]:
        query = db.query(Employee).filter(Employee.user_id.is_(None))
        if business_id is not None:
            query = query.filter(Employee.business_id == business_id)
        return query.order_by(Employee.first_name.asc()).all()

    def provision_user_for_employee(
        self,
        db: Session,
        business_id: int | None,
        employee_id: uuid.UUID,
        data: Any,
    ) -> dict:
        from app.core.identity.models import User, Role
        from app.core.security import hash_password
        from app.core.billing.models import SubscriptionPlan
        from app.core.tenancy.models import BusinessProfile

        emp = self.get_employee_by_id(db, employee_id, business_id=business_id)
        if emp.user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee {emp.full_name} ({emp.employee_id}) already has a linked user account (User #{emp.user_id}).",
            )

        # Determine username and email
        raw_username = (data.username or emp.work_email or emp.employee_id).strip()
        username = raw_username.split("@")[0].lower() if "@" in raw_username else raw_username.lower()
        email = (data.email or emp.work_email or emp.personal_email or f"{username}@wbsoft.local").strip().lower()

        # Check uniqueness
        existing_user = db.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A user with username '{username}' or email '{email}' already exists.",
            )

        # Check subscription seat limit
        biz_id = emp.business_id
        if biz_id:
            biz = db.query(BusinessProfile).filter(BusinessProfile.id == biz_id).first()
            if biz and biz.subscription_plan_id:
                plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == biz.subscription_plan_id).first()
                if plan and plan.max_users:
                    active_users_count = db.query(User).filter(
                        User.business_id == biz_id, User.is_active == True
                    ).count()
                    if active_users_count >= plan.max_users:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Subscription seat quota exceeded ({active_users_count}/{plan.max_users} seats used on {plan.name} plan). Please upgrade your subscription plan.",
                        )

        new_user = User(
            username=username,
            email=email,
            password_hash=hash_password(data.password),
            phone=emp.phone,
            business_id=emp.business_id,
            is_active=True,
            is_superuser=False,
            is_verified=True,
        )
        db.add(new_user)
        db.flush()

        # Assign roles
        if data.role_ids:
            roles = db.query(Role).filter(Role.id.in_(data.role_ids)).all()
            new_user.roles = roles
        else:
            default_role = db.query(Role).filter(Role.name.in_(["hr_basic", "customer"])).first()
            if default_role:
                new_user.roles = [default_role]

        emp.user_id = new_user.id
        db.commit()
        db.refresh(emp)
        db.refresh(new_user)

        return {
            "message": f"User account created and linked to employee {emp.full_name} successfully.",
            "user_id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "employee_id": str(emp.id),
            "employee_code": emp.employee_id,
            "roles": [r.name for r in new_user.roles],
        }

    def unlink_user_from_employee(
        self,
        db: Session,
        business_id: int | None,
        employee_id: uuid.UUID,
    ) -> dict:
        emp = self.get_employee_by_id(db, employee_id, business_id=business_id)
        if not emp.user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee {emp.full_name} is not currently linked to any user account.",
            )

        old_user_id = emp.user_id
        emp.user_id = None
        db.commit()
        db.refresh(emp)

        return {
            "message": f"User account #{old_user_id} unlinked from employee {emp.full_name}.",
            "employee_id": str(emp.id),
        }


