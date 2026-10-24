"""
Seed Manager Service.
Handles batch generation and safe reverse-topological purge of seeded test data.
All actions are strictly scoped to the tenant business_id and logged in central registry.
"""
import uuid
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.modules.system_seed.models import SystemSeedBatch, SystemSeedRecord
from app.modules.system_seed.generators.vehicles_generator import seed_vehicles_data
from app.modules.system_seed.generators.hr_generator import seed_hr_data
from app.modules.system_seed.generators.ecommerce_generator import seed_ecommerce_data
from app.modules.system_seed.generators.finance_generator import seed_finance_data

# Import models for purge mapping
from app.modules.vehicles.models import (
    Driver,
    FuelLog,
    IncidentReport,
    MaintenanceSchedule,
    TelematicsEvent,
    TireLog,
    TripLog,
    Vehicle,
    VehicleRequisition,
    WorkOrder,
)
from app.modules.hr_payroll.organization.models import Department, JobTitle
from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.leave.models import LeaveType, LeaveAllocation
from app.modules.hr_payroll.roster.models import Shift
from app.modules.hr_payroll.attendance.models import Attendance
from app.modules.hr_payroll.performance.models import AppraisalCycle, EmployeeGoal

from app.modules.ecommerce.categories.models import Category
from app.modules.ecommerce.brands.models import Brand
from app.modules.ecommerce.products.models import Product, ProductVariant
from app.modules.ecommerce.inventory.models import Warehouse, InventoryItem
from app.modules.ecommerce.orders.models import Order, OrderItem
from app.modules.ecommerce.payments.models import Payment

from app.modules.finance.models import (
    Account,
    FiscalYear,
    FiscalPeriod,
    JournalVoucher,
    JournalEntry,
    Customer as FinanceCustomer,
    SalesInvoice,
    SalesInvoiceLine,
    MushakChallan,
)


MODULE_GENERATORS = {
    "hrm": seed_hr_data,
    "vehicles": seed_vehicles_data,
    "ecommerce": seed_ecommerce_data,
    "finance": seed_finance_data,
}

# Reverse topological deletion order for safe foreign key resolution
PURGE_ORDER = {
    "vehicles": [
        ("fleet_telematics_events", TelematicsEvent),
        ("fleet_fuel_logs", FuelLog),
        ("fleet_tire_logs", TireLog),
        ("fleet_work_orders", WorkOrder),
        ("fleet_maintenance_schedules", MaintenanceSchedule),
        ("fleet_incident_reports", IncidentReport),
        ("fleet_trip_logs", TripLog),
        ("fleet_vehicle_requisitions", VehicleRequisition),
        ("fleet_vehicles", Vehicle),
        ("fleet_drivers", Driver),
    ],
    "hrm": [
        ("employee_goals", EmployeeGoal),
        ("performance_cycles", AppraisalCycle),
        ("attendance", Attendance),
        ("shifts", Shift),
        ("leave_allocations", LeaveAllocation),
        ("leave_types", LeaveType),
        ("employees", Employee),
        ("job_titles", JobTitle),
        ("departments", Department),
    ],
    "ecommerce": [
        ("payments", Payment),
        ("order_items", OrderItem),
        ("orders", Order),
        ("inventory_items", InventoryItem),
        ("warehouses", Warehouse),
        ("product_variants", ProductVariant),
        ("products", Product),
        ("brands", Brand),
        ("categories", Category),
    ],
    "finance": [
        ("finance_mushak_challans", MushakChallan),
        ("finance_sales_invoice_lines", SalesInvoiceLine),
        ("finance_sales_invoices", SalesInvoice),
        ("finance_customers", FinanceCustomer),
        ("finance_journal_entries", JournalEntry),
        ("finance_journal_vouchers", JournalVoucher),
        ("finance_fiscal_periods", FiscalPeriod),
        ("finance_fiscal_years", FiscalYear),
        ("finance_accounts", Account),
    ],
}


