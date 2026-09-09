from datetime import date
import pytest
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, selectinload
from sqlalchemy.pool import StaticPool

import app.models_registry
from app.database import Base
from app.core.identity.models import Permission, Role, User
from app.core.tenancy.models import BusinessProfile
from app.modules.hr_payroll.payroll.models import PayrollPeriod, PayrollPeriodStatusEnum
from app.services.ai.tools import execute_resolve_business, execute_resolve_payroll_period
from app.mcp import hr_report_server


@pytest.fixture
def db_session():
    sync_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SyncTestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)
    Base.metadata.create_all(bind=sync_engine)

    orig_sessionlocal = hr_report_server.SessionLocal
    hr_report_server.SessionLocal = SyncTestingSessionLocal

    db = SyncTestingSessionLocal()

    yield db

    db.close()
    hr_report_server.SessionLocal = orig_sessionlocal


@pytest.fixture
def test_data(db_session):
    # Create test business profiles
    biz1 = BusinessProfile(id=1, name_en="Acme Corporation", is_active=True)
    biz2 = BusinessProfile(id=2, name_en="Beta Ltd", is_active=True)
    db_session.add_all([biz1, biz2])
    db_session.commit()

    # Create permissions
    perm_biz_view = Permission(
        module="general", feature="business_profile", action="view", code="general:business_profile:view", name="View Business Profile"
    )
    perm_period_view = Permission(
        module="hrm", feature="payroll_periods", action="view", code="hrm:payroll_periods:view", name="View Payroll Periods"
    )
    db_session.add_all([perm_biz_view, perm_period_view])
    db_session.commit()

    # Create role with permissions
    role = Role(name="HR Manager", description="HR Manager Role")
    role.permissions.extend([perm_biz_view, perm_period_view])
    db_session.add(role)
    db_session.commit()

    # Create user
    user = User(
        id=1,
        username="hr_user",
        email="hr@acme.com",
        password_hash="hash",
        is_active=True,
        is_superuser=False,
        business_id=biz1.id,
    )
    user.roles.append(role)
    db_session.add(user)

    # Superuser
    admin = User(
        id=2,
        username="super_admin",
        email="admin@acme.com",
        password_hash="hash",
        is_active=True,
        is_superuser=True,
        business_id=None,
    )
    db_session.add(admin)

    # User without permissions
    noperm_user = User(
        id=3,
        username="no_perm",
        email="noperm@acme.com",
        password_hash="hash",
        is_active=True,
        is_superuser=False,
        business_id=biz1.id,
    )
    db_session.add(noperm_user)

    db_session.commit()

    # Create payroll periods for biz1
    period1 = PayrollPeriod(
        business_id=biz1.id,
        name="January 2025",
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 31),
        status=PayrollPeriodStatusEnum.DRAFT,
    )
    period2 = PayrollPeriod(
        business_id=biz1.id,
        name="February 2025",
        start_date=date(2025, 2, 1),
        end_date=date(2025, 2, 28),
        status=PayrollPeriodStatusEnum.PROCESSING,
    )
    # Payroll period for biz2
    period3 = PayrollPeriod(
        business_id=biz2.id,
        name="January 2025 Beta",
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 31),
        status=PayrollPeriodStatusEnum.DRAFT,
    )
    db_session.add_all([period1, period2, period3])
    db_session.commit()

    return {
        "biz1": biz1,
        "biz2": biz2,
        "user": user,
        "admin": admin,
        "noperm_user": noperm_user,
        "period1": period1,
        "period2": period2,
        "period3": period3,
    }


def test_resolve_business_success(db_session, test_data):
    admin = test_data["admin"]
    res = execute_resolve_business(db_session, admin, name="Acme")
    assert res.type == "list"
    assert res.total == 1
    assert res.rows[0]["business_id"] == test_data["biz1"].id
    assert res.rows[0]["name"] == "Acme Corporation"


def test_resolve_business_tenant_scoping(db_session, test_data):
    user = test_data["user"]
    # User can only see biz1
    res = execute_resolve_business(db_session, user, name="Beta")
    assert res.type == "list"
    assert res.total == 0

    res_acme = execute_resolve_business(db_session, user, name="Acme")
    assert res_acme.type == "list"
    assert res_acme.total == 1


def test_resolve_business_permission_denied(db_session, test_data):
    noperm_user = test_data["noperm_user"]
    res = execute_resolve_business(db_session, noperm_user, name="Acme")
    assert res.type == "error"
    assert "Permission denied" in res.message


def test_resolve_payroll_period_by_label(db_session, test_data):
    user = test_data["user"]
    biz1 = test_data["biz1"]
    res = execute_resolve_payroll_period(db_session, user, business_id=biz1.id, label="January")
    assert res.type == "list"
    assert res.total == 1
    assert res.rows[0]["name"] == "January 2025"
    assert res.rows[0]["payroll_period_id"] == str(test_data["period1"].id)


def test_resolve_payroll_period_by_month_and_year(db_session, test_data):
    user = test_data["user"]
    biz1 = test_data["biz1"]
    res = execute_resolve_payroll_period(db_session, user, business_id=biz1.id, month="Feb", year=2025)
    assert res.type == "list"
    assert res.total == 1
    assert res.rows[0]["name"] == "February 2025"
    assert res.rows[0]["payroll_period_id"] == str(test_data["period2"].id)


def test_resolve_payroll_period_tenant_scoping_denied(db_session, test_data):
    user = test_data["user"]
    biz2 = test_data["biz2"]
    # User belongs to biz1, attempting to access biz2
    res = execute_resolve_payroll_period(db_session, user, business_id=biz2.id, month="January")
    assert res.type == "error"
    assert "Tenant scoping violation" in res.message


def test_resolve_payroll_period_permission_denied(db_session, test_data):
    noperm_user = test_data["noperm_user"]
    biz1 = test_data["biz1"]
    res = execute_resolve_payroll_period(db_session, noperm_user, business_id=biz1.id, month="January")
    assert res.type == "error"
    assert "Permission denied" in res.message


def test_mcp_resolve_tools(monkeypatch, db_session, test_data):
    user = test_data["user"]
    biz1 = test_data["biz1"]

    def sync_resolve_acting_user():
        s = hr_report_server.SessionLocal()
        try:
            u = s.query(User).options(
                selectinload(User.roles).selectinload(Role.permissions),
                selectinload(User.direct_permissions),
            ).filter(User.id == user.id).first()
            if u:
                _ = u.get_all_permission_codes()
            return u
        finally:
            s.close()

    monkeypatch.setenv("MCP_ACTING_USER_ID", str(user.id))
    monkeypatch.setattr(hr_report_server, "resolve_acting_user", sync_resolve_acting_user)

    res_biz = hr_report_server.resolve_business(name="Acme")
    assert isinstance(res_biz, dict)
    assert res_biz["type"] == "list"
    assert len(res_biz["rows"]) == 1
    assert res_biz["rows"][0]["name"] == "Acme Corporation"

    res_period = hr_report_server.resolve_payroll_period(business_id=biz1.id, month="1", year=2025)
    assert isinstance(res_period, dict)
    assert res_period["type"] == "list"
    assert len(res_period["rows"]) == 1
    assert res_period["rows"][0]["name"] == "January 2025"
