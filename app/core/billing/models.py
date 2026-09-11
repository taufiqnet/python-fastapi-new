from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    permissions: Mapped[list["Permission"]] = relationship(
        "Permission", secondary="subscription_plan_permissions"
    )
    business_profiles: Mapped[list["BusinessProfile"]] = relationship(
        "BusinessProfile", back_populates="subscription_plan"
    )


class PlanPermission(Base):
    __tablename__ = "subscription_plan_permissions"
    __table_args__ = (
        UniqueConstraint("plan_id", "permission_id", name="uq_plan_permission"),
    )

    plan_id: Mapped[int] = mapped_column(
        ForeignKey("subscription_plans.id"), primary_key=True
    )
    permission_id: Mapped[int] = mapped_column(
        ForeignKey("permissions.id"), primary_key=True
    )
