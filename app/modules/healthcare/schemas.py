import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field

from app.modules.healthcare.models import (
    BloodGroupEnum,
    DiagnosticDepartmentEnum,
    DiagnosticOrderStatusEnum,
    GenderEnum,
    ReportTemplateTypeEnum,
    SampleStatusEnum,
)


# ── Patient Schemas ─────────────────────────────────────────────────────────
class PatientBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    phone: str = Field(..., min_length=7, max_length=20)
    email: str | None = Field(None, max_length=100)
    date_of_birth: date | None = None
    gender: GenderEnum = GenderEnum.male
    blood_group: BloodGroupEnum | None = None
    emergency_contact_name: str | None = Field(None, max_length=100)
    emergency_contact_phone: str | None = Field(None, max_length=20)
    address: str | None = None
    national_id: str | None = Field(None, max_length=50)
    is_active: bool = True
    business_id: int


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=150)
    phone: str | None = Field(None, min_length=7, max_length=20)
    email: str | None = Field(None, max_length=100)
    date_of_birth: date | None = None
    gender: GenderEnum | None = None
    blood_group: BloodGroupEnum | None = None
    emergency_contact_name: str | None = Field(None, max_length=100)
    emergency_contact_phone: str | None = Field(None, max_length=20)
    address: str | None = None
    national_id: str | None = Field(None, max_length=50)
    is_active: bool | None = None


class PatientOut(PatientBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    uhid: str
    created_at: datetime
    updated_at: datetime


# ── Doctor Profile Schemas ──────────────────────────────────────────────────
class DoctorProfileBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    specialization: str = Field(..., min_length=2, max_length=100)
    medical_degrees: str = Field(..., min_length=2, max_length=200)
    bmdc_reg_number: str | None = Field(None, max_length=50)
    chamber_name: str | None = Field(None, max_length=100)
    consultation_fee: Decimal = Field(Decimal("0.0"), ge=Decimal("0.0"))
    follow_up_fee: Decimal = Field(Decimal("0.0"), ge=Decimal("0.0"))
    contact_phone: str | None = Field(None, max_length=20)
    is_referral_doctor: bool = True
    referral_commission_rate: Decimal = Field(Decimal("0.0"), ge=Decimal("0.0"), le=Decimal("100.0"))
    employee_id: uuid.UUID | None = None
    is_active: bool = True
    business_id: int


class DoctorProfileCreate(DoctorProfileBase):
    pass


class DoctorProfileUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=150)
    specialization: str | None = Field(None, min_length=2, max_length=100)
    medical_degrees: str | None = Field(None, min_length=2, max_length=200)
    bmdc_reg_number: str | None = Field(None, max_length=50)
    chamber_name: str | None = Field(None, max_length=100)
    consultation_fee: Decimal | None = Field(None, ge=Decimal("0.0"))
    follow_up_fee: Decimal | None = Field(None, ge=Decimal("0.0"))
    contact_phone: str | None = Field(None, max_length=20)
    is_referral_doctor: bool | None = None
    referral_commission_rate: Decimal | None = Field(None, ge=Decimal("0.0"), le=Decimal("100.0"))
    employee_id: uuid.UUID | None = None
    is_active: bool | None = None


