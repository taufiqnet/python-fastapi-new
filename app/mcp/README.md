# HR & Payroll Reports MCP Server (`app/mcp/hr_report_server.py`)

The Model Context Protocol (MCP) HR Report Server exposes read-only tools for employee, leave, attendance, and payroll data from the HR & Payroll module. It allows AI clients (e.g., Claude Desktop, Claude Code) to answer questions and generate reports via natural language.

---

## Isolation & Architecture

- **Optional Add-On Component**: The server is isolated under `app/mcp/` and uses its own dependency footprint (`app/mcp/requirements.txt`).
- **One-Directional Dependency**: `app/mcp/` imports from `app/core/` and `app/modules/`. Nothing in `app/core/` or `app/modules/` imports from `app/mcp/`.
- **Zero Impact on Startup/Performance**: No changes to `app/main.py`. Removing `app/mcp/` leaves the main application completely functional.

---

## How to Run Locally

Set the `MCP_ACTING_USER_ID` environment variable to a valid user ID in the database and run the process over stdio transport:

```bash
export MCP_ACTING_USER_ID=1
export DATABASE_URL="sqlite:///./app.db" # or your database connection URL
python -m app.mcp.hr_report_server
```

---

## Claude Desktop Configuration

Add the following snippet to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hr_payroll_reports": {
      "command": "python",
      "args": [
        "-m",
        "app.mcp.hr_report_server"
      ],
      "env": {
        "MCP_ACTING_USER_ID": "1",
        "DATABASE_URL": "sqlite:///./app.db",
        "APP_ENV": "development"
      }
    }
  }
}
```

---

## Authorization & Multi-Tenancy

Every tool execution evaluates:
1. **Acting User Context**: Resolved at runtime via `UserRepository.get_by_id(user_id)`. If `MCP_ACTING_USER_ID` is missing or invalid, the server halts.
2. **Permission Checks**: The acting user must possess the required RBAC permission code(s) via `user.has_permission(code)`.
3. **Tenant Scoping**: Non-superusers are strictly scoped to their assigned `business_id`. Any attempt to query or specify another tenant's data yields a tenant scoping violation error.

---

## Required Tools Reference

| Tool Name | Description | Required Permission Code(s) | Notes |
|---|---|---|---|
| `list_employees` | List employees filtered by business and department | `hrm:employees:view` | Returns non-financial employee list |
| `get_employee` | Get detailed employee profile | `hrm:employees:view` | Returns non-financial employee details |
| `list_leave_applications` | List leave requests with optional status/date range filters | `hrm:leave_applications:view` | Filterable by start/end dates |
| `get_employee_leave_balance` | Get leave allocations and remaining balances for an employee | `hrm:leave_allocations:view` | Returns per-leave-type balance |
| `get_leave_summary_report` | Aggregate counts of leave requests by type and status | `hrm:leave_applications:view` | Aggregates data for date range |
| `get_employee_payslip` | Get detailed payslip for one employee in one period | **`hrm:payroll_records:view` AND `hrm:compensation:view`** | Requires **both** permissions; only tool returning individual compensation figures |
| `get_payroll_summary_report` | Aggregated payroll totals for a period | `hrm:payroll_records:view` | Returns headcount and company totals only; **never** per-employee rows |
| `get_attendance_summary` | Attendance metrics summary for an employee in a date range | `hrm:attendance:view` | Aggregate present, absent, late, work & overtime hours |
