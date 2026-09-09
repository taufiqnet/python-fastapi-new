# Prompt for Jules AI

Copy everything below into Jules as a single task.

---

You are a senior backend engineer on an existing FastAPI SaaS project. It already has a working AI chat feature: `app/services/ai/tools.py` holds shared, permission-checked HR/payroll tool functions, called by both `app/mcp/hr_report_server.py` (legacy MCP path) and the `/api/ai/chat` OpenRouter-backed endpoint. **This task retrofits that existing tool layer to return small, structured, typed responses instead of raw data dicts**, so large datasets (e.g. 1,000+ employees) never get serialized into the LLM's context or output — the database aggregates/paginates, the LLM explains, the frontend renders.

Read `app/services/ai/tools.py` and `app/mcp/hr_report_server.py` in full before writing anything. Every tool listed below already exists except where marked **(new)** — you are reshaping return values and adding a small number of tools, not rewriting the permission or tenant-scoping logic, which is correct as-is and must not change.

## Assumptions made for this task — flag if wrong

1. **`list_employees` is not deleted.** It's refactored internally to call the same logic as the new `search_employees`, kept as a thin backward-compatible alias so `hr_report_server.py` and anything else calling it by name keeps working. New code (the chat endpoint's tool schema) should expose `search_employees` going forward.
2. **The response envelope is defined as Pydantic models**, matching the existing `schemas.py` convention elsewhere in the codebase, living in a new `app/services/ai/response_types.py`.

If either assumption conflicts with a decision already made elsewhere in the codebase, follow the codebase's existing pattern instead and note the deviation in your final summary.

## 1. Define the response envelope first

Create `app/services/ai/response_types.py` with a discriminated set of response types. Every tool in this task returns one of these, never a bare dict:

- **`number`**: `{"type": "number", "value": int, "label": str}`
- **`summary`**: `{"type": "summary", "title": str, "metrics": dict[str, int | float | str]}` — e.g. `total_employees`, `gross_salary`, `average_salary`
- **`table`**: `{"type": "table", "title": str, "total": int, "page": int, "page_size": int, "columns": list[str], "rows": list[dict]}`
- **`list`**: same shape as `table` but for non-tabular item lists (e.g. leave applications) where a table isn't the natural fit
- **`employee_card`**: `{"type": "employee_card", "employee": dict}` — single-record detail view, explicit allowlisted fields only (see step 4)
- **`chart`**: `{"type": "chart", "chart_type": str, "title": str, "data": list[dict]}`
- **`error`**: `{"type": "error", "message": str}` — used for permission-denied and not-found cases, never a raw exception

Use Pydantic models with a `type` literal discriminator field, so both the tool layer and (eventually) the frontend can rely on a single typed contract.

## 2. Retrofit every existing tool to return the envelope

For each tool below, change the return type from `dict[str, Any] | str` to the matching envelope type. The permission check, tenant scoping, and underlying service call for each stay exactly as they are today — only the shape of what's returned changes.

| Tool | Envelope type | Notes |
|---|---|---|
| `search_employees` (renamed from `list_employees`) | `table` | See step 3 for the new signature |
| `get_employee` | `employee_card` | Apply the column allowlist from step 4 |
| `list_leave_applications` | `list` | Add `page`/`page_size` (see step 3) |
| `get_employee_leave_balance` | `summary` | |
| `get_leave_summary_report` | `summary` | Already aggregate — just wrap it |
| `get_employee_payslip` | `employee_card` | Apply the strictest allowlist — this tool already requires both `hrm:payroll_records:view` and `hrm:compensation:view`, keep that unchanged |
| `get_payroll_summary_report` | `summary` | Already aggregate — just wrap it |
| `get_attendance_summary` | `summary` | |

On any permission-denied or not-found case, every tool returns the `error` envelope instead of raising an unhandled exception up through the MCP/chat layer — the calling code (chat endpoint or MCP server) should not need a try/except around every tool call to handle this cleanly.

## 3. Real pagination, with a hard cap

Change `search_employees` (the renamed `list_employees`) and `list_leave_applications` from `skip`/`limit` to `page`/`page_size`:
```python
def search_employees(
    acting_user: User,
    search: str | None = None,
    business_id: int | None = None,
    department_id: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> TableResponse:
```
- Default `page_size` is 20.
- **Hard-cap `page_size` at 50 server-side, regardless of what's requested.** If a caller (including the LLM) asks for more, silently clamp it and note the real total in the response (`"total": 1000`) so the caller/model can tell the user "showing 20 of 1000."
- Add basic `search` text matching on employee name if the underlying `EmployeeService` supports it; if it doesn't, add the minimal query support rather than faking it in Python after fetching everything.