class DoctorProfileOut(DoctorProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# ── Diagnostic Test Parameter Schemas ───────────────────────────────────────
class DiagnosticTestParameterBase(BaseModel):
    parameter_name: str = Field(..., min_length=1, max_length=100)
    unit: str | None = Field(None, max_length=30)
    male_ref_range: str | None = Field(None, max_length=100)
    female_ref_range: str | None = Field(None, max_length=100)
    child_ref_range: str | None = Field(None, max_length=100)
    default_formula: str | None = Field(None, max_length=200)
    display_order: int = 0


class DiagnosticTestParameterCreate(DiagnosticTestParameterBase):
    pass


class DiagnosticTestParameterOut(DiagnosticTestParameterBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    test_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# ── Diagnostic Test Master Schemas ──────────────────────────────────────────
class DiagnosticTestBase(BaseModel):
    department: DiagnosticDepartmentEnum = DiagnosticDepartmentEnum.pathology
    test_code: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=2, max_length=150)
    category_name: str | None = Field(None, max_length=100)
    sample_type: str | None = Field(None, max_length=50)
    cost_price: Decimal = Field(Decimal("0.0"), ge=Decimal("0.0"))
    sale_price: Decimal = Field(Decimal("0.0"), ge=Decimal("0.0"))
    default_turnaround_hours: int = Field(4, ge=1)
    requires_fasting: bool = False
    report_template_type: ReportTemplateTypeEnum = ReportTemplateTypeEnum.structured_parameters
    is_active: bool = True
    business_id: int


class DiagnosticTestCreate(DiagnosticTestBase):
    parameters: list[DiagnosticTestParameterCreate] | None = None


class DiagnosticTestUpdate(BaseModel):
    department: DiagnosticDepartmentEnum | None = None
    test_code: str | None = Field(None, min_length=1, max_length=20)
    name: str | None = Field(None, min_length=2, max_length=150)
    category_name: str | None = Field(None, max_length=100)
    sample_type: str | None = Field(None, max_length=50)
    cost_price: Decimal | None = Field(None, ge=Decimal("0.0"))
    sale_price: Decimal | None = Field(None, ge=Decimal("0.0"))
    default_turnaround_hours: int | None = Field(None, ge=1)
    requires_fasting: bool | None = None
    report_template_type: ReportTemplateTypeEnum | None = None
    is_active: bool | None = None


class DiagnosticTestOut(DiagnosticTestBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    parameters: list[DiagnosticTestParameterOut] = []
    created_at: datetime
    updated_at: datetime


# ── Sample Schemas ──────────────────────────────────────────────────────────
class DiagnosticSampleCollect(BaseModel):
    collected_by_name: str = Field(..., min_length=2, max_length=100)
    notes: str | None = Field(None, max_length=255)


class DiagnosticSampleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    order_id: uuid.UUID
    barcode: str
    sample_type: str
    status: SampleStatusEnum
    collected_at: datetime | None = None
    collected_by_name: str | None = None
    notes: str | None = None
    created_at: datetime


# ── Diagnostic Order Line Item Schemas ──────────────────────────────────────
class DiagnosticOrderItemCreate(BaseModel):
    test_id: uuid.UUID
    discount: Decimal = Field(Decimal("0.0"), ge=Decimal("0.0"))


class DiagnosticOrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    test_id: uuid.UUID
    test_name: str
    test_code: str
    unit_price: Decimal
    discount: Decimal
    net_price: Decimal
    status: str
    created_at: datetime


# ── Diagnostic Order (Billing / Booking) Schemas ───────────────────────────
class DiagnosticCheckoutItem(BaseModel):
    test_id: uuid.UUID
    discount: Decimal = Field(Decimal("0.0"), ge=Decimal("0.0"))


class DiagnosticCheckoutRequest(BaseModel):
    business_id: int
    patient_id: uuid.UUID
    referring_doctor_id: uuid.UUID | None = None
    items: list[DiagnosticCheckoutItem] = Field(..., min_length=1)
    paid_amount: Decimal = Field(Decimal("0.0"), ge=Decimal("0.0"))
    payment_method: str = Field("cash", max_length=50)
    notes: str | None = None


class DiagnosticOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    order_number: str
    patient_id: uuid.UUID
    referring_doctor_id: uuid.UUID | None = None
    order_date: datetime
    status: DiagnosticOrderStatusEnum
    total_bill: Decimal
    discount_amount: Decimal
    net_amount: Decimal
    paid_amount: Decimal
    due_amount: Decimal
    payment_method: str
    notes: str | None = None
    patient: PatientOut | None = None
    referring_doctor: DoctorProfileOut | None = None
    items: list[DiagnosticOrderItemOut] = []
    samples: list[DiagnosticSampleOut] = []
    created_at: datetime
    updated_at: datetime
