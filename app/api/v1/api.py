"""
app/api/v1/api.py
Central Unified API Router for ProERP SaaS Platform.

Aggregates all domain REST API routers under a standardized /api/v1 namespace.
"""
from fastapi import APIRouter

# Ecommerce Module Routers
from app.modules.ecommerce.brands.router import router as brands_router
from app.modules.ecommerce.cart.router import router as cart_router
from app.modules.ecommerce.categories.router import router as categories_router
from app.modules.ecommerce.customer.router import router as customers_router
from app.modules.ecommerce.inventory.router import router as inventory_router
from app.modules.ecommerce.notifications.router import router as notifications_router
from app.modules.ecommerce.orders.router import router as orders_router
from app.modules.ecommerce.payments.router import router as payments_router
from app.modules.ecommerce.pos.router import router as pos_router
from app.modules.ecommerce.pricing.router import router as pricing_router
from app.modules.ecommerce.procurement.router import router as procurement_router
from app.modules.ecommerce.products.router import router as products_router
from app.modules.ecommerce.reports.router import router as reports_router
from app.modules.ecommerce.reviews.router import router as reviews_router
from app.modules.ecommerce.search.router import router as search_router
from app.modules.ecommerce.sellers.router import router as sellers_router
from app.modules.ecommerce.shipping.router import router as shipping_router
from app.modules.finance.router import router as finance_router

# HR & Payroll Module Routers
from app.modules.hr_payroll.appointments.router import router as appointments_router
from app.modules.hr_payroll.attendance.router import router as attendance_router
from app.modules.hr_payroll.certificates.router import router as certificates_router
from app.modules.hr_payroll.compensation.router import router as compensation_router
from app.modules.hr_payroll.documents.router import router as documents_router
from app.modules.hr_payroll.employees.router import router as employees_router
from app.modules.hr_payroll.experience_letters.router import router as experience_letters_router
from app.modules.hr_payroll.leave.router import router as leave_router
from app.modules.hr_payroll.lifecycle.router import router as lifecycle_router
from app.modules.hr_payroll.notice_board.router import router as notices_router
from app.modules.hr_payroll.offer_letters.router import router as offer_letters_router
from app.modules.hr_payroll.organization.router import router as organization_router
from app.modules.hr_payroll.payroll.router import router as payroll_router
from app.modules.hr_payroll.performance.router import router as performance_router
from app.modules.hr_payroll.portal.router import router as portal_router
from app.modules.hr_payroll.recruitment.router import router as recruitment_router
from app.modules.hr_payroll.roster.router import router as roster_router
from app.modules.hr_payroll.separation.router import router as separation_router

# Vertical SaaS & Specialized Modules
from app.modules.assets.router import router as assets_router
from app.modules.healthcare.router import router as healthcare_router
from app.modules.travel_expenses.router import router as travel_expenses_router
from app.modules.vehicles.router import router as vehicles_router

# System & Core API Routers
from app.api.v1.endpoints.sync import router as sync_router
from app.modules.system_backups.router import router as system_backups_router
from app.modules.system_seed.router import router as system_seed_router
from app.routers import ai_chat, auth, business, tasks

api_v1_router = APIRouter()

# --- 1. Ecommerce Routers ---
api_v1_router.include_router(brands_router)
api_v1_router.include_router(cart_router)
api_v1_router.include_router(categories_router)
api_v1_router.include_router(customers_router)
api_v1_router.include_router(inventory_router)
api_v1_router.include_router(notifications_router)
api_v1_router.include_router(orders_router)
api_v1_router.include_router(payments_router)
api_v1_router.include_router(pos_router)
api_v1_router.include_router(pricing_router)
api_v1_router.include_router(procurement_router)
api_v1_router.include_router(products_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(reviews_router)
api_v1_router.include_router(search_router)
api_v1_router.include_router(sellers_router)
api_v1_router.include_router(shipping_router)
api_v1_router.include_router(finance_router)

# --- 2. HR & Payroll Routers ---
api_v1_router.include_router(organization_router)
api_v1_router.include_router(employees_router)
api_v1_router.include_router(leave_router)
api_v1_router.include_router(attendance_router)
api_v1_router.include_router(compensation_router)
api_v1_router.include_router(payroll_router)
api_v1_router.include_router(certificates_router)
api_v1_router.include_router(offer_letters_router)
api_v1_router.include_router(experience_letters_router)
api_v1_router.include_router(appointments_router)
api_v1_router.include_router(notices_router)
api_v1_router.include_router(recruitment_router)
api_v1_router.include_router(roster_router)
api_v1_router.include_router(portal_router)
api_v1_router.include_router(performance_router)
api_v1_router.include_router(lifecycle_router)
api_v1_router.include_router(separation_router)
api_v1_router.include_router(documents_router)

# --- 3. Vertical & Operational Modules ---
api_v1_router.include_router(assets_router)
api_v1_router.include_router(healthcare_router)
api_v1_router.include_router(travel_expenses_router)
api_v1_router.include_router(vehicles_router)

# --- 4. System & Core Endpoints ---
api_v1_router.include_router(sync_router)
api_v1_router.include_router(system_backups_router)
api_v1_router.include_router(system_seed_router)
api_v1_router.include_router(auth.router)
api_v1_router.include_router(ai_chat.router)
api_v1_router.include_router(business.router)
api_v1_router.include_router(tasks.router)
