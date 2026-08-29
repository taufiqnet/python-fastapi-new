import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base

# NOTE: `default=1` on business_id showed up in orders/models.py,
# payments/models.py, and THREE times in this file — it's not a one-off
# typo, it's almost certainly copied from a shared template. Every one of
# these silently attached rows to business_id=1 unless the caller
# explicitly overrode it. Removed everywhere below; business_id is now
# required with no default, so a missing value fails loudly (a 422/500 at
# the API layer) instead of silently corrupting tenant data.
#
# Run this to check for any other files still carrying it:
#   grep -rn "default=1" app/modules/ --include="*.py"


class PriceHistory(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "price_histories"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    old_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    new_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Who/what triggered this price change (staff user, seller, or an
    # automated repricing job) — same rationale as actor_id on
    # inventory.StockMovement: needed for margin/pricing disputes.
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    variant: Mapped["ProductVariant"] = relationship(  # noqa: F821
        "ProductVariant", lazy="selectin"
    )


class TaxRule(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "tax_rules"
    __table_args__ = (
        # Without this, two active tax rules could both match the same
        # (business, region, category) combination with no defined
        # precedence — which one applies at checkout becomes ambiguous.
        UniqueConstraint(
            "business_id", "region", "category_id",
            name="uq_tax_rules_business_region_category",
        ),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    region: Mapped[str] = mapped_column(String(100), nullable=False)
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    tax_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class CurrencyRate(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "currency_rates"
    __table_args__ = (
        # Without a unique constraint, nothing prevents multiple rows for
        # the same currency at the same effective time — "what's the
        # current rate for EUR" becomes a query with no defined answer.
        UniqueConstraint(
            "business_id", "currency_code", "effective_at",
            name="uq_currency_rates_business_code_effective",
        ),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False)
    rate: Mapped[Decimal] = mapped_column(Numeric(12, 6), nullable=False)

    # Rates change over time and orders/invoices need the rate that was
    # actually in effect when they were placed — not just "whatever the
    # rate is now". effective_at makes this a proper time series instead
    # of a single mutable row per currency.
    effective_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
