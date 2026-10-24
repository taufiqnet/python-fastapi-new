import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.database import get_db
from app.modules.vehicles.models import (
    DriverStatus,
    RequisitionStatus,
    TripStatus,
    VehicleFuelType,
    VehicleStatus,
    VehicleType,
    WorkOrderStatus,
)
from app.modules.vehicles.schemas import (
    DriverCreate,
    DriverOut,
    DriverUpdate,
    ExpiryAlertsReportOut,
    FleetOverviewStatsOut,
    FuelLogCreate,
    FuelLogOut,
    IncidentReportCreate,
    IncidentReportOut,
    MaintenanceScheduleCreate,
    MaintenanceScheduleOut,
    RequisitionApproval,
    RequisitionCreate,
    RequisitionDispatch,
    RequisitionOut,
    TelematicsEventCreate,
    TelematicsEventOut,
    TireLogCreate,
    TireLogOut,
    TripComplete,
    TripOut,
    TripStart,
    VehicleCreate,
    VehicleOut,
    VehicleUpdate,
    WorkOrderCreate,
    WorkOrderOut,
    WorkOrderUpdate,
)
from app.modules.vehicles.services import VehicleService

router = APIRouter(prefix="/fleet", tags=["Vehicle & Fleet Management"])
service = VehicleService()


