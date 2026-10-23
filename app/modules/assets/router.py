import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.database import get_db
from app.modules.assets.models import AllocationStatusEnum
from app.modules.assets.schemas import (
    AssetAssignmentAcknowledge,
    AssetAssignmentCreate,
    AssetAssignmentOut,
    AssetAssignmentReturn,
    AssetCategoryCreate,
    AssetCategoryOut,
    AssetCategoryUpdate,
    AssetMaintenanceCreate,
    AssetMaintenanceOut,
    AssetMaintenanceUpdate,
    AssetOverviewStats,
    CompanyAssetCreate,
    CompanyAssetOut,
    CompanyAssetUpdate,
)
from app.modules.assets.services import AssetService
from app.modules.hr_payroll.employees.models import Employee

router = APIRouter(prefix="/assets", tags=["Asset Management"])
asset_service = AssetService()


# ===========================================================================
# 1. Statistics & Overview
# ===========================================================================
@router.get("/overview/stats", response_model=AssetOverviewStats)
def get_assets_stats(
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return asset_service.get_assets_stats(db, biz_id)


# ===========================================================================
# 2. Asset Categories
# ===========================================================================
@router.post("/categories", response_model=AssetCategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    data: AssetCategoryCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return asset_service.create_category(db, biz_id, data)


@router.get("/categories", response_model=List[AssetCategoryOut])
def list_categories(
    active_only: bool = Query(False),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return asset_service.get_categories(db, biz_id, active_only=active_only)


@router.put("/categories/{category_id}", response_model=AssetCategoryOut)
def update_category(
    category_id: uuid.UUID,
    data: AssetCategoryUpdate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return asset_service.update_category(db, biz_id, category_id, data)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    asset_service.delete_category(db, biz_id, category_id)
    return None


# ===========================================================================
# 3. Asset Inventory Items
# ===========================================================================
@router.post("/items", response_model=CompanyAssetOut, status_code=status.HTTP_201_CREATED)
def create_asset(
    data: CompanyAssetCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    asset = asset_service.create_asset(db, biz_id, data)
    out = CompanyAssetOut.model_validate(asset)
    if asset.category:
        out.category_name = asset.category.name
    return out


@router.get("/items", response_model=List[CompanyAssetOut])
def list_assets(
    category_id: Optional[uuid.UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    assets = asset_service.get_assets(
        db, biz_id, category_id=category_id, status_filter=status_filter, search=search, skip=skip, limit=limit
    )
    results = []
    for a in assets:
        out = CompanyAssetOut.model_validate(a)
        if a.category:
            out.category_name = a.category.name
        # Find active allocation if any
        active_alloc = next(
            (al for al in a.allocations if al.status in (AllocationStatusEnum.ACTIVE.value, AllocationStatusEnum.PENDING_ACKNOWLEDGEMENT.value)),
            None,
        )
        if active_alloc and active_alloc.employee:
            out.current_assigned_employee_id = active_alloc.employee_id
            out.current_assigned_employee_name = f"{active_alloc.employee.first_name} {active_alloc.employee.last_name or ''}".strip()
        results.append(out)
    return results


@router.get("/items/{asset_id}", response_model=CompanyAssetOut)
def get_asset(
    asset_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    asset = asset_service.get_asset_by_id(db, biz_id, asset_id)
    out = CompanyAssetOut.model_validate(asset)
    if asset.category:
        out.category_name = asset.category.name
    active_alloc = next(
        (al for al in asset.allocations if al.status in (AllocationStatusEnum.ACTIVE.value, AllocationStatusEnum.PENDING_ACKNOWLEDGEMENT.value)),
        None,
    )
    if active_alloc and active_alloc.employee:
        out.current_assigned_employee_id = active_alloc.employee_id
        out.current_assigned_employee_name = f"{active_alloc.employee.first_name} {active_alloc.employee.last_name or ''}".strip()
    return out


@router.put("/items/{asset_id}", response_model=CompanyAssetOut)
def update_asset(
    asset_id: uuid.UUID,
    data: CompanyAssetUpdate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    asset = asset_service.update_asset(db, biz_id, asset_id, data)
    out = CompanyAssetOut.model_validate(asset)
    if asset.category:
        out.category_name = asset.category.name
    return out


@router.delete("/items/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(
    asset_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    asset_service.delete_asset(db, biz_id, asset_id)
    return None


# ===========================================================================
# 4. Allocations & Handover
# ===========================================================================
@router.post("/allocations", response_model=AssetAssignmentOut, status_code=status.HTTP_201_CREATED)
def allocate_asset(
    data: AssetAssignmentCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    alloc = asset_service.allocate_asset(db, biz_id, current_user.id, data)
    out = AssetAssignmentOut.model_validate(alloc)
    if alloc.asset:
        out.asset_tag = alloc.asset.asset_tag
        out.asset_name = alloc.asset.name
    if alloc.employee:
        out.employee_name = f"{alloc.employee.first_name} {alloc.employee.last_name or ''}".strip()
        out.employee_code = getattr(alloc.employee, "employee_id", None)
    return out


@router.get("/allocations", response_model=List[AssetAssignmentOut])
def list_allocations(
    employee_id: Optional[uuid.UUID] = Query(None),
    asset_id: Optional[uuid.UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    allocs = asset_service.get_allocations(
        db, biz_id, employee_id=employee_id, asset_id=asset_id, status_filter=status_filter, skip=skip, limit=limit
    )
    results = []
    for a in allocs:
        out = AssetAssignmentOut.model_validate(a)
        if a.asset:
            out.asset_tag = a.asset.asset_tag
            out.asset_name = a.asset.name
        if a.employee:
            out.employee_name = f"{a.employee.first_name} {a.employee.last_name or ''}".strip()
            out.employee_code = getattr(a.employee, "employee_id", None)
        results.append(out)
    return results


@router.post("/allocations/{assignment_id}/return", response_model=AssetAssignmentOut)
def return_asset(
    assignment_id: uuid.UUID,
    data: AssetAssignmentReturn,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    alloc = asset_service.return_asset(db, biz_id, assignment_id, current_user.id, data)
    out = AssetAssignmentOut.model_validate(alloc)
    if alloc.asset:
        out.asset_tag = alloc.asset.asset_tag
        out.asset_name = alloc.asset.name
    if alloc.employee:
        out.employee_name = f"{alloc.employee.first_name} {alloc.employee.last_name or ''}".strip()
        out.employee_code = getattr(alloc.employee, "employee_id", None)
    return out


@router.post("/allocations/{assignment_id}/acknowledge", response_model=AssetAssignmentOut)
def acknowledge_asset(
    assignment_id: uuid.UUID,
    data: AssetAssignmentAcknowledge,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    alloc = asset_service.acknowledge_asset(db, biz_id, assignment_id, data)
    out = AssetAssignmentOut.model_validate(alloc)
    if alloc.asset:
        out.asset_tag = alloc.asset.asset_tag
        out.asset_name = alloc.asset.name
    return out


# ===========================================================================
# 5. Maintenance
# ===========================================================================
@router.post("/maintenance", response_model=AssetMaintenanceOut, status_code=status.HTTP_201_CREATED)
def create_maintenance(
    data: AssetMaintenanceCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    log = asset_service.create_maintenance(db, biz_id, current_user.id, data)
    out = AssetMaintenanceOut.model_validate(log)
    if log.asset:
        out.asset_tag = log.asset.asset_tag
        out.asset_name = log.asset.name
    return out


@router.put("/maintenance/{maintenance_id}", response_model=AssetMaintenanceOut)
def update_maintenance(
    maintenance_id: uuid.UUID,
    data: AssetMaintenanceUpdate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    log = asset_service.update_maintenance(db, biz_id, maintenance_id, data)
    out = AssetMaintenanceOut.model_validate(log)
    if log.asset:
        out.asset_tag = log.asset.asset_tag
        out.asset_name = log.asset.name
    return out


@router.get("/maintenance", response_model=List[AssetMaintenanceOut])
def list_maintenance(
    asset_id: Optional[uuid.UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    logs = asset_service.get_maintenance_logs(
        db, biz_id, asset_id=asset_id, status_filter=status_filter, skip=skip, limit=limit
    )
    results = []
    for l in logs:
        out = AssetMaintenanceOut.model_validate(l)
        if l.asset:
            out.asset_tag = l.asset.asset_tag
            out.asset_name = l.asset.name
        results.append(out)
    return results


# ===========================================================================
# 6. Employee Clearance & Portal Integration
# ===========================================================================
@router.get("/employee/{employee_id}/unreturned", response_model=List[AssetAssignmentOut])
def get_employee_unreturned_assets(
    employee_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Exit clearance check: Returns all pending or active assets held by employee."""
    biz_id = resolve_business_id(current_user, business_id)
    allocs = asset_service.get_unreturned_assets_for_employee(db, biz_id, employee_id)
    results = []
    for a in allocs:
        out = AssetAssignmentOut.model_validate(a)
        if a.asset:
            out.asset_tag = a.asset.asset_tag
            out.asset_name = a.asset.name
        results.append(out)
    return results


@router.get("/portal/my-assets", response_model=List[AssetAssignmentOut])
def get_my_assigned_assets(
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Self-service endpoint for employee to see their assigned assets."""
    biz_id = resolve_business_id(current_user, business_id)
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return []

    allocs = (
        db.query(from_obj=None)
        if False
        else asset_service.get_allocations(
            db, biz_id, employee_id=emp.id, status_filter=None
        )
    )
    results = []
    for a in allocs:
        out = AssetAssignmentOut.model_validate(a)
        if a.asset:
            out.asset_tag = a.asset.asset_tag
            out.asset_name = a.asset.name
        results.append(out)
    return results
