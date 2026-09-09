# Native AI Chat Assistant & HR Reports MCP Server (`app/mcp/hr_report_server.py` & `app/services/ai/`)

The application-native AI Chat Assistant integrates OpenRouter LLMs directly into the FastAPI SaaS platform, replacing external clients like Claude Desktop while reusing shared, read-only HR & Payroll tools (`app/services/ai/tools.py`).

---

## Architecture

```
Frontend Chat UI (app/templates/modules/mcp/mcp_manage.html)
      ↓
FastAPI AI Chat Endpoint (POST /api/ai/chat)
      ↓
OpenRouter API (backend-side only)
      ↓
Tool Calling & Permission Enforcement (app/services/ai/tools.py)
      ↓
Existing FastAPI Services & Database
```

- **Shared Tool Layer**: Business tool execution logic lives in `app/services/ai/tools.py` with standard token-optimized response envelopes.
- **OpenRouter Provider**: Managed backend-side via `app/services/ai/provider.py`. The OpenRouter API key is never exposed to the frontend.
- **RBAC & Multi-Tenancy**: Every tool invocation resolves the logged-in user via `Depends(get_current_user)`, checking required permission codes and restricting operations to `user.business_id`.

---

## Environment Setup

Add the following environment variables to your `.env` configuration:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=openrouter/free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

### Obtaining an OpenRouter Key
1. Sign up at [https://openrouter.ai/](https://openrouter.ai/).
2. Navigate to Keys and create a new API Key.
3. Paste the key in `OPENROUTER_API_KEY`.

*Note: Claude Desktop is no longer required for this feature as the assistant is built directly into the web application UI at `/mcp/manage`.*

---

## Authorization & Security

Every AI chat request evaluates:
1. **Authenticated Session Identity**: Resolved at runtime via `get_current_user`.
2. **Permission Checks**: The active user must possess required RBAC permission code(s) (e.g., `hrm:employees:view`, `hrm:compensation:view`).
3. **Tenant Scoping**: Non-superusers are strictly scoped to their assigned `business_id`.
4. **No Raw SQL**: Arbitrary database queries are impossible; the AI can only call defined business tools.

---

## Available AI Tools Reference

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
