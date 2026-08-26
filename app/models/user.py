"""
SQLAlchemy models for the user system: core identity + RBAC + role profiles.

Design:
- User: pure auth/identity. No role-specific fields here.
- Role / UserRole: many-to-many, so a single account can hold multiple
  roles (e.g. a vendor who also shops as a customer).
- CustomerProfile / VendorProfile: one-to-one extensions holding
  role-specific data. VendorProfile links to BusinessProfile.
- Address: many-to-one with User, supports multiple shipping/billing
  addresses per account.
"""

import enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Core identity
# ---------------------------------------------------------------------------


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(30), default=None)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)

    roles: Mapped[list["Role"]] = relationship(
        secondary="user_roles", back_populates="users"
    )
    customer_profile: Mapped["CustomerProfile | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    vendor_profile: Mapped["VendorProfile | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    addresses: Mapped[list["Address"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    def has_role(self, role_name: str) -> bool:
        return any(r.name == role_name for r in self.roles)


# ---------------------------------------------------------------------------
# RBAC
# ---------------------------------------------------------------------------


class RoleName(str, enum.Enum):
    CUSTOMER = "customer"
    VENDOR = "vendor"
    ADMIN = "admin"
    STAFF = "staff"


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    description: Mapped[str | None] = mapped_column(Text, default=None)

    users: Mapped[list["User"]] = relationship(
        secondary="user_roles", back_populates="roles"
    )


class UserRole(Base):
    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint("user_id", "role_id", name="uq_user_role"),)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), primary_key=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# Role-specific profile extensions
# ---------------------------------------------------------------------------


class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)

    date_of_birth: Mapped[date | None] = mapped_column(Date, default=None)
    loyalty_points: Mapped[int] = mapped_column(default=0)
    default_address_id: Mapped[int | None] = mapped_column(
        ForeignKey("addresses.id"), default=None
    )

    user: Mapped["User"] = relationship(back_populates="customer_profile")


class VendorStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    SUSPENDED = "suspended"
    REJECTED = "rejected"


class VendorProfile(Base):
    __tablename__ = "vendor_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    business_profile_id: Mapped[int] = mapped_column(
        ForeignKey("business_profiles.id"), unique=True
    )

    status: Mapped[VendorStatus] = mapped_column(
        Enum(VendorStatus), default=VendorStatus.PENDING
    )
    commission_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("10.00")
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)

    user: Mapped["User"] = relationship(back_populates="vendor_profile")
    # business_profile: Mapped["BusinessProfile"] = relationship()  # link to your existing model


# ---------------------------------------------------------------------------
# Addresses (shared by customers and vendors)
# ---------------------------------------------------------------------------


class AddressType(str, enum.Enum):
    SHIPPING = "shipping"
    BILLING = "billing"


class Address(Base):
    __tablename__ = "addresses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    type: Mapped[AddressType] = mapped_column(Enum(AddressType))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    recipient_name: Mapped[str | None] = mapped_column(String(120), default=None)
    phone: Mapped[str | None] = mapped_column(String(30), default=None)
    building_no: Mapped[str | None] = mapped_column(String(30), default=None)
    street: Mapped[str | None] = mapped_column(String(120), default=None)
    city: Mapped[str | None] = mapped_column(String(80), default=None)
    state: Mapped[str | None] = mapped_column(String(80), default=None)
    country: Mapped[str | None] = mapped_column(String(80), default=None)
    zip_code: Mapped[str | None] = mapped_column(String(20), default=None)

    user: Mapped["User"] = relationship(back_populates="addresses")