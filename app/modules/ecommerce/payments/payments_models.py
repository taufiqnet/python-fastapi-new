import enum
import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID

from app.common.enums import pg_enum
from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    FAILED = "failed"
    REFUNDED = "refunded"


class RefundStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSED = "processed"
    FAILED = "failed"


class Payment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "payments"

    # NOTE: `default=1` on a FK is almost certainly a placeholder left over
    # from development, same issue flagged on orders/models.py earlier —
    # every payment would silently attach to business_id=1 unless the
    # caller explicitly overrides it. Removed here; business_id should be
    # required and passed explicitly (e.g. from get_current_business()).
    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # e.g., stripe, paypal
    transaction_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        pg_enum(PaymentStatus, name="paymentstatus"),
        default=PaymentStatus.PENDING,
        nullable=False,
    )

    refunds: Mapped[list["Refund"]] = relationship(
        "Refund",
        back_populates="payment",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class PaymentMethod(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "payment_methods"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # TODO: same as Payment/Refund's user-reference gap noted elsewhere —
    # add ForeignKey("users.id", ondelete="CASCADE") once the identity
    # module's table name is confirmed.
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # card, wallet
    token_ref: Mapped[str] = mapped_column(String(255), nullable=False)
    is_default: Mapped[bool] = mapped_column(default=False, nullable=False)


class Refund(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "refunds"

    payment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Was a raw String with a "processed" default — meaning a refund is
    # marked processed at creation even before it's actually gone through
    # with the provider. Converted to an enum defaulting to PENDING, which
    # matches how Payment/Order statuses work elsewhere in this codebase.
    status: Mapped[RefundStatus] = mapped_column(
        pg_enum(RefundStatus, name="refundstatus"),
        default=RefundStatus.PENDING,
        nullable=False,
    )

    payment: Mapped["Payment"] = relationship("Payment", back_populates="refunds")
