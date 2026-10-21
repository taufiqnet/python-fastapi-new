# SaaS Platform — Core + Multi-Product Modular Backend Structure

*(Supersedes `ecommerce-fastapi-structure.md` — that document is fully preserved below as the Ecommerce module spec; this version wraps it in the platform-wide architecture: Core, multi-tenancy, module entitlements, and the upcoming HR & Payroll, Finance & Accounts, Procurement, Pharmacy, and Project Management modules. **Inventory is deliberately NOT a shared module** — Ecommerce, Pharmacy, and the standalone Inventory Management product each own a fully separate inventory implementation; see Part B.)*

A modular-monolith FastAPI platform where **Ecommerce**, **Inventory Management**, **Procurement**, **HR & Payroll**, **Finance & Accounts**, **Pharmacy Management**, and **Project Management** are independently sellable products sharing one codebase, one deploy, and a common Core layer — until a specific module earns the cost of being split out (see the microservices discussion earlier in this conversation).

---

## 1. Platform Overview

```
                         ┌─────────────────────────────┐
                         │           core/              │
                         │  identity · tenancy · billing │
                         │  notifications · audit · files │
                         └───────────────┬───────────────┘
                                         │  every module depends on core
       ┌────────────────────┬────────────┴───────────┬────────────────────┐
       │                    │                         │                    │
┌──────▼───────┐    ┌───────▼────────┐        ┌───────▼────────┐   ┌───────▼──────────┐
│  ecommerce/   │    │  pharmacy/      │        │ inventory_      │   │  procurement/     │
│  ├─ catalog/   │    │  ├─ drug_registry│       │ management/      │   │ (writes stock via │
│  └─ inventory/ │    │  └─ inventory/   │       │ (standalone,      │   │  an adapter into   │
│    (own stock,  │    │    (own stock,   │       │  sellable product, │   │  whichever inventory│
│    own tables)   │    │    own tables)    │       │  own tables)        │   │  module is active   │
└──────────────────┘    └──────────────────┘        └────────────────────┘   └──────────────────────┘

      Each inventory implementation below is fully independent — separate
      tables, separate Postgres schema, separate service.py. No shared
      inventory module or shared inventory database table. See Part B.
```

**Rule of thumb:** a module may call another module's **service layer** (e.g. `ecommerce.orders.service` calling `ecommerce.inventory.service.reserve_stock(...)`), but must never import another module's **models.py** directly or join across schemas in raw SQL. As of this update, **Inventory is no longer a single shared module** — each product that needs stock tracking owns its own inventory implementation (Part B), removing one whole category of cross-module coupling, at the cost of some duplicated logic (handled via shared code-level patterns, never shared runtime tables).

---

## 2. Top-Level Project Structure (updated)

