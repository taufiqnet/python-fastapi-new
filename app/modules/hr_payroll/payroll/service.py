import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from datetime import timedelta

from app.modules.hr_payroll.attendance.models import AttendanceStatusEnum
from app.modules.hr_payroll.attendance.repository import AttendanceRepository
from app.modules.hr_payroll.compensation.repository import EmployeeSalaryRepository
from app.modules.hr_payroll.employees.repository import EmployeeRepository
from app.modules.hr_payroll.leave.models import LeaveStatusEnum
from app.modules.hr_payroll.leave.repository import LeaveApplicationRepository
from app.modules.hr_payroll.payroll.models import (
    Holiday,
    HolidayTypeEnum,
    PaymentMethodEnum,
    PayrollPeriod,
    PayrollPeriodStatusEnum,
    PayrollRecord,
    PayrollSettings,
)
from app.core.tenancy.scoping import resolve_business_id, verify_record_ownership
from app.modules.hr_payroll.payroll.repository import (
    HolidayRepository,
    PayrollPeriodRepository,
    PayrollRecordRepository,
    PayrollSettingsRepository,
)
from io import BytesIO
import openpyxl
from app.core.tenancy.repository import BusinessRepository
from app.modules.hr_payroll.payroll.schemas import (
    HolidayCreate,
    HolidayUpdate,
    PayrollPeriodCreate,
    PayrollPeriodUpdate,
    PayrollRecordCreate,
    PayrollRecordUpdate,
    PayrollSettingsUpdate,
)


class HolidayService:
    def __init__(self, repository: HolidayRepository | None = None):
        self.repository = repository or HolidayRepository()

    def get_holidays(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        holiday_type: str | HolidayTypeEnum | None = None,
    ) -> list[Holiday]:
        return self.repository.get_all(
            db,
            skip=skip,
            limit=limit,
            business_id=business_id,
            holiday_type=holiday_type,
        )

    def get_holiday(
        self, db: Session, holiday_uuid: uuid.UUID, current_user=None
    ) -> Holiday:
        holiday = self.repository.get_by_id(db, holiday_uuid)
        verify_record_ownership(holiday, current_user, detail="Holiday not found")
        return holiday

    def create_holiday(self, db: Session, data: HolidayCreate) -> Holiday:
        if data.start_date > data.end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date cannot be after end date",
            )
        return self.repository.create(db, data)

    def update_holiday(
        self,
        db: Session,
        holiday_uuid: uuid.UUID,
        data: HolidayUpdate,
        current_user=None,
    ) -> Holiday:
        holiday = self.get_holiday(db, holiday_uuid, current_user=current_user)
        start_date = data.start_date or holiday.start_date
        end_date = data.end_date or holiday.end_date
        if start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date cannot be after end date",
            )
        return self.repository.update(db, holiday, data)

    def delete_holiday(
        self, db: Session, holiday_uuid: uuid.UUID, current_user=None
    ) -> None:
        holiday = self.get_holiday(db, holiday_uuid, current_user=current_user)
        self.repository.delete(db, holiday)

    def generate_export_excel(self, db: Session, business_id: int | None = None) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Holidays"

        headers = [
            "Holiday ID",
            "Holiday Name",
            "Holiday Type",
            "Start Date",
            "End Date",
            "Description",
            "Status",
            "Business Profile ID",
            "Business Profile Name",
        ]
        ws.append(headers)

        holidays = self.repository.get_all(db, skip=0, limit=2000, business_id=business_id)
        biz_repo = BusinessRepository()
        businesses = {b.id: b.name_en for b in biz_repo.get_all(db, skip=0, limit=1000)}

        for h in holidays:
            ws.append([
                str(h.id),
                h.name or "",
                h.holiday_type.value if h.holiday_type else "",
                h.start_date.strftime("%Y-%m-%d") if h.start_date else "",
                h.end_date.strftime("%Y-%m-%d") if h.end_date else "",
                h.description or "",
                "Active" if h.is_active else "Inactive",
                str(h.business_id) if h.business_id else "",
                businesses.get(h.business_id, "") if h.business_id else "Global",
            ])

        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

        output = BytesIO()
        wb.save(output)
        return output.getvalue()


