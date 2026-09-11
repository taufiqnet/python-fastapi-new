import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from fastapi.templating import Jinja2Templates

from app.core.config import settings
from app.core.deps import get_current_user_optional
from app.core.identity.seed import seed_system_admin_and_permissions, seed_system_admin_and_permissions_sync
from app.database import AsyncSessionLocal, Base, SessionLocal, async_engine, engine

# Ensure template responses automatically receive request.state.user as current_user
_original_template_response = Jinja2Templates.TemplateResponse


def _custom_template_response(self, *args, **kwargs):
    request = kwargs.get("request")
    if not request and args:
        request = args[0]
    context = kwargs.get("context")
    if not context and len(args) >= 3:
        context = args[2]

    if request and isinstance(context, dict) and "current_user" not in context:
        user = getattr(request.state, "user", None)
        if user:
            context["current_user"] = user

    return _original_template_response(self, *args, **kwargs)


Jinja2Templates.TemplateResponse = _custom_template_response

# Registers every module's models with Base.metadata in one place
from app import models_registry  # noqa: F401

# Routers
from app.modules.ecommerce.brands.router import router as brands_router
from app.modules.ecommerce.cart.router import router as cart_router
from app.modules.ecommerce.categories.router import router as categories_router
from app.modules.ecommerce.customer.router import router as customers_router
from app.modules.ecommerce.inventory.router import router as inventory_router
from app.modules.ecommerce.notifications.router import router as notifications_router
from app.modules.ecommerce.orders.router import router as orders_router
from app.modules.ecommerce.payments.router import router as payments_router
from app.modules.ecommerce.pricing.router import router as pricing_router
from app.modules.ecommerce.products.router import router as products_router
from app.modules.ecommerce.reviews.router import router as reviews_router
from app.modules.ecommerce.search.router import router as search_router
from app.modules.ecommerce.shipping.router import router as shipping_router
from app.modules.hr_payroll.organization.router import (
    router as organization_router,
)
from app.modules.hr_payroll.employees.router import router as employees_router
from app.modules.hr_payroll.leave.router import router as leave_router
from app.modules.hr_payroll.attendance.router import router as attendance_router
from app.modules.hr_payroll.compensation.router import router as compensation_router
from app.modules.hr_payroll.payroll.router import router as payroll_router
from app.modules.hr_payroll.certificates.router import router as certificates_router
from app.modules.hr_payroll.appointments.router import router as appointments_router
from app.modules.hr_payroll.notice_board.router import router as notices_router
from app.modules.hr_payroll.recruitment.router import router as recruitment_router

from app.routers import (
    ai_chat,
    appointment_views,
    attendance_views,
    auth,
    brand_views,
    business,
    business_views,
    category_views,
    certificate_views,
    compensation_views,
    customer_views,
    employee_views,
    inventory_views,
    leave_views,
    model_views,
    notice_views,
    order_views,
    organization_views,
    payroll_views,
    product_views,
    recruitment_views,
    role_views,
    subscription_plan_views,
    user_views,
    mcp_views,
    tasks,
)

logger = logging.getLogger(__name__)

if settings.app_env in ("development", "test", "local"):
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            seed_system_admin_and_permissions_sync(db)
        finally:
            db.close()
    except Exception:
        logger.exception("Failed to create database tables on startup")
        raise

app = FastAPI(
    title="E-Commerce API",
    version="1.0.0",
)


@app.on_event("startup")
async def on_startup():
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with AsyncSessionLocal() as db:
            await seed_system_admin_and_permissions(db)
    except Exception:
        logger.exception("Failed async startup table creation or seeding")


@app.middleware("http")
async def auth_and_cache_middleware(request: Request, call_next):
    path = request.url.path

    # Exempt public/API/static routes from HTML auth redirect
    is_public = (
        path.startswith("/auth")
        or path.startswith("/static")
        or path.startswith("/health")
        or "/api/" in path
        or path.endswith("/api")
        or request.headers.get("accept", "").find("text/html") == -1
    )

    override = app.dependency_overrides.get(get_current_user_optional)
    if override:
        import inspect

        if inspect.iscoroutinefunction(override):
            current_user = await override(request)
        else:
            current_user = override(request)
    else:
        async with AsyncSessionLocal() as db:
            current_user = await get_current_user_optional(request, None, db)

    if current_user and current_user.is_active:
        request.state.user = current_user
    elif not is_public and path != "/":
        redirect_res = RedirectResponse(url="/auth/login", status_code=302)
        redirect_res.headers["Cache-Control"] = (
            "no-cache, no-store, must-revalidate, max-age=0"
        )
        redirect_res.headers["Pragma"] = "no-cache"
        redirect_res.headers["Expires"] = "0"
        return redirect_res

    response = await call_next(request)

    # Set no-cache headers on HTML responses to prevent stale pages when pressing browser Back button
    content_type = response.headers.get("content-type", "")
    if "text/html" in content_type:
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

    return response


os.makedirs("app/static/ecommerce/images", exist_ok=True)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=getattr(settings, "cors_origins", ["*"]),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(ai_chat.router)
app.include_router(business_views.router)
app.include_router(category_views.router)
app.include_router(customer_views.router)
app.include_router(brand_views.router)
app.include_router(model_views.router)
app.include_router(product_views.router)
app.include_router(order_views.router)
app.include_router(inventory_views.router)
app.include_router(organization_views.router)
app.include_router(employee_views.router)
app.include_router(leave_views.router)
app.include_router(attendance_views.router)
app.include_router(compensation_views.router)
app.include_router(payroll_views.router)
app.include_router(certificate_views.router)
app.include_router(appointment_views.router)
app.include_router(notice_views.router)
app.include_router(recruitment_router)
app.include_router(role_views.router)
app.include_router(subscription_plan_views.router)
app.include_router(user_views.router)
app.include_router(mcp_views.router)
app.include_router(business.router)

# ecommerce module router
app.include_router(brands_router)
app.include_router(categories_router)
app.include_router(customers_router)
app.include_router(products_router)
app.include_router(inventory_router)
app.include_router(pricing_router)
app.include_router(cart_router)
app.include_router(orders_router)
app.include_router(payments_router)
app.include_router(shipping_router)
app.include_router(reviews_router)
app.include_router(notifications_router)
app.include_router(search_router)

# hr payroll router
app.include_router(organization_router)
app.include_router(employees_router)
app.include_router(leave_router)
app.include_router(attendance_router)
app.include_router(compensation_router)
app.include_router(payroll_router)
app.include_router(certificates_router)
app.include_router(appointments_router)
app.include_router(notices_router)
app.include_router(recruitment_router)

# project management router
app.include_router(tasks.router)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.app_env,
    }
