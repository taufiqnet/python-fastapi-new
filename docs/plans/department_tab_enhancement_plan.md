# Implementation Plan: Department Management Tab Overhaul (CRUD, Pagination, Hierarchy & Rosters)

## Goal Description
In the Organization Hub (`/hr-payroll/organization`), the **Departments Tab** is currently a basic, read-only static table that lacks administrative tools. Users cannot create new departments, edit existing structures, view assigned rosters, prevent cyclic parent-child dependencies, or paginate large department lists.

This plan details an enterprise-grade overhaul of the **Departments Tab** across the FastAPI backend and Next.js 15 frontend, bringing complete feature parity with modern ERP systems (Workday, BambooHR, ProERP).

---

## User Review Required

> [!IMPORTANT]
> **Parent Department Cycle Prevention**:
> When a department is updated, the parent department cannot be set to itself or any of its sub-departments (descendants). We will enforce this validation both on the frontend (disabling invalid options in the dropdown) and backend (raising an explicit `400 Bad Request`).

> [!IMPORTANT]
> **Safe Deletion Policy**:
> If a department has active employees assigned, deleting it will set `employees.department_id = NULL`. To prevent accidental data disruption, the UI confirmation dialog will prominently display the count of affected employees and child sub-departments before allowing the user to proceed.

---

## Proposed Changes

### 1. Backend Service & Repository Enhancements (`app/modules/hr_payroll/organization/`)

#### [MODIFY] [app/modules/hr_payroll/organization/repository.py](file:///d:/Onoda%20Inc/Test%20Projects/python/python-fastapi-new/app/modules/hr_payroll/organization/repository.py)
- **`DepartmentRepository.get_all`**:
  - Add `is_active: bool | None = None` filter.
  - Expand search query to match `Department.name`, `Department.code`, and `Department.description`.
  - Add sort parameter or order handling.
- **`DepartmentRepository.count`**:
  - Add `count(db, business_id, search, is_active, parent_id)` to support accurate backend pagination metrics.
- **`DepartmentRepository.get_descendant_ids`**:
  - Helper to recursively fetch all descendant department IDs for cycle validation.

#### [MODIFY] [app/modules/hr_payroll/organization/service.py](file:///d:/Onoda%20Inc/Test%20Projects/python/python-fastapi-new/app/modules/hr_payroll/organization/service.py)
- **Cycle Prevention in `update_department`**:
  ```python
  if data.parent_department_id:
      if data.parent_department_id == department_id:
          raise HTTPException(status_code=400, detail="A department cannot be its own parent.")
      descendants = self.repository.get_descendant_ids(db, department_id)
      if data.parent_department_id in descendants:
          raise HTTPException(status_code=400, detail="Cannot assign a sub-department as parent (cyclic dependency).")
  ```
- **Department Deletion Safety Check**:
  - Query assigned employee count and child department count; return detailed summary or provide option for safe detachment.

#### [MODIFY] [app/modules/hr_payroll/organization/router.py](file:///d:/Onoda%20Inc/Test%20Projects/python/python-fastapi-new/app/modules/hr_payroll/organization/router.py)
- Support `is_active` query parameter in `GET /departments`.
- Add endpoint `GET /departments/{department_id}/employees` or leverage existing `GET /employees?department_id={id}`.

---

### 2. Frontend Types & Schema Definitions (`frontend/src/types/`)

#### [MODIFY] [frontend/src/types/index.ts](file:///d:/Onoda%20Inc/Test%20Projects/python/python-fastapi-new/frontend/src/types/index.ts)
- Add `DepartmentCreateInput` and `DepartmentUpdateInput`:
  ```typescript
  export interface DepartmentCreateInput {
    name: string;
    code?: string;
    slug: string;
    description?: string;
    is_active?: boolean;
    multiple_heads_allowed?: boolean;
    parent_department_id?: string | null;
    head_employee_id?: string | null;
    business_id?: number;
  }
  ```

---

### 3. Department Component Architecture (`frontend/src/`)

