import uuid

from sqlalchemy import ForeignKey, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID, Date

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


class EmployeeSalary(Base, UUIDMixin, TimestampMixin):
    """
    One active salary structure per employee (one-to-one), dated by
    effective_from. compensation/ stays separate from payslips/ — a payslip
    is a point-in-time snapshot computed from this structure + that period's
    attendance, not a live reference to it.

    Note: gross_salary and net_salary were auto-computed in the Django
    model's save() (sum of earnings; gross minus tax/PF/other deductions).
    Per this platform's convention, that computation belongs in
    hr_payroll/compensation/service.py::upsert_salary_structure() — the
    model only stores the resulting figures.
    """

    __tablename__ = "employee_salaries"

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
        unique=True,  # one-to-one: one active salary structure per employee
        index=True,
    )

    # ── Earnings ────────────────────────────────────────────────────
    basic_salary: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    house_rent: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    medical_allowance: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    transport_allowance: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    food_allowance: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    other_allowance: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )

    # ── Deductions ──────────────────────────────────────────────────
    tax: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    provident_fund: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    other_deduction: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )

    # ── Computed totals (written by service.py, not the model) ───────
    gross_salary: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    net_salary: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)

    effective_from: Mapped["Date"] = mapped_column(Date, nullable=False)

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )
    employee: Mapped["Employee"] = relationship(  # noqa: F821
        "Employee",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<EmployeeSalary {self.employee_id} | net={self.net_salary}>"