```
platform-backend/
│
├── app/
│   ├── main.py                     # FastAPI app instance, mounts all module routers
│   ├── config.py                   # Settings (pydantic BaseSettings), env vars
│   ├── database.py                 # SQLAlchemy engine/session, Base declarative
│   ├── dependencies.py             # get_db, get_current_user, get_current_business,
│   │                                #   require_module("<module_name>")
│   │
│   ├── core/                        # ← NEW: platform-wide, every module depends on this
│   │   ├── identity/                #   users, auth, roles/permissions (RBAC)
│   │   ├── tenancy/                  #   Business/Organization, tenant settings
│   │   ├── billing/                    #   Plan, TenantSubscription, module entitlements
│   │   ├── notifications/
│   │   ├── audit/
│   │   ├── files/                          # shared file/media storage
│   │   ├── security.py                       # JWT, OAuth2, password hashing
│   │   ├── permissions.py                      # RBAC / role checks
│   │   ├── exceptions.py
│   │   ├── logging.py
│   │   └── pagination.py
│   │
│   ├── common/
│   │   ├── models.py                # TimestampMixin, SoftDeleteMixin, UUIDMixin, TenantMixin
│   │   ├── schemas.py                # PaginatedResponse, APIResponse
│   │   └── enums.py                  # Status, Currency, etc.
│   │
│   ├── modules/
│   │   ├── ecommerce/                # ← see Part A below (unchanged design)
│   │   │   ├── sellers/ catalog/ categories/ pricing/ cart/ orders/
│   │   │   │   payments/ shipping/ reviews/ wishlist/ promotions/
│   │   │   │   search/ returns/ disputes/ admin/
│   │   │   └── inventory/              # ← ecommerce-OWNED stock tracking, Part B §4.1
│   │   │       ├── models.py schemas.py router.py service.py
│   │   │
│   │   ├── inventory_management/     # ← standalone sellable product, Part B §4.3
│   │   │   ├── models.py schemas.py router.py service.py
│   │   │
│   │   ├── procurement/              # ← Part C: build order #4
│   │   │   ├── suppliers/ purchase_orders/
│   │   │   ├── goods_receipt/          # writes stock via adapter, Part B §4.5
│   │   │   └── adapters.py
│   │   │
│   │   ├── hr_payroll/               # ← Part C, detailed in §5.1 (build order #5)
│   │   │   ├── organization/           # Department, JobTitle
│   │   │   ├── employees/               # Employee (profile, employment, reporting line)
│   │   │   ├── attendance/               # Attendance (check-in/out, work/overtime hours)
│   │   │   ├── leave/                     # LeaveType, LeaveApplication, LeaveAllocation
│   │   │   ├── holidays/                   # Holiday (public/festival/company calendar)
│   │   │   ├── compensation/                # EmployeeSalary (per-employee salary structure)
│   │   │   ├── payroll_periods/              # PayrollPeriod (draft → processing → locked → paid)
│   │   │   ├── payslips/                      # PayrollRecord (per-employee payslip per period)
│   │   │   └── audit/                          # HRM-scoped audit trail, mirrors core/audit
│   │   │
│   │   ├── finance_accounts/         # ← Part C
│   │   │   ├── chart_of_accounts/ journal_entries/ invoices/
│   │   │   │   ledgers/ tax_filings/
│   │   │
│   │   ├── pharmacy/                 # ← Part C
│   │   │   ├── prescriptions/ drug_registry/
│   │   │   └── inventory/              # ← pharmacy-OWNED stock tracking, Part B §4.2
│   │   │       ├── models.py schemas.py router.py service.py
│   │   │
│   │   └── project_management/       # ← Part C, mostly standalone
│   │       ├── projects/ tasks/ sprints/ timesheets/
│   │
│   └── tests/
│       └── ... (mirrors modules/ structure)
│
├── alembic/
│   ├── versions/
│   └── env.py                        # one Postgres schema per module — see Section 8
│
├── .env
├── requirements.txt
└── docker-compose.yml
```

Every module (including new ones) still follows the same internal vertical-slice pattern:

```
modules/<product>/<domain>/
├── __init__.py
├── models.py        # SQLAlchemy ORM models
├── schemas.py        # Pydantic request/response DTOs
├── router.py          # APIRouter, gated by require_module("<product>")
├── service.py          # business logic — the only layer other modules may call into
├── repository.py        # DB query layer (optional)
└── exceptions.py
```

---

## 3. `core/` — Platform Modules (new)

### 🔹 `core/identity/`
**models.py**
- `User` — id, email, hashed_password, full_name, is_active, is_verified
- `Role`, `Permission`, `UserRole` — RBAC, scoped per business
- `RefreshToken`, `PasswordResetToken`, `OAuthAccount`

**schemas.py**
- `UserCreate/Update/Out`, `LoginRequest`, `TokenResponse`, `RoleAssignRequest`

### 🔹 `core/tenancy/`
**models.py**
- `Business` — id (int, matches existing `business_id` FK pattern), name, slug, plan_tier, region, status
- `BusinessSettings` — business_id, timezone, currency, feature_flags (JSON)
- `BusinessMember` — business_id, user_id, role (owner/admin/staff)

**schemas.py**
- `BusinessCreate/Out`, `BusinessSettingsUpdate`, `BusinessMemberInvite`

### 🔹 `core/billing/` — the module that makes "sold separately" work
**models.py**
- `Plan` — name, price, billing_interval, included_modules (JSON list)
- `TenantSubscription` — business_id, module (enum: ecommerce/inventory/procurement/hr_payroll/finance_accounts/pharmacy/project_management), plan_id, status, current_period_end
- `Invoice`, `PaymentMethod` (platform-level billing, distinct from `ecommerce/payments` which handles *customer* checkout payments)

**schemas.py**
- `PlanOut`, `SubscriptionCreate/Out`, `EntitlementCheckResponse`

**Key dependency, used by every module's router:**
```python
# app/dependencies.py
def require_module(module_name: str):
    async def checker(
        business = Depends(get_current_business),
        db = Depends(get_db),
    ):
        active = await billing_service.has_active_entitlement(db, business.id, module_name)
        if not active:
            raise HTTPException(403, f"'{module_name}' module is not active on this plan")
        return business
    return checker
```
```python
# app/modules/inventory/router.py
router = APIRouter(dependencies=[Depends(require_module("inventory"))])
```
This is what lets one deployed app serve a customer who bought *only* Inventory, a customer who bought the full Ecommerce+Inventory bundle, and a customer piloting Pharmacy — from the same codebase, gated per-route.

