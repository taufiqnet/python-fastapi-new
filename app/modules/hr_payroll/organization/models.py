import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


class Branch(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "branches"
    __table_args__ = (
        UniqueConstraint("business_id", "code", name="uq_branch_business_code"),
        UniqueConstraint("business_id", "name", name="uq_branch_business_name"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    branch_type: Mapped[str] = mapped_column(
        String(50), default="branch_office", nullable=False
    )  # headquarters, regional_office, branch_office, retail_outlet, warehouse_hub
    manager_employee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), default="Dhaka", nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), default="Bangladesh", nullable=True)
    zip_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_head_office: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )
    manager: Mapped["Employee | None"] = relationship(  # noqa: F821
        "Employee",
        foreign_keys=[manager_employee_id],
        lazy="selectin",
    )
    employees: Mapped[list["Employee"]] = relationship(  # noqa: F821
        "Employee",
        back_populates="branch",
        foreign_keys="Employee.branch_id",
        lazy="selectin",
    )

    @property
    def manager_name(self) -> str | None:
        return self.manager.full_name if self.manager else None

    @property
    def employee_count(self) -> int:
        return len(self.employees) if self.employees else 0

    def __repr__(self) -> str:
        return f"<Branch {self.name} ({self.code})>"


class Department(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "departments"
    __table_args__ = (
        UniqueConstraint("business_id", "slug", name="uq_department_business_slug"),
        UniqueConstraint("business_id", "name", name="uq_department_business_name"),
    )

    business_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    slug: Mapped[str] = mapped_column(String(280), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    multiple_heads_allowed: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    parent_department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    head_employee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )
    job_titles: Mapped[list["JobTitle"]] = relationship(
        "JobTitle",
        back_populates="department",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    parent_department: Mapped["Department | None"] = relationship(
        "Department",
        remote_side="Department.id",
        back_populates="sub_departments",
        foreign_keys=[parent_department_id],
    )
    sub_departments: Mapped[list["Department"]] = relationship(
        "Department",
        back_populates="parent_department",
        foreign_keys=[parent_department_id],
        lazy="selectin",
    )
    head_employee: Mapped["Employee | None"] = relationship(  # noqa: F821
        "Employee",
        foreign_keys=[head_employee_id],
        lazy="selectin",
    )
    employees: Mapped[list["Employee"]] = relationship(  # noqa: F821
        "Employee",
        back_populates="department",
        foreign_keys="Employee.department_id",
        lazy="selectin",
    )

    @property
    def parent_department_name(self) -> str | None:
        return self.parent_department.name if self.parent_department else None

    @property
    def head_employee_name(self) -> str | None:
        return self.head_employee.full_name if self.head_employee else None

    @property
    def employee_count(self) -> int:
        return len(self.employees) if self.employees else 0

    def __repr__(self) -> str:
        return f"<Department {self.name}>"


class JobTitle(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "job_titles"
    __table_args__ = (
        UniqueConstraint("department_id", "name", name="uq_job_title_department_name"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="CASCADE"),
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    level_rank: Mapped[int] = mapped_column(
        Integer, default=5, nullable=False
    )  # 1: Executive/C-Level, 2: Director/VP, 3: Manager, 4: Lead, 5: Senior, 6: Associate, 7: Support/Intern
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    department: Mapped["Department | None"] = relationship(
        "Department",
        back_populates="job_titles",
    )
    business_profile: Mapped["BusinessProfile"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )
    employees: Mapped[list["Employee"]] = relationship(  # noqa: F821
        "Employee",
        foreign_keys="Employee.job_title_id",
        overlaps="job_title",
        lazy="selectin",
    )

    @property
    def department_name(self) -> str | None:
        return self.department.name if self.department else None

    @property
    def employee_count(self) -> int:
        return len(self.employees) if self.employees else 0

    def __repr__(self) -> str:
        if self.short_name:
            return f"<JobTitle {self.name} ({self.short_name})>"
        return f"<JobTitle {self.name}>"