## 4. New count/aggregate tools

Add these to `app/services/ai/tools.py`, wired into `hr_report_server.py` as new `@mcp.tool()` entries, following the exact same `resolve_acting_user()` + permission-check pattern already used by every other tool:

- **`get_employee_count(business_id, department_id=None, status=None) -> NumberResponse`** — requires `hrm:employees:view`. Uses `COUNT(*)` at the database level — never fetches rows to count them in Python.
- **`get_department_employee_count(business_id) -> ChartResponse`** — requires `hrm:employees:view` and `hrm:departments:view`. Returns counts grouped by department via `GROUP BY` at the database level.
- **`get_payroll_status(payroll_period_id, business_id=None) -> SummaryResponse`** — requires `hrm:payroll_periods:view`. Reports processing/payment status for a period, not individual records.

If the underlying service methods for these don't exist yet, add the minimal aggregation method to the relevant service (following the existing pattern of `get_leave_summary_report`/`get_payroll_summary_report`, which already aggregate at the query level) — don't compute the aggregate in Python after pulling every row.

## 5. Column allowlisting on sensitive tools

`get_employee` and `get_employee_payslip` currently likely return full model objects. Change both to return **only** an explicit, named list of fields appropriate to the tool:

- `get_employee`: `employee_id`, `full_name`, `department`, `job_title`, `status`, `work_email` — explicitly **exclude** salary, bank details, national ID, and personal address unless a separate, more tightly permissioned path requests them.
- `get_employee_payslip`: keep as-is in terms of what it returns (it's already the one tool allowed to show compensation figures, gated by two permissions) — just make sure the field list is explicit and named, not "whatever the ORM object serializes to."

This is a hard requirement, not a style preference: no tool other than `get_employee_payslip` may return a salary, bank account number, or national ID field, even if the underlying service call happens to include it in the raw row.

## 6. Update the system prompt

Update the AI chat endpoint's system prompt (wherever it's currently defined) to explicitly steer tool selection:
- Count/total questions ("how many," "what's the total") → the count/aggregate tools from step 4, never `search_employees` followed by counting rows
- "Show me" / "list" questions → `search_employees` or `list_leave_applications`, defaulting to page 1
- The prompt should state plainly: never ask for or expect a full unpaginated dataset; large lists are always paginated; never compute sums/counts/averages yourself — call the matching aggregate tool instead.

## Non-negotiable requirements

- **Every existing permission check and tenant-scoping filter stays exactly as it is today.** This task changes what tools return, not who can call them or what data they can see.
- **No tool computes an aggregate (count, sum, average, group-by) by fetching rows and calculating in Python.** If the database/ORM can do it, the database does it.
- **`page_size` is hard-capped server-side on every paginated tool**, independent of what's requested.
- **The column allowlist in step 5 is enforced in code**, not just described in the system prompt — a malicious or confused model asking for "all fields" must not be able to get sensitive columns back from a tool that isn't `get_employee_payslip`.

## Explicitly out of scope for this task

- Frontend rendering of the new envelope types (`DataTable`, `NumberCard`, etc.) — that's a separate follow-up task.
- CSV/Excel export functionality.
- Any new write operations — everything in this task remains read-only, same as before.

## Deliverables

1. `app/services/ai/response_types.py` with the envelope models.
2. Retrofitted tool functions in `app/services/ai/tools.py`, all returning the correct envelope type.
3. Three new aggregate tools (`get_employee_count`, `get_department_employee_count`, `get_payroll_status`), wired into `hr_report_server.py` alongside the existing ones.
4. Updated system prompt for `/api/ai/chat`.
5. Tests: a `page_size` clamp test (request 500, confirm it's capped at 50 and `total` still reflects the real count), a column-allowlist test confirming `get_employee` never returns salary/bank/national-ID fields, a permission-denied case returning the `error` envelope rather than raising, and a happy-path test per new aggregate tool confirming it issues a `COUNT`/`GROUP BY`/aggregate query rather than fetching all rows (check via query count or mock, not just correct output).
6. A final summary noting: any deviation from the two stated assumptions, which service methods were newly added vs. reused, and confirmation that the existing MCP `hr_report_server.py` path still works unchanged against the retrofitted tool layer.

## Before you finish

List, as a comment at the top of `response_types.py`, each of the eight existing/new tools mapped to its output envelope type — so it's auditable at a glance which tool returns what shape.
