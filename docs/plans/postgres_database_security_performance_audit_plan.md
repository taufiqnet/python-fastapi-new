# PostgreSQL Database Security, Performance & Global Standards Audit Plan

## Goal Description
Conduct an end-to-end audit and optimization of the PostgreSQL database schema and data persistence layer across all modules in the ProERP platform (Identity, Multi-Tenancy, HR & Payroll, Ecommerce, POS, Inventory, Finance & Accounting, Healthcare, and Portal). The audit aims to enforce strict relational integrity (primary keys, foreign keys, check constraints, composite unique keys), eliminate circular dependency warnings, optimize query performance and connection pooling, eliminate N+1 query bottlenecks, harden database security according to OWASP Top 10 Database Risks, ISO 27001, and GDPR privacy standards, and establish safe, versioned Alembic migration procedures.

---

## User Review Required

> [!IMPORTANT]
> **Resolution of Circular Foreign Key Dependencies (`use_alter=True`)**:
> During schema reflection and table teardown, SQLAlchemy issues circular foreign key warnings between:
> - `departments.head_of_department_id -> employees.id` and `employees.department_id -> departments.id`
> - `branches.manager_id -> employees.id` and `employees.branch_id -> branches.id`
>
> **Action**: We will configure `use_alter=True` on `head_of_department_id` and `manager_id` foreign keys. This informs PostgreSQL and SQLAlchemy to defer foreign key constraint creation until both tables exist, eliminating circular dependency deadlocks during creation/drop/migration.

> [!WARNING]
> **Production Connection Pool Tuning (`app/database.py`)**:
> Currently, `engine` in `app/database.py` uses SQLAlchemy default connection pool settings without an explicit `pool_recycle` or bounded pool size. In production, idle connections can be terminated silently by firewalls or cloud gateways (e.g. AWS RDS 10-minute idle drop), causing broken pipe crashes.
>
> **Action**: We will configure:
> - `pool_size = 20` (standard baseline for enterprise load)
> - `max_overflow = 10`
> - `pool_recycle = 1800` (recycles connections older than 30 minutes)
> - `pool_pre_ping = True` (validates socket liveness before query execution)

> [!NOTE]
> **Alembic Version Tracking Baseline**:
> The repository includes `alembic/env.py` wired to `app.models_registry`, but `alembic/versions` has not yet been initialized. We will generate the baseline initial migration script to ensure all subsequent DDL operations are version-controlled, reproducible, and reversible.

---

## Schema Architecture & Relational Topology

```mermaid
graph TD
    subgraph Multi-Tenancy & Identity Core
        BIZ[business_profiles]
        USR[users]
        ROL[roles]
        PRM[permissions]
        PLAN[subscription_plans]
    end

    subgraph HR & Statutory Labour (BLA 2006)
        EMP[employees]
        DEP[departments]
        JOB[job_titles]
        ATT[attendance]
        LEV[leave_applications]
        PAY[payroll_records]
        DOC[employee_documents]
        SEP[employee_separations]
    end

    subgraph Ecommerce, POS & Supply Chain
        PRD[products]
        VAR[product_variants]
        INV[inventory_items]
        ORD[orders]
        POS[pos_sessions]
        GRN[goods_received_notes]
    end

    subgraph Financial Accounting & Tax (NBR)
        ACC[chart_of_accounts]
        VOU[journal_vouchers]
        ENT[journal_entries]
        INV_F[sales_invoices]
        MUS[mushak_challans]
    end

    BIZ --> USR
    BIZ --> EMP
    BIZ --> PRD
    BIZ --> ACC
    BIZ --> PLAN

    EMP --> ATT
    EMP --> LEV
    EMP --> PAY
    EMP --> DOC
    EMP --> SEP
    DEP -.->|use_alter=True| EMP

    PRD --> VAR --> INV
    ORD --> POS
    VAR --> GRN

    VOU --> ENT
    ACC --> ENT
    INV_F --> MUS
```

---

## Audit Dimensions & Methodology

