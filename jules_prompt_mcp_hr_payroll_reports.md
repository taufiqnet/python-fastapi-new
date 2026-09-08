# Prompt for Jules AI

Copy everything below into Jules as a single task.

---

You are a senior backend engineer joining an existing FastAPI SaaS project. Your task is to build a **read-only Model Context Protocol (MCP) server** that exposes employee, leave, and payroll data from the existing HR & Payroll module as MCP tools, so AI clients like Claude can answer questions and produce reports ("how many people are on leave this week", "what was total payroll cost last period") through natural language instead of the HTTP API directly.

## Context — read before writing any code

The project already has an identity/RBAC module at `app/core/identity/` (`User`, `Role`, `Permission`, `UserRepository`, `UserService`, `require_permission()` in `app/core/security.py`) — this is the pattern to follow for structure and authorization style. Do not touch that module.

The HR & Payroll data lives in a separate module (locate it in the codebase — likely `app/modules/hr_payroll/` or similar, following the same `models.py` / `repository.py` / `service.py` layering as identity). Before writing anything, find and read the actual models and services for at least: `Employee`, `Department`, `JobTitle`, `LeaveType`, `LeaveAllocation`, `LeaveApplication`, `Attendance`, `Compensation`, `PayrollPeriod`, `PayrollRecord`. Use their real field names and existing service/repository methods — do not guess at a shape that doesn't match the actual code.

Known permission codes already seeded for this module (from `app/core/identity/seed.py`), all following `hrm:{feature}:view`:
`hrm:employees:view`, `hrm:departments:view`, `hrm:job_titles:view`, `hrm:leave_types:view`, `hrm:leave_allocations:view`, `hrm:leave_applications:view`, `hrm:attendance:view`, `hrm:compensation:view`, `hrm:holidays:view`, `hrm:payroll_periods:view`, `hrm:payroll_records:view`.

**Do not build a new auth system, a new database layer, or duplicate business logic.** This MCP server is a thin, read-only adapter over whatever HR/payroll services already exist. If a read-only aggregation method doesn't exist yet (e.g. "total payroll cost for a period"), add the minimal method to the relevant service — don't compute it ad hoc inside the MCP tool by querying models directly.

## Objective

Build `app/mcp/hr_report_server.py` using the official Python MCP SDK, running over **stdio transport only** for this phase — same constraint as the existing `app/mcp/user_server.py`, and it should follow that file's conventions for acting-user resolution and error handling (read it first).

## This is optional, isolated infrastructure — treat it that way

The MCP server is an **add-on**, not a core part of this application. The existing FastAPI app, its startup sequence, and its HR & Payroll module must work identically whether this MCP server exists, is broken, or is deleted entirely. This has concrete implications:

- **One-directional dependency only.** `app/mcp/hr_report_server.py` may import from `app/core/hr_payroll/` (or wherever the real module lives) and from `app/core/identity/`. Nothing in `app/core/` — no model, repository, service, or router — may import anything from `app/mcp/`. If you find yourself wanting to add an MCP-aware branch inside an existing service or router, stop and put that logic in the MCP layer instead.
- **No changes to `app/main.py` startup behavior.** Do not add MCP server startup, imports, or initialization to the main FastAPI app's lifespan/startup hooks. The MCP server is launched as its own separate process with its own entrypoint (e.g. `python -m app.mcp.hr_report_server`), never imported or triggered by `uvicorn app.main:app`.
- **Separate dependency footprint.** Put the MCP SDK dependency in its own file (e.g. `app/mcp/requirements.txt` or a `[project.optional-dependencies]` extra), not merged into the main `requirements.txt`. If the MCP SDK isn't installed, the existing app must still build, deploy, and run without error — it should have no idea `app/mcp/` exists.
- **No performance impact, ever.** No request handled by the existing FastAPI app should do any extra work, import, or check because this MCP server exists. There is no scenario where a normal user-facing HTTP request should get slower because of anything built in this task.
- **Must be deletable in one step.** `rm -rf app/mcp/` (plus removing its optional dependency file) must leave the rest of the application fully functional — same routes, same behavior, same startup, zero errors. Verify this yourself before considering the task done: delete the directory in a scratch branch, run the existing test suite, confirm it's untouched.

