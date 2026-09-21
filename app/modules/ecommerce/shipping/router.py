import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.database import get_db
from app.modules.ecommerce.shipping.schemas import (
    ShipmentCreate,
    ShipmentOut,
    ShippingRateQuoteRequest,
    ShippingRateQuoteResponse,
    ShippingZoneCreate,
    ShippingZoneOut,
    TrackingUpdate,
)
from app.modules.ecommerce.shipping.service import ShippingService

router = APIRouter(prefix="/shipping", tags=["Shipping"])
service = ShippingService()


@router.post(
    "/shipments", response_model=ShipmentOut, status_code=status.HTTP_201_CREATED
)
def create_shipment(
    data: ShipmentCreate,
    current_user: User = Depends(require_permission("ecommerce", "orders", "create")),
    db: Session = Depends(get_db),
):
    return service.create_shipment(db, data)


@router.get("/shipments", response_model=list[ShipmentOut])
def get_shipments(
    business_id: int = Query(1),
    current_user: User = Depends(require_permission("ecommerce", "orders", "view")),
    db: Session = Depends(get_db),
):
    return service.get_shipments(db, business_id=business_id)


@router.get("/shipments/{shipment_id}", response_model=ShipmentOut)
def get_shipment(
    shipment_id: uuid.UUID,
    business_id: int = Query(1),
    current_user: User = Depends(require_permission("ecommerce", "orders", "view")),
    db: Session = Depends(get_db),
):
    return service.get_shipment(db, shipment_id=shipment_id, business_id=business_id)


@router.put("/shipments/{shipment_id}/tracking", response_model=ShipmentOut)
def update_tracking(
    shipment_id: uuid.UUID,
    update: TrackingUpdate,
    business_id: int = Query(1),
    current_user: User = Depends(require_permission("ecommerce", "orders", "update")),
    db: Session = Depends(get_db),
):
    return service.update_tracking(
        db, shipment_id=shipment_id, update=update, business_id=business_id
    )


@router.post(
    "/zones", response_model=ShippingZoneOut, status_code=status.HTTP_201_CREATED
)
def create_shipping_zone(
    data: ShippingZoneCreate,
    current_user: User = Depends(require_permission("ecommerce", "orders", "create")),
    db: Session = Depends(get_db),
):
    return service.create_shipping_zone(db, data)


@router.get("/zones", response_model=list[ShippingZoneOut])
def get_shipping_zones(
    business_id: int = Query(1),
    current_user: User = Depends(require_permission("ecommerce", "orders", "view")),
    db: Session = Depends(get_db),
):
    return service.get_shipping_zones(db, business_id=business_id)


@router.post("/quote", response_model=ShippingRateQuoteResponse)
def quote_shipping_rate(
    req: ShippingRateQuoteRequest,
    current_user: User = Depends(require_permission("ecommerce", "orders", "view")),
    db: Session = Depends(get_db),
):
    return service.quote_shipping_rate(db, req)


@router.post("/calculate", response_model=ShippingRateQuoteResponse)
def calculate_shipping_rate(
    req: ShippingRateQuoteRequest,
    current_user: User = Depends(require_permission("ecommerce", "orders", "view")),
    db: Session = Depends(get_db),
):
    return service.quote_shipping_rate(db, req)


@router.post("/labels", response_model=ShipmentOut, status_code=status.HTTP_201_CREATED)
def generate_shipping_label(
    data: ShipmentCreate,
    current_user: User = Depends(require_permission("ecommerce", "orders", "create")),
    db: Session = Depends(get_db),
):
    return service.create_shipment(db, data)
