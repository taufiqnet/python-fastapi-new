"""
Unit and integration tests for System Test Seed Data Generation and One-Click Purge.
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.core.identity.models import User
from app.core.tenancy.models import BusinessProfile
from app.core.deps import get_current_admin
from app.modules.system_seed.service import SeedManagerService
from app.modules.system_seed.models import SystemSeedBatch, SystemSeedRecord
from app.modules.vehicles.models import Vehicle, Driver
from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.organization.models import Department
from app.modules.ecommerce.products.models import Product
from app.modules.ecommerce.inventory.models import Warehouse
from app.modules.finance.models import Account, FiscalYear

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
    # Suppress SQLite cyclic drop warning
    try:
        Base.metadata.drop_all(bind=sync_engine)
    except Exception:
        pass


@pytest.fixture
def db():
    connection = sync_engine.connect()
    transaction = connection.begin()
    session = SyncTestingSessionLocal(bind=connection)

    # Ensure BusinessProfile 1 exists
    biz = session.query(BusinessProfile).filter_by(id=1).first()
    if not biz:
        biz = BusinessProfile(
            id=1,
            name_en="ProERP Seed Test Corp",
            short_name="ProERP",
            currency_code="BDT",
            is_active=True,
        )
        session.add(biz)
        session.flush()

    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def mock_admin(db):
    user = User(
        username="seedadmin",
        email="seedadmin@proerp.test",
        password_hash="secret_seed_hash",
        business_id=1,
        is_active=True,
        is_superuser=True,
    )
    db.add(user)
    db.flush()
    return user


def test_seed_generation_all_modules(db, mock_admin):
    """Verifies that all 4 modules generate valid records with proper registry tracking."""
    result = SeedManagerService.generate_module_seed(
        db=db,
        business_id=1,
        module="all",
        user_id=mock_admin.id,
    )

    assert result["total_records"] > 0
    assert "hrm" in result["modules"]
    assert "vehicles" in result["modules"]
    assert "ecommerce" in result["modules"]
    assert "finance" in result["modules"]

    # Verify batches in DB
    batches = db.query(SystemSeedBatch).filter_by(business_id=1).all()
    assert len(batches) == 4

    # Verify domain records exist
    assert db.query(Driver).count() >= 3
    assert db.query(Vehicle).count() >= 4
    assert db.query(Employee).count() >= 5
    assert db.query(Department).count() >= 5
    assert db.query(Product).count() >= 4
    assert db.query(Warehouse).count() >= 2
    assert db.query(Account).count() >= 10
    assert db.query(FiscalYear).count() >= 1


def test_seed_status_reporting(db, mock_admin):
    """Verifies status endpoint returns accurate live counts."""
    # Generate seed for vehicles only
    SeedManagerService.generate_module_seed(db, business_id=1, module="vehicles", user_id=mock_admin.id)

    status = SeedManagerService.get_seed_status(db, business_id=1)
    assert status["business_id"] == 1
    assert status["counts"]["vehicles"] > 0
    assert len(status["recent_batches"]) >= 1


def test_selective_module_purge(db, mock_admin):
    """Verifies purging one module deletes its records while preserving other modules."""
    # Generate vehicles and hrm
    SeedManagerService.generate_module_seed(db, business_id=1, module="vehicles", user_id=mock_admin.id)
    SeedManagerService.generate_module_seed(db, business_id=1, module="hrm", user_id=mock_admin.id)

    assert db.query(Driver).count() > 0
    assert db.query(Employee).count() > 0

    # Purge only vehicles
    purge_result = SeedManagerService.purge_module_seed(db, business_id=1, module="vehicles")
    assert purge_result["total_purged"] > 0

    # Vehicles should be 0, but HRM should still exist
    assert db.query(Driver).count() == 0
    assert db.query(Vehicle).count() == 0
    assert db.query(Employee).count() > 0

    # Clean up remaining hrm
    SeedManagerService.purge_module_seed(db, business_id=1, module="hrm")
    assert db.query(Employee).count() == 0


def test_api_system_seed_flow(db, mock_admin):
    """Tests the full API flow via FastAPI TestClient."""
    def override_get_db():
        yield db

    def override_get_admin():
        return mock_admin

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_admin] = override_get_admin

    client = TestClient(app)

    # 1. Initial Status
    res = client.get("/api/v1/system/seed-data/status")
    assert res.status_code == 200
    data = res.json()
    assert "counts" in data

    # 2. Generate E-Commerce seed
    res = client.post("/api/v1/system/seed-data/generate", json={"module": "ecommerce"})
    assert res.status_code == 201
    gen_data = res.json()
    assert gen_data["total_records"] > 0

    # 3. Verify status increased
    res = client.get("/api/v1/system/seed-data/status")
    assert res.status_code == 200
    assert res.json()["counts"]["ecommerce"] > 0

    # 4. Purge E-Commerce seed
    res = client.delete("/api/v1/system/seed-data/purge?module=ecommerce")
    assert res.status_code == 200
    assert res.json()["total_purged"] > 0

    # 5. Verify status returns to 0
    res = client.get("/api/v1/system/seed-data/status")
    assert res.json()["counts"]["ecommerce"] == 0

    app.dependency_overrides.clear()
