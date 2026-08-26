ecommerce-fastapi-structure.md# Enterprise E-Commerce Backend — FastAPI Modular Structure

A production-grade, domain-driven folder structure for a large-scale marketplace (Amazon/eBay-style), covering multi-vendor selling, catalog, cart/checkout, payments, shipping, reviews, and admin/analytics.

---

## 1. Top-Level Project Structure

```
ecommerce-backend/
│
├── app/
│   ├── main.py                     # FastAPI app instance, router registration
│   ├── config.py                   # Settings (pydantic BaseSettings), env vars
│   ├── database.py                 # SQLAlchemy engine/session, Base declarative
│   ├── dependencies.py             # Shared dependencies (get_db, get_current_user)
│   │
│   ├── core/
│   │   ├── security.py             # JWT, OAuth2, password hashing
│   │   ├── permissions.py          # RBAC / role checks
│   │   ├── exceptions.py           # Custom exception classes
│   │   ├── logging.py
│   │   └── pagination.py           # Shared pagination schema/utils
│   │
│   ├── common/
│   │   ├── models.py                # Mixins: TimestampMixin, SoftDeleteMixin, UUIDMixin
│   │   ├── schemas.py                # Base response envelopes, PaginatedResponse
│   │   └── enums.py                  # Shared enums: Currency, Status, etc.
│   │
│   ├── modules/
│   │   ├── users/
│   │   ├── auth/
│   │   ├── sellers/
│   │   ├── catalog/
│   │   ├── categories/
│   │   ├── inventory/
│   │   ├── pricing/
│   │   ├── cart/
│   │   ├── orders/
│   │   ├── payments/
│   │   ├── shipping/
│   │   ├── reviews/
│   │   ├── wishlist/
│   │   ├── promotions/
│   │   ├── notifications/
│   │   ├── search/
│   │   ├── returns/
│   │   ├── disputes/
│   │   └── admin/
│   │
│   └── tests/
│       └── ... (mirrors modules/ structure)
│
├── alembic/
│   ├── versions/
│   └── env.py
│
├── .env
├── requirements.txt
└── docker-compose.yml
```

Each folder under `modules/` follows the **same internal pattern** (a "vertical slice"):

```
modules/<domain>/
├── __init__.py
├── models.py        # SQLAlchemy ORM models (DB tables)
├── schemas.py        # Pydantic schemas (request/response DTOs)
├── router.py          # API endpoints (APIRouter)
├── service.py          # Business logic layer
├── repository.py        # DB query layer (optional, for CQRS-style separation)
└── exceptions.py          # Module-specific exceptions
```

This keeps each domain self-contained and independently testable/scalable — the same pattern large platforms use internally (per-team ownership of a bounded context).

---

## 2. Module-by-Module: `models.py` & `schemas.py` Contents

### 🔹 `modules/users/`
**models.py**
- `User` — id, email, phone, hashed_password, full_name, is_active, is_verified, role, created_at
- `UserAddress` — user_id (FK), label, street, city, state, zip, country, is_default
- `UserProfile` — avatar_url, date_of_birth, preferences (JSON)

**schemas.py**
- `UserCreate`, `UserUpdate`, `UserOut`, `UserPublic` (minimal, for reviews/sellers)
- `AddressCreate`, `AddressOut`
- `UserLoginRequest`, `Token`, `TokenPayload`

---

### 🔹 `modules/auth/`
**models.py**
- `RefreshToken` — token, user_id, expires_at, revoked
- `PasswordResetToken`
- `OAuthAccount` — provider, provider_user_id, user_id

**schemas.py**
- `LoginRequest`, `RegisterRequest`, `TokenResponse`, `RefreshRequest`
- `PasswordResetRequest`, `PasswordResetConfirm`
- `OTPVerifyRequest`

---

### 🔹 `modules/sellers/` (multi-vendor marketplace core)
**models.py**
- `Seller` — user_id (FK), store_name, slug, tax_id, verification_status, rating_avg
- `SellerDocument` — kyc docs, license, bank details
- `SellerPayout` — payout schedule, bank_account_id, balance

**schemas.py**
- `SellerRegisterRequest`, `SellerOut`, `SellerPublicProfile`
- `SellerVerificationUpdate`
- `SellerPayoutOut`

---

### 🔹 `modules/catalog/` (products)
**models.py**
- `Product` — id, seller_id (FK), title, slug, description, brand, status, category_id (FK)
- `ProductVariant` — product_id (FK), sku, attributes (JSON: color/size), price, stock_qty
- `ProductImage` — product_id/variant_id, url, position, alt_text
- `ProductAttribute` / `AttributeValue` — for faceted filtering
- `ProductTag`

