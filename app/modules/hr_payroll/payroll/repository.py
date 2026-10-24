import uuid

from sqlalchemy.orm import Session

from app.modules.hr_payroll.payroll.models import (
    Holiday,
    HolidayTypeEnum,
    PayrollPeriod,
    PayrollPeriodStatusEnum,
    PayrollRecord,
    PayrollSettings,
)
from app.modules.hr_payroll.payroll.schemas import (
    HolidayCreate,
    HolidayUpdate,
    PayrollPeriodCreate,
    PayrollPeriodUpdate,
    PayrollRecordCreate,
    PayrollRecordUpdate,
    PayrollSettingsUpdate,
)


class HolidayRepository:
    def get_by_id(self, db: Session, holiday_uuid: uuid.UUID) -> Holiday | None:
        return db.query(Holiday).filter(Holiday.id == holiday_uuid).first()

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        holiday_type: str | HolidayTypeEnum | None = None,
    ) -> list[Holiday]:
        query = db.query(Holiday)
        if business_id is not None:
            query = query.filter(Holiday.business_id == business_id)
        if holiday_type is not None:
            query = query.filter(Holiday.holiday_type == holiday_type)
        return query.offset(skip).limit(limit).all()

    def create(self, db: Session, data: HolidayCreate) -> Holiday:
        holiday_data = data.model_dump()
        holiday = Holiday(**holiday_data)
        db.add(holiday)
        db.commit()
        db.refresh(holiday)
        return holiday

    def update(self, db: Session, holiday: Holiday, data: HolidayUpdate) -> Holiday:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(holiday, field, value)

        db.commit()
        db.refresh(holiday)
        return holiday

    def delete(self, db: Session, holiday: Holiday) -> None:
        db.delete(holiday)
        db.commit()


class PayrollPeriodRepository:
    def get_by_id(self, db: Session, period_uuid: uuid.UUID) -> PayrollPeriod | None:
        return db.query(PayrollPeriod).filter(PayrollPeriod.id == period_uuid).first()

    def get_by_name(
        self, db: Session, name: str, business_id: int
    ) -> PayrollPeriod | None:
        return (
            db.query(PayrollPeriod)
            .filter(
                PayrollPeriod.name == name,
                PayrollPeriod.business_id == business_id,
            )
            .first()
        )

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        status: str | PayrollPeriodStatusEnum | None = None,
    ) -> list[PayrollPeriod]:
        query = db.query(PayrollPeriod)
        if business_id is not None:
            query = query.filter(PayrollPeriod.business_id == business_id)
        if status is not None:
            query = query.filter(PayrollPeriod.status == status)
        return query.offset(skip).limit(limit).all()

    def create(self, db: Session, data: PayrollPeriodCreate) -> PayrollPeriod:
        period_data = data.model_dump()
        period = PayrollPeriod(**period_data)
        db.add(period)
        db.commit()
        db.refresh(period)
        return period

    def update(
        self, db: Session, period: PayrollPeriod, data: PayrollPeriodUpdate
    ) -> PayrollPeriod:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(period, field, value)

        db.commit()
        db.refresh(period)
        return period

    def delete(self, db: Session, period: PayrollPeriod) -> None:
        db.delete(period)
        db.commit()


class PayrollRecordRepository:
    def get_by_id(self, db: Session, record_uuid: uuid.UUID) -> PayrollRecord | None:
        return db.query(PayrollRecord).filter(PayrollRecord.id == record_uuid).first()

    def get_by_period_employee(
        self, db: Session, period_id: uuid.UUID, employee_id: uuid.UUID
    ) -> PayrollRecord | None:
        return (
            db.query(PayrollRecord)
            .filter(
                PayrollRecord.period_id == period_id,
                PayrollRecord.employee_id == employee_id,
            )
            .first()
        )

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        period_id: uuid.UUID | None = None,
        employee_id: uuid.UUID | None = None,
        is_paid: bool | None = None,
    ) -> list[PayrollRecord]:
        query = db.query(PayrollRecord)
        if business_id is not None:
            query = query.filter(PayrollRecord.business_id == business_id)
        if period_id is not None:
            query = query.filter(PayrollRecord.period_id == period_id)
        if employee_id is not None:
            query = query.filter(PayrollRecord.employee_id == employee_id)
        if is_paid is not None:
            query = query.filter(PayrollRecord.is_paid == is_paid)
        return query.offset(skip).limit(limit).all()

    def create(
        self,
        db: Session,
        data: PayrollRecordCreate,
        gross_salary: float,
        total_deduction: float,
        net_salary: float,
    ) -> PayrollRecord:
        record_data = data.model_dump()
        record_data["gross_salary"] = gross_salary
        record_data["total_deduction"] = total_deduction
        record_data["net_salary"] = net_salary
        record = PayrollRecord(**record_data)
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    def update(
        self,
        db: Session,
        record: PayrollRecord,
        data: PayrollRecordUpdate,
        gross_salary: float,
        total_deduction: float,
        net_salary: float,
    ) -> PayrollRecord:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(record, field, value)

        record.gross_salary = gross_salary
        record.total_deduction = total_deduction
        record.net_salary = net_salary

        db.commit()
        db.refresh(record)
        return record

    def delete(self, db: Session, record: PayrollRecord) -> None:
        db.delete(record)
        db.commit()