### 🔹 `core/notifications/`, `core/audit/`, `core/files/`
Same shape as the original `modules/notifications/` and `modules/admin/AuditLog` from the ecommerce doc — promoted to `core/` since every product module needs them (a payroll run, a purchase order approval, and an order shipment all trigger notifications and audit entries the same way).

---

## 4. Part B — Three Separate Inventory Implementations (updated)

Per your direction, Inventory is **no longer a single shared module**. Ecommerce, Pharmacy, and the standalone Inventory Management product each own their own stock tracking — own tables, own Postgres schema, own `service.py`, zero runtime coupling between them. This trades a little duplicated logic (addressed in §4.4) for full domain isolation, which matters here because pharmacy's regulatory requirements were already pulling a "shared" design in a direction ecommerce and procurement didn't need.

### 4.1 `ecommerce/inventory/` — owned by Ecommerce
FKs directly to `ecommerce.catalog.ProductVariant`. Same shape we already built together:
- `Warehouse`, `InventoryItem` (unique on `variant_id` + `warehouse_id`, optimistic `version_id` locking), `StockReservation` (`cart_id`/`order_id`, `expires_at`), `StockMovement` (`delta`, `reason`, `unit_cost`, `actor_id`, `idempotency_key`)
- `ecommerce/orders/service.py` calls `ecommerce.inventory.service.reserve_stock(...)` directly, in-process — same bounded context, no adapter needed.

### 4.2 `pharmacy/inventory/` — owned by Pharmacy
FKs to `pharmacy.drug_registry.Drug` — **not** to `ecommerce.ProductVariant**, since Pharmacy must work for tenants who never bought Ecommerce. Regulatory fields live here natively instead of as optional columns bolted onto a shared table:
- `Warehouse`, `DrugBatch` (`batch_number`, `expiry_date`, `controlled_substance_schedule`, `lot_recall_status`), `InventoryItem` (`drug_id` + `batch_id` + `warehouse_id`), `StockMovement` (adds `prescription_id`, `dispensed_by`; `actor_id` is mandatory here — pharmacy can't allow anonymous/system-only movements the way ecommerce restocks can)
- `pharmacy/prescriptions/service.py` calls `pharmacy.inventory.service.dispense(...)`, which picks the batch internally (FEFO — first-expire-first-out) before delegating to its own `reserve_stock`.

### 4.3 `inventory_management/` — the standalone sellable product
What a customer who buys **only** Inventory Management gets — no dependency on Ecommerce's `ProductVariant` or Pharmacy's `Drug` at all:
- `Warehouse`, `Sku` (id, sku_code, name, uom — a generic trackable item), `InventoryItem`, `StockReservation`, `StockMovement`, plus what a standalone product needs to stand on its own: `Supplier`, `ReorderRule`, `CycleCount` (periodic stock-take/reconciliation)
- This is the most feature-complete of the three, since it's the one being sold on its own merits rather than supporting another product.

### 4.4 Avoiding duplicated logic without sharing runtime state
Three implementations means the *reserve → commit/release* state machine and optimistic-locking pattern get written three times. Keep that DRY at the **code level**, never the **data level**:

```python
# app/common/inventory_base.py
class StockLedgerMixin:
    """Shared columns/behavior for any module's InventoryItem — a pattern
    each module's own model inherits, not a shared table."""
    quantity_on_hand: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    quantity_reserved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    version_id: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class BaseInventoryService:
    """Shared reserve/commit/release state-machine logic each module's
    InventoryService subclasses and points at its own tables/models."""
    async def _reserve(self, item, qty, expires_at): ...
    async def _commit(self, reservation): ...
    async def _release(self, reservation): ...
```
`ecommerce.inventory.service.InventoryService`, `pharmacy.inventory.service.InventoryService`, and `inventory_management.service.InventoryService` each inherit `BaseInventoryService` and plug in their own model classes — same battle-tested concurrency/reservation logic, zero shared tables, zero cross-module FKs.

### 4.5 Procurement integrates via an adapter, not a direct dependency
`procurement/goods_receipt/` needs to write "stock arrived" into *whichever* inventory the tenant actually has active — `ecommerce.inventory`, `pharmacy.inventory`, or `inventory_management`, depending on that business's subscription.

```python
# app/modules/procurement/adapters.py
def get_inventory_adapter(business: Business) -> InventoryAdapterProtocol:
    if business.has_module("pharmacy"):
        return PharmacyInventoryAdapter()
    if business.has_module("ecommerce"):
        return EcommerceInventoryAdapter()
    return StandaloneInventoryAdapter()