class PayrollPeriodService:
    def __init__(self, repository: PayrollPeriodRepository | None = None):
        self.repository = repository or PayrollPeriodRepository()

    def get_periods(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        status_filter: str | PayrollPeriodStatusEnum | None = None,
    ) -> list[PayrollPeriod]:
        return self.repository.get_all(
            db,
            skip=skip,
            limit=limit,
            business_id=business_id,
            status=status_filter,
        )

    def get_period(
        self, db: Session, period_uuid: uuid.UUID, current_user: Any | None = None
    ) -> PayrollPeriod:
        period = self.repository.get_by_id(db, period_uuid)
        if current_user is not None:
            return verify_record_ownership(
                period, current_user, detail="Payroll period not found"
            )
        if not period:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payroll period not found",
            )
        return period

    def create_period(self, db: Session, data: PayrollPeriodCreate) -> PayrollPeriod:
        if data.start_date > data.end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date cannot be after end date",
            )

        existing = self.repository.get_by_name(db, data.name, data.business_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payroll period with name '{data.name}' already exists",
            )

        return self.repository.create(db, data)

    def update_period(
        self,
        db: Session,
        period_uuid: uuid.UUID,
        data: PayrollPeriodUpdate,
        current_user: Any | None = None,
    ) -> PayrollPeriod:
        period = self.get_period(db, period_uuid, current_user=current_user)

        target_business_id = (
            data.business_id if data.business_id is not None else period.business_id
        )

        if data.name is not None and data.name != period.name:
            existing = self.repository.get_by_name(db, data.name, target_business_id)
            if existing and existing.id != period_uuid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Payroll period with name '{data.name}' already exists",
                )

        if period.status == PayrollPeriodStatusEnum.PAID and data.status is not None:
            target_status = (
                data.status
                if isinstance(data.status, PayrollPeriodStatusEnum)
                else PayrollPeriodStatusEnum(data.status)
            )
            if target_status != PayrollPeriodStatusEnum.PAID:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot modify or revert a paid payroll period",
                )

        start_date = data.start_date or period.start_date
        end_date = data.end_date or period.end_date
        if start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date cannot be after end date",
            )

        return self.repository.update(db, period, data)

    def delete_period(
        self, db: Session, period_uuid: uuid.UUID, current_user: Any | None = None
    ) -> None:
        period = self.get_period(db, period_uuid, current_user=current_user)
        if period.is_locked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete a locked or paid payroll period",
            )
        self.repository.delete(db, period)

    def get_payroll_status(
        self,
        db: Session,
        period_uuid: uuid.UUID,
        business_id: int | None = None,
        current_user: Any | None = None,
    ) -> dict:
        period = self.get_period(db, period_uuid, current_user=current_user)
        if business_id is not None and period.business_id != business_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payroll period does not belong to specified business profile",
            )

        record_repo = PayrollRecordRepository()
        records = record_repo.get_all(
            db, business_id=period.business_id, period_id=period_uuid, limit=5000
        )

        total_records = len(records)
        paid_records = sum(1 for r in records if r.is_paid)
        unpaid_records = total_records - paid_records

        return {
            "period_id": str(period.id),
            "period_name": period.name,
            "business_id": period.business_id,
            "start_date": period.start_date.strftime("%Y-%m-%d") if period.start_date else None,
            "end_date": period.end_date.strftime("%Y-%m-%d") if period.end_date else None,
            "status": period.status.value if hasattr(period.status, "value") else str(period.status),
            "is_locked": period.is_locked,
            "total_records": total_records,
            "paid_records": paid_records,
            "unpaid_records": unpaid_records,
        }

    def generate_export_excel(self, db: Session, business_id: int | None = None) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Payroll Periods"

        headers = [
            "Period ID",
            "Period Name",
            "Start Date",
            "End Date",
            "Status",
            "Is Locked",
            "Business Profile ID",
            "Business Profile Name",
        ]
        ws.append(headers)

        periods = self.repository.get_all(db, skip=0, limit=2000, business_id=business_id)
        biz_repo = BusinessRepository()
        businesses = {b.id: b.name_en for b in biz_repo.get_all(db, skip=0, limit=1000)}

        for p in periods:
            ws.append([
                str(p.id),
                p.name or "",
                p.start_date.strftime("%Y-%m-%d") if p.start_date else "",
                p.end_date.strftime("%Y-%m-%d") if p.end_date else "",
                p.status.value if p.status else "",
                "Yes" if p.is_locked else "No",
                str(p.business_id) if p.business_id else "",
                businesses.get(p.business_id, "") if p.business_id else "Global",
            ])

        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

        output = BytesIO()
        wb.save(output)
        return output.getvalue()


