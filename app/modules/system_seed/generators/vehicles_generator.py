"""
Seed data generator for Vehicle & Fleet Management module.
Generates drivers, fleet vehicles, requisitions, trip logs, fuel logs, work orders, and tire logs.
"""
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Callable, Dict
from sqlalchemy.orm import Session

from app.modules.vehicles.models import (
    Driver,
    DriverLicenseGrade,
    DriverStatus,
    FuelLog,
    MaintenanceType,
    RequisitionPriority,
    RequisitionStatus,
    TireLog,
    TirePosition,
    TireStatus,
    TripLog,
    TripStatus,
    Vehicle,
    VehicleFuelType,
    VehicleOwnershipType,
    VehicleStatus,
    VehicleType,
    WorkOrder,
    WorkOrderPriority,
    WorkOrderStatus,
    VehicleRequisition,
)


def seed_vehicles_data(db: Session, business_id: int, log_record: Callable[[str, str], None]) -> Dict[str, int]:
    counts = {
        "vehicles": 0,
        "drivers": 0,
        "requisitions": 0,
        "trips": 0,
        "fuel_logs": 0,
        "work_orders": 0,
        "tires": 0,
    }

    today = date.today()

    # 1. Seed Drivers
    drivers_data = [
        ("SEED-DRV-001", "Mohammad Rafiqul Islam", "+8801711002233", f"DL-DHK-998811-{business_id % 1000}", DriverLicenseGrade.HEAVY, today + timedelta(days=365)),
        ("SEED-DRV-002", "Abdul Karim Sheikh", "+8801819223344", f"DL-CTG-776655-{business_id % 1000}", DriverLicenseGrade.MEDIUM, today + timedelta(days=240)),
        ("SEED-DRV-003", "Anwar Hossain", "+8801912334455", f"DL-SYL-334422-{business_id % 1000}", DriverLicenseGrade.LIGHT, today + timedelta(days=180)),
    ]

    created_drivers = []
    for emp_code, name, phone, lic_no, grade, exp_date in drivers_data:
        driver = Driver(
            business_id=business_id,
            full_name=f"[SEED] {name}",
            phone=phone,
            license_number=lic_no,
            license_grade=grade,
            license_expiry_date=exp_date,
            status=DriverStatus.ACTIVE,
            notes=f"Employee code: {emp_code}",
        )
        db.add(driver)
        db.flush()
        log_record("fleet_drivers", str(driver.id))
        created_drivers.append(driver)
        counts["drivers"] += 1

    # 2. Seed Vehicles
    vehicles_data = [
        (f"SEED-DHK-GA-11-2233-{business_id % 1000}", VehicleType.SEDAN, "Toyota", "Axio G", 2021, VehicleFuelType.HYBRID_OCTANE, Decimal("34500.00"), created_drivers[0].id),
        (f"SEED-DHK-CHA-55-6677-{business_id % 1000}", VehicleType.MICROBUS, "Toyota", "HiAce Commuter", 2022, VehicleFuelType.OCTANE, Decimal("48200.00"), created_drivers[1].id),
        (f"SEED-DHK-TA-88-9900-{business_id % 1000}", VehicleType.COVERED_VAN, "Tata", "LPT 407", 2020, VehicleFuelType.DIESEL, Decimal("76500.00"), created_drivers[2].id),
        (f"SEED-DHK-BHA-33-4455-{business_id % 1000}", VehicleType.SUV, "Mitsubishi", "Pajero Sport", 2023, VehicleFuelType.OCTANE, Decimal("18300.00"), None),
    ]

    created_vehicles = []
    for v_num, v_type, make, model, year, fuel, odo, drv_id in vehicles_data:
        veh = Vehicle(
            business_id=business_id,
            vehicle_number=v_num,
            vehicle_type=v_type,
            brand_make=make,
            model_name=model,
            model_year=year,
            fuel_type=fuel,
            current_odometer_km=odo,
            assigned_driver_id=drv_id,
            status=VehicleStatus.AVAILABLE,
            ownership_type=VehicleOwnershipType.COMPANY_OWNED,
            brta_fitness_expiry_date=today + timedelta(days=180),
            brta_tax_token_expiry_date=today + timedelta(days=220),
            brta_route_permit_expiry_date=today + timedelta(days=300),
            insurance_policy_number=f"POL-{v_num[-4:]}",
            insurance_company="Green Delta Insurance",
            insurance_expiry_date=today + timedelta(days=150),
            is_active=True,
        )
        db.add(veh)
        db.flush()
        log_record("fleet_vehicles", str(veh.id))
        created_vehicles.append(veh)
        counts["vehicles"] += 1

    # 3. Seed Requisitions & Trips
    req = VehicleRequisition(
        business_id=business_id,
        requisition_number=f"SEED-REQ-2026-001-{business_id % 1000}",
        purpose="[SEED] Client deployment and ERP workshop",
        destination="Gazipur Export Processing Zone",
        start_datetime=datetime.now(timezone.utc) - timedelta(days=2),
        estimated_end_datetime=datetime.now(timezone.utc) - timedelta(days=1),
        passenger_count=3,
        priority=RequisitionPriority.URGENT,
        status=RequisitionStatus.COMPLETED,
        allocated_vehicle_id=created_vehicles[0].id,
        allocated_driver_id=created_drivers[0].id,
    )
    db.add(req)
    db.flush()
    log_record("fleet_vehicle_requisitions", str(req.id))
    counts["requisitions"] += 1

    trip = TripLog(
        business_id=business_id,
        requisition_id=req.id,
        vehicle_id=created_vehicles[0].id,
        driver_id=created_drivers[0].id,
        trip_number=f"SEED-TRIP-001-{business_id % 1000}",
        start_time=datetime.now(timezone.utc) - timedelta(days=2),
        end_time=datetime.now(timezone.utc) - timedelta(days=1),
        start_odometer_km=Decimal("34380.00"),
        end_odometer_km=Decimal("34500.00"),
        distance_covered_km=Decimal("120.00"),
        toll_expenses=Decimal("350.00"),
        status=TripStatus.COMPLETED,
        route_summary="[SEED] Smooth transit via Dhaka Bypass Expressway",
    )
    db.add(trip)
    db.flush()
    log_record("fleet_trip_logs", str(trip.id))
    counts["trips"] += 1

    # 4. Seed Fuel Logs
    fuel = FuelLog(
        business_id=business_id,
        vehicle_id=created_vehicles[0].id,
        driver_id=created_drivers[0].id,
        logged_at=datetime.now(timezone.utc) - timedelta(days=3),
        odometer_at_fueling=Decimal("34350.00"),
        fuel_type=VehicleFuelType.OCTANE,
        quantity=Decimal("45.50"),
        unit_price=Decimal("130.00"),
        total_cost=Decimal("5915.00"),
        filling_station_name="[SEED] Padma Oil Pump, Mohakhali",
    )
    db.add(fuel)
    db.flush()
    log_record("fleet_fuel_logs", str(fuel.id))
    counts["fuel_logs"] += 1

    # 5. Seed Work Order
    wo = WorkOrder(
        business_id=business_id,
        work_order_number=f"SEED-WO-2026-001-{business_id % 1000}",
        vehicle_id=created_vehicles[1].id,
        maintenance_type=MaintenanceType.SCHEDULED_PREVENTIVE,
        priority=WorkOrderPriority.MEDIUM,
        odometer_at_service=Decimal("48000.00"),
        service_vendor_name="[SEED] Navana Toyota Service Center, Tejgaon",
        issued_at=datetime.now(timezone.utc) - timedelta(days=10),
        completed_at=datetime.now(timezone.utc) - timedelta(days=9),
        total_parts_cost=Decimal("12500.00"),
        total_labor_cost=Decimal("3000.00"),
        total_cost=Decimal("15500.00"),
        status=WorkOrderStatus.COMPLETED,
    )
    db.add(wo)
    db.flush()
    log_record("fleet_work_orders", str(wo.id))
    counts["work_orders"] += 1

    # 6. Seed Tire Logs
    tire = TireLog(
        business_id=business_id,
        vehicle_id=created_vehicles[0].id,
        tire_serial_number=f"SEED-TIRE-BR-01-{business_id % 1000}",
        brand_and_size="Bridgestone 195/65 R15",
        position=TirePosition.FRONT_LEFT,
        installed_date=today - timedelta(days=90),
        installed_odometer_km=Decimal("30000.00"),
        tread_depth_mm=Decimal("7.2"),
        status=TireStatus.IN_SERVICE,
    )
    db.add(tire)
    db.flush()
    log_record("fleet_tire_logs", str(tire.id))
    counts["tires"] += 1

    return counts
