import uuid
from collections import deque
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from datetime import datetime

from datetime import datetime, timezone

from app.modules.ecommerce.inventory.models import (
    CostLayer,
    CostingMethod,
    CountStatus,
    InventoryItem,
    Item,
    SerialStatus,
    StockCount,
    StockLot,
    StockMovement,
    StockMovementReason,
    StockSerial,
    StockTransfer,
    TransferStatus,
    TrackingType,
    UoMConversion,
    UnitOfMeasure,
    Warehouse,
)
from app.modules.ecommerce.inventory.schemas import (
    InventoryValuationReportOut,
    ItemValuationOut,
    ReorderAlertOut,
    StockCountCreate,
    StockCountOut,
    StockCountRecordRequest,
    StockLotOut,
    StockSerialOut,
    StockTransferCreate,
    StockTransferOut,
    StockTransferReceiveRequest,
)
from app.modules.ecommerce.notifications.service import NotificationService
from app.modules.ecommerce.inventory.repository import InventoryRepository
from sqlalchemy.orm.exc import StaleDataError

from app.modules.ecommerce.inventory.schemas import (
    InventoryItemCreate,
    InventoryItemUpdate,
    InventoryOut,
    ItemCreate,
    ItemOut,
    ItemUpdate,
    StockAdjustmentRequest,
    StockAvailabilityOut,
    StockReservationCreate,
    StockReservationOut,
    StockReservationUpdate,
    UoMConversionCreate,
    UoMConversionOut,
    UoMConversionUpdate,
    UoMConvertRequest,
    UoMConvertResponse,
    UoMCreate,
    UoMOut,
    UoMUpdate,
    VariantStockAggregationOut,
    WarehouseCreate,
    WarehouseUpdate,
)


