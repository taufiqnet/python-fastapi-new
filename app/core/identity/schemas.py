"""
Pydantic schemas for the user system, extending the original user.py
(UserCreate / UserResponse / Token kept as-is, plus role & profile schemas).
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict, EmailStr

# ---------------------------------------------------------------------------
# Original schemas
# ---------------------------------------------------------------------------


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    phone: str | None = None
    business_id: int | None = None


class Token(BaseModel):
    access_token: str
    token_type: str


# ---------------------------------------------------------------------------
# Permissions & Roles
# ---------------------------------------------------------------------------


class PermissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    module: str
    feature: str
    action: str
    code: str
    name: str | None = None


class RoleName(str, Enum):
    CUSTOMER = "customer"
    VENDOR = "vendor"
    ADMIN = "admin"
    STAFF = "staff"


class RoleCreate(BaseModel):
    name: str
    description: str | None = None
    business_id: int | None = None
    permission_ids: list[int] = []


class RoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    business_id: int | None = None
    permissions: list[PermissionResponse] = []


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
# User response & update schemas
# ---------------------------------------------------------------------------


class UserUpdate(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    business_id: int | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None
    password: str | None = None
    role_ids: list[int] = []
    permission_ids: list[int] = []


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    phone: str | None = None
    business_id: int | None = None
    is_superuser: bool = False
    is_active: bool
    is_verified: bool
    created_at: datetime

    roles: list[RoleResponse] = []
    direct_permissions: list[PermissionResponse] = []
    customer_profile: CustomerProfileResponse | None = None
    vendor_profile: VendorProfileResponse | None = None
    addresses: list[AddressResponse] = []