class PayrollRecordService:
    def __init__(
        self,
        repository: PayrollRecordRepository | None = None,
        period_repository: PayrollPeriodRepository | None = None,
        employee_repository: EmployeeRepository | None = None,
        salary_repository: EmployeeSalaryRepository | None = None,
        attendance_repository: AttendanceRepository | None = None,
        leave_repository: LeaveApplicationRepository | None = None,
        holiday_repository: HolidayRepository | None = None,
        settings_repository: PayrollSettingsRepository | None = None,
        adjustment_repository: Any | None = None,
        loan_schedule_repository: Any | None = None,
        bonus_run_repository: Any | None = None,
        tax_slab_repository: Any | None = None,
        statutory_repository: Any | None = None,
        bank_account_repository: Any | None = None,
    ):
        from app.modules.hr_payroll.payroll.repository import (
            BonusRunRepository,
            CompanyBankAccountRepository,
            LoanRepaymentScheduleRepository,
            SalaryAdjustmentRepository,
            StatutoryComplianceRepository,
            TaxSlabRepository,
        )

        self.repository = repository or PayrollRecordRepository()
        self.period_repository = period_repository or PayrollPeriodRepository()
        self.employee_repository = employee_repository or EmployeeRepository()
        self.salary_repository = salary_repository or EmployeeSalaryRepository()
        self.attendance_repository = attendance_repository or AttendanceRepository()
        self.leave_repository = leave_repository or LeaveApplicationRepository()
        self.holiday_repository = holiday_repository or HolidayRepository()
        self.settings_repository = settings_repository or PayrollSettingsRepository()
        self.adjustment_repository = adjustment_repository or SalaryAdjustmentRepository()
        self.loan_schedule_repository = (
            loan_schedule_repository or LoanRepaymentScheduleRepository()
        )
        self.bonus_run_repository = bonus_run_repository or BonusRunRepository()
        self.tax_slab_repository = tax_slab_repository or TaxSlabRepository()
        self.statutory_repository = statutory_repository or StatutoryComplianceRepository()
        self.bank_account_repository = (
            bank_account_repository or CompanyBankAccountRepository()
        )

    def _compute_salary_totals(
        self,
        basic_salary: float,
        house_rent: float,
        transport_allowance: float,
        medical_allowance: float,
        food_allowance: float,
        other_allowance: float,
        overtime_pay: float,
        bonus: float,
        tax: float,
        provident_fund: float,
        unpaid_leave_deduction: float,
        loan_installment: float,
        other_deduction: float,
    ) -> tuple[float, float, float]:
        gross = (
            float(basic_salary)
            + float(house_rent)
            + float(transport_allowance)
            + float(medical_allowance)
            + float(food_allowance)
            + float(other_allowance)
            + float(overtime_pay)
            + float(bonus)
        )
        deductions = (
            float(tax)
            + float(provident_fund)
            + float(unpaid_leave_deduction)
            + float(loan_installment)
            + float(other_deduction)
        )
        net = gross - deductions
        return round(gross, 2), round(deductions, 2), round(net, 2)

    def get_records(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        period_id: uuid.UUID | None = None,
        employee_id: uuid.UUID | None = None,
        is_paid: bool | None = None,
    ) -> list[PayrollRecord]:
        return self.repository.get_all(
            db,
            skip=skip,
            limit=limit,
            business_id=business_id,
            period_id=period_id,
            employee_id=employee_id,
            is_paid=is_paid,
        )

    def get_record(
        self, db: Session, record_uuid: uuid.UUID, current_user: Any | None = None
    ) -> PayrollRecord:
        record = self.repository.get_by_id(db, record_uuid)
        if current_user is not None:
            return verify_record_ownership(
                record, current_user, detail="Payroll record (payslip) not found"
            )
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payroll record (payslip) not found",
            )
        return record

    def create_record(self, db: Session, data: PayrollRecordCreate) -> PayrollRecord:
        period = self.period_repository.get_by_id(db, data.period_id)
        if not period:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Payroll period with id '{data.period_id}' not found",
            )

        if period.is_locked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot create a payslip in a locked or paid payroll period",
            )

        employee = self.employee_repository.get_by_id(db, data.employee_id)
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with id '{data.employee_id}' not found",
            )

        existing = self.repository.get_by_period_employee(
            db, period_id=data.period_id, employee_id=data.employee_id
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payslip record for this employee and period already exists",
            )

        gross, deductions, net = self._compute_salary_totals(
            basic_salary=data.basic_salary,
            house_rent=data.house_rent,
            transport_allowance=data.transport_allowance,
            medical_allowance=data.medical_allowance,
            food_allowance=data.food_allowance,
            other_allowance=data.other_allowance,
            overtime_pay=data.overtime_pay,
            bonus=data.bonus,
            tax=data.tax,
            provident_fund=data.provident_fund,
            unpaid_leave_deduction=data.unpaid_leave_deduction,
            loan_installment=data.loan_installment,
            other_deduction=data.other_deduction,
        )

        return self.repository.create(
            db,
            data=data,
            gross_salary=gross,
            total_deduction=deductions,
            net_salary=net,
        )

    def update_record(
        self,
        db: Session,
        record_uuid: uuid.UUID,
        data: PayrollRecordUpdate,
        current_user: Any | None = None,
    ) -> PayrollRecord:
        record = self.get_record(db, record_uuid, current_user=current_user)

        if record.period and record.period.is_locked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot modify a payslip in a locked or paid payroll period",
            )

        basic_salary = (
            data.basic_salary if data.basic_salary is not None else record.basic_salary
        )
        house_rent = (
            data.house_rent if data.house_rent is not None else record.house_rent
        )
        transport_allowance = (
            data.transport_allowance
            if data.transport_allowance is not None
            else record.transport_allowance
        )
        medical_allowance = (
            data.medical_allowance
            if data.medical_allowance is not None
            else record.medical_allowance
        )
        food_allowance = (
            data.food_allowance
            if data.food_allowance is not None
            else record.food_allowance
        )
        other_allowance = (
            data.other_allowance
            if data.other_allowance is not None
            else record.other_allowance
        )
        overtime_pay = (
            data.overtime_pay if data.overtime_pay is not None else record.overtime_pay
        )
        bonus = data.bonus if data.bonus is not None else record.bonus

        tax = data.tax if data.tax is not None else record.tax
        provident_fund = (
            data.provident_fund
            if data.provident_fund is not None
            else record.provident_fund
        )
        unpaid_leave_deduction = (
            data.unpaid_leave_deduction
            if data.unpaid_leave_deduction is not None
            else record.unpaid_leave_deduction
        )
        loan_installment = (
            data.loan_installment
            if data.loan_installment is not None
            else record.loan_installment
        )
        other_deduction = (
            data.other_deduction
            if data.other_deduction is not None
            else record.other_deduction
        )

        gross, deductions, net = self._compute_salary_totals(
            basic_salary=basic_salary,
            house_rent=house_rent,
            transport_allowance=transport_allowance,
            medical_allowance=medical_allowance,
            food_allowance=food_allowance,
            other_allowance=other_allowance,
            overtime_pay=overtime_pay,
            bonus=bonus,
            tax=tax,
            provident_fund=provident_fund,
            unpaid_leave_deduction=unpaid_leave_deduction,
            loan_installment=loan_installment,
            other_deduction=other_deduction,
        )

        return self.repository.update(
            db,
            record=record,
            data=data,
            gross_salary=gross,
            total_deduction=deductions,
            net_salary=net,
        )

    def delete_record(
        self, db: Session, record_uuid: uuid.UUID, current_user: Any | None = None
    ) -> None:
        record = self.get_record(db, record_uuid, current_user=current_user)
        if record.period and record.period.is_locked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete a payslip in a locked or paid payroll period",
            )
        self.repository.delete(db, record)

    def generate_export_excel(self, db: Session, business_id: int | None = None) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Payslips"

        headers = [
            "Payslip ID",
            "Period",
            "Employee ID",
            "Employee Name",
            "Basic Salary",
            "Gross Salary",
            "Total Deduction",
            "Net Salary",
            "Payment Method",
            "Is Paid",
            "Business Profile ID",
            "Business Profile Name",
        ]
        ws.append(headers)

        records = self.repository.get_all(db, skip=0, limit=2000, business_id=business_id)
        employees = {e.id: e for e in self.employee_repository.get_all(db, limit=2000)}
        periods = {p.id: p.name for p in self.period_repository.get_all(db, limit=1000)}
        biz_repo = BusinessRepository()
        businesses = {b.id: b.name_en for b in biz_repo.get_all(db, skip=0, limit=1000)}

        for r in records:
            emp = employees.get(r.employee_id)
            emp_code = emp.employee_id if emp else ""
            emp_name = emp.full_name if emp else ""

            ws.append([
                str(r.id),
                periods.get(r.period_id, ""),
                emp_code,
                emp_name,
                float(r.basic_salary or 0.0),
                float(r.gross_salary or 0.0),
                float(r.total_deduction or 0.0),
                float(r.net_salary or 0.0),
                r.payment_method.value if r.payment_method else "",
                "Yes" if r.is_paid else "No",
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

    def get_payroll_summary_report(
        self, db: Session, business_id: int, period_id: uuid.UUID
    ) -> dict:
        # Added for MCP read-only report aggregation (totals only, no individual employee records)
        period = self.period_repository.get_by_id(db, period_id)
        if not period:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payroll period not found",
            )
        if period.business_id != business_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payroll period does not belong to specified business profile",
            )

        records = self.repository.get_all(
            db, business_id=business_id, period_id=period_id, limit=5000
        )

        total_gross = sum(float(r.gross_salary or 0) for r in records)
        total_net = sum(float(r.net_salary or 0) for r in records)
        total_deductions = sum(float(r.total_deduction or 0) for r in records)
        total_basic = sum(float(r.basic_salary or 0) for r in records)
        total_overtime_pay = sum(float(r.overtime_pay or 0) for r in records)
        total_bonus = sum(float(r.bonus or 0) for r in records)
        paid_count = sum(1 for r in records if r.is_paid)

        return {
            "business_id": business_id,
            "period_id": str(period_id),
            "period_name": period.name,
            "period_status": str(period.status.value if hasattr(period.status, "value") else period.status),
            "headcount": len(records),
            "total_basic_salary": round(total_basic, 2),
            "total_gross_salary": round(total_gross, 2),
            "total_net_salary": round(total_net, 2),
            "total_deductions": round(total_deductions, 2),
            "total_overtime_pay": round(total_overtime_pay, 2),
            "total_bonus": round(total_bonus, 2),
            "paid_count": paid_count,
            "unpaid_count": len(records) - paid_count,
        }

    def generate_period_payroll(
        self, db: Session, period_uuid: uuid.UUID, current_user: Any | None = None
    ) -> list[PayrollRecord]:
        period = self.period_repository.get_by_id(db, period_uuid)
        if current_user is not None:
            period = verify_record_ownership(
                period, current_user, detail="Payroll period not found"
            )
        elif not period:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payroll period not found",
            )

        if period.is_locked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot generate payroll for a locked or paid payroll period",
            )

        # Get business payroll settings
        settings = self.settings_repository.get_by_business_id(
            db, business_id=period.business_id
        )
        if not settings:
            settings = self.settings_repository.create(
                db, business_id=period.business_id
            )

        # Total working days in period
        working_days = (period.end_date - period.start_date).days + 1

        # Holidays in period
        holiday_days = 0
        if settings.include_holidays:
            holidays = self.holiday_repository.get_all(
                db, business_id=period.business_id, limit=500
            )
            for h in holidays:
                overlap_start = max(period.start_date, h.start_date)
                overlap_end = min(period.end_date, h.end_date)
                if overlap_start <= overlap_end:
                    holiday_days += (overlap_end - overlap_start).days + 1

        employees = self.employee_repository.get_all(
            db, business_id=period.business_id, limit=1000
        )
        active_employees = [e for e in employees if getattr(e, "is_active", True)]

        generated_records: list[PayrollRecord] = []

        for emp in active_employees:
            salary = self.salary_repository.get_by_employee_id(
                db, employee_id=emp.id, business_id=period.business_id
            )

            basic_salary = float(getattr(salary, "basic_salary", 0.0) or 0.0)
            house_rent = float(getattr(salary, "house_rent", 0.0) or 0.0)
            medical_allowance = float(getattr(salary, "medical_allowance", 0.0) or 0.0)
            transport_allowance = float(
                getattr(salary, "transport_allowance", 0.0) or 0.0
            )
            food_allowance = float(getattr(salary, "food_allowance", 0.0) or 0.0)
            other_allowance = float(getattr(salary, "other_allowance", 0.0) or 0.0)

            tax = float(getattr(salary, "tax", 0.0) or 0.0)
            provident_fund = float(getattr(salary, "provident_fund", 0.0) or 0.0)
            other_deduction = float(getattr(salary, "other_deduction", 0.0) or 0.0)

            # Attendance processing
            present_days = 0
            att_holiday_days = 0
            overtime_hours = 0.0
            if settings.include_attendance:
                att_records = self.attendance_repository.get_all(
                    db,
                    business_id=period.business_id,
                    employee_id=emp.id,
                    start_date=period.start_date,
                    end_date=period.end_date,
                    limit=500,
                )
                for att in att_records:
                    st = getattr(att.status, "value", att.status)
                    if st in ("present", "late"):
                        present_days += 1
                    elif st == "half_day":
                        present_days += 0.5
                    elif st in ("holiday", "weekend"):
                        att_holiday_days += 1
                    
                    if settings.include_overtime:
                        overtime_hours += float(att.overtime_hours or 0.0)
            else:
                present_days = working_days

            # Leave processing
            leave_days = 0
            unpaid_leave_days = 0
            if settings.include_leave:
                leave_apps = self.leave_repository.get_all(
                    db,
                    business_id=period.business_id,
                    employee_id=emp.id,
                    status=LeaveStatusEnum.APPROVED,
                    limit=500,
                )
                for la in leave_apps:
                    ov_start = max(period.start_date, la.start_date)
                    ov_end = min(period.end_date, la.end_date)
                    if ov_start <= ov_end:
                        days = (ov_end - ov_start).days + 1
                        leave_days += days
                        if la.leave_type and not la.leave_type.is_paid:
                            unpaid_leave_days += days

            # Combine holiday days from holiday calendar and attendance records
            emp_holiday_days = max(holiday_days, att_holiday_days) if settings.include_holidays else 0

            # Absent days calculation
            if settings.include_attendance:
                absent_days = max(
                    0, int(working_days - (present_days + leave_days + emp_holiday_days))
                )
            else:
                absent_days = 0

            # Daily and hourly rates
            daily_rate = basic_salary / working_days if working_days > 0 else 0.0
            std_hrs = float(settings.standard_hours_per_day or 9.0)
            hourly_rate = daily_rate / std_hrs if std_hrs > 0 else 0.0

            # Overtime pay
            overtime_pay = 0.0
            if settings.include_overtime and overtime_hours > 0:
                overtime_pay = round(overtime_hours * hourly_rate * 1.5, 2)

            # Deductions
            unpaid_leave_ded = 0.0
            if settings.include_leave and unpaid_leave_days > 0:
                unpaid_leave_ded += unpaid_leave_days * daily_rate

            absent_ded = 0.0
            if settings.include_attendance and settings.deduct_absent_days and absent_days > 0:
                absent_ded += absent_days * daily_rate

            total_unpaid_leave_deduction = round(unpaid_leave_ded + absent_ded, 2)

            # Adjustments processing (Arrears, Bonuses, Penalties)
            from app.modules.hr_payroll.payroll.models import (
                AdjustmentStatusEnum,
                AdjustmentTypeEnum,
                EMIStatusEnum,
            )
            from app.common.timezone import now_bd

            adjustments = self.adjustment_repository.get_all(
                db,
                business_id=period.business_id,
                period_id=period.id,
                employee_id=emp.id,
                status=AdjustmentStatusEnum.APPROVED.value,
                limit=100,
            )
            adj_allowance = 0.0
            adj_deduction = 0.0
            for adj in adjustments:
                if adj.adjustment_type in (
                    AdjustmentTypeEnum.ARREAR,
                    AdjustmentTypeEnum.BONUS_SPECIAL,
                    AdjustmentTypeEnum.INCENTIVE,
                ):
                    adj_allowance += float(adj.amount or 0.0)
                else:
                    adj_deduction += float(adj.amount or 0.0)

            total_other_allowance = round(other_allowance + adj_allowance, 2)
            total_other_deduction = round(other_deduction + adj_deduction, 2)

            # Loan EMI Schedule deduction
            loan_installment = 0.0
            due_emi = self.loan_schedule_repository.get_due_for_period(
                db,
                business_id=period.business_id,
                employee_id=emp.id,
                start_date=period.start_date,
                end_date=period.end_date,
            )
            if due_emi:
                loan_installment = float(due_emi.installment_amount or 0.0)

            # Bonus Run processing
            bonus_amount = 0.0
            bonus_runs = self.bonus_run_repository.get_all(
                db, business_id=period.business_id, period_id=period.id
            )
            for br in bonus_runs:
                if br.status in ("approved", "paid") and br.policy:
                    pol = br.policy
                    rate = float(pol.percentage_or_amount or 100.0)
                    if getattr(pol.calculation_basis, "value", pol.calculation_basis) == "percent_gross":
                        calc_base = basic_salary + house_rent + medical_allowance + transport_allowance
                    elif getattr(pol.calculation_basis, "value", pol.calculation_basis) == "flat_amount":
                        calc_base = 1.0
                    else:
                        calc_base = basic_salary
                    bonus_amount += round(calc_base * (rate / 100.0), 2)

            # Statutory PF & Tax (AIT / ITA 2023)
            statutory_setting = self.statutory_repository.get_by_business_id(
                db, business_id=period.business_id
            )
            if statutory_setting and statutory_setting.enable_provident_fund:
                pf_rate = float(statutory_setting.pf_employee_percent or 8.33)
                provident_fund = round(basic_salary * (pf_rate / 100.0), 2)

            if statutory_setting and statutory_setting.enable_tax_auto_deduction:
                # Progressive Income Tax Act 2023 estimation
                # Project annual gross = (basic + allowances + bonus) * 12
                projected_annual_gross = (
                    basic_salary
                    + house_rent
                    + transport_allowance
                    + medical_allowance
                    + food_allowance
                    + total_other_allowance
                ) * 12 + bonus_amount

                slabs = self.tax_slab_repository.get_all(
                    db, business_id=period.business_id
                )
                if slabs and projected_annual_gross > 0:
                    annual_tax = 0.0
                    for slb in slabs:
                        if projected_annual_gross > float(slb.min_income):
                            slab_max = float(slb.max_income) if slb.max_income is not None else projected_annual_gross
                            taxable_in_slab = min(projected_annual_gross, slab_max) - float(slb.min_income)
                            if taxable_in_slab > 0:
                                annual_tax += taxable_in_slab * (float(slb.tax_rate_percent) / 100.0)

                    if annual_tax > 0:
                        annual_tax = max(annual_tax, float(statutory_setting.minimum_tax_amount or 5000.0))
                        tax = round(annual_tax / 12.0, 2)

            gross, deductions, net = self._compute_salary_totals(
                basic_salary=basic_salary,
                house_rent=house_rent,
                transport_allowance=transport_allowance,
                medical_allowance=medical_allowance,
                food_allowance=food_allowance,
                other_allowance=total_other_allowance,
                overtime_pay=overtime_pay,
                bonus=bonus_amount,
                tax=tax,
                provident_fund=provident_fund,
                unpaid_leave_deduction=total_unpaid_leave_deduction,
                loan_installment=loan_installment,
                other_deduction=total_other_deduction,
            )

            # Payment method resolution from employee profile
            pay_method = PaymentMethodEnum.BANK_TRANSFER
            bank_acc = getattr(emp, "bank_account_no", None)
            if not bank_acc and getattr(emp, "mobile_financial_service", None):
                pay_method = PaymentMethodEnum.MOBILE_BANKING
                bank_acc = getattr(emp, "mobile_financial_service", None)
            elif not bank_acc:
                pay_method = PaymentMethodEnum.CASH

            existing = self.repository.get_by_period_employee(
                db, period_id=period.id, employee_id=emp.id
            )

            if existing:
                existing.working_days = working_days
                existing.present_days = int(present_days)
                existing.absent_days = absent_days
                existing.leave_days = leave_days
                existing.holiday_days = emp_holiday_days
                existing.overtime_hours = overtime_hours
                existing.basic_salary = basic_salary
                existing.house_rent = house_rent
                existing.medical_allowance = medical_allowance
                existing.transport_allowance = transport_allowance
                existing.food_allowance = food_allowance
                existing.other_allowance = total_other_allowance
                existing.overtime_pay = overtime_pay
                existing.bonus = bonus_amount
                existing.tax = tax
                existing.provident_fund = provident_fund
                existing.unpaid_leave_deduction = total_unpaid_leave_deduction
                existing.loan_installment = loan_installment
                existing.other_deduction = total_other_deduction
                existing.gross_salary = gross
                existing.total_deduction = deductions
                existing.net_salary = net
                existing.payment_method = pay_method
                existing.bank_account = bank_acc

                # Reconcile EMI
                if due_emi:
                    due_emi.payroll_record_id = existing.id
                    due_emi.status = EMIStatusEnum.DEDUCTED
                    due_emi.paid_at = now_bd()
                    if hasattr(due_emi, "loan") and due_emi.loan:
                        due_emi.loan.remaining_balance = max(
                            0.0, float(due_emi.loan.remaining_balance or 0.0) - loan_installment
                        )

                # Reconcile adjustments
                for adj in adjustments:
                    adj.status = AdjustmentStatusEnum.APPLIED
                    adj.applied_payroll_record_id = existing.id

                db.commit()
                db.refresh(existing)
                generated_records.append(existing)
            else:
                record_data = PayrollRecordCreate(
                    business_id=period.business_id,
                    period_id=period.id,
                    employee_id=emp.id,
                    working_days=working_days,
                    present_days=int(present_days),
                    absent_days=absent_days,
                    leave_days=leave_days,
                    holiday_days=emp_holiday_days,
                    overtime_hours=overtime_hours,
                    basic_salary=basic_salary,
                    house_rent=house_rent,
                    transport_allowance=transport_allowance,
                    medical_allowance=medical_allowance,
                    food_allowance=food_allowance,
                    other_allowance=total_other_allowance,
                    overtime_pay=overtime_pay,
                    bonus=bonus_amount,
                    tax=tax,
                    provident_fund=provident_fund,
                    unpaid_leave_deduction=total_unpaid_leave_deduction,
                    loan_installment=loan_installment,
                    other_deduction=total_other_deduction,
                    payment_method=pay_method,
                    bank_account=bank_acc,
                    is_paid=False,
                    is_held=False,
                    note=f"Auto-generated salary for {period.name}",
                )
                new_rec = self.repository.create(
                    db,
                    data=record_data,
                    gross_salary=gross,
                    total_deduction=deductions,
                    net_salary=net,
                )

                # Reconcile EMI
                if due_emi:
                    due_emi.payroll_record_id = new_rec.id
                    due_emi.status = EMIStatusEnum.DEDUCTED
                    due_emi.paid_at = now_bd()
                    if hasattr(due_emi, "loan") and due_emi.loan:
                        due_emi.loan.remaining_balance = max(
                            0.0, float(due_emi.loan.remaining_balance or 0.0) - loan_installment
                        )

                # Reconcile adjustments
                for adj in adjustments:
                    adj.status = AdjustmentStatusEnum.APPLIED
                    adj.applied_payroll_record_id = new_rec.id

                db.commit()
                generated_records.append(new_rec)

        return generated_records

    # ============================================================
    # Bank Advice & Disbursement Export Generators
    # ============================================================
    def generate_bank_advice_excel(
        self,
        db: Session,
        period_id: uuid.UUID,
        bank_account_id: uuid.UUID | None = None,
        business_id: int | None = None,
    ) -> bytes:
        """
        Corporate Bank Advice Excel (BEFTN format).
        Filters out records with is_held == True!
        """
        period = self.period_repository.get_by_id(db, period_id)
        if not period:
            raise HTTPException(status_code=404, detail="Payroll period not found")
        b_id = business_id or period.business_id

        company_bank = None
        if bank_account_id:
            company_bank = self.bank_account_repository.get_by_id(db, bank_account_id)
        if not company_bank:
            company_bank = self.bank_account_repository.get_default(db, b_id)

        records = self.repository.get_all(db, business_id=b_id, period_id=period_id, limit=2000)
        # Exclude held records and non-bank payment
        payable_records = [
            r for r in records if not r.is_held and r.payment_method == PaymentMethodEnum.BANK_TRANSFER
        ]
        employees = {e.id: e for e in self.employee_repository.get_all(db, business_id=b_id, limit=2000)}

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Bank Advice - BEFTN"

        # Corporate Header
        ws.append(["CORPORATE SALARY DISBURSEMENT ADVICE (BEFTN / EFT)"])
        ws.append([f"Payroll Period: {period.name} | Dates: {period.start_date} to {period.end_date}"])
        if company_bank:
            ws.append([
                f"Debit From: {company_bank.account_title} | Bank: {company_bank.bank_name} ({company_bank.branch_name}) | A/C: {company_bank.account_number} | Routing: {company_bank.routing_number}"
            ])
        else:
            ws.append(["Debit From: Corporate Main Payroll Account"])
        ws.append([])  # Blank spacer

        headers = [
            "Sl.",
            "Employee ID",
            "Beneficiary Name",
            "Bank Name",
            "Branch Name",
            "Routing Number",
            "Account Number",
            "Net Amount (BDT)",
            "Narration / Remarks",
        ]
        ws.append(headers)

        total_net = 0.0
        for idx, r in enumerate(payable_records, start=1):
            emp = employees.get(r.employee_id)
            emp_code = emp.employee_id if emp else ""
            emp_name = emp.full_name if emp else ""
            b_name = emp.bank_name if emp and emp.bank_name else "N/A"
            branch = emp.bank_branch if emp and emp.bank_branch else "N/A"
            routing = emp.bank_routing_number if emp and emp.bank_routing_number else ""
            acc_no = r.bank_account or (emp.bank_account_no if emp else "")
            amount = float(r.net_salary or 0.0)
            total_net += amount

            ws.append([
                idx,
                emp_code,
                emp_name,
                b_name,
                branch,
                routing,
                acc_no,
                amount,
                f"Salary {period.name}",
            ])

        # Summary Row
        ws.append([])
        ws.append(["", "", "", "", "", "", "TOTAL DISBURSEMENT:", total_net, f"{len(payable_records)} Employees"])

        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 14)

        output = BytesIO()
        wb.save(output)
        return output.getvalue()

    def generate_mfs_advice_excel(
        self,
        db: Session,
        period_id: uuid.UUID,
        mfs_provider: str = "bkash",
        business_id: int | None = None,
    ) -> bytes:
        """Mobile Financial Services (bKash / Nagad Corporate Bulk format)."""
        period = self.period_repository.get_by_id(db, period_id)
        if not period:
            raise HTTPException(status_code=404, detail="Payroll period not found")
        b_id = business_id or period.business_id

        records = self.repository.get_all(db, business_id=b_id, period_id=period_id, limit=2000)
        payable_records = [
            r for r in records if not r.is_held and r.payment_method == PaymentMethodEnum.MOBILE_BANKING
        ]
        employees = {e.id: e for e in self.employee_repository.get_all(db, business_id=b_id, limit=2000)}

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = f"MFS Advice ({mfs_provider.upper()})"

        headers = ["Sl.", "Employee ID", "Wallet Mobile Number", "Receiver Name", "Amount (BDT)", "Reference"]
        ws.append(headers)

        for idx, r in enumerate(payable_records, start=1):
            emp = employees.get(r.employee_id)
            emp_code = emp.employee_id if emp else ""
            emp_name = emp.full_name if emp else ""
            mobile_num = r.bank_account or (emp.mobile_financial_service if emp else "")
            amount = float(r.net_salary or 0.0)

            ws.append([idx, emp_code, mobile_num, emp_name, amount, f"SAL-{period.name[:10]}"])

        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 14)

        output = BytesIO()
        wb.save(output)
        return output.getvalue()

    def toggle_record_hold(
        self,
        db: Session,
        record_id: uuid.UUID,
        is_held: bool,
        hold_reason: str | None = None,
        current_user: Any | None = None,
    ) -> PayrollRecord:
        record = self.get_record(db, record_id, current_user=current_user)
        from app.common.timezone import now_bd

        record.is_held = is_held
        record.hold_reason = hold_reason if is_held else None
        record.hold_released_at = None if is_held else now_bd()
        db.commit()
        db.refresh(record)
        return record


