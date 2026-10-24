import os
import sys
import uuid
from unittest.mock import patch

# Force test environment variables before any app modules are loaded
os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models_registry  # noqa: F401
from app.core.deps import get_current_user, get_current_user_optional
from app.core.identity.models import Permission, Role, User
from app.core.billing.models import SubscriptionPlan
from app.core.tenancy.models import BusinessProfile
from app.core.identity.seed import seed_system_admin_and_permissions_sync
from app.database import Base, get_db
from app.main import app

# Universal in-memory SQLite engine
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def mock_passlib_hasher():
    """Auto-mock password hasher to prevent passlib bcrypt missing backend error in tests."""
    with patch("app.core.identity.seed.hash_password", return_value="$2b$12$mockedHashedPasswordForTestEnvironment00000000"):
        yield


@pytest.fixture
def db():
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        with patch("app.core.identity.seed.hash_password", return_value="$2b$12$mockedHashedPasswordForTestEnvironment00000000"):
            seed_system_admin_and_permissions_sync(session)
        session.commit()
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client_factory(db):
    def _create_client(current_user=None):
        def _get_db():
            yield db

        def _get_user(request=None):
            return current_user

        app.dependency_overrides[get_db] = _get_db
        if current_user is not None:
            app.dependency_overrides[get_current_user] = _get_user
            app.dependency_overrides[get_current_user_optional] = _get_user
        else:
            app.dependency_overrides.pop(get_current_user, None)
            app.dependency_overrides.pop(get_current_user_optional, None)

        transport = ASGITransport(app=app)
        return AsyncClient(transport=transport, base_url="http://test")

    yield _create_client
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client(db):
    def _get_db():
        yield db

    app.dependency_overrides[get_db] = _get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()