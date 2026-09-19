import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from datetime import datetime

from app.modules.ecommerce.inventory.models import StockMovementReason
from app.modules.ecommerce.inventory.models import CostingMethod, CountStatus, TransferStatus
from app.modules.ecommerce.inventory.schemas import (
    InventoryItemCreate,
    InventoryItemUpdate,
    InventoryOut,
    InventoryValuationReportOut,
    ItemCreate,
    ItemOut,
    ItemUpdate,
    ReorderAlertOut,
    StockAdjustmentRequest,
    StockAvailabilityOut,
    StockCountCreate,
    StockCountOut,
    StockCountRecordRequest,
    StockLotOut,
    StockMovementOut,
    StockReservationCreate,
    StockReservationOut,
    StockReservationUpdate,
    StockSerialOut,
    StockTransferCreate,
    StockTransferOut,
    StockTransferReceiveRequest,
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
    WarehouseOut,
    WarehouseUpdate,
)
from app.modules.ecommerce.inventory.service import InventoryService

router = APIRouter(prefix="/inventory", tags=["Inventory"])
service = InventoryService()


# --- Unit of Measure & Conversion Endpoints ---
@router.get("/uom/units", response_model=list[UoMOut])
def get_uoms(
    business_id: int = Query(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return service.get_uoms(db, business_id=business_id, skip=skip, limit=limit)


@router.get("/uom/units/{uom_id}", response_model=UoMOut)
def get_uom(
    uom_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.get_uom(db, uom_id=uom_id, business_id=business_id)


@router.post(
    "/uom/units",
    response_model=UoMOut,
    status_code=status.HTTP_201_CREATED,
)
def create_uom(uom_data: UoMCreate, db: Session = Depends(get_db)):
    return service.create_uom(db, uom_data)


@router.put("/uom/units/{uom_id}", response_model=UoMOut)
def update_uom(
    uom_id: uuid.UUID,
    uom_data: UoMUpdate,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.update_uom(
        db, uom_id=uom_id, data=uom_data, business_id=business_id
    )


@router.delete("/uom/units/{uom_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_uom(
    uom_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    service.delete_uom(db, uom_id=uom_id, business_id=business_id)
    return None


@router.get("/uom/conversions", response_model=list[UoMConversionOut])
def get_conversions(
    business_id: int = Query(...),
    item_id: uuid.UUID | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return service.get_conversions(
        db, business_id=business_id, item_id=item_id, skip=skip, limit=limit
    )


@router.post(
    "/uom/conversions",
    response_model=UoMConversionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_conversion(
    conversion_data: UoMConversionCreate, db: Session = Depends(get_db)
):
    return service.create_conversion(db, conversion_data)


@router.put("/uom/conversions/{conversion_id}", response_model=UoMConversionOut)
def update_conversion(
    conversion_id: uuid.UUID,
    conversion_data: UoMConversionUpdate,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.update_conversion(
        db, conversion_id=conversion_id, data=conversion_data, business_id=business_id
    )


@router.delete(
    "/uom/conversions/{conversion_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_conversion(
    conversion_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    service.delete_conversion(db, conversion_id=conversion_id, business_id=business_id)
    return None


@router.post("/uom/convert", response_model=UoMConvertResponse)
def convert_quantity(
    convert_req: UoMConvertRequest, db: Session = Depends(get_db)
):
    return service.convert_quantity(db, convert_req)


# --- Item Master Endpoints ---
@router.get("/items-master", response_model=list[ItemOut])
def get_items(
    business_id: int = Query(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    category_id: uuid.UUID | None = Query(None),
    is_active: bool | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.get_items(
        db,
        business_id=business_id,
        skip=skip,
        limit=limit,
        category_id=category_id,
        is_active=is_active,
    )


@router.get("/items-master/{item_id}", response_model=ItemOut)
def get_item(
    item_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.get_item(db, item_id, business_id=business_id)


@router.post(
    "/items-master",
    response_model=ItemOut,
    status_code=status.HTTP_201_CREATED,
)
def create_item(item_data: ItemCreate, db: Session = Depends(get_db)):
    return service.create_item(db, item_data)


@router.put("/items-master/{item_id}", response_model=ItemOut)
def update_item(
    item_id: uuid.UUID,
    item_data: ItemUpdate,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.update_item(
        db, item_id=item_id, data=item_data, business_id=business_id
    )


@router.delete("/items-master/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    service.delete_item(db, item_id=item_id, business_id=business_id)
    return None


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


# --- Stock Count & Reorder Alert Endpoints ---
@router.get("/reorder-alerts", response_model=list[ReorderAlertOut])
def get_reorder_alerts(
    business_id: int = Query(...),
    warehouse_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.get_reorder_alerts(db, business_id=business_id, warehouse_id=warehouse_id)


@router.get("/counts", response_model=list[StockCountOut])
def get_counts(
    business_id: int = Query(...),
    warehouse_id: uuid.UUID | None = Query(None),
    status_filter: CountStatus | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return service.get_counts(
        db,
        business_id=business_id,
        warehouse_id=warehouse_id,
        status_filter=status_filter,
        skip=skip,
        limit=limit,
    )


@router.get("/counts/{count_id}", response_model=StockCountOut)
def get_count(
    count_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.get_count(db, count_id=count_id, business_id=business_id)


@router.post(
    "/counts",
    response_model=StockCountOut,
    status_code=status.HTTP_201_CREATED,
)
def create_count(
    count_data: StockCountCreate, db: Session = Depends(get_db)
):
    return service.create_count(db, count_data)


@router.post("/counts/{count_id}/start", response_model=StockCountOut)
def start_count(
    count_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.start_count(db, count_id=count_id, business_id=business_id)


@router.post("/counts/{count_id}/record", response_model=StockCountOut)
def record_count(
    count_id: uuid.UUID,
    req: StockCountRecordRequest,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.record_count(db, count_id=count_id, req=req, business_id=business_id)


@router.post("/counts/{count_id}/complete", response_model=StockCountOut)
def complete_count(
    count_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.complete_count(db, count_id=count_id, business_id=business_id)


# --- Stock Transfer Endpoints ---
@router.get("/transfers", response_model=list[StockTransferOut])
def get_transfers(
    business_id: int = Query(...),
    status_filter: TransferStatus | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return service.get_transfers(
        db, business_id=business_id, status_filter=status_filter, skip=skip, limit=limit
    )


@router.get("/transfers/{transfer_id}", response_model=StockTransferOut)
def get_transfer(
    transfer_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.get_transfer(db, transfer_id=transfer_id, business_id=business_id)


@router.post(
    "/transfers",
    response_model=StockTransferOut,
    status_code=status.HTTP_201_CREATED,
)
def create_transfer(
    transfer_data: StockTransferCreate, db: Session = Depends(get_db)
):
    return service.create_transfer(db, transfer_data)


@router.post("/transfers/{transfer_id}/ship", response_model=StockTransferOut)
def ship_transfer(
    transfer_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.ship_transfer(db, transfer_id=transfer_id, business_id=business_id)


@router.post("/transfers/{transfer_id}/receive", response_model=StockTransferOut)
def receive_transfer(
    transfer_id: uuid.UUID,
    req: StockTransferReceiveRequest | None = None,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.receive_transfer(
        db, transfer_id=transfer_id, req=req, business_id=business_id
    )


@router.post("/transfers/{transfer_id}/cancel", response_model=StockTransferOut)
def cancel_transfer(
    transfer_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.cancel_transfer(db, transfer_id=transfer_id, business_id=business_id)


# --- Valuation Endpoints ---
@router.get("/valuation", response_model=InventoryValuationReportOut)
def get_inventory_valuation(
    business_id: int = Query(...),
    warehouse_id: uuid.UUID | None = Query(None),
    as_of: datetime | None = Query(None),
    costing_method: CostingMethod = Query(CostingMethod.FIFO),
    db: Session = Depends(get_db),
):
    return service.get_valuation(
        db,
        business_id=business_id,
        warehouse_id=warehouse_id,
        as_of=as_of,
        costing_method=costing_method,
    )


# --- Lot, Serial & Expiry Alerts Endpoints ---
@router.get("/lots/expiring", response_model=list[StockLotOut])
def get_expiring_lots(
    business_id: int = Query(...),
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    return service.get_expiring_lots(db, business_id=business_id, days=days)


# --- Availability & Stock Aggregation Endpoints ---
@router.get("/availability", response_model=StockAvailabilityOut)
def get_stock_availability(
    business_id: int | None = Query(None),
    item_id: uuid.UUID | None = Query(None),
    variant_id: uuid.UUID | None = Query(None),
    warehouse_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.get_stock_availability(
        db,
        business_id=business_id,
        item_id=item_id,
        variant_id=variant_id,
        warehouse_id=warehouse_id,
    )


@router.get("/variants/{variant_id}/stock", response_model=VariantStockAggregationOut)
def get_variant_stock_aggregation(
    variant_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    return service.get_variant_stock_aggregation(db, variant_id)


# --- Inventory Item Endpoints ---
@router.get("/items", response_model=list[InventoryOut])
def get_inventory_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    variant_id: uuid.UUID | None = Query(None),
    item_id: uuid.UUID | None = Query(None),
    warehouse_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.get_inventory_items(
        db,
        skip=skip,
        limit=limit,
        variant_id=variant_id,
        item_id=item_id,
        warehouse_id=warehouse_id,
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
    item_id: uuid.UUID | None = Query(None),
    variant_id: uuid.UUID | None = Query(None),
    warehouse_id: uuid.UUID | None = Query(None),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    reason: StockMovementReason | None = Query(None),
    source_type: str | None = Query(None),
    source_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.get_stock_movements(
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