class PayrollSettingsService:
    def __init__(self, repository: PayrollSettingsRepository | None = None):
        self.repository = repository or PayrollSettingsRepository()

    def get_settings(
        self, db: Session, business_id: int, current_user: Any | None = None
    ) -> PayrollSettings:
        resolved_business_id = resolve_business_id(current_user, business_id) if current_user else business_id
        if not resolved_business_id or resolved_business_id <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Business profile ID is mandatory.",
            )
        settings_obj = self.repository.get_by_business_id(db, resolved_business_id)
        if not settings_obj:
            settings_obj = self.repository.create(db, business_id=resolved_business_id)
        if current_user is not None:
            verify_record_ownership(settings_obj, current_user, detail="Payroll settings not found")
        return settings_obj

    def update_settings(
        self,
        db: Session,
        business_id: int,
        data: PayrollSettingsUpdate,
        current_user: Any | None = None,
    ) -> PayrollSettings:
        resolved_business_id = resolve_business_id(current_user, business_id) if current_user else business_id
        if not resolved_business_id or resolved_business_id <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Business profile ID is mandatory.",
            )
        settings_obj = self.repository.get_by_business_id(db, resolved_business_id)
        if not settings_obj:
            settings_obj = self.repository.create(
                db, business_id=resolved_business_id, data=data
            )
        else:
            if current_user is not None:
                verify_record_ownership(settings_obj, current_user, detail="Payroll settings not found")
            settings_obj = self.repository.update(db, settings_obj, data)
        return settings_obj

    def generate_export_excel(self, db: Session, business_id: int | None = None) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Payroll Settings"

        headers = [
            "Settings ID",
            "Business Profile ID",
            "Business Profile Name",
            "Standard Hours Per Day",
            "Include Attendance",
            "Include Overtime",
            "Include Leave",
            "Include Holidays",
            "Deduct Absent Days",
        ]
        ws.append(headers)

        biz_repo = BusinessRepository()
        businesses = biz_repo.get_all(db, skip=0, limit=1000)
        target_businesses = [b for b in businesses if business_id is None or b.id == business_id]

        for b in target_businesses:
            st = self.get_settings(db, business_id=b.id)
            ws.append([
                str(st.id),
                str(b.id),
                b.name_en or "",
                float(st.standard_hours_per_day or 9.0),
                "Yes" if st.include_attendance else "No",
                "Yes" if st.include_overtime else "No",
                "Yes" if st.include_leave else "No",
                "Yes" if st.include_holidays else "No",
                "Yes" if st.deduct_absent_days else "No",
            ])

        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

        output = BytesIO()
        wb.save(output)
        return output.getvalue()


