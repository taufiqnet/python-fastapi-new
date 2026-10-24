import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class EmployeeSalaryBase(BaseModel):
    employee_id: uuid.UUID
    business_id: int
    basic_salary: float = Field(0.0, ge=0.0)
    house_rent: float = Field(0.0, ge=0.0)
    medical_allowance: float = Field(0.0, ge=0.0)
    transport_allowance: float = Field(0.0, ge=0.0)
    food_allowance: float = Field(0.0, ge=0.0)
    other_allowance: float = Field(0.0, ge=0.0)
    tax: float = Field(0.0, ge=0.0)
    provident_fund: float = Field(0.0, ge=0.0)
    other_deduction: float = Field(0.0, ge=0.0)
    effective_from: date


class EmployeeSalaryCreate(EmployeeSalaryBase):
    pass


class EmployeeSalaryUpdate(BaseModel):
    basic_salary: float | None = Field(None, ge=0.0)
    house_rent: float | None = Field(None, ge=0.0)
    medical_allowance: float | None = Field(None, ge=0.0)
    transport_allowance: float | None = Field(None, ge=0.0)
    food_allowance: float | None = Field(None, ge=0.0)
    other_allowance: float | None = Field(None, ge=0.0)
    tax: float | None = Field(None, ge=0.0)
    provident_fund: float | None = Field(None, ge=0.0)
    other_deduction: float | None = Field(None, ge=0.0)
    effective_from: date | None = None
    business_id: int | None = None


class EmployeeSalaryOut(EmployeeSalaryBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    gross_salary: float
    net_salary: float
    created_at: datetime
    updated_at: datetime


# ============================================================
# Salary Components Schemas
# ============================================================
from app.modules.hr_payroll.compensation.models import (
    CalculationTypeEnum,
    ComponentTypeEnum,
)


class SalaryComponentBase(BaseModel):
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=50)
    component_type: ComponentTypeEnum
    calculation_type: CalculationTypeEnum = CalculationTypeEnum.FIXED
    default_value: float = Field(0.0, ge=0.0)
    is_taxable: bool = True
    is_statutory: bool = False
    is_active: bool = True


class SalaryComponentCreate(SalaryComponentBase):
    business_id: int


class SalaryComponentUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    component_type: ComponentTypeEnum | None = None
    calculation_type: CalculationTypeEnum | None = None
    default_value: float | None = None
    is_taxable: bool | None = None
    is_statutory: bool | None = None
    is_active: bool | None = None
    business_id: int | None = None


class SalaryComponentOut(SalaryComponentBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    created_at: datetime
    updated_at: datetime


# ============================================================
# Salary Structures Schemas
# ============================================================
class SalaryStructureItemBase(BaseModel):
    component_id: uuid.UUID
    calculation_type: CalculationTypeEnum
    value: float = Field(..., ge=0.0)


class SalaryStructureItemCreate(SalaryStructureItemBase):
    pass


class SalaryStructureItemOut(SalaryStructureItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    structure_id: uuid.UUID
    component: SalaryComponentOut | None = None
    created_at: datetime
    updated_at: datetime


class SalaryStructureBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: str | None = None
    is_active: bool = True


class SalaryStructureCreate(SalaryStructureBase):
    business_id: int
    items: list[SalaryStructureItemCreate] = []


class SalaryStructureUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
    business_id: int | None = None
    items: list[SalaryStructureItemCreate] | None = None


class SalaryStructureOut(SalaryStructureBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    items: list[SalaryStructureItemOut] = []
    created_at: datetime
    updated_at: datetime
