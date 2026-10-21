# Finalized Implementation Plan: Pure RBAC Strategy & Subscription Plans Management

## 1. Problem & Context
The user is logged in as `test@test.com` under business `wbsoft` (`business_id = 1`).
In domestic enterprise software (internal company ERP / on-premise installation), internal employees must never be blocked by commercial SaaS subscription paywalls or tier upgrade prompts.
Through the `/grill-me` design interview, the requirements and design decisions are now fully established:

1. **Single Authorization Strategy**: **Pure RBAC Strategy** (`subscription_required = False` / `auth_strategy = "rbac"`). Feature access across the entire ERP is governed 100% by User Roles and Permissions. Subscription tier lockouts are completely bypassed for internal employees.
2. **Scope of Subscription Plans**: Full Subscription Plan Catalog and Assignment interface in Next.js (`/administration/subscription-plans`), including listing, creating, and editing plans with the permissions matrix.
3. **Access Control**: Superusers, Admins, and users with the `general:subscription_plans` permission code can manage plans.
4. **UI Placement**: Inside the **Administration** sidebar navigation group, alongside Company Profile, User Accounts, and Roles & Permissions.

---

## 2. Technical Design & Architecture

```mermaid
flowchart TD
    Req[Incoming User Request] --> AuthCheck{Auth Strategy}
    AuthCheck -->|Pure RBAC (Domestic)| RBACCheck{User has Role / Permission?}
    RBACCheck -->|Yes| Allow[Access Granted]
    RBACCheck -->|No| Deny[403 Forbidden: Permission Denied]
    
    AuthCheck -.->|Subscription Bypassed| PlanCheck[Subscription Plan Checks Bypassed]
    
    subgraph Administration Module
        Users[User Accounts]
        Roles[Roles & Permissions]
        Biz[Company Profile]
        Plans[Subscription Plans]
    end
    
    Plans -->|Defines Package Tiers| Biz
```

---

## 3. Proposed File Changes

### Backend Changes

#### [MODIFY] `app/core/config.py`
- Set `subscription_required: bool = False` (or configure via `auth_strategy: str = "rbac"` with `subscription_required: bool = False` default for domestic software mode).
- Ensure domestic software runs in pure RBAC mode out-of-the-box.

#### [MODIFY] `app/core/security.py`
- Update `require_permission(module, feature, action)`:
  - If `settings.subscription_required` is `False` (domestic RBAC mode): purely verify user-level RBAC (`current_user.has_permission(c)`). Subscription plan lockout check is bypassed.
- Add helper dependency `get_current_plan_admin` or update `get_current_admin`:
  - Allow access if `current_user.is_superuser`, has role `"admin"`, OR has permission `"general:subscription_plans:view"` / `"general:subscription_plans:manage"`.

#### [MODIFY] `app/routers/subscription_plan_views.py`
- Update API endpoints (`/subscription-plans/api`, `/subscription-plans/api/{id}`) to use the flexible permission dependency so authorized domestic managers can manage plans via the Next.js API.
- Add `GET /subscription-plans/api/tenant/current` endpoint returning current business plan details, active tier, and assigned module count for tenant feature visibility.

---

### Frontend Changes (Next.js)

#### [NEW] `frontend/src/app/administration/subscription-plans/page.tsx`
- Subscription plans catalog adhering to [.agents/rules/ui_in_place_filtering.md](file:///d:/Onoda%20Inc/Test%20Projects/python/python-fastapi-new/.agents/rules/ui_in_place_filtering.md):
  - Top statistics row: Total Plans, Active Tiers, Total System Permissions.
  - In-place search and status filter without unmounting the table.
  - Indeterminate top-rim progress bar during background data loading.
  - Plan rows with name, description, active badge, permissions count badge, created date, and edit/delete actions.
  - "New Plan" button linking to `/administration/subscription-plans/create`.

#### [NEW] `frontend/src/app/administration/subscription-plans/create/page.tsx`
- Plan creation page:
  - Fields: Plan Name, Description, Is Active toggle.
  - Granular `PermissionsMatrix` component allowing selection across all ERP modules (HRM, E-Commerce, Finance, Inventory, Administration).
  - Quick presets: Select All, Deselect All, Module-level batch toggles.

#### [NEW] `frontend/src/app/administration/subscription-plans/[id]/edit/page.tsx`
- Plan edit page:
  - Loads existing plan data and pre-selects assigned permissions in the `PermissionsMatrix`.
  - Updates plan metadata and permission assignments via `PUT /subscription-plans/api/{id}`.

#### [MODIFY] `frontend/src/components/layout/sidebar.tsx`
- Add `Subscription Plans` (`/administration/subscription-plans`) to the **Administration** navigation list.

---

## 4. Verification Plan

### Automated Tests
1. Run existing subscription required toggle test to ensure pure RBAC works seamlessly:
   ```bash
   pytest tests/test_subscription_required_toggle.py -v
   ```
2. Verify Python syntax on modified backend files:
   ```bash
   python -m py_compile app/core/config.py app/core/security.py app/routers/subscription_plan_views.py
   ```
3. Run Next.js frontend production build:
   ```bash
   npm --prefix frontend run build
   ```

### Manual Verification
1. Log in as `test@test.com` on `http://localhost:3000`.
2. Verify that `test@test.com` can access ERP modules (Employees, Leave, Products, Orders) without receiving 403 "Upgrade required" plan errors.
3. Navigate to `/administration/subscription-plans` via the sidebar.
4. Verify table loads with in-place filtering and stat cards.
5. Create a new plan with custom permissions using the `PermissionsMatrix`.
6. Edit the plan and verify changes persist.