# ============================================================

# Additional Payroll Feature Services
# ============================================================
from app.modules.hr_payroll.payroll.models import (
    BonusPolicy,
    BonusRun,
    CompanyBankAccount,
    LoanRepaymentSchedule,
    PayscaleStep,
    PayrollPeriodApproval,
    SalaryAdjustment,
    StatutoryComplianceSetting,
    TaxSlab,
)
from app.modules.hr_payroll.payroll.repository import (
    BonusPolicyRepository,
    BonusRunRepository,
    CompanyBankAccountRepository,
    LoanRepaymentScheduleRepository,
    PayscaleStepRepository,
    PayrollPeriodApprovalRepository,
    SalaryAdjustmentRepository,
    StatutoryComplianceRepository,
    TaxSlabRepository,
)
from app.modules.hr_payroll.payroll.schemas import (
    BonusPolicyCreate,
    BonusPolicyUpdate,
    BonusRunCreate,
    CompanyBankAccountCreate,
    CompanyBankAccountUpdate,
    LoanRepaymentScheduleCreate,
    LoanRepaymentScheduleUpdate,
    PayscaleStepCreate,
    PayscaleStepUpdate,
    PayrollPeriodApprovalCreate,
    SalaryAdjustmentCreate,
    SalaryAdjustmentUpdate,
    StatutoryComplianceSettingCreate,
    StatutoryComplianceSettingUpdate,
    TaxSlabCreate,
    TaxSlabUpdate,
)