## Required tools (exact names and behavior)

All tools are **read-only** — this server must not create, update, or delete anything.

1. `list_employees(business_id: int | None = None, department_id: int | None = None, skip: int = 0, limit: int = 100)` — requires `hrm:employees:view`.
2. `get_employee(employee_id: int)` — requires `hrm:employees:view`.
3. `list_leave_applications(business_id: int | None = None, employee_id: int | None = None, status: str | None = None, start_date: str | None = None, end_date: str | None = None)` — requires `hrm:leave_applications:view`.
4. `get_employee_leave_balance(employee_id: int)` — requires `hrm:leave_allocations:view`.
5. `get_leave_summary_report(business_id: int, period_start: str, period_end: str)` — aggregate counts by leave type and status, not raw rows. Requires `hrm:leave_applications:view`.
6. `get_employee_payslip(employee_id: int, payroll_period_id: int)` — requires `hrm:payroll_records:view` **and** `hrm:compensation:view`. Returns figures for exactly one employee, one period.
7. `get_payroll_summary_report(business_id: int, payroll_period_id: int)` — aggregate totals only (headcount, total gross, total net, total deductions) — never a per-employee breakdown from this tool. Requires `hrm:payroll_records:view`.
8. `get_attendance_summary(employee_id: int, period_start: str, period_end: str)` — requires `hrm:attendance:view`.

## Non-negotiable requirements

- **Every tool call must run the exact permission check named above** against the resolved acting user (`user.has_permission(code)`), before touching any HR data. A tool with two required permissions (`get_employee_payslip`) must check both, not just one.
- **Tenant scoping**: every query must be filtered by `business_id` consistent with how the identity module already scopes data. The acting user must never be able to pull another business's employees, leave, or payroll data — verify this explicitly in tests, not just by code inspection.
- **Salary/compensation data gets stricter treatment than everything else in this list.** `get_employee_payslip` is the only tool allowed to return individual dollar figures tied to a named employee — every other tool must stay at aggregate or non-financial detail (names, dates, statuses, counts). Do not add a per-employee breakdown to `get_payroll_summary_report` "for convenience" — that defeats the point of the separate, more tightly gated tool.
- **No write paths of any kind.** If you find yourself needing a service method that doesn't exist, only add read/aggregation methods — never a create/update method, even a small one, as part of this task.
- **Error handling**: mirror `user_server.py`'s pattern — catch existing service exceptions, return clear MCP error responses, never leak raw stack traces or raw SQL errors.
- **Reuse the acting-user mechanism already built for `user_server.py`** (`MCP_ACTING_USER_ID` env var resolved via the identity repository) — don't invent a second, different auth resolution path for this server.

## Explicitly out of scope for this task

- Any create, update, or delete operation on employees, leave, attendance, or payroll data.
- Recruitment, notice board, appointment letters, salary certificates, payroll settings — only the eight tools listed above.
- Remote/HTTP transport, OAuth — future phase.
- Any change to the identity module or `user_server.py` itself.

## Deliverables

1. `app/mcp/hr_report_server.py` — the MCP server entrypoint.
2. Any new minimal read/aggregation methods added to the relevant HR/payroll service(s), each with a one-line comment noting why it was needed.
3. A short addition to `app/mcp/README.md` documenting these new tools alongside the existing ones, including the two-permission case for `get_employee_payslip`.
4. Tests (pytest) covering: a permission-denied case for `get_employee_payslip` when the acting user lacks `hrm:compensation:view`, a tenant-scoping case (business A cannot see business B's employees or payroll), and a happy path for `get_leave_summary_report` and `get_payroll_summary_report` confirming they return aggregates only, never per-employee salary rows.
5. A one-line confirmation in your final summary that you ran the "delete `app/mcp/`, run the existing test suite" check described above, and that it passed with zero failures.

## Before you finish

List, as a comment at the top of `hr_report_server.py`, each tool mapped to its required permission code(s) and the exact service method it calls — so the sensitive ones (payslip, payroll summary) are auditable at a glance without reading the whole file.
