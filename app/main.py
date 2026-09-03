import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.database import Base, engine

# Registers every module's models with Base.metadata in one place — see
# app/models_registry.py. Import must happen before create_all() below.
from app import models_registry  # noqa: F401

# Confirmed shims — these all just re-exported their module's real router.
# Importing directly here removes that indirection for every one of them.
from app.modules.ecommerce.brands.router import router as brands_router
from app.modules.ecommerce.cart.router import router as cart_router
from app.modules.ecommerce.categories.router import router as categories_router
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

from app.routers import (
    attendance_views,
    auth,
    brand_views,
    business,
    business_views,
    category_views,
    employee_views,
    leave_views,
    model_views,
    organization_views,
    product_views,
    tasks,
)

logger = logging.getLogger(__name__)

if settings.app_env in ("development", "test", "local"):
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        logger.exception("Failed to create database tables on startup")
        raise

app = FastAPI(
    title="E-Commerce API",
    version="1.0.0",
)

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
app.include_router(brand_views.router)
app.include_router(model_views.router)
app.include_router(product_views.router)
app.include_router(organization_views.router)
app.include_router(employee_views.router)
app.include_router(leave_views.router)
app.include_router(attendance_views.router)
app.include_router(auth.router)
app.include_router(business.router)

#ecommerce module router
app.include_router(brands_router)
app.include_router(categories_router)
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

#project management router
app.include_router(tasks.router)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.app_env,
    }