**schemas.py**
- `ProductCreate`, `ProductUpdate`, `ProductOut`, `ProductListItem` (lightweight, for grid views)
- `VariantCreate`, `VariantOut`
- `ProductImageOut`
- `ProductDetailOut` (nested: variants + images + seller + reviews summary)

---

### 🔹 `modules/categories/`
**models.py**
- `Category` — id, parent_id (self-referential, for nested tree), name, slug, icon
- `CategoryAttributeTemplate` — defines expected attributes per category (e.g. "RAM" for Electronics)

**schemas.py**
- `CategoryCreate`, `CategoryOut`, `CategoryTreeNode` (recursive schema for nested category trees)

---

### 🔹 `modules/inventory/`
**models.py**
- `InventoryItem` — variant_id (FK), warehouse_id, quantity_on_hand, quantity_reserved
- `Warehouse` — name, address, region
- `StockMovement` — item_id, delta, reason (restock/order/return), reference_id

**schemas.py**
- `InventoryOut`, `StockAdjustmentRequest`
- `WarehouseOut`

---

### 🔹 `modules/pricing/`
**models.py**
- `PriceHistory` — variant_id, old_price, new_price, changed_at
- `TaxRule` — region, category_id, tax_percentage
- `CurrencyRate`

**schemas.py**
- `PriceUpdateRequest`, `TaxCalculationRequest/Response`

---

### 🔹 `modules/cart/`
**models.py**
- `Cart` — user_id (nullable for guest via session_id), status
- `CartItem` — cart_id (FK), variant_id (FK), quantity, price_snapshot

**schemas.py**
- `CartItemCreate`, `CartItemUpdate`, `CartOut` (with computed subtotal/total)
- `CartMergeRequest` (merging guest cart → user cart on login)

---

### 🔹 `modules/orders/`
**models.py**
- `Order` — id, user_id, status (enum: pending/paid/shipped/delivered/cancelled), total_amount, placed_at
- `OrderItem` — order_id, variant_id, seller_id, quantity, unit_price, subtotal
- `OrderStatusHistory` — order_id, status, changed_at, note
- `OrderAddress` — snapshot of shipping/billing address at time of order

**schemas.py**
- `OrderCreate` (checkout payload), `OrderOut`, `OrderItemOut`
- `OrderStatusUpdate`
- `OrderSummary` (for list views), `OrderDetail` (full nested view)

---

### 🔹 `modules/payments/`
**models.py**
- `Payment` — order_id, provider (stripe/paypal), transaction_id, amount, status
- `PaymentMethod` — user_id, type (card/wallet), token_ref (never store raw card data)
- `Refund` — payment_id, amount, reason, status

**schemas.py**
- `PaymentIntentCreate`, `PaymentOut`
- `RefundRequest`, `RefundOut`
- `WebhookPayload` (for provider callbacks)

---

### 🔹 `modules/shipping/`
**models.py**
- `Shipment` — order_id, carrier, tracking_number, status, shipped_at, delivered_at
- `ShippingRate` — region, weight_range, base_cost
- `ShippingZone`

**schemas.py**
- `ShipmentCreate`, `ShipmentOut`, `TrackingUpdate`
- `ShippingRateQuote`

---

### 🔹 `modules/reviews/`
**models.py**
- `Review` — product_id, user_id, order_item_id (verify purchase), rating, comment, images
- `ReviewVote` — review_id, user_id, is_helpful

**schemas.py**
- `ReviewCreate`, `ReviewOut`, `ReviewSummary` (avg rating + count breakdown by star)

---

### 🔹 `modules/wishlist/`
**models.py**
- `Wishlist` — user_id, name (support multiple lists)
- `WishlistItem` — wishlist_id, variant_id

**schemas.py**
- `WishlistCreate`, `WishlistOut`, `WishlistItemCreate`

---

### 🔹 `modules/promotions/`
**models.py**
- `Coupon` — code, discount_type (%, fixed), value, min_order_amount, usage_limit, expires_at
- `CouponRedemption` — coupon_id, user_id, order_id
- `FlashSale` — product_ids, start_time, end_time, discount_percent

**schemas.py**
- `CouponCreate`, `CouponOut`, `CouponApplyRequest/Response`
- `FlashSaleOut`

---

### 🔹 `modules/notifications/`
**models.py**
- `Notification` — user_id, type, title, body, is_read, sent_at
- `NotificationPreference` — user_id, channel (email/sms/push), enabled

**schemas.py**
- `NotificationOut`, `NotificationPreferenceUpdate`

---

### 🔹 `modules/search/`
*(Often no DB models — backed by Elasticsearch/OpenSearch, but request/response schemas still live here)*

**schemas.py**
- `SearchQuery` (q, filters, facets, sort, page)
- `SearchResult`, `FacetOut`

