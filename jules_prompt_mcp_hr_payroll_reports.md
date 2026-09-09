# Prompt for Jules AI

Copy everything below into Jules as a single task.

---

You are a senior backend engineer joining an existing FastAPI SaaS project. A previous phase of this project built a read-only MCP server (`app/mcp/hr_report_server.py`) exposing HR/payroll data as tools for Claude Desktop over stdio. **This task replaces Claude Desktop as the client entirely** with an application-native AI chat feature, built into the existing frontend and backend, using OpenRouter as the LLM provider — while reusing the underlying tool logic and permission model that server already established.

Do NOT rebuild the application from scratch. First inspect the existing project structure — the current frontend framework, the FastAPI routers/services/repositories, `app/core/security.py` (`get_current_user`, `require_permission`), the database models, and the existing `app/mcp/` implementation — before writing anything. Reuse existing components wherever possible.

## Context — read before writing any code

- Identity/RBAC lives at `app/core/identity/` (`User`, `Role`, `Permission`, `UserService`, `require_permission()`). Every existing HTTP route already authenticates via `get_current_user`. The new AI chat endpoint must use this same mechanism — do not invent a second auth path.
- HR & Payroll services live in a separate module (locate it — likely `app/modules/hr_payroll/` or similar).
- `app/mcp/hr_report_server.py` already defines eight read-only tools (`list_employees`, `get_employee`, `list_leave_applications`, `get_employee_leave_balance`, `get_leave_summary_report`, `get_employee_payslip`, `get_payroll_summary_report`, `get_attendance_summary`), each gated by a specific `hrm:*:view` permission code and scoped by `business_id`. **Read this file first.** The tool *logic* (which service method to call, which permission to check, how tenant scoping is applied) is exactly what you're reusing — you are not redesigning what these tools do, only changing how they're invoked and by whom.
- Permission codes in use: `hrm:employees:view`, `hrm:departments:view`, `hrm:job_titles:view`, `hrm:leave_types:view`, `hrm:leave_allocations:view`, `hrm:leave_applications:view`, `hrm:attendance:view`, `hrm:compensation:view`, `hrm:holidays:view`, `hrm:payroll_periods:view`, `hrm:payroll_records:view`.

## Target architecture

```
Frontend Chat UI
      ↓
FastAPI AI Chat Endpoint (authenticated)
      ↓
OpenRouter API (backend-side only)
      ↓
Free LLM
      ↓
Tool calling → same permission-checked HR/payroll tool functions
      ↓
Existing FastAPI services → PostgreSQL
```

**The frontend must never call OpenRouter directly, and the OpenRouter API key must never reach the frontend.** All AI calls happen server-side.

## 1. Remove Claude Desktop as the client — but keep the tool logic

Search the repo for `claude`, `Claude Desktop`, `claude_desktop_config`, and MCP client references. Remove:
- Any documentation or README instructions telling users to install/configure Claude Desktop
- The `MCP_ACTING_USER_ID` env-var-based acting-user pattern, since the new chat endpoint resolves the real logged-in user through `get_current_user` instead — there's no need to simulate an acting user anymore
- Any startup/config coupling to Claude Desktop specifically

**Do NOT delete `app/mcp/hr_report_server.py` or its tool functions.** Refactor the actual tool logic (the permission check + service call + tenant scoping for each of the eight tools) into a shared, framework-agnostic layer — e.g. `app/services/ai/tools.py` — that both the old MCP server (if you keep it available) and the new chat endpoint can call. Don't duplicate the permission/scoping logic in two places.

## 2. OpenRouter integration

Add to the environment configuration, following the project's existing `Settings` pattern in `app/core/config.py`:
```
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openrouter/free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```
Never commit a real key. Update `.env.example` if one exists, with placeholder values only.

Build a small provider abstraction (e.g. `app/services/ai/provider.py`) so OpenRouter isn't hardwired throughout the app:
```
AIProvider (interface)
└── OpenRouterProvider (implemented now)
```
Only implement OpenRouter for this task — the abstraction just needs to make adding another provider later a contained change, not a rewrite.

## 3. AI chat endpoint

```
POST /api/ai/chat
{
  "message": "Show this month's payroll summary",
  "conversation_id": "optional-id"
}
→
{
  "message": "Here is the payroll summary...",
  "conversation_id": "..."
}
```
Protect this route with the existing `Depends(get_current_user)` — the acting user for every tool call inside this request **is** the authenticated user, resolved the normal way, not an env var.

## 4. System prompt

