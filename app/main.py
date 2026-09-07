import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.identity.seed import seed_system_admin_and_permissions, seed_system_admin_and_permissions_sync
from app.database import AsyncSessionLocal, Base, SessionLocal, async_engine, engine

# Registers every module's models with Base.metadata in one place — see
# app/models_registry.py. Import must happen before create_all() below.
from app import models_registry  # noqa: F401

# Confirmed shims — these all just re-exported their module's real router.
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
    user_views,
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


os.makedirs("app/static/ecommerce/images", exist_ok=True)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=getattr(settings, "cors_origins", ["*"]),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
app.include_router(recruitment_views.router)
app.include_router(role_views.router)
app.include_router(user_views.router)
app.include_router(auth.router)
app.include_router(business.router)

#ecommerce module router
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

#hr payroll router
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

#project management router
app.include_router(tasks.router)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.app_env,
    }
