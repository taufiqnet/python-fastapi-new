from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.ecommerce.sellers.models import CommissionType, SellerStatus


class SellerBase(BaseModel):
    store_name: str = Field(..., max_length=255)
    slug: str | None = Field(None, max_length=255)
    company_name: str | None = Field(None, max_length=255)
    contact_email: EmailStr | str | None = Field(None, max_length=255)
    contact_phone: str | None = Field(None, max_length=50)
    address: str | None = None
    description: str | None = None
    logo_url: str | None = Field(None, max_length=500)
    banner_url: str | None = Field(None, max_length=500)
    status: SellerStatus = SellerStatus.PENDING
    is_verified: bool = False
    tax_id: str | None = Field(None, max_length=100)
    payout_account: str | None = Field(None, max_length=255)
    commission_rate: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)
    commission_type: CommissionType = CommissionType.PERCENTAGE
    flat_fee: Decimal = Field(default=Decimal("0.00"), ge=0)
    business_id: int | None = None


class SellerCreate(SellerBase):
    pass


class SellerUpdate(BaseModel):
    store_name: str | None = Field(None, max_length=255)
    slug: str | None = Field(None, max_length=255)
    company_name: str | None = Field(None, max_length=255)
    contact_email: EmailStr | str | None = Field(None, max_length=255)
    contact_phone: str | None = Field(None, max_length=50)
    address: str | None = None
    description: str | None = None
    logo_url: str | None = Field(None, max_length=500)
    banner_url: str | None = Field(None, max_length=500)
    tax_id: str | None = Field(None, max_length=100)
    payout_account: str | None = Field(None, max_length=255)
    business_id: int | None = None


class SellerStatusUpdate(BaseModel):
    status: SellerStatus
    is_verified: bool | None = None


class SellerCommissionUpdate(BaseModel):
    commission_rate: Decimal = Field(..., ge=0, le=100)
    commission_type: CommissionType = CommissionType.PERCENTAGE
    flat_fee: Decimal = Field(default=Decimal("0.00"), ge=0)


class SellerProductAssociation(BaseModel):
    product_id: UUID


class SellerProductOut(BaseModel):
    id: UUID
    title: str
    slug: str
    status: str
    price: Decimal | None = None

    model_config = ConfigDict(from_attributes=True)


class SellerOut(SellerBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    products_count: int = 0

    model_config = ConfigDict(from_attributes=True)