The assistant must:
- Know it's the HR Payroll application's assistant, not a general-purpose chatbot
- Treat the database (via tools) as the only source of truth — never invent employee data, salary figures, or payroll calculations
- Call a tool whenever the answer depends on real data, rather than guessing
- Explain calculations in plain language
- Ask for clarification on ambiguous requests instead of guessing which employee/period/department is meant

## 5. Tool calling — reuse, don't duplicate

Expose the same eight tools (or the subset that's already built) to OpenRouter's tool-calling API, backed by the shared tool layer from step 1. Every tool call inside `/api/ai/chat` must:
- Run against the **real authenticated user from the request**, not a configured acting user
- Run the exact same permission check the tool already enforces (`hrm:employees:view`, etc.) — if the user lacks it, the tool returns a permission-denied result that the assistant then explains to the user, rather than crashing the endpoint
- Stay scoped to that user's `business_id`, exactly as today

**Salary/compensation data keeps the same strict treatment as before**: `get_employee_payslip` remains the only tool returning a named individual's dollar figures, requires both `hrm:payroll_records:view` and `hrm:compensation:view`, and `get_payroll_summary_report` stays aggregate-only. Do not loosen this while wiring it into the chat flow.

**Never create a generic `execute_sql()` or `run_any_database_query()` tool.** Every tool the assistant can call must be one of the specific, permission-gated business functions already defined — no free-form query access, ever.

## 6. Frontend chat UI

Add a chat panel to the existing frontend, matching its current framework and design system (don't introduce a new UI library for this). Support: message history, loading/error states, send-on-click and Enter-to-send, auto-scroll, a "clear conversation" action, markdown rendering (including tables, since payroll summaries are naturally tabular), and a responsive/mobile layout. Include a handful of quick-action suggestion prompts shown when the chat is empty (e.g. "Show this month's payroll summary," "Show pending leave requests") that populate and send the corresponding message on click.

## 7. Conversation storage

Inspect the existing database models first — if something chat/message-shaped already exists, reuse it. Otherwise add the minimum: `conversation_id`, `user_id`, `messages`, `created_at`, `updated_at`. No long-term memory or summarization needed for this phase — a straightforward message log per conversation is enough.

## 8. Error handling

Handle OpenRouter being unavailable, timeouts, rate limits, an unavailable free model, invalid API key, empty responses, and malformed tool calls. On any of these, return a safe generic message to the frontend (e.g. "AI service is temporarily unavailable. Please try again.") — never leak stack traces, the API key, internal URLs, or raw SQL/database errors in the response.

## Non-negotiable requirements

- **No frontend-to-OpenRouter calls, ever.** The API key lives only in backend environment configuration.
- **Reuse `get_current_user`** for authenticating `/api/ai/chat` — no parallel auth mechanism.
- **Every tool call is permission-checked and tenant-scoped**, exactly as the original MCP tools already enforce — this task changes the transport and the identity source, not the authorization logic.
- **No arbitrary SQL access** for the assistant, under any framing.
- **Don't break anything existing** — employee management, payroll, attendance, leave, existing reports, existing APIs, existing frontend pages, and the database must all keep working exactly as they do today. This is an additive feature.

## Explicitly out of scope

- Any write operations through the assistant (create/update/delete employee, payroll, or leave data) — this stays read-only reporting, same as before.
- Building support for additional AI providers beyond OpenRouter right now — just make the abstraction easy to extend later.
- Sophisticated conversation memory/summarization.

## Deliverables

1. Shared tool layer (e.g. `app/services/ai/tools.py`) reused by both the chat endpoint and (if kept) the original MCP server.
2. OpenRouter provider (`app/services/ai/provider.py` or equivalent) and the `/api/ai/chat` endpoint.
3. Frontend chat UI matching the existing design system, with the features listed in step 6.
4. Conversation storage (reused or newly minimal, per step 7).
5. Updated README covering: the new architecture, OpenRouter setup and how to obtain a key, the new environment variables, example questions, and security considerations — and stating clearly that Claude Desktop is no longer required for this feature.
6. Tests: the chat endpoint's auth requirement, a permission-denied case for `get_employee_payslip` via chat, a tenant-scoping case, OpenRouter error handling (timeout/invalid key/rate limit), and a frontend check that existing HR/payroll pages are unaffected.
7. A final summary listing: files changed, files added, files removed, environment variables added, how to run and test the AI assistant, and any assumptions or limitations you hit along the way.

## Before you finish

Confirm in your summary that you inspected the existing `app/mcp/hr_report_server.py` tool logic before reimplementing anything, and list which permission code each exposed chat tool maps to — same audit-at-a-glance requirement as before, now applied to the chat endpoint's tool set.
