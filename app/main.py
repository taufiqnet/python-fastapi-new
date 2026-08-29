from fastapi import FastAPI

from app.core.config import settings
from app.database import Base, engine
from app.modules.ecommerce.categories.models import Category  # noqa: F401
from app.modules.ecommerce.inventory.models import InventoryItem, Warehouse  # noqa: F401
from app.modules.ecommerce.products.models import Product  # noqa: F401
from app.modules.ecommerce.sellers.models import Seller  # noqa: F401
from app.modules.ecommerce.pricing.models import PriceHistory, TaxRule, CurrencyRate  # noqa: F401
from app.modules.ecommerce.cart.models import Cart, CartItem  # noqa: F401
from app.modules.ecommerce.orders.models import Order, OrderItem, OrderStatusHistory, OrderAddress  # noqa: F401
from app.modules.ecommerce.payments.models import Payment, PaymentMethod, Refund  # noqa: F401
from app.modules.ecommerce.shipping.models import Shipment, ShippingZone, ShippingRate  # noqa: F401
from app.modules.ecommerce.reviews.models import Review, ReviewVote  # noqa: F401
from app.modules.ecommerce.notifications.models import Notification, NotificationPreference  # noqa: F401
from app.routers import auth, business, cart, categories, inventory, notifications, orders, payments, pricing, products, reviews, search, shipping, tasks

try:
    Base.metadata.create_all(bind=engine)
except Exception:
    pass

app = FastAPI(
    title="E-Commerce API",
    version="1.0.0",
)

app.include_router(auth.router)
app.include_router(business.router)
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(inventory.router)
app.include_router(pricing.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(payments.router)
app.include_router(shipping.router)
app.include_router(reviews.router)
app.include_router(notifications.router)
app.include_router(search.router)
app.include_router(tasks.router)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.app_env,
    }
