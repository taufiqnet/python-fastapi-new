import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.modules.vehicles.models import (
    DriverLicenseGrade,
    DriverStatus,
    FuelPaymentMode,
    IncidentType,
    InsuranceClaimStatus,
    MaintenanceType,
    RequisitionPriority,
    RequisitionStatus,
    TelematicsEventType,
    TirePosition,
    TireStatus,
    TripStatus,
    VehicleFuelType,
    VehicleOwnershipType,
    VehicleStatus,
    VehicleType,
    WorkOrderPriority,
    WorkOrderStatus,
)


# ===========================================================================
# 1. Vehicle Schemas
# ===========================================================================
class VehicleBase(BaseModel):
    vehicle_number: str = Field(..., max_length=50, description="BRTA Reg number e.g. Dhaka Metro-Ga 23-4567")
    vehicle_type: VehicleType = VehicleType.SEDAN
    brand_make: str = Field(..., max_length=100)
    model_name: str = Field(..., max_length=100)
    model_year: Optional[int] = None
    chassis_number: Optional[str] = Field(None, max_length=100)
    engine_number: Optional[str] = Field(None, max_length=100)
    color: Optional[str] = Field(None, max_length=50)
    seating_capacity: int = Field(4, ge=1)
    payload_capacity_kg: Optional[Decimal] = None
    fuel_type: VehicleFuelType = VehicleFuelType.OCTANE
    cng_cylinder_capacity_liters: Optional[Decimal] = None
    cng_last_test_date: Optional[date] = None
    cng_test_expiry_date: Optional[date] = None
    current_odometer_km: Decimal = Field(Decimal("0.0"), ge=0)
    ownership_type: VehicleOwnershipType = VehicleOwnershipType.COMPANY_OWNED
    status: VehicleStatus = VehicleStatus.AVAILABLE
    assigned_driver_id: Optional[uuid.UUID] = None
    default_depot: Optional[str] = Field(None, max_length=100)

    # Statutory renewals
    brta_fitness_expiry_date: Optional[date] = None
    brta_tax_token_expiry_date: Optional[date] = None
    brta_route_permit_expiry_date: Optional[date] = None
    insurance_policy_number: Optional[str] = Field(None, max_length=100)
    insurance_company: Optional[str] = Field(None, max_length=100)
    insurance_expiry_date: Optional[date] = None
    is_active: bool = True


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    vehicle_number: Optional[str] = Field(None, max_length=50)
    vehicle_type: Optional[VehicleType] = None
    brand_make: Optional[str] = Field(None, max_length=100)
    model_name: Optional[str] = Field(None, max_length=100)
    model_year: Optional[int] = None
    chassis_number: Optional[str] = Field(None, max_length=100)
    engine_number: Optional[str] = Field(None, max_length=100)
    color: Optional[str] = Field(None, max_length=50)
    seating_capacity: Optional[int] = Field(None, ge=1)
    payload_capacity_kg: Optional[Decimal] = None
    fuel_type: Optional[VehicleFuelType] = None
    cng_cylinder_capacity_liters: Optional[Decimal] = None
    cng_last_test_date: Optional[date] = None
    cng_test_expiry_date: Optional[date] = None
    current_odometer_km: Optional[Decimal] = None
    ownership_type: Optional[VehicleOwnershipType] = None
    status: Optional[VehicleStatus] = None
    assigned_driver_id: Optional[uuid.UUID] = None
    default_depot: Optional[str] = None
    brta_fitness_expiry_date: Optional[date] = None
    brta_tax_token_expiry_date: Optional[date] = None
    brta_route_permit_expiry_date: Optional[date] = None
    insurance_policy_number: Optional[str] = None
    insurance_company: Optional[str] = None
    insurance_expiry_date: Optional[date] = None
    is_active: Optional[bool] = None


class DriverMiniOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    full_name: str
    phone: str
    license_number: str
    status: DriverStatus


