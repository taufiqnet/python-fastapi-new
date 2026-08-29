import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.ecommerce.inventory.schemas import (
    InventoryItemCreate,
    InventoryItemUpdate,
    InventoryOut,
    StockAdjustmentRequest,
    StockMovementOut,
    StockReservationCreate,
    StockReservationOut,
    StockReservationUpdate,
    WarehouseCreate,
    WarehouseOut,
    WarehouseUpdate,
)
from app.modules.ecommerce.inventory.service import InventoryService

router = APIRouter(prefix="/inventory", tags=["Inventory"])
service = InventoryService()


# --- Warehouse Endpoints ---
@router.get("/warehouses", response_model=list[WarehouseOut])
def get_warehouses(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    is_active: bool | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.get_warehouses(
        db, skip=skip, limit=limit, business_id=business_id, is_active=is_active
    )


@router.get("/warehouses/{warehouse_id}", response_model=WarehouseOut)
def get_warehouse(warehouse_id: uuid.UUID, db: Session = Depends(get_db)):
    return service.get_warehouse(db, warehouse_id)


@router.post(
    "/warehouses",
    response_model=WarehouseOut,
    status_code=status.HTTP_201_CREATED,
)
def create_warehouse(warehouse_data: WarehouseCreate, db: Session = Depends(get_db)):
    return service.create_warehouse(db, warehouse_data)


@router.put("/warehouses/{warehouse_id}", response_model=WarehouseOut)
def update_warehouse(
    warehouse_id: uuid.UUID,
    warehouse_data: WarehouseUpdate,
    db: Session = Depends(get_db),
):
    return service.update_warehouse(db, warehouse_id, warehouse_data)


@router.delete("/warehouses/{warehouse_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_warehouse(warehouse_id: uuid.UUID, db: Session = Depends(get_db)):
    service.delete_warehouse(db, warehouse_id)
    return None


# --- Inventory Item Endpoints ---
@router.get("/items", response_model=list[InventoryOut])
def get_inventory_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    variant_id: uuid.UUID | None = Query(None),
    warehouse_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.get_inventory_items(
        db, skip=skip, limit=limit, variant_id=variant_id, warehouse_id=warehouse_id
    )


@router.get("/items/{item_id}", response_model=InventoryOut)
def get_inventory_item(item_id: uuid.UUID, db: Session = Depends(get_db)):
    return service.get_inventory_item(db, item_id)


@router.post(
    "/items",
    response_model=InventoryOut,
    status_code=status.HTTP_201_CREATED,
)
def create_inventory_item(
    item_data: InventoryItemCreate, db: Session = Depends(get_db)
):
    return service.create_inventory_item(db, item_data)


@router.put("/items/{item_id}", response_model=InventoryOut)
def update_inventory_item(
    item_id: uuid.UUID,
    item_data: InventoryItemUpdate,
    db: Session = Depends(get_db),
):
    return service.update_inventory_item(db, item_id, item_data)


# --- Stock Adjustment & Movement Endpoints ---
@router.post("/adjustments", response_model=InventoryOut)
def adjust_stock(
    adjustment_data: StockAdjustmentRequest, db: Session = Depends(get_db)
):
    updated_item, _ = service.adjust_stock(db, adjustment_data)
    return updated_item


@router.get("/movements", response_model=list[StockMovementOut])
def get_stock_movements(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    inventory_item_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.get_stock_movements(
        db, inventory_item_id=inventory_item_id, skip=skip, limit=limit
    )


# --- Stock Reservation Endpoints ---
@router.post(
    "/reservations",
    response_model=StockReservationOut,
    status_code=status.HTTP_201_CREATED,
)
def create_reservation(
    reservation_data: StockReservationCreate, db: Session = Depends(get_db)
):
    return service.create_reservation(db, reservation_data)


@router.put("/reservations/{reservation_id}", response_model=StockReservationOut)
def update_reservation(
    reservation_id: uuid.UUID,
    reservation_data: StockReservationUpdate,
    db: Session = Depends(get_db),
):
    return service.update_reservation(db, reservation_id, reservation_data)


@router.get("/reservations", response_model=list[StockReservationOut])
def get_reservations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    inventory_item_id: uuid.UUID | None = Query(None),
    cart_id: uuid.UUID | None = Query(None),
    order_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.get_reservations(
        db,
        inventory_item_id=inventory_item_id,
        cart_id=cart_id,
        order_id=order_id,
        skip=skip,
        limit=limit,
    )