class PayrollSettingsRepository:
    def get_by_business_id(
        self, db: Session, business_id: int
    ) -> PayrollSettings | None:
        return (
            db.query(PayrollSettings)
            .filter(PayrollSettings.business_id == business_id)
            .first()
        )

    def create(
        self, db: Session, business_id: int, data: PayrollSettingsUpdate | None = None
    ) -> PayrollSettings:
        init_data = {"business_id": business_id}
        if data:
            dump = data.model_dump(exclude_unset=True)
            init_data.update(dump)
        settings_obj = PayrollSettings(**init_data)
        db.add(settings_obj)
        db.commit()
        db.refresh(settings_obj)
        return settings_obj

    def update(
        self, db: Session, settings_obj: PayrollSettings, data: PayrollSettingsUpdate
    ) -> PayrollSettings:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(settings_obj, field, value)

        db.commit()
        db.refresh(settings_obj)
        return settings_obj


# ============================================================
# PayscaleStepRepository
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


class PayscaleStepRepository:
    def get_by_id(self, db: Session, step_id: uuid.UUID) -> PayscaleStep | None:
        return db.query(PayscaleStep).filter(PayscaleStep.id == step_id).first()

    def get_by_grade(
        self, db: Session, salary_grade_id: uuid.UUID, business_id: int | None = None
    ) -> list[PayscaleStep]:
        query = db.query(PayscaleStep).filter(PayscaleStep.salary_grade_id == salary_grade_id)
        if business_id is not None:
            query = query.filter(PayscaleStep.business_id == business_id)
        return query.order_by(PayscaleStep.step_number.asc()).all()

    def create(self, db: Session, data: PayscaleStepCreate) -> PayscaleStep:
        step = PayscaleStep(**data.model_dump())
        db.add(step)
        db.commit()
        db.refresh(step)
        return step

    def update(
        self, db: Session, step: PayscaleStep, data: PayscaleStepUpdate
    ) -> PayscaleStep:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(step, field, value)
        db.commit()
        db.refresh(step)
        return step

    def delete(self, db: Session, step: PayscaleStep) -> None:
        db.delete(step)
        db.commit()


# ============================================================
# CompanyBankAccountRepository
# ============================================================
class CompanyBankAccountRepository:
    def get_by_id(self, db: Session, account_id: uuid.UUID) -> CompanyBankAccount | None:
        return db.query(CompanyBankAccount).filter(CompanyBankAccount.id == account_id).first()

    def get_all(
        self, db: Session, business_id: int, is_active: bool | None = None
    ) -> list[CompanyBankAccount]:
        query = db.query(CompanyBankAccount).filter(CompanyBankAccount.business_id == business_id)
        if is_active is not None:
            query = query.filter(CompanyBankAccount.is_active == is_active)
        return query.order_by(CompanyBankAccount.is_default.desc(), CompanyBankAccount.bank_name.asc()).all()

    def get_default(self, db: Session, business_id: int) -> CompanyBankAccount | None:
        return db.query(CompanyBankAccount).filter(
            CompanyBankAccount.business_id == business_id,
            CompanyBankAccount.is_default.is_(True),
            CompanyBankAccount.is_active.is_(True),
        ).first()

    def create(self, db: Session, data: CompanyBankAccountCreate) -> CompanyBankAccount:
        if data.is_default:
            # Demote others
            db.query(CompanyBankAccount).filter(
                CompanyBankAccount.business_id == data.business_id
            ).update({"is_default": False})
        account = CompanyBankAccount(**data.model_dump())
        db.add(account)
        db.commit()
        db.refresh(account)
        return account

    def update(
        self, db: Session, account: CompanyBankAccount, data: CompanyBankAccountUpdate
    ) -> CompanyBankAccount:
        update_data = data.model_dump(exclude_unset=True)
        if update_data.get("is_default"):
            db.query(CompanyBankAccount).filter(
                CompanyBankAccount.business_id == account.business_id,
                CompanyBankAccount.id != account.id,
            ).update({"is_default": False})
        for field, value in update_data.items():
            setattr(account, field, value)
        db.commit()
        db.refresh(account)
        return account

    def delete(self, db: Session, account: CompanyBankAccount) -> None:
        db.delete(account)
        db.commit()


