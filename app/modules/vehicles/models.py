import enum
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, List, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID

from app.common.models import TimestampMixin, UUIDMixin
from app.core.identity.models import User
from app.database import Base


# ===========================================================================
# Enums
# ===========================================================================
class VehicleType(str, enum.Enum):
    SEDAN = "sedan"
    SUV = "suv"
    MICROBUS = "microbus"
    PICKUP = "pickup"
    COVERED_VAN = "covered_van"
    PRIME_MOVER = "prime_mover"
    HEAVY_TRUCK = "heavy_truck"
    MOTORCYCLE = "motorcycle"
    CNG_AUTO = "cng_auto"
    ELECTRIC_VAN = "electric_van"
    AMBULANCE = "ambulance"
    BUS = "bus"


class VehicleFuelType(str, enum.Enum):
    OCTANE = "octane"
    DIESEL = "diesel"
    PETROL = "petrol"
    CNG = "cng"
    LPG = "lpg"
    HYBRID_OCTANE = "hybrid_octane"
    ELECTRIC = "electric"


class VehicleOwnershipType(str, enum.Enum):
    COMPANY_OWNED = "company_owned"
    LEASED = "leased"
    RENTED_VENDOR = "rented_vendor"
    EMPLOYEE_OWNED = "employee_owned"


class VehicleStatus(str, enum.Enum):
    AVAILABLE = "available"
    ON_TRIP = "on_trip"
    UNDER_MAINTENANCE = "under_maintenance"
    OUT_OF_SERVICE = "out_of_service"
    DECOMMISSIONED = "decommissioned"


class DriverLicenseGrade(str, enum.Enum):
    LIGHT = "light"
    MEDIUM = "medium"
    HEAVY = "heavy"
    MOTORCYCLE = "motorcycle"
    PSV = "psv"


class DriverStatus(str, enum.Enum):
    ACTIVE = "active"
    ON_DUTY = "on_duty"
    ON_LEAVE = "on_leave"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"


class RequisitionPriority(str, enum.Enum):
    ROUTINE = "routine"
    URGENT = "urgent"
    EXECUTIVE = "executive"


class RequisitionStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    ALLOCATED = "allocated"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TripStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class FuelPaymentMode(str, enum.Enum):
    COMPANY_FUEL_CARD = "company_fuel_card"
    DRIVER_CASH = "driver_cash"
    VENDOR_CREDIT_SLIP = "vendor_credit_slip"
    PETTY_CASH = "petty_cash"


class MaintenanceType(str, enum.Enum):
    SCHEDULED_PREVENTIVE = "scheduled_preventive"
    CORRECTIVE_BREAKDOWN = "corrective_breakdown"
    ACCIDENT_REPAIR = "accident_repair"
    TIRE_REPLACEMENT = "tire_replacement"
    BATTERY_SERVICE = "battery_service"
    AC_SERVICING = "ac_servicing"


class WorkOrderPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class WorkOrderStatus(str, enum.Enum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TirePosition(str, enum.Enum):
    FRONT_LEFT = "front_left"
    FRONT_RIGHT = "front_right"
    REAR_LEFT = "rear_left"
    REAR_RIGHT = "rear_right"
    REAR_INNER_LEFT = "rear_inner_left"
    REAR_INNER_RIGHT = "rear_inner_right"
    SPARE = "spare"


class TireStatus(str, enum.Enum):
    IN_SERVICE = "in_service"
    ROTATED = "rotated"
    RETREADED = "retreaded"
    SCRAPPED = "scrapped"


class IncidentType(str, enum.Enum):
    ACCIDENT = "accident"
    TRAFFIC_FINE_CHALLAN = "traffic_fine_challan"
    THEFT_ATTEMPT = "theft_attempt"
    BREAKDOWN = "breakdown"


class InsuranceClaimStatus(str, enum.Enum):
    NOT_APPLICABLE = "not_applicable"
    SUBMITTED = "submitted"
    SURVEY_IN_PROGRESS = "survey_in_progress"
    APPROVED_SETTLED = "approved_settled"
    REJECTED = "rejected"


class TelematicsEventType(str, enum.Enum):
    LOCATION_PING = "location_ping"
    HARSH_ACCELERATION = "harsh_acceleration"
    HARSH_BRAKING = "harsh_braking"
    OVERSPEED_ALERT = "overspeed_alert"
    IDLE_EXCEEDED = "idle_exceeded"
    GEOFENCE_BREACH = "geofence_breach"
    SOS_PANIC = "sos_panic"


# ===========================================================================
# 1. fleet_vehicles
# ===========================================================================
class Vehicle(Base, UUIDMixin, TimestampMixin):
    """Corporate fleet vehicle register."""

    __tablename__ = "fleet_vehicles"
    __table_args__ = (
        UniqueConstraint("business_id", "vehicle_number", name="uq_fleet_vehicle_biz_number"),
        Index("ix_fleet_vehicles_biz_status", "business_id", "status"),
        Index("ix_fleet_vehicles_biz_fitness", "business_id", "brta_fitness_expiry_date"),
        Index("ix_fleet_vehicles_biz_tax", "business_id", "brta_tax_token_expiry_date"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Registration format e.g. "Dhaka Metro-Ga 23-4567"
    vehicle_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    vehicle_type: Mapped[VehicleType] = mapped_column(
        Enum(VehicleType), default=VehicleType.SEDAN, nullable=False
    )
    brand_make: Mapped[str] = mapped_column(String(100), nullable=False)  # Toyota, Mitsubishi, Tata
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)  # HiAce, Axio, L200
    model_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    chassis_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    engine_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    seating_capacity: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    payload_capacity_kg: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    fuel_type: Mapped[VehicleFuelType] = mapped_column(
        Enum(VehicleFuelType), default=VehicleFuelType.OCTANE, nullable=False
    )
    cng_cylinder_capacity_liters: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 2), nullable=True
    )
    cng_last_test_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    cng_test_expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    current_odometer_km: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.0"), nullable=False
    )
    ownership_type: Mapped[VehicleOwnershipType] = mapped_column(
        Enum(VehicleOwnershipType), default=VehicleOwnershipType.COMPANY_OWNED, nullable=False
    )
    status: Mapped[VehicleStatus] = mapped_column(
        Enum(VehicleStatus), default=VehicleStatus.AVAILABLE, nullable=False
    )
    assigned_driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fleet_drivers.id", ondelete="SET NULL"),
        nullable=True,
    )
    default_depot: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Statutory Renewals (BRTA & Insurance)
    brta_fitness_expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    brta_tax_token_expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    brta_route_permit_expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    insurance_policy_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    insurance_company: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    insurance_expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    assigned_driver: Mapped[Optional["Driver"]] = relationship(
        "Driver", foreign_keys=[assigned_driver_id], back_populates="assigned_vehicles"
    )
    trip_logs: Mapped[List["TripLog"]] = relationship(
        "TripLog", back_populates="vehicle", cascade="all, delete-orphan"
    )
    fuel_logs: Mapped[List["FuelLog"]] = relationship(
        "FuelLog", back_populates="vehicle", cascade="all, delete-orphan"
    )
    work_orders: Mapped[List["WorkOrder"]] = relationship(
        "WorkOrder", back_populates="vehicle", cascade="all, delete-orphan"
    )
    tire_logs: Mapped[List["TireLog"]] = relationship(
        "TireLog", back_populates="vehicle", cascade="all, delete-orphan"
    )
    incident_reports: Mapped[List["IncidentReport"]] = relationship(
        "IncidentReport", back_populates="vehicle", cascade="all, delete-orphan"
    )


