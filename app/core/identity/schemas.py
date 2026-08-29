"""
Pydantic schemas for the user system, extending the original user.py
(UserCreate / UserResponse / Token kept as-is, plus role & profile schemas).
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict, EmailStr


# ---------------------------------------------------------------------------
# Original schemas (unchanged)
# ---------------------------------------------------------------------------


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


# ---------------------------------------------------------------------------
# Roles
# ---------------------------------------------------------------------------


class RoleName(str, Enum):
    CUSTOMER = "customer"
    VENDOR = "vendor"
    ADMIN = "admin"
    STAFF = "staff"


class RoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None


# ---------------------------------------------------------------------------
# Profiles
# ---------------------------------------------------------------------------


class CustomerProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date_of_birth: date | None = None
    loyalty_points: int = 0
    default_address_id: int | None = None


class VendorStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    SUSPENDED = "suspended"
    REJECTED = "rejected"


class VendorProfileCreate(BaseModel):
    business_profile_id: int


class VendorProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    business_profile_id: int
    status: VendorStatus
    commission_rate: Decimal
    approved_at: datetime | None = None


# ---------------------------------------------------------------------------
# Addresses
# ---------------------------------------------------------------------------


class AddressType(str, Enum):
    SHIPPING = "shipping"
    BILLING = "billing"


class AddressCreate(BaseModel):
    type: AddressType
    is_default: bool = False
    recipient_name: str | None = None
    phone: str | None = None
    building_no: str | None = None
    street: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    zip_code: str | None = None


class AddressResponse(AddressCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int


# ---------------------------------------------------------------------------
# User response — now carries roles + whichever profile applies
# ---------------------------------------------------------------------------


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    phone: str | None = None
    is_active: bool
    is_verified: bool
    created_at: datetime

    roles: list[RoleResponse] = []
    customer_profile: CustomerProfileResponse | None = None
    vendor_profile: VendorProfileResponse | None = None
    addresses: list[AddressResponse] = []