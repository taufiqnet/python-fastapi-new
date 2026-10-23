import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.modules.assets.models import (
    AllocationStatusEnum,
    AssetAssignment,
    AssetCategory,
    AssetMaintenanceLog,
    AssetStatusEnum,
    CompanyAsset,
    MaintenanceStatusEnum,
)
from app.modules.assets.schemas import (
    AssetAssignmentAcknowledge,
    AssetAssignmentCreate,
    AssetAssignmentReturn,
    AssetCategoryCreate,
    AssetCategoryUpdate,
    AssetMaintenanceCreate,
    AssetMaintenanceUpdate,
    AssetOverviewStats,
    CompanyAssetCreate,
    CompanyAssetUpdate,
)
from app.modules.hr_payroll.employees.models import Employee


class AssetService:
    # -----------------------------------------------------------------------
    # Categories
    # -----------------------------------------------------------------------
    def create_category(self, db: Session, business_id: int, data: AssetCategoryCreate) -> AssetCategory:
        existing = (
            db.query(AssetCategory)
            .filter(AssetCategory.business_id == business_id, AssetCategory.code == data.code)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with code '{data.code}' already exists.",
            )
        category = AssetCategory(business_id=business_id, **data.model_dump())
        db.add(category)
        db.commit()
        db.refresh(category)
        return category

    def get_categories(
        self, db: Session, business_id: int, active_only: bool = False
    ) -> List[AssetCategory]:
        query = db.query(AssetCategory).filter(AssetCategory.business_id == business_id)
        if active_only:
            query = query.filter(AssetCategory.is_active == True)  # noqa: E712
        return query.order_by(AssetCategory.name.asc()).all()

    def update_category(
        self, db: Session, business_id: int, category_id: uuid.UUID, data: AssetCategoryUpdate
    ) -> AssetCategory:
        cat = (
            db.query(AssetCategory)
            .filter(AssetCategory.business_id == business_id, AssetCategory.id == category_id)
            .first()
        )
        if not cat:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(cat, k, v)
        db.commit()
        db.refresh(cat)
        return cat

    def delete_category(self, db: Session, business_id: int, category_id: uuid.UUID) -> None:
        cat = (
            db.query(AssetCategory)
            .filter(AssetCategory.business_id == business_id, AssetCategory.id == category_id)
            .first()
        )
        if not cat:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
        # Check if assets exist
        has_assets = db.query(CompanyAsset).filter(CompanyAsset.category_id == category_id).first()
        if has_assets:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete category because it contains existing assets.",
            )
        db.delete(cat)
        db.commit()

    # -----------------------------------------------------------------------
    # Assets Inventory
    # -----------------------------------------------------------------------
    def create_asset(self, db: Session, business_id: int, data: CompanyAssetCreate) -> CompanyAsset:
        # Check tag uniqueness
        existing = (
            db.query(CompanyAsset)
            .filter(CompanyAsset.business_id == business_id, CompanyAsset.asset_tag == data.asset_tag)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Asset tag '{data.asset_tag}' already exists.",
            )
        # Check category exists
        cat = (
            db.query(AssetCategory)
            .filter(AssetCategory.business_id == business_id, AssetCategory.id == data.category_id)
            .first()
        )
        if not cat:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Asset category not found.")

        payload = data.model_dump()
        payload["current_status"] = payload["current_status"].value if hasattr(payload["current_status"], "value") else payload["current_status"]
        payload["condition"] = payload["condition"].value if hasattr(payload["condition"], "value") else payload["condition"]

        asset = CompanyAsset(business_id=business_id, **payload)
        db.add(asset)
        db.commit()
        db.refresh(asset)
        return asset

    def get_assets(
        self,
        db: Session,
        business_id: int,
        category_id: Optional[uuid.UUID] = None,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[CompanyAsset]:
        query = (
            db.query(CompanyAsset)
            .options(selectinload(CompanyAsset.category), selectinload(CompanyAsset.allocations))
            .filter(CompanyAsset.business_id == business_id)
        )
        if category_id:
            query = query.filter(CompanyAsset.category_id == category_id)
        if status_filter:
            query = query.filter(CompanyAsset.current_status == status_filter)
        if search:
            term = f"%{search}%"
            query = query.filter(
                (CompanyAsset.asset_tag.ilike(term))
                | (CompanyAsset.name.ilike(term))
                | (CompanyAsset.serial_number.ilike(term))
                | (CompanyAsset.model.ilike(term))
            )
        return query.order_by(CompanyAsset.created_at.desc()).offset(skip).limit(limit).all()

    def get_asset_by_id(self, db: Session, business_id: int, asset_id: uuid.UUID) -> CompanyAsset:
        asset = (
            db.query(CompanyAsset)
            .options(
                selectinload(CompanyAsset.category),
                selectinload(CompanyAsset.allocations),
                selectinload(CompanyAsset.maintenance_records),
            )
            .filter(CompanyAsset.business_id == business_id, CompanyAsset.id == asset_id)
            .first()
        )
        if not asset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found.")
        return asset

    def update_asset(
        self, db: Session, business_id: int, asset_id: uuid.UUID, data: CompanyAssetUpdate
    ) -> CompanyAsset:
        asset = self.get_asset_by_id(db, business_id, asset_id)
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            if hasattr(v, "value"):
                v = v.value
            setattr(asset, k, v)
        db.commit()
        db.refresh(asset)
        return asset

    def delete_asset(self, db: Session, business_id: int, asset_id: uuid.UUID) -> None:
        asset = self.get_asset_by_id(db, business_id, asset_id)
        if asset.current_status == AssetStatusEnum.ASSIGNED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete an asset that is currently assigned to an employee.",
            )
        db.delete(asset)
        db.commit()

    # -----------------------------------------------------------------------
    # Allocations
    # -----------------------------------------------------------------------
    def allocate_asset(
        self,
        db: Session,
        business_id: int,
        handover_user_id: Optional[int],
        data: AssetAssignmentCreate,
    ) -> AssetAssignment:
        asset = self.get_asset_by_id(db, business_id, data.asset_id)
        if asset.current_status != AssetStatusEnum.AVAILABLE.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Asset is not available for assignment (current status: {asset.current_status}).",
            )

        emp = db.query(Employee).filter(Employee.business_id == business_id, Employee.id == data.employee_id).first()
        if not emp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

        payload = data.model_dump()
        payload["issue_condition"] = payload["issue_condition"].value if hasattr(payload["issue_condition"], "value") else payload["issue_condition"]

        assignment = AssetAssignment(
            business_id=business_id,
            handover_by_id=handover_user_id,
            status=AllocationStatusEnum.PENDING_ACKNOWLEDGEMENT.value,
            **payload,
        )
        asset.current_status = AssetStatusEnum.ASSIGNED.value

        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        return assignment

    def return_asset(
        self,
        db: Session,
        business_id: int,
        assignment_id: uuid.UUID,
        receiver_user_id: Optional[int],
        data: AssetAssignmentReturn,
    ) -> AssetAssignment:
        assignment = (
            db.query(AssetAssignment)
            .options(selectinload(AssetAssignment.asset))
            .filter(AssetAssignment.business_id == business_id, AssetAssignment.id == assignment_id)
            .first()
        )
        if not assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment record not found.")
        if assignment.status == AllocationStatusEnum.RETURNED.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Asset has already been returned.")

        ret_condition = data.return_condition.value if hasattr(data.return_condition, "value") else data.return_condition
        assignment.actual_return_date = data.actual_return_date
        assignment.return_condition = ret_condition
        assignment.return_notes = data.return_notes
        assignment.received_by_id = receiver_user_id
        assignment.status = AllocationStatusEnum.RETURNED.value

        # Update parent asset status
        asset = assignment.asset
        if asset:
            if ret_condition == "damaged":
                asset.current_status = AssetStatusEnum.DAMAGED.value
                asset.condition = "damaged"
            else:
                asset.current_status = AssetStatusEnum.AVAILABLE.value
                asset.condition = ret_condition

        db.commit()
        db.refresh(assignment)
        return assignment

    def acknowledge_asset(
        self,
        db: Session,
        business_id: int,
        assignment_id: uuid.UUID,
        data: AssetAssignmentAcknowledge,
    ) -> AssetAssignment:
        assignment = (
            db.query(AssetAssignment)
            .filter(AssetAssignment.business_id == business_id, AssetAssignment.id == assignment_id)
            .first()
        )
        if not assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment record not found.")

        st = data.status.value if hasattr(data.status, "value") else data.status
        assignment.status = st
        assignment.acknowledged_at = datetime.utcnow()
        if data.notes:
            assignment.issue_notes = (assignment.issue_notes or "") + f" [Emp Ack: {data.notes}]"

        db.commit()
        db.refresh(assignment)
        return assignment

    def get_allocations(
        self,
        db: Session,
        business_id: int,
        employee_id: Optional[uuid.UUID] = None,
        asset_id: Optional[uuid.UUID] = None,
        status_filter: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[AssetAssignment]:
        query = (
            db.query(AssetAssignment)
            .options(selectinload(AssetAssignment.asset), selectinload(AssetAssignment.employee))
            .filter(AssetAssignment.business_id == business_id)
        )
        if employee_id:
            query = query.filter(AssetAssignment.employee_id == employee_id)
        if asset_id:
            query = query.filter(AssetAssignment.asset_id == asset_id)
        if status_filter:
            query = query.filter(AssetAssignment.status == status_filter)

        return query.order_by(AssetAssignment.assigned_date.desc()).offset(skip).limit(limit).all()

    # -----------------------------------------------------------------------
    # Maintenance
    # -----------------------------------------------------------------------
    def create_maintenance(
        self,
        db: Session,
        business_id: int,
        reported_by_id: Optional[int],
        data: AssetMaintenanceCreate,
    ) -> AssetMaintenanceLog:
        asset = self.get_asset_by_id(db, business_id, data.asset_id)

        payload = data.model_dump()
        payload["issue_type"] = payload["issue_type"].value if hasattr(payload["issue_type"], "value") else payload["issue_type"]
        payload["status"] = payload["status"].value if hasattr(payload["status"], "value") else payload["status"]

        log = AssetMaintenanceLog(
            business_id=business_id,
            reported_by_id=reported_by_id,
            **payload,
        )
        asset.current_status = AssetStatusEnum.UNDER_MAINTENANCE.value

        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    def update_maintenance(
        self,
        db: Session,
        business_id: int,
        maintenance_id: uuid.UUID,
        data: AssetMaintenanceUpdate,
    ) -> AssetMaintenanceLog:
        log = (
            db.query(AssetMaintenanceLog)
            .options(selectinload(AssetMaintenanceLog.asset))
            .filter(AssetMaintenanceLog.business_id == business_id, AssetMaintenanceLog.id == maintenance_id)
            .first()
        )
        if not log:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance log not found.")

        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            if hasattr(v, "value"):
                v = v.value
            setattr(log, k, v)

        if "status" in update_data and log.asset:
            if update_data["status"] == MaintenanceStatusEnum.REPAIRED.value:
                log.asset.current_status = AssetStatusEnum.AVAILABLE.value
            elif update_data["status"] == MaintenanceStatusEnum.IRREPARABLE.value:
                log.asset.current_status = AssetStatusEnum.DAMAGED.value

        db.commit()
        db.refresh(log)
        return log

    def get_maintenance_logs(
        self,
        db: Session,
        business_id: int,
        asset_id: Optional[uuid.UUID] = None,
        status_filter: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[AssetMaintenanceLog]:
        query = (
            db.query(AssetMaintenanceLog)
            .options(selectinload(AssetMaintenanceLog.asset))
            .filter(AssetMaintenanceLog.business_id == business_id)
        )
        if asset_id:
            query = query.filter(AssetMaintenanceLog.asset_id == asset_id)
        if status_filter:
            query = query.filter(AssetMaintenanceLog.status == status_filter)

        return query.order_by(AssetMaintenanceLog.reported_date.desc()).offset(skip).limit(limit).all()

    # -----------------------------------------------------------------------
    # Employee Offboarding Exit Clearance Check
    # -----------------------------------------------------------------------
    def get_unreturned_assets_for_employee(
        self, db: Session, business_id: int, employee_id: uuid.UUID
    ) -> List[AssetAssignment]:
        """Check for unreturned assets during employee exit clearance."""
        return (
            db.query(AssetAssignment)
            .options(selectinload(AssetAssignment.asset))
            .filter(
                AssetAssignment.business_id == business_id,
                AssetAssignment.employee_id == employee_id,
                AssetAssignment.status.in_([
                    AllocationStatusEnum.PENDING_ACKNOWLEDGEMENT.value,
                    AllocationStatusEnum.ACTIVE.value,
                    AllocationStatusEnum.DISPUTED.value,
                ]),
            )
            .all()
        )

    # -----------------------------------------------------------------------
    # Overview Stats
    # -----------------------------------------------------------------------
    def get_assets_stats(self, db: Session, business_id: int) -> AssetOverviewStats:
        counts = (
            db.query(CompanyAsset.current_status, func.count(CompanyAsset.id))
            .filter(CompanyAsset.business_id == business_id)
            .group_by(CompanyAsset.current_status)
            .all()
        )
        status_map = {st: cnt for st, cnt in counts}
        total = sum(status_map.values())
        return AssetOverviewStats(
            total_assets=total,
            available_assets=status_map.get(AssetStatusEnum.AVAILABLE.value, 0),
            assigned_assets=status_map.get(AssetStatusEnum.ASSIGNED.value, 0),
            under_maintenance_assets=status_map.get(AssetStatusEnum.UNDER_MAINTENANCE.value, 0),
            damaged_assets=status_map.get(AssetStatusEnum.DAMAGED.value, 0),
        )