```
Each adapter implements one small shared `Protocol` (`receive_stock(sku_ref, warehouse_id, qty, unit_cost)`), so `goods_receipt/service.py` never needs to know which concrete inventory module it's actually talking to.

### 4.6 One deliberate exception to flag: `Warehouse`
A warehouse is a physical *location*, not inventory logic — a tenant running both Ecommerce and Pharmacy in the same building would otherwise maintain two disconnected warehouse lists for one real place. Two options:

- **Fully separated (what's specified above, per your instruction):** each module keeps its own `Warehouse` table. Zero coupling, simplest to reason about; a multi-module tenant manages warehouse master data twice.
- **Shared reference only, if it ever becomes annoying:** promote `Warehouse` to `core/facilities/`, and each module's `InventoryItem` FKs to `core.facilities.Warehouse.id` while `StockMovement`, `StockReservation`, and item identity all stay fully separated per module. This shares only an address book, never stock logic or state.

Default to fully separated as built above; revisit `core/facilities/` only if duplicate warehouse admin becomes a real operational annoyance for multi-module tenants.

---

## 5. Part C — Upcoming Modules (high-level stubs, to detail when you're ready to build each)

### 🔹 `modules/procurement/`
**models.py**
- `Supplier` — name, contact_info, payment_terms, rating
- `PurchaseOrder` — supplier_id, warehouse_id, status, expected_date, total_amount
- `PurchaseOrderItem` — po_id, variant_id (or a procurement-local `sku_id`), qty_ordered, unit_cost
- `GoodsReceipt` — po_id, received_at, received_by — writes stock via `get_inventory_adapter(business).receive_stock(...)`; see Part B §4.5

### 🔹 `modules/hr_payroll/` (expanded — see §5.1)

## 5.1 `hr_payroll/` — Feature Breakdown

Same vertical-slice shape as every other module (`models.py` / `schemas.py` / `router.py` / `service.py` / `repository.py` / `exceptions.py` per folder — omitted below per your note, just the structure):

```
modules/hr_payroll/
├── organization/
│   ├── departments/          # Department — self-contained, one head per dept (unless multi-head allowed)
│   └── job_titles/           # JobTitle — optionally scoped to a Department
│
├── employees/                # Employee — profile, contact, job info, employment type,
│                              #   direct_manager (self-referential reporting line)
│
├── attendance/                # Attendance — daily check-in/out, work_hours, overtime_hours,
│                               #   status (present/absent/late/half_day/on_leave/holiday/weekend),
│                               #   source (manual/biometric/system)
│
├── leave/                      # LeaveType, LeaveApplication, LeaveAllocation
│                                #   — request → review (approve/reject) → allocation balance update
│
├── holidays/                    # Holiday — public/festival/company/weekend calendar,
│                                 #   feeds attendance status resolution
│
├── compensation/                  # EmployeeSalary — one active salary structure per employee
│                                   #   (earnings + deductions → gross/net), effective_from dated
│
├── payroll_periods/                # PayrollPeriod — draft → processing → locked → paid,
│                                    #   the run boundary payslips attach to
│
├── payslips/                        # PayrollRecord — one payslip per employee per period,
│                                     #   snapshots attendance summary + earnings/deductions,
│                                     #   gross/deduction/net auto-computed, payment_method + is_paid
│
└── audit/                            # HRM-scoped audit trail (create/update/delete/approve/reject/
                                       #   cancel/lock/unlock/pay/activate/deactivate/import/export),
                                       #   generic FK over every HRM model above — module-local
                                       #   companion to core/audit, called the same way from service.py
