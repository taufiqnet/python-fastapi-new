import datetime
import uuid
from decimal import Decimal
import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.core.tenancy.models import BusinessProfile
from app.core.identity.models import User
from app.common.enums import Status
from app.modules.vehicles.models import (
    Driver,
    DriverLicenseGrade,
    DriverStatus,
    FuelLog,
    FuelPaymentMode,
    IncidentReport,
    IncidentType,
    MaintenanceSchedule,
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
    VehicleRequisition,
    VehicleStatus,
    VehicleType,
    WorkOrder,
    WorkOrderPriority,
    WorkOrderStatus,
)
from app.modules.vehicles.schemas import (
    DriverCreate,
    DriverUpdate,
    FuelLogCreate,
    IncidentReportCreate,
    MaintenanceScheduleCreate,
    RequisitionApproval,
    RequisitionCreate,
    RequisitionDispatch,
    TireLogCreate,
    TripComplete,
    TripStart,
    VehicleCreate,
    VehicleUpdate,
    WorkOrderCreate,
    WorkOrderUpdate,
)
from app.modules.vehicles.services import VehicleService

sync_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
SyncTestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=sync_engine
)


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=sync_engine)
    yield
    Base.metadata.drop_all(bind=sync_engine)


@pytest.fixture
def db():
    connection = sync_engine.connect()
    transaction = connection.begin()
    session = SyncTestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def business_one(db):
    biz = BusinessProfile(
        id=1,
        name_en="Apex Logistics BD Ltd",
        license_number="TL-DHAKA-2026-999",
        is_active=True,
    )
    db.add(biz)
    db.commit()
    db.refresh(biz)
    return biz


@pytest.fixture
def business_two(db):
    biz = BusinessProfile(
        id=2,
        name_en="Chittagong Freight Services Ltd",
        license_number="TL-CTG-2026-888",
        is_active=True,
    )
    db.add(biz)
    db.commit()
    db.refresh(biz)
    return biz


