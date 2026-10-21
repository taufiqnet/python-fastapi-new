import enum
import uuid
from datetime import datetime, date
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID, Enum as SAEnum

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


class GenderEnum(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class BloodGroupEnum(str, enum.Enum):
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"
    O_POS = "O+"
    O_NEG = "O-"


class DiagnosticDepartmentEnum(str, enum.Enum):
    pathology = "pathology"
    biochemistry = "biochemistry"
    hematology = "hematology"
    microbiology = "microbiology"
    radiology_imaging = "radiology_imaging"
    cardiology_ecg = "cardiology_ecg"
    histopathology = "histopathology"


class ReportTemplateTypeEnum(str, enum.Enum):
    structured_parameters = "structured_parameters"
    radiology_text = "radiology_text"


class DiagnosticOrderStatusEnum(str, enum.Enum):
    ordered = "ordered"
    sample_collected = "sample_collected"
    in_lab = "in_lab"
    partially_reported = "partially_reported"
    completed = "completed"
    cancelled = "cancelled"


class SampleStatusEnum(str, enum.Enum):
    pending = "pending"
    collected = "collected"
    received = "received"
    rejected = "rejected"
    analyzed = "analyzed"


# ── 1. Patient Master (MPI / Master Patient Index) ───────────────────────────
class Patient(Base, UUIDMixin, TimestampMixin):
    """
    Master Patient Index (MPI). Unique per tenant with auto-generated UHID.
    Format: UHID-{business_id}-{year}-{sequence}
    """

    __tablename__ = "healthcare_patients"
    __table_args__ = (
        UniqueConstraint("business_id", "uhid", name="uq_patient_business_uhid"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    uhid: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(100), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[GenderEnum] = mapped_column(
        SAEnum(GenderEnum, name="patient_gender_enum"),
        default=GenderEnum.male,
        nullable=False,
    )
    blood_group: Mapped[BloodGroupEnum | None] = mapped_column(
        SAEnum(BloodGroupEnum, name="patient_blood_group_enum"),
        nullable=True,
    )
    emergency_contact_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    national_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    orders: Mapped[list["DiagnosticOrder"]] = relationship(
        "DiagnosticOrder",
        back_populates="patient",
        cascade="all, delete-orphan",
        order_by="desc(DiagnosticOrder.created_at)",
    )

    def __repr__(self) -> str:
        return f"<Patient {self.uhid} | {self.full_name}>"


# ── 2. Doctor Profiles & Chambers ───────────────────────────────────────────
class DoctorProfile(Base, UUIDMixin, TimestampMixin):
    """
    Doctors, specialists, and consultants. Can link to an HR Employee record.
    """

    __tablename__ = "doctor_profiles"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    specialization: Mapped[str] = mapped_column(String(100), nullable=False)
    medical_degrees: Mapped[str] = mapped_column(String(200), nullable=False)
    bmdc_reg_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    chamber_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    consultation_fee: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=0.0, nullable=False
    )
    follow_up_fee: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=0.0, nullable=False
    )
    contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_referral_doctor: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    referral_commission_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=0.0, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    def __repr__(self) -> str:
        return f"<DoctorProfile {self.full_name} ({self.specialization})>"


# ── 3. Diagnostic Test Master Catalog ───────────────────────────────────────
class DiagnosticTest(Base, UUIDMixin, TimestampMixin):
    """
    Catalog of laboratory tests and radiology investigations.
    """

    __tablename__ = "diagnostic_tests"
    __table_args__ = (
        UniqueConstraint("business_id", "test_code", name="uq_diagnostic_test_business_code"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    department: Mapped[DiagnosticDepartmentEnum] = mapped_column(
        SAEnum(DiagnosticDepartmentEnum, name="diagnostic_department_enum"),
        default=DiagnosticDepartmentEnum.pathology,
        nullable=False,
    )
    test_code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    category_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sample_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    cost_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    sale_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    default_turnaround_hours: Mapped[int] = mapped_column(SmallInteger, default=4, nullable=False)
    requires_fasting: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    report_template_type: Mapped[ReportTemplateTypeEnum] = mapped_column(
        SAEnum(ReportTemplateTypeEnum, name="report_template_type_enum"),
        default=ReportTemplateTypeEnum.structured_parameters,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    parameters: Mapped[list["DiagnosticTestParameter"]] = relationship(
        "DiagnosticTestParameter",
        back_populates="test",
        cascade="all, delete-orphan",
        order_by="DiagnosticTestParameter.display_order",
    )

    def __repr__(self) -> str:
        return f"<DiagnosticTest {self.test_code} - {self.name}>"


# ── 4. LIS Parameter Master (for Structured Parameter Reports) ─────────────
class DiagnosticTestParameter(Base, UUIDMixin, TimestampMixin):
    """
    Individual test analytes/parameters with reference ranges.
    """

    __tablename__ = "diagnostic_test_parameters"

    test_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("diagnostic_tests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parameter_name: Mapped[str] = mapped_column(String(100), nullable=False)
    unit: Mapped[str | None] = mapped_column(String(30), nullable=True)
    male_ref_range: Mapped[str | None] = mapped_column(String(100), nullable=True)
    female_ref_range: Mapped[str | None] = mapped_column(String(100), nullable=True)
    child_ref_range: Mapped[str | None] = mapped_column(String(100), nullable=True)
    default_formula: Mapped[str | None] = mapped_column(String(200), nullable=True)
    display_order: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)

    # Relationships
    test: Mapped["DiagnosticTest"] = relationship(
        "DiagnosticTest",
        back_populates="parameters",
    )

    def __repr__(self) -> str:
        return f"<DiagnosticTestParameter {self.parameter_name} ({self.unit})>"


# ── 5. Diagnostic Orders (Counter Billing / Booking) ────────────────────────
class DiagnosticOrder(Base, UUIDMixin, TimestampMixin):
    """
    Diagnostic bill/order placed at reception or OPD counter.
    """

    __tablename__ = "diagnostic_orders"
    __table_args__ = (
        UniqueConstraint("business_id", "order_number", name="uq_diagnostic_order_business_number"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    order_number: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("healthcare_patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    referring_doctor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("doctor_profiles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    order_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    status: Mapped[DiagnosticOrderStatusEnum] = mapped_column(
        SAEnum(DiagnosticOrderStatusEnum, name="diagnostic_order_status_enum"),
        default=DiagnosticOrderStatusEnum.ordered,
        nullable=False,
    )
    total_bill: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0.0, nullable=False
    )
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0.0, nullable=False
    )
    net_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0.0, nullable=False
    )
    paid_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0.0, nullable=False
    )
    due_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0.0, nullable=False
    )
    payment_method: Mapped[str] = mapped_column(
        String(50), default="cash", nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    patient: Mapped["Patient"] = relationship(
        "Patient",
        back_populates="orders",
        lazy="selectin",
    )
    referring_doctor: Mapped["DoctorProfile | None"] = relationship(
        "DoctorProfile",
        lazy="selectin",
    )
    items: Mapped[list["DiagnosticOrderItem"]] = relationship(
        "DiagnosticOrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    samples: Mapped[list["DiagnosticSample"]] = relationship(
        "DiagnosticSample",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<DiagnosticOrder {self.order_number} | {self.status.value}>"


# ── 6. Diagnostic Order Line Items ──────────────────────────────────────────
class DiagnosticOrderItem(Base, UUIDMixin, TimestampMixin):
    """
    Individual test item on an order.
    """

    __tablename__ = "diagnostic_order_items"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("diagnostic_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    test_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("diagnostic_tests.id", ondelete="RESTRICT"),
        nullable=False,
    )
    test_name: Mapped[str] = mapped_column(String(150), nullable=False)
    test_code: Mapped[str] = mapped_column(String(20), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    discount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.0, nullable=False)
    net_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)

    # Relationships
    order: Mapped["DiagnosticOrder"] = relationship(
        "DiagnosticOrder",
        back_populates="items",
    )
    test: Mapped["DiagnosticTest"] = relationship(
        "DiagnosticTest",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<DiagnosticOrderItem {self.test_code} - {self.test_name}>"


# ── 7. Phlebotomy & Sample Barcode Tracking ────────────────────────────────
class DiagnosticSample(Base, UUIDMixin, TimestampMixin):
    """
    Physical specimen collection tube barcode tracking.
    """

    __tablename__ = "diagnostic_samples"
    __table_args__ = (
        UniqueConstraint("business_id", "barcode", name="uq_diagnostic_sample_business_barcode"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("diagnostic_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    barcode: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    sample_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[SampleStatusEnum] = mapped_column(
        SAEnum(SampleStatusEnum, name="sample_status_enum"),
        default=SampleStatusEnum.pending,
        nullable=False,
    )
    collected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    collected_by_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    order: Mapped["DiagnosticOrder"] = relationship(
        "DiagnosticOrder",
        back_populates="samples",
    )

    def __repr__(self) -> str:
        return f"<DiagnosticSample {self.barcode} ({self.sample_type}) [{self.status.value}]>"
