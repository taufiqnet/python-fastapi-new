import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.modules.ecommerce.shipping.models import (
    Shipment,
    ShipmentStatus,
    ShippingRate,
    ShippingZone,
)
from app.modules.ecommerce.shipping.schemas import (
    ShipmentCreate,
    ShippingZoneCreate,
    TrackingUpdate,
)


class ShippingRepository:
    def create_shipment(self, db: Session, data: ShipmentCreate) -> Shipment:
        shipment = Shipment(
            business_id=data.business_id,
            order_id=data.order_id,
            carrier=data.carrier,
            tracking_number=data.tracking_number,
            status=ShipmentStatus.LABEL_CREATED
            if data.tracking_number
            else ShipmentStatus.PENDING,
        )
        db.add(shipment)
        db.commit()
        db.refresh(shipment)
        return shipment

    def get_shipment_by_id(
        self, db: Session, shipment_id: uuid.UUID, business_id: int = 1
    ) -> Shipment | None:
        return (
            db.query(Shipment)
            .filter(Shipment.id == shipment_id, Shipment.business_id == business_id)
            .first()
        )

    def update_tracking(
        self, db: Session, shipment: Shipment, update: TrackingUpdate
    ) -> Shipment:
        shipment.status = update.status
        if update.tracking_number:
            shipment.tracking_number = update.tracking_number
        if update.status == ShipmentStatus.SHIPPED and not shipment.shipped_at:
            shipment.shipped_at = datetime.now(timezone.utc)
        elif update.status == ShipmentStatus.DELIVERED and not shipment.delivered_at:
            shipment.delivered_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(shipment)
        return shipment

    def create_shipping_zone(
        self, db: Session, data: ShippingZoneCreate
    ) -> ShippingZone:
        zone = ShippingZone(
            business_id=data.business_id,
            name=data.name,
            region=data.region,
        )
        db.add(zone)
        db.flush()

        for rate_data in data.rates:
            rate = ShippingRate(
                zone_id=zone.id,
                min_weight=Decimal(str(rate_data.min_weight)),
                max_weight=Decimal(str(rate_data.max_weight)),
                base_cost=Decimal(str(rate_data.base_cost)),
            )
            db.add(rate)

        db.commit()
        db.refresh(zone)
        return zone

    def get_shipping_zones(
        self, db: Session, business_id: int = 1
    ) -> list[ShippingZone]:
        return (
            db.query(ShippingZone).filter(ShippingZone.business_id == business_id).all()
        )
