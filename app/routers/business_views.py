import datetime

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.core.deps import get_current_user_optional
from app.core.identity.models import Role, User
from app.core.tenancy.models import BusinessProfile
from app.core.tenancy.service import BusinessService
from app.database import get_async_db, get_db
from app.modules.ecommerce.customer.models import Customer
from app.modules.ecommerce.orders.models import Order
from app.modules.ecommerce.products.models import Product
from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.leave.models import LeaveApplication
from app.modules.hr_payroll.organization.models import Department

router = APIRouter(prefix="", tags=["Business Views"])
templates = Jinja2Templates(directory="app/templates")
service = BusinessService()


def add_no_cache_headers(response: Response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@router.get("/", response_class=HTMLResponse)
async def root_or_business_list_page(
    request: Request,
    switch_business_id: int | None = None,
    db: AsyncSession = Depends(get_async_db),
):
    current_user = await get_current_user_optional(request, None, db)
    if not current_user or not current_user.is_active:
        res = RedirectResponse(url="/auth/login", status_code=status.HTTP_302_FOUND)
        return add_no_cache_headers(res)

    permission_codes = current_user.get_all_permission_codes()
    is_superuser = current_user.is_superuser

    has_hrm_access = is_superuser or "*" in permission_codes or any(
        c.startswith("hrm:") for c in permission_codes
    )
    has_ecom_access = is_superuser or "*" in permission_codes or any(
        c.startswith("ecommerce:") or c.startswith("ecom:") for c in permission_codes
    )
    has_admin_access = is_superuser or "*" in permission_codes or any(
        c.startswith("general:") for c in permission_codes
    ) or current_user.has_role("admin")

    # Fetch all active business profiles for system admin / multi-tenant dropdown
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.is_active))
    all_businesses = list(result.scalars().all())

    # Tenant Isolation Enforcement:
    # Business switching across tenants is restricted to superusers (`is_superuser`).
    # Non-superusers (including local tenant admins) are hard-locked to `business_id`.
    if is_superuser:
        target_biz_id = switch_business_id or current_user.business_id
    else:
        target_biz_id = current_user.business_id
        all_businesses = [
            b for b in all_businesses if b.id == current_user.business_id
        ]

    current_business = None
    if target_biz_id:
        res = await db.execute(
            select(BusinessProfile).where(BusinessProfile.id == target_biz_id)
        )
        current_business = res.scalar_one_or_none()

    if not current_business and all_businesses:
        current_business = all_businesses[0]

    if not is_superuser and current_user.business_id:
        biz_filter_id = current_user.business_id
    else:
        biz_filter_id = current_business.id if current_business else None

    # Contextual stats
    stats = {
        "hrm": {},
        "ecom": {},
        "admin": {},
    }

    if has_hrm_access:
        emp_query = select(func.count(Employee.id))
        if biz_filter_id:
            emp_query = emp_query.where(Employee.business_id == biz_filter_id)
        emp_count = (await db.execute(emp_query)).scalar() or 0

        active_emp_query = select(func.count(Employee.id)).where(
            Employee.is_active.is_(True)
        )
        if biz_filter_id:
            active_emp_query = active_emp_query.where(
                Employee.business_id == biz_filter_id
            )
        active_emp_count = (await db.execute(active_emp_query)).scalar() or 0

        leave_query = select(func.count(LeaveApplication.id)).where(
            LeaveApplication.status == "pending"
        )
        if biz_filter_id:
            leave_query = leave_query.where(
                LeaveApplication.business_id == biz_filter_id
            )
        pending_leave_count = (await db.execute(leave_query)).scalar() or 0

        dept_query = select(func.count(Department.id))
        if biz_filter_id:
            dept_query = dept_query.where(Department.business_id == biz_filter_id)
        dept_count = (await db.execute(dept_query)).scalar() or 0

        stats["hrm"] = {
            "total_employees": emp_count,
            "active_employees": active_emp_count,
            "pending_leave_requests": pending_leave_count,
            "total_departments": dept_count,
        }

    if has_ecom_access:
        order_query = select(func.count(Order.id))
        if biz_filter_id:
            order_query = order_query.where(Order.business_id == biz_filter_id)
        order_count = (await db.execute(order_query)).scalar() or 0

        pending_order_query = select(func.count(Order.id)).where(
            Order.fulfillment_status == "pending"
        )
        if biz_filter_id:
            pending_order_query = pending_order_query.where(
                Order.business_id == biz_filter_id
            )
        pending_order_count = (await db.execute(pending_order_query)).scalar() or 0

        prod_query = select(func.count(Product.id))
        if biz_filter_id:
            prod_query = prod_query.where(Product.business_id == biz_filter_id)
        prod_count = (await db.execute(prod_query)).scalar() or 0

        cust_query = select(func.count(Customer.id))
        if biz_filter_id:
            cust_query = cust_query.where(Customer.business_id == biz_filter_id)
        cust_count = (await db.execute(cust_query)).scalar() or 0

        stats["ecom"] = {
            "total_orders": order_count,
            "pending_orders": pending_order_count,
            "total_products": prod_count,
            "total_customers": cust_count,
        }

    if has_admin_access:
        total_biz = len(all_businesses)
        active_biz = sum(1 for b in all_businesses if b.is_active)

        user_count_query = select(func.count(User.id))
        role_count_query = select(func.count(Role.id))

        if not is_superuser and biz_filter_id:
            user_count_query = user_count_query.where(User.business_id == biz_filter_id)
            role_count_query = role_count_query.where(Role.business_id == biz_filter_id)

        total_users = (await db.execute(user_count_query)).scalar() or 0
        total_roles = (await db.execute(role_count_query)).scalar() or 0

        stats["admin"] = {
            "total_businesses": total_biz,
            "active_businesses": active_biz,
            "total_users": total_users,
            "total_roles": total_roles,
        }

    # Onboarding setup checklist calculation
    checklist = []
    if has_admin_access or is_superuser:
        has_biz_info = bool(
            current_business
            and getattr(current_business, "name_en", None)
            and (current_business.email or current_business.country)
        )
        has_roles = (stats["admin"].get("total_roles", 0)) > 0
        has_users = (stats["admin"].get("total_users", 0)) > 1
        has_catalog = (stats["ecom"].get("total_products", 0) > 0) or (
            stats["hrm"].get("total_employees", 0) > 0
        )

        edit_url = (
            f"/businesses/{current_business.id}/edit"
            if current_business
            else "/businesses/create"
        )

        checklist = [
            {
                "id": "biz_profile",
                "title": "Business Profile",
                "desc": "Configure company details and contact info",
                "done": has_biz_info,
                "url": edit_url,
                "icon": "fas font-building",
            },
            {
                "id": "roles",
                "title": "Configure Roles & Permissions",
                "desc": "Define RBAC roles for your organization",
                "done": has_roles,
                "url": "/roles/manage",
                "icon": "fas fa-key",
            },
            {
                "id": "team",
                "title": "Invite Team Members",
                "desc": "Create user accounts and assign roles",
                "done": has_users,
                "url": "/users/manage",
                "icon": "fas fa-user-plus",
            },
            {
                "id": "data",
                "title": "Setup Initial Data",
                "desc": "Add employees or products to get started",
                "done": has_catalog,
                "url": "/products" if has_ecom_access else "/employees/manage",
                "icon": "fas fa-layer-group",
            },
        ]

    completed_checklist_count = sum(1 for item in checklist if item["done"])
    total_checklist_count = len(checklist)

    # Time-aware greeting
    current_hour = datetime.datetime.now().hour
    if current_hour < 12:
        greeting_time = "Good morning"
    elif current_hour < 18:
        greeting_time = "Good afternoon"
    else:
        greeting_time = "Good evening"

    response = templates.TemplateResponse(
        request=request,
        name="control_center.html",
        context={
            "current_user": current_user,
            "greeting_time": greeting_time,
            "current_business": current_business,
            "all_businesses": all_businesses,
            "has_hrm_access": has_hrm_access,
            "has_ecom_access": has_ecom_access,
            "has_admin_access": has_admin_access,
            "stats": stats,
            "checklist": checklist,
            "completed_checklist_count": completed_checklist_count,
            "total_checklist_count": total_checklist_count,
            "active_page": "dashboard",
        },
    )
    return add_no_cache_headers(response)