# ============================================================
# TaxSlabRepository & StatutoryComplianceRepository
# ============================================================
class TaxSlabRepository:
    def get_by_id(self, db: Session, slab_id: uuid.UUID) -> TaxSlab | None:
        return db.query(TaxSlab).filter(TaxSlab.id == slab_id).first()

    def get_all(
        self, db: Session, business_id: int, fiscal_year: str | None = None
    ) -> list[TaxSlab]:
        query = db.query(TaxSlab).filter(TaxSlab.business_id == business_id)
        if fiscal_year:
            query = query.filter(TaxSlab.fiscal_year == fiscal_year)
        return query.order_by(TaxSlab.fiscal_year.desc(), TaxSlab.slab_order.asc()).all()

    def create(self, db: Session, data: TaxSlabCreate) -> TaxSlab:
        slab = TaxSlab(**data.model_dump())
        db.add(slab)
        db.commit()
        db.refresh(slab)
        return slab

    def update(self, db: Session, slab: TaxSlab, data: TaxSlabUpdate) -> TaxSlab:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(slab, field, value)
        db.commit()
        db.refresh(slab)
        return slab

    def delete(self, db: Session, slab: TaxSlab) -> None:
        db.delete(slab)
        db.commit()


class StatutoryComplianceRepository:
    def get_by_business_id(
        self, db: Session, business_id: int
    ) -> StatutoryComplianceSetting | None:
        return (
            db.query(StatutoryComplianceSetting)
            .filter(StatutoryComplianceSetting.business_id == business_id)
            .first()
        )

    def create(
        self, db: Session, data: StatutoryComplianceSettingCreate
    ) -> StatutoryComplianceSetting:
        setting = StatutoryComplianceSetting(**data.model_dump())
        db.add(setting)
        db.commit()
        db.refresh(setting)
        return setting

    def update(
        self,
        db: Session,
        setting: StatutoryComplianceSetting,
        data: StatutoryComplianceSettingUpdate,
    ) -> StatutoryComplianceSetting:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(setting, field, value)
        db.commit()
        db.refresh(setting)
        return setting