To avoid bloat in [frontend/src/app/hr-payroll/organization/page.tsx](file:///d:/Onoda%20Inc/Test%20Projects/python/python-fastapi-new/frontend/src/app/hr-payroll/organization/page.tsx), we will build modular, high-polish components:

```
frontend/src/components/hr-payroll/departments/
├── departments-tab.tsx          # Main tab controller with state, metrics, filters, and view toggle
├── department-modal.tsx         # Create & Edit modal with slug generator and cycle prevention
├── department-detail-drawer.tsx # Slide-over drawer with Dept stats, Head profile & Employee roster
├── department-delete-dialog.tsx # Impact analysis confirmation dialog
├── department-tree-view.tsx     # Interactive collapsible hierarchy view
└── department-import-modal.tsx  # Excel template download and batch upload
```

#### Detailed Features in `DepartmentsTab`:

1. **Top Metric Cards**:
   - Total Departments
   - Primary / Top-Level Divisions
   - Sub-Departments
   - Assigned Department Heads Count
   - Total Staff Covered

2. **Action & Filter Bar**:
   - **Search Input**: Instant filter by Name, Code, Slug, or Department Head.
   - **Status Filter**: All, Active, Inactive.
   - **Hierarchy Filter**: All, Top-Level Only, Sub-Departments Only.
   - **Head Assignment Filter**: All, Assigned Head, Unassigned.
   - **View Toggle**: Table View $\leftrightarrow$ Tree / Hierarchy View.
   - **Action Buttons**:
     - `+ Add Department` (opens modal)
     - `Import Excel` (opens import dialog with template download)
     - `Export Excel` (triggers direct XLSX download from `/departments/export-excel`)

3. **Table View with Pagination**:
   - Columns: Department Name & Avatar, Code / Slug, Parent Department, Department Head (with avatar & title), Headcount badge, Status Pill, Actions.
   - Row Actions:
     - **View Details** (opens slide-over drawer)
     - **Add Sub-Department** (opens create modal with parent pre-filled)
     - **Edit** (opens edit modal)
     - **Toggle Status** (quick Active/Inactive switch)
     - **Delete** (opens delete dialog with safety check)
   - Pagination Controls:
     - Page Size selector (5, 10, 25, 50)
     - Showing X to Y of Z departments
     - Previous / Next / Page Number buttons
     - Auto-reset to Page 1 when filters change

4. **Tree / Hierarchy View**:
   - Expandable / Collapsible branches.
   - "Expand All" / "Collapse All" quick buttons.
   - Visual connector lines indicating parent-child sub-divisions.
   - Headcount summary per node.

5. **Slide-Over Department Detail Drawer**:
   - Department header with code and status.
   - Department Head Profile (avatar, employee ID, email, designation).
   - Sub-departments list with direct navigation links.
   - Live roster of employees belonging to this department, fetched via `/employees?department_id=...`.

---

## Verification Plan

### Automated Tests
1. **Department Service & Repository Tests**:
   - Test department cycle prevention when assigning parent.
   - Test department deletion safety checks.
   - Test `get_all` filtering by `is_active` and search.
   ```powershell
   pytest tests/test_organization_organogram_and_branches.py tests/test_hr_payroll_organization.py -v
   ```

2. **Frontend Type Check & Build**:
   ```powershell
   cd frontend
   npm run build
   ```

### Manual Verification
1. Open `http://127.0.0.1:3000/hr-payroll/organization` and navigate to the **Departments Tab**.
2. **Create Department**: Click `+ Add Department`, create a parent department (e.g. "Operations"), verify slug auto-generation.
3. **Create Sub-Department**: Click `Add Sub-Department` on "Operations", create "Supply Chain Logistics", verify parent is pre-selected.
4. **Edit Department**: Attempt to set a department's parent to itself or a child; verify prevention.
5. **View Detail Drawer**: Click a department row, verify that the slide-over drawer opens showing head details and assigned employees roster.
6. **Pagination & Filters**: Change page size to 5, test pagination buttons, filter by active/inactive and search queries.
7. **Tree View**: Switch to Tree View mode, test expand/collapse.
8. **Delete Department**: Click delete, verify the impact dialog warns about child departments/employees.
