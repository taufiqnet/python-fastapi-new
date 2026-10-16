import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field

from app.modules.ecommerce.procurement.models import PurchaseOrderStatus


# --- Supplier Schemas ---
class SupplierBase(BaseModel):
    name: str = Field(..., max_length=150)
    code: str = Field(..., max_length=50)
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = "Bangladesh"
    tax_id: Optional[str] = None
    payment_terms: Optional[str] = "Net 30"
    is_active: bool = True


class SupplierCreate(SupplierBase):
    business_id: Optional[int] = None


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    tax_id: Optional[str] = None
    payment_terms: Optional[str] = None
    is_active: Optional[bool] = None


class SupplierOut(SupplierBase):
    id: uuid.UUID
    business_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Purchase Order Item Schemas ---
class PurchaseOrderItemCreate(BaseModel):
    variant_id: uuid.UUID
    quantity_ordered: int = Field(..., gt=0)
    unit_cost: Decimal = Field(..., ge=0)
    tax_amount: Decimal = Field(default=Decimal("0.00"), ge=0)


class PurchaseOrderItemOut(BaseModel):
    id: uuid.UUID
    purchase_order_id: uuid.UUID
    variant_id: uuid.UUID
    item_id: Optional[uuid.UUID] = None
    product_title: Optional[str] = None
    sku: Optional[str] = None
    quantity_ordered: int
    quantity_received: int
    unit_cost: Decimal
    tax_amount: Decimal
    subtotal: Decimal

    class Config:
        from_attributes = True


# --- Purchase Order Schemas ---
class PurchaseOrderCreate(BaseModel):
    business_id: Optional[int] = None
    supplier_id: uuid.UUID
    destination_warehouse_id: uuid.UUID
    order_date: date = Field(default_factory=date.today)
    expected_delivery_date: Optional[date] = None
    currency: str = "USD"
    notes: Optional[str] = None
    shipping_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    items: List[PurchaseOrderItemCreate]


class PurchaseOrderUpdate(BaseModel):
    status: Optional[PurchaseOrderStatus] = None
    expected_delivery_date: Optional[date] = None
    notes: Optional[str] = None
    shipping_amount: Optional[Decimal] = None


class PurchaseOrderOut(BaseModel):
    id: uuid.UUID
    business_id: int
    po_number: str
    supplier_id: uuid.UUID
    supplier_name: Optional[str] = None
    destination_warehouse_id: uuid.UUID
    warehouse_name: Optional[str] = None
    status: PurchaseOrderStatus
    order_date: date
    expected_delivery_date: Optional[date] = None
    subtotal_amount: Decimal
    tax_amount: Decimal
    shipping_amount: Decimal
    total_amount: Decimal
    currency: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PurchaseOrderDetailOut(PurchaseOrderOut):
    items: List[PurchaseOrderItemOut]


# --- Goods Received Note (GRN) Schemas ---
class GRNItemReceive(BaseModel):
    po_item_id: uuid.UUID
    quantity_received: int = Field(..., gt=0)
    unit_cost: Optional[Decimal] = None
    lot_number: Optional[str] = None
    expiry_date: Optional[datetime] = None


class GRNCreateRequest(BaseModel):
    supplier_invoice_no: Optional[str] = None
    notes: Optional[str] = None
    items: List[GRNItemReceive]


class GRNItemOut(BaseModel):
    id: uuid.UUID
    po_item_id: uuid.UUID
    variant_id: uuid.UUID
    product_title: Optional[str] = None
    sku: Optional[str] = None
    quantity_received: int
    unit_cost: Decimal
    lot_number: Optional[str] = None
    expiry_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class GRNOut(BaseModel):
    id: uuid.UUID
    business_id: int
    grn_number: str
    purchase_order_id: uuid.UUID
    received_at: datetime
    supplier_invoice_no: Optional[str] = None
    notes: Optional[str] = None
    items: List[GRNItemOut]

    class Config:
        from_attributes = True
