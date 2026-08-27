import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.shipping.repository import ShippingRepository
from app.modules.shipping.schemas import (
    ShipmentCreate,
    ShipmentOut,
    ShippingRateQuoteRequest,
    ShippingRateQuoteResponse,
    ShippingZoneCreate,
    ShippingZoneOut,
    TrackingUpdate,
)


class ShippingService:
    def __init__(self, repository: ShippingRepository | None = None):
        self.repository = repository or ShippingRepository()

    def create_shipment(self, db: Session, data: ShipmentCreate) -> ShipmentOut:
        shipment = self.repository.create_shipment(db, data)
        return ShipmentOut.model_validate(shipment)

    def get_shipment(
        self, db: Session, shipment_id: uuid.UUID, business_id: int = 1
    ) -> ShipmentOut:
        shipment = self.repository.get_shipment_by_id(
            db, shipment_id, business_id=business_id
        )
        if not shipment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found"
            )
        return ShipmentOut.model_validate(shipment)

    def update_tracking(
        self,
        db: Session,
        shipment_id: uuid.UUID,
        update: TrackingUpdate,
        business_id: int = 1,
    ) -> ShipmentOut:
        shipment = self.repository.get_shipment_by_id(
            db, shipment_id, business_id=business_id
        )
        if not shipment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found"
            )
        updated = self.repository.update_tracking(db, shipment, update)
        return ShipmentOut.model_validate(updated)

    def create_shipping_zone(
        self, db: Session, data: ShippingZoneCreate
    ) -> ShippingZoneOut:
        zone = self.repository.create_shipping_zone(db, data)
        return ShippingZoneOut.model_validate(zone)

    def get_shipping_zones(
        self, db: Session, business_id: int = 1
    ) -> list[ShippingZoneOut]:
        zones = self.repository.get_shipping_zones(db, business_id=business_id)
        return [ShippingZoneOut.model_validate(z) for z in zones]

    def quote_shipping_rate(
        self, db: Session, req: ShippingRateQuoteRequest
    ) -> ShippingRateQuoteResponse:
        zones = self.repository.get_shipping_zones(db, business_id=req.business_id)
        matched_cost = 10.00  # Default flat rate fallback

        for zone in zones:
            if zone.region.lower() == req.region.lower():
                for rate in zone.rates:
                    min_w = float(rate.min_weight)
                    max_w = float(rate.max_weight)
                    if min_w <= req.weight <= max_w:
                        matched_cost = float(rate.base_cost)
                        break

        return ShippingRateQuoteResponse(
            carrier="Standard Express", base_cost=matched_cost
        )