---

### 🔹 `modules/returns/`
**models.py**
- `ReturnRequest` — order_item_id, reason, status, requested_at
- `RefundLineItem`

**schemas.py**
- `ReturnRequestCreate`, `ReturnRequestOut`, `ReturnStatusUpdate`

---

### 🔹 `modules/disputes/` (buyer-seller conflict resolution, eBay-style)
**models.py**
- `Dispute` — order_id, opened_by, reason, status, resolution
- `DisputeMessage` — dispute_id, sender_id, message, attachment_url

**schemas.py**
- `DisputeCreate`, `DisputeOut`, `DisputeMessageCreate`

---

### 🔹 `modules/admin/`
**models.py**
- `AuditLog` — actor_id, action, entity_type, entity_id, diff (JSON), timestamp
- `AdminRole` — permission sets

**schemas.py**
- `AuditLogOut`, `AdminDashboardStats`

---

## 3. Example: `modules/orders/models.py`

```python
import enum
import uuid
from sqlalchemy import Column, String, Numeric, ForeignKey, Enum, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.common.models import TimestampMixin


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class Order(Base, TimestampMixin):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD")

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    status_history = relationship("OrderStatusHistory", back_populates="order")
    payment = relationship("Payment", uselist=False, back_populates="order")
    shipment = relationship("Shipment", uselist=False, back_populates="order")


class OrderItem(Base, TimestampMixin):
    __tablename__ = "order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("product_variants.id"), nullable=False)
    seller_id = Column(UUID(as_uuid=True), ForeignKey("sellers.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)

    order = relationship("Order", back_populates="items")


class OrderStatusHistory(Base, TimestampMixin):
    __tablename__ = "order_status_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    status = Column(Enum(OrderStatus), nullable=False)
    note = Column(String, nullable=True)

    order = relationship("Order", back_populates="status_history")
```

---

## 4. Example: `modules/orders/schemas.py`

```python
import uuid
from decimal import Decimal
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from app.modules.orders.models import OrderStatus


class OrderItemCreate(BaseModel):
    variant_id: uuid.UUID
    quantity: int = Field(gt=0)


class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    shipping_address_id: uuid.UUID
    billing_address_id: Optional[uuid.UUID] = None
    coupon_code: Optional[str] = None
    payment_method_id: uuid.UUID


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    variant_id: uuid.UUID
    seller_id: uuid.UUID
    quantity: int
    unit_price: Decimal
    subtotal: Decimal


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    note: Optional[str] = None


class OrderSummary(BaseModel):
    """Lightweight — used in order list views."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: OrderStatus
    total_amount: Decimal
    currency: str
    created_at: datetime


class OrderDetail(OrderSummary):
    """Full nested view — used in order detail endpoint."""
    items: List[OrderItemOut]

    # Populated by service layer joins, not direct FK on Order
    # payment: "PaymentOut"
    # shipment: "ShipmentOut"
```

---

## 5. Shared Mixins — `app/common/models.py`

```python
import uuid
from sqlalchemy import Column, DateTime, Boolean, func
from sqlalchemy.dialects.postgresql import UUID


class UUIDMixin:
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class SoftDeleteMixin:
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
```

---

## 6. Shared Response Envelope — `app/common/schemas.py`

```python
from typing import Generic, TypeVar, List, Optional
from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    has_next: bool


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    message: Optional[str] = None
    data: Optional[T] = None
```

---

## 7. Key Design Principles Behind This Structure

1. **Vertical slices over horizontal layers** — each module owns its models, schemas, routes, and logic, so teams can work on `orders/` and `catalog/` in parallel without merge conflicts.
2. **Separate `models.py` (DB) from `schemas.py` (API contract)** — never expose ORM models directly; this lets you version your API independently of your DB schema.
3. **Multiple schema variants per entity** — `Out` (public), `ListItem` (lightweight for grids), `Detail` (fully nested) — avoids over-fetching and N+1 serialization costs.
4. **Money as `Decimal`/`Numeric`, never `float`** — critical for financial correctness.
5. **Status as `Enum`, with a `StatusHistory` audit trail table** — needed for order/dispute/return tracking at scale.
6. **Seller as a first-class entity separate from `User`** — required for any multi-vendor (Amazon Marketplace/eBay-style) platform.
7. **Snapshot data on `Order`/`OrderItem`** (price, address) — historical orders must never change even if the product price or user address changes later.

---

## 8. Suggested Build Order

1. `users`, `auth` → 2. `sellers`, `categories`, `catalog`, `inventory` → 3. `cart` → 4. `orders`, `payments`, `shipping` → 5. `reviews`, `wishlist`, `promotions` → 6. `search`, `notifications` → 7. `returns`, `disputes`, `admin`
