"""
Centralized Plan and Feature Mapping Configuration for UI Navigation and Gating.
Defines module navigation structure, required plan tiers, permission codes,
and benefit-focused marketing descriptions for locked upsell state.
"""

from typing import Any, Dict, List, Optional


# Plan tier levels hierarchy for comparison and display
PLAN_TIERS = ["Free", "Basic", "Pro", "Enterprise"]

# Module feature configuration mapping
FEATURE_CONFIG: List[Dict[str, Any]] = [
    # --- HR & PAYROLL MODULES ---
    {
        "category": "Workforce",
        "module_group": "hr_payroll",
        "items": [
            {
                "key": "departments",
                "title": "Department",
                "icon": "fas fa-sitemap",
                "url": "/departments/manage",
                "permission_code": "hrm:departments:view",
                "plans": ["Free", "Basic", "Pro", "Enterprise", "hr payroll module (free tier)"],
                "description": "Organize workforce hierarchy and department structures effortlessly.",
                "active_page": "departments",
            },
            {
                "key": "job_titles",
                "title": "Job Title",
                "icon": "fas fa-user-tie",
                "url": "/job-titles/manage",
                "permission_code": "hrm:job_titles:view",
                "plans": ["Free", "Basic", "Pro", "Enterprise", "hr payroll module (free tier)"],
                "description": "Define career paths and standardize job titles across teams.",
                "active_page": "job_titles",
            },
            {
                "key": "employees",
                "title": "Employees",
                "icon": "fas fa-id-badge",
                "url": "/employees/manage",
                "permission_code": "hrm:employees:view",
                "plans": ["Free", "Basic", "Pro", "Enterprise", "hr payroll module (free tier)"],
                "description": "Manage comprehensive employee records and directory.",
                "active_page": "employees",
            },
        ],
    },
    {
        "category": "Attendance & Leave",
        "module_group": "hr_payroll",
        "items": [
            {
                "key": "attendance",
                "title": "Attendance",
                "icon": "fas fa-clock",
                "url": "/attendance/manage",
                "permission_code": "hrm:attendance:view",
                "plans": ["Basic", "Pro", "Enterprise", "hr payroll module (free tier)"],
                "description": "Track real-time employee attendance and work hours.",
                "active_page": "attendance",
            },
            {
                "key": "leave_types",
                "title": "Leave Types",
                "icon": "fas fa-umbrella-beach",
                "url": "/leave/types/manage",
                "permission_code": "hrm:leave_types:view",
                "plans": ["Basic", "Pro", "Enterprise", "hr payroll module (free tier)"],
                "description": "Customize paid and unpaid leave policies.",
                "active_page": "leave_types",
            },
            {
                "key": "leave_allocations",
                "title": "Leave Allocations",
                "icon": "fas fa-layer-group",
                "url": "/leave/allocations/manage",
                "permission_code": "hrm:leave_allocations:view",
                "plans": ["Basic", "Pro", "Enterprise", "hr payroll module (free tier)"],
                "description": "Automate annual leave balance distribution.",
                "active_page": "leave_allocations",
            },
            {
                "key": "leave_applications",
                "title": "Leave Requests",
                "icon": "fas fa-calendar-check",
                "url": "/leave/applications/manage",
                "permission_code": "hrm:leave_applications:view",
                "plans": ["Basic", "Pro", "Enterprise", "hr payroll module (free tier)"],
                "description": "Streamline leave application and approval workflows.",
                "active_page": "leave_applications",
            },
            {
                "key": "holidays",
                "title": "Holidays",
                "icon": "fas fa-calendar-alt",
                "url": "/holidays/manage",
                "permission_code": "hrm:holidays:view",
                "plans": ["Basic", "Pro", "Enterprise", "hr payroll module (free tier)"],
                "description": "Manage company holiday calendars and official off days.",
                "active_page": "holidays",
            },
        ],
    },
    {
        "category": "Payroll",
        "module_group": "hr_payroll",
        "items": [
            {
                "key": "compensation",
                "title": "Compensation",
                "icon": "fas fa-money-bill-wave",
                "url": "/compensation/manage",
                "permission_code": "hrm:compensation:view",
                "plans": ["Pro", "Enterprise"],
                "description": "Structure pay grades, bonuses, and compensation packages.",
                "active_page": "compensation",
            },
            {
                "key": "payroll_setup",
                "title": "Payroll Setup",
                "icon": "fas fa-sliders-h",
                "url": "/payroll-settings/manage",
                "permission_code": "hrm:payroll_settings:view",
                "plans": ["Pro", "Enterprise"],
                "description": "Configure advanced salary components, tax rules, and deductions.",
                "active_page": "payroll_settings",
            },
            {
                "key": "payroll_periods",
                "title": "Payroll Periods",
                "icon": "fas fa-clock",
                "url": "/payroll-periods/manage",
                "permission_code": "hrm:payroll_periods:view",
                "plans": ["Basic", "Pro", "Enterprise", "hr payroll module (free tier)"],
                "description": "Schedule and run recurring pay periods seamlessly.",
                "active_page": "payroll_periods",
            },
            {
                "key": "payroll_process",
                "title": "Payroll Process",
                "icon": "fas fa-cogs",
                "url": "/payroll-periods/manage",
                "permission_code": "hrm:payroll_periods:view",
                "plans": ["Basic", "Pro", "Enterprise", "hr payroll module (free tier)"],
                "description": "Automate and execute bulk monthly salary runs.",
                "active_page": "payroll_periods",
            },
        ],
    },
    {
        "category": "Recruitment",
        "module_group": "hr_payroll",
        "items": [
            {
                "key": "recruitment_candidates",
                "title": "Candidates",
                "icon": "fas fa-user-tie",
                "url": "/recruitment/candidates/manage",
                "permission_code": "hrm:recruitment:view",
                "plans": ["Pro", "Enterprise"],
                "description": "Source, track, and hire top talent with an integrated applicant tracking system.",
                "active_page": "recruitment_candidates",
            },
            {
                "key": "recruitment_interviews",
                "title": "Interviews",
                "icon": "fas fa-calendar-alt",
                "url": "/recruitment/interviews/manage",
                "permission_code": "hrm:recruitment:view",
                "plans": ["Pro", "Enterprise"],
                "description": "Schedule candidate interviews and gather structured interviewer feedback.",
                "active_page": "recruitment_interviews",
            },
        ],
    },
    {
        "category": "Documents",
        "module_group": "hr_payroll",
        "items": [
            {
                "key": "offer_letters",
                "title": "Offer Letters",
                "icon": "fas fa-file-signature",
                "url": "/offer-letters/manage",
                "permission_code": "hrm:offer_letters:view",
                "plans": ["Basic", "Pro", "Enterprise", "hr payroll module (free tier)"],
                "description": "Send customizable job offer letters to new hires.",
                "active_page": "offer_letters",
            },
            {
                "key": "appointment_letters",
                "title": "Appointment Letters",
                "icon": "fas fa-envelope-open-text",
                "url": "/appointment-letters/manage",
                "permission_code": "hrm:appointment_letters:view",
                "plans": ["Basic", "Pro", "Enterprise", "hr payroll module (free tier)"],
                "description": "Generate official employee appointment letters instantly.",
                "active_page": "appointment_letters",
            },
            {
                "key": "payroll_records",
                "title": "Payslips",
                "icon": "fas fa-file-invoice-dollar",
                "url": "/payroll-records/manage",
                "permission_code": "hrm:payroll_records:view",
                "plans": ["Basic", "Pro", "Enterprise", "hr payroll module (free tier)"],
                "description": "Automate salary runs and view or print employee payslips.",
                "active_page": "payroll_records",
            },
            {
                "key": "salary_certificates",
                "title": "Salary Certificates",
                "icon": "fas fa-file-invoice",
                "url": "/salary-certificates/manage",
                "permission_code": "hrm:salary_certificates:view",
                "plans": ["Basic", "Pro", "Enterprise", "hr payroll module (free tier)"],
                "description": "Issue verified salary certificates for bank and official purposes.",
                "active_page": "salary_certificates",
            },
            {
                "key": "experience_letters",
                "title": "Experience Letters",
                "icon": "fas fa-award",
                "url": "/experience-letters/manage",
                "permission_code": "hrm:experience_letters:view",
                "plans": ["Basic", "Pro", "Enterprise", "hr payroll module (free tier)"],
                "description": "Generate work experience letters for departing team members.",
                "active_page": "experience_letters",
            },
        ],
    },
    {
        "category": "Announcements",
        "module_group": "hr_payroll",
        "items": [
            {
                "key": "notice_board",
                "title": "Notice Board",
                "icon": "fas fa-bullhorn",
                "url": "/notices/manage",
                "permission_code": "hrm:notice_board:view",
                "plans": ["Basic", "Pro", "Enterprise", "hr payroll module (free tier)"],
                "description": "Broadcast company-wide announcements and policy updates.",
                "active_page": "notice_board",
            },
        ],
    },
    # --- ECOMMERCE MODULES ---
    {
        "category": "Store Operations",
        "module_group": "ecommerce",
        "items": [
            {
                "key": "categories",
                "title": "Category",
                "icon": "fas fa-tags",
                "url": "/categories/manage",
                "permission_code": "ecommerce:categories:view",
                "plans": ["Basic", "Pro", "Enterprise", "ecommerce module (free tire)"],
                "description": "Organize product catalogs with dynamic category hierarchies.",
                "active_page": "categories",
            },
            {
                "key": "customers",
                "title": "Customers",
                "icon": "fas fa-users",
                "url": "/customers/manage",
                "permission_code": "ecommerce:customers:view",
                "plans": ["Basic", "Pro", "Enterprise", "ecommerce module (free tire)"],
                "description": "Track customer profiles, purchase histories, and insights.",
                "active_page": "customers",
            },
            {
                "key": "brands",
                "title": "Brand",
                "icon": "fas fa-copyright",
                "url": "/brands",
                "permission_code": "ecommerce:brands:view",
                "plans": ["Basic", "Pro", "Enterprise", "ecommerce module (free tire)"],
                "description": "Manage product brands and manufacturer relationships.",
                "active_page": "brands",
            },
            {
                "key": "models",
                "title": "Model",
                "icon": "fas fa-cubes",
                "url": "/brands/models",
                "permission_code": "ecommerce:models:view",
                "plans": ["Basic", "Pro", "Enterprise", "ecommerce module (free tire)"],
                "description": "Categorize product models and technical specifications.",
                "active_page": "models",
            },
            {
                "key": "products",
                "title": "Product",
                "icon": "fas fa-box",
                "url": "/products",
                "permission_code": "ecommerce:products:view",
                "plans": ["Basic", "Pro", "Enterprise", "ecommerce module (free tire)"],
                "description": "Publish products, SKUs, and pricing matrices.",
                "active_page": "products",
            },
            {
                "key": "pricing",
                "title": "Pricing & Tax Rules",
                "icon": "fas fa-tags",
                "url": "/pricing/manage",
                "permission_code": "ecommerce:products:view",
                "plans": ["Basic", "Pro", "Enterprise", "ecommerce module (free tire)"],
                "description": "Configure tax rules, price histories, currency rates, and dynamic discount rules.",
                "active_page": "pricing",
            },
            {
                "key": "coupons",
                "title": "Coupons & Discounts",
                "icon": "fas fa-ticket-alt",
                "url": "/coupons/manage",
                "permission_code": "ecommerce:products:view",
                "plans": ["Basic", "Pro", "Enterprise", "ecommerce module (free tire)"],
                "description": "Manage promotional discount coupons, usage limits, and promotional cart calculation.",
                "active_page": "coupons",
            },
            {
                "key": "orders",
                "title": "Orders",
                "icon": "fas fa-receipt",
                "url": "/orders/manage",
                "permission_code": "ecommerce:orders:view",
                "plans": ["Basic", "Pro", "Enterprise", "ecommerce module (free tire)"],
                "description": "Process multi-channel store orders and fulfillment.",
                "active_page": "orders",
            },
            {
                "key": "inventory",
                "title": "Inventory Stock",
                "icon": "fas fa-boxes",
                "url": "/inventory/manage",
                "permission_code": "ecommerce:inventory:view",
                "plans": ["Basic", "Pro", "Enterprise", "ecommerce module (free tire)"],
                "description": "Monitor stock levels, multi-warehouse inventory, and alerts.",
                "active_page": "inventory",
            },
            {
                "key": "inventory_uom",
                "title": "UoM & Conversions",
                "icon": "fas fa-ruler-combined",
                "url": "/inventory/uom/manage",
                "permission_code": "ecommerce:inventory:view",
                "plans": ["Basic", "Pro", "Enterprise", "ecommerce module (free tire)"],
                "description": "Manage units of measure, conversion rules, and unit calculation tool.",
                "active_page": "inventory_uom",
            },
            {
                "key": "items_master",
                "title": "Item Master Catalog",
                "icon": "fas fa-cubes",
                "url": "/inventory/items-master/manage",
                "permission_code": "ecommerce:inventory:view",
                "plans": ["Basic", "Pro", "Enterprise", "ecommerce module (free tire)"],
                "description": "Standalone item management supporting item types, tracking types, and costs.",
                "active_page": "items_master",
            },
            {
                "key": "inventory_valuation",
                "title": "Valuation Reports",
                "icon": "fas fa-calculator",
                "url": "/inventory/valuation/manage",
                "permission_code": "ecommerce:inventory:view",
                "plans": ["Basic", "Pro", "Enterprise", "ecommerce module (free tire)"],
                "description": "Evaluate inventory assets with FIFO vs Weighted Average costing models.",
                "active_page": "inventory_valuation",
            },
            {
                "key": "lots_serials",
                "title": "Lot & Serial Tracking",
                "icon": "fas fa-barcode",
                "url": "/inventory/lots-serials/manage",
                "permission_code": "ecommerce:inventory:view",
                "plans": ["Basic", "Pro", "Enterprise", "ecommerce module (free tire)"],
                "description": "Track batch lot expiry alerts and serial number status lifecycle.",
                "active_page": "lots_serials",
            },
            {
                "key": "inventory_transfers",
                "title": "Stock Transfers",
                "icon": "fas fa-exchange-alt",
                "url": "/inventory/transfers/manage",
                "permission_code": "ecommerce:inventory:view",
                "plans": ["Basic", "Pro", "Enterprise", "ecommerce module (free tire)"],
                "description": "Manage multi-warehouse transfers and in-transit shipments.",
                "active_page": "inventory_transfers",
            },
            {
                "key": "inventory_counts",
                "title": "Stock Counts & Audits",
                "icon": "fas fa-clipboard-list",
                "url": "/inventory/counts/manage",
                "permission_code": "ecommerce:inventory:view",
                "plans": ["Basic", "Pro", "Enterprise", "ecommerce module (free tire)"],
                "description": "Schedule physical stock counts and reconcile inventory variances.",
                "active_page": "inventory_counts",
            },
        ],
    },
]