# ===========================================================================
# 2. fleet_drivers
# ===========================================================================
class Driver(Base, UUIDMixin, TimestampMixin):
    """Driver profiles, licenses, and safety scores."""

    __tablename__ = "fleet_drivers"
    __table_args__ = (
        UniqueConstraint("business_id", "license_number", name="uq_fleet_driver_biz_license"),
        Index("ix_fleet_drivers_biz_status", "business_id", "status"),
        Index("ix_fleet_drivers_biz_lic_exp", "business_id", "license_expiry_date"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    emergency_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    nid_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    license_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    license_grade: Mapped[DriverLicenseGrade] = mapped_column(
        Enum(DriverLicenseGrade), default=DriverLicenseGrade.LIGHT, nullable=False
    )
    license_expiry_date: Mapped[date] = mapped_column(Date, nullable=False)
    blood_group: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    joining_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[DriverStatus] = mapped_column(
        Enum(DriverStatus), default=DriverStatus.ACTIVE, nullable=False
    )
    safety_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("100.00"), nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    assigned_vehicles: Mapped[List["Vehicle"]] = relationship(
        "Vehicle", foreign_keys=[Vehicle.assigned_driver_id], back_populates="assigned_driver"
    )
    trip_logs: Mapped[List["TripLog"]] = relationship("TripLog", back_populates="driver")


# ===========================================================================
# 3. fleet_vehicle_requisitions
# ===========================================================================
class VehicleRequisition(Base, UUIDMixin, TimestampMixin):
    """Pool car requisition & employee movement bookings."""

    __tablename__ = "fleet_vehicle_requisitions"
    __table_args__ = (
        UniqueConstraint("business_id", "requisition_number", name="uq_fleet_req_biz_number"),
        Index("ix_fleet_req_biz_status", "business_id", "status"),
        Index("ix_fleet_req_biz_time", "business_id", "start_datetime", "estimated_end_datetime"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    requisition_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    requester_employee_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=True,
    )
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    purpose: Mapped[str] = mapped_column(Text, nullable=False)
    destination: Mapped[str] = mapped_column(String(255), nullable=False)
    start_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    estimated_end_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    passenger_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    priority: Mapped[RequisitionPriority] = mapped_column(
        Enum(RequisitionPriority), default=RequisitionPriority.ROUTINE, nullable=False
    )
    status: Mapped[RequisitionStatus] = mapped_column(
        Enum(RequisitionStatus), default=RequisitionStatus.DRAFT, nullable=False
    )
    approved_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    allocated_vehicle_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("fleet_vehicles.id", ondelete="SET NULL"), nullable=True
    )
    allocated_driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("fleet_drivers.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    allocated_vehicle: Mapped[Optional["Vehicle"]] = relationship(
        "Vehicle", foreign_keys=[allocated_vehicle_id]
    )
    allocated_driver: Mapped[Optional["Driver"]] = relationship(
        "Driver", foreign_keys=[allocated_driver_id]
    )


# ===========================================================================
# 4. fleet_trip_logs
# ===========================================================================
class TripLog(Base, UUIDMixin, TimestampMixin):
    """Trip sheet with start/end odometer readings, route, and tolls."""

    __tablename__ = "fleet_trip_logs"
    __table_args__ = (
        UniqueConstraint("business_id", "trip_number", name="uq_fleet_trip_biz_number"),
        Index("ix_fleet_trip_biz_status", "business_id", "status"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    trip_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    requisition_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fleet_vehicle_requisitions.id", ondelete="SET NULL"),
        nullable=True,
    )
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fleet_vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fleet_drivers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    start_odometer_km: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    end_odometer_km: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    distance_covered_km: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    toll_expenses: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0.00"), nullable=False
    )
    toll_receipt_urls: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    fuel_consumed_estimate_liters: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(8, 2), nullable=True
    )
    driver_trip_allowance_da: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0.00"), nullable=False
    )
    status: Mapped[TripStatus] = mapped_column(
        Enum(TripStatus), default=TripStatus.IN_PROGRESS, nullable=False
    )
    route_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="trip_logs")
    driver: Mapped["Driver"] = relationship("Driver", back_populates="trip_logs")
    requisition: Mapped[Optional["VehicleRequisition"]] = relationship("VehicleRequisition")


# ===========================================================================
# 5. fleet_fuel_logs
# ===========================================================================
class FuelLog(Base, UUIDMixin, TimestampMixin):
    """Fuel refills, energy logs, and efficiency metrics."""

    __tablename__ = "fleet_fuel_logs"
    __table_args__ = (
        Index("ix_fleet_fuel_biz_vehicle", "business_id", "vehicle_id", "logged_at"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fleet_vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fleet_drivers.id", ondelete="SET NULL"),
        nullable=True,
    )
    logged_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    odometer_at_fueling: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    fuel_type: Mapped[VehicleFuelType] = mapped_column(
        Enum(VehicleFuelType), default=VehicleFuelType.OCTANE, nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)  # Liters or m3
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)  # BDT
    total_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)  # BDT
    filling_station_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    payment_mode: Mapped[FuelPaymentMode] = mapped_column(
        Enum(FuelPaymentMode), default=FuelPaymentMode.COMPANY_FUEL_CARD, nullable=False
    )
    fuel_card_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    slip_receipt_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    calculated_km_per_liter: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True)
    is_anomaly_flagged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="fuel_logs")
    driver: Mapped[Optional["Driver"]] = relationship("Driver")


# ===========================================================================
# 6. fleet_maintenance_schedules
# ===========================================================================
class MaintenanceSchedule(Base, UUIDMixin, TimestampMixin):
    """Preventative maintenance rules (usage or calendar based)."""

    __tablename__ = "fleet_maintenance_schedules"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)  # e.g. Engine Oil Service (5,000 km)
    vehicle_type: Mapped[str] = mapped_column(String(50), default="all", nullable=False)
    interval_odometer_km: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    interval_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


