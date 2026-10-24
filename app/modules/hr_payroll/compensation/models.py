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


# ============================================================
# Dynamic Salary Components & Structures
# ============================================================
import enum
from sqlalchemy import Boolean, String, Text, UniqueConstraint
from sqlalchemy.types import Enum as SAEnum


class ComponentTypeEnum(str, enum.Enum):
    EARNING = "earning"
    DEDUCTION = "deduction"
    REIMBURSEMENT = "reimbursement"
    STATUTORY = "statutory"


class CalculationTypeEnum(str, enum.Enum):
    FIXED = "fixed"
    PERCENT_BASIC = "percent_basic"
    PERCENT_GROSS = "percent_gross"
    FORMULA = "formula"


class SalaryComponent(Base, UUIDMixin, TimestampMixin):
    """Catalog of salary components (Basic, House Rent, Medical, Conveyance, PF, etc.)."""

    __tablename__ = "salary_components"
    __table_args__ = (
        UniqueConstraint("business_id", "code", name="uq_salary_component_business_code"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)  # BASIC, HR, MED, CONV, PF
    component_type: Mapped[ComponentTypeEnum] = mapped_column(
        SAEnum(ComponentTypeEnum, name="salary_component_type"), nullable=False
    )
    calculation_type: Mapped[CalculationTypeEnum] = mapped_column(
        SAEnum(CalculationTypeEnum, name="salary_calculation_type"),
        default=CalculationTypeEnum.FIXED,
        nullable=False,
    )
    default_value: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    is_taxable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_statutory: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<SalaryComponent {self.code}: {self.name} ({self.component_type})>"


class SalaryStructure(Base, UUIDMixin, TimestampMixin):
    """Reusable template for salary compensation packages (e.g. Executive, Standard Staff, Worker)."""

    __tablename__ = "salary_structures"
    __table_args__ = (
        UniqueConstraint("business_id", "name", name="uq_salary_structure_business_name"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )
    items: Mapped[list["SalaryStructureItem"]] = relationship(
        "SalaryStructureItem",
        back_populates="structure",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<SalaryStructure {self.name}>"


class SalaryStructureItem(Base, UUIDMixin, TimestampMixin):
    """Line item in a salary structure tying a component to a rate/percentage."""

    __tablename__ = "salary_structure_items"

    structure_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("salary_structures.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    component_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("salary_components.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    calculation_type: Mapped[CalculationTypeEnum] = mapped_column(
        SAEnum(CalculationTypeEnum, name="structure_item_calc_type"), nullable=False
    )
    value: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)

    # Relationships
    structure: Mapped["SalaryStructure"] = relationship(
        "SalaryStructure", back_populates="items"
    )
    component: Mapped["SalaryComponent"] = relationship(
        "SalaryComponent", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<SalaryStructureItem structure={self.structure_id} component={self.component_id}>"