def resolve_menu_for_user(user: Any) -> Dict[str, Any]:
    """
    Evaluates current user's business subscription plan against feature requirements.
    Returns structured menu sections with calculated 'is_locked' status and metadata for rendering.
    """
    from app.core.config import settings

    if not user:
        return {"hr_payroll_categories": [], "ecommerce_categories": [], "user_plan_name": "Free"}

    is_superuser = getattr(user, "is_superuser", False)
    biz_profile = getattr(user, "business_profile", None)

    current_plan_name = "Free"
    plan_permissions = set()

    if biz_profile and biz_profile.subscription_plan:
        current_plan_name = biz_profile.subscription_plan.name or "Free"
        if biz_profile.subscription_plan.is_active:
            plan_permissions = {p.code for p in biz_profile.subscription_plan.permissions}

    hr_payroll_categories = []
    ecommerce_categories = []

    for section in FEATURE_CONFIG:
        group = section["module_group"]
        cat_name = section["category"]
        processed_items = []

        for item in section["items"]:
            perm_code = item["permission_code"]
            allowed_plans = item["plans"]

            # User level check (RBAC role/user permission check)
            # If user has individual/role permission, check if plan includes it
            user_has_rbac = is_superuser or (
                hasattr(user, "has_permission") and user.has_permission(perm_code)
            )
            if not user_has_rbac:
                continue

            # Plan level check
            # Plan is considered included if superuser, OR subscription is not required,
            # OR plan permissions include perm_code/wildcard,
            # OR current plan name is explicitly listed in allowed_plans
            if is_superuser or not settings.subscription_required:
                is_included_in_plan = True
            else:
                is_included_in_plan = (
                    perm_code in plan_permissions
                    or "*" in plan_permissions
                    or current_plan_name in allowed_plans
                )

            is_locked = not is_included_in_plan

            # Formatting required plan tier list for UI modal
            valid_main_tiers = [p for p in allowed_plans if p in PLAN_TIERS]
            required_tier_text = ", ".join(valid_main_tiers) if valid_main_tiers else ", ".join(allowed_plans)

            processed_items.append({
                "key": item["key"],
                "title": item["title"],
                "icon": item["icon"],
                "url": item["url"],
                "permission_code": perm_code,
                "plans": allowed_plans,
                "required_tier_text": required_tier_text,
                "description": item["description"],
                "active_page": item["active_page"],
                "is_locked": is_locked,
                "user_has_rbac": user_has_rbac,
            })

        if processed_items:
            category_data = {
                "category": cat_name,
                "items": processed_items,
            }

            if group == "hr_payroll":
                hr_payroll_categories.append(category_data)
            elif group == "ecommerce":
                ecommerce_categories.append(category_data)

    return {
        "hr_payroll_categories": hr_payroll_categories,
        "ecommerce_categories": ecommerce_categories,
        "user_plan_name": current_plan_name,
    }