class InventoryService:
    def __init__(self, repository: InventoryRepository | None = None):
        self.repository = repository or InventoryRepository()

    # --- Unit of Measure & Conversion Services ---
    def get_uoms(
        self,
        db: Session,
        business_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> list[UnitOfMeasure]:
        return self.repository.get_uoms(db, business_id=business_id, skip=skip, limit=limit)

    def get_uom(
        self, db: Session, uom_id: uuid.UUID, business_id: int | None = None
    ) -> UnitOfMeasure:
        uom = self.repository.get_uom_by_id(db, uom_id, business_id=business_id)
        if not uom:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Unit of measure not found",
            )
        return uom

    def create_uom(self, db: Session, data: UoMCreate) -> UnitOfMeasure:
        if self.repository.get_uom_by_code(db, data.business_id, data.code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unit of measure code '{data.code}' already exists for this business",
            )
        return self.repository.create_uom(db, data)

    def update_uom(
        self,
        db: Session,
        uom_id: uuid.UUID,
        data: UoMUpdate,
        business_id: int | None = None,
    ) -> UnitOfMeasure:
        uom = self.get_uom(db, uom_id, business_id=business_id)
        return self.repository.update_uom(db, uom, data)

    def delete_uom(
        self, db: Session, uom_id: uuid.UUID, business_id: int | None = None
    ) -> None:
        uom = self.get_uom(db, uom_id, business_id=business_id)
        self.repository.delete_uom(db, uom)

    def get_conversions(
        self,
        db: Session,
        business_id: int,
        item_id: uuid.UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[UoMConversion]:
        return self.repository.get_conversions_for_business(
            db, business_id=business_id, item_id=item_id, skip=skip, limit=limit
        )

    def create_conversion(
        self, db: Session, data: UoMConversionCreate
    ) -> UoMConversion:
        self.get_uom(db, data.from_uom_id, business_id=data.business_id)
        self.get_uom(db, data.to_uom_id, business_id=data.business_id)
        if data.from_uom_id == data.to_uom_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="from_uom_id and to_uom_id cannot be the same",
            )
        return self.repository.create_conversion(db, data)

    def update_conversion(
        self,
        db: Session,
        conversion_id: uuid.UUID,
        data: UoMConversionUpdate,
        business_id: int | None = None,
    ) -> UoMConversion:
        conversion = self.repository.get_conversion_by_id(
            db, conversion_id, business_id=business_id
        )
        if not conversion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="UoM conversion not found",
            )
        return self.repository.update_conversion(db, conversion, data)

    def delete_conversion(
        self, db: Session, conversion_id: uuid.UUID, business_id: int | None = None
    ) -> None:
        conversion = self.repository.get_conversion_by_id(
            db, conversion_id, business_id=business_id
        )
        if not conversion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="UoM conversion not found",
            )
        self.repository.delete_conversion(db, conversion)

    def get_conversion_factor(
        self,
        db: Session,
        business_id: int,
        from_uom_id: uuid.UUID,
        to_uom_id: uuid.UUID,
        item_id: uuid.UUID | None = None,
    ) -> Decimal:
        if from_uom_id == to_uom_id:
            return Decimal("1.0")

        all_convs = self.repository.get_all_conversions_for_business(db, business_id)

        # Build graph edges. Item-specific conversions take precedence.
        # Graph node: uom_id -> list of (neighbor_uom_id, factor)
        adj: dict[uuid.UUID, list[tuple[uuid.UUID, Decimal]]] = {}

        # First collect item-specific vs global rules
        item_specific_edges: set[tuple[uuid.UUID, uuid.UUID]] = set()
        for c in all_convs:
            if item_id and c.item_id == item_id:
                item_specific_edges.add((c.from_uom_id, c.to_uom_id))

        for c in all_convs:
            # Skip conversions for other items
            if c.item_id is not None and item_id is not None and c.item_id != item_id:
                continue
            if c.item_id is not None and item_id is None:
                continue

            # If a global rule exists but an item-specific rule exists for the same edge, skip global
            if c.item_id is None and (c.from_uom_id, c.to_uom_id) in item_specific_edges:
                continue

            # Forward edge
            adj.setdefault(c.from_uom_id, []).append((c.to_uom_id, Decimal(str(c.factor))))
            # Reverse edge (factor is 1 / factor)
            inv_factor = Decimal("1.0") / Decimal(str(c.factor))
            adj.setdefault(c.to_uom_id, []).append((c.from_uom_id, inv_factor))

        # BFS pathfinding
        queue = deque([(from_uom_id, Decimal("1.0"))])
        visited = {from_uom_id}

        while queue:
            curr_node, curr_factor = queue.popleft()
            if curr_node == to_uom_id:
                return curr_factor

            for neighbor, edge_factor in adj.get(curr_node, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, curr_factor * edge_factor))

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No valid conversion path found between specified units of measure",
        )

    def convert_quantity(
        self, db: Session, req: UoMConvertRequest
    ) -> UoMConvertResponse:
        factor = self.get_conversion_factor(
            db,
            business_id=req.business_id,
            from_uom_id=req.from_uom_id,
            to_uom_id=req.to_uom_id,
            item_id=req.item_id,
        )
        converted = Decimal(str(req.quantity)) * factor
        return UoMConvertResponse(
            from_uom_id=req.from_uom_id,
            to_uom_id=req.to_uom_id,
            original_quantity=req.quantity,
            converted_quantity=converted,
            conversion_factor=factor,
        )

    # --- Item Master Services ---
    def get_items(
        self,
        db: Session,
        business_id: int,
        skip: int = 0,
        limit: int = 100,
        category_id: uuid.UUID | None = None,
        is_active: bool | None = None,
    ) -> list[Item]:
        return self.repository.get_items(
            db,
            business_id=business_id,
            skip=skip,
            limit=limit,
            category_id=category_id,
            is_active=is_active,
        )

    def get_item(
        self, db: Session, item_id: uuid.UUID, business_id: int | None = None
    ) -> Item:
        item = self.repository.get_item_by_id(db, item_id, business_id=business_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found",
            )
        return item

    def create_item(self, db: Session, data: ItemCreate) -> Item:
        if self.repository.get_item_by_sku(db, data.business_id, data.sku):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item with SKU '{data.sku}' already exists for this business",
            )
        return self.repository.create_item(db, data)

    def update_item(
        self,
        db: Session,
        item_id: uuid.UUID,
        data: ItemUpdate,
        business_id: int | None = None,
    ) -> Item:
        item = self.get_item(db, item_id, business_id=business_id)
        return self.repository.update_item(db, item, data)

    def delete_item(
        self, db: Session, item_id: uuid.UUID, business_id: int | None = None
    ) -> None:
        item = self.get_item(db, item_id, business_id=business_id)
        self.repository.delete_item(db, item)

    # --- Warehouse Services ---
    def get_warehouses(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        is_active: bool | None = None,
    ) -> list[Warehouse]:
        return self.repository.get_warehouses(
            db, skip=skip, limit=limit, business_id=business_id, is_active=is_active
        )

    def get_warehouse(self, db: Session, warehouse_id: uuid.UUID) -> Warehouse:
        warehouse = self.repository.get_warehouse_by_id(db, warehouse_id)
        if not warehouse:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Warehouse not found",
            )
        return warehouse

    def create_warehouse(self, db: Session, data: WarehouseCreate) -> Warehouse:
        if self.repository.get_warehouse_by_code(db, data.code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Warehouse with code '{data.code}' already exists",
            )
        return self.repository.create_warehouse(db, data)

    def update_warehouse(
        self, db: Session, warehouse_id: uuid.UUID, data: WarehouseUpdate
    ) -> Warehouse:
        warehouse = self.get_warehouse(db, warehouse_id)
        if data.code is not None and data.code != warehouse.code:
            existing = self.repository.get_warehouse_by_code(db, data.code)
            if existing and existing.id != warehouse_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Warehouse with code '{data.code}' already exists",
                )
        return self.repository.update_warehouse(db, warehouse, data)

    def delete_warehouse(self, db: Session, warehouse_id: uuid.UUID) -> None:
        warehouse = self.get_warehouse(db, warehouse_id)
        self.repository.delete_warehouse(db, warehouse)

    # --- Inventory Item Services ---
    def get_inventory_items(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        variant_id: uuid.UUID | None = None,
        item_id: uuid.UUID | None = None,
        warehouse_id: uuid.UUID | None = None,
    ) -> list[InventoryOut]:
        items = self.repository.get_inventory_items(
            db,
            skip=skip,
            limit=limit,
            variant_id=variant_id,
            item_id=item_id,
            warehouse_id=warehouse_id,
        )
        return [self._to_inventory_out(item) for item in items]

    def get_inventory_item(self, db: Session, item_id: uuid.UUID) -> InventoryOut:
        item = self.repository.get_inventory_item_by_id(db, item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found",
            )
        return self._to_inventory_out(item)

    def get_stock_availability(
        self,
        db: Session,
        business_id: int | None = None,
        item_id: uuid.UUID | None = None,
        variant_id: uuid.UUID | None = None,
        warehouse_id: uuid.UUID | None = None,
    ) -> StockAvailabilityOut:
        query = db.query(InventoryItem)
        if warehouse_id:
            query = query.filter(InventoryItem.warehouse_id == warehouse_id)
        if item_id:
            query = query.filter(InventoryItem.item_id == item_id)
        if variant_id:
            query = query.filter(InventoryItem.variant_id == variant_id)

        items = query.all()
        on_hand = sum(i.quantity_on_hand for i in items)
        reserved = sum(i.quantity_reserved for i in items)
        incoming = sum(i.quantity_incoming for i in items)
        available = max(0, on_hand - reserved)

        return StockAvailabilityOut(
            business_id=business_id,
            item_id=item_id,
            variant_id=variant_id,
            warehouse_id=warehouse_id,
            quantity_on_hand=on_hand,
            quantity_reserved=reserved,
            quantity_incoming=incoming,
            quantity_available=available,
        )

    def get_variant_stock_aggregation(
        self, db: Session, variant_id: uuid.UUID
    ) -> VariantStockAggregationOut:
        items = self.repository.get_inventory_items(db, variant_id=variant_id)
        total_on_hand = sum(i.quantity_on_hand for i in items)
        total_reserved = sum(i.quantity_reserved for i in items)
        total_incoming = sum(i.quantity_incoming for i in items)
        total_available = max(0, total_on_hand - total_reserved)
        warehouses_out = [self._to_inventory_out(i) for i in items]

        return VariantStockAggregationOut(
            variant_id=variant_id,
            total_on_hand=total_on_hand,
            total_reserved=total_reserved,
            total_incoming=total_incoming,
            total_available=total_available,
            warehouses=warehouses_out,
        )

    def create_inventory_item(
        self, db: Session, data: InventoryItemCreate
    ) -> InventoryOut:
        if not data.variant_id and not data.item_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either variant_id or item_id must be provided",
            )
        self.get_warehouse(db, data.warehouse_id)
        if data.variant_id:
            existing = self.repository.get_inventory_item_by_variant_and_warehouse(
                db, data.variant_id, data.warehouse_id
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Inventory item for this variant and warehouse already exists",
                )
        if data.item_id:
            existing = self.repository.get_inventory_item_by_item_and_warehouse(
                db, data.item_id, data.warehouse_id
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Inventory item for this item and warehouse already exists",
                )
        item = self.repository.create_inventory_item(db, data)
        return self._to_inventory_out(item)

    def update_inventory_item(
        self, db: Session, item_id: uuid.UUID, data: InventoryItemUpdate
    ) -> InventoryOut:
        item = self.repository.get_inventory_item_by_id(db, item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found",
            )
        try:
            updated = self.repository.update_inventory_item(db, item, data)
        except StaleDataError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Concurrent modification conflict",
            )
        return self._to_inventory_out(updated)

    def get_valuation(
        self,
        db: Session,
        business_id: int,
        warehouse_id: uuid.UUID | None = None,
        as_of: datetime | None = None,
        costing_method: CostingMethod = CostingMethod.FIFO,
    ) -> InventoryValuationReportOut:
        as_of_time = as_of or datetime.now(timezone.utc)
        items = self.repository.get_items(db, business_id=business_id)

        item_valuations: list[ItemValuationOut] = []
        total_valuation = Decimal("0.00")

        for item in items:
            layers = self.repository.get_available_cost_layers(
                db, business_id=business_id, item_id=item.id, warehouse_id=warehouse_id, as_of=as_of_time
            )
            total_qty = sum(l.quantity_remaining for l in layers)
            if total_qty == 0:
                continue

            if costing_method == CostingMethod.WEIGHTED_AVERAGE:
                total_cost = sum(Decimal(str(l.quantity_remaining)) * Decimal(str(l.unit_cost)) for l in layers)
                unit_cost = (total_cost / Decimal(str(total_qty))).quantize(Decimal("0.01"))
                total_val = (Decimal(str(total_qty)) * unit_cost).quantize(Decimal("0.01"))
            else:  # FIFO
                total_val = sum(Decimal(str(l.quantity_remaining)) * Decimal(str(l.unit_cost)) for l in layers).quantize(Decimal("0.01"))
                unit_cost = (total_val / Decimal(str(total_qty))).quantize(Decimal("0.01"))

            total_valuation += total_val
            item_valuations.append(
                ItemValuationOut(
                    item_id=item.id,
                    sku=item.sku,
                    name=item.name,
                    warehouse_id=warehouse_id,
                    total_quantity=total_qty,
                    unit_cost=unit_cost,
                    total_value=total_val,
                )
            )

        return InventoryValuationReportOut(
            business_id=business_id,
            as_of=as_of_time,
            costing_method=costing_method,
            total_valuation=total_valuation,
            items=item_valuations,
        )

    def get_expiring_lots(
        self, db: Session, business_id: int, days: int = 30
    ) -> list[StockLotOut]:
        lots = self.repository.get_expiring_lots(db, business_id=business_id, days=days)
        return [StockLotOut.model_validate(l) for l in lots]

    def adjust_stock(
        self, db: Session, data: StockAdjustmentRequest
    ) -> tuple[InventoryOut, StockMovement]:
        inv_item = self.repository.get_inventory_item_by_id(db, data.inventory_item_id)
        if not inv_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found",
            )

        # Normalise quantity to base UoM if uom_id is specified
        if data.uom_id and inv_item.item and inv_item.item.base_uom_id:
            base_uom_id = inv_item.item.base_uom_id
            if data.uom_id != base_uom_id:
                factor = self.get_conversion_factor(
                    db,
                    business_id=inv_item.item.business_id,
                    from_uom_id=data.uom_id,
                    to_uom_id=base_uom_id,
                    item_id=inv_item.item_id,
                )
                converted_delta = int(round(Decimal(data.delta) * factor))
                data.delta = converted_delta

        # Enforce tracking_type rules on Item (if linked)
        if inv_item.item:
            item = inv_item.item
            if item.tracking_type == TrackingType.LOT:
                # Lot-tracked item
                if data.delta > 0:
                    lot_num = data.batch_number or f"LOT-{uuid.uuid4().hex[:8].upper()}"
                    data.batch_number = lot_num
                    existing_lot = self.repository.get_lot_by_number(
                        db, item.business_id, item.id, inv_item.warehouse_id, lot_num
                    )
                    if existing_lot:
                        existing_lot.quantity += data.delta
                        if data.expiry_date:
                            existing_lot.expiry_date = data.expiry_date
                    else:
                        new_lot = StockLot(
                            business_id=item.business_id,
                            item_id=item.id,
                            warehouse_id=inv_item.warehouse_id,
                            lot_number=lot_num,
                            expiry_date=data.expiry_date,
                            quantity=data.delta,
                        )
                        db.add(new_lot)
                elif data.delta < 0:
                    needed = abs(data.delta)
                    # If specific batch_number is given, consume from that lot; else use FEFO
                    if data.batch_number:
                        specified_lot = self.repository.get_lot_by_number(
                            db, item.business_id, item.id, inv_item.warehouse_id, data.batch_number
                        )
                        if not specified_lot or specified_lot.quantity < needed:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Insufficient lot quantity available for lot '{data.batch_number}'",
                            )
                        specified_lot.quantity -= needed
                    else:
                        available_lots = self.repository.get_available_lots_fefo(
                            db, item.business_id, item.id, inv_item.warehouse_id
                        )
                        total_lot_qty = sum(l.quantity for l in available_lots)
                        if total_lot_qty < needed:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Insufficient total lot quantity available. Required: {needed}, Available: {total_lot_qty}",
                            )
                        rem = needed
                        for lot in available_lots:
                            if rem <= 0:
                                break
                            deduct = min(lot.quantity, rem)
                            lot.quantity -= deduct
                            rem -= deduct

            elif item.tracking_type == TrackingType.SERIAL:
                # Serial-tracked item: move exactly 1 unit per serial
                if abs(data.delta) != 1:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Serial-tracked items must move exactly 1 unit per movement",
                    )
                if not data.serial_number:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="serial_number is required for serial-tracked items",
                    )

                serial_obj = self.repository.get_serial_by_number(
                    db, item.business_id, item.id, data.serial_number
                )
                if data.delta > 0:
                    if serial_obj and serial_obj.status == SerialStatus.AVAILABLE:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Serial number '{data.serial_number}' is already available in stock",
                        )
                    if not serial_obj:
                        serial_obj = StockSerial(
                            business_id=item.business_id,
                            item_id=item.id,
                            serial_number=data.serial_number,
                            status=SerialStatus.AVAILABLE,
                            current_warehouse_id=inv_item.warehouse_id,
                        )
                        db.add(serial_obj)
                    else:
                        serial_obj.status = SerialStatus.AVAILABLE
                        serial_obj.current_warehouse_id = inv_item.warehouse_id
                else:
                    if not serial_obj or serial_obj.status != SerialStatus.AVAILABLE:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Serial number '{data.serial_number}' is not available in stock",
                        )
                    if serial_obj.current_warehouse_id != inv_item.warehouse_id:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Serial number '{data.serial_number}' is not located in the specified warehouse",
                        )
                    serial_obj.status = SerialStatus.SOLD if data.reason == StockMovementReason.SALE else SerialStatus.SCRAPPED

        # Cost Layers & Valuation Processing
        b_id = inv_item.item.business_id if inv_item.item else (inv_item.warehouse.business_id or 1)
        item_id_val = inv_item.item_id or uuid.uuid4()

        if data.delta > 0:
            unit_c = data.unit_cost or (inv_item.item.default_cost if inv_item.item else Decimal("0.00"))
            self.repository.create_cost_layer(
                db,
                business_id=b_id,
                item_id=item_id_val,
                warehouse_id=inv_item.warehouse_id,
                quantity=data.delta,
                unit_cost=unit_c,
                received_at=datetime.now(timezone.utc),
                source_type=data.source_type,
                source_id=data.source_id,
            )
            data.unit_cost = unit_c
        elif data.delta < 0 and inv_item.item_id:
            # Consume cost layers
            needed_qty = abs(data.delta)
            layers = self.repository.get_available_cost_layers(
                db, business_id=b_id, item_id=inv_item.item_id, warehouse_id=inv_item.warehouse_id
            )
            if layers:
                total_consumed_cost = Decimal("0.00")
                rem_needed = needed_qty
                for layer in layers:
                    if rem_needed <= 0:
                        break
                    take = min(layer.quantity_remaining, rem_needed)
                    layer.quantity_remaining -= take
                    total_consumed_cost += Decimal(str(take)) * Decimal(str(layer.unit_cost))
                    rem_needed -= take

                cogs_unit_cost = (total_consumed_cost / Decimal(str(needed_qty))).quantize(Decimal("0.01"))
                data.unit_cost = cogs_unit_cost

        try:
            updated_item, movement = self.repository.adjust_stock(db, inv_item, data)
        except StaleDataError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Concurrent modification conflict",
            )
        return self._to_inventory_out(updated_item), movement

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
        return self.repository.get_stock_movements(
            db,
            inventory_item_id=inventory_item_id,
            item_id=item_id,
            variant_id=variant_id,
            warehouse_id=warehouse_id,
            start_date=start_date,
            end_date=end_date,
            reason=reason,
            source_type=source_type,
            source_id=source_id,
            skip=skip,
            limit=limit,
        )

    def update_stock_movement(self, *args, **kwargs):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stock movements are append-only and cannot be updated. Post a reversing entry instead.",
        )

    def delete_stock_movement(self, *args, **kwargs):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stock movements are append-only and cannot be deleted. Post a reversing entry instead.",
        )

    # --- Stock Reservation Services ---
    def create_reservation(
        self, db: Session, data: StockReservationCreate
    ) -> StockReservationOut:
        item = self.repository.get_inventory_item_by_id(db, data.inventory_item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found",
            )
        available = item.quantity_on_hand - item.quantity_reserved
        if available < data.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient stock available for reservation. "
                    f"Requested: {data.quantity}, Available: {available}"
                ),
            )

        # Update inventory item quantity_reserved
        self.repository.update_inventory_item(
            db,
            item,
            InventoryItemUpdate(
                quantity_reserved=item.quantity_reserved + data.quantity
            ),
        )
        reservation = self.repository.create_reservation(db, data)
        return StockReservationOut.model_validate(reservation)

    def update_reservation(
        self, db: Session, reservation_id: uuid.UUID, data: StockReservationUpdate
    ) -> StockReservationOut:
        reservation = self.repository.get_reservation_by_id(db, reservation_id)
        if not reservation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Stock reservation not found",
            )
        updated = self.repository.update_reservation(db, reservation, data)
        return StockReservationOut.model_validate(updated)

    def get_reservations(
        self,
        db: Session,
        inventory_item_id: uuid.UUID | None = None,
        cart_id: uuid.UUID | None = None,
        order_id: uuid.UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[StockReservationOut]:
        reservations = self.repository.get_reservations(
            db,
            inventory_item_id=inventory_item_id,
            cart_id=cart_id,
            order_id=order_id,
            skip=skip,
            limit=limit,
        )
        return [StockReservationOut.model_validate(r) for r in reservations]

    @staticmethod
    def _to_inventory_out(item: InventoryItem) -> InventoryOut:
        available = max(0, item.quantity_on_hand - item.quantity_reserved)
        out = InventoryOut.model_validate(item)
        out.quantity_available = available
        return out
