import enum
import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
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

from app.common.models import TimestampMixin, UUIDMixin
from app.core.identity.models import User
from app.database import Base
from app.modules.hr_payroll.employees.models import Employee


class AssetStatusEnum(str, enum.Enum):
    AVAILABLE = "available"
    ASSIGNED = "assigned"
    UNDER_MAINTENANCE = "under_maintenance"
    DAMAGED = "damaged"
    RETIRED = "retired"
    LOST = "lost"


class AssetConditionEnum(str, enum.Enum):
    NEW = "new"
    GOOD = "good"
    FAIR = "fair"
    DAMAGED = "damaged"


class AllocationStatusEnum(str, enum.Enum):
    PENDING_ACKNOWLEDGEMENT = "pending_acknowledgement"
    ACTIVE = "active"
    RETURNED = "returned"
    DISPUTED = "disputed"


class MaintenanceTypeEnum(str, enum.Enum):
    DAMAGE = "damage"
    PREVENTIVE = "preventive"
    BREAKDOWN = "breakdown"
    UPGRADE = "upgrade"


class MaintenanceStatusEnum(str, enum.Enum):
    REPORTED = "reported"
    IN_REPAIR = "in_repair"
    REPAIRED = "repaired"
    IRREPARABLE = "irreparable"


# ===========================================================================
# 1. Asset Categories
# ===========================================================================
class AssetCategory(Base, UUIDMixin, TimestampMixin):
    """Classification for assets (e.g. Laptops, Vehicles, SIM Cards, Furniture)."""

    __tablename__ = "asset_categories"
    __table_args__ = (
        UniqueConstraint("business_id", "code", name="uq_asset_category_biz_code"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    depreciation_method: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, default="straight_line"
    )  # straight_line, wdv, none
    useful_life_months: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=36)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    assets: Mapped[list["CompanyAsset"]] = relationship(
        "CompanyAsset", back_populates="category", cascade="all, delete-orphan"
    )


# ===========================================================================
# 2. Company Physical Assets Inventory
# ===========================================================================
class CompanyAsset(Base, UUIDMixin, TimestampMixin):
    """Specific trackable physical asset item (with serial number/IMEI/reg)."""

    __tablename__ = "company_assets"
    __table_args__ = (
        UniqueConstraint("business_id", "asset_tag", name="uq_company_asset_tag"),
        Index("ix_company_assets_biz_status", "business_id", "current_status"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("asset_categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    asset_tag: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    serial_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    imei_or_reg_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    brand: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    specifications: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    purchase_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    purchase_cost: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)
    warranty_expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    vendor_supplier: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    invoice_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    current_status: Mapped[str] = mapped_column(
        String(30), default=AssetStatusEnum.AVAILABLE.value, nullable=False, index=True
    )
    condition: Mapped[str] = mapped_column(
        String(30), default=AssetConditionEnum.NEW.value, nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Optional Future GL Bridge
    finance_account_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    # Relationships
    category: Mapped["AssetCategory"] = relationship("AssetCategory", back_populates="assets")
    allocations: Mapped[list["AssetAssignment"]] = relationship(
        "AssetAssignment", back_populates="asset", cascade="all, delete-orphan", order_by="desc(AssetAssignment.assigned_date)"
    )
    maintenance_records: Mapped[list["AssetMaintenanceLog"]] = relationship(
        "AssetMaintenanceLog", back_populates="asset", cascade="all, delete-orphan", order_by="desc(AssetMaintenanceLog.start_date)"
    )


# ===========================================================================
# 3. Asset Allocations & Custody Tracking
# ===========================================================================
class AssetAssignment(Base, UUIDMixin, TimestampMixin):
    """Issuance of an asset to an employee with custody handover & return tracking."""

    __tablename__ = "asset_assignments"
    __table_args__ = (
        Index("ix_asset_assignments_emp_active", "business_id", "employee_id", "status"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("company_assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assigned_date: Mapped[date] = mapped_column(Date, nullable=False)
    expected_return_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    actual_return_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    issue_condition: Mapped[str] = mapped_column(
        String(30), default=AssetConditionEnum.GOOD.value, nullable=False
    )
    issue_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    return_condition: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    return_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(
        String(30), default=AllocationStatusEnum.PENDING_ACKNOWLEDGEMENT.value, nullable=False, index=True
    )
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    handover_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    received_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    asset: Mapped["CompanyAsset"] = relationship("CompanyAsset", back_populates="allocations")
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")
    handover_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[handover_by_id], lazy="selectin")
    received_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[received_by_id], lazy="selectin")


# ===========================================================================
# 4. Asset Damage & Maintenance Logs
# ===========================================================================
class AssetMaintenanceLog(Base, UUIDMixin, TimestampMixin):
    """Damage reports, servicing, and preventive maintenance work orders."""

    __tablename__ = "asset_maintenance_logs"
    __table_args__ = (
        Index("ix_asset_maint_biz_status", "business_id", "status"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("company_assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    issue_type: Mapped[str] = mapped_column(
        String(30), default=MaintenanceTypeEnum.DAMAGE.value, nullable=False
    )
    reported_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reported_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    problem_description: Mapped[str] = mapped_column(Text, nullable=False)
    vendor_service_center: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    cost: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    completion_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), default=MaintenanceStatusEnum.REPORTED.value, nullable=False, index=True
    )
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    invoice_or_receipt_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    asset: Mapped["CompanyAsset"] = relationship("CompanyAsset", back_populates="maintenance_records")
    reported_by: Mapped[Optional["User"]] = relationship("User", lazy="selectin")
