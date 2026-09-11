"""
Seeding script for default system permissions and System Admin user.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, selectinload

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
            existing_perm = Permission(**perm_data)
            db.add(existing_perm)

    await db.flush()

    # Fetch all permissions from DB
    res_perms = await db.execute(select(Permission))
    db_all_perms = list(res_perms.scalars().all())

    # 2. Seed Default Admin Role
    result = await db.execute(
        select(Role)
        .options(selectinload(Role.permissions))
        .where(Role.name == "admin", Role.business_id.is_(None))
    )
    admin_role = result.scalar_one_or_none()
    if not admin_role:
        admin_role = Role(
            name="admin",
            description="System Administrator with full access",
            business_id=None,
        )
        db.add(admin_role)
        await db.flush()
        result = await db.execute(
            select(Role)
            .options(selectinload(Role.permissions))
            .where(Role.id == admin_role.id)
        )
        admin_role = result.scalar_one()

    # Assign all permissions to system admin role
    admin_role.permissions.clear()
    for p in db_all_perms:
        admin_role.permissions.append(p)

    # 3. Seed System Admin User
    admin_email = "admin@example.com"
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles))
        .where((User.email == admin_email) | (User.username == "admin"))
    )
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
        user_role_ids = {r.id for r in admin_user.roles}
        if admin_role and admin_role.id not in user_role_ids:
            admin_user.roles.append(admin_role)

    # 4. Seed Demo User
    demo_email = "demo@gmail.com"
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles))
        .where((User.email == demo_email) | (User.username == demo_email) | (User.username == "demo"))
    )
    demo_user = result.scalar_one_or_none()

    if not demo_user:
        demo_user = User(
            username=demo_email,
            email=demo_email,
            password_hash=hash_password("12345678"),
            is_active=True,
            is_verified=True,
            is_superuser=True,
            business_id=None,
        )
        if admin_role and admin_role not in demo_user.roles:
            demo_user.roles.append(admin_role)
        db.add(demo_user)
    else:
        demo_user.is_superuser = True
        demo_user.is_active = True
        demo_user.password_hash = hash_password("12345678")
        user_role_ids = {r.id for r in demo_user.roles}
        if admin_role and admin_role.id not in user_role_ids:
            demo_user.roles.append(admin_role)

    # 5. Seed Default Subscription Plans
    from app.core.billing.models import SubscriptionPlan
    res_plan = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.name == "Enterprise"))
    ent_plan = res_plan.scalar_one_or_none()
    if not ent_plan:
        ent_plan = SubscriptionPlan(
            name="Enterprise",
            description="Unlimited access to all modules and feature sets",
            is_active=True,
        )
        ent_plan.permissions = list(db_all_perms)
        db.add(ent_plan)

    res_plan_pro = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.name == "Pro"))
    pro_plan = res_plan_pro.scalar_one_or_none()
    if not pro_plan:
        pro_plan = SubscriptionPlan(
            name="Pro",
            description="Professional plan with HRM and Ecommerce capabilities",
            is_active=True,
        )
        pro_plan.permissions = list(db_all_perms)
        db.add(pro_plan)

    res_plan_free = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.name == "Free"))
    free_plan = res_plan_free.scalar_one_or_none()
    if not free_plan:
        free_plan = SubscriptionPlan(
            name="Free",
            description="Free tier with basic view permissions",
            is_active=True,
        )
        free_plan.permissions = [p for p in db_all_perms if p.action == "view"]
        db.add(free_plan)

    await db.commit()


def seed_system_admin_and_permissions_sync(db: Session) -> None:
    # Sync version for sync table startup
    for perm_data in get_default_permissions_list():
        existing = db.query(Permission).filter(Permission.code == perm_data["code"]).first()
        if not existing:
            existing = Permission(**perm_data)
            db.add(existing)
    db.flush()

    db_all_perms = db.query(Permission).all()

    admin_role = db.query(Role).filter(Role.name == "admin", Role.business_id.is_(None)).first()
    if not admin_role:
        admin_role = Role(
            name="admin",
            description="System Administrator with full access",
            business_id=None,
        )
        db.add(admin_role)
        db.flush()

    admin_role.permissions = list(db_all_perms)

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
        user_role_ids = {r.id for r in admin_user.roles}
        if admin_role and admin_role.id not in user_role_ids:
            admin_user.roles.append(admin_role)

    demo_email = "demo@gmail.com"
    demo_user = db.query(User).filter(
        (User.email == demo_email) | (User.username == demo_email) | (User.username == "demo")
    ).first()
    if not demo_user:
        demo_user = User(
            username=demo_email,
            email=demo_email,
            password_hash=hash_password("12345678"),
            is_active=True,
            is_verified=True,
            is_superuser=True,
            business_id=None,
        )
        if admin_role and admin_role not in demo_user.roles:
            demo_user.roles.append(admin_role)
        db.add(demo_user)
    else:
        demo_user.is_superuser = True
        demo_user.is_active = True
        demo_user.password_hash = hash_password("12345678")
        user_role_ids = {r.id for r in demo_user.roles}
        if admin_role and admin_role.id not in user_role_ids:
            demo_user.roles.append(admin_role)

    # Seed Default Subscription Plans
    from app.core.billing.models import SubscriptionPlan
    ent_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == "Enterprise").first()
    if not ent_plan:
        ent_plan = SubscriptionPlan(
            name="Enterprise",
            description="Unlimited access to all modules and feature sets",
            is_active=True,
        )
        ent_plan.permissions = list(db_all_perms)
        db.add(ent_plan)

    pro_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == "Pro").first()
    if not pro_plan:
        pro_plan = SubscriptionPlan(
            name="Pro",
            description="Professional plan with HRM and Ecommerce capabilities",
            is_active=True,
        )
        pro_plan.permissions = list(db_all_perms)
        db.add(pro_plan)

    free_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == "Free").first()
    if not free_plan:
        free_plan = SubscriptionPlan(
            name="Free",
            description="Free tier with basic view permissions",
            is_active=True,
        )
        free_plan.permissions = [p for p in db_all_perms if p.action == "view"]
        db.add(free_plan)

    db.commit()