@pytest.fixture
def test_user(db, business_one):
    user = User(
        email="transport.manager@apexlogistics.com",
        username="transport_admin",
        password_hash="securepassword123",
        business_id=business_one.id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def vehicle_service():
    return VehicleService()


# ===========================================================================
# Test Cases
# ===========================================================================

def test_vehicle_registration_and_brta_uniqueness(db, business_one, business_two, vehicle_service):
    """Test BRTA vehicle registration, duplicate constraint per tenant, and multi-tenant isolation."""
    # 1. Register vehicle in Business One
    v_data1 = VehicleCreate(
        vehicle_number="Dhaka Metro-Ga 23-4567",
        vehicle_type=VehicleType.SEDAN,
        brand_make="Toyota",
        model_name="Corolla Axio",
        model_year=2022,
        chassis_number="NZE161-712345",
        engine_number="1NZ-FE-89211",
        seating_capacity=4,
        fuel_type=VehicleFuelType.OCTANE,
        current_odometer_km=Decimal("15200.00"),
        ownership_type=VehicleOwnershipType.COMPANY_OWNED,
        status=VehicleStatus.AVAILABLE,
    )
    v1 = vehicle_service.create_vehicle(db, business_one.id, v_data1)
    assert v1.id is not None
    assert v1.vehicle_number == "Dhaka Metro-Ga 23-4567"
    assert v1.business_id == business_one.id

    # 2. Attempt duplicate vehicle_number in same business -> raises 400
    with pytest.raises(HTTPException) as exc_info:
        vehicle_service.create_vehicle(db, business_one.id, v_data1)
    assert exc_info.value.status_code == 400
    assert "already exists" in exc_info.value.detail

    # 3. Same registration number in another tenant is isolated and allowed
    v2 = vehicle_service.create_vehicle(db, business_two.id, v_data1)
    assert v2.id is not None
    assert v2.business_id == business_two.id
    assert v2.id != v1.id

    # 4. Search and filter vehicles
    vehicles = vehicle_service.get_vehicles(db, business_one.id, search="Corolla")
    assert len(vehicles) == 1
    assert vehicles[0].model_name == "Corolla Axio"


def test_driver_licensing_and_grade_validation(db, business_one, vehicle_service):
    """Test driver creation with BRTA smart card driving license, uniqueness, and grading."""
    driver_data = DriverCreate(
        full_name="Mohammad Rafiqul Islam",
        phone="+8801711223344",
        emergency_phone="+8801911998877",
        nid_number="19852691234567890",
        license_number="DK0293847H",
        license_grade=DriverLicenseGrade.HEAVY,
        license_expiry_date=datetime.date.today() + datetime.timedelta(days=365),
        blood_group="B+",
        joining_date=datetime.date(2021, 5, 10),
        status=DriverStatus.ACTIVE,
        safety_score=Decimal("98.50"),
    )
    driver = vehicle_service.create_driver(db, business_one.id, driver_data)
    assert driver.id is not None
    assert driver.license_number == "DK0293847H"
    assert driver.license_grade == DriverLicenseGrade.HEAVY

    # Duplicate license in same business raises 400
    with pytest.raises(HTTPException) as exc:
        vehicle_service.create_driver(db, business_one.id, driver_data)
    assert exc.value.status_code == 400
    assert "already exists" in exc.value.detail


def test_brta_document_expiry_alerts_engine(db, business_one, vehicle_service):
    """Test BRTA fitness, tax token, 5-year CNG cylinder, insurance, and license expiration engine."""
    today = datetime.date.today()

    # Vehicle with expired fitness (-5 days), urgent tax token (+4 days), warning CNG (+20 days)
    v_data = VehicleCreate(
        vehicle_number="Dhaka Metro-Cha 54-1122",
        vehicle_type=VehicleType.MICROBUS,
        brand_make="Toyota",
        model_name="HiAce Super GL",
        seating_capacity=12,
        fuel_type=VehicleFuelType.CNG,
        cng_cylinder_capacity_liters=Decimal("90.0"),
        cng_last_test_date=today - datetime.timedelta(days=1825),
        cng_test_expiry_date=today + datetime.timedelta(days=20),  # Warning (<= 30 days)
        brta_fitness_expiry_date=today - datetime.timedelta(days=5),  # Expired (< 0 days)
        brta_tax_token_expiry_date=today + datetime.timedelta(days=4),  # Urgent (<= 7 days)
        insurance_expiry_date=today + datetime.timedelta(days=180),  # Safe (> 30 days)
        current_odometer_km=Decimal("84000.00"),
    )
    vehicle = vehicle_service.create_vehicle(db, business_one.id, v_data)

    # Driver with expired license (-3 days)
    d_data = DriverCreate(
        full_name="Abdul Karim",
        phone="+8801819998877",
        license_number="CTG776655L",
        license_grade=DriverLicenseGrade.MEDIUM,
        license_expiry_date=today - datetime.timedelta(days=3),  # Expired
    )
    driver = vehicle_service.create_driver(db, business_one.id, d_data)

    # Run document expiry alerts report
    alerts_report = vehicle_service.get_document_expiry_alerts(db, business_one.id, threshold_days=30)
    assert alerts_report.total_alerts >= 4
    assert alerts_report.expired_count >= 2  # Fitness & Driver License
    assert alerts_report.expiring_soon_count >= 2  # Tax token (4d) & CNG test (20d)

    # Check alert items
    categories = {a.category for a in alerts_report.alerts}
    assert "brta_fitness" in categories
    assert "brta_tax_token" in categories
    assert "cng_test" in categories
    assert "driver_license" in categories


def test_requisition_dispatch_concurrency_overlap(db, business_one, test_user, vehicle_service):
    """Test pool car booking, approval, vehicle dispatch, and overlapping double-booking prevention."""
    # 1. Create available vehicle and driver
    vehicle = vehicle_service.create_vehicle(
        db,
        business_one.id,
        VehicleCreate(
            vehicle_number="Dhaka Metro-Bha 11-9900",
            vehicle_type=VehicleType.SUV,
            brand_make="Mitsubishi",
            model_name="Pajero Sport",
            fuel_type=VehicleFuelType.DIESEL,
            current_odometer_km=Decimal("45000.00"),
        ),
    )
    driver = vehicle_service.create_driver(
        db,
        business_one.id,
        DriverCreate(
            full_name="Shoriful Islam",
            phone="+8801611002233",
            license_number="DHK998811M",
            license_grade=DriverLicenseGrade.MEDIUM,
            license_expiry_date=datetime.date.today() + datetime.timedelta(days=200),
        ),
    )

    # 2. Submit Requisition 1
    now = datetime.datetime.now(datetime.timezone.utc)
    t1_start = now + datetime.timedelta(hours=2)
    t1_end = now + datetime.timedelta(hours=6)

    req1 = vehicle_service.create_requisition(
        db,
        business_one.id,
        RequisitionCreate(
            purpose="Factory inspection at Gazipur Export Processing Zone",
            destination="Gazipur EPZ, Dhaka Division",
            start_datetime=t1_start,
            estimated_end_datetime=t1_end,
            passenger_count=3,
            priority=RequisitionPriority.URGENT,
        ),
    )
    assert req1.status == RequisitionStatus.PENDING_APPROVAL

    # 3. Approve and Dispatch Requisition 1
    vehicle_service.approve_requisition(
        db, business_one.id, req1.id, test_user.id, RequisitionApproval(approved=True)
    )
    req1_dispatched = vehicle_service.dispatch_requisition(
        db,
        business_one.id,
        req1.id,
        RequisitionDispatch(allocated_vehicle_id=vehicle.id, allocated_driver_id=driver.id),
    )
    assert req1_dispatched.status == RequisitionStatus.ALLOCATED

    # 4. Submit Requisition 2 with overlapping window (hours 3 to 7)
    t2_start = now + datetime.timedelta(hours=3)
    t2_end = now + datetime.timedelta(hours=7)
    req2 = vehicle_service.create_requisition(
        db,
        business_one.id,
        RequisitionCreate(
            purpose="Client meeting at Narayanganj textile mill",
            destination="Narayanganj BSCIC",
            start_datetime=t2_start,
            estimated_end_datetime=t2_end,
            passenger_count=2,
            priority=RequisitionPriority.ROUTINE,
        ),
    )
    vehicle_service.approve_requisition(
        db, business_one.id, req2.id, test_user.id, RequisitionApproval(approved=True)
    )

    # 5. Attempting to allocate the same vehicle during overlap raises 409 CONFLICT
    with pytest.raises(HTTPException) as exc:
        vehicle_service.dispatch_requisition(
            db,
            business_one.id,
            req2.id,
            RequisitionDispatch(allocated_vehicle_id=vehicle.id, allocated_driver_id=driver.id),
        )
    assert exc.value.status_code == 409
    assert "already allocated" in exc.value.detail


def test_trip_sheet_odometer_and_toll_calculation(db, business_one, vehicle_service):
    """Test start trip sheet, status transitions, trip completion, odometer sync, and Padma Bridge tolls."""
    vehicle = vehicle_service.create_vehicle(
        db,
        business_one.id,
        VehicleCreate(
            vehicle_number="Dhaka Metro-Ta 15-4321",
            vehicle_type=VehicleType.COVERED_VAN,
            brand_make="Tata",
            model_name="LPT 407",
            fuel_type=VehicleFuelType.DIESEL,
            current_odometer_km=Decimal("62100.00"),
        ),
    )
    driver = vehicle_service.create_driver(
        db,
        business_one.id,
        DriverCreate(
            full_name="Kamrul Hasan",
            phone="+8801511223344",
            license_number="CTG332211H",
            license_grade=DriverLicenseGrade.HEAVY,
            license_expiry_date=datetime.date.today() + datetime.timedelta(days=300),
        ),
    )

    # 1. Start Trip
    now = datetime.datetime.now(datetime.timezone.utc)
    trip = vehicle_service.start_trip(
        db,
        business_one.id,
        TripStart(
            vehicle_id=vehicle.id,
            driver_id=driver.id,
            start_time=now,
            start_odometer_km=Decimal("62100.00"),
            route_summary="Tejgaon Central Depot -> Padma Bridge -> Barishal Hub",
        ),
    )
    assert trip.id is not None
    assert trip.status == TripStatus.IN_PROGRESS

    # Vehicle and Driver statuses updated
    db.refresh(vehicle)
    db.refresh(driver)
    assert vehicle.status == VehicleStatus.ON_TRIP
    assert driver.status == DriverStatus.ON_DUTY

    # 2. Complete Trip (Distance: 245 km, Padma Bridge Toll: 1600 BDT, Driver DA: 800 BDT)
    completed_trip = vehicle_service.complete_trip(
        db,
        business_one.id,
        trip.id,
        TripComplete(
            end_time=now + datetime.timedelta(hours=6),
            end_odometer_km=Decimal("62345.00"),
            toll_expenses=Decimal("1600.00"),
            toll_receipt_urls=["https://storage.proerp.com/tolls/padma_bridge_slip_01.jpg"],
            driver_trip_allowance_da=Decimal("800.00"),
            fuel_consumed_estimate_liters=Decimal("28.00"),
            remarks="Delivered without incident. Padma Bridge toll receipt attached.",
        ),
    )
    assert completed_trip.status == TripStatus.COMPLETED
    assert completed_trip.distance_covered_km == Decimal("245.00")
    assert completed_trip.toll_expenses == Decimal("1600.00")
    assert completed_trip.driver_trip_allowance_da == Decimal("800.00")

    # Vehicle odometer updated and availability restored
    db.refresh(vehicle)
    db.refresh(driver)
    assert vehicle.current_odometer_km == Decimal("62345.00")
    assert vehicle.status == VehicleStatus.AVAILABLE
    assert driver.status == DriverStatus.ACTIVE


def test_fuel_logging_mileage_and_anomaly_detection(db, business_one, vehicle_service):
    """Test fuel refill entries, automated km/L calculation, and pilferage anomaly detection."""
    vehicle = vehicle_service.create_vehicle(
        db,
        business_one.id,
        VehicleCreate(
            vehicle_number="Dhaka Metro-Ga 44-7788",
            vehicle_type=VehicleType.SEDAN,
            brand_make="Toyota",
            model_name="Allion A15",
            fuel_type=VehicleFuelType.OCTANE,
            current_odometer_km=Decimal("20000.00"),
        ),
    )

    now = datetime.datetime.now(datetime.timezone.utc)

    # 1. First Refill (Base odometer 20,000 km, 40 Liters @ 135 BDT/L)
    f1 = vehicle_service.log_fuel(
        db,
        business_one.id,
        FuelLogCreate(
            vehicle_id=vehicle.id,
            logged_at=now - datetime.timedelta(days=7),
            odometer_at_fueling=Decimal("20000.00"),
            fuel_type=VehicleFuelType.OCTANE,
            quantity=Decimal("40.00"),
            unit_price=Decimal("135.00"),
            filling_station_name="Padma Oil Filling Station, Mohakhali",
            payment_mode=FuelPaymentMode.COMPANY_FUEL_CARD,
        ),
    )
    assert f1.total_cost == Decimal("5400.00")
    assert f1.calculated_km_per_liter is None  # Initial fill has no delta
    assert f1.is_anomaly_flagged is False

    # 2. Second Refill (Odometer 20,440 km -> Delta: 440 km / 40 L = 11.0 km/L)
    f2 = vehicle_service.log_fuel(
        db,
        business_one.id,
        FuelLogCreate(
            vehicle_id=vehicle.id,
            logged_at=now - datetime.timedelta(days=3),
            odometer_at_fueling=Decimal("20440.00"),
            fuel_type=VehicleFuelType.OCTANE,
            quantity=Decimal("40.00"),
            unit_price=Decimal("135.00"),
            filling_station_name="Meghna Petroleum, Airport Road",
            payment_mode=FuelPaymentMode.COMPANY_FUEL_CARD,
        ),
    )
    assert f2.calculated_km_per_liter == Decimal("11.00")
    assert f2.is_anomaly_flagged is False

    # 3. Third Refill with Abnormal Drop / Pilferage (Delta: 80 km / 40 L = 2.0 km/L < 3.0 km/L)
    f3 = vehicle_service.log_fuel(
        db,
        business_one.id,
        FuelLogCreate(
            vehicle_id=vehicle.id,
            logged_at=now,
            odometer_at_fueling=Decimal("20520.00"),
            fuel_type=VehicleFuelType.OCTANE,
            quantity=Decimal("40.00"),
            unit_price=Decimal("135.00"),
            filling_station_name="Jamuna Oil, Gazipur",
            payment_mode=FuelPaymentMode.COMPANY_FUEL_CARD,
        ),
    )
    assert f3.calculated_km_per_liter == Decimal("2.00")
    assert f3.is_anomaly_flagged is True  # Pilferage alert triggered!


def test_work_orders_tires_and_fleet_overview_stats(db, business_one, vehicle_service):
    """Test maintenance work orders, tire management, and aggregate dashboard statistics."""
    vehicle = vehicle_service.create_vehicle(
        db,
        business_one.id,
        VehicleCreate(
            vehicle_number="Dhaka Metro-Na 88-1234",
            vehicle_type=VehicleType.PICKUP,
            brand_make="Toyota",
            model_name="Hilux Revo",
            fuel_type=VehicleFuelType.DIESEL,
            current_odometer_km=Decimal("50000.00"),
        ),
    )
    driver = vehicle_service.create_driver(
        db,
        business_one.id,
        DriverCreate(
            full_name="Abul Bashar",
            phone="+8801700112233",
            license_number="DK990011L",
            license_grade=DriverLicenseGrade.LIGHT,
            license_expiry_date=datetime.date.today() + datetime.timedelta(days=120),
        ),
    )

    # 1. Log Tire
    tire = vehicle_service.log_tire(
        db,
        business_one.id,
        TireLogCreate(
            vehicle_id=vehicle.id,
            tire_serial_number="BS-2026-9871A",
            brand_and_size="Bridgestone 265/65 R17",
            position=TirePosition.FRONT_LEFT,
            installed_date=datetime.date.today(),
            installed_odometer_km=Decimal("50000.00"),
            tread_depth_mm=Decimal("8.5"),
        ),
    )
    assert tire.id is not None
    assert tire.status == TireStatus.IN_SERVICE

    # 2. Issue Work Order
    now = datetime.datetime.now(datetime.timezone.utc)
    wo = vehicle_service.create_work_order(
        db,
        business_one.id,
        WorkOrderCreate(
            vehicle_id=vehicle.id,
            maintenance_type=MaintenanceType.SCHEDULED_PREVENTIVE,
            priority=WorkOrderPriority.HIGH,
            odometer_at_service=Decimal("50000.00"),
            service_vendor_name="Navana Motors Workshop, Tejgaon",
            issued_at=now,
            total_labor_cost=Decimal("3500.00"),
            total_parts_cost=Decimal("8200.00"),
            tasks_performed=["Synthetic Engine Oil 5W-30 Replacement", "Oil Filter", "Air Filter", "Brake Pad Inspection"],
        ),
    )
    assert wo.id is not None
    assert wo.total_cost == Decimal("11700.00")
    assert wo.status == WorkOrderStatus.IN_PROGRESS

    # Vehicle marked UNDER_MAINTENANCE
    db.refresh(vehicle)
    assert vehicle.status == VehicleStatus.UNDER_MAINTENANCE

    # 3. Complete Work Order
    wo_done = vehicle_service.update_work_order(
        db,
        business_one.id,
        wo.id,
        WorkOrderUpdate(
            status=WorkOrderStatus.COMPLETED,
            completed_at=now + datetime.timedelta(hours=5),
        ),
    )
    assert wo_done.status == WorkOrderStatus.COMPLETED

    # Vehicle restored to AVAILABLE
    db.refresh(vehicle)
    assert vehicle.status == VehicleStatus.AVAILABLE

    # 4. Overview Statistics Check
    stats = vehicle_service.get_fleet_stats(db, business_one.id)
    assert stats.total_vehicles >= 1
    assert stats.total_drivers >= 1
    assert stats.total_fleet_odometer_km > 0
    assert stats.monthly_maintenance_cost_bdt >= Decimal("11700.00")
