import uuid

from sqlalchemy.orm import Session

from app.modules.inventory.models import InventoryItem, StockMovement, Warehouse
from app.modules.inventory.schemas import (
    InventoryItemCreate,
    InventoryItemUpdate,
    StockAdjustmentRequest,
    WarehouseCreate,
    WarehouseUpdate,
)


class InventoryRepository:

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
        warehouse = Warehouse(
            name=data.name,
            code=data.code,
            address=data.address,
            region=data.region,
            is_active=data.is_active,
            business_id=data.business_id,
        )
        db.add(warehouse)
        db.commit()
        db.refresh(warehouse)
        return warehouse

    def update_warehouse(
        self, db: Session, warehouse: Warehouse, data: WarehouseUpdate
    ) -> Warehouse:
        update_data = data.model_dump(exclude_unset=True)
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

    def get_inventory_items(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        variant_id: uuid.UUID | None = None,
        warehouse_id: uuid.UUID | None = None,
    ) -> list[InventoryItem]:
        query = db.query(InventoryItem)
        if variant_id is not None:
            query = query.filter(InventoryItem.variant_id == variant_id)
        if warehouse_id is not None:
            query = query.filter(InventoryItem.warehouse_id == warehouse_id)
        return query.offset(skip).limit(limit).all()

    def create_inventory_item(
        self, db: Session, data: InventoryItemCreate
    ) -> InventoryItem:
        item = InventoryItem(
            variant_id=data.variant_id,
            warehouse_id=data.warehouse_id,
            quantity_on_hand=data.quantity_on_hand,
            quantity_reserved=data.quantity_reserved,
        )
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

        movement = StockMovement(
            inventory_item_id=item.id,
            delta=data.delta,
            reason=data.reason,
            reference_id=data.reference_id,
            notes=data.notes,
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
        skip: int = 0,
        limit: int = 100,
    ) -> list[StockMovement]:
        query = db.query(StockMovement)
        if inventory_item_id is not None:
            query = query.filter(StockMovement.inventory_item_id == inventory_item_id)
        return (
            query.order_by(StockMovement.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
