# Implementation Plan: Role-Based Access Control (RBAC) System & Sidebar Alignment

This technical design document outlines the full audit, enhancement, and synchronization of the Role-Based Permission System across all implemented modules in the ProERP platform (Backend FastAPI and Frontend Next.js), with careful alignment of the Sidebar navigation hierarchy.

---

## Goal Description
The ProERP SaaS platform contains multiple production-ready modules across E-Commerce, HR & Payroll, Finance, Company Assets, Travel & Expenses, Vehicle & Fleet, Healthcare & Clinic, Employee Portal, and System Administration. 

However, there is architectural drift between the backend permission definitions (`SYSTEM_MODULES` and router decorators) and the frontend navigation/authorization layer (`Sidebar`, `DashboardLayout`, and `useAuth`):
1. **Vertical SaaS Modules Lack Granular RBAC**: `Vehicle & Fleet` (`/fleet`) and `Healthcare & Clinic` (`/healthcare`) endpoints and frontend navigation are missing from `SYSTEM_MODULES`, leaving their backend endpoints without `require_permission` guards and their sidebar items without permission gating.
2. **Missing Endpoint Permission Guards**: `assets` (`/assets`) and `travel_expenses` (`/travel/requests`, `/expense/claims`) currently only verify authentication (`get_current_user`), but lack granular `require_permission` checks.
3. **Frontend Permission Mismatch & Navigation Drift**: 
   - `Document Management` in the sidebar currently checks `hrm:Documents:view` (uppercase), which never matches seeded permissions (`hrm:employee_documents:view` or `hrm:document_categories:view`).
   - `Procurement Suppliers` links to `/ecommerce/procurement/suppliers`, which does not exist (suppliers is an in-page tab on `/ecommerce/procurement`).
   - Several implemented frontend modules/pages are completely omitted from the sidebar (e.g., LIS Worklist, Result Verification, OPD Chambers, Referral Commissions in Healthcare; Payroll Periods, Payroll Setup, Process Payroll in HR; and 4 self-service pages in Employee Portal).
   - `UserResponse` does not serialize the flattened `permissions: list[str]` array, forcing client-side iterative lookups and preventing single-token wildcards (`*`) for superusers and admins.
   - `DashboardLayout` does not check module-level access for `/fleet`, `/healthcare`, or `/assets`.

This change achieves 100% end-to-end RBAC synchronization across the database seed, REST APIs, frontend authorization guards, permissions matrix UI, and sidebar navigation.

---

## User Review Required

> [!IMPORTANT]
> **Module Classification for Fleet & Healthcare**:
> We are adding `fleet` ("Vehicle & Fleet") and `healthcare` ("Healthcare & Clinic") as first-class top-level modules in `SYSTEM_MODULES`. This will automatically seed granular permissions for them (`fleet:vehicles:view`, `healthcare:diagnostic_billing:view`, etc.), make them configurable in the Roles & Permissions matrix, and allow tenant administrators to grant or restrict access per role.

> [!IMPORTANT]
> **Admin & Superuser Universal Wildcard (`*`)**:
> System Administrators (`role == 'admin'`) and Superusers (`is_superuser == True`) will receive `permissions: ["*"]` serialized from the backend. The frontend `hasPermission` and `hasModuleAccess` helpers will immediately respect `*` as granting universal access to all routes, preventing false lockouts.

---

## Open Questions

> [!NOTE]
> 1. **Procurement Suppliers Navigation**: In the frontend, Purchase Orders and Suppliers share a unified tabbed interface at `/ecommerce/procurement` (`activeTab="orders"` vs `activeTab="suppliers"`). We propose linking "Suppliers & Vendors" in the sidebar to `/ecommerce/procurement?tab=suppliers` and enhancing `ProcurementPage` to honor this query parameter on mount.
> 2. **Company Assets & Travel Modules**: Currently, `Company Assets` (`assets`, `asset_allocations`, `asset_maintenance`) and `Travel & Expense` (`travel_requests`, `expense_claims`, `da_policies`) are classified under the `hrm` module umbrella in `SYSTEM_MODULES`. We propose keeping their permission codes with `hrm:` (e.g., `hrm:assets:view`, `hrm:travel_requests:view`) to preserve statutory labour compliance test suites (`assert len(hrm_features) == 51` in `test_hr_roles_and_permissions.py`), while presenting them as dedicated sections in the sidebar.

---

## Proposed Changes

### Component 1: Core Identity, RBAC Models & System Seed (Backend)

We will register `fleet` and `healthcare` modules in `SYSTEM_MODULES`, expose a flattened `permissions: list[str]` on `UserResponse`, and update default system roles in `seed.py`.

---

