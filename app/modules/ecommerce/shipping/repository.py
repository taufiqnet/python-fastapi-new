import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.modules.ecommerce.shipping.models import (
    DeliveryServiceSetting,
    Shipment,
    ShipmentStatus,
    ShippingRate,
    ShippingZone,
)
from app.modules.ecommerce.shipping.schemas import (
    DeliveryServiceSettingCreate,
    DeliveryServiceSettingUpdate,
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

    def get_shipments(
        self, db: Session, business_id: int = 1
    ) -> list[Shipment]:
        return (
            db.query(Shipment)
            .filter(Shipment.business_id == business_id)
            .order_by(Shipment.created_at.desc())
            .all()
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

    def seed_default_delivery_settings_if_none(
        self, db: Session, business_id: int = 1
    ) -> list[DeliveryServiceSetting]:
        existing = (
            db.query(DeliveryServiceSetting)
            .filter(DeliveryServiceSetting.business_id == business_id)
            .all()
        )
        if existing:
            return existing

        defaults = [
            DeliveryServiceSetting(
                business_id=business_id,
                name="Inside Dhaka City",
                charge=Decimal("70.00"),
                region="Dhaka City",
                estimated_days="24-48 Hours",
                default_courier=None,
                is_active=True,
                is_default=True,
                sort_order=1,
            ),
            DeliveryServiceSetting(
                business_id=business_id,
                name="Outside Dhaka City",
                charge=Decimal("150.00"),
                region="Outside Dhaka / Nationwide",
                estimated_days="2-5 Days",
                default_courier=None,
                is_active=True,
                is_default=False,
                sort_order=2,
            ),
        ]
        db.add_all(defaults)
        db.commit()
        for d in defaults:
            db.refresh(d)
        return defaults

    def get_delivery_settings(
        self, db: Session, business_id: int = 1, active_only: bool = False
    ) -> list[DeliveryServiceSetting]:
        query = db.query(DeliveryServiceSetting).filter(
            DeliveryServiceSetting.business_id == business_id
        )
        if active_only:
            query = query.filter(DeliveryServiceSetting.is_active == True)
        results = query.order_by(
            DeliveryServiceSetting.sort_order.asc(),
            DeliveryServiceSetting.created_at.asc(),
        ).all()
        if not results and not active_only:
            return self.seed_default_delivery_settings_if_none(db, business_id=business_id)
        return results

    def get_delivery_setting_by_id(
        self, db: Session, setting_id: uuid.UUID, business_id: int = 1
    ) -> DeliveryServiceSetting | None:
        return (
            db.query(DeliveryServiceSetting)
            .filter(
                DeliveryServiceSetting.id == setting_id,
                DeliveryServiceSetting.business_id == business_id,
            )
            .first()
        )

    def create_delivery_setting(
        self, db: Session, data: DeliveryServiceSettingCreate
    ) -> DeliveryServiceSetting:
        if data.is_default:
            db.query(DeliveryServiceSetting).filter(
                DeliveryServiceSetting.business_id == data.business_id
            ).update({"is_default": False})

        setting = DeliveryServiceSetting(
            business_id=data.business_id,
            name=data.name,
            charge=Decimal(str(data.charge)),
            region=data.region,
            estimated_days=data.estimated_days,
            default_courier=data.default_courier,
            is_active=data.is_active,
            is_default=data.is_default,
            sort_order=data.sort_order,
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)
        return setting

    def update_delivery_setting(
        self, db: Session, setting: DeliveryServiceSetting, data: DeliveryServiceSettingUpdate
    ) -> DeliveryServiceSetting:
        update_dict = data.model_dump(exclude_unset=True)
        if update_dict.get("is_default") is True:
            db.query(DeliveryServiceSetting).filter(
                DeliveryServiceSetting.business_id == setting.business_id,
                DeliveryServiceSetting.id != setting.id,
            ).update({"is_default": False})

        if "charge" in update_dict and update_dict["charge"] is not None:
            update_dict["charge"] = Decimal(str(update_dict["charge"]))

        for k, v in update_dict.items():
            setattr(setting, k, v)

        db.commit()
        db.refresh(setting)
        return setting

    def delete_delivery_setting(
        self, db: Session, setting: DeliveryServiceSetting
    ) -> None:
        db.delete(setting)
        db.commit()