class SeedManagerService:
    @staticmethod
    def get_seed_status(db: Session, business_id: int) -> Dict:
        """
        Returns live count of active seed records per module for the given business.
        """
        counts = {
            "hrm": 0,
            "vehicles": 0,
            "ecommerce": 0,
            "finance": 0,
            "total": 0,
        }

        module_counts = (
            db.query(SystemSeedRecord.module, func.count(SystemSeedRecord.id))
            .filter(SystemSeedRecord.business_id == business_id)
            .group_by(SystemSeedRecord.module)
            .all()
        )

        for mod, count in module_counts:
            if mod in counts:
                counts[mod] = count
            counts["total"] += count

        # Recent batches
        recent_batches = (
            db.query(SystemSeedBatch)
            .filter(SystemSeedBatch.business_id == business_id)
            .order_by(SystemSeedBatch.created_at.desc())
            .limit(10)
            .all()
        )

        batches_summary = [
            {
                "id": str(b.id),
                "batch_code": b.batch_code,
                "module": b.module,
                "status": b.status,
                "record_count": b.record_count,
                "created_at": b.created_at.isoformat() if b.created_at else None,
                "metadata_info": b.record_counts,
            }
            for b in recent_batches
        ]

        return {
            "business_id": business_id,
            "counts": counts,
            "recent_batches": batches_summary,
        }

    @staticmethod
    def generate_module_seed(
        db: Session, business_id: int, module: str, user_id: Optional[int] = None
    ) -> Dict:
        """
        Executes domain generator for specified module (or all) and records every row in seed registry.
        """
        target_modules = list(MODULE_GENERATORS.keys()) if module == "all" else [module]
        if not target_modules or any(m not in MODULE_GENERATORS for m in target_modules):
            raise ValueError(f"Invalid module: {module}. Must be one of: {list(MODULE_GENERATORS.keys())} or 'all'")

        total_records_created = 0
        details_by_module = {}

        for mod in target_modules:
            batch_code = f"BATCH-{mod.upper()}-{uuid.uuid4().hex[:8].upper()}"
            batch = SystemSeedBatch(
                batch_code=batch_code,
                business_id=business_id,
                module=mod,
                created_by_user_id=user_id,
                status="in_progress",
                record_counts={},
            )
            db.add(batch)
            db.flush()

            records_to_add: List[SystemSeedRecord] = []

            def log_record_closure(table_name: str, record_id: str):
                rec = SystemSeedRecord(
                    batch_id=batch.id,
                    business_id=business_id,
                    module=mod,
                    table_name=table_name,
                    record_id=str(record_id),
                )
                records_to_add.append(rec)

            generator_fn = MODULE_GENERATORS[mod]
            gen_counts = generator_fn(db, business_id, log_record_closure)

            # Bulk save seed registry records
            db.add_all(records_to_add)
            db.flush()

            batch.record_count = len(records_to_add)
            batch.status = "completed"
            batch.record_counts = gen_counts
            total_records_created += batch.record_count
            details_by_module[mod] = gen_counts

        db.commit()

        return {
            "message": f"Successfully generated seed data for {module}",
            "total_records": total_records_created,
            "modules": details_by_module,
        }

    @staticmethod
    def purge_module_seed(db: Session, business_id: int, module: str) -> Dict:
        """
        Safely deletes all seed data for specified module (or all) in reverse-topological order.
        Production records are strictly protected and untouched.
        """
        target_modules = list(PURGE_ORDER.keys()) if module == "all" else [module]
        if not target_modules or any(m not in PURGE_ORDER for m in target_modules):
            raise ValueError(f"Invalid module: {module}. Must be one of: {list(PURGE_ORDER.keys())} or 'all'")

        total_purged = 0
        details_by_table = {}

        for mod in target_modules:
            table_specs = PURGE_ORDER[mod]

            # Special case for HR: clear department head and parent relationships first to break circular FK
            if mod == "hrm":
                dept_records = (
                    db.query(SystemSeedRecord.record_id)
                    .filter(
                        SystemSeedRecord.business_id == business_id,
                        SystemSeedRecord.module == "hrm",
                        SystemSeedRecord.table_name == "departments",
                    )
                    .all()
                )
                if dept_records:
                    dept_uuids = [uuid.UUID(r[0]) for r in dept_records]
                    db.query(Department).filter(Department.id.in_(dept_uuids)).update(
                        {"head_employee_id": None, "parent_department_id": None},
                        synchronize_session=False,
                    )
                    db.flush()

            for table_name, model_cls in table_specs:
                rec_rows = (
                    db.query(SystemSeedRecord.record_id)
                    .filter(
                        SystemSeedRecord.business_id == business_id,
                        SystemSeedRecord.module == mod,
                        SystemSeedRecord.table_name == table_name,
                    )
                    .all()
                )
                if not rec_rows:
                    continue

                uuids = [uuid.UUID(r[0]) for r in rec_rows]

                # Scoped delete
                if hasattr(model_cls, "business_id"):
                    deleted = (
                        db.query(model_cls)
                        .filter(model_cls.business_id == business_id, model_cls.id.in_(uuids))
                        .delete(synchronize_session=False)
                    )
                else:
                    deleted = (
                        db.query(model_cls)
                        .filter(model_cls.id.in_(uuids))
                        .delete(synchronize_session=False)
                    )

                details_by_table[table_name] = deleted
                total_purged += deleted
                db.flush()

            # Delete seed registry records and batches for this module
            db.query(SystemSeedRecord).filter(
                SystemSeedRecord.business_id == business_id,
                SystemSeedRecord.module == mod,
            ).delete(synchronize_session=False)

            db.query(SystemSeedBatch).filter(
                SystemSeedBatch.business_id == business_id,
                SystemSeedBatch.module == mod,
            ).delete(synchronize_session=False)

            db.flush()

        db.commit()

        return {
            "message": f"Successfully purged seed data for {module}",
            "total_purged": total_purged,
            "details": details_by_table,
        }
