import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# --- Branch Schemas ---
class BranchBase(BaseModel):
    name: str = Field(..., max_length=255)
    code: str = Field(..., max_length=50)
    branch_type: str = Field("branch_office", max_length=50)
    manager_employee_id: uuid.UUID | None = None
    phone: str | None = Field(None, max_length=50)
    email: str | None = Field(None, max_length=255)
    address: str | None = None
    city: str | None = Field("Dhaka", max_length=100)
    state: str | None = Field(None, max_length=100)
    country: str | None = Field("Bangladesh", max_length=100)
    zip_code: str | None = Field(None, max_length=20)
    is_head_office: bool = False
    is_active: bool = True
    business_id: int


class BranchCreate(BranchBase):
    pass


class BranchUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    code: str | None = Field(None, max_length=50)
    branch_type: str | None = Field(None, max_length=50)
    manager_employee_id: uuid.UUID | None = None
    phone: str | None = Field(None, max_length=50)
    email: str | None = Field(None, max_length=255)
    address: str | None = None
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=100)
    country: str | None = Field(None, max_length=100)
    zip_code: str | None = Field(None, max_length=20)
    is_head_office: bool | None = None
    is_active: bool | None = None
    business_id: int | None = None


class BranchOut(BranchBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    manager_name: str | None = None
    employee_count: int = 0


# --- JobTitle Schemas ---
class JobTitleBase(BaseModel):
    name: str = Field(..., max_length=255)
    short_name: str | None = Field(None, max_length=255)
    description: str | None = None
    level_rank: int = Field(5, ge=1, le=10)
    is_active: bool = True
    department_id: uuid.UUID | None = None
    business_id: int


class JobTitleCreate(JobTitleBase):
    pass


class JobTitleUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    short_name: str | None = Field(None, max_length=255)
    description: str | None = None
    level_rank: int | None = Field(None, ge=1, le=10)
    is_active: bool | None = None
    department_id: uuid.UUID | None = None
    business_id: int | None = None


class JobTitleOut(JobTitleBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# --- Department Schemas ---
class DepartmentBase(BaseModel):
    name: str = Field(..., max_length=255)
    code: str | None = Field(None, max_length=50)
    slug: str = Field(..., max_length=280)
    description: str | None = None
    is_active: bool = True
    multiple_heads_allowed: bool = False
    parent_department_id: uuid.UUID | None = None
    head_employee_id: uuid.UUID | None = None
    business_id: int | None = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    code: str | None = Field(None, max_length=50)
    slug: str | None = Field(None, max_length=280)
    description: str | None = None
    is_active: bool | None = None
    multiple_heads_allowed: bool | None = None
    parent_department_id: uuid.UUID | None = None
    head_employee_id: uuid.UUID | None = None
    business_id: int | None = None


class DepartmentOut(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    job_titles: list[JobTitleOut] = []
    parent_department_name: str | None = None
    head_employee_name: str | None = None
    employee_count: int = 0


class DepartmentTreeNode(BaseModel):
    id: uuid.UUID
    name: str
    code: str | None = None
    slug: str
    description: str | None = None
    is_active: bool = True
    head_employee_id: uuid.UUID | None = None
    head_employee_name: str | None = None
    employee_count: int = 0
    children: list["DepartmentTreeNode"] = []


# --- Organogram Schemas ---
class OrganogramEmployeeNode(BaseModel):
    id: uuid.UUID
    employee_id: str
    name: str
    work_email: str
    phone: str | None = None
    job_title: str | None = None
    level_rank: int = 5
    department: str | None = None
    department_id: uuid.UUID | None = None
    branch: str | None = None
    branch_id: uuid.UUID | None = None
    is_department_head: bool = False
    is_active: bool = True
    avatar_url: str | None = None
    direct_manager_id: uuid.UUID | None = None
    subordinate_count: int = 0
    subordinates: list["OrganogramEmployeeNode"] = []


class BranchStructureNode(BaseModel):
    branch_id: uuid.UUID
    branch_name: str
    branch_code: str
    branch_type: str
    is_head_office: bool = False
    city: str | None = None
    manager_name: str | None = None
    employee_count: int = 0
    departments: list[DepartmentTreeNode] = []
    employees: list[OrganogramEmployeeNode] = []


class OrganogramStructureTree(BaseModel):
    business_id: int
    company_name: str
    total_branches: int
    total_departments: int
    total_employees: int
    branches: list[BranchStructureNode] = []
