import enum
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.enums import pg_enum
from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base

if TYPE_CHECKING:
    from app.core.tenancy.models import BusinessProfile
    from app.modules.ecommerce.products.models import Product


class SellerStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    REJECTED = "rejected"


class CommissionType(str, enum.Enum):
    PERCENTAGE = "percentage"
    FLAT = "flat"


class Seller(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "sellers"

    business_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    store_name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    banner_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[SellerStatus] = mapped_column(
        pg_enum(SellerStatus, name="sellerstatus"),
        default=SellerStatus.PENDING,
        nullable=False,
    )
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    tax_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    payout_account: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Commission Structure
    commission_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0.00"), nullable=False
    )
    commission_type: Mapped[CommissionType] = mapped_column(
        pg_enum(CommissionType, name="commissiontype"),
        default=CommissionType.PERCENTAGE,
        nullable=False,
    )
    flat_fee: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )

    # Relationships
    business_profile: Mapped["BusinessProfile | None"] = relationship(
        "BusinessProfile", lazy="selectin"
    )
    products: Mapped[list["Product"]] = relationship(
        "Product", back_populates="seller", lazy="selectin"
    )
