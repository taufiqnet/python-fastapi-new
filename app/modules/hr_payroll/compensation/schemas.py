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
