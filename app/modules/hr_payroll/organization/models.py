import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


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
    slug: Mapped[str] = mapped_column(String(280), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    multiple_heads_allowed: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
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

    def __repr__(self) -> str:
        if self.short_name:
            return f"<JobTitle {self.name} ({self.short_name})>"
        return f"<JobTitle {self.name}>"