```

**Notes carried over from the Django reference (`models.py`) into this structure, not as schema but as design intent:**
- `employees/` is the hub — `attendance/`, `leave/`, `compensation/`, and `payslips/` all FK into it, never into each other directly.
- `payroll_periods/` and `payslips/` are split the same way `orders`/`order_items` are in Ecommerce: the period is the run/batch, the payslip is the per-employee line, one-to-many, `unique(period, employee)`.
- `compensation/` (the salary structure) and `payslips/` (the computed payslip) are deliberately separate slices — a payslip is a point-in-time snapshot computed from the salary structure + that period's attendance, not a live reference to it.
- `audit/` keeps its own module-scoped log (matches the platform's `core/audit` pattern) since HR/payroll changes need query-by-module and query-by-actor independent of the platform-wide audit stream.

### 🔹 `modules/finance_accounts/`
**models.py**
- `ChartOfAccount` — code, name, type (asset/liability/equity/revenue/expense)
- `JournalEntry` / `JournalLine` — double-entry bookkeeping core
- `Invoice`, `Bill` — AR/AP
- `TaxFiling`

*Note: `ecommerce/orders` and `hr_payroll/payroll_periods` (on lock/pay) will both eventually post `JournalEntry` rows here — same integration pattern as Inventory: call `finance_accounts.service.post_journal_entry(...)`, never write directly to `journal_lines`.*

### 🔹 `modules/pharmacy/`
**models.py**
- `DrugRegistry` — id, name, generic_name, controlled-substance schedule, requires_prescription (intentionally **not** FK'd to `ecommerce.catalog.Product` — pharmacy must work for tenants who never bought Ecommerce)
- `Prescription` — patient info, prescriber, items, status
- `inventory/` — pharmacy's own stock tracking with batch/expiry/regulatory fields; see Part B §4.2

### 🔹 `modules/project_management/`
**models.py**
- `Project`, `Task`, `Sprint`, `Timesheet` — the most standalone module; light coupling only to `core/identity` for assignees and `finance_accounts` if you bill timesheets to clients later

---

## 6. Multi-Tenancy Pattern

Every tenant-scoped table across every module carries `business_id` (already true in the ecommerce/inventory/orders models you have). Enforce it centrally so no route can leak cross-tenant data by accident:

```python
# app/dependencies.py
async def get_current_business(user = Depends(get_current_user)) -> Business:
    ...  # resolves from JWT claim or X-Business-Id header

# app/common/models.py
class TenantMixin:
    business_id: Mapped[int] = mapped_column(ForeignKey("core.businesses.id"), nullable=False, index=True)
```

```python
# in every module's repository.py
async def list_products(db, business: Business):
    stmt = select(Product).where(Product.business_id == business.id)  # never optional
```

Stay row-level multi-tenancy (shared DB, `business_id` column) platform-wide. Only move specific enterprise customers to schema-per-tenant or DB-per-tenant later — typically first requested by Finance/HR customers for compliance reasons, not Ecommerce ones.

---

## 7. Postgres Schema Convention (new)

Instead of one flat `public` schema, give each module its own Postgres schema:

```sql
CREATE SCHEMA core;
CREATE SCHEMA ecommerce;
CREATE SCHEMA inventory;
CREATE SCHEMA procurement;
CREATE SCHEMA hr;
CREATE SCHEMA finance;
CREATE SCHEMA pharmacy;
CREATE SCHEMA projects;
```

```python
class Product(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "products"
    __table_args__ = {"schema": "ecommerce"}
```

Benefits: Alembic migrations stay organized per module, it's immediately visible which tables belong to which bounded context, and — same theme as the service-layer rule above — it makes a future split into a separate database far less painful because you're already schema-isolated.

---

## 8. Key Design Principles (extended)

The original 7 principles still hold for Ecommerce (see Part A, Section 7 below). Add:

8. **Core, not "shared utils"** — `identity`/`tenancy`/`billing` are first-class modules with their own models/schemas/service, not a grab-bag of helper functions. Every other module depends on them; they depend on nothing else.
9. **Cross-module calls go through `service.py`, never through another module's `models.py` or raw joins.** This is the boundary a future microservice split will follow exactly.
10. **Entitlement-gated routers, not entitlement-gated business logic.** Put `require_module(...)` on the `APIRouter`, not scattered through individual endpoint functions — one place to see what a plan unlocks.
11. **One schema per Postgres schema per module** — see Section 7.
12. **When multiple modules need the same *kind* of subsystem (e.g. inventory) but their domain requirements are likely to diverge, duplicate the schema per module and share only the code-level pattern (base classes/mixins) — never a shared runtime table.** A little repeated boilerplate is cheaper than a shared table slowly becoming a junk drawer of one-consumer columns. See Part B §4.4.

---

## 9. Platform-Wide Build Order (updated)

1. **`core/`** — identity, tenancy, billing/entitlements. Nothing else can be built without this.
2. **Inventory is built per-module now, not as one shared milestone.** Build `ecommerce/inventory/` alongside the rest of Ecommerce (step 3, below). Build `pharmacy/inventory/` together with the rest of Pharmacy (step 6). Build `inventory_management/` (the standalone product) whenever you're ready to sell it — it has no dependency on Ecommerce or Pharmacy being finished first.
3. **`ecommerce/`** — finish per the Part A build order below (you're most of the way there); its `inventory/` sub-module is part of this step.
4. **`procurement/`** — tightly coupled to `inventory` (POs → incoming stock); natural next step, reuses supplier/vendor concepts.
5. **`hr_payroll/`** and **`finance_accounts/`** — touch `inventory`/`ecommerce` less; safe to parallelize across a separate team track.
6. **`pharmacy/`** — mostly reuses `inventory` + `ecommerce.catalog` with domain-specific rules layered on top (batch/expiry, prescriptions).
7. **`project_management/`** — most standalone; build whenever, doesn't block or get blocked by the others.

---

## 10. Frontend Structure — HTML + TailwindCSS (server-rendered, Jinja2)

*(Assumes the existing `base.html` — sidebar + layout — is a Jinja2 template rendered by FastAPI, not a separate SPA. This is the minimal-effort path: no separate frontend app, no API client layer, no build step beyond Tailwind itself. If `base.html` is actually served from a different stack, say so and this section changes.)*

**Rule of thumb:** `templates/` mirrors `app/modules/` 1:1. If a router lives at `modules/pharmacy/prescriptions/router.py`, its pages live at `templates/pharmacy/prescriptions/*.html`. Zero guessing about where a page belongs.

```
app/
├── templates/
│   ├── base.html                     # ← your existing layout, unchanged
│   │
│   ├── partials/                     # cross-module chrome
│   │   ├── _sidebar.html             # loops over active modules — see below
│   │   ├── _topbar.html
│   │   └── _flash_messages.html
│   │
│   ├── components/                   # ← the actual time-saver: build once, reuse everywhere
│   │   ├── _table.html               # generic data table w/ sort headers, row actions
│   │   ├── _pagination.html
│   │   ├── _form_field.html          # label + input + error, one macro for every form
│   │   ├── _badge.html               # status pills (uses your enums: active/pending/etc.)
│   │   ├── _modal.html               # confirm-delete, quick-create
│   │   ├── _empty_state.html
│   │   └── _stat_card.html           # dashboard KPI tiles
│   │
│   ├── core/
│   │   ├── auth/ (login.html, register.html)
│   │   └── dashboard.html            # cross-module landing page, uses _stat_card
│   │
│   └── modules/                      # ← mirrors app/modules/ exactly
│       ├── ecommerce/
│       │   ├── catalog/  (list.html, detail.html, form.html)
│       │   ├── orders/   (list.html, detail.html)
│       │   └── ...
│       ├── inventory_management/ (list.html, form.html)
│       ├── pharmacy/
│       │   ├── prescriptions/
│       │   └── inventory/
│       └── ... (one folder per module, same names as app/modules/)
│
└── static/
    ├── css/
    │   ├── input.css                 # @tailwind base/components/utilities + your custom classes
    │   └── output.css                # compiled — Tailwind CLI, no bundler needed
    └── js/
        └── app.js                    # Alpine.js or htmx, if you want interactivity without a framework
```

### Why `components/` is the actual leverage point
Almost every screen across 7 modules is one of three shapes: **list** (table + filters + pagination), **detail** (read-only fields + related records), or **form** (create/edit). Build each of `_table.html`, `_form_field.html`, `_pagination.html`, `_badge.html` **once**, and every module's `list.html`/`form.html` becomes a thin Jinja2 file that just passes data in — not hand-rolled markup 40 times.

```jinja2
{# templates/components/_table.html #}
{% macro data_table(headers, rows) %}
<div class="overflow-x-auto rounded-lg border border-gray-200">
  <table class="min-w-full divide-y divide-gray-200">
    <thead class="bg-gray-50">
      <tr>
        {% for h in headers %}
        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{{ h }}</th>
        {% endfor %}
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-100">
      {{ caller() }}
    </tbody>
  </table>
</div>
{% endmacro %}
```

```jinja2
{# templates/modules/pharmacy/prescriptions/list.html #}
{% extends "base.html" %}
{% from "components/_table.html" import data_table %}
{% block content %}
  {% call data_table(["Patient", "Drug", "Status", ""]) %}
    {% for p in prescriptions %}
    <tr class="hover:bg-gray-50">
      <td class="px-4 py-2">{{ p.patient_name }}</td>
      <td class="px-4 py-2">{{ p.drug.name }}</td>
      <td class="px-4 py-2">{{ badge(p.status) }}</td>
      <td class="px-4 py-2 text-right"><a href="/prescriptions/{{ p.id }}">View</a></td>
    </tr>
    {% endfor %}
  {% endcall %}
{% endblock %}
```

### Sidebar driven by entitlements, not hand-maintained
Reuse the same check `require_module` runs so the sidebar never drifts from what routes are actually gated:

```jinja2
{# templates/partials/_sidebar.html #}
{% for module in nav_modules %}
  {% if business.has_module(module.key) %}
    <a href="{{ module.url }}" class="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100">
      {{ module.icon }} {{ module.label }}
    </a>
  {% endif %}
{% endfor %}
```
`nav_modules` is one small list in `app/core/tenancy/nav.py` (key, label, icon, url) — add a module there once, it appears in every business's sidebar automatically if entitled.

### Router wiring (minimal effort)
Keep each module's existing `router.py` for JSON API endpoints; add a sibling `views.py` per module for the HTML pages, mounted under the same `require_module(...)` dependency:

```python
# app/modules/pharmacy/prescriptions/views.py
router = APIRouter(dependencies=[Depends(require_module("pharmacy"))])
templates = Jinja2Templates(directory="app/templates")

@router.get("/prescriptions")
async def list_prescriptions(request: Request, db=Depends(get_db)):
    items = await service.list_prescriptions(db)
    return templates.TemplateResponse("modules/pharmacy/prescriptions/list.html",
                                       {"request": request, "prescriptions": items})
```

### Effort-minimizing defaults
- **Tailwind:** compile once with the Tailwind CLI (`npx tailwindcss -i input.css -o output.css --watch`) — no webpack/vite needed for a server-rendered app.
- **Interactivity:** reach for **htmx** (form submits/partial swaps without page reloads) or **Alpine.js** (dropdowns, modals, tabs) before reaching for a JS framework — either drops into `base.html` as one `<script>` tag.
- **New module checklist:** add `templates/modules/<name>/` mirroring its `app/modules/<name>/` routers, add one entry to `nav_modules`, reuse `components/` for every screen. No new patterns to invent per module.

---
---

# Part A — Ecommerce Module (original spec, unchanged)

*Everything below is preserved exactly as previously specified. In the platform structure above, this entire spec now lives under `app/modules/ecommerce/`, and its `modules/inventory/` section is superseded by the shared `app/modules/inventory/` service described in Part B.*

A production-grade, domain-driven folder structure for a large-scale marketplace (Amazon/eBay-style), covering multi-vendor selling, catalog, cart/checkout, payments, shipping, reviews, and admin/analytics.

## A.1 Module-by-Module: `models.py` & `schemas.py` Contents

### 🔹 `ecommerce/users/` *(now largely superseded by `core/identity/` — keep only ecommerce-specific extensions here, e.g. buyer preferences)*
**models.py**
- `UserAddress` — user_id (FK to `core.identity.User`), label, street, city, state, zip, country, is_default
- `UserProfile` — avatar_url, date_of_birth, preferences (JSON)

**schemas.py**
- `AddressCreate`, `AddressOut`

---

### 🔹 `ecommerce/sellers/` (multi-vendor marketplace core)
**models.py**
- `Seller` — user_id (FK), store_name, slug, tax_id, verification_status, rating_avg
- `SellerDocument` — kyc docs, license, bank details
- `SellerPayout` — payout schedule, bank_account_id, balance

**schemas.py**
- `SellerRegisterRequest`, `SellerOut`, `SellerPublicProfile`
- `SellerVerificationUpdate`
- `SellerPayoutOut`

---

### 🔹 `ecommerce/catalog/` (products) — matches the `models.py`/`schemas.py` built earlier in this conversation
**models.py**
- `Product`, `ProductVariant`, `ProductImage`, `ProductAttribute`/`AttributeValue`, `ProductTag`

**schemas.py**
- `ProductCreate/Update/Out/ListItem/DetailOut/AdminDetailOut`
- `VariantCreate/Update/Out/AdminOut`
- `ProductImageOut`

---

### 🔹 `ecommerce/categories/`
**models.py**
- `Category` — id, parent_id (self-referential), name, slug, icon
- `CategoryAttributeTemplate`

**schemas.py**
- `CategoryCreate`, `CategoryOut`, `CategoryTreeNode` (recursive)

---

### 🔹 `ecommerce/pricing/`
**models.py**
- `PriceHistory`, `TaxRule`, `CurrencyRate`

**schemas.py**
- `PriceUpdateRequest`, `TaxCalculationRequest/Response`

---

### 🔹 `ecommerce/cart/`
**models.py**
- `Cart` — user_id (nullable for guest via session_id), status
- `CartItem` — cart_id (FK), variant_id (FK), quantity, price_snapshot

**schemas.py**
- `CartItemCreate/Update`, `CartOut`, `CartMergeRequest`

---

### 🔹 `ecommerce/orders/` — matches the `models.py` built earlier (payment/fulfillment split, per-item status, snapshot fields)
**models.py**
- `Order` (payment_status + fulfillment_status, order_number, idempotency_key, guest checkout, monetary breakdown)
- `OrderItem` (per-item status, cancelled/refunded quantities, product snapshot fields)
- `OrderStatusHistory`, `OrderAddress` (with optional `order_item_id` for split shipments)

**schemas.py**
- `OrderCreate`, `OrderItemOut`, `OrderStatusUpdate`, `OrderSummary`, `OrderDetail`

---

### 🔹 `ecommerce/payments/`
**models.py**
- `Payment`, `PaymentMethod`, `Refund`

**schemas.py**
- `PaymentIntentCreate/Out`, `RefundRequest/Out`, `WebhookPayload`

---

### 🔹 `ecommerce/shipping/`
**models.py**
- `Shipment`, `ShippingRate`, `ShippingZone`

**schemas.py**
- `ShipmentCreate/Out`, `TrackingUpdate`, `ShippingRateQuote`

---

### 🔹 `ecommerce/reviews/`
**models.py**
- `Review`, `ReviewVote`

**schemas.py**
- `ReviewCreate/Out`, `ReviewSummary`

---

### 🔹 `ecommerce/wishlist/`
**models.py**
- `Wishlist`, `WishlistItem`

**schemas.py**
- `WishlistCreate/Out`, `WishlistItemCreate`

---

### 🔹 `ecommerce/promotions/`
**models.py**
- `Coupon`, `CouponRedemption`, `FlashSale`

**schemas.py**
- `CouponCreate/Out`, `CouponApplyRequest/Response`, `FlashSaleOut`

---

### 🔹 `ecommerce/search/`
*(Often no DB models — backed by Elasticsearch/OpenSearch)*

**schemas.py**
- `SearchQuery`, `SearchResult`, `FacetOut`

---

### 🔹 `ecommerce/returns/`
**models.py**
- `ReturnRequest`, `RefundLineItem`

**schemas.py**
- `ReturnRequestCreate/Out`, `ReturnStatusUpdate`

---

### 🔹 `ecommerce/disputes/` (buyer-seller conflict resolution, eBay-style)
**models.py**
- `Dispute`, `DisputeMessage`

**schemas.py**
- `DisputeCreate/Out`, `DisputeMessageCreate`

---

### 🔹 `ecommerce/admin/` *(module-specific reporting; platform-wide audit lives in `core/audit/`)*
**schemas.py**
- `AdminDashboardStats`

---

## A.2 Shared Mixins — `app/common/models.py`

```python
import uuid
from sqlalchemy import Column, DateTime, Boolean, func
from sqlalchemy.dialects.postgresql import UUID


class UUIDMixin:
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class SoftDeleteMixin:
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
```

## A.3 Shared Response Envelope — `app/common/schemas.py`

```python
from typing import Generic, TypeVar, List, Optional
from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    has_next: bool


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    message: Optional[str] = None
    data: Optional[T] = None
```

## A.4 Key Design Principles (Ecommerce-specific, original)

1. **Vertical slices over horizontal layers.**
2. **Separate `models.py` (DB) from `schemas.py` (API contract).**
3. **Multiple schema variants per entity** — `Out`, `ListItem`, `Detail`, `AdminOut`.
4. **Money as `Decimal`/`Numeric`, never `float`.**
5. **Status as `Enum`, with a `StatusHistory` audit trail table** — now split into `payment_status` + `fulfillment_status` + per-item `status` (see the `orders/models.py` update).
6. **Seller as a first-class entity separate from `User`.**
7. **Snapshot data on `Order`/`OrderItem`** (price, product title/SKU/image, address) — historical orders must never change even if the product or address changes later.

## A.5 Ecommerce Module Build Order (original)

1. `users`/`auth` (now `core/identity`) → 2. `sellers`, `categories`, `catalog`, `inventory` (ecommerce-owned, see Part B §4.1) → 3. `cart` → 4. `orders`, `payments`, `shipping` → 5. `reviews`, `wishlist`, `promotions` → 6. `search`, `notifications` (now `core/notifications`) → 7. `returns`, `disputes`, `admin`