#### [MODIFY] `app/core/identity/models.py`
- Add a cached `@property def permissions(self) -> list[str]: return sorted(list(self.get_all_permission_codes()))` on `User`.
- In `User.has_permission()`, add candidate alias fallbacks for `fleet` and `healthcare` features, and handle `*`.

```python
    @property
    def permissions(self) -> list[str]:
        return sorted(list(self.get_all_permission_codes()))
```

---

#### [MODIFY] `app/core/identity/schemas.py`
- Update `UserResponse` to include `permissions: list[str] = []`.

```diff
 class UserResponse(BaseModel):
     model_config = ConfigDict(from_attributes=True)
 
     id: int
     username: str
     email: EmailStr
     phone: str | None = None
     business_id: int | None = None
     is_superuser: bool = False
     is_active: bool
     is_verified: bool
     can_use_offline_mode: bool = False
     is_offline_sync_enabled: bool = False
     created_at: datetime
 
+    permissions: list[str] = []
     roles: list[RoleResponse] = []
     direct_permissions: list[PermissionResponse] = []
```

---

#### [MODIFY] `app/core/identity/seed.py`
- Add `"fleet"` and `"healthcare"` to `SYSTEM_MODULES` with their functional categories and features:
  - **`fleet`**:
    - Fleet Operations: `vehicles` (Vehicles & Fleet Registry), `drivers` (Drivers Management), `requisitions` (Vehicle Requisitions), `trips` (Trip Dispatch & Management), `fuel_logs` (Fuel & Mileage Logs), `maintenance` (Maintenance & Work Orders), `incidents` (Incident & Accident Reports), `telematics` (Telematics & Tracking).
  - **`healthcare`**:
    - Clinical & Consultations: `patients` (Patient Registry - MPI), `doctors` (Doctors & Chamber Setup), `appointments` (OPD Appointments & Consultations).
    - Diagnostics & Laboratory: `diagnostic_billing` (Diagnostic Billing & Invoices), `diagnostic_catalog` (Diagnostic Test Catalog), `phlebotomy` (Phlebotomy & Sample Collection), `lis_worklist` (LIS Worklist & Lab Results), `verification` (Lab Result Verification).
    - Referrals & Commissions: `referrals` (Referral Doctor Commissions).
- Preserve all 51 existing features in `hrm` to prevent breaking existing test assertions (`assert len(hrm_features) == 51`).
- In `seed_system_admin_and_permissions_sync()`, create default roles `fleet_manager`, `healthcare_admin`, and `finance_admin`, and ensure `admin_role.permissions` receives all newly generated permissions.

---

### Component 2: Backend Router Endpoint Gating

We will wire `require_permission` onto unprotected vertical and operational endpoints.

---

#### [MODIFY] `app/modules/vehicles/router.py`
- Protect vehicle endpoints with `require_permission("fleet", "vehicles", action)`:
  - `GET /fleet/overview/stats` -> `view`
  - `GET /fleet/vehicles` -> `view`
  - `POST /fleet/vehicles` -> `create`
  - `PUT /fleet/vehicles/{id}` -> `update`
  - `DELETE /fleet/vehicles/{id}` -> `delete`
  - `GET /fleet/drivers` -> `require_permission("fleet", "drivers", "view")`
  - `POST /fleet/drivers` -> `require_permission("fleet", "drivers", "create")`
  - `GET /fleet/requisitions` -> `require_permission("fleet", "requisitions", "view")`
  - `POST /fleet/requisitions` -> `require_permission("fleet", "requisitions", "create")`
  - `POST /fleet/requisitions/{id}/approve` -> `require_permission("fleet", "requisitions", "update")`
  - `GET /fleet/trips` -> `require_permission("fleet", "trips", "view")`
  - `POST /fleet/fuel-logs` -> `require_permission("fleet", "fuel_logs", "create")`
  - `GET /fleet/work-orders` -> `require_permission("fleet", "maintenance", "view")`
  - `POST /fleet/incidents` -> `require_permission("fleet", "incidents", "create")`

---

#### [MODIFY] `app/modules/healthcare/router.py`
- Protect healthcare endpoints with `require_permission("healthcare", feature, action)`:
  - `GET /healthcare/patients` -> `require_permission("healthcare", "patients", "view")`
  - `POST /healthcare/patients` -> `require_permission("healthcare", "patients", "create")`
  - `GET /healthcare/doctors` -> `require_permission("healthcare", "doctors", "view")`
  - `GET /healthcare/appointments` -> `require_permission("healthcare", "appointments", "view")`
  - `POST /healthcare/appointments` -> `require_permission("healthcare", "appointments", "create")`
  - `GET /healthcare/diagnostic/tests` -> `require_permission("healthcare", "diagnostic_catalog", "view")`
  - `POST /healthcare/diagnostic/checkout` -> `require_permission("healthcare", "diagnostic_billing", "create")`
  - `GET /healthcare/diagnostic/samples` -> `require_permission("healthcare", "phlebotomy", "view")`
  - `POST /healthcare/diagnostic/samples/{id}/collect` -> `require_permission("healthcare", "phlebotomy", "update")`
  - `POST /healthcare/diagnostic/results/batch` -> `require_permission("healthcare", "lis_worklist", "update")`
  - `POST /healthcare/diagnostic/orders/{id}/verify` -> `require_permission("healthcare", "verification", "update")`
  - `GET /healthcare/referrals/commissions` -> `require_permission("healthcare", "referrals", "view")`

