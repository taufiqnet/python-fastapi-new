import enum
import uuid

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID, Date
from sqlalchemy.types import Enum as SAEnum

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


# ============================================================
# holidays/
# ============================================================
class HolidayTypeEnum(str, enum.Enum):
    PUBLIC = "public"
    FESTIVAL = "festival"
    COMPANY = "company"
    WEEKEND = "weekend"


class Holiday(Base, UUIDMixin, TimestampMixin):
    """Company holiday calendar — feeds attendance/ status resolution."""

    __tablename__ = "holidays"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    holiday_type: Mapped[HolidayTypeEnum] = mapped_column(
        SAEnum(HolidayTypeEnum, name="holiday_type"),
        nullable=False,
    )
    start_date: Mapped["Date"] = mapped_column(Date, nullable=False)
    end_date: Mapped["Date"] = mapped_column(Date, nullable=False)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Holiday {self.name} ({self.start_date})>"


# ============================================================
# payroll_periods/
# ============================================================
class PayrollPeriodStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    PROCESSING = "processing"
    LOCKED = "locked"
    PAID = "paid"


class PayrollPeriod(Base, UUIDMixin, TimestampMixin):
    """The run/batch boundary payslips/ attach to — draft → processing → locked → paid."""

    __tablename__ = "payroll_periods"
    __table_args__ = (
        UniqueConstraint("business_id", "name", name="uq_payroll_period_business_name"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # e.g. "January 2025" / "2025-01"
    start_date: Mapped["Date"] = mapped_column(Date, nullable=False)
    end_date: Mapped["Date"] = mapped_column(Date, nullable=False)
    status: Mapped[PayrollPeriodStatusEnum] = mapped_column(
        SAEnum(PayrollPeriodStatusEnum, name="payroll_period_status"),
        default=PayrollPeriodStatusEnum.DRAFT,
        nullable=False,
    )
    payment_date: Mapped["Date | None"] = mapped_column(
        Date, nullable=True
    )  # actual bank disbursement date
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )
    records: Mapped[list["PayrollRecord"]] = relationship(
        "PayrollRecord",
        back_populates="period",
    )

    @property
    def is_locked(self) -> bool:
        return self.status in (
            PayrollPeriodStatusEnum.LOCKED,
            PayrollPeriodStatusEnum.PAID,
        )

    def __repr__(self) -> str:
        return f"<PayrollPeriod {self.name} [{self.status}]>"


# ============================================================
# payslips/
# ============================================================
class PaymentMethodEnum(str, enum.Enum):
    BANK_TRANSFER = "bank_transfer"
    CASH = "cash"
    MOBILE_BANKING = "mobile_banking"
    CHEQUE = "cheque"


class PayrollRecord(Base, UUIDMixin, TimestampMixin):
    """
    Individual payslip — one per employee per period. Stores every
    component so a PDF can be generated without recalculation. This is a
    computed snapshot from compensation/ (EmployeeSalary) + that period's
    attendance/, not a live reference to either.

    gross  = basic + house + transport + medical + food + other
             + overtime_pay + bonus
    deduct = tax + provident_fund + unpaid_leave_deduction
             + loan_installment + other_deduction
    net    = gross − deduct

    Note: gross_salary, total_deduction, and net_salary were auto-computed
    in the Django model's save(). Per this platform's convention, that
    computation belongs in hr_payroll/payslips/service.py::generate_payslip()
    — the model only stores the resulting figures, same pattern as
    EmployeeSalary in compensation/.
    """

    __tablename__ = "payroll_records"
    __table_args__ = (
        UniqueConstraint(
            "period_id", "employee_id", name="uq_payroll_record_period_employee"
        ),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    period_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payroll_periods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Attendance summary ─────────────────────────────────────────
    working_days: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    present_days: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    absent_days: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    leave_days: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    holiday_days: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    overtime_hours: Mapped[float] = mapped_column(
        Numeric(6, 2), default=0, nullable=False
    )

    # ── Earnings ─────────────────────────────────────────────────────
    basic_salary: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    house_rent: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    transport_allowance: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    medical_allowance: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    food_allowance: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    other_allowance: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    overtime_pay: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    bonus: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )  # festival/performance bonus
    gross_salary: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )  # written by service.py

    # ── Deductions ───────────────────────────────────────────────────
    tax: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )  # income tax withheld at source
    provident_fund: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    unpaid_leave_deduction: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    loan_installment: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    other_deduction: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    total_deduction: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )  # written by service.py

    # ── Net ───────────────────────────────────────────────────────────
    net_salary: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )  # written by service.py

    payment_method: Mapped[PaymentMethodEnum] = mapped_column(
        SAEnum(PaymentMethodEnum, name="payroll_record_payment_method"),
        default=PaymentMethodEnum.BANK_TRANSFER,
        nullable=False,
    )
    bank_account: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # account/mobile no. used for disbursement
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    paid_at: Mapped["DateTime | None"] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_held: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    hold_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hold_released_at: Mapped["DateTime | None"] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )
    period: Mapped["PayrollPeriod"] = relationship(
        "PayrollPeriod",
        back_populates="records",
        lazy="selectin",
    )
    employee: Mapped["Employee"] = relationship(  # noqa: F821
        "Employee",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        paid_label = "Paid" if self.is_paid else "Pending"
        return f"<PayrollRecord {self.period_id} | {self.employee_id} | net={self.net_salary} ({paid_label})>"


# ============================================================
# payroll_settings/
# ============================================================
class PayrollSettings(Base, UUIDMixin, TimestampMixin):
    """Per-business payroll configuration flags."""

    __tablename__ = "payroll_settings"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    include_attendance: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    include_leave: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    include_holidays: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    include_overtime: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deduct_absent_days: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    standard_hours_per_day: Mapped[float] = mapped_column(
        Numeric(4, 2), default=8.0, nullable=False
    )

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<PayrollSettings business_id={self.business_id}>"


# ============================================================
# Payscale Step Matrix (Payscale Setup)
# ============================================================
class PayscaleStep(Base, UUIDMixin, TimestampMixin):
    """
    Step-based pay matrix under a SalaryGrade.
    e.g. Step 1: Basic 20,000; Step 2: Basic 21,500; Step 3: Basic 23,000.
    """

    __tablename__ = "payscale_steps"
    __table_args__ = (
        UniqueConstraint("salary_grade_id", "step_number", name="uq_payscale_grade_step"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    salary_grade_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("salary_grades.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)  # 1, 2, 3...
    basic_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    increment_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )
    salary_grade: Mapped["SalaryGrade"] = relationship(  # noqa: F821
        "SalaryGrade",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<PayscaleStep Grade={self.salary_grade_id} Step={self.step_number} ({self.basic_amount})>"


# ============================================================
# Company Disbursement Bank Accounts
# ============================================================
class CompanyBankAccount(Base, UUIDMixin, TimestampMixin):
    """Business corporate bank accounts used for payroll disbursement."""

    __tablename__ = "company_bank_accounts"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    bank_name: Mapped[str] = mapped_column(String(100), nullable=False)
    branch_name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_title: Mapped[str] = mapped_column(String(150), nullable=False)
    account_number: Mapped[str] = mapped_column(String(50), nullable=False)
    routing_number: Mapped[str] = mapped_column(String(9), nullable=False)  # 9-digit BD routing code
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<CompanyBankAccount {self.bank_name} - {self.account_number}>"


# ============================================================
# Income Tax (AIT / ITA 2023) Slabs & Statutory Rules
# ============================================================
class GenderCategoryEnum(str, enum.Enum):
    GENERAL_MALE = "general_male"
    FEMALE_SENIOR = "female_senior"
    DISABLED_FREEDOM_FIGHTER = "disabled_freedom_fighter"


class TaxSlab(Base, UUIDMixin, TimestampMixin):
    """
    Income Tax Act 2023 progressive slabs per Bangladesh Fiscal Year.
    Slabs apply to annual taxable income exceeding statutory threshold.
    """

    __tablename__ = "tax_slabs"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    fiscal_year: Mapped[str] = mapped_column(String(20), nullable=False)  # e.g. "2025-2026"
    gender_category: Mapped[GenderCategoryEnum] = mapped_column(
        SAEnum(GenderCategoryEnum, name="tax_gender_category"),
        default=GenderCategoryEnum.GENERAL_MALE,
        nullable=False,
    )
    slab_order: Mapped[int] = mapped_column(Integer, nullable=False)
    min_income: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    max_income: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)  # None for top slab
    tax_rate_percent: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<TaxSlab {self.fiscal_year} #{self.slab_order} ({self.tax_rate_percent}%)>"


class StatutoryComplianceSetting(Base, UUIDMixin, TimestampMixin):
    """Provident Fund & Gratuity compliance rates per business."""

    __tablename__ = "statutory_compliance_settings"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    enable_provident_fund: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    pf_employee_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=8.33, nullable=False)
    pf_employer_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=8.33, nullable=False)
    enable_tax_auto_deduction: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    minimum_tax_amount: Mapped[float] = mapped_column(
        Numeric(10, 2), default=5000.0, nullable=False
    )  # Dhaka CC default
    gratuity_qualifying_years: Mapped[int] = mapped_column(Integer, default=5, nullable=False)

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<StatutoryComplianceSetting business_id={self.business_id}>"


# ============================================================
# Salary Adjustments (Arrears, Bonuses, Penalties)
# ============================================================
class AdjustmentTypeEnum(str, enum.Enum):
    ARREAR = "arrear"
    BONUS_SPECIAL = "bonus_special"
    INCENTIVE = "incentive"
    PENALTY_DEDUCTION = "penalty_deduction"
    DAMAGE_RECOVERY = "damage_recovery"
    ADVANCE_ADJUSTMENT = "advance_adjustment"


class AdjustmentStatusEnum(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    APPLIED = "applied"


class SalaryAdjustment(Base, UUIDMixin, TimestampMixin):
    """One-time or retroactive monetary addition or deduction applied to a payroll period."""

    __tablename__ = "salary_adjustments"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    period_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payroll_periods.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    adjustment_type: Mapped[AdjustmentTypeEnum] = mapped_column(
        SAEnum(AdjustmentTypeEnum, name="salary_adjustment_type"), nullable=False
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[AdjustmentStatusEnum] = mapped_column(
        SAEnum(AdjustmentStatusEnum, name="salary_adjustment_status"),
        default=AdjustmentStatusEnum.PENDING,
        nullable=False,
    )
    approved_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    applied_payroll_record_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payroll_records.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")  # noqa: F821
    period: Mapped["PayrollPeriod | None"] = relationship("PayrollPeriod", lazy="selectin")

    def __repr__(self) -> str:
        return f"<SalaryAdjustment {self.title} ({self.adjustment_type}): {self.amount}>"


# ============================================================
# Loan Repayment Schedule (EMI)
# ============================================================
class EMIStatusEnum(str, enum.Enum):
    PENDING = "pending"
    DEDUCTED = "deducted"
    PAID_MANUALLY = "paid_manually"
    PAUSED = "paused"
    WAIVED = "waived"


class LoanRepaymentSchedule(Base, UUIDMixin, TimestampMixin):
    """Month-by-month installment schedule for employee loans and salary advances."""

    __tablename__ = "loan_repayment_schedules"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    loan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("portal_employee_loans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    installment_number: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 of 6, 2 of 6...
    due_date: Mapped["Date"] = mapped_column(Date, nullable=False, index=True)
    installment_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[EMIStatusEnum] = mapped_column(
        SAEnum(EMIStatusEnum, name="emi_status"),
        default=EMIStatusEnum.PENDING,
        nullable=False,
    )
    payroll_record_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payroll_records.id", ondelete="SET NULL"),
        nullable=True,
    )
    paid_at: Mapped["DateTime | None"] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )
    loan: Mapped["EmployeeLoan"] = relationship("EmployeeLoan", lazy="selectin")  # noqa: F821

    def __repr__(self) -> str:
        return f"<LoanRepaymentSchedule Loan={self.loan_id} #{self.installment_number} ({self.installment_amount})>"


# ============================================================
# Bonus Policies & Bonus Runs
# ============================================================
class BonusTypeEnum(str, enum.Enum):
    FESTIVAL = "festival"
    PERFORMANCE = "performance"
    ATTENDANCE = "attendance"
    SPECIAL = "special"


class BonusBasisEnum(str, enum.Enum):
    PERCENT_BASIC = "percent_basic"
    PERCENT_GROSS = "percent_gross"
    FLAT_AMOUNT = "flat_amount"


class BonusPolicy(Base, UUIDMixin, TimestampMixin):
    """Statutory festival (Eid, Puja) and performance bonus policy rules."""

    __tablename__ = "bonus_policies"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    bonus_type: Mapped[BonusTypeEnum] = mapped_column(
        SAEnum(BonusTypeEnum, name="bonus_type"),
        default=BonusTypeEnum.FESTIVAL,
        nullable=False,
    )
    calculation_basis: Mapped[BonusBasisEnum] = mapped_column(
        SAEnum(BonusBasisEnum, name="bonus_basis"),
        default=BonusBasisEnum.PERCENT_BASIC,
        nullable=False,
    )
    percentage_or_amount: Mapped[float] = mapped_column(
        Numeric(10, 2), default=100.0, nullable=False
    )  # 100% of basic
    min_service_months: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    is_taxable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<BonusPolicy {self.name} ({self.bonus_type})>"


class BonusRun(Base, UUIDMixin, TimestampMixin):
    """Batch disbursement event for bonuses (can link to regular payroll period or standalone)."""

    __tablename__ = "bonus_runs"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    policy_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bonus_policies.id", ondelete="CASCADE"),
        nullable=False,
    )
    payroll_period_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payroll_periods.id", ondelete="SET NULL"),
        nullable=True,
    )
    run_date: Mapped["Date"] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)  # draft, approved, paid
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)
    headcount: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )
    policy: Mapped["BonusPolicy"] = relationship("BonusPolicy", lazy="selectin")
    period: Mapped["PayrollPeriod | None"] = relationship("PayrollPeriod", lazy="selectin")

    def __repr__(self) -> str:
        return f"<BonusRun Policy={self.policy_id} on {self.run_date} [{self.status}]>"


