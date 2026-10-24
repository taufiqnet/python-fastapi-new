import uuid
from datetime import date
from unittest.mock import patch
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models_registry  # noqa: F401
from app.core.billing.models import SubscriptionPlan
from app.core.deps import get_current_user, get_current_user_optional
from app.core.identity.models import Permission, Role, User
from app.core.identity.seed import (
    ACTIONS,
    SYSTEM_MODULES,
    seed_system_admin_and_permissions_sync,
)
from app.core.tenancy.models import BusinessProfile
from app.database import Base, get_db
from app.main import app
from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.organization.models import Department, JobTitle

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        with patch("app.core.identity.seed.hash_password", return_value="mock_hashed_pw"):
            seed_system_admin_and_permissions_sync(session)
        session.commit()
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


def test_seed_permissions_and_tiers_partitioning(db_session):
    hrm_features = [f[0] for f in SYSTEM_MODULES["hrm"]["features"]]
    assert len(hrm_features) == 51

    # Verify Roles
    role_basic = db_session.query(Role).filter(Role.name == "hr_basic").first()
    role_pro = db_session.query(Role).filter(Role.name == "hr_pro").first()
    role_enterprise = db_session.query(Role).filter(Role.name == "hr_enterprise").first()

    assert role_basic is not None
    assert role_pro is not None
    assert role_enterprise is not None

    basic_perms = {p.code for p in role_basic.permissions}
    pro_perms = {p.code for p in role_pro.permissions}
    enterprise_perms = {p.code for p in role_enterprise.permissions}

    # 1. Basic Boundary Checks
    assert "hrm:departments:view" in basic_perms
    assert "hrm:employees:view" in basic_perms
    assert "hrm:attendance:view" in basic_perms
    assert "hrm:employee_documents:view" in basic_perms
    assert "hrm:employee_documents:create" in basic_perms
    assert "hrm:resignations:create" in basic_perms

    # Pro-only should NOT be in basic
    assert "hrm:compensation:view" not in basic_perms
    assert "hrm:payroll_records:view" not in basic_perms
    assert "hrm:biometric_devices:view" not in basic_perms
    assert "hrm:document_templates:view" not in basic_perms
    assert "hrm:separations:view" not in basic_perms

    # Enterprise-only should NOT be in basic
    assert "hrm:recruitment:view" not in basic_perms
    assert "hrm:bulk_letters:view" not in basic_perms
    assert "hrm:document_signatures:create" not in basic_perms

    # 2. Pro Boundary Checks
    assert "hrm:departments:view" in pro_perms
    assert "hrm:compensation:view" in pro_perms
    assert "hrm:payroll_records:view" in pro_perms
    assert "hrm:biometric_devices:view" in pro_perms
    assert "hrm:document_templates:view" in pro_perms
    assert "hrm:separations:view" in pro_perms
    assert "hrm:assets:view" in pro_perms
    assert "hrm:travel_requests:view" in pro_perms

    # Enterprise-only should NOT be in pro
    assert "hrm:recruitment:view" not in pro_perms
    assert "hrm:bulk_letters:view" not in pro_perms
    assert "hrm:document_signatures:create" not in pro_perms
    assert "hrm:disciplinary_cases:view" not in pro_perms
    assert "hrm:performance_cycles:view" not in pro_perms

    # 3. Enterprise Boundary Checks
    assert "hrm:recruitment:view" in enterprise_perms
    assert "hrm:bulk_letters:view" in enterprise_perms
    assert "hrm:bulk_letters:create" in enterprise_perms
    assert "hrm:document_signatures:create" in enterprise_perms
    assert "hrm:disciplinary_cases:view" in enterprise_perms
    assert "hrm:performance_cycles:view" in enterprise_perms
    assert "hrm:career_movements:view" in enterprise_perms
    assert "general:ai_assistant:view" in enterprise_perms

    # Verify Subscription Plans
    plan_basic = db_session.query(SubscriptionPlan).filter(SubscriptionPlan.name == 'HR Payroll (Basic)').first()
    plan_pro = db_session.query(SubscriptionPlan).filter(SubscriptionPlan.name == 'HR Payroll (Pro)').first()
    plan_enterprise = db_session.query(SubscriptionPlan).filter(SubscriptionPlan.name == 'HR Payroll (Enterprise)').first()

    assert plan_basic is not None
    assert plan_pro is not None
    assert plan_enterprise is not None

    plan_basic_codes = {p.code for p in plan_basic.permissions}
    plan_pro_codes = {p.code for p in plan_pro.permissions}
    plan_enterprise_codes = {p.code for p in plan_enterprise.permissions}

    assert plan_basic_codes == basic_perms
    assert plan_pro_codes == pro_perms
    assert plan_enterprise_codes == enterprise_perms