class PayscaleStepService:
    def __init__(self, repository: PayscaleStepRepository | None = None):
        self.repository = repository or PayscaleStepRepository()

    def get_steps_by_grade(
        self, db: Session, salary_grade_id: uuid.UUID, business_id: int | None = None
    ) -> list[PayscaleStep]:
        return self.repository.get_by_grade(db, salary_grade_id, business_id=business_id)

    def create_step(self, db: Session, data: PayscaleStepCreate) -> PayscaleStep:
        return self.repository.create(db, data)

    def update_step(
        self, db: Session, step_id: uuid.UUID, data: PayscaleStepUpdate
    ) -> PayscaleStep:
        step = self.repository.get_by_id(db, step_id)
        if not step:
            raise HTTPException(status_code=404, detail="Payscale step not found")
        return self.repository.update(db, step, data)

    def delete_step(self, db: Session, step_id: uuid.UUID) -> None:
        step = self.repository.get_by_id(db, step_id)
        if not step:
            raise HTTPException(status_code=404, detail="Payscale step not found")
        self.repository.delete(db, step)


class CompanyBankAccountService:
    def __init__(self, repository: CompanyBankAccountRepository | None = None):
        self.repository = repository or CompanyBankAccountRepository()

    def get_accounts(
        self, db: Session, business_id: int, is_active: bool | None = None
    ) -> list[CompanyBankAccount]:
        return self.repository.get_all(db, business_id, is_active=is_active)

    def create_account(
        self, db: Session, data: CompanyBankAccountCreate
    ) -> CompanyBankAccount:
        return self.repository.create(db, data)

    def update_account(
        self, db: Session, account_id: uuid.UUID, data: CompanyBankAccountUpdate
    ) -> CompanyBankAccount:
        acc = self.repository.get_by_id(db, account_id)
        if not acc:
            raise HTTPException(status_code=404, detail="Bank account not found")
        return self.repository.update(db, acc, data)

    def delete_account(self, db: Session, account_id: uuid.UUID) -> None:
        acc = self.repository.get_by_id(db, account_id)
        if not acc:
            raise HTTPException(status_code=404, detail="Bank account not found")
        self.repository.delete(db, acc)