---

#### [MODIFY] `app/modules/assets/router.py`
- Protect company asset endpoints with `require_permission("hrm", ...)`:
  - `GET /assets/overview/stats` -> `require_permission("hrm", "assets", "view")`
  - `GET /assets/items` -> `require_permission("hrm", "assets", "view")`
  - `POST /assets/items` -> `require_permission("hrm", "assets", "create")`
  - `PUT /assets/items/{id}` -> `require_permission("hrm", "assets", "update")`
  - `DELETE /assets/items/{id}` -> `require_permission("hrm", "assets", "delete")`
  - `GET /assets/assignments` -> `require_permission("hrm", "asset_allocations", "view")`
  - `POST /assets/assignments` -> `require_permission("hrm", "asset_allocations", "create")`
  - `GET /assets/maintenance` -> `require_permission("hrm", "asset_maintenance", "view")`
  - `POST /assets/maintenance` -> `require_permission("hrm", "asset_maintenance", "create")`

---

#### [MODIFY] `app/modules/travel_expenses/router.py`
- Protect travel and expense endpoints with `require_permission("hrm", ...)`:
  - `GET /travel/requests` -> `require_permission("hrm", "travel_requests", "view")`
  - `POST /travel/requests` -> `require_permission("hrm", "travel_requests", "create")`
  - `POST /travel/requests/{id}/review` -> `require_permission("hrm", "travel_requests", "update")`
  - `GET /expense/claims` -> `require_permission("hrm", "expense_claims", "view")`
  - `POST /expense/claims` -> `require_permission("hrm", "expense_claims", "create")`
  - `POST /expense/claims/{id}/settle` -> `require_permission("hrm", "expense_claims", "update")`
  - `GET /expense/policies` -> `require_permission("hrm", "da_policies", "view")`
  - `POST /expense/policies` -> `require_permission("hrm", "da_policies", "create")`

---

### Component 3: Frontend Client Context & Route Security

---

#### [MODIFY] `frontend/src/context/auth-context.tsx`
- Enhance `hasPermission(module, feature, action)`:
  - Superuser or role `admin`: return `true`.
  - Wildcard permission `*`: return `true`.
  - Check `user.permissions` codes.
  - Add candidate aliases (e.g. `pos_terminal` -> `pos`, `procurement_po` -> `procurement`, `employee_documents` <-> `document_categories`).
  - Check direct permissions and roles permissions.
- Enhance `hasModuleAccess(module)`:
  - Superuser or role `admin`: return `true`.
  - Wildcard `*`: return `true`.
  - Check `user.permissions?.some(code => code.startsWith(`${module}:`))`.
  - Check `direct_permissions` and `roles`.

---

#### [MODIFY] `frontend/src/components/layout/dashboard-layout.tsx`
- Extend module route gating to cover all vertical and operational paths:
  - `pathname.startsWith("/fleet")` -> requires `hasModuleAccess("fleet")`
  - `pathname.startsWith("/healthcare")` -> requires `hasModuleAccess("healthcare")`
  - `pathname.startsWith("/assets")` -> requires `hasModuleAccess("hrm")`
  - Displays standard access restricted screen if unauthorized.

---

#### [MODIFY] `frontend/src/components/administration/permissions-matrix.tsx`
- Add icons for new modules in `MODULE_ICON_MAP`:
  ```tsx
  const MODULE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    general: ShieldCheck,
    hrm: Users,
    finance: Calculator,
    ecommerce: ShoppingCart,
    fleet: Car,
    healthcare: Stethoscope,
  };
  ```

---

### Component 4: Sidebar Navigation Hierarchy & Alignment

---

#### [MODIFY] `frontend/src/components/layout/sidebar.tsx`
Carefully update the sidebar items while preserving all existing test selectors, icons, and layout structure:

1. **Fix Document Management Permission**:
   - Change `permission: { module: "hrm", feature: "Documents", action: "view" }` to `{ module: "hrm", feature: "employee_documents", action: "view" }`.
2. **Fix Procurement Suppliers Link**:
   - Change `href: "/ecommerce/procurement/suppliers"` to `href: "/ecommerce/procurement?tab=suppliers"`.
