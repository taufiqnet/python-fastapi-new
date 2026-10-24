import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

from app.modules.vehicles.models import (
    Driver,
    DriverStatus,
    FuelLog,
    IncidentReport,
    MaintenanceSchedule,
    TelematicsEvent,
    TireLog,
    TripLog,
    TripStatus,
    Vehicle,
    VehicleFuelType,
    VehicleRequisition,
    RequisitionPriority,
    RequisitionStatus,
    VehicleStatus,
    VehicleType,
    WorkOrder,
    WorkOrderStatus,
)
from app.modules.vehicles.schemas import (
    DriverCreate,
    DriverUpdate,
    ExpiryAlertItem,
    ExpiryAlertsReportOut,
    FleetOverviewStatsOut,
    FuelLogCreate,
    IncidentReportCreate,
    MaintenanceScheduleCreate,
    RequisitionApproval,
    RequisitionCreate,
    RequisitionDispatch,
    RequisitionUpdate,
    TelematicsEventCreate,
    TireLogCreate,
    TripComplete,
    TripStart,
    VehicleCreate,
    VehicleUpdate,
    WorkOrderCreate,
    WorkOrderUpdate,
)


class VehicleService:
    # =======================================================================
    # 1. Vehicles
    # =======================================================================
    def create_vehicle(self, db: Session, business_id: int, data: VehicleCreate) -> Vehicle:
        existing = (
            db.query(Vehicle)
            .filter(
                Vehicle.business_id == business_id,
                func.lower(Vehicle.vehicle_number) == data.vehicle_number.strip().lower(),
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle with registration '{data.vehicle_number}' already exists.",
            )

        # Validate driver assignment if provided
        if data.assigned_driver_id:
            driver = (
                db.query(Driver)
                .filter(Driver.business_id == business_id, Driver.id == data.assigned_driver_id)
                .first()
            )
            if not driver:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Assigned driver not found.",
                )

        vehicle_dict = data.model_dump()
        vehicle = Vehicle(business_id=business_id, **vehicle_dict)
        db.add(vehicle)
        db.commit()
        db.refresh(vehicle)
        return vehicle

    def get_vehicles(
        self,
        db: Session,
        business_id: int,
        search: Optional[str] = None,
        vehicle_type: Optional[VehicleType] = None,
        status_filter: Optional[VehicleStatus] = None,
        fuel_type: Optional[VehicleFuelType] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Vehicle]:
        query = (
            db.query(Vehicle)
            .options(selectinload(Vehicle.assigned_driver))
            .filter(Vehicle.business_id == business_id)
        )

        if search:
            s = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(Vehicle.vehicle_number).like(s),
                    func.lower(Vehicle.brand_make).like(s),
                    func.lower(Vehicle.model_name).like(s),
                    func.lower(Vehicle.chassis_number).like(s),
                )
            )

        if vehicle_type:
            query = query.filter(Vehicle.vehicle_type == vehicle_type)
        if status_filter:
            query = query.filter(Vehicle.status == status_filter)
        if fuel_type:
            query = query.filter(Vehicle.fuel_type == fuel_type)

        return query.order_by(Vehicle.created_at.desc()).offset(skip).limit(limit).all()

    def get_vehicle_by_id(self, db: Session, business_id: int, vehicle_id: uuid.UUID) -> Vehicle:
        vehicle = (
            db.query(Vehicle)
            .options(selectinload(Vehicle.assigned_driver))
            .filter(Vehicle.business_id == business_id, Vehicle.id == vehicle_id)
            .first()
        )
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found.",
            )
        return vehicle

    def update_vehicle(
        self, db: Session, business_id: int, vehicle_id: uuid.UUID, data: VehicleUpdate
    ) -> Vehicle:
        vehicle = self.get_vehicle_by_id(db, business_id, vehicle_id)
        update_data = data.model_dump(exclude_unset=True)

        if "vehicle_number" in update_data and update_data["vehicle_number"]:
            new_num = update_data["vehicle_number"].strip().lower()
            existing = (
                db.query(Vehicle)
                .filter(
                    Vehicle.business_id == business_id,
                    Vehicle.id != vehicle_id,
                    func.lower(Vehicle.vehicle_number) == new_num,
                )
                .first()
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Vehicle registration '{update_data['vehicle_number']}' is already in use.",
                )

        if "assigned_driver_id" in update_data and update_data["assigned_driver_id"]:
            driver = (
                db.query(Driver)
                .filter(Driver.business_id == business_id, Driver.id == update_data["assigned_driver_id"])
                .first()
            )
            if not driver:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Assigned driver not found.",
                )

        for field, value in update_data.items():
            setattr(vehicle, field, value)

        db.commit()
        db.refresh(vehicle)
        return vehicle

    def delete_vehicle(self, db: Session, business_id: int, vehicle_id: uuid.UUID) -> None:
        vehicle = self.get_vehicle_by_id(db, business_id, vehicle_id)
        db.delete(vehicle)
        db.commit()

    # =======================================================================
    # 2. Drivers
    # =======================================================================
    def create_driver(self, db: Session, business_id: int, data: DriverCreate) -> Driver:
        existing = (
            db.query(Driver)
            .filter(
                Driver.business_id == business_id,
                func.lower(Driver.license_number) == data.license_number.strip().lower(),
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Driver with license number '{data.license_number}' already exists.",
            )

        driver = Driver(business_id=business_id, **data.model_dump())
        db.add(driver)
        db.commit()
        db.refresh(driver)
        return driver

    def get_drivers(
        self,
        db: Session,
        business_id: int,
        search: Optional[str] = None,
        status_filter: Optional[DriverStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Driver]:
        query = db.query(Driver).filter(Driver.business_id == business_id)

        if search:
            s = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(Driver.full_name).like(s),
                    func.lower(Driver.phone).like(s),
                    func.lower(Driver.license_number).like(s),
                    func.lower(Driver.nid_number).like(s),
                )
            )

        if status_filter:
            query = query.filter(Driver.status == status_filter)

        return query.order_by(Driver.full_name.asc()).offset(skip).limit(limit).all()

    def get_driver_by_id(self, db: Session, business_id: int, driver_id: uuid.UUID) -> Driver:
        driver = (
            db.query(Driver)
            .filter(Driver.business_id == business_id, Driver.id == driver_id)
            .first()
        )
        if not driver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Driver not found.",
            )
        return driver

    def update_driver(
        self, db: Session, business_id: int, driver_id: uuid.UUID, data: DriverUpdate
    ) -> Driver:
        driver = self.get_driver_by_id(db, business_id, driver_id)
        update_data = data.model_dump(exclude_unset=True)

        if "license_number" in update_data and update_data["license_number"]:
            new_lic = update_data["license_number"].strip().lower()
            existing = (
                db.query(Driver)
                .filter(
                    Driver.business_id == business_id,
                    Driver.id != driver_id,
                    func.lower(Driver.license_number) == new_lic,
                )
                .first()
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"License number '{update_data['license_number']}' already registered.",
                )

        for field, value in update_data.items():
            setattr(driver, field, value)

        db.commit()
        db.refresh(driver)
        return driver

    # =======================================================================
    # 3. Document Expiry Alerts (BRTA Fitness, Tax, CNG, License, Insurance)
    # =======================================================================
    def get_document_expiry_alerts(
        self, db: Session, business_id: int, threshold_days: int = 30
    ) -> ExpiryAlertsReportOut:
        today = date.today()
        alert_limit = today + timedelta(days=threshold_days)

        alerts: List[ExpiryAlertItem] = []

        # 1. Vehicle alerts
        vehicles = db.query(Vehicle).filter(Vehicle.business_id == business_id).all()
        for v in vehicles:
            # BRTA Fitness
            if v.brta_fitness_expiry_date and v.brta_fitness_expiry_date <= alert_limit:
                days = (v.brta_fitness_expiry_date - today).days
                alerts.append(
                    ExpiryAlertItem(
                        category="brta_fitness",
                        entity_id=v.id,
                        entity_name=v.vehicle_number,
                        identifier=f"{v.brand_make} {v.model_name}",
                        expiry_date=v.brta_fitness_expiry_date,
                        days_remaining=days,
                        status="expired" if days < 0 else ("urgent" if days <= 7 else "warning"),
                    )
                )

            # BRTA Tax Token
            if v.brta_tax_token_expiry_date and v.brta_tax_token_expiry_date <= alert_limit:
                days = (v.brta_tax_token_expiry_date - today).days
                alerts.append(
                    ExpiryAlertItem(
                        category="brta_tax_token",
                        entity_id=v.id,
                        entity_name=v.vehicle_number,
                        identifier=f"{v.brand_make} {v.model_name}",
                        expiry_date=v.brta_tax_token_expiry_date,
                        days_remaining=days,
                        status="expired" if days < 0 else ("urgent" if days <= 7 else "warning"),
                    )
                )

            # CNG Cylinder Re-Testing
            if v.cng_test_expiry_date and v.cng_test_expiry_date <= alert_limit:
                days = (v.cng_test_expiry_date - today).days
                alerts.append(
                    ExpiryAlertItem(
                        category="cng_test",
                        entity_id=v.id,
                        entity_name=v.vehicle_number,
                        identifier="5-Year CNG Hydrostatic Test",
                        expiry_date=v.cng_test_expiry_date,
                        days_remaining=days,
                        status="expired" if days < 0 else ("urgent" if days <= 7 else "warning"),
                    )
                )

            # Insurance
            if v.insurance_expiry_date and v.insurance_expiry_date <= alert_limit:
                days = (v.insurance_expiry_date - today).days
                alerts.append(
                    ExpiryAlertItem(
                        category="insurance",
                        entity_id=v.id,
                        entity_name=v.vehicle_number,
                        identifier=v.insurance_policy_number or "Motor Insurance",
                        expiry_date=v.insurance_expiry_date,
                        days_remaining=days,
                        status="expired" if days < 0 else ("urgent" if days <= 7 else "warning"),
                    )
                )

        # 2. Driver license alerts
        drivers = db.query(Driver).filter(Driver.business_id == business_id).all()
        for d in drivers:
            if d.license_expiry_date and d.license_expiry_date <= alert_limit:
                days = (d.license_expiry_date - today).days
                alerts.append(
                    ExpiryAlertItem(
                        category="driver_license",
                        entity_id=d.id,
                        entity_name=d.full_name,
                        identifier=f"License: {d.license_number} ({d.license_grade.value.upper()})",
                        expiry_date=d.license_expiry_date,
                        days_remaining=days,
                        status="expired" if days < 0 else ("urgent" if days <= 7 else "warning"),
                    )
                )

        # Sort by days_remaining ascending (most urgent first)
        alerts.sort(key=lambda a: a.days_remaining)

        expired_count = sum(1 for a in alerts if a.days_remaining < 0)
        expiring_soon = sum(1 for a in alerts if 0 <= a.days_remaining <= threshold_days)

        return ExpiryAlertsReportOut(
            total_alerts=len(alerts),
            expired_count=expired_count,
            expiring_soon_count=expiring_soon,
            alerts=alerts,
        )

    # =======================================================================
    # 4. Vehicle Requisitions & Booking Workflow
    # =======================================================================
    def create_requisition(
        self, db: Session, business_id: int, data: RequisitionCreate
    ) -> VehicleRequisition:
        if data.estimated_end_datetime <= data.start_datetime:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Estimated end datetime must be after start datetime.",
            )

        # Generate unique requisition number REQ-YYYY-XXXX
        year = datetime.now().year
        count = (
            db.query(func.count(VehicleRequisition.id))
            .filter(VehicleRequisition.business_id == business_id)
            .scalar()
            or 0
        )
        req_number = f"REQ-{year}-{count + 1:04d}"

        requisition = VehicleRequisition(
            business_id=business_id,
            requisition_number=req_number,
            status=RequisitionStatus.PENDING_APPROVAL,
            **data.model_dump(),
        )
        db.add(requisition)
        db.commit()
        db.refresh(requisition)
        return requisition

    def list_requisitions(
        self,
        db: Session,
        business_id: int,
        status_filter: Optional[RequisitionStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[VehicleRequisition]:
        query = db.query(VehicleRequisition).filter(VehicleRequisition.business_id == business_id)
        if status_filter:
            query = query.filter(VehicleRequisition.status == status_filter)
        return query.order_by(VehicleRequisition.created_at.desc()).offset(skip).limit(limit).all()

    def approve_requisition(
        self,
        db: Session,
        business_id: int,
        requisition_id: uuid.UUID,
        user_id: int,
        data: RequisitionApproval,
    ) -> VehicleRequisition:
        req = (
            db.query(VehicleRequisition)
            .filter(VehicleRequisition.business_id == business_id, VehicleRequisition.id == requisition_id)
            .first()
        )
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requisition not found.")

        if req.status not in (RequisitionStatus.DRAFT, RequisitionStatus.PENDING_APPROVAL):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Requisition cannot be reviewed in current status '{req.status.value}'.",
            )

        if data.approved:
            req.status = RequisitionStatus.APPROVED
            req.approved_by_id = user_id
        else:
            req.status = RequisitionStatus.REJECTED

        db.commit()
        db.refresh(req)
        return req

    def dispatch_requisition(
        self,
        db: Session,
        business_id: int,
        requisition_id: uuid.UUID,
        data: RequisitionDispatch,
    ) -> VehicleRequisition:
        req = (
            db.query(VehicleRequisition)
            .filter(VehicleRequisition.business_id == business_id, VehicleRequisition.id == requisition_id)
            .first()
        )
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requisition not found.")

        if req.status != RequisitionStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only approved requisitions can be dispatched (current: {req.status.value}).",
            )

        # Validate vehicle exists and is available
        vehicle = self.get_vehicle_by_id(db, business_id, data.allocated_vehicle_id)
        if vehicle.status == VehicleStatus.UNDER_MAINTENANCE or vehicle.status == VehicleStatus.OUT_OF_SERVICE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle '{vehicle.vehicle_number}' is {vehicle.status.value} and cannot be dispatched.",
            )

        # Validate driver exists
        driver = self.get_driver_by_id(db, business_id, data.allocated_driver_id)
        if driver.status in (DriverStatus.SUSPENDED, DriverStatus.TERMINATED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Driver '{driver.full_name}' is {driver.status.value} and cannot be dispatched.",
            )

        # Overlapping check for the same vehicle
        overlap = (
            db.query(VehicleRequisition)
            .filter(
                VehicleRequisition.business_id == business_id,
                VehicleRequisition.id != requisition_id,
                VehicleRequisition.allocated_vehicle_id == data.allocated_vehicle_id,
                VehicleRequisition.status.in_([RequisitionStatus.ALLOCATED, RequisitionStatus.APPROVED]),
                VehicleRequisition.start_datetime < req.estimated_end_datetime,
                VehicleRequisition.estimated_end_datetime > req.start_datetime,
            )
            .first()
        )
        if overlap:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Vehicle '{vehicle.vehicle_number}' is already allocated to requisition '{overlap.requisition_number}' during this timeframe.",
            )

        req.allocated_vehicle_id = data.allocated_vehicle_id
        req.allocated_driver_id = data.allocated_driver_id
        req.status = RequisitionStatus.ALLOCATED

        db.commit()
        db.refresh(req)
        return req

    # =======================================================================
    # 5. Trip Sheet & Logbook
    # =======================================================================
    def start_trip(self, db: Session, business_id: int, data: TripStart) -> TripLog:
        vehicle = self.get_vehicle_by_id(db, business_id, data.vehicle_id)
        driver = self.get_driver_by_id(db, business_id, data.driver_id)

        # Generate trip number
        year = datetime.now().year
        count = (
            db.query(func.count(TripLog.id))
            .filter(TripLog.business_id == business_id)
            .scalar()
            or 0
        )
        trip_number = f"TRIP-{year}-{count + 1:04d}"

        trip = TripLog(
            business_id=business_id,
            trip_number=trip_number,
            requisition_id=data.requisition_id,
            vehicle_id=data.vehicle_id,
            driver_id=data.driver_id,
            start_time=data.start_time,
            start_odometer_km=data.start_odometer_km,
            route_summary=data.route_summary,
            remarks=data.remarks,
            status=TripStatus.IN_PROGRESS,
        )
        db.add(trip)

        # Update vehicle and driver status
        vehicle.status = VehicleStatus.ON_TRIP
        driver.status = DriverStatus.ON_DUTY

        db.commit()
        db.refresh(trip)
        return trip

    def complete_trip(
        self, db: Session, business_id: int, trip_id: uuid.UUID, data: TripComplete
    ) -> TripLog:
        trip = (
            db.query(TripLog)
            .filter(TripLog.business_id == business_id, TripLog.id == trip_id)
            .first()
        )
        if not trip:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found.")

        if trip.status != TripStatus.IN_PROGRESS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Trip is not in progress (current: {trip.status.value}).",
            )

        if data.end_odometer_km < trip.start_odometer_km:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"End odometer ({data.end_odometer_km}) cannot be less than start odometer ({trip.start_odometer_km}).",
            )

        trip.end_time = data.end_time
        trip.end_odometer_km = data.end_odometer_km
        trip.distance_covered_km = data.end_odometer_km - trip.start_odometer_km
        trip.toll_expenses = data.toll_expenses
        trip.toll_receipt_urls = data.toll_receipt_urls
        trip.fuel_consumed_estimate_liters = data.fuel_consumed_estimate_liters
        trip.driver_trip_allowance_da = data.driver_trip_allowance_da
        trip.status = TripStatus.COMPLETED
        if data.remarks:
            trip.remarks = (trip.remarks or "") + "\n" + data.remarks

        # Update vehicle odometer and status
        vehicle = (
            db.query(Vehicle)
            .filter(Vehicle.business_id == business_id, Vehicle.id == trip.vehicle_id)
            .first()
        )
        if vehicle:
            vehicle.current_odometer_km = data.end_odometer_km
            vehicle.status = VehicleStatus.AVAILABLE

        # Update driver status
        driver = (
            db.query(Driver)
            .filter(Driver.business_id == business_id, Driver.id == trip.driver_id)
            .first()
        )
        if driver:
            driver.status = DriverStatus.ACTIVE

        # If linked to requisition, mark requisition completed
        if trip.requisition_id:
            req = (
                db.query(VehicleRequisition)
                .filter(VehicleRequisition.business_id == business_id, VehicleRequisition.id == trip.requisition_id)
                .first()
            )
            if req:
                req.status = RequisitionStatus.COMPLETED

        db.commit()
        db.refresh(trip)
        return trip

    def list_trips(
        self,
        db: Session,
        business_id: int,
        vehicle_id: Optional[uuid.UUID] = None,
        driver_id: Optional[uuid.UUID] = None,
        status_filter: Optional[TripStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[TripLog]:
        query = db.query(TripLog).filter(TripLog.business_id == business_id)
        if vehicle_id:
            query = query.filter(TripLog.vehicle_id == vehicle_id)
        if driver_id:
            query = query.filter(TripLog.driver_id == driver_id)
        if status_filter:
            query = query.filter(TripLog.status == status_filter)
        return query.order_by(TripLog.start_time.desc()).offset(skip).limit(limit).all()

    # =======================================================================
    # 6. Fuel Logs & Anomaly Detection
    # =======================================================================
    def log_fuel(self, db: Session, business_id: int, data: FuelLogCreate) -> FuelLog:
        vehicle = self.get_vehicle_by_id(db, business_id, data.vehicle_id)

        total_cost = data.quantity * data.unit_price

        # Check last fuel log for efficiency calculation
        last_fuel = (
            db.query(FuelLog)
            .filter(FuelLog.business_id == business_id, FuelLog.vehicle_id == data.vehicle_id)
            .order_by(FuelLog.odometer_at_fueling.desc())
            .first()
        )

        km_per_liter = None
        is_anomaly = False

        if last_fuel and data.odometer_at_fueling > last_fuel.odometer_at_fueling:
            delta_km = data.odometer_at_fueling - last_fuel.odometer_at_fueling
            if data.quantity > 0:
                km_per_liter = Decimal(round(float(delta_km) / float(data.quantity), 2))
                # Flag anomaly if efficiency is abnormally low (< 3.0 km/L for light/sedan or sudden 40% drop)
                if km_per_liter < Decimal("3.0"):
                    is_anomaly = True

        fuel_log = FuelLog(
            business_id=business_id,
            vehicle_id=data.vehicle_id,
            driver_id=data.driver_id,
            logged_at=data.logged_at,
            odometer_at_fueling=data.odometer_at_fueling,
            fuel_type=data.fuel_type,
            quantity=data.quantity,
            unit_price=data.unit_price,
            total_cost=total_cost,
            filling_station_name=data.filling_station_name,
            payment_mode=data.payment_mode,
            fuel_card_number=data.fuel_card_number,
            slip_receipt_url=data.slip_receipt_url,
            calculated_km_per_liter=km_per_liter,
            is_anomaly_flagged=is_anomaly,
        )
        db.add(fuel_log)

        # Update vehicle odometer if higher
        if data.odometer_at_fueling > vehicle.current_odometer_km:
            vehicle.current_odometer_km = data.odometer_at_fueling

        db.commit()
        db.refresh(fuel_log)
        return fuel_log

    def list_fuel_logs(
        self,
        db: Session,
        business_id: int,
        vehicle_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[FuelLog]:
        query = db.query(FuelLog).filter(FuelLog.business_id == business_id)
        if vehicle_id:
            query = query.filter(FuelLog.vehicle_id == vehicle_id)
        return query.order_by(FuelLog.logged_at.desc()).offset(skip).limit(limit).all()

    # =======================================================================
    # 7. Preventative Maintenance & Work Orders
    # =======================================================================
    def create_maintenance_schedule(
        self, db: Session, business_id: int, data: MaintenanceScheduleCreate
    ) -> MaintenanceSchedule:
        schedule = MaintenanceSchedule(business_id=business_id, **data.model_dump())
        db.add(schedule)
        db.commit()
        db.refresh(schedule)
        return schedule

    def list_maintenance_schedules(
        self, db: Session, business_id: int
    ) -> List[MaintenanceSchedule]:
        return (
            db.query(MaintenanceSchedule)
            .filter(MaintenanceSchedule.business_id == business_id)
            .order_by(MaintenanceSchedule.title.asc())
            .all()
        )

    def create_work_order(
        self, db: Session, business_id: int, data: WorkOrderCreate
    ) -> WorkOrder:
        vehicle = self.get_vehicle_by_id(db, business_id, data.vehicle_id)

        # Generate work order number WO-YYYY-XXXX
        year = datetime.now().year
        count = (
            db.query(func.count(WorkOrder.id))
            .filter(WorkOrder.business_id == business_id)
            .scalar()
            or 0
        )
        wo_number = f"WO-{year}-{count + 1:04d}"

        total_cost = data.total_labor_cost + data.total_parts_cost

        work_order = WorkOrder(
            business_id=business_id,
            work_order_number=wo_number,
            vehicle_id=data.vehicle_id,
            maintenance_type=data.maintenance_type,
            priority=data.priority,
            odometer_at_service=data.odometer_at_service,
            service_vendor_name=data.service_vendor_name,
            issued_at=data.issued_at,
            total_labor_cost=data.total_labor_cost,
            total_parts_cost=data.total_parts_cost,
            total_cost=total_cost,
            status=WorkOrderStatus.IN_PROGRESS,
            tasks_performed=data.tasks_performed,
            invoice_receipt_url=data.invoice_receipt_url,
        )
        db.add(work_order)

        # Set vehicle status to UNDER_MAINTENANCE
        vehicle.status = VehicleStatus.UNDER_MAINTENANCE

        db.commit()
        db.refresh(work_order)
        return work_order

    def update_work_order(
        self, db: Session, business_id: int, work_order_id: uuid.UUID, data: WorkOrderUpdate
    ) -> WorkOrder:
        wo = (
            db.query(WorkOrder)
            .filter(WorkOrder.business_id == business_id, WorkOrder.id == work_order_id)
            .first()
        )
        if not wo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found.")

        update_data = data.model_dump(exclude_unset=True)
        for field, val in update_data.items():
            setattr(wo, field, val)

        wo.total_cost = wo.total_labor_cost + wo.total_parts_cost

        # If completed, restore vehicle status
        if wo.status == WorkOrderStatus.COMPLETED:
            if not wo.completed_at:
                wo.completed_at = datetime.now(timezone.utc)
            vehicle = (
                db.query(Vehicle)
                .filter(Vehicle.business_id == business_id, Vehicle.id == wo.vehicle_id)
                .first()
            )
            if vehicle and vehicle.status == VehicleStatus.UNDER_MAINTENANCE:
                vehicle.status = VehicleStatus.AVAILABLE

        db.commit()
        db.refresh(wo)
        return wo

    def list_work_orders(
        self,
        db: Session,
        business_id: int,
        vehicle_id: Optional[uuid.UUID] = None,
        status_filter: Optional[WorkOrderStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[WorkOrder]:
        query = db.query(WorkOrder).filter(WorkOrder.business_id == business_id)
        if vehicle_id:
            query = query.filter(WorkOrder.vehicle_id == vehicle_id)
        if status_filter:
            query = query.filter(WorkOrder.status == status_filter)
        return query.order_by(WorkOrder.issued_at.desc()).offset(skip).limit(limit).all()

    # =======================================================================
    # 8. Tire Logs
    # =======================================================================
    def log_tire(self, db: Session, business_id: int, data: TireLogCreate) -> TireLog:
        self.get_vehicle_by_id(db, business_id, data.vehicle_id)
        tire = TireLog(business_id=business_id, **data.model_dump())
        db.add(tire)
        db.commit()
        db.refresh(tire)
        return tire

    def list_tires(
        self, db: Session, business_id: int, vehicle_id: uuid.UUID
    ) -> List[TireLog]:
        return (
            db.query(TireLog)
            .filter(TireLog.business_id == business_id, TireLog.vehicle_id == vehicle_id)
            .order_by(TireLog.installed_date.desc())
            .all()
        )

    # =======================================================================
    # 9. Incident Reports & Insurance
    # =======================================================================
    def report_incident(
        self, db: Session, business_id: int, data: IncidentReportCreate
    ) -> IncidentReport:
        self.get_vehicle_by_id(db, business_id, data.vehicle_id)

        # Generate incident number INC-YYYY-XXXX
        year = datetime.now().year
        count = (
            db.query(func.count(IncidentReport.id))
            .filter(IncidentReport.business_id == business_id)
            .scalar()
            or 0
        )
        incident_number = f"INC-{year}-{count + 1:04d}"

        incident = IncidentReport(
            business_id=business_id,
            incident_number=incident_number,
            **data.model_dump(),
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)
        return incident

    def list_incidents(
        self,
        db: Session,
        business_id: int,
        vehicle_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[IncidentReport]:
        query = db.query(IncidentReport).filter(IncidentReport.business_id == business_id)
        if vehicle_id:
            query = query.filter(IncidentReport.vehicle_id == vehicle_id)
        return query.order_by(IncidentReport.incident_date.desc()).offset(skip).limit(limit).all()

    # =======================================================================
    # 10. Telematics Events (IoT GPS Webhook)
    # =======================================================================
    def ingest_telematics_event(
        self, db: Session, business_id: int, data: TelematicsEventCreate
    ) -> TelematicsEvent:
        event = TelematicsEvent(business_id=business_id, **data.model_dump())
        db.add(event)

        # Update vehicle current odometer if higher
        if data.odometer_reading:
            vehicle = (
                db.query(Vehicle)
                .filter(Vehicle.business_id == business_id, Vehicle.id == data.vehicle_id)
                .first()
            )
            if vehicle and data.odometer_reading > vehicle.current_odometer_km:
                vehicle.current_odometer_km = data.odometer_reading

        db.commit()
        db.refresh(event)
        return event

    # =======================================================================
    # 11. Fleet Dashboard Overview Statistics
    # =======================================================================
    def get_fleet_stats(self, db: Session, business_id: int) -> FleetOverviewStatsOut:
        total_v = db.query(func.count(Vehicle.id)).filter(Vehicle.business_id == business_id).scalar() or 0
        available_v = (
            db.query(func.count(Vehicle.id))
            .filter(Vehicle.business_id == business_id, Vehicle.status == VehicleStatus.AVAILABLE)
            .scalar()
            or 0
        )
        on_trip_v = (
            db.query(func.count(Vehicle.id))
            .filter(Vehicle.business_id == business_id, Vehicle.status == VehicleStatus.ON_TRIP)
            .scalar()
            or 0
        )
        maintenance_v = (
            db.query(func.count(Vehicle.id))
            .filter(Vehicle.business_id == business_id, Vehicle.status == VehicleStatus.UNDER_MAINTENANCE)
            .scalar()
            or 0
        )

        total_d = db.query(func.count(Driver.id)).filter(Driver.business_id == business_id).scalar() or 0
        active_d = (
            db.query(func.count(Driver.id))
            .filter(Driver.business_id == business_id, Driver.status == DriverStatus.ACTIVE)
            .scalar()
            or 0
        )

        active_trips = (
            db.query(func.count(TripLog.id))
            .filter(TripLog.business_id == business_id, TripLog.status == TripStatus.IN_PROGRESS)
            .scalar()
            or 0
        )

        pending_reqs = (
            db.query(func.count(VehicleRequisition.id))
            .filter(
                VehicleRequisition.business_id == business_id,
                VehicleRequisition.status == RequisitionStatus.PENDING_APPROVAL,
            )
            .scalar()
            or 0
        )

        total_odo = (
            db.query(func.sum(Vehicle.current_odometer_km))
            .filter(Vehicle.business_id == business_id)
            .scalar()
            or Decimal("0.0")
        )

        # Monthly fuel & maintenance costs (last 30 days)
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        fuel_cost = (
            db.query(func.sum(FuelLog.total_cost))
            .filter(FuelLog.business_id == business_id, FuelLog.logged_at >= thirty_days_ago)
            .scalar()
            or Decimal("0.00")
        )

        maint_cost = (
            db.query(func.sum(WorkOrder.total_cost))
            .filter(WorkOrder.business_id == business_id, WorkOrder.issued_at >= thirty_days_ago)
            .scalar()
            or Decimal("0.00")
        )

        alerts = self.get_document_expiry_alerts(db, business_id, threshold_days=30)

        return FleetOverviewStatsOut(
            total_vehicles=total_v,
            available_vehicles=available_v,
            on_trip_vehicles=on_trip_v,
            in_maintenance_vehicles=maintenance_v,
            total_drivers=total_d,
            active_drivers=active_d,
            active_trips=active_trips,
            pending_requisitions=pending_reqs,
            expiring_documents_count=alerts.total_alerts,
            monthly_fuel_cost_bdt=Decimal(round(float(fuel_cost), 2)),
            monthly_maintenance_cost_bdt=Decimal(round(float(maint_cost), 2)),
            total_fleet_odometer_km=Decimal(round(float(total_odo), 2)),
        )
