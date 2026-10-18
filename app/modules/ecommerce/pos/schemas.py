import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, List, Optional
from pydantic import BaseModel, Field

from app.modules.ecommerce.pos.models import POSPaymentMethod, SessionStatus


# --- Register Schemas ---
class POSRegisterBase(BaseModel):
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=50)
    warehouse_id: uuid.UUID
    is_active: bool = True
    receipt_header: Optional[str] = None
    receipt_footer: Optional[str] = None


class POSRegisterCreate(POSRegisterBase):
    business_id: int


class POSRegisterUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    warehouse_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None
    receipt_header: Optional[str] = None
    receipt_footer: Optional[str] = None


class POSRegisterOut(POSRegisterBase):
    id: uuid.UUID
    business_id: int
    created_at: datetime
    updated_at: datetime
    warehouse_name: Optional[str] = None

    class Config:
        from_attributes = True


# --- Session / Shift Schemas ---
class POSSessionOpenRequest(BaseModel):
    register_id: uuid.UUID
    opening_cash: Decimal = Field(default=Decimal("0.00"), ge=0)
    notes: Optional[str] = None


class POSSessionCloseRequest(BaseModel):
    closing_cash_counted: Decimal = Field(..., ge=0)
    notes: Optional[str] = None


class POSPaymentSplitItem(BaseModel):
    payment_method: POSPaymentMethod
    amount: Decimal = Field(..., gt=0)
    tendered_amount: Optional[Decimal] = None
    change_amount: Optional[Decimal] = None
    reference_number: Optional[str] = None


class POSPaymentOut(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    session_id: uuid.UUID
    payment_method: POSPaymentMethod
    amount: Decimal
    tendered_amount: Optional[Decimal] = None
    change_amount: Optional[Decimal] = None
    reference_number: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class POSSessionOut(BaseModel):
    id: uuid.UUID
    business_id: int
    register_id: uuid.UUID
    user_id: int
    status: SessionStatus
    opened_at: datetime
    closed_at: Optional[datetime] = None
    opening_cash: Decimal
    closing_cash_counted: Optional[Decimal] = None
    closing_cash_expected: Optional[Decimal] = None
    cash_difference: Optional[Decimal] = None
    notes: Optional[str] = None
    register_name: Optional[str] = None
    cashier_name: Optional[str] = None

    class Config:
        from_attributes = True


class POSSessionSummaryOut(BaseModel):
    session: POSSessionOut
    total_sales_amount: Decimal
    total_orders_count: int
    cash_sales_amount: Decimal
    card_sales_amount: Decimal
    mobile_wallet_sales_amount: Decimal
    other_sales_amount: Decimal
    expected_drawer_cash: Decimal


# --- POS Checkout Schemas ---
class POSCartLineItem(BaseModel):
    variant_id: uuid.UUID
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    note: Optional[str] = None
    tax_exempt: Optional[bool] = False


class POSCheckoutRequest(BaseModel):
    session_id: uuid.UUID
    customer_id: Optional[uuid.UUID] = None
    guest_name: Optional[str] = "Walk-in Customer"
    guest_phone: Optional[str] = None
    items: List[POSCartLineItem]
    payments: List[POSPaymentSplitItem]
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    tax_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    discount_reason: Optional[str] = None
    coupon_code: Optional[str] = None
    points_redeemed: Optional[int] = 0
    customer_note: Optional[str] = None


class POSReceiptLineItem(BaseModel):
    product_title: str
    variant_title: Optional[str] = None
    sku: str
    barcode: Optional[str] = None
    quantity: int
    unit_price: Decimal
    discount_amount: Decimal
    subtotal: Decimal
    note: Optional[str] = None


class POSCheckoutResponse(BaseModel):
    order_id: uuid.UUID
    order_number: str
    created_at: datetime
    business_name: str
    register_name: str
    cashier_name: str
    customer_name: str
    items: List[POSReceiptLineItem]
    subtotal_amount: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    total_paid: Decimal
    change_amount: Decimal
    payments: List[POSPaymentOut]
    discount_reason: Optional[str] = None
    coupon_code: Optional[str] = None
    points_earned: Optional[int] = 0
    points_balance: Optional[int] = None
    store_credit_balance: Optional[Decimal] = None
    membership_tier: Optional[str] = None
    receipt_header: Optional[str] = None
    receipt_footer: Optional[str] = None


class POSProductSearchOut(BaseModel):
    product_id: uuid.UUID
    variant_id: uuid.UUID
    title: str
    sku: str
    barcode: Optional[str] = None
    price: Decimal
    compare_at_price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    category_name: Optional[str] = None
    stock_qty: int
    image_url: Optional[str] = None


# --- POS Returns & Refunds Schemas ---
class POSReturnItemRequest(BaseModel):
    order_item_id: uuid.UUID
    quantity: int = Field(..., gt=0)
    restock: bool = True
    reason: Optional[str] = None


class POSOrderReturnRequest(BaseModel):
    session_id: uuid.UUID
    order_number: str
    items: List[POSReturnItemRequest]
    refund_method: str = Field(..., description="cash, card, or store_credit")
    refund_reason: Optional[str] = None
    customer_id: Optional[uuid.UUID] = None


class POSOrderLookupItem(BaseModel):
    item_id: uuid.UUID
    variant_id: uuid.UUID
    product_title: str
    sku: str
    barcode: Optional[str] = None
    unit_price: Decimal
    discount_amount: Decimal
    net_unit_price: Decimal
    quantity: int
    refunded_quantity: int
    returnable_quantity: int
    subtotal: Decimal


class POSOrderLookupResponse(BaseModel):
    order_id: uuid.UUID
    order_number: str
    created_at: datetime
    customer_name: str
    customer_id: Optional[uuid.UUID] = None
    total_amount: Decimal
    payment_status: str
    fulfillment_status: str
    items: List[POSOrderLookupItem]


class POSReturnItemReceipt(BaseModel):
    product_title: str
    sku: str
    returned_quantity: int
    unit_price: Decimal
    refund_subtotal: Decimal
    restocked: bool


class POSOrderReturnResponse(BaseModel):
    return_id: str
    order_id: uuid.UUID
    order_number: str
    created_at: datetime
    business_name: str
    register_name: str
    cashier_name: str
    customer_name: str
    refund_method: str
    refund_reason: Optional[str] = None
    total_refund_amount: Decimal
    items_returned: List[POSReturnItemReceipt]
    customer_store_credit_balance: Optional[Decimal] = None
    receipt_header: Optional[str] = None
    receipt_footer: Optional[str] = None