@pytest.mark.asyncio
async def test_endpoint_access_enforcement_by_tier(db_session):
    role_basic = db_session.query(Role).filter(Role.name == "hr_basic").first()
    role_pro = db_session.query(Role).filter(Role.name == "hr_pro").first()
    role_enterprise = db_session.query(Role).filter(Role.name == "hr_enterprise").first()

    plan_ent = db_session.query(SubscriptionPlan).filter(SubscriptionPlan.name == 'HR Payroll (Enterprise)').first()
    biz = BusinessProfile(
        id=99,
        name_en="Access Control Test Corp",
        subscription_plan_id=plan_ent.id,
    )
    db_session.add(biz)
    db_session.commit()

    dept = Department(name="IT", code="IT", slug="it-dept", business_id=biz.id)
    db_session.add(dept)
    db_session.flush()

    job = JobTitle(name="Dev", department_id=dept.id, business_id=biz.id)
    db_session.add(job)
    db_session.flush()

    emp = Employee(
        business_id=biz.id,
        employee_id="EMP-1001",
        first_name="Alice",
        last_name="Smith",
        work_email="alice@test.com",
        department_id=dept.id,
        job_title_id=job.id,
        start_date=date(2025, 1, 1),
    )
    db_session.add(emp)
    db_session.commit()

    user_basic = User(
        id=101,
        username="user_basic",
        email="basic@test.com",
        password_hash="mock",
        business_id=biz.id,
        is_superuser=False,
        is_active=True,
    )
    user_basic.roles.append(role_basic)
    db_session.add(user_basic)

    user_pro = User(
        id=102,
        username="user_pro",
        email="pro@test.com",
        password_hash="mock",
        business_id=biz.id,
        is_superuser=False,
        is_active=True,
    )
    user_pro.roles.append(role_pro)
    db_session.add(user_pro)

    user_ent = User(
        id=103,
        username="user_ent",
        email="ent@test.com",
        password_hash="mock",
        business_id=biz.id,
        is_superuser=False,
        is_active=True,
    )
    user_ent.roles.append(role_enterprise)
    db_session.add(user_ent)
    db_session.commit()

    current_test_user = user_basic

    def override_get_current_user(request=None):
        return current_test_user

    def override_get_current_user_optional(request=None):
        return current_test_user

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_user_optional] = override_get_current_user
    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Basic User Tests
        current_test_user = user_basic

        res = await client.get("/documents/dossier")
        assert res.status_code == 200, res.text

        tpl_payload = {
            "business_id": biz.id,
            "name": "Standard Appointment Letter",
            "template_type": "appointment",
            "subject": "Appointment as Engineer",
            "content_html": "<p>Hello {{employee_name}}</p>",
        }
        res = await client.post("/documents/templates", json=tpl_payload)
        assert res.status_code == 403, "Expected 403 Forbidden for basic user accessing template creation"

        # 2. Pro User Tests
        current_test_user = user_pro

        res = await client.post("/documents/templates", json=tpl_payload)
        assert res.status_code == 201, res.text
        template_id = res.json()["id"]

        bulk_payload = {
            "business_id": biz.id,
            "template_id": template_id,
            "job_type": "appointment",
            "batch_title": "Batch Q4 Appointment Letters",
            "issue_date": str(date.today()),
            "employee_ids": [str(emp.id)],
        }
        res = await client.post("/documents/bulk-letters/generate", json=bulk_payload)
        assert res.status_code == 403, "Expected 403 Forbidden for pro user accessing bulk letter generation"

        # 3. Enterprise User Tests
        current_test_user = user_ent

        res = await client.post("/documents/bulk-letters/generate", json=bulk_payload)
        assert res.status_code == 201, res.text

    app.dependency_overrides.clear()