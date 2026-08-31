import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


class Brand(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "brands"

    business_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    models: Mapped[list["ProductModel"]] = relationship(
        "ProductModel",
        back_populates="brand",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    products: Mapped[list["Product"]] = relationship(  # noqa: F821
        "Product",
        back_populates="brand_rel",
    )


class ProductModel(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "product_models"

    brand_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("brands.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    brand: Mapped["Brand"] = relationship(
        "Brand",
        back_populates="models",
    )
    products: Mapped[list["Product"]] = relationship(  # noqa: F821
        "Product",
        back_populates="model_rel",
    )
