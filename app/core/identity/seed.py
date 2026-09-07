"""
Seeding script for default system permissions and System Admin user.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.core.identity.models import Permission, Role, User
from app.core.security import hash_password

SYSTEM_MODULES = {
    "general": {
        "title": "GENERAL PERMISSIONS",
        "icon": "fas font-cog",
        "features": [
            ("business_profile", "Business Profile"),
            ("users_permissions", "Users & Permissions"),
            ("maintenance_mode", "Maintenance Mode"),
        ],
    },
    "hrm": {
        "title": "HRM PERMISSIONS",
        "icon": "fas fa-users-cog",
        "features": [
            ("departments", "Departments"),
            ("job_titles", "Job Titles"),
            ("employees", "Employees"),
            ("leave_types", "Leave Types"),
            ("leave_allocations", "Leave Allocations"),
            ("leave_applications", "Leave Requests"),
            ("attendance", "Attendance"),
            ("compensation", "Compensation"),
            ("holidays", "Holidays"),
            ("payroll_periods", "Payroll Periods"),
            ("payroll_records", "Payslips"),
            ("payroll_settings", "Payroll Settings"),
            ("salary_certificates", "Salary Certificates"),
            ("appointment_letters", "Appointment Letters"),
            ("notice_board", "Notice Board"),
            ("recruitment", "Recruitment"),
        ],
    },
    "ecommerce": {
        "title": "ECOMMERCE PERMISSIONS",
        "icon": "fas fa-shopping-cart",
        "features": [
            ("categories", "Categories"),
            ("brands", "Brands"),
            ("models", "Models"),
            ("products", "Products"),
            ("orders", "Orders"),
            ("inventory", "Inventory"),
            ("customers", "Customers"),
        ],
    },
}

ACTIONS = ["view", "create", "update", "delete"]


def get_default_permissions_list() -> list[dict]:
    permissions = []
    for module_key, module_info in SYSTEM_MODULES.items():
        for feature_key, feature_name in module_info["features"]:
            for action in ACTIONS:
                code = f"{module_key}:{feature_key}:{action}"
                name = f"{feature_name} {action.capitalize()}"
                permissions.append(
                    {
                        "module": module_key,
                        "feature": feature_key,
                        "action": action,
                        "code": code,
                        "name": name,
                    }
                )
    return permissions


async def seed_system_admin_and_permissions(db: AsyncSession) -> None:
    # 1. Seed Permissions
    for perm_data in get_default_permissions_list():
        result = await db.execute(
            select(Permission).where(Permission.code == perm_data["code"])
        )
        existing_perm = result.scalar_one_or_none()
        if not existing_perm:
            perm = Permission(**perm_data)
            db.add(perm)

    await db.flush()

    # 2. Seed Default Admin Role
    result = await db.execute(select(Role).where(Role.name == "admin", Role.business_id.is_(None)))
    admin_role = result.scalar_one_or_none()
    if not admin_role:
        admin_role = Role(
            name="admin",
            description="System Administrator with full access",
            business_id=None,
        )
        db.add(admin_role)
        await db.flush()

    # 3. Seed System Admin User
    admin_email = "admin@example.com"
    result = await db.execute(select(User).where((User.email == admin_email) | (User.username == "admin")))
    admin_user = result.scalar_one_or_none()

    if not admin_user:
        admin_user = User(
            username="admin",
            email=admin_email,
            password_hash=hash_password("19863022#"),
            is_active=True,
            is_verified=True,
            is_superuser=True,
            business_id=None,
        )
        if admin_role and admin_role not in admin_user.roles:
            admin_user.roles.append(admin_role)
        db.add(admin_user)
    else:
        admin_user.is_superuser = True
        admin_user.is_active = True
        if admin_role and admin_role not in admin_user.roles:
            admin_user.roles.append(admin_role)

    await db.commit()


def seed_system_admin_and_permissions_sync(db: Session) -> None:
    # Sync version for sync table startup if needed
    for perm_data in get_default_permissions_list():
        existing = db.query(Permission).filter(Permission.code == perm_data["code"]).first()
        if not existing:
            db.add(Permission(**perm_data))
    db.flush()

    admin_role = db.query(Role).filter(Role.name == "admin", Role.business_id.is_(None)).first()
    if not admin_role:
        admin_role = Role(
            name="admin",
            description="System Administrator with full access",
            business_id=None,
        )
        db.add(admin_role)
        db.flush()

    admin_email = "admin@example.com"
    admin_user = db.query(User).filter((User.email == admin_email) | (User.username == "admin")).first()
    if not admin_user:
        admin_user = User(
            username="admin",
            email=admin_email,
            password_hash=hash_password("19863022#"),
            is_active=True,
            is_verified=True,
            is_superuser=True,
            business_id=None,
        )
        if admin_role and admin_role not in admin_user.roles:
            admin_user.roles.append(admin_role)
        db.add(admin_user)
    else:
        admin_user.is_superuser = True
        admin_user.is_active = True
        if admin_role and admin_role not in admin_user.roles:
            admin_user.roles.append(admin_role)

    db.commit()
