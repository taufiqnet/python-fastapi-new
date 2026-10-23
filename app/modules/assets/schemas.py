import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.modules.assets.models import (
    AllocationStatusEnum,
    AssetConditionEnum,
    AssetStatusEnum,
    MaintenanceStatusEnum,
    MaintenanceTypeEnum,
)


# ===========================================================================
# 1. Asset Category Schemas
# ===========================================================================
class AssetCategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=20)
    description: Optional[str] = None
    depreciation_method: Optional[str] = "straight_line"
    useful_life_months: Optional[int] = 36
    is_active: bool = True


class AssetCategoryCreate(AssetCategoryBase):
    pass


class AssetCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    depreciation_method: Optional[str] = None
    useful_life_months: Optional[int] = None
    is_active: Optional[bool] = None


class AssetCategoryOut(AssetCategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ===========================================================================
# 2. Company Physical Asset Schemas
# ===========================================================================
class CompanyAssetBase(BaseModel):
    category_id: uuid.UUID
    asset_tag: str = Field(..., max_length=50)
    name: str = Field(..., max_length=200)
    serial_number: Optional[str] = Field(None, max_length=100)
    imei_or_reg_number: Optional[str] = Field(None, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    specifications: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_cost: Decimal = Decimal("0.00")
    warranty_expiry_date: Optional[date] = None
    vendor_supplier: Optional[str] = Field(None, max_length=200)
    invoice_number: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=150)
    current_status: AssetStatusEnum = AssetStatusEnum.AVAILABLE
    condition: AssetConditionEnum = AssetConditionEnum.NEW
    notes: Optional[str] = None


class CompanyAssetCreate(CompanyAssetBase):
    pass


class CompanyAssetUpdate(BaseModel):
    category_id: Optional[uuid.UUID] = None
    asset_tag: Optional[str] = Field(None, max_length=50)
    name: Optional[str] = Field(None, max_length=200)
    serial_number: Optional[str] = None
    imei_or_reg_number: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    specifications: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_cost: Optional[Decimal] = None
    warranty_expiry_date: Optional[date] = None
    vendor_supplier: Optional[str] = None
    invoice_number: Optional[str] = None
    location: Optional[str] = None
    current_status: Optional[AssetStatusEnum] = None
    condition: Optional[AssetConditionEnum] = None
    notes: Optional[str] = None


class CompanyAssetOut(CompanyAssetBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    category_name: Optional[str] = None
    current_assigned_employee_id: Optional[uuid.UUID] = None
    current_assigned_employee_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ===========================================================================
# 3. Asset Assignment Schemas
# ===========================================================================
class AssetAssignmentCreate(BaseModel):
    asset_id: uuid.UUID
    employee_id: uuid.UUID
    assigned_date: date = Field(default_factory=date.today)
    expected_return_date: Optional[date] = None
    issue_condition: AssetConditionEnum = AssetConditionEnum.GOOD
    issue_notes: Optional[str] = None


class AssetAssignmentReturn(BaseModel):
    actual_return_date: date = Field(default_factory=date.today)
    return_condition: AssetConditionEnum = AssetConditionEnum.GOOD
    return_notes: Optional[str] = None


class AssetAssignmentAcknowledge(BaseModel):
    status: AllocationStatusEnum = AllocationStatusEnum.ACTIVE  # active or disputed
    notes: Optional[str] = None


class AssetAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    asset_id: uuid.UUID
    employee_id: uuid.UUID
    asset_tag: Optional[str] = None
    asset_name: Optional[str] = None
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    assigned_date: date
    expected_return_date: Optional[date] = None
    actual_return_date: Optional[date] = None
    issue_condition: str
    issue_notes: Optional[str] = None
    return_condition: Optional[str] = None
    return_notes: Optional[str] = None
    status: str
    acknowledged_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


# ===========================================================================
# 4. Asset Maintenance Schemas
# ===========================================================================
class AssetMaintenanceCreate(BaseModel):
    asset_id: uuid.UUID
    issue_type: MaintenanceTypeEnum = MaintenanceTypeEnum.DAMAGE
    problem_description: str
    reported_date: date = Field(default_factory=date.today)
    vendor_service_center: Optional[str] = Field(None, max_length=200)
    cost: Decimal = Decimal("0.00")
    start_date: date = Field(default_factory=date.today)
    completion_date: Optional[date] = None
    status: MaintenanceStatusEnum = MaintenanceStatusEnum.REPORTED
    resolution_notes: Optional[str] = None
    invoice_or_receipt_url: Optional[str] = None


class AssetMaintenanceUpdate(BaseModel):
    issue_type: Optional[MaintenanceTypeEnum] = None
    problem_description: Optional[str] = None
    vendor_service_center: Optional[str] = None
    cost: Optional[Decimal] = None
    start_date: Optional[date] = None
    completion_date: Optional[date] = None
    status: Optional[MaintenanceStatusEnum] = None
    resolution_notes: Optional[str] = None
    invoice_or_receipt_url: Optional[str] = None


class AssetMaintenanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    asset_id: uuid.UUID
    asset_tag: Optional[str] = None
    asset_name: Optional[str] = None
    issue_type: str
    reported_date: date
    problem_description: str
    vendor_service_center: Optional[str] = None
    cost: Decimal
    start_date: date
    completion_date: Optional[date] = None
    status: str
    resolution_notes: Optional[str] = None
    invoice_or_receipt_url: Optional[str] = None
    created_at: Optional[datetime] = None


# ===========================================================================
# 5. Statistics Overview
# ===========================================================================
class AssetOverviewStats(BaseModel):
    total_assets: int = 0
    available_assets: int = 0
    assigned_assets: int = 0
    under_maintenance_assets: int = 0
    damaged_assets: int = 0