def resolve_features_plans_for_user(user: Any) -> Dict[str, Any]:
    """
    Resolves feature and plan data for subscriber-facing Features & Plans page.
    Evaluates current subscriber's subscription plan against all modules in FEATURE_CONFIG.
    """
    from app.core.config import settings

    if not user:
        return {
            "categories": [],
            "current_plan_name": "Free",
            "plan_tiers": PLAN_TIERS,
            "total_modules_count": 0,
            "unlocked_modules_count": 0,
        }

    is_superuser = getattr(user, "is_superuser", False)
    biz_profile = getattr(user, "business_profile", None)

    current_plan_name = "Free"
    plan_permissions = set()

    if biz_profile and biz_profile.subscription_plan:
        current_plan_name = biz_profile.subscription_plan.name or "Free"
        if biz_profile.subscription_plan.is_active:
            plan_permissions = {p.code for p in biz_profile.subscription_plan.permissions}

    categories = []
    total_modules = 0
    unlocked_modules = 0

    for section in FEATURE_CONFIG:
        cat_name = section["category"]
        module_group = section["module_group"]
        items = []

        for item in section["items"]:
            perm_code = item["permission_code"]
            allowed_plans = item["plans"]

            if is_superuser or not settings.subscription_required:
                is_included = True
            else:
                is_included = (
                    perm_code in plan_permissions
                    or "*" in plan_permissions
                    or current_plan_name in allowed_plans
                )

            total_modules += 1
            if is_included:
                unlocked_modules += 1

            valid_main_tiers = [p for p in allowed_plans if p in PLAN_TIERS]
            required_tier_text = ", ".join(valid_main_tiers) if valid_main_tiers else ", ".join(allowed_plans)
            primary_tier = valid_main_tiers[0] if valid_main_tiers else (allowed_plans[0] if allowed_plans else "Pro")

            items.append({
                "key": item["key"],
                "title": item["title"],
                "icon": item["icon"],
                "url": item["url"],
                "permission_code": perm_code,
                "plans": allowed_plans,
                "required_tier_text": required_tier_text,
                "primary_tier": primary_tier,
                "description": item["description"],
                "active_page": item["active_page"],
                "is_included": is_included,
                "status_badge_text": "Included in your plan" if is_included else f"Upgrade to {primary_tier}",
            })

        categories.append({
            "category": cat_name,
            "module_group": module_group,
            "items": items,
        })

    return {
        "categories": categories,
        "current_plan_name": current_plan_name,
        "plan_tiers": PLAN_TIERS,
        "total_modules_count": total_modules,
        "unlocked_modules_count": unlocked_modules,
    }
