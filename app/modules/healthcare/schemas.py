import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field

from app.modules.healthcare.models import (
    AppointmentStatusEnum,
    BloodGroupEnum,
    CommissionStatusEnum,
    DayOfWeekEnum,
    DiagnosticDepartmentEnum,
    DiagnosticOrderStatusEnum,
    GenderEnum,
    ReportTemplateTypeEnum,
    ResultStatusEnum,
    SampleStatusEnum,
    VisitTypeEnum,
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


# ── Doctor OPD Schedule Slot Schemas ────────────────────────────────────────
class DoctorScheduleSlotBase(BaseModel):
    doctor_id: uuid.UUID
    day_of_week: DayOfWeekEnum
    start_time: str = Field(..., max_length=10)
    end_time: str = Field(..., max_length=10)
    max_patients: int = Field(30, ge=1)
    slot_duration_minutes: int = Field(15, ge=1)
    is_active: bool = True
    business_id: int


class DoctorScheduleSlotCreate(DoctorScheduleSlotBase):
    pass


class DoctorScheduleSlotOut(DoctorScheduleSlotBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime


# ── OPD Appointment Schemas ────────────────────────────────────────────────
class AppointmentBase(BaseModel):
    business_id: int
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    appointment_date: date
    scheduled_time: str | None = Field(None, max_length=10)
    visit_type: VisitTypeEnum = VisitTypeEnum.new
    consultation_fee: Decimal = Field(Decimal("0.0"), ge=Decimal("0.0"))
    is_paid: bool = False
    chief_complaints: str | None = None
    notes: str | None = None


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    status: AppointmentStatusEnum | None = None
    scheduled_time: str | None = None
    is_paid: bool | None = None
    chief_complaints: str | None = None
    notes: str | None = None


class AppointmentOut(AppointmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    serial_number: int
    status: AppointmentStatusEnum
    patient: PatientOut | None = None
    doctor: DoctorProfileOut | None = None
    created_at: datetime
    updated_at: datetime


# ── Prescription (EMR) Schemas ─────────────────────────────────────────────
class MedicineItem(BaseModel):
    drug_name: str
    dosage_form: str = "Tablet"
    strength: str | None = None
    frequency: str = "1+0+1"
    timing: str = "After meal"
    duration: str = "5 days"
    instructions: str | None = None


class VitalsData(BaseModel):
    bp_systolic: int | None = None
    bp_diastolic: int | None = None
    pulse: int | None = None
    temperature: float | None = None
    spo2: int | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    bmi: float | None = None


class PrescriptionBase(BaseModel):
    business_id: int
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    appointment_id: uuid.UUID | None = None
    vitals: dict = Field(default_factory=dict)
    clinical_findings: str | None = None
    provisional_diagnosis: str | None = None
    medicines: list[dict] = Field(default_factory=list)
    advised_investigations: list[str] = Field(default_factory=list)
    special_advice: str | None = None
    follow_up_date: date | None = None


class PrescriptionCreate(PrescriptionBase):
    pass


class PrescriptionUpdate(BaseModel):
    vitals: dict | None = None
    clinical_findings: str | None = None
    provisional_diagnosis: str | None = None
    medicines: list[dict] | None = None
    advised_investigations: list[str] | None = None
    special_advice: str | None = None
    follow_up_date: date | None = None


class PrescriptionOut(PrescriptionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    prescription_number: str
    patient: PatientOut | None = None
    doctor: DoctorProfileOut | None = None
    appointment: AppointmentOut | None = None
    created_at: datetime
    updated_at: datetime


# ── Laboratory Information System (LIS) Schemas ─────────────────────────────
class LabResultBatchEntryItem(BaseModel):
    parameter_id: uuid.UUID | None = None
    parameter_name: str
    observed_value: str
    unit: str | None = None
    ref_range: str | None = None
    is_abnormal: bool = False
    is_critical: bool = False
    remarks: str | None = None


class LabResultBatchRequest(BaseModel):
    business_id: int
    order_item_id: uuid.UUID
    technician_name: str | None = None
    results: list[LabResultBatchEntryItem] = Field(..., min_length=1)


class LabVerificationRequest(BaseModel):
    verified_by_name: str
    remarks: str | None = None


class LabTestResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    order_id: uuid.UUID
    order_item_id: uuid.UUID
    parameter_id: uuid.UUID | None = None
    parameter_name: str
    observed_value: str
    unit: str | None = None
    ref_range: str | None = None
    is_abnormal: bool
    is_critical: bool
    result_status: ResultStatusEnum
    technician_name: str | None = None
    verified_by_name: str | None = None
    verified_at: datetime | None = None
    remarks: str | None = None
    created_at: datetime


# ── Radiology Report Schemas ────────────────────────────────────────────────
class RadiologyReportCreate(BaseModel):
    business_id: int
    order_id: uuid.UUID
    order_item_id: uuid.UUID
    clinical_history: str | None = None
    findings_text: str
    impression_text: str
    verified_by_name: str | None = None
    report_url: str | None = None


class RadiologyReportUpdate(BaseModel):
    clinical_history: str | None = None
    findings_text: str | None = None
    impression_text: str | None = None
    verified_by_name: str | None = None
    report_url: str | None = None


class RadiologyReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    order_id: uuid.UUID
    order_item_id: uuid.UUID
    clinical_history: str | None = None
    findings_text: str
    impression_text: str
    verified_by_name: str | None = None
    verified_at: datetime | None = None
    report_url: str | None = None
    created_at: datetime


# ── Referring Doctor Commission Schemas ─────────────────────────────────────
class ReferralDoctorCommissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int
    referring_doctor_id: uuid.UUID
    order_id: uuid.UUID
    bill_amount: Decimal
    commission_rate: Decimal
    commission_amount: Decimal
    payment_status: CommissionStatusEnum
    paid_at: datetime | None = None
    payment_reference: str | None = None
    notes: str | None = None
    referring_doctor: DoctorProfileOut | None = None
    created_at: datetime


class ReferralPayoutRequest(BaseModel):
    payment_reference: str
    notes: str | None = None
