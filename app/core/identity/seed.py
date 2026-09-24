"""
Seeding script for default system permissions, System Admin user,
and a complete test environment for WBSOFT (Inventory & HR/Payroll).
"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, selectinload

from app.core.billing.models import SubscriptionPlan
from app.core.identity.models import Permission, Role, User
from app.core.security import hash_password
from app.core.tenancy.models import BusinessProfile
from app.modules.ecommerce.brands.models import Brand, ProductModel
from app.modules.ecommerce.categories.models import Category
from app.modules.ecommerce.inventory.models import (
    CostLayer,
    InventoryItem,
    Item,
    ItemType,
    StockMovement,
    StockMovementReason,
    StockTransfer,
    StockTransferLine,
    TrackingType,
    TransferStatus,
    UnitOfMeasure,
    UoMConversion,
    Warehouse,
)
from app.modules.ecommerce.products.models import (
    Product,
    ProductCondition,
    ProductType,
    ProductVariant,
    Status,
)
from app.modules.ecommerce.sellers.models import CommissionType, Seller, SellerStatus
from app.modules.hr_payroll.compensation.models import EmployeeSalary
from app.modules.hr_payroll.employees.models import (
    Employee,
    EmploymentTypeEnum,
    GenderEnum,
    MaritalStatusEnum,
    WorkArrangementEnum,
)
from app.modules.hr_payroll.leave.models import LeaveType
from app.modules.hr_payroll.organization.models import Department, JobTitle
from app.modules.hr_payroll.payroll.models import PayrollPeriod, PayrollSettings

SYSTEM_MODULES = {
    "general": {
        "title": "GENERAL PERMISSIONS",
        "icon": "fas font-cog",
        "features": [
            ("business_profile", "Business Profile"),
            ("users_permissions", "Users & Permissions"),
            ("ai_assistant", "AI Chat Assistant"),
            ("mcp_hub", "MCP Report Hub"),
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
            ("offer_letters", "Offer Letters"),
            ("appointment_letters", "Appointment Letters"),
            ("salary_certificates", "Salary Certificates"),
            ("experience_letters", "Experience Letters"),
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
    "finance": {
        "title": "FINANCE & ACCOUNTING",
        "icon": "fas fa-calculator",
        "features": [
            ("accounts", "Chart of Accounts"),
            ("vouchers", "Journal Vouchers"),
            ("invoices", "Sales Invoices"),
            ("mushak", "Mushak 6.3 Tax Invoice"),
            ("reports", "Financial Statements"),
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


def seed_system_admin_and_permissions_sync(db: Session) -> None:
    """
    Synchronous seed routine that creates default permissions, system admin,
    subscription plans, and the WBSOFT test environment.
    """
    # 1. Seed Permissions
    for perm_data in get_default_permissions_list():
        existing = db.query(Permission).filter(Permission.code == perm_data["code"]).first()
        if not existing:
            existing = Permission(**perm_data)
            db.add(existing)
    db.flush()

    db_all_perms = db.query(Permission).all()

    # 2. Seed Default System Roles
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

    hr_payroll_role = db.query(Role).filter(Role.name == "hr_payroll", Role.business_id.is_(None)).first()
    if not hr_payroll_role:
        hr_payroll_role = Role(
            name="hr_payroll",
            description="HR & Payroll Module Access with full CRUD",
            business_id=None,
        )
        db.add(hr_payroll_role)
        db.flush()
    hr_payroll_role.permissions = [p for p in db_all_perms if p.module == "hrm" or p.code in ("general:ai_assistant:view", "general:mcp_hub:view")]

    ecommerce_role = db.query(Role).filter(Role.name == "ecommerce", Role.business_id.is_(None)).first()
    if not ecommerce_role:
        ecommerce_role = Role(
            name="ecommerce",
            description="Ecommerce Module Access with full CRUD",
            business_id=None,
        )
        db.add(ecommerce_role)
        db.flush()
    ecommerce_role.permissions = [p for p in db_all_perms if p.module == "ecommerce"]

    # 3. Seed System Admin & Demo Users
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
            is_superuser=False,
            business_id=None,
        )
        if hr_payroll_role and hr_payroll_role not in demo_user.roles:
            demo_user.roles.append(hr_payroll_role)
        db.add(demo_user)
    else:
        demo_user.is_active = True
        demo_user.password_hash = hash_password("12345678")
        if not demo_user.roles and hr_payroll_role:
            demo_user.roles.append(hr_payroll_role)

    # 4. Seed Default Subscription Plans
    free_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == "Free").first()
    if not free_plan:
        free_plan = SubscriptionPlan(
            name="Free",
            description="Free tier with basic view permissions",
            is_active=True,
        )
        free_plan.permissions = [p for p in db_all_perms if p.action == "view"]
        db.add(free_plan)

    hr_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == "hr payroll module (free tier)").first()
    if not hr_plan:
        hr_plan = SubscriptionPlan(
            name="hr payroll module (free tier)",
            description="Free tier with all HR & Payroll permissions",
            is_active=True,
        )
        hr_plan.permissions = [p for p in db_all_perms if p.module == "hrm" or p.code in ("general:ai_assistant:view", "general:mcp_hub:view")]
        db.add(hr_plan)

    ecom_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == "ecommerce module (free tire)").first()
    if not ecom_plan:
        ecom_plan = SubscriptionPlan(
            name="ecommerce module (free tire)",
            description="Free tier with all Ecommerce permissions",
            is_active=True,
        )
        ecom_plan.permissions = [p for p in db_all_perms if p.module == "ecommerce"]
        db.add(ecom_plan)

    pro_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == "Pro").first()
    if not pro_plan:
        pro_plan = SubscriptionPlan(
            name="Pro",
            description="Professional plan with HRM and Ecommerce capabilities",
            is_active=True,
        )
        pro_plan.permissions = list(db_all_perms)
        db.add(pro_plan)
    else:
        pro_plan.permissions = list(db_all_perms)

    ent_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == "Enterprise").first()
    if not ent_plan:
        ent_plan = SubscriptionPlan(
            name="Enterprise",
            description="Unlimited access to all modules and feature sets",
            is_active=True,
        )
        ent_plan.permissions = list(db_all_perms)
        db.add(ent_plan)
    else:
        ent_plan.permissions = list(db_all_perms)

    db.flush()

    # 5. Seed Business WBSOFT
    from app.modules.finance.seed import seed_default_chart_of_accounts_sync
    wbsoft = db.query(BusinessProfile).filter(BusinessProfile.name_en == "WBSOFT").first()
    if not wbsoft:
        wbsoft = BusinessProfile(
            name_en="WBSOFT",
            short_name="WBSOFT",
            legal_name="WBSOFT Technologies Ltd.",
            company_tagline="Enterprise Software & Digital Solutions",
            description="WBSOFT provides end-to-end enterprise software solutions.",
            cr_number="CR-WBSOFT-001",
            vat_number="VAT-WBSOFT-001",
            tax_number="TAX-WBSOFT-001",
            license_number="LIC-WBSOFT-001",
            building_no="Level 8, Tower A",
            street="Gulshan Avenue",
            district="Gulshan",
            city="Dhaka",
            state="Dhaka Division",
            country="Bangladesh",
            zip_code="1212",
            phone="+8801700000000",
            mobile="+8801700000000",
            whatsapp="+8801700000000",
            email="info@wbsoft.com",
            support_email="support@wbsoft.com",
            sales_email="sales@wbsoft.com",
            invoice_email="billing@wbsoft.com",
            website="https://wbsoft.com",
            contact_person="Director of Operations",
            contact_designation="Managing Director",
            contact_mobile="+8801700000000",
            currency_code="BDT",
            currency_symbol="৳",
            subscription_plan_id=pro_plan.id if pro_plan else None,
            is_active=True,
            logo=None,  # explicitly no logo as requested
        )
        db.add(wbsoft)
        db.flush()
    else:
        wbsoft.short_name = "WBSOFT"
        wbsoft.legal_name = "WBSOFT Technologies Ltd."
        wbsoft.company_tagline = "Enterprise Software & Digital Solutions"
        wbsoft.description = "WBSOFT provides end-to-end enterprise software solutions."
        wbsoft.city = "Dhaka"
        wbsoft.country = "Bangladesh"
        wbsoft.currency_code = "BDT"
        wbsoft.currency_symbol = "৳"
        wbsoft.is_active = True
        wbsoft.logo = None
        if pro_plan:
            wbsoft.subscription_plan_id = pro_plan.id

    # Seed Finance Chart of Accounts & Sample Finance Data for WBSOFT
    from app.modules.finance.seed import seed_wbsoft_finance_data_sync
    seed_wbsoft_finance_data_sync(db, wbsoft.id)

    # 6. Seed User test@test.com
    test_user_email = "test@test.com"
    test_user = db.query(User).filter(
        (User.email == test_user_email) | (User.username == test_user_email)
    ).first()
    if not test_user:
        test_user = User(
            username=test_user_email,
            email=test_user_email,
            password_hash=hash_password("123456"),
            business_id=wbsoft.id,
            is_superuser=False,
            is_active=True,
            is_verified=True,
        )
        db.add(test_user)
        db.flush()
    else:
        test_user.username = test_user_email
        test_user.password_hash = hash_password("123456")
        test_user.business_id = wbsoft.id
        test_user.is_superuser = False
        test_user.is_active = True
        test_user.is_verified = True

    # Give test@test.com full access to all modules and features
    test_user.roles.clear()
    if hr_payroll_role and hr_payroll_role not in test_user.roles:
        test_user.roles.append(hr_payroll_role)
    if ecommerce_role and ecommerce_role not in test_user.roles:
        test_user.roles.append(ecommerce_role)

    # Assign all permissions as direct permissions to test@test.com
    test_user.direct_permissions = list(db_all_perms)
    db.flush()

    # 7. Seed Warehouses under WBSOFT
    wh_main = db.query(Warehouse).filter(
        Warehouse.code == "WH-MAIN", Warehouse.business_id == wbsoft.id
    ).first()
    if not wh_main:
        wh_main = Warehouse(
            business_id=wbsoft.id,
            name="Main Central Warehouse",
            code="WH-MAIN",
            address_line1="123 Innovation Avenue, Dhaka",
            city="Dhaka",
            country="BD",
            is_active=True,
            is_default=True,
        )
        db.add(wh_main)
        db.flush()

    wh_reg = db.query(Warehouse).filter(
        Warehouse.code == "WH-REGIONAL", Warehouse.business_id == wbsoft.id
    ).first()
    if not wh_reg:
        wh_reg = Warehouse(
            business_id=wbsoft.id,
            name="Regional Distribution Depot",
            code="WH-REGIONAL",
            address_line1="45 Logistics Park, Chittagong",
            city="Chittagong",
            country="BD",
            is_active=True,
            is_default=False,
        )
        db.add(wh_reg)
        db.flush()

    # 8. Seed Units of Measure & Conversions under WBSOFT
    uom_pcs = db.query(UnitOfMeasure).filter(
        UnitOfMeasure.code == "PCS", UnitOfMeasure.business_id == wbsoft.id
    ).first()
    if not uom_pcs:
        uom_pcs = UnitOfMeasure(
            business_id=wbsoft.id,
            code="PCS",
            name="Piece",
            precision=0,
        )
        db.add(uom_pcs)
        db.flush()

    uom_box = db.query(UnitOfMeasure).filter(
        UnitOfMeasure.code == "BOX", UnitOfMeasure.business_id == wbsoft.id
    ).first()
    if not uom_box:
        uom_box = UnitOfMeasure(
            business_id=wbsoft.id,
            code="BOX",
            name="Box",
            precision=0,
        )
        db.add(uom_box)
        db.flush()

    uom_conv = db.query(UoMConversion).filter(
        UoMConversion.business_id == wbsoft.id,
        UoMConversion.from_uom_id == uom_box.id,
        UoMConversion.to_uom_id == uom_pcs.id,
        UoMConversion.item_id.is_(None),
    ).first()
    if not uom_conv:
        uom_conv = UoMConversion(
            business_id=wbsoft.id,
            from_uom_id=uom_box.id,
            to_uom_id=uom_pcs.id,
            factor=Decimal("12.000000"),
            item_id=None,
        )
        db.add(uom_conv)

    # 9. Seed 5 Categories & 5 Subcategories
    categories_def = [
        ("Consumer Electronics", "consumer-electronics", "fa-tv", "Electronic devices and appliances"),
        ("Computer & IT Accessories", "computer-it-accessories", "fa-laptop", "Computers, laptops and accessories"),
        ("Office Equipment", "office-equipment", "fa-building", "Office supplies and machinery"),
        ("Smart Home & Networking", "smart-home-networking", "fa-wifi", "Networking gear and automation"),
        ("Industrial Components", "industrial-components", "fa-microchip", "Sensors, microcontrollers and hardware"),
    ]

    subcategories_def = [
        ("Smartphones & Mobile", "smartphones-mobile", "Consumer Electronics", "Mobile devices and accessories"),
        ("Laptops & Notebooks", "laptops-notebooks", "Computer & IT Accessories", "High performance notebooks"),
        ("Printers & Scanners", "printers-scanners", "Office Equipment", "Document printing and scanning"),
        ("Routers & Switches", "routers-switches", "Smart Home & Networking", "Enterprise network routers and switches"),
        ("Sensors & Microcontrollers", "sensors-microcontrollers", "Industrial Components", "IoT sensors and dev boards"),
    ]

    cat_map = {}
    for name, slug, icon, desc in categories_def:
        cat = db.query(Category).filter(
            Category.slug == slug
        ).first()
        if not cat:
            cat = Category(
                business_id=wbsoft.id,
                name=name,
                slug=slug,
                icon=icon,
                description=desc,
                parent_id=None,
                is_active=True,
            )
            db.add(cat)
            db.flush()
        cat_map[name] = cat

    subcat_map = {}
    for name, slug, parent_name, desc in subcategories_def:
        parent_cat = cat_map[parent_name]
        subcat = db.query(Category).filter(
            Category.slug == slug
        ).first()
        if not subcat:
            subcat = Category(
                business_id=wbsoft.id,
                name=name,
                slug=slug,
                description=desc,
                parent_id=parent_cat.id,
                is_active=True,
            )
            db.add(subcat)
            db.flush()
        subcat_map[name] = subcat

    # 10. Seed Brands & Models under WBSOFT
    brands_def = [
        ("TechGlobe", "techglobe", "TechGlobe flagship hardware"),
        ("ApexDigital", "opexdigital", "ApexDigital enterprise gear"),
        ("MicroCraft", "microcraft", "MicroCraft components and IoT"),
    ]

    brand_map = {}
    for bname, bslug, bdesc in brands_def:
        brand = db.query(Brand).filter(Brand.slug == bslug).first()
        if not brand:
            brand = Brand(
                business_id=wbsoft.id,
                name=bname,
                slug=bslug,
                description=bdesc,
                is_active=True,
            )
            db.add(brand)
            db.flush()
        brand_map[bname] = brand

    models_def = [
        ("TechGlobe", "TG-X1 Pro", "tg-x1-pro", "TechGlobe X1 Pro Series"),
        ("TechGlobe", "TG-Book 15", "tg-book-15", "TechGlobe Laptop 15 Series"),
        ("ApexDigital", "Apex PrintMax 500", "apex-printmax-500", "Apex Laser Printer Series"),
        ("ApexDigital", "Apex NetGear 8P", "apex-netgear-8p", "Apex 8-Port Switch Series"),
        ("MicroCraft", "MC-Sensor Hub v2", "mc-sensor-hub-v2", "MicroCraft Sensor Hub Series"),
    ]

    model_map = {}
    for bname, mname, mslug, mdesc in models_def:
        brand = brand_map[bname]
        model = db.query(ProductModel).filter(ProductModel.slug == mslug).first()
        if not model:
            model = ProductModel(
                brand_id=brand.id,
                name=mname,
                slug=mslug,
                description=mdesc,
                is_active=True,
            )
            db.add(model)
            db.flush()
        model_map[mname] = model

    # 11. Seed 10 Master Items, Products, ProductVariants, InventoryItems, CostLayers
    products_def = [
        {
            "sku": "SKU-ITEM-101",
            "title": "TechGlobe X1 Pro Smartphone",
            "slug": "techglobe-x1-pro-smartphone",
            "cat": "Smartphones & Mobile",
            "brand": "TechGlobe",
            "model": "TG-X1 Pro",
            "price": Decimal("699.00"),
            "cost": Decimal("450.00"),
            "tracking": TrackingType.LOT,
            "main_qty": 100,
            "reg_qty": 30,
        },
        {
            "sku": "SKU-ITEM-102",
            "title": "TechGlobe UltraBook 15 Laptop",
            "slug": "techglobe-ultrabook-15-laptop",
            "cat": "Laptops & Notebooks",
            "brand": "TechGlobe",
            "model": "TG-Book 15",
            "price": Decimal("1200.00"),
            "cost": Decimal("850.00"),
            "tracking": TrackingType.SERIAL,
            "main_qty": 50,
            "reg_qty": 15,
        },
        {
            "sku": "SKU-ITEM-103",
            "title": "Apex PrintMax Laser Printer",
            "slug": "apex-printmax-laser-printer",
            "cat": "Printers & Scanners",
            "brand": "ApexDigital",
            "model": "Apex PrintMax 500",
            "price": Decimal("350.00"),
            "cost": Decimal("220.00"),
            "tracking": TrackingType.NONE,
            "main_qty": 40,
            "reg_qty": 10,
        },
        {
            "sku": "SKU-ITEM-104",
            "title": "Apex Gigabit Router 8-Port",
            "slug": "apex-gigabit-router-8-port",
            "cat": "Routers & Switches",
            "brand": "ApexDigital",
            "model": "Apex NetGear 8P",
            "price": Decimal("150.00"),
            "cost": Decimal("90.00"),
            "tracking": TrackingType.NONE,
            "main_qty": 80,
            "reg_qty": 20,
        },
        {
            "sku": "SKU-ITEM-105",
            "title": "MicroCraft IoT Sensor Kit",
            "slug": "microcraft-iot-sensor-kit",
            "cat": "Sensors & Microcontrollers",
            "brand": "MicroCraft",
            "model": "MC-Sensor Hub v2",
            "price": Decimal("85.00"),
            "cost": Decimal("45.00"),
            "tracking": TrackingType.NONE,
            "main_qty": 120,
            "reg_qty": 40,
        },
        {
            "sku": "SKU-ITEM-106",
            "title": "TechGlobe Wireless Earbuds",
            "slug": "techglobe-wireless-earbuds",
            "cat": "Consumer Electronics",
            "brand": "TechGlobe",
            "model": None,
            "price": Decimal("99.00"),
            "cost": Decimal("55.00"),
            "tracking": TrackingType.NONE,
            "main_qty": 150,
            "reg_qty": 50,
        },
        {
            "sku": "SKU-ITEM-107",
            "title": "TechGlobe Mechanical Keyboard",
            "slug": "techglobe-mechanical-keyboard",
            "cat": "Computer & IT Accessories",
            "brand": "TechGlobe",
            "model": None,
            "price": Decimal("110.00"),
            "cost": Decimal("65.00"),
            "tracking": TrackingType.NONE,
            "main_qty": 90,
            "reg_qty": 25,
        },
        {
            "sku": "SKU-ITEM-108",
            "title": "Apex Ergonomic Desk Chair",
            "slug": "apex-ergonomic-desk-chair",
            "cat": "Office Equipment",
            "brand": "ApexDigital",
            "model": None,
            "price": Decimal("280.00"),
            "cost": Decimal("170.00"),
            "tracking": TrackingType.NONE,
            "main_qty": 35,
            "reg_qty": 10,
        },
        {
            "sku": "SKU-ITEM-109",
            "title": "Apex Smart Security Camera",
            "slug": "apex-smart-security-camera",
            "cat": "Smart Home & Networking",
            "brand": "ApexDigital",
            "model": None,
            "price": Decimal("130.00"),
            "cost": Decimal("75.00"),
            "tracking": TrackingType.NONE,
            "main_qty": 65,
            "reg_qty": 20,
        },
        {
            "sku": "SKU-ITEM-110",
            "title": "MicroCraft Microcontroller Dev Board",
            "slug": "microcraft-microcontroller-dev-board",
            "cat": "Industrial Components",
            "brand": "MicroCraft",
            "model": None,
            "price": Decimal("45.00"),
            "cost": Decimal("22.00"),
            "tracking": TrackingType.NONE,
            "main_qty": 200,
            "reg_qty": 60,
        },
    ]

    items_seeded = []
    for pinfo in products_def:
        # Master Item
        item = db.query(Item).filter(
            Item.sku == pinfo["sku"], Item.business_id == wbsoft.id
        ).first()
        if not item:
            category_obj = subcat_map.get(pinfo["cat"]) or cat_map.get(pinfo["cat"])
            item = Item(
                business_id=wbsoft.id,
                sku=pinfo["sku"],
                name=pinfo["title"],
                item_type=ItemType.STOCK,
                tracking_type=pinfo["tracking"],
                base_uom_id=uom_pcs.id,
                category_id=category_obj.id if category_obj else None,
                default_cost=pinfo["cost"],
                is_active=True,
            )
            db.add(item)
            db.flush()

        items_seeded.append(item)

        # Product
        product = db.query(Product).filter(
            Product.slug == pinfo["slug"]
        ).first()
        brand_obj = brand_map.get(pinfo["brand"])
        model_obj = model_map.get(pinfo["model"]) if pinfo["model"] else None
        category_obj = subcat_map.get(pinfo["cat"]) or cat_map.get(pinfo["cat"])

        if not product:
            product = Product(
                business_id=wbsoft.id,
                category_id=category_obj.id if category_obj else None,
                brand_id=brand_obj.id if brand_obj else None,
                model_id=model_obj.id if model_obj else None,
                title=pinfo["title"],
                slug=pinfo["slug"],
                description=f"High quality {pinfo['title']} for professional use.",
                brand=brand_obj.name if brand_obj else None,
                status=Status.ACTIVE,
                condition=ProductCondition.NEW,
                product_type=ProductType.PHYSICAL,
                requires_shipping=True,
                published_at=datetime.utcnow(),
            )
            db.add(product)
            db.flush()

        # Variant
        variant = db.query(ProductVariant).filter(
            ProductVariant.sku == pinfo["sku"]
        ).first()
        if not variant:
            variant = ProductVariant(
                product_id=product.id,
                item_id=item.id,
                sku=pinfo["sku"],
                price=pinfo["price"],
                cost_price=pinfo["cost"],
                currency="BDT",
                stock_qty=pinfo["main_qty"] + pinfo["reg_qty"],
                low_stock_threshold=15,
                is_default=True,
            )
            db.add(variant)
            db.flush()

        # Inventory Item - WH MAIN
        inv_main = db.query(InventoryItem).filter(
            InventoryItem.item_id == item.id,
            InventoryItem.warehouse_id == wh_main.id,
        ).first()
        if not inv_main:
            inv_main = InventoryItem(
                item_id=item.id,
                variant_id=variant.id,
                warehouse_id=wh_main.id,
                quantity_on_hand=pinfo["main_qty"],
                quantity_reserved=0,
                reorder_point=15,
                reorder_quantity=50,
            )
            db.add(inv_main)
            db.flush()

            # Stock Movement & Cost Layer for WH MAIN
            sm_main = StockMovement(
                inventory_item_id=inv_main.id,
                delta=pinfo["main_qty"],
                uom_id=uom_pcs.id,
                reason=StockMovementReason.OPENING_BALANCE,
                reference_id="SEED-INIT-MAIN",
                source_type="seed",
                source_id="seed_initial",
                unit_cost=pinfo["cost"],
                notes="Initial opening balance",
            )
            db.add(sm_main)

            cl_main = CostLayer(
                business_id=wbsoft.id,
                item_id=item.id,
                warehouse_id=wh_main.id,
                received_at=datetime.utcnow(),
                quantity_remaining=pinfo["main_qty"],
                unit_cost=pinfo["cost"],
                source_type="seed",
                source_id="seed_initial",
            )
            db.add(cl_main)

        # Inventory Item - WH REGIONAL
        inv_reg = db.query(InventoryItem).filter(
            InventoryItem.item_id == item.id,
            InventoryItem.warehouse_id == wh_reg.id,
        ).first()
        if not inv_reg:
            inv_reg = InventoryItem(
                item_id=item.id,
                variant_id=variant.id,
                warehouse_id=wh_reg.id,
                quantity_on_hand=pinfo["reg_qty"],
                quantity_reserved=0,
                reorder_point=10,
                reorder_quantity=30,
            )
            db.add(inv_reg)
            db.flush()

            # Stock Movement & Cost Layer for WH REGIONAL
            sm_reg = StockMovement(
                inventory_item_id=inv_reg.id,
                delta=pinfo["reg_qty"],
                uom_id=uom_pcs.id,
                reason=StockMovementReason.OPENING_BALANCE,
                reference_id="SEED-INIT-REGIONAL",
                source_type="seed",
                source_id="seed_initial",
                unit_cost=pinfo["cost"],
                notes="Initial opening balance",
            )
            db.add(sm_reg)

            cl_reg = CostLayer(
                business_id=wbsoft.id,
                item_id=item.id,
                warehouse_id=wh_reg.id,
                received_at=datetime.utcnow(),
                quantity_remaining=pinfo["reg_qty"],
                unit_cost=pinfo["cost"],
                source_type="seed",
                source_id="seed_initial",
            )
            db.add(cl_reg)

    # 11b. Seed Marketplace Sellers under WBSOFT
    sellers_def = [
        {
            "store_name": "TechGlobe Direct",
            "slug": "techglobe-direct",
            "company_name": "TechGlobe Corporation",
            "contact_email": "vendor@techglobe.com",
            "contact_phone": "+8801700111222",
            "status": SellerStatus.ACTIVE,
            "is_verified": True,
            "commission_type": CommissionType.PERCENTAGE,
            "commission_rate": Decimal("10.00"),
            "flat_fee": Decimal("0.00"),
            "tax_id": "TIN-TG-9900",
            "payout_account": "TechGlobe Bank AC 1001-2200",
        },
        {
            "store_name": "Apex Digital Outlet",
            "slug": "apex-digital-outlet",
            "company_name": "Apex Digital Ltd.",
            "contact_email": "partner@apexdigital.com",
            "contact_phone": "+8801700333444",
            "status": SellerStatus.ACTIVE,
            "is_verified": True,
            "commission_type": CommissionType.PERCENTAGE,
            "commission_rate": Decimal("12.50"),
            "flat_fee": Decimal("0.00"),
            "tax_id": "TIN-AD-4455",
            "payout_account": "Apex Digital Bank AC 3003-4400",
        },
        {
            "store_name": "MicroCraft Hardware",
            "slug": "microcraft-hardware",
            "company_name": "MicroCraft Innovations",
            "contact_email": "seller@microcraft.io",
            "contact_phone": "+8801700555666",
            "status": SellerStatus.PENDING,
            "is_verified": False,
            "commission_type": CommissionType.FLAT,
            "commission_rate": Decimal("0.00"),
            "flat_fee": Decimal("5.00"),
            "tax_id": "TIN-MC-7788",
            "payout_account": "MicroCraft Bank AC 5005-6600",
        },
    ]

    seller_objs = {}
    for sdef in sellers_def:
        s_obj = db.query(Seller).filter(Seller.slug == sdef["slug"]).first()
        if not s_obj:
            s_obj = Seller(
                business_id=wbsoft.id,
                store_name=sdef["store_name"],
                slug=sdef["slug"],
                company_name=sdef["company_name"],
                contact_email=sdef["contact_email"],
                contact_phone=sdef["contact_phone"],
                status=sdef["status"],
                is_verified=sdef["is_verified"],
                commission_type=sdef["commission_type"],
                commission_rate=sdef["commission_rate"],
                flat_fee=sdef["flat_fee"],
                tax_id=sdef["tax_id"],
                payout_account=sdef["payout_account"],
            )
            db.add(s_obj)
            db.flush()
        seller_objs[sdef["slug"]] = s_obj

    # Associate products with seeded sellers
    p_tg1 = db.query(Product).filter(Product.slug == "techglobe-x1-pro-smartphone").first()
    if p_tg1 and not p_tg1.seller_id:
        p_tg1.seller_id = seller_objs["techglobe-direct"].id

    p_tg2 = db.query(Product).filter(Product.slug == "techglobe-ultrabook-15-laptop").first()
    if p_tg2 and not p_tg2.seller_id:
        p_tg2.seller_id = seller_objs["techglobe-direct"].id

    p_apex1 = db.query(Product).filter(Product.slug == "apex-printmax-laser-printer").first()
    if p_apex1 and not p_apex1.seller_id:
        p_apex1.seller_id = seller_objs["apex-digital-outlet"].id

    p_apex2 = db.query(Product).filter(Product.slug == "apex-gigabit-router-8-port").first()
    if p_apex2 and not p_apex2.seller_id:
        p_apex2.seller_id = seller_objs["apex-digital-outlet"].id

    db.flush()

    # 12. Seed Sample Stock Transfer for frontend testing
    transfer_no = "TR-2026-001"
    stock_transfer = db.query(StockTransfer).filter(
        StockTransfer.business_id == wbsoft.id,
        StockTransfer.transfer_number == transfer_no,
    ).first()

    if not stock_transfer:
        stock_transfer = StockTransfer(
            business_id=wbsoft.id,
            transfer_number=transfer_no,
            source_warehouse_id=wh_main.id,
            destination_warehouse_id=wh_reg.id,
            status=TransferStatus.IN_TRANSIT,
            shipped_at=datetime.utcnow(),
            notes="Inter-warehouse replenishment transfer for high-demand items",
        )
        db.add(stock_transfer)
        db.flush()

        line1 = StockTransferLine(
            transfer_id=stock_transfer.id,
            item_id=items_seeded[0].id,
            quantity=5,
            received_quantity=0,
            uom_id=uom_pcs.id,
        )
        line2 = StockTransferLine(
            transfer_id=stock_transfer.id,
            item_id=items_seeded[3].id,
            quantity=10,
            received_quantity=0,
            uom_id=uom_pcs.id,
        )
        db.add_all([line1, line2])

    db.flush()

    # 13. Seed HR & Payroll: 5 Departments
    departments_def = [
        ("Software Engineering", "software-engineering", "Core product engineering and development"),
        ("Human Resources", "human-resources", "People management, payroll and culture"),
        ("Finance & Accounting", "finance-accounting", "Financial operations and tax management"),
        ("Sales & Marketing", "sales-marketing", "Customer acquisition and marketing campaigns"),
        ("Customer Support", "customer-support", "Technical support and client services"),
    ]

    dept_map = {}
    for dname, dslug, ddesc in departments_def:
        dept = db.query(Department).filter(
            Department.business_id == wbsoft.id,
            Department.slug == dslug,
        ).first()
        if not dept:
            dept = Department(
                business_id=wbsoft.id,
                name=dname,
                slug=dslug,
                description=ddesc,
                is_active=True,
            )
            db.add(dept)
            db.flush()
        dept_map[dname] = dept

    # 14. Seed HR & Payroll: 8 Job Titles
    job_titles_def = [
        ("Lead Software Engineer", "Software Engineering", "Lead engineer driving technical architecture"),
        ("Senior Frontend Developer", "Software Engineering", "Senior UI/UX frontend developer"),
        ("DevOps Engineer", "Software Engineering", "Infrastructure and CI/CD specialist"),
        ("HR Manager", "Human Resources", "Head of HR operations and recruitment"),
        ("Talent Acquisition Specialist", "Human Resources", "Recruitment and candidate sourcing"),
        ("Chief Financial Officer", "Finance & Accounting", "Head of financial planning and strategy"),
        ("Senior Sales Executive", "Sales & Marketing", "Enterprise sales and partnership lead"),
        ("Support Lead", "Customer Support", "Head of client technical support team"),
    ]

    job_title_map = {}
    for jname, dname, jdesc in job_titles_def:
        dept = dept_map[dname]
        job = db.query(JobTitle).filter(
            JobTitle.business_id == wbsoft.id,
            JobTitle.department_id == dept.id,
            JobTitle.name == jname,
        ).first()
        if not job:
            job = JobTitle(
                business_id=wbsoft.id,
                department_id=dept.id,
                name=jname,
                description=jdesc,
                is_active=True,
            )
            db.add(job)
            db.flush()
        job_title_map[jname] = job

    # 15. Seed HR & Payroll: 10 Employees
    employees_def = [
        {
            "emp_id": "EMP001",
            "first": "John",
            "last": "Doe",
            "email": "john.doe@wbsoft.com",
            "phone": "+8801711000001",
            "job": "Lead Software Engineer",
            "dept": "Software Engineering",
            "manager": None,
            "is_head": True,
        },
        {
            "emp_id": "EMP002",
            "first": "Jane",
            "last": "Smith",
            "email": "jane.smith@wbsoft.com",
            "phone": "+8801711000002",
            "job": "Senior Frontend Developer",
            "dept": "Software Engineering",
            "manager": "EMP001",
            "is_head": False,
        },
        {
            "emp_id": "EMP003",
            "first": "Alex",
            "last": "Johnson",
            "email": "alex.johnson@wbsoft.com",
            "phone": "+8801711000003",
            "job": "DevOps Engineer",
            "dept": "Software Engineering",
            "manager": "EMP001",
            "is_head": False,
        },
        {
            "emp_id": "EMP004",
            "first": "Sarah",
            "last": "Williams",
            "email": "sarah.williams@wbsoft.com",
            "phone": "+8801711000004",
            "job": "HR Manager",
            "dept": "Human Resources",
            "manager": None,
            "is_head": True,
        },
        {
            "emp_id": "EMP005",
            "first": "Michael",
            "last": "Brown",
            "email": "michael.brown@wbsoft.com",
            "phone": "+8801711000005",
            "job": "Talent Acquisition Specialist",
            "dept": "Human Resources",
            "manager": "EMP004",
            "is_head": False,
        },
        {
            "emp_id": "EMP006",
            "first": "Emily",
            "last": "Davis",
            "email": "emily.davis@wbsoft.com",
            "phone": "+8801711000006",
            "job": "Chief Financial Officer",
            "dept": "Finance & Accounting",
            "manager": None,
            "is_head": True,
        },
        {
            "emp_id": "EMP007",
            "first": "David",
            "last": "Miller",
            "email": "david.miller@wbsoft.com",
            "phone": "+8801711000007",
            "job": "Senior Sales Executive",
            "dept": "Sales & Marketing",
            "manager": None,
            "is_head": True,
        },
        {
            "emp_id": "EMP008",
            "first": "Jessica",
            "last": "Wilson",
            "email": "jessica.wilson@wbsoft.com",
            "phone": "+8801711000008",
            "job": "Support Lead",
            "dept": "Customer Support",
            "manager": None,
            "is_head": True,
        },
        {
            "emp_id": "EMP009",
            "first": "Daniel",
            "last": "Taylor",
            "email": "daniel.taylor@wbsoft.com",
            "phone": "+8801711000009",
            "job": "Senior Frontend Developer",
            "dept": "Software Engineering",
            "manager": "EMP001",
            "is_head": False,
        },
        {
            "emp_id": "EMP010",
            "first": "Sophia",
            "last": "Anderson",
            "email": "sophia.anderson@wbsoft.com",
            "phone": "+8801711000010",
            "job": "Talent Acquisition Specialist",
            "dept": "Human Resources",
            "manager": "EMP004",
            "is_head": False,
        },
    ]

    emp_db_map = {}
    # First pass: create employees
    for einfo in employees_def:
        dept = dept_map[einfo["dept"]]
        job = job_title_map[einfo["job"]]

        emp = db.query(Employee).filter(
            Employee.business_id == wbsoft.id,
            Employee.employee_id == einfo["emp_id"],
        ).first()

        if not emp:
            emp = Employee(
                business_id=wbsoft.id,
                employee_id=einfo["emp_id"],
                first_name=einfo["first"],
                last_name=einfo["last"],
                work_email=einfo["email"],
                phone=einfo["phone"],
                date_of_birth=date(1990, 1, 15),
                gender=GenderEnum.MALE if einfo["first"] in ("John", "Alex", "Michael", "David", "Daniel") else GenderEnum.FEMALE,
                marital_status=MaritalStatusEnum.MARRIED if einfo["emp_id"] in ("EMP001", "EMP004", "EMP006") else MaritalStatusEnum.SINGLE,
                nationality="Bangladeshi",
                tin="123456789012",
                department_id=dept.id,
                job_title_id=job.id,
                employment_type=EmploymentTypeEnum.FULL_TIME,
                work_arrangement=WorkArrangementEnum.HYBRID if einfo["emp_id"] in ("EMP002", "EMP003") else WorkArrangementEnum.ONSITE,
                start_date=date(2023, 1, 1),
                is_department_head=einfo["is_head"],
                is_active=True,
            )
            db.add(emp)
            db.flush()

        emp_db_map[einfo["emp_id"]] = emp

    # Second pass: link direct managers
    for einfo in employees_def:
        if einfo["manager"]:
            emp = emp_db_map[einfo["emp_id"]]
            mgr = emp_db_map[einfo["manager"]]
            emp.direct_manager_id = mgr.id

    db.flush()

    # 16. Seed Employee Salaries (Compensation)
    salary_structures = {
        "EMP001": {"basic": 100000, "house": 50000, "med": 10000, "trans": 5000, "tax": 15000, "pf": 10000},
        "EMP002": {"basic": 80000, "house": 40000, "med": 8000, "trans": 5000, "tax": 10000, "pf": 8000},
        "EMP003": {"basic": 85000, "house": 42500, "med": 8500, "trans": 5000, "tax": 11000, "pf": 8500},
        "EMP004": {"basic": 90000, "house": 45000, "med": 9000, "trans": 5000, "tax": 12000, "pf": 9000},
        "EMP005": {"basic": 60000, "house": 30000, "med": 6000, "trans": 4000, "tax": 6000, "pf": 6000},
        "EMP006": {"basic": 120000, "house": 60000, "med": 12000, "trans": 6000, "tax": 20000, "pf": 12000},
        "EMP007": {"basic": 75000, "house": 37500, "med": 7500, "trans": 5000, "tax": 8000, "pf": 7500},
        "EMP008": {"basic": 70000, "house": 35000, "med": 7000, "trans": 5000, "tax": 7000, "pf": 7000},
        "EMP009": {"basic": 78000, "house": 39000, "med": 7800, "trans": 5000, "tax": 9000, "pf": 7800},
        "EMP010": {"basic": 55000, "house": 27500, "med": 5500, "trans": 4000, "tax": 5000, "pf": 5500},
    }

    for emp_code, emp in emp_db_map.items():
        sal_def = salary_structures[emp_code]
        gross = sal_def["basic"] + sal_def["house"] + sal_def["med"] + sal_def["trans"]
        net = gross - sal_def["tax"] - sal_def["pf"]

        sal = db.query(EmployeeSalary).filter(
            EmployeeSalary.employee_id == emp.id
        ).first()

        if not sal:
            sal = EmployeeSalary(
                business_id=wbsoft.id,
                employee_id=emp.id,
                basic_salary=sal_def["basic"],
                house_rent=sal_def["house"],
                medical_allowance=sal_def["med"],
                transport_allowance=sal_def["trans"],
                food_allowance=0,
                other_allowance=0,
                tax=sal_def["tax"],
                provident_fund=sal_def["pf"],
                other_deduction=0,
                gross_salary=gross,
                net_salary=net,
                effective_from=date(2023, 1, 1),
            )
            db.add(sal)

    # 17. Seed Payroll Settings, Payroll Period, and Leave Types under WBSOFT
    pset = db.query(PayrollSettings).filter(
        PayrollSettings.business_id == wbsoft.id
    ).first()
    if not pset:
        pset = PayrollSettings(
            business_id=wbsoft.id,
            include_attendance=True,
            include_leave=True,
            include_holidays=True,
            include_overtime=True,
            deduct_absent_days=True,
            standard_hours_per_day=8.0,
        )
        db.add(pset)

    pperiod = db.query(PayrollPeriod).filter(
        PayrollPeriod.business_id == wbsoft.id,
        PayrollPeriod.name == "March 2026",
    ).first()
    if not pperiod:
        from app.modules.hr_payroll.payroll.models import PayrollPeriodStatusEnum
        pperiod = PayrollPeriod(
            business_id=wbsoft.id,
            name="March 2026",
            start_date=date(2026, 3, 1),
            end_date=date(2026, 3, 31),
            status=PayrollPeriodStatusEnum.DRAFT,
            notes="March 2026 payroll cycle",
        )
        db.add(pperiod)

    leave_types_def = [
        ("Annual Leave", "AL", 20, "Paid annual leave allowance"),
        ("Sick Leave", "SL", 10, "Paid sick leave for medical needs"),
        ("Casual Leave", "CL", 10, "Paid casual emergency leave"),
    ]

    for lt_name, lt_code, lt_days, lt_desc in leave_types_def:
        lt = db.query(LeaveType).filter(
            LeaveType.business_id == wbsoft.id,
            LeaveType.code == lt_code,
        ).first()
        if not lt:
            lt = LeaveType(
                business_id=wbsoft.id,
                name=lt_name,
                code=lt_code,
                max_days_per_year=lt_days,
                description=lt_desc,
                is_active=True,
            )
            db.add(lt)

    db.commit()


async def seed_system_admin_and_permissions(db: AsyncSession) -> None:
    """
    Async seed routine that runs the sync seed routine inside run_sync.
    """
    await db.run_sync(seed_system_admin_and_permissions_sync)


if __name__ == "__main__":
    from app import models_registry  # noqa: F401
    from app.database import Base, SessionLocal, engine

    print("Ensuring database tables are created...")
    Base.metadata.create_all(bind=engine)

    print("Running standalone seed.py...")
    db = SessionLocal()
    try:
        seed_system_admin_and_permissions_sync(db)
        print("Seeding completed successfully!")
    except Exception as e:
        print(f"Seeding failed: {e}")
        raise
    finally:
        db.close()
