# ProERP SaaS Platform Guidelines

## Frontend Architecture & UI Invariants
1. **In-Place Non-Destructive Filtering**: All tables, rosters, listings, and catalog views across all modules must adhere to [.agents/rules/ui_in_place_filtering.md](file:///d:/Onoda%20Inc/Test%20Projects/python/python-fastapi-new/.agents/rules/ui_in_place_filtering.md).
   - Never unmount the table/grid during filtering or pagination.
   - Separate `initialLoading` (first mount) from `isFetching` (background filter updates).
   - Use top-rim indeterminate progress bars and subtle row opacity transitions.
   - Batch filter selections and `setCurrentPage(1)` with React `startTransition` to eliminate cascading double network calls.
2. **Statutory Labour Compliance (BLA 2006)**: Maintain strict statutory rules for leave allocations, payroll deductions, and employee records.
3. **Multi-Tenancy & Data Scoping**: All API requests and queries must respect `business_id` tenancy isolation.
