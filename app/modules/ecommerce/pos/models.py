import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID

from app.common.enums import pg_enum
from app.common.models import SyncMixin, TimestampMixin, UUIDMixin
from app.database import Base


class SessionStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"


class POSPaymentMethod(str, enum.Enum):
    CASH = "cash"
    CARD = "card"
    MOBILE_WALLET = "mobile_wallet"  # e.g., bKash, Nagad
    GIFT_CARD = "gift_card"
    CREDIT_NOTE = "credit_note"
    OTHER = "other"


class POSRegister(Base, UUIDMixin, TimestampMixin):
    """
    Physical POS station or terminal bound to a specific warehouse/store branch.
    """
    __tablename__ = "pos_registers"
    __table_args__ = (
        UniqueConstraint("business_id", "code", name="uq_pos_registers_business_code"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("warehouses.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "Counter 1"
    code: Mapped[str] = mapped_column(String(50), nullable=False)   # e.g. "REG-01"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    receipt_header: Mapped[str | None] = mapped_column(Text, nullable=True)
    receipt_footer: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    warehouse: Mapped["Warehouse"] = relationship("Warehouse", lazy="selectin")  # noqa: F821
    sessions: Mapped[list["POSSession"]] = relationship(
        "POSSession", back_populates="register", cascade="all, delete-orphan", lazy="selectin"
    )


class POSSession(Base, UUIDMixin, TimestampMixin):
    """
    Cashier work shift. Captures opening float, ongoing transactions,
    closing drawer cash count, and cash variance (over/short).
    """
    __tablename__ = "pos_sessions"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    register_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pos_registers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[SessionStatus] = mapped_column(
        pg_enum(SessionStatus, name="pos_session_status"),
        default=SessionStatus.OPEN,
        nullable=False,
    )
    opened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    opening_cash: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    closing_cash_counted: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    closing_cash_expected: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    cash_difference: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )  # counted - expected (negative = shortage, positive = overage)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    register: Mapped["POSRegister"] = relationship("POSRegister", back_populates="sessions")
    user: Mapped["User"] = relationship("User", lazy="selectin")  # noqa: F821
    payments: Mapped[list["POSPayment"]] = relationship(
        "POSPayment", back_populates="session", lazy="selectin"
    )


class POSPayment(Base, UUIDMixin, TimestampMixin, SyncMixin):
    """
    Split-tender payment entry for a POS transaction (e.g. 50 cash + 50 card).
    """
    __tablename__ = "pos_payments"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_pos_payments_amount_positive"),
        Index("ix_pos_payments_order", "order_id"),
        Index("ix_pos_payments_session", "session_id"),
    )

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
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pos_sessions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    payment_method: Mapped[POSPaymentMethod] = mapped_column(
        pg_enum(POSPaymentMethod, name="pos_payment_method"),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tendered_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )  # e.g., customer gave $100 for a $85 bill
    change_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )  # e.g., $15 change returned
    reference_number: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # Card approval code or mobile wallet TrxID

    # Relationships
    session: Mapped["POSSession"] = relationship("POSSession", back_populates="payments")
    order: Mapped["Order"] = relationship("Order", lazy="selectin")  # noqa: F821
