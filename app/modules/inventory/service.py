import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.inventory.models import (
    InventoryItem,
    StockMovement,
    Warehouse,
)
from app.modules.inventory.repository import InventoryRepository
from app.modules.inventory.schemas import (
    InventoryItemCreate,
    InventoryItemUpdate,
    InventoryOut,
    StockAdjustmentRequest,
    StockReservationCreate,
    StockReservationOut,
    StockReservationUpdate,
    WarehouseCreate,
    WarehouseUpdate,
)


class InventoryService:
    def __init__(self, repository: InventoryRepository | None = None):
        self.repository = repository or InventoryRepository()

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
        warehouse_id: uuid.UUID | None = None,
    ) -> list[InventoryOut]:
        items = self.repository.get_inventory_items(
            db,
            skip=skip,
            limit=limit,
            variant_id=variant_id,
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

    def create_inventory_item(
        self, db: Session, data: InventoryItemCreate
    ) -> InventoryOut:
        self.get_warehouse(db, data.warehouse_id)
        existing = self.repository.get_inventory_item_by_variant_and_warehouse(
            db, data.variant_id, data.warehouse_id
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inventory item for this variant and warehouse already exists",
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
        updated = self.repository.update_inventory_item(db, item, data)
        return self._to_inventory_out(updated)

    def adjust_stock(
        self, db: Session, data: StockAdjustmentRequest
    ) -> tuple[InventoryOut, StockMovement]:
        item = self.repository.get_inventory_item_by_id(db, data.inventory_item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found",
            )
        updated_item, movement = self.repository.adjust_stock(db, item, data)
        return self._to_inventory_out(updated_item), movement

    def get_stock_movements(
        self,
        db: Session,
        inventory_item_id: uuid.UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[StockMovement]:
        return self.repository.get_stock_movements(
            db, inventory_item_id=inventory_item_id, skip=skip, limit=limit
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