### 1. Schema Hardening & Data Integrity Audit
- **Check Constraints for Domain Validity**:
  - Financial & Inventory Non-Negativity: Add database-level `CheckConstraint` ensuring non-negative values (`CHECK (price >= 0)`, `CHECK (cost >= 0)`, `CHECK (quantity >= 0)`, `CHECK (debit >= 0)`, `CHECK (credit >= 0)`).
  - Chronological Sanity: `CHECK (start_date <= end_date)` across employee contracts, leave applications, fiscal periods, and probation reviews.
  - VAT & Tax Rates: `CHECK (tax_rate >= 0 AND tax_rate <= 100)`.
- **Multi-Tenant Composite Unique Constraints**:
  - Guarantee multi-tenant scoping so code collisions don't occur across businesses while preventing duplicates within a business:
    - `UniqueConstraint("business_id", "code", name="uq_department_biz_code")`
    - `UniqueConstraint("business_id", "code", name="uq_job_title_biz_code")`
    - `UniqueConstraint("business_id", "employee_id", name="uq_employee_biz_id")`
    - `UniqueConstraint("business_id", "sku", name="uq_product_sku_biz")`
    - `UniqueConstraint("business_id", "voucher_no", name="uq_voucher_no_biz")`
    - `UniqueConstraint("business_id", "challan_no", name="uq_mushak_challan_biz")`
- **Referential Integrity & Cascades**:
  - Audit `ondelete` policies across all 80+ models:
    - Parent-child ownership items (e.g. `Invoice` -> `InvoiceLines`, `Voucher` -> `JournalEntries`, `Order` -> `OrderItems`) use `ondelete="CASCADE"`.
    - Legal/statutory audit records (e.g. `Account`, `FiscalYear`, `Employee`, `PayrollRecord`) use `ondelete="RESTRICT"` to prevent accidental loss of historical records.

### 2. Performance, Indexing & Query Optimization Audit
- **Foreign Key Indexing**:
  - PostgreSQL does NOT automatically index foreign key columns. Unindexed foreign keys trigger sequential table scans on parent table updates/deletions. We will audit and add explicit indexes to all foreign key columns.
- **Tenant Filtering Compound Indexes**:
  - 95%+ of queries filter by `business_id` and sort by `created_at` or filter by `is_active`. We will add compound B-Tree indexes:
    - `Index("ix_employees_biz_status", "business_id", "is_active")`
    - `Index("ix_attendance_biz_date", "business_id", "attendance_date")`
    - `Index("ix_orders_biz_status_date", "business_id", "order_status", "created_at")`
    - `Index("ix_journal_entries_biz_account", "business_id", "account_id")`
- **Elimination of N+1 Query Patterns**:
  - Audit and apply `selectinload` or `joinedload` on core high-volume relationships (Employee -> Department/Designation, SalesInvoice -> Lines -> Account, Order -> Items -> Variant).
- **Connection Pool Tuning**:
  - Optimize `app/database.py` with `pool_size=20`, `max_overflow=10`, `pool_recycle=1800`, and `pool_pre_ping=True`.

### 3. Security, Privacy & Compliance (OWASP, ISO 27001, GDPR)
- **Least-Privilege Role Segregation**:
  - Document and provide scripts for segregating PostgreSQL roles:
    - `proerp_ddl`: Owner role used strictly for running migrations.
    - `proerp_app`: Runtime application role granted only `SELECT, INSERT, UPDATE, DELETE` on tables and `USAGE, SELECT` on sequences. No `DROP TABLE`, `TRUNCATE`, or `ALTER TABLE` privileges.
- **PII & Sensitive Data Protection (GDPR / ISO 27001)**:
  - Identify PII columns (National ID, TIN, Bank Account Numbers, Passport, Healthcare Patient Details).
  - Verify password hashing security (Passlib bcrypt with cost factor 12).
  - Mask sensitive credentials (`PaymentGatewayConfig.secret_key`, `BiometricDevice.comm_key`) from query logs and API serialization.
- **SQL Injection Prevention**:
  - Audit all repositories and services to verify 100% adherence to parameterized SQLAlchemy constructs, eliminating raw string interpolation.