class TaxSlabService:
    def __init__(self, repository: TaxSlabRepository | None = None):
        self.repository = repository or TaxSlabRepository()

    def get_slabs(
        self, db: Session, business_id: int, fiscal_year: str | None = None
    ) -> list[TaxSlab]:
        return self.repository.get_all(db, business_id, fiscal_year=fiscal_year)

    def create_slab(self, db: Session, data: TaxSlabCreate) -> TaxSlab:
        return self.repository.create(db, data)

    def update_slab(
        self, db: Session, slab_id: uuid.UUID, data: TaxSlabUpdate
    ) -> TaxSlab:
        slab = self.repository.get_by_id(db, slab_id)
        if not slab:
            raise HTTPException(status_code=404, detail="Tax slab not found")
        return self.repository.update(db, slab, data)

    def delete_slab(self, db: Session, slab_id: uuid.UUID) -> None:
        slab = self.repository.get_by_id(db, slab_id)
        if not slab:
            raise HTTPException(status_code=404, detail="Tax slab not found")
        self.repository.delete(db, slab)


class StatutoryComplianceService:
    def __init__(self, repository: StatutoryComplianceRepository | None = None):
        self.repository = repository or StatutoryComplianceRepository()

    def get_setting(
        self, db: Session, business_id: int
    ) -> StatutoryComplianceSetting:
        setting = self.repository.get_by_business_id(db, business_id)
        if not setting:
            setting = self.repository.create(
                db, StatutoryComplianceSettingCreate(business_id=business_id)
            )
        return setting

    def update_setting(
        self, db: Session, business_id: int, data: StatutoryComplianceSettingUpdate
    ) -> StatutoryComplianceSetting:
        setting = self.get_setting(db, business_id)
        return self.repository.update(db, setting, data)


class SalaryAdjustmentService:
    def __init__(self, repository: SalaryAdjustmentRepository | None = None):
        self.repository = repository or SalaryAdjustmentRepository()

    def get_adjustments(
        self,
        db: Session,
        business_id: int,
        period_id: uuid.UUID | None = None,
        employee_id: uuid.UUID | None = None,
        status: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[SalaryAdjustment]:
        return self.repository.get_all(
            db,
            business_id=business_id,
            period_id=period_id,
            employee_id=employee_id,
            status=status,
            skip=skip,
            limit=limit,
        )

    def create_adjustment(
        self, db: Session, data: SalaryAdjustmentCreate
    ) -> SalaryAdjustment:
        return self.repository.create(db, data)

    def update_adjustment(
        self, db: Session, adjustment_id: uuid.UUID, data: SalaryAdjustmentUpdate
    ) -> SalaryAdjustment:
        adj = self.repository.get_by_id(db, adjustment_id)
        if not adj:
            raise HTTPException(status_code=404, detail="Salary adjustment not found")
        return self.repository.update(db, adj, data)

    def delete_adjustment(self, db: Session, adjustment_id: uuid.UUID) -> None:
        adj = self.repository.get_by_id(db, adjustment_id)
        if not adj:
            raise HTTPException(status_code=404, detail="Salary adjustment not found")
        self.repository.delete(db, adj)


class LoanRepaymentScheduleService:
    def __init__(self, repository: LoanRepaymentScheduleRepository | None = None):
        self.repository = repository or LoanRepaymentScheduleRepository()

    def get_schedules_by_loan(
        self, db: Session, loan_id: uuid.UUID
    ) -> list[LoanRepaymentSchedule]:
        return self.repository.get_by_loan(db, loan_id)

    def update_schedule(
        self, db: Session, schedule_id: uuid.UUID, data: LoanRepaymentScheduleUpdate
    ) -> LoanRepaymentSchedule:
        sch = self.repository.get_by_id(db, schedule_id)
        if not sch:
            raise HTTPException(status_code=404, detail="Loan repayment schedule not found")
        return self.repository.update(db, sch, data)


class BonusPolicyService:
    def __init__(self, repository: BonusPolicyRepository | None = None):
        self.repository = repository or BonusPolicyRepository()

    def get_policies(
        self, db: Session, business_id: int, is_active: bool | None = None
    ) -> list[BonusPolicy]:
        return self.repository.get_all(db, business_id=business_id, is_active=is_active)

    def create_policy(self, db: Session, data: BonusPolicyCreate) -> BonusPolicy:
        return self.repository.create(db, data)

    def update_policy(
        self, db: Session, policy_id: uuid.UUID, data: BonusPolicyUpdate
    ) -> BonusPolicy:
        pol = self.repository.get_by_id(db, policy_id)
        if not pol:
            raise HTTPException(status_code=404, detail="Bonus policy not found")
        return self.repository.update(db, pol, data)

    def delete_policy(self, db: Session, policy_id: uuid.UUID) -> None:
        pol = self.repository.get_by_id(db, policy_id)
        if not pol:
            raise HTTPException(status_code=404, detail="Bonus policy not found")
        self.repository.delete(db, pol)


class BonusRunService:
    def __init__(self, repository: BonusRunRepository | None = None):
        self.repository = repository or BonusRunRepository()

    def get_runs(
        self, db: Session, business_id: int, period_id: uuid.UUID | None = None
    ) -> list[BonusRun]:
        return self.repository.get_all(db, business_id=business_id, period_id=period_id)

    def create_run(
        self, db: Session, data: BonusRunCreate, total_amount: float = 0.0, headcount: int = 0
    ) -> BonusRun:
        return self.repository.create(db, data, total_amount=total_amount, headcount=headcount)

    def update_run_status(self, db: Session, run_id: uuid.UUID, status: str) -> BonusRun:
        run = self.repository.get_by_id(db, run_id)
        if not run:
            raise HTTPException(status_code=404, detail="Bonus run not found")
        return self.repository.update_status(db, run, status)


class PayrollPeriodApprovalService:
    def __init__(self, repository: PayrollPeriodApprovalRepository | None = None):
        self.repository = repository or PayrollPeriodApprovalRepository()

    def get_approvals(
        self, db: Session, period_id: uuid.UUID
    ) -> list[PayrollPeriodApproval]:
        return self.repository.get_by_period(db, period_id)

    def submit_approval(
        self, db: Session, data: PayrollPeriodApprovalCreate, action_by_id: int
    ) -> PayrollPeriodApproval:
        return self.repository.create(db, data, action_by_id=action_by_id)