# ===========================================================================
# 7. fleet_work_orders
# ===========================================================================
class WorkOrder(Base, UUIDMixin, TimestampMixin):
    """Maintenance work orders and workshop repair bills."""

    __tablename__ = "fleet_work_orders"
    __table_args__ = (
        UniqueConstraint("business_id", "work_order_number", name="uq_fleet_wo_biz_number"),
        Index("ix_fleet_wo_biz_status", "business_id", "status"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    work_order_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fleet_vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    maintenance_type: Mapped[MaintenanceType] = mapped_column(
        Enum(MaintenanceType), default=MaintenanceType.SCHEDULED_PREVENTIVE, nullable=False
    )
    priority: Mapped[WorkOrderPriority] = mapped_column(
        Enum(WorkOrderPriority), default=WorkOrderPriority.MEDIUM, nullable=False
    )
    odometer_at_service: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    service_vendor_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    total_labor_cost: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    total_parts_cost: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    total_cost: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    status: Mapped[WorkOrderStatus] = mapped_column(
        Enum(WorkOrderStatus), default=WorkOrderStatus.DRAFT, nullable=False
    )
    tasks_performed: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    invoice_receipt_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="work_orders")


# ===========================================================================
# 8. fleet_tire_logs
# ===========================================================================
class TireLog(Base, UUIDMixin, TimestampMixin):
    """Tire tracking, rotation, and tread depth logs."""

    __tablename__ = "fleet_tire_logs"
    __table_args__ = (
        Index("ix_fleet_tires_biz_vehicle", "business_id", "vehicle_id"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fleet_vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tire_serial_number: Mapped[str] = mapped_column(String(100), nullable=False)
    brand_and_size: Mapped[str] = mapped_column(String(100), nullable=False)  # Bridgestone 195/65 R15
    position: Mapped[TirePosition] = mapped_column(Enum(TirePosition), nullable=False)
    installed_date: Mapped[date] = mapped_column(Date, nullable=False)
    installed_odometer_km: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tread_depth_mm: Mapped[Decimal] = mapped_column(
        Numeric(4, 1), default=Decimal("8.0"), nullable=False
    )
    status: Mapped[TireStatus] = mapped_column(
        Enum(TireStatus), default=TireStatus.IN_SERVICE, nullable=False
    )

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="tire_logs")


# ===========================================================================
# 9. fleet_incident_reports
# ===========================================================================
class IncidentReport(Base, UUIDMixin, TimestampMixin):
    """Accident reports, police GD, challans/fines, and insurance claims."""

    __tablename__ = "fleet_incident_reports"
    __table_args__ = (
        UniqueConstraint("business_id", "incident_number", name="uq_fleet_inc_biz_number"),
        Index("ix_fleet_inc_biz_vehicle", "business_id", "vehicle_id"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    incident_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fleet_vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fleet_drivers.id", ondelete="SET NULL"),
        nullable=True,
    )
    incident_type: Mapped[IncidentType] = mapped_column(
        Enum(IncidentType), default=IncidentType.ACCIDENT, nullable=False
    )
    incident_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    location_description: Mapped[str] = mapped_column(String(255), nullable=False)
    police_station_thana: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    police_gd_or_case_no: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    fine_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0.00"), nullable=False
    )
    estimated_damage_cost: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    insurance_claim_filed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    insurance_claim_status: Mapped[InsuranceClaimStatus] = mapped_column(
        Enum(InsuranceClaimStatus), default=InsuranceClaimStatus.NOT_APPLICABLE, nullable=False
    )
    settled_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    photos: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="incident_reports")
    driver: Mapped[Optional["Driver"]] = relationship("Driver")


# ===========================================================================
# 10. fleet_telematics_events
# ===========================================================================
class TelematicsEvent(Base, UUIDMixin, TimestampMixin):
    """IoT GPS sensor readings, speed, and geofence alerts."""

    __tablename__ = "fleet_telematics_events"
    __table_args__ = (
        Index("ix_fleet_telem_biz_vehicle_time", "business_id", "vehicle_id", "timestamp"),
    )

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fleet_vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    device_imei: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    latitude: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    speed_kmh: Mapped[Decimal] = mapped_column(Numeric(5, 1), default=Decimal("0.0"), nullable=False)
    engine_ignition: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    odometer_reading: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    event_type: Mapped[TelematicsEventType] = mapped_column(
        Enum(TelematicsEventType), default=TelematicsEventType.LOCATION_PING, nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