3. **Vehicle & Fleet Section**:
   - Add `module: "fleet"`
   - Add permission `{ module: "fleet", feature: "vehicles", action: "view" }` to `Fleet Overview` (`/fleet`).
4. **Healthcare & Clinic Section**:
   - Add `module: "healthcare"`
   - Add permissions and complete list of implemented sub-pages:
     - Diagnostic Billing (`/healthcare/diagnostic/billing`) -> `{ module: "healthcare", feature: "diagnostic_billing", action: "view" }`
     - Patient Registry (MPI) (`/healthcare/patients`) -> `{ module: "healthcare", feature: "patients", action: "view" }`
     - Doctors & Chambers (`/healthcare/doctors`) -> `{ module: "healthcare", feature: "doctors", action: "view" }`
     - Test Catalog (`/healthcare/diagnostic/catalog`) -> `{ module: "healthcare", feature: "diagnostic_catalog", action: "view" }`
     - Phlebotomy & Samples (`/healthcare/diagnostic/phlebotomy`) -> `{ module: "healthcare", feature: "phlebotomy", action: "view" }`
     - LIS Worklist (`/healthcare/diagnostic/lis-worklist`) -> `{ module: "healthcare", feature: "lis_worklist", action: "view" }`
     - Result Verification (`/healthcare/diagnostic/verification`) -> `{ module: "healthcare", feature: "verification", action: "view" }`
     - OPD Chambers (`/healthcare/opd-chambers`) -> `{ module: "healthcare", feature: "doctors", action: "view" }`
     - Referral Commissions (`/healthcare/referrals`) -> `{ module: "healthcare", feature: "referrals", action: "view" }`
5. **HR & Payroll Section**:
   - Under "Payroll & Compensation", add:
     - Payroll Periods (`/hr-payroll/payroll-periods`) -> `{ module: "hrm", feature: "payroll_periods", action: "view" }`
     - Payroll Setup (`/hr-payroll/payroll-settings`) -> `{ module: "hrm", feature: "payroll_settings", action: "view" }`
     - Process Payroll (`/hr-payroll/payroll-process`) -> `{ module: "hrm", feature: "payroll_periods", action: "create" }`
6. **Employee Portal Section**:
   - Add links to all implemented employee self-service features:
     - My Assets (`/portal/assets`)
     - Career & Appraisals (`/portal/career`)
     - Travel & Claims (`/portal/travel`)
     - Goals & Appraisals (`/portal/performance`)

---

#### [MODIFY] `frontend/src/app/ecommerce/procurement/page.tsx`
- Read `useSearchParams()` on initial render: if `tab === "suppliers"`, initialize `activeTab` to `"suppliers"` so direct navigation from the sidebar opens the suppliers view seamlessly without 404.

---

## Verification Plan

### Automated Tests
1. **Frontend Vitest Suite**:
   ```bash
   docker exec nextjs_frontend npx vitest run
   ```
   - Verify `sidebar.test.tsx` passes with all sub-groups and dedicated top-level modules.
   - Verify `auth-context.test.tsx` passes.
   - Verify all 23 test files continue to pass 100%.

2. **Backend Pytest Suite**:
   ```bash
   docker exec fastapi_app pytest tests/test_hr_roles_and_permissions.py
   docker exec fastapi_app pytest tests/test_rbac_sidebar.py
   docker exec fastapi_app pytest tests/test_fleet_vehicles_brta_compliance.py
   docker exec fastapi_app pytest tests/test_healthcare_audit.py
   ```
   - Verify all 51 HRM features assertion passes.
   - Verify RBAC gating tests pass.

### Manual Verification
1. **System Admin View**:
   - Login as `admin@example.com` / `19863022#`.
   - Verify full sidebar displays all modules and pages without any items hidden.
   - Navigate to `/administration/roles/create` and `/administration/users/create`.
   - Verify `PermissionsMatrix` displays tabs/sections for General, HR & Payroll, Finance, Ecommerce, Vehicle & Fleet, and Healthcare & Clinic with proper icons.
2. **Role-Restricted User View**:
   - Create or test with a user having only `hrm` permissions (e.g. `hr_basic`).
   - Verify the sidebar dynamically hides `E-Commerce`, `Vehicle & Fleet`, `Healthcare & Clinic`, `Finance & Accounts`, and `Administration`.
   - Verify attempting to browse to `/fleet` or `/healthcare` shows the friendly "Access Restricted: You lack access to the Vehicle & Fleet / Healthcare module" screen in `DashboardLayout`.
3. **Sidebar Interaction**:
   - Test expanding/collapsing sections in the sidebar.
   - Verify clicking "Suppliers & Vendors" under E-Commerce takes the user to `/ecommerce/procurement?tab=suppliers` and switches the tab to Suppliers.
   - Verify clicking "My Assets" under Employee Portal opens `/portal/assets`.
