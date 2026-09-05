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