class VehicleOut(VehicleBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    business_id: int
    created_at: datetime
    updated_at: datetime
    assigned_driver: Optional[DriverMiniOut] = None


# ===========================================================================
# 2. Driver Schemas
# ===========================================================================
class DriverBase(BaseModel):
    employee_id: Optional[uuid.UUID] = None
    full_name: str = Field(..., max_length=150)
    phone: str = Field(..., max_length=20)
    emergency_phone: Optional[str] = Field(None, max_length=20)
    nid_number: Optional[str] = Field(None, max_length=50)
    license_number: str = Field(..., max_length=50)
    license_grade: DriverLicenseGrade = DriverLicenseGrade.LIGHT
    license_expiry_date: date
    blood_group: Optional[str] = Field(None, max_length=10)
    joining_date: Optional[date] = None
    status: DriverStatus = DriverStatus.ACTIVE
    safety_score: Decimal = Field(Decimal("100.00"), ge=0, le=100)
    notes: Optional[str] = None


class DriverCreate(DriverBase):
    pass


class DriverUpdate(BaseModel):
    employee_id: Optional[uuid.UUID] = None
    full_name: Optional[str] = Field(None, max_length=150)
    phone: Optional[str] = Field(None, max_length=20)
    emergency_phone: Optional[str] = Field(None, max_length=20)
    nid_number: Optional[str] = Field(None, max_length=50)
    license_number: Optional[str] = Field(None, max_length=50)
    license_grade: Optional[DriverLicenseGrade] = None
    license_expiry_date: Optional[date] = None
    blood_group: Optional[str] = Field(None, max_length=10)
    joining_date: Optional[date] = None
    status: Optional[DriverStatus] = None
    safety_score: Optional[Decimal] = None
    notes: Optional[str] = None


class DriverOut(DriverBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    business_id: int
    created_at: datetime
    updated_at: datetime


# ===========================================================================
# 3. Document Expiry Alerts
# ===========================================================================
class ExpiryAlertItem(BaseModel):
    category: str  # "brta_fitness", "brta_tax_token", "cng_test", "insurance", "driver_license"
    entity_id: uuid.UUID
    entity_name: str  # vehicle_number or driver name
    identifier: str  # registration or license no
    expiry_date: date
    days_remaining: int
    status: str  # "expired", "urgent", "warning"


class ExpiryAlertsReportOut(BaseModel):
    total_alerts: int
    expired_count: int
    expiring_soon_count: int  # within 30 days
    alerts: List[ExpiryAlertItem]


# ===========================================================================
# 4. Vehicle Requisitions
# ===========================================================================
class RequisitionBase(BaseModel):
    requester_employee_id: Optional[uuid.UUID] = None
    department: Optional[str] = Field(None, max_length=100)
    purpose: str = Field(..., min_length=3)
    destination: str = Field(..., min_length=2, max_length=255)
    start_datetime: datetime
    estimated_end_datetime: datetime
    passenger_count: int = Field(1, ge=1)
    priority: RequisitionPriority = RequisitionPriority.ROUTINE


class RequisitionCreate(RequisitionBase):
    pass


class RequisitionUpdate(BaseModel):
    purpose: Optional[str] = None
    destination: Optional[str] = None
    start_datetime: Optional[datetime] = None
    estimated_end_datetime: Optional[datetime] = None
    passenger_count: Optional[int] = None
    priority: Optional[RequisitionPriority] = None


class RequisitionApproval(BaseModel):
    approved: bool
    rejection_reason: Optional[str] = None


class RequisitionDispatch(BaseModel):
    allocated_vehicle_id: uuid.UUID
    allocated_driver_id: uuid.UUID


class RequisitionOut(RequisitionBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    business_id: int
    requisition_number: str
    status: RequisitionStatus
    approved_by_id: Optional[int] = None
    allocated_vehicle_id: Optional[uuid.UUID] = None
    allocated_driver_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime


# ===========================================================================
# 5. Trip Logs
# ===========================================================================
class TripStart(BaseModel):
    requisition_id: Optional[uuid.UUID] = None
    vehicle_id: uuid.UUID
    driver_id: uuid.UUID
    start_time: datetime
    start_odometer_km: Decimal = Field(..., ge=0)
    route_summary: Optional[str] = None
    remarks: Optional[str] = None


class TripComplete(BaseModel):
    end_time: datetime
    end_odometer_km: Decimal = Field(..., ge=0)
    toll_expenses: Decimal = Field(Decimal("0.00"), ge=0)
    toll_receipt_urls: Optional[List[str]] = None
    fuel_consumed_estimate_liters: Optional[Decimal] = None
    driver_trip_allowance_da: Decimal = Field(Decimal("0.00"), ge=0)
    remarks: Optional[str] = None


class TripOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    business_id: int
    trip_number: str
    requisition_id: Optional[uuid.UUID] = None
    vehicle_id: uuid.UUID
    driver_id: uuid.UUID
    start_time: datetime
    end_time: Optional[datetime] = None
    start_odometer_km: Decimal
    end_odometer_km: Optional[Decimal] = None
    distance_covered_km: Optional[Decimal] = None
    toll_expenses: Decimal
    toll_receipt_urls: Optional[Any] = None
    fuel_consumed_estimate_liters: Optional[Decimal] = None
    driver_trip_allowance_da: Decimal
    status: TripStatus
    route_summary: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ===========================================================================
# 6. Fuel Logs
# ===========================================================================
class FuelLogCreate(BaseModel):
    vehicle_id: uuid.UUID
    driver_id: Optional[uuid.UUID] = None
    logged_at: datetime
    odometer_at_fueling: Decimal = Field(..., ge=0)
    fuel_type: VehicleFuelType = VehicleFuelType.OCTANE
    quantity: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(..., gt=0)
    filling_station_name: Optional[str] = Field(None, max_length=150)
    payment_mode: FuelPaymentMode = FuelPaymentMode.COMPANY_FUEL_CARD
    fuel_card_number: Optional[str] = Field(None, max_length=50)
    slip_receipt_url: Optional[str] = Field(None, max_length=255)


class FuelLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    business_id: int
    vehicle_id: uuid.UUID
    driver_id: Optional[uuid.UUID] = None
    logged_at: datetime
    odometer_at_fueling: Decimal
    fuel_type: VehicleFuelType
    quantity: Decimal
    unit_price: Decimal
    total_cost: Decimal
    filling_station_name: Optional[str] = None
    payment_mode: FuelPaymentMode
    fuel_card_number: Optional[str] = None
    slip_receipt_url: Optional[str] = None
    calculated_km_per_liter: Optional[Decimal] = None
    is_anomaly_flagged: bool
    created_at: datetime


# ===========================================================================
# 7. Preventative Maintenance & Work Orders
# ===========================================================================
class MaintenanceScheduleCreate(BaseModel):
    title: str = Field(..., max_length=150)
    vehicle_type: str = "all"
    interval_odometer_km: Optional[int] = Field(None, ge=500)
    interval_days: Optional[int] = Field(None, ge=1)
    description: Optional[str] = None
    is_active: bool = True


class MaintenanceScheduleOut(MaintenanceScheduleCreate):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    business_id: int
    created_at: datetime


class WorkOrderCreate(BaseModel):
    vehicle_id: uuid.UUID
    maintenance_type: MaintenanceType = MaintenanceType.SCHEDULED_PREVENTIVE
    priority: WorkOrderPriority = WorkOrderPriority.MEDIUM
    odometer_at_service: Optional[Decimal] = None
    service_vendor_name: Optional[str] = Field(None, max_length=150)
    issued_at: datetime
    total_labor_cost: Decimal = Field(Decimal("0.00"), ge=0)
    total_parts_cost: Decimal = Field(Decimal("0.00"), ge=0)
    tasks_performed: Optional[List[str]] = None
    invoice_receipt_url: Optional[str] = None


class WorkOrderUpdate(BaseModel):
    completed_at: Optional[datetime] = None
    total_labor_cost: Optional[Decimal] = None
    total_parts_cost: Optional[Decimal] = None
    status: Optional[WorkOrderStatus] = None
    tasks_performed: Optional[List[str]] = None
    invoice_receipt_url: Optional[str] = None


class WorkOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    business_id: int
    work_order_number: str
    vehicle_id: uuid.UUID
    maintenance_type: MaintenanceType
    priority: WorkOrderPriority
    odometer_at_service: Optional[Decimal] = None
    service_vendor_name: Optional[str] = None
    issued_at: datetime
    completed_at: Optional[datetime] = None
    total_labor_cost: Decimal
    total_parts_cost: Decimal
    total_cost: Decimal
    status: WorkOrderStatus
    tasks_performed: Optional[Any] = None
    invoice_receipt_url: Optional[str] = None
    created_at: datetime


# ===========================================================================
# 8. Tire Logs
# ===========================================================================
class TireLogCreate(BaseModel):
    vehicle_id: uuid.UUID
    tire_serial_number: str = Field(..., max_length=100)
    brand_and_size: str = Field(..., max_length=100)
    position: TirePosition
    installed_date: date
    installed_odometer_km: Decimal = Field(..., ge=0)
    tread_depth_mm: Decimal = Field(Decimal("8.0"), ge=0, le=25)


class TireLogOut(TireLogCreate):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    business_id: int
    status: TireStatus
    created_at: datetime


# ===========================================================================
# 9. Incidents & Insurance
# ===========================================================================
class IncidentReportCreate(BaseModel):
    vehicle_id: uuid.UUID
    driver_id: Optional[uuid.UUID] = None
    incident_type: IncidentType = IncidentType.ACCIDENT
    incident_date: datetime
    location_description: str = Field(..., max_length=255)
    police_station_thana: Optional[str] = Field(None, max_length=100)
    police_gd_or_case_no: Optional[str] = Field(None, max_length=100)
    fine_amount: Decimal = Field(Decimal("0.00"), ge=0)
    estimated_damage_cost: Decimal = Field(Decimal("0.00"), ge=0)
    insurance_claim_filed: bool = False
    insurance_claim_status: InsuranceClaimStatus = InsuranceClaimStatus.NOT_APPLICABLE
    settled_amount: Decimal = Field(Decimal("0.00"), ge=0)
    photos: Optional[List[str]] = None


class IncidentReportOut(IncidentReportCreate):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    business_id: int
    incident_number: str
    created_at: datetime


# ===========================================================================
# 10. Telematics Events
# ===========================================================================
class TelematicsEventCreate(BaseModel):
    vehicle_id: uuid.UUID
    device_imei: str = Field(..., max_length=50)
    latitude: Decimal
    longitude: Decimal
    speed_kmh: Decimal = Field(Decimal("0.0"), ge=0)
    engine_ignition: bool = False
    odometer_reading: Optional[Decimal] = None
    event_type: TelematicsEventType = TelematicsEventType.LOCATION_PING
    timestamp: datetime


class TelematicsEventOut(TelematicsEventCreate):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    business_id: int


# ===========================================================================
# 11. Fleet Dashboard Overview Statistics
# ===========================================================================
class FleetOverviewStatsOut(BaseModel):
    total_vehicles: int
    available_vehicles: int
    on_trip_vehicles: int
    in_maintenance_vehicles: int
    total_drivers: int
    active_drivers: int
    active_trips: int
    pending_requisitions: int
    expiring_documents_count: int  # within 30 days
    monthly_fuel_cost_bdt: Decimal
    monthly_maintenance_cost_bdt: Decimal
    total_fleet_odometer_km: Decimal