# ============================================================
# SalaryAdjustmentRepository
# ============================================================
class SalaryAdjustmentRepository:
    def get_by_id(self, db: Session, adjustment_id: uuid.UUID) -> SalaryAdjustment | None:
        return db.query(SalaryAdjustment).filter(SalaryAdjustment.id == adjustment_id).first()

    def get_all(
        self,
        db: Session,
        business_id: int,
        period_id: uuid.UUID | None = None,
        employee_id: uuid.UUID | None = None,
        status: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[SalaryAdjustment]:
        query = db.query(SalaryAdjustment).filter(SalaryAdjustment.business_id == business_id)
        if period_id:
            query = query.filter(SalaryAdjustment.period_id == period_id)
        if employee_id:
            query = query.filter(SalaryAdjustment.employee_id == employee_id)
        if status:
            query = query.filter(SalaryAdjustment.status == status)
        return query.order_by(SalaryAdjustment.created_at.desc()).offset(skip).limit(limit).all()

    def create(self, db: Session, data: SalaryAdjustmentCreate) -> SalaryAdjustment:
        adj = SalaryAdjustment(**data.model_dump())
        db.add(adj)
        db.commit()
        db.refresh(adj)
        return adj

    def update(
        self, db: Session, adj: SalaryAdjustment, data: SalaryAdjustmentUpdate
    ) -> SalaryAdjustment:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(adj, field, value)
        db.commit()
        db.refresh(adj)
        return adj

    def delete(self, db: Session, adj: SalaryAdjustment) -> None:
        db.delete(adj)
        db.commit()


# ============================================================
# LoanRepaymentScheduleRepository
# ============================================================
class LoanRepaymentScheduleRepository:
    def get_by_id(self, db: Session, schedule_id: uuid.UUID) -> LoanRepaymentSchedule | None:
        return db.query(LoanRepaymentSchedule).filter(LoanRepaymentSchedule.id == schedule_id).first()

    def get_by_loan(
        self, db: Session, loan_id: uuid.UUID
    ) -> list[LoanRepaymentSchedule]:
        return (
            db.query(LoanRepaymentSchedule)
            .filter(LoanRepaymentSchedule.loan_id == loan_id)
            .order_by(LoanRepaymentSchedule.installment_number.asc())
            .all()
        )

    def get_due_for_period(
        self, db: Session, business_id: int, employee_id: uuid.UUID, start_date, end_date
    ) -> LoanRepaymentSchedule | None:
        from app.modules.hr_payroll.portal.models import EmployeeLoan
        from app.modules.hr_payroll.payroll.models import EMIStatusEnum

        return (
            db.query(LoanRepaymentSchedule)
            .join(EmployeeLoan, LoanRepaymentSchedule.loan_id == EmployeeLoan.id)
            .filter(
                LoanRepaymentSchedule.business_id == business_id,
                EmployeeLoan.employee_id == employee_id,
                LoanRepaymentSchedule.due_date >= start_date,
                LoanRepaymentSchedule.due_date <= end_date,
                LoanRepaymentSchedule.status == EMIStatusEnum.PENDING,
            )
            .first()
        )

    def create(
        self, db: Session, data: LoanRepaymentScheduleCreate
    ) -> LoanRepaymentSchedule:
        schedule = LoanRepaymentSchedule(**data.model_dump())
        db.add(schedule)
        db.commit()
        db.refresh(schedule)
        return schedule

    def update(
        self, db: Session, schedule: LoanRepaymentSchedule, data: LoanRepaymentScheduleUpdate
    ) -> LoanRepaymentSchedule:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(schedule, field, value)
        db.commit()
        db.refresh(schedule)
        return schedule

    def delete(self, db: Session, schedule: LoanRepaymentSchedule) -> None:
        db.delete(schedule)
        db.commit()


# ============================================================
# BonusPolicyRepository & BonusRunRepository
# ============================================================
class BonusPolicyRepository:
    def get_by_id(self, db: Session, policy_id: uuid.UUID) -> BonusPolicy | None:
        return db.query(BonusPolicy).filter(BonusPolicy.id == policy_id).first()

    def get_all(
        self, db: Session, business_id: int, is_active: bool | None = None
    ) -> list[BonusPolicy]:
        query = db.query(BonusPolicy).filter(BonusPolicy.business_id == business_id)
        if is_active is not None:
            query = query.filter(BonusPolicy.is_active == is_active)
        return query.order_by(BonusPolicy.name.asc()).all()

    def create(self, db: Session, data: BonusPolicyCreate) -> BonusPolicy:
        policy = BonusPolicy(**data.model_dump())
        db.add(policy)
        db.commit()
        db.refresh(policy)
        return policy

    def update(
        self, db: Session, policy: BonusPolicy, data: BonusPolicyUpdate
    ) -> BonusPolicy:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(policy, field, value)
        db.commit()
        db.refresh(policy)
        return policy

    def delete(self, db: Session, policy: BonusPolicy) -> None:
        db.delete(policy)
        db.commit()


class BonusRunRepository:
    def get_by_id(self, db: Session, run_id: uuid.UUID) -> BonusRun | None:
        return db.query(BonusRun).filter(BonusRun.id == run_id).first()

    def get_all(
        self, db: Session, business_id: int, period_id: uuid.UUID | None = None
    ) -> list[BonusRun]:
        query = db.query(BonusRun).filter(BonusRun.business_id == business_id)
        if period_id:
            query = query.filter(BonusRun.payroll_period_id == period_id)
        return query.order_by(BonusRun.run_date.desc()).all()

    def create(self, db: Session, data: BonusRunCreate, total_amount: float = 0.0, headcount: int = 0) -> BonusRun:
        run_data = data.model_dump()
        run_data["total_amount"] = total_amount
        run_data["headcount"] = headcount
        run = BonusRun(**run_data)
        db.add(run)
        db.commit()
        db.refresh(run)
        return run

    def update_status(self, db: Session, run: BonusRun, status: str) -> BonusRun:
        run.status = status
        db.commit()
        db.refresh(run)
        return run


# ============================================================
# PayrollPeriodApprovalRepository
# ============================================================
class PayrollPeriodApprovalRepository:
    def get_by_period(
        self, db: Session, period_id: uuid.UUID
    ) -> list[PayrollPeriodApproval]:
        return (
            db.query(PayrollPeriodApproval)
            .filter(PayrollPeriodApproval.period_id == period_id)
            .order_by(PayrollPeriodApproval.created_at.asc())
            .all()
        )

    def create(
        self, db: Session, data: PayrollPeriodApprovalCreate, action_by_id: int
    ) -> PayrollPeriodApproval:
        appr_data = data.model_dump()
        appr_data["action_by_id"] = action_by_id
        approval = PayrollPeriodApproval(**appr_data)
        db.add(approval)
        db.commit()
        db.refresh(approval)
        return approval