# ============================================================
# Multi-Tier Salary Approvals
# ============================================================
class ApprovalStageEnum(str, enum.Enum):
    HR_REVIEW = "hr_review"
    FINANCE_REVIEW = "finance_review"
    MANAGEMENT_SIGN_OFF = "management_sign_off"


class ApprovalActionEnum(str, enum.Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    RETURNED_FOR_REVISION = "returned_for_revision"


class PayrollPeriodApproval(Base, UUIDMixin, TimestampMixin):
    """Audit log for multi-tier salary approvals."""

    __tablename__ = "payroll_period_approvals"

    period_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payroll_periods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    stage: Mapped[ApprovalStageEnum] = mapped_column(
        SAEnum(ApprovalStageEnum, name="payroll_approval_stage"), nullable=False
    )
    action: Mapped[ApprovalActionEnum] = mapped_column(
        SAEnum(ApprovalActionEnum, name="payroll_approval_action"), nullable=False
    )
    action_by_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )
    period: Mapped["PayrollPeriod"] = relationship("PayrollPeriod", lazy="selectin")
    action_by: Mapped["User"] = relationship("User", lazy="selectin")  # noqa: F821

    def __repr__(self) -> str:
        return f"<PayrollPeriodApproval Period={self.period_id} Stage={self.stage} Action={self.action}>"

