from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


class Customer(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "customers"

    business_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    business_profile: Mapped["BusinessProfile | None"] = relationship(  # noqa: F821
        "BusinessProfile",
        lazy="selectin",
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()
