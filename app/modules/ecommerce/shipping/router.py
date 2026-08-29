import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

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
def create_shipment(data: ShipmentCreate, db: Session = Depends(get_db)):
    return service.create_shipment(db, data)


@router.get("/shipments/{shipment_id}", response_model=ShipmentOut)
def get_shipment(
    shipment_id: uuid.UUID,
    business_id: int = Query(1),
    db: Session = Depends(get_db),
):
    return service.get_shipment(db, shipment_id=shipment_id, business_id=business_id)


@router.put("/shipments/{shipment_id}/tracking", response_model=ShipmentOut)
def update_tracking(
    shipment_id: uuid.UUID,
    update: TrackingUpdate,
    business_id: int = Query(1),
    db: Session = Depends(get_db),
):
    return service.update_tracking(
        db, shipment_id=shipment_id, update=update, business_id=business_id
    )


@router.post(
    "/zones", response_model=ShippingZoneOut, status_code=status.HTTP_201_CREATED
)
def create_shipping_zone(data: ShippingZoneCreate, db: Session = Depends(get_db)):
    return service.create_shipping_zone(db, data)


@router.get("/zones", response_model=list[ShippingZoneOut])
def get_shipping_zones(business_id: int = Query(1), db: Session = Depends(get_db)):
    return service.get_shipping_zones(db, business_id=business_id)


@router.post("/quote", response_model=ShippingRateQuoteResponse)
def quote_shipping_rate(req: ShippingRateQuoteRequest, db: Session = Depends(get_db)):
    return service.quote_shipping_rate(db, req)
