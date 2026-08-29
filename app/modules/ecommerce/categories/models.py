import uuid
from typing import Any

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


class Category(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "categories"

    business_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )
    icon: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    parent: Mapped["Category | None"] = relationship(
        "Category",
        remote_side="Category.id",
        back_populates="children",
    )
    children: Mapped[list["Category"]] = relationship(
        "Category",
        back_populates="parent",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    attribute_templates: Mapped[list["CategoryAttributeTemplate"]] = relationship(
        "CategoryAttributeTemplate",
        back_populates="category",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    products: Mapped[list["Product"]] = relationship(  # noqa: F821
        "Product",
        back_populates="category",
        lazy="selectin",
    )
    business_profile: Mapped["BusinessProfile | None"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )


class CategoryAttributeTemplate(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "category_attribute_templates"

    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=False,
    )
    attribute_name: Mapped[str] = mapped_column(String(100), nullable=False)
    attribute_type: Mapped[str] = mapped_column(
        String(50),
        default="text",
        nullable=False,
    )
    is_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    options: Mapped[dict[str, Any] | list[Any] | None] = mapped_column(
        JSON,
        nullable=True,
    )

    # Relationships
    category: Mapped["Category"] = relationship(
        "Category",
        back_populates="attribute_templates",
    )
