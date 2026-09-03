import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.hr_payroll.employees.repository import EmployeeRepository
from app.modules.hr_payroll.payroll.models import (
    Holiday,
    HolidayTypeEnum,
    PayrollPeriod,
    PayrollPeriodStatusEnum,
    PayrollRecord,
)
from app.modules.hr_payroll.payroll.repository import (
    HolidayRepository,
    PayrollPeriodRepository,
    PayrollRecordRepository,
)
from app.modules.hr_payroll.payroll.schemas import (
    HolidayCreate,
    HolidayUpdate,
    PayrollPeriodCreate,
    PayrollPeriodUpdate,
    PayrollRecordCreate,
    PayrollRecordUpdate,
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

    def get_holiday(self, db: Session, holiday_uuid: uuid.UUID) -> Holiday:
        holiday = self.repository.get_by_id(db, holiday_uuid)
        if not holiday:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Holiday not found",
            )
        return holiday

    def create_holiday(self, db: Session, data: HolidayCreate) -> Holiday:
        if data.start_date > data.end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date cannot be after end date",
            )
        return self.repository.create(db, data)

    def update_holiday(
        self, db: Session, holiday_uuid: uuid.UUID, data: HolidayUpdate
    ) -> Holiday:
        holiday = self.get_holiday(db, holiday_uuid)
        start_date = data.start_date or holiday.start_date
        end_date = data.end_date or holiday.end_date
        if start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date cannot be after end date",
            )
        return self.repository.update(db, holiday, data)

    def delete_holiday(self, db: Session, holiday_uuid: uuid.UUID) -> None:
        holiday = self.get_holiday(db, holiday_uuid)
        self.repository.delete(db, holiday)


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

    def get_period(self, db: Session, period_uuid: uuid.UUID) -> PayrollPeriod:
        period = self.repository.get_by_id(db, period_uuid)
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
        self, db: Session, period_uuid: uuid.UUID, data: PayrollPeriodUpdate
    ) -> PayrollPeriod:
        period = self.get_period(db, period_uuid)

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

        start_date = data.start_date or period.start_date
        end_date = data.end_date or period.end_date
        if start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date cannot be after end date",
            )

        return self.repository.update(db, period, data)

    def delete_period(self, db: Session, period_uuid: uuid.UUID) -> None:
        period = self.get_period(db, period_uuid)
        if period.is_locked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete a locked or paid payroll period",
            )
        self.repository.delete(db, period)


class PayrollRecordService:
    def __init__(
        self,
        repository: PayrollRecordRepository | None = None,
        period_repository: PayrollPeriodRepository | None = None,
        employee_repository: EmployeeRepository | None = None,
    ):
        self.repository = repository or PayrollRecordRepository()
        self.period_repository = period_repository or PayrollPeriodRepository()
        self.employee_repository = employee_repository or EmployeeRepository()

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

    def get_record(self, db: Session, record_uuid: uuid.UUID) -> PayrollRecord:
        record = self.repository.get_by_id(db, record_uuid)
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
    ) -> PayrollRecord:
        record = self.get_record(db, record_uuid)

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

    def delete_record(self, db: Session, record_uuid: uuid.UUID) -> None:
        record = self.get_record(db, record_uuid)
        if record.period and record.period.is_locked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete a payslip in a locked or paid payroll period",
            )
        self.repository.delete(db, record)
