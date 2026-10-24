# Implementation Plan: Unified Multi-Module Seed Data Generation & One-Click Purge System

**Module**: System Administration & Testing Infrastructure  
**Target Platform**: ProERP Enterprise SaaS Platform  
**Target Modules**:
1. 👥 **HR & Payroll** (`hrm`)
2. 🚗 **Vehicle & Fleet Management** (`vehicles`)
3. 🛒 **E-Commerce & Retail / POS** (`ecommerce`)
4. 💳 **Finance & Accounts** (`finance`)
**Status**: Proposal & Architecture Review (Awaiting User Feedback & Approval)

---

## 1. Goal Description

For enterprise demonstrations, testing, training, and QA validation, developers and tenant administrators frequently need realistic, interconnected sample data (employees, vehicles, products, accounts, and transactions). 

However, in production SaaS systems, test data must **never** permanently pollute real tenant databases or risk accidental deletion of live business records.

This plan designs a **Unified Test Seed Management Console** that allows Superusers / System Administrators to:
1. **Selectively Generate Seed Data** per module with explicit confirmation modals.
2. **Strictly Flag and Track** all generated rows via a central audit registry (`system_seed_batches` & `system_seed_records`) and distinguishable `SEED-` naming conventions.
3. **Purge Seed Data with One Click** either per module (e.g. "Purge Vehicle Data Only") or globally across all modules in exact foreign-key safe reverse dependency order without touching real production/tenant records.

---

## 2. User Review Required

> [!IMPORTANT]
> **Tenant Scoping & Safety Isolation**:
> All seed data generation and deletion will be strictly scoped by `business_id`. Superadmins can select which tenant workspace (e.g. WBSOFT Technologies or any other tenant) receives the seed data. Seeding or purging tenant A will never affect tenant B.

> [!NOTE]
> **Registry-Based Zero-Orphan Tracking**:
> Rather than modifying dozens of existing database tables with new columns, we introduce a central tracking registry (`system_seed_batches` and `system_seed_records`). Every primary key (UUID or Integer) generated during a seed run is recorded in this registry. When purging, the service queries this registry and deletes only the exact recorded records in topological reverse-order.

---

## 3. Seed Data Specification by Module

### A. HR & Payroll (`hrm`)
- **Master Data**: 5 Departments (Engineering, HR, Finance, Operations, Sales), 5 Job Titles.
- **Employees**: 5 Realistic Bangladesh staff (`SEED-EMP-101` to `SEED-EMP-105`) with BLA 2006 statutory salary breakdowns (Basic 50%, House Rent 25%, Medical 10%, Conveyance 15%).
- **Time & Attendance**: 3 Shift Rotas (Morning 09:00-18:00, Evening 14:00-22:00, General), 30 days of attendance logs with overtime and biometric punch records.
- **Leave Governance**: 4 Statutory Leave Types (Casual, Sick, Earned Annual, Maternity), Quota Allocations, and Sample Leave Applications.
- **Payroll**: Active Payroll Period with computed payslips and salary certificates.
- **Performance & Lifecycle**: Appraisal Cycle ("Annual Review 2026"), Goals & KPIs, and Sample Probation Confirmation.

### B. Vehicle & Fleet Management (`vehicles`)
- **BRTA Fleet Vehicles**: 4 Vehicles (Executive Sedan, Microbus HiAce, Covered Delivery Van, 4x4 SUV) with BRTA plates (e.g. `SEED-DHK-GA-11-2233`), fitness certificate, tax token, and route permit dates.
- **Drivers**: 3 Licensed Drivers (`SEED-DRV-01` to `SEED-DRV-03`) with License Grades (Light, Medium, Heavy) and expiry tracking.
- **Operations**:
  - 3 Vehicle Requisitions (Airport VIP transfer, Factory transit, Delivery).
  - 4 Trip Logs with GPS odometer readings, start/end locations, and route status.
  - 4 Fuel Logs with Octane/Diesel liters, unit rate, and fuel station receipt references.
  - 2 Work Orders & Preventative Maintenance Schedules (Mobil oil change, Brake overhaul).
  - 4 Tire Inspection Logs.

### C. E-Commerce & Retail / POS (`ecommerce`)
- **Catalog**:
  - Categories (Electronics, Computers, Office Essentials, Apparel).
  - Brands (ProTech, NexaGear, ApexLine).
  - 6 Products with SKUs (`SEED-SKU-001` to `SEED-SKU-006`), Barcodes, and VAT rules.
- **Inventory & Warehouses**:
  - 2 Warehouses: Central Main Warehouse (Dhaka), Regional Logistics Depot (Chittagong).
  - Stock levels, Unit of Measure (UoM) conversions, and Lot/Serial tracking.
- **Orders & POS**:
  - 3 Customers with delivery addresses.
  - 4 Sample Orders (Online Cart Orders & Walk-in POS Orders) with payments and status history.

