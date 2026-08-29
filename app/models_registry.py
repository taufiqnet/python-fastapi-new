"""
Central model registry.

SQLAlchemy only knows about a table once its model class has been imported
and executed somewhere. Rather than growing an ever-longer import list in
main.py every time a new module gets models, every module's models are
imported ONCE here. main.py just imports this module.

When you add a new module with models.py, add one import line below —
that's the only place it needs to be added.
"""

from app.modules.ecommerce.categories.models import Category  # noqa: F401
from app.modules.ecommerce.inventory.models import InventoryItem, Warehouse  # noqa: F401
from app.modules.ecommerce.products.models import (  # noqa: F401
    AttributeValue,
    Product,
    ProductAttribute,
    ProductImage,
    ProductTag,
    ProductVariant,
)
from app.modules.ecommerce.sellers.models import Seller  # noqa: F401
from app.modules.ecommerce.pricing.models import (  # noqa: F401
    CurrencyRate,
    PriceHistory,
    TaxRule,
)
from app.modules.ecommerce.cart.models import Cart, CartItem  # noqa: F401
from app.modules.ecommerce.orders.models import (  # noqa: F401
    Order,
    OrderAddress,
    OrderItem,
    OrderStatusHistory,
)
from app.modules.ecommerce.payments.models import (  # noqa: F401
    Payment,
    PaymentMethod,
    Refund,
)
from app.modules.ecommerce.shipping.models import (  # noqa: F401
    Shipment,
    ShippingRate,
    ShippingZone,
)
from app.modules.ecommerce.reviews.models import Review, ReviewVote  # noqa: F401
from app.modules.ecommerce.notifications.models import (  # noqa: F401
    Notification,
    NotificationPreference,
)

# TODO: Product.business_id and several other models FK to a business/tenant
# table (e.g. BusinessProfile). If that model isn't imported somewhere before
# create_all()/alembic autogenerate runs, SQLAlchemy won't know the target
# table exists. Uncomment and fix the path once confirmed:
# from app.modules.<business_module_path>.models import BusinessProfile  # noqa: F401

# TODO: confirm whether the `tasks` module has its own models.py. If it does,
# import its models here too — nothing currently registers them.
# from app.modules.<tasks_module_path>.models import ...  # noqa: F401
