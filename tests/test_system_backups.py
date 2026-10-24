import os
import tempfile
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.core.identity.models import User
from app.core.deps import get_current_admin
from app.modules.system_backups.models import SystemBackup
from app.modules.system_backups.service import BackupService, format_human_size, calculate_sha256

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
def mock_admin_user(db):
    user = User(
        username="sysadmin",
        email="sysadmin@proerp.com",
        password_hash="hashed_secret",
        is_active=True,
        is_superuser=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def temp_storage():
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


def test_format_human_size():
    assert format_human_size(500) == "500 B"
    assert format_human_size(2048) == "2.0 KB"
    assert format_human_size(5 * 1024 * 1024) == "5.00 MB"


@pytest.mark.asyncio
async def test_backup_service_create_and_delete(db, mock_admin_user, temp_storage):
    service = BackupService(storage_dir=temp_storage)

    # Create backup snapshot
    record = await service.create_backup(
        db=db,
        user_id=mock_admin_user.id,
        backup_type="manual_admin",
    )

    assert record.id is not None
    assert record.filename.startswith("proerp_backup_")
    assert record.status == "completed"
    assert record.file_size_bytes > 0
    assert len(record.checksum_sha256) == 64  # SHA-256 is 64 hex chars
    assert os.path.exists(record.filepath)

    # Verify listing
    backups = service.list_backups(db)
    assert len(backups) >= 1
    assert backups[0].id == record.id

    # Verify delete
    file_path = record.filepath
    success = service.delete_backup(db, record.id)
    assert success is True
    assert not os.path.exists(file_path)
    assert service.get_backup(db, record.id) is None


def test_api_system_backups_flow(db, mock_admin_user, temp_storage):
    # Override get_db and get_current_admin dependencies
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_admin] = lambda: mock_admin_user

    client = TestClient(app)

    try:
        # 1. Trigger backup creation via API
        response = client.post("/api/v1/system/backups", json={"backup_type": "manual_admin"})
        assert response.status_code == 201
        data = response.json()
        assert data["message"] == "Database backup created successfully"
        backup_id = data["backup"]["id"]
        assert data["backup"]["status"] == "completed"
        assert data["backup"]["checksum_sha256"] is not None

        # 2. List backups via API
        list_resp = client.get("/api/v1/system/backups")
        assert list_resp.status_code == 200
        items = list_resp.json()
        assert len(items) >= 1
        assert any(b["id"] == backup_id for b in items)

        # 3. Download backup file
        dl_resp = client.get(f"/api/v1/system/backups/{backup_id}/download")
        assert dl_resp.status_code == 200
        assert "application/octet-stream" in dl_resp.headers["content-type"]
        assert len(dl_resp.content) > 0
        assert "X-Backup-Checksum-SHA256" in dl_resp.headers

        # 4. Delete backup
        del_resp = client.delete(f"/api/v1/system/backups/{backup_id}")
        assert del_resp.status_code == 204

        # Confirm 404 on re-download
        not_found_resp = client.get(f"/api/v1/system/backups/{backup_id}/download")
        assert not_found_resp.status_code == 404

    finally:
        app.dependency_overrides.clear()