- **Ledger Immutability**:
  - Verify that posted General Ledger journal entries (`JournalEntry`) and generated Mushak 6.3 challans (`MushakChallan`) enforce write-once, append-only rules.

### 4. Migration & Backup Disaster Recovery Strategy
- **Alembic Migration Standards**:
  - Generate baseline revision in `alembic/versions`.
  - Guidelines for non-blocking DDL:
    - Index creation on production tables using `CREATE INDEX CONCURRENTLY`.
    - Adding new columns as `nullable=True` first, backfilling, then altering to `nullable=False`.
- **Automated Backup & PITR Protocol**:
  - Provide a standardized production backup script utilizing `pg_dump -Fc` (custom archive format) and PostgreSQL WAL archiving for point-in-time recovery.

---

## Proposed Changes

### Component 1: Relational Hardening & Model Integrity

#### [MODIFY] `app/modules/hr_payroll/organization/models.py`
- Add `use_alter=True` on `head_of_department_id` in `Department` and `manager_id` in `Branch` to eliminate circular dependency warnings.
- Add composite unique constraints on `(business_id, code)` for departments, job titles, and branches.

#### [MODIFY] `app/modules/hr_payroll/payroll/models.py`
- Add `CheckConstraint("net_salary >= 0", name="chk_payroll_net_salary_non_negative")` on `PayrollRecord`.
- Add compound index on `(business_id, payroll_period_id)` and `(business_id, employee_id)`.

#### [MODIFY] `app/modules/ecommerce/inventory/models.py`
- Add check constraints ensuring non-negative quantities on `InventoryItem` and `CostLayer`.
- Ensure compound index on `(business_id, item_id, warehouse_id)`.

#### [MODIFY] `app/modules/finance/models.py`
- Add check constraints `CHECK (debit >= 0)` and `CHECK (credit >= 0)` on `JournalEntry`.
- Add compound index on `(business_id, voucher_id)` and `(business_id, account_id)`.

---

### Component 2: Connection Pool Tuning

#### [MODIFY] `app/database.py`
- Tune `create_engine` parameters:
  ```python
  engine = create_engine(
      settings.database_url,
      pool_size=20,
      max_overflow=10,
      pool_recycle=1800,
      pool_pre_ping=True,
  )
  ```

---

### Component 3: Database Administration & Security Scripts

#### [NEW] `scripts/db_security_hardening.sql`
- Creates least-privilege PostgreSQL roles (`proerp_app` and `proerp_ddl`).
- Revokes default public schema creation privileges.
- Grants explicit permissions (`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO proerp_app`).

#### [NEW] `scripts/pg_backup.sh`
- Production automated backup script with `pg_dump`, gzip compression, retention cleanup (7 daily, 4 weekly, 12 monthly), and integrity verification.

---

### Component 4: Schema & Performance Automated Test Suite

#### [NEW] `tests/test_database_integrity_audit.py`
- Test table existence and schema reflection across all registered models.
- Test circular dependency elimination (clean `Base.metadata.create_all()` and `drop_all()` without `SAWarning`).
- Test multi-tenant unique constraints (asserting duplicate codes within same business fail, but identical codes across different businesses succeed).
- Test check constraint enforcement (negative salary, negative inventory quantity, negative debit/credit raise `IntegrityError`).
- Test foreign key cascade behavior (cascade delete child items, restrict deletion on posted vouchers/employees).
- Test connection pool configuration and pre-ping liveness.

---

## Verification Plan

### Automated Tests
1. **Database Schema & Constraints Audit Test**:
   ```powershell
   .\venv\Scripts\pytest.exe tests/test_database_integrity_audit.py -v
   ```
2. **Regression Verification Across Existing Test Suite**:
   ```powershell
   .\venv\Scripts\pytest.exe tests/test_hr_roles_and_permissions.py tests/test_hr_payroll_documents.py -v
   ```

### Manual & Operational Verification
- Verify that `SAWarning` regarding circular foreign key dependencies between departments/employees/branches is completely eliminated during test runs.
- Run `EXPLAIN ANALYZE` on indexed multi-tenant queries to confirm index scan utilization.
- Review and approve the final Database Audit & Benchmark Report artifact.
