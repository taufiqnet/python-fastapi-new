import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from datetime import datetime, timedelta, timezone

from app.modules.ecommerce.inventory.models import (
    CostLayer,
    CountStatus,
    InventoryItem,
    Item,
    SerialStatus,
    StockCount,
    StockCountLine,
    StockLot,
    StockMovement,
    StockMovementReason,
    StockReservation,
    StockSerial,
    StockTransfer,
    StockTransferLine,
    TransferStatus,
    UoMConversion,
    UnitOfMeasure,
    Warehouse,
)
from app.modules.ecommerce.inventory.schemas import (
    StockCountCreate,
    StockTransferCreate,
)
from app.modules.ecommerce.inventory.schemas import (
    InventoryItemCreate,
    InventoryItemUpdate,
    ItemCreate,
    ItemUpdate,
    StockAdjustmentRequest,
    StockReservationCreate,
    StockReservationUpdate,
    UoMConversionCreate,
    UoMConversionUpdate,
    UoMCreate,
    UoMUpdate,
    WarehouseCreate,
    WarehouseUpdate,
)


class InventoryRepository:
    # --- Stock Count Operations ---
    def upsert_count_line(
        self,
        db: Session,
        count_id: uuid.UUID,
        item_id: uuid.UUID,
        system_quantity: int,
        counted_quantity: int,
        variance: int,
    ) -> StockCountLine:
        c_line = (
            db.query(StockCountLine)
            .filter(StockCountLine.count_id == count_id, StockCountLine.item_id == item_id)
            .first()
        )
        if not c_line:
            c_line = StockCountLine(
                count_id=count_id,
                item_id=item_id,
                system_quantity=system_quantity,
                counted_quantity=counted_quantity,
                variance=variance,
                recount_flag=(variance != 0),
            )
            db.add(c_line)
        else:
            c_line.system_quantity = system_quantity
            c_line.counted_quantity = counted_quantity
            c_line.variance = variance
            c_line.recount_flag = (variance != 0)
        db.commit()
        db.refresh(c_line)
        return c_line

    def get_count_by_id(
        self, db: Session, count_id: uuid.UUID, business_id: int | None = None
    ) -> StockCount | None:
        query = db.query(StockCount).filter(StockCount.id == count_id)
        if business_id is not None:
            query = query.filter(StockCount.business_id == business_id)
        return query.first()

    def get_counts(
        self,
        db: Session,
        business_id: int,
        warehouse_id: uuid.UUID | None = None,
        status_filter: CountStatus | None = None,
        status: CountStatus | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[StockCount]:
        query = db.query(StockCount).filter(StockCount.business_id == business_id)
        if warehouse_id:
            query = query.filter(StockCount.warehouse_id == warehouse_id)
        st = status_filter or status
        if st:
            query = query.filter(StockCount.status == st)
        return query.order_by(StockCount.created_at.desc()).offset(skip).limit(limit).all()

    def create_count(self, db: Session, data: StockCountCreate) -> StockCount:
        count = StockCount(
            business_id=data.business_id,
            warehouse_id=data.warehouse_id,
            scheduled_date=data.scheduled_date,
            counted_by=data.counted_by,
            status=CountStatus.DRAFT,
        )
        db.add(count)
        db.flush()

        # Create count lines for specified item_ids or all warehouse items
        if data.item_ids:
            items_to_count = data.item_ids
        else:
            inv_items = (
                db.query(InventoryItem)
                .filter(InventoryItem.warehouse_id == data.warehouse_id)
                .all()
            )
            items_to_count = [i.item_id for i in inv_items if i.item_id]

        for i_id in items_to_count:
            inv_row = self.get_inventory_item_by_item_and_warehouse(db, i_id, data.warehouse_id)
            sys_qty = inv_row.quantity_on_hand if inv_row else 0
            c_line = StockCountLine(
                count_id=count.id,
                item_id=i_id,
                system_quantity=sys_qty,
            )
            db.add(c_line)

        db.commit()
        db.refresh(count)
        return count

    # --- Stock Transfer Operations ---
    def get_transfer_by_id(
        self, db: Session, transfer_id: uuid.UUID, business_id: int | None = None
    ) -> StockTransfer | None:
        query = db.query(StockTransfer).filter(StockTransfer.id == transfer_id)
        if business_id is not None:
            query = query.filter(StockTransfer.business_id == business_id)
        return query.first()

    def get_transfer_by_number(
        self, db: Session, business_id: int, transfer_number: str
    ) -> StockTransfer | None:
        return (
            db.query(StockTransfer)
            .filter(
                StockTransfer.business_id == business_id,
                StockTransfer.transfer_number == transfer_number,
            )
            .first()
        )

    def get_transfers(
        self,
        db: Session,
        business_id: int,
        status_filter: TransferStatus | None = None,
        status: TransferStatus | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[StockTransfer]:
        query = db.query(StockTransfer).filter(StockTransfer.business_id == business_id)
        st = status_filter or status
        if st:
            query = query.filter(StockTransfer.status == st)
        return query.order_by(StockTransfer.created_at.desc()).offset(skip).limit(limit).all()

    def create_transfer(self, db: Session, data: StockTransferCreate) -> StockTransfer:
        transfer = StockTransfer(
            business_id=data.business_id,
            transfer_number=data.transfer_number,
            source_warehouse_id=data.source_warehouse_id,
            destination_warehouse_id=data.destination_warehouse_id,
            notes=data.notes,
            status=TransferStatus.DRAFT,
        )
        db.add(transfer)
        db.flush()

        for line in data.lines:
            t_line = StockTransferLine(
                transfer_id=transfer.id,
                item_id=line.item_id,
                quantity=line.quantity,
                uom_id=line.uom_id,
                lot_number=line.lot_number,
                serial_number=line.serial_number,
            )
            db.add(t_line)

        db.commit()
        db.refresh(transfer)
        return transfer

    # --- Cost Layer Operations ---
    def create_cost_layer(
        self,
        db: Session,
        business_id: int,
        item_id: uuid.UUID,
        warehouse_id: uuid.UUID,
        quantity: int,
        unit_cost: Decimal,
        received_at: datetime,
        source_type: str | None = None,
        source_id: str | None = None,
    ) -> CostLayer:
        layer = CostLayer(
            business_id=business_id,
            item_id=item_id,
            warehouse_id=warehouse_id,
            received_at=received_at,
            quantity_remaining=quantity,
            unit_cost=unit_cost,
            source_type=source_type,
            source_id=source_id,
        )
        db.add(layer)
        db.commit()
        db.refresh(layer)
        return layer

    def get_available_cost_layers(
        self,
        db: Session,
        business_id: int,
        item_id: uuid.UUID,
        warehouse_id: uuid.UUID | None = None,
        as_of: datetime | None = None,
    ) -> list[CostLayer]:
        query = db.query(CostLayer).filter(
            CostLayer.business_id == business_id,
            CostLayer.item_id == item_id,
            CostLayer.quantity_remaining > 0,
        )
        if warehouse_id:
            query = query.filter(CostLayer.warehouse_id == warehouse_id)
        if as_of:
            query = query.filter(CostLayer.received_at <= as_of)

        return query.order_by(CostLayer.received_at.asc()).all()

    # --- Lot & Serial Operations ---
    def get_expiring_lots(
        self, db: Session, business_id: int, days: int = 30
    ) -> list[StockLot]:
        now = datetime.now(timezone.utc)
        cutoff = now + timedelta(days=days)
        return (
            db.query(StockLot)
            .filter(
                StockLot.business_id == business_id,
                StockLot.quantity > 0,
                StockLot.expiry_date.isnot(None),
                StockLot.expiry_date <= cutoff,
            )
            .order_by(StockLot.expiry_date.asc())
            .all()
        )

    def get_lot_by_number(
        self, db: Session, business_id: int, item_id: uuid.UUID, warehouse_id: uuid.UUID, lot_number: str
    ) -> StockLot | None:
        return (
            db.query(StockLot)
            .filter(
                StockLot.business_id == business_id,
                StockLot.item_id == item_id,
                StockLot.warehouse_id == warehouse_id,
                StockLot.lot_number == lot_number,
            )
            .first()
        )

    def get_available_lots_fefo(
        self, db: Session, business_id: int, item_id: uuid.UUID, warehouse_id: uuid.UUID
    ) -> list[StockLot]:
        return (
            db.query(StockLot)
            .filter(
                StockLot.business_id == business_id,
                StockLot.item_id == item_id,
                StockLot.warehouse_id == warehouse_id,
                StockLot.quantity > 0,
            )
            .order_by(StockLot.expiry_date.asc().nulls_last(), StockLot.created_at.asc())
            .all()
        )

    def get_serial_by_number(
        self, db: Session, business_id: int, item_id: uuid.UUID, serial_number: str
    ) -> StockSerial | None:
        return (
            db.query(StockSerial)
            .filter(
                StockSerial.business_id == business_id,
                StockSerial.item_id == item_id,
                StockSerial.serial_number == serial_number,
            )
            .first()
        )

    # --- Unit of Measure Operations ---
    def get_uom_by_id(
        self, db: Session, uom_id: uuid.UUID, business_id: int | None = None
    ) -> UnitOfMeasure | None:
        query = db.query(UnitOfMeasure).filter(UnitOfMeasure.id == uom_id)
        if business_id is not None:
            query = query.filter(UnitOfMeasure.business_id == business_id)
        return query.first()

    def get_uom_by_code(self, db: Session, business_id: int, code: str) -> UnitOfMeasure | None:
        return (
            db.query(UnitOfMeasure)
            .filter(UnitOfMeasure.business_id == business_id, UnitOfMeasure.code == code)
            .first()
        )

    def get_uoms(
        self,
        db: Session,
        business_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> list[UnitOfMeasure]:
        return (
            db.query(UnitOfMeasure)
            .filter(UnitOfMeasure.business_id == business_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def create_uom(self, db: Session, data: UoMCreate) -> UnitOfMeasure:
        uom = UnitOfMeasure(**data.model_dump())
        db.add(uom)
        db.commit()
        db.refresh(uom)
        return uom

    def update_uom(self, db: Session, uom: UnitOfMeasure, data: UoMUpdate) -> UnitOfMeasure:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(uom, field, value)
        db.commit()
        db.refresh(uom)
        return uom

    def delete_uom(self, db: Session, uom: UnitOfMeasure) -> None:
        db.delete(uom)
        db.commit()

    # --- UoM Conversion Operations ---
    def get_conversion_by_id(
        self, db: Session, conversion_id: uuid.UUID, business_id: int | None = None
    ) -> UoMConversion | None:
        query = db.query(UoMConversion).filter(UoMConversion.id == conversion_id)
        if business_id is not None:
            query = query.filter(UoMConversion.business_id == business_id)
        return query.first()

    def get_conversions_for_business(
        self,
        db: Session,
        business_id: int,
        item_id: uuid.UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[UoMConversion]:
        query = db.query(UoMConversion).filter(UoMConversion.business_id == business_id)
        if item_id is not None:
            query = query.filter(
                (UoMConversion.item_id == item_id) | (UoMConversion.item_id.is_(None))
            )
        return query.offset(skip).limit(limit).all()

    def get_all_conversions_for_business(
        self, db: Session, business_id: int
    ) -> list[UoMConversion]:
        return db.query(UoMConversion).filter(UoMConversion.business_id == business_id).all()

    def create_conversion(self, db: Session, data: UoMConversionCreate) -> UoMConversion:
        conversion = UoMConversion(**data.model_dump())
        db.add(conversion)
        db.commit()
        db.refresh(conversion)
        return conversion

    def update_conversion(
        self, db: Session, conversion: UoMConversion, data: UoMConversionUpdate
    ) -> UoMConversion:
        conversion.factor = data.factor
        db.commit()
        db.refresh(conversion)
        return conversion

    def delete_conversion(self, db: Session, conversion: UoMConversion) -> None:
        db.delete(conversion)
        db.commit()

    # --- Item Master Operations ---
    def get_item_by_id(
        self, db: Session, item_id: uuid.UUID, business_id: int | None = None
    ) -> Item | None:
        query = db.query(Item).filter(Item.id == item_id)
        if business_id is not None:
            query = query.filter(Item.business_id == business_id)
        return query.first()

    def get_item_by_sku(self, db: Session, business_id: int, sku: str) -> Item | None:
        return (
            db.query(Item)
            .filter(Item.business_id == business_id, Item.sku == sku)
            .first()
        )

    def get_items(
        self,
        db: Session,
        business_id: int,
        skip: int = 0,
        limit: int = 100,
        category_id: uuid.UUID | None = None,
        is_active: bool | None = None,
    ) -> list[Item]:
        query = db.query(Item).filter(Item.business_id == business_id)
        if category_id is not None:
            query = query.filter(Item.category_id == category_id)
        if is_active is not None:
            query = query.filter(Item.is_active == is_active)
        return query.offset(skip).limit(limit).all()

    def create_item(self, db: Session, data: ItemCreate) -> Item:
        item = Item(**data.model_dump())
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    def update_item(self, db: Session, item: Item, data: ItemUpdate) -> Item:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(item, field, value)
        db.commit()
        db.refresh(item)
        return item

    def delete_item(self, db: Session, item: Item) -> None:
        db.delete(item)
        db.commit()

    # --- Warehouse Operations ---
    def get_warehouse_by_id(
        self, db: Session, warehouse_id: uuid.UUID
    ) -> Warehouse | None:
        return db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()

    def get_warehouse_by_code(self, db: Session, code: str) -> Warehouse | None:
        return db.query(Warehouse).filter(Warehouse.code == code).first()

    def get_warehouses(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        is_active: bool | None = None,
    ) -> list[Warehouse]:
        query = db.query(Warehouse)
        if business_id is not None:
            query = query.filter(Warehouse.business_id == business_id)
        if is_active is not None:
            query = query.filter(Warehouse.is_active == is_active)
        return query.offset(skip).limit(limit).all()

    def create_warehouse(self, db: Session, data: WarehouseCreate) -> Warehouse:
        dump_data = data.model_dump(exclude={"address"})
        warehouse = Warehouse(**dump_data)
        db.add(warehouse)
        db.commit()
        db.refresh(warehouse)
        return warehouse

    def update_warehouse(
        self, db: Session, warehouse: Warehouse, data: WarehouseUpdate
    ) -> Warehouse:
        update_data = data.model_dump(exclude_unset=True, exclude={"address"})
        for field, value in update_data.items():
            setattr(warehouse, field, value)
        db.commit()
        db.refresh(warehouse)
        return warehouse

    def delete_warehouse(self, db: Session, warehouse: Warehouse) -> None:
        db.delete(warehouse)
        db.commit()

    # --- Inventory Item Operations ---
    def get_inventory_item_by_id(
        self, db: Session, item_id: uuid.UUID
    ) -> InventoryItem | None:
        return db.query(InventoryItem).filter(InventoryItem.id == item_id).first()

    def get_inventory_item_by_variant_and_warehouse(
        self, db: Session, variant_id: uuid.UUID, warehouse_id: uuid.UUID
    ) -> InventoryItem | None:
        return (
            db.query(InventoryItem)
            .filter(
                InventoryItem.variant_id == variant_id,
                InventoryItem.warehouse_id == warehouse_id,
            )
            .first()
        )

    def get_inventory_item_by_item_and_warehouse(
        self, db: Session, item_id: uuid.UUID, warehouse_id: uuid.UUID
    ) -> InventoryItem | None:
        return (
            db.query(InventoryItem)
            .filter(
                InventoryItem.item_id == item_id,
                InventoryItem.warehouse_id == warehouse_id,
            )
            .first()
        )

    def get_inventory_items_for_business(
        self,
        db: Session,
        business_id: int,
        warehouse_id: uuid.UUID | None = None,
    ) -> list[InventoryItem]:
        query = (
            db.query(InventoryItem)
            .join(Warehouse, InventoryItem.warehouse_id == Warehouse.id)
            .filter(Warehouse.business_id == business_id)
        )
        if warehouse_id:
            query = query.filter(InventoryItem.warehouse_id == warehouse_id)
        return query.all()

    def get_inventory_items(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        variant_id: uuid.UUID | None = None,
        item_id: uuid.UUID | None = None,
        warehouse_id: uuid.UUID | None = None,
    ) -> list[InventoryItem]:
        query = db.query(InventoryItem)
        if variant_id is not None:
            query = query.filter(InventoryItem.variant_id == variant_id)
        if item_id is not None:
            query = query.filter(InventoryItem.item_id == item_id)
        if warehouse_id is not None:
            query = query.filter(InventoryItem.warehouse_id == warehouse_id)
        return query.offset(skip).limit(limit).all()

    def create_inventory_item(
        self, db: Session, data: InventoryItemCreate
    ) -> InventoryItem:
        item = InventoryItem(**data.model_dump())
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    def update_inventory_item(
        self, db: Session, item: InventoryItem, data: InventoryItemUpdate
    ) -> InventoryItem:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(item, field, value)
        db.commit()
        db.refresh(item)
        return item

    def adjust_stock(
        self, db: Session, item: InventoryItem, data: StockAdjustmentRequest
    ) -> tuple[InventoryItem, StockMovement]:
        item.quantity_on_hand += data.delta
        if item.quantity_on_hand < 0:
            item.quantity_on_hand = 0

        item.version_id += 1

        movement = StockMovement(
            inventory_item_id=item.id,
            delta=data.delta,
            uom_id=data.uom_id,
            reason=data.reason,
            reference_id=data.reference_id,
            notes=data.notes,
            actor_id=data.actor_id,
            actor_type=data.actor_type,
            unit_cost=data.unit_cost,
            idempotency_key=data.idempotency_key,
            batch_number=data.batch_number,
            expiry_date=data.expiry_date,
            source_type=getattr(data, "source_type", None),
            source_id=getattr(data, "source_id", None),
        )
        db.add(movement)
        db.commit()
        db.refresh(item)
        db.refresh(movement)
        return item, movement

    def get_stock_movements(
        self,
        db: Session,
        inventory_item_id: uuid.UUID | None = None,
        item_id: uuid.UUID | None = None,
        variant_id: uuid.UUID | None = None,
        warehouse_id: uuid.UUID | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        reason: StockMovementReason | None = None,
        source_type: str | None = None,
        source_id: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[StockMovement]:
        query = db.query(StockMovement)
        if inventory_item_id or item_id or variant_id or warehouse_id:
            query = query.join(InventoryItem, StockMovement.inventory_item_id == InventoryItem.id)
            if inventory_item_id:
                query = query.filter(StockMovement.inventory_item_id == inventory_item_id)
            if item_id:
                query = query.filter(InventoryItem.item_id == item_id)
            if variant_id:
                query = query.filter(InventoryItem.variant_id == variant_id)
            if warehouse_id:
                query = query.filter(InventoryItem.warehouse_id == warehouse_id)

        if start_date:
            query = query.filter(StockMovement.created_at >= start_date)
        if end_date:
            query = query.filter(StockMovement.created_at <= end_date)
        if reason:
            query = query.filter(StockMovement.reason == reason)
        if source_type:
            query = query.filter(StockMovement.source_type == source_type)
        if source_id:
            query = query.filter(StockMovement.source_id == source_id)

        return (
            query.order_by(StockMovement.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    # --- Stock Reservation Operations ---
    def get_reservation_by_id(
        self, db: Session, reservation_id: uuid.UUID
    ) -> StockReservation | None:
        return (
            db.query(StockReservation)
            .filter(StockReservation.id == reservation_id)
            .first()
        )

    def create_reservation(
        self, db: Session, data: StockReservationCreate
    ) -> StockReservation:
        reservation = StockReservation(**data.model_dump())
        db.add(reservation)
        db.commit()
        db.refresh(reservation)
        return reservation

    def update_reservation(
        self, db: Session, reservation: StockReservation, data: StockReservationUpdate
    ) -> StockReservation:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(reservation, field, value)
        db.commit()
        db.refresh(reservation)
        return reservation

    def get_reservations(
        self,
        db: Session,
        inventory_item_id: uuid.UUID | None = None,
        cart_id: uuid.UUID | None = None,
        order_id: uuid.UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[StockReservation]:
        query = db.query(StockReservation)
        if inventory_item_id is not None:
            query = query.filter(
                StockReservation.inventory_item_id == inventory_item_id
            )
        if cart_id is not None:
            query = query.filter(StockReservation.cart_id == cart_id)
        if order_id is not None:
            query = query.filter(StockReservation.order_id == order_id)
        return (
            query.order_by(StockReservation.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