# ===========================================================================
# 1. Overview Statistics & Expiry Alerts
# ===========================================================================
@router.get("/overview/stats", response_model=FleetOverviewStatsOut)
def get_fleet_stats(
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.get_fleet_stats(db, biz_id)


@router.get("/alerts/expiring-documents", response_model=ExpiryAlertsReportOut)
def get_document_expiry_alerts(
    threshold_days: int = Query(30, ge=1, le=180),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.get_document_expiry_alerts(db, biz_id, threshold_days)


# ===========================================================================
# 2. Vehicles
# ===========================================================================
@router.post("/vehicles", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    data: VehicleCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.create_vehicle(db, biz_id, data)


@router.get("/vehicles", response_model=List[VehicleOut])
def list_vehicles(
    search: Optional[str] = Query(None),
    vehicle_type: Optional[VehicleType] = Query(None),
    status_filter: Optional[VehicleStatus] = Query(None, alias="status"),
    fuel_type: Optional[VehicleFuelType] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.get_vehicles(
        db,
        biz_id,
        search=search,
        vehicle_type=vehicle_type,
        status_filter=status_filter,
        fuel_type=fuel_type,
        skip=skip,
        limit=limit,
    )


@router.get("/vehicles/{vehicle_id}", response_model=VehicleOut)
def get_vehicle(
    vehicle_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.get_vehicle_by_id(db, biz_id, vehicle_id)


@router.patch("/vehicles/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(
    vehicle_id: uuid.UUID,
    data: VehicleUpdate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.update_vehicle(db, biz_id, vehicle_id, data)


@router.delete("/vehicles/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(
    vehicle_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    service.delete_vehicle(db, biz_id, vehicle_id)


# ===========================================================================
# 3. Drivers
# ===========================================================================
@router.post("/drivers", response_model=DriverOut, status_code=status.HTTP_201_CREATED)
def create_driver(
    data: DriverCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.create_driver(db, biz_id, data)


@router.get("/drivers", response_model=List[DriverOut])
def list_drivers(
    search: Optional[str] = Query(None),
    status_filter: Optional[DriverStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.get_drivers(
        db,
        biz_id,
        search=search,
        status_filter=status_filter,
        skip=skip,
        limit=limit,
    )


@router.get("/drivers/{driver_id}", response_model=DriverOut)
def get_driver(
    driver_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.get_driver_by_id(db, biz_id, driver_id)


@router.patch("/drivers/{driver_id}", response_model=DriverOut)
def update_driver(
    driver_id: uuid.UUID,
    data: DriverUpdate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.update_driver(db, biz_id, driver_id, data)


# ===========================================================================
# 4. Requisitions (Pool Car Booking)
# ===========================================================================
@router.post("/requisitions", response_model=RequisitionOut, status_code=status.HTTP_201_CREATED)
def create_requisition(
    data: RequisitionCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.create_requisition(db, biz_id, data)


@router.get("/requisitions", response_model=List[RequisitionOut])
def list_requisitions(
    status_filter: Optional[RequisitionStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.list_requisitions(db, biz_id, status_filter=status_filter, skip=skip, limit=limit)


@router.post("/requisitions/{requisition_id}/approve", response_model=RequisitionOut)
def approve_requisition(
    requisition_id: uuid.UUID,
    data: RequisitionApproval,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.approve_requisition(db, biz_id, requisition_id, current_user.id, data)


@router.post("/requisitions/{requisition_id}/dispatch", response_model=RequisitionOut)
def dispatch_requisition(
    requisition_id: uuid.UUID,
    data: RequisitionDispatch,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.dispatch_requisition(db, biz_id, requisition_id, data)


# ===========================================================================
# 5. Trip Sheet & Logbook
# ===========================================================================
@router.post("/trips/start", response_model=TripOut, status_code=status.HTTP_201_CREATED)
def start_trip(
    data: TripStart,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.start_trip(db, biz_id, data)


@router.post("/trips/{trip_id}/complete", response_model=TripOut)
def complete_trip(
    trip_id: uuid.UUID,
    data: TripComplete,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.complete_trip(db, biz_id, trip_id, data)


@router.get("/trips", response_model=List[TripOut])
def list_trips(
    vehicle_id: Optional[uuid.UUID] = Query(None),
    driver_id: Optional[uuid.UUID] = Query(None),
    status_filter: Optional[TripStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.list_trips(
        db, biz_id, vehicle_id=vehicle_id, driver_id=driver_id, status_filter=status_filter, skip=skip, limit=limit
    )


# ===========================================================================
# 6. Fuel Logs
# ===========================================================================
@router.post("/fuel-logs", response_model=FuelLogOut, status_code=status.HTTP_201_CREATED)
def log_fuel(
    data: FuelLogCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.log_fuel(db, biz_id, data)


@router.get("/fuel-logs", response_model=List[FuelLogOut])
def list_fuel_logs(
    vehicle_id: Optional[uuid.UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.list_fuel_logs(db, biz_id, vehicle_id=vehicle_id, skip=skip, limit=limit)


# ===========================================================================
# 7. Preventative Maintenance & Work Orders
# ===========================================================================
@router.post("/maintenance-schedules", response_model=MaintenanceScheduleOut, status_code=status.HTTP_201_CREATED)
def create_maintenance_schedule(
    data: MaintenanceScheduleCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.create_maintenance_schedule(db, biz_id, data)


@router.get("/maintenance-schedules", response_model=List[MaintenanceScheduleOut])
def list_maintenance_schedules(
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.list_maintenance_schedules(db, biz_id)


@router.post("/work-orders", response_model=WorkOrderOut, status_code=status.HTTP_201_CREATED)
def create_work_order(
    data: WorkOrderCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.create_work_order(db, biz_id, data)


@router.patch("/work-orders/{work_order_id}", response_model=WorkOrderOut)
def update_work_order(
    work_order_id: uuid.UUID,
    data: WorkOrderUpdate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.update_work_order(db, biz_id, work_order_id, data)


@router.get("/work-orders", response_model=List[WorkOrderOut])
def list_work_orders(
    vehicle_id: Optional[uuid.UUID] = Query(None),
    status_filter: Optional[WorkOrderStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.list_work_orders(
        db, biz_id, vehicle_id=vehicle_id, status_filter=status_filter, skip=skip, limit=limit
    )


# ===========================================================================
# 8. Tire Logs
# ===========================================================================
@router.post("/tires", response_model=TireLogOut, status_code=status.HTTP_201_CREATED)
def log_tire(
    data: TireLogCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.log_tire(db, biz_id, data)


@router.get("/tires", response_model=List[TireLogOut])
def list_tires(
    vehicle_id: uuid.UUID = Query(...),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.list_tires(db, biz_id, vehicle_id=vehicle_id)


# ===========================================================================
# 9. Incidents & Insurance
# ===========================================================================
@router.post("/incidents", response_model=IncidentReportOut, status_code=status.HTTP_201_CREATED)
def report_incident(
    data: IncidentReportCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.report_incident(db, biz_id, data)


@router.get("/incidents", response_model=List[IncidentReportOut])
def list_incidents(
    vehicle_id: Optional[uuid.UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.list_incidents(db, biz_id, vehicle_id=vehicle_id, skip=skip, limit=limit)


# ===========================================================================
# 10. Telematics Events (IoT Webhook)
# ===========================================================================
@router.post("/telematics/events", response_model=TelematicsEventOut, status_code=status.HTTP_201_CREATED)
def ingest_telematics_event(
    data: TelematicsEventCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return service.ingest_telematics_event(db, biz_id, data)