### D. Finance & Accounts (`finance`)
- **Chart of Accounts**: Standard Bangladesh 4-level Uniform Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expenses).
- **Fiscal Year**: FY 2025-2026 with 12 open monthly fiscal periods.
- **Vouchers**: Opening Balance Journal Voucher, Bank Payment Voucher, Petty Cash Voucher.
- **Tax & Compliance**: Sample Sales Invoices and Mushak 6.3 VAT Challans (`SEED-MUSHAK-001`).

---

## 4. Proposed Changes

```
[ Frontend: /administration/seed-data ]
                     │
    1. Select Module(s) & Tenant
    2. Click "Generate Seed Data" (Opens Confirmation Modal)
    3. Admin types "GENERATE" and submits
                     │
                     ▼
  POST /api/v1/system/seed-data/generate
                     │
    ┌────────────────┴────────────────────────┐
    ▼                                         ▼
[ app/modules/system_seed/service.py ]    [ Log IDs into system_seed_records ]
  - Runs module seed generators             - table: "employees", id: "uuid-1"
  - Commits in clean transaction            - table: "vehicles", id: "1"
                                            - table: "products", id: "10"
                     │
    To Purge: Admin clicks "Purge Seed Data"
    DELETE /api/v1/system/seed-data/purge?module=vehicles
                     │
                     ▼
[ Deletes only rows logged in system_seed_records in reverse dependency order ]
```

### Backend Components

#### [NEW] `app/modules/system_seed/models.py`
- `SystemSeedBatch`: Tracks each seed generation run (`id`, `batch_code`, `module`, `business_id`, `record_counts`, `created_at`).
- `SystemSeedRecord`: Tracks individual created entity row (`id`, `batch_id`, `table_name`, `record_id`, `module`).

#### [NEW] `app/modules/system_seed/service.py`
- `SeedManagerService`:
  - `generate_seed(db, business_id, modules: list[str]) -> SeedBatchSummary`
  - `purge_seed(db, business_id, module: str | None = None) -> PurgeSummary`
  - `get_seed_status(db, business_id) -> dict` (Counts of active seed records per module)

#### [NEW] `app/modules/system_seed/generators/`
- `hr_generator.py`: Generates HR & Payroll seed entities.
- `vehicles_generator.py`: Generates Fleet seed entities.
- `ecommerce_generator.py`: Generates Products, Inventory, Orders.
- `finance_generator.py`: Generates Accounts, Periods, Vouchers.

#### [NEW] `app/modules/system_seed/router.py`
- `GET /api/v1/system/seed-data/status` (Get current seed records count per module)
- `POST /api/v1/system/seed-data/generate` (Generate seed data with confirmation flag)
- `DELETE /api/v1/system/seed-data/purge` (Purge seed data by module or all)
- Guarded by `Depends(get_current_admin)`.

#### [MODIFY] `app/api/v1/api.py`
- Mount `seed_data_router` under `/api/v1`.

---

### Frontend Components

#### [NEW] `frontend/src/app/administration/seed-data/page.tsx`
- Administration Seed Data Management Console:
  - **Module Cards**: 4 Cards for HR & Payroll, Vehicle Management, E-Commerce, and Finance & Accounts.
  - **Live Count Badges**: Shows active seed records currently in the database per module.
  - **Action Controls**:
    - "Generate All Modules" button.
    - "Generate Single Module" button on each card.
    - "Purge Module Seed" button on each card.
    - "Purge All Seed Data" master button.
  - **Confirmation Dialog**:
    - Modal showing exactly what will be created or deleted.
    - Requires typing "CONFIRM" or "DELETE" to prevent accidental clicks in production.

#### [MODIFY] `frontend/src/components/layout/sidebar.tsx`
- Add `Demo & Seed Data` link under `Administration` section (`superuserOnly: true`).

---

## 5. Verification Plan

### Automated Tests
1. **Backend Tests** (`tests/test_system_seed_generation_and_purge.py`):
   - Test generating seed data for `hrm`, `vehicles`, `ecommerce`, `finance`.
   - Verify registry logging in `system_seed_records`.
   - Test one-click purging for a single module (e.g. `vehicles`) and verify real/non-seed data is untouched.
   - Test purging all modules and verify total cleanup with 0 orphan rows.
   - Verify non-admin receives 403 Forbidden.
2. **Frontend Tests** (`frontend/src/app/administration/seed-data/__tests__/seed-data.test.tsx`):
   - Test rendering of status counts for all 4 modules.
   - Test confirmation modal interaction and generation trigger.
   - Test purge button click and API call.

### Manual Verification
1. Log in as Superadmin (`admin@example.com` or admin account).
2. Navigate to `http://127.0.0.1:3000/administration/seed-data`.
3. Click "Generate Seed Data" for **Vehicle Management** -> Confirm modal.
4. Go to `/fleet` -> Verify 4 vehicles with BRTA plates and driver profiles appear.
5. Return to `/administration/seed-data` -> Click "Purge Vehicle Seed Data" -> Confirm.
6. Verify `/fleet` catalog returns to clean initial state.