@router.get("/businesses/manage", response_class=HTMLResponse)
def business_manage_page(
    request: Request, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    businesses = service.list_businesses(db, skip=skip, limit=limit)
    total_count = len(businesses)
    active_count = sum(1 for b in businesses if getattr(b, "is_active", True))
    inactive_count = total_count - active_count
    countries = sorted(
        list({b.country for b in businesses if getattr(b, "country", None)})
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/tenancy/business_list.html",
        context={
            "businesses": businesses,
            "total_count": total_count,
            "active_count": active_count,
            "inactive_count": inactive_count,
            "countries_count": len(countries),
            "countries": countries,
        },
    )


@router.get("/businesses/create", response_class=HTMLResponse)
def business_create_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="modules/tenancy/business_form.html",
        context={
            "business": None,
            "is_edit": False,
        },
    )


@router.get("/businesses/{business_id}", response_class=HTMLResponse)
def business_detail_page(
    business_id: int, request: Request, db: Session = Depends(get_db)
):
    business = service.get_business(db, business_id)
    return templates.TemplateResponse(
        request=request,
        name="modules/tenancy/business_detail.html",
        context={
            "business": business,
        },
    )


@router.get("/businesses/{business_id}/edit", response_class=HTMLResponse)
def business_edit_page(
    business_id: int, request: Request, db: Session = Depends(get_db)
):
    business = service.get_business(db, business_id)
    return templates.TemplateResponse(
        request=request,
        name="modules/tenancy/business_form.html",
        context={
            "business": business,
            "is_edit": True,
        },
    )
