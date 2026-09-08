# Prompt for Jules AI

Copy everything below into Jules as a single task.

---

You are a senior backend engineer joining an existing FastAPI SaaS project. Your task is to build a **Model Context Protocol (MCP) server** that exposes our existing `UserService` (identity, RBAC, tenancy) as MCP tools, so AI clients like Claude can manage users, roles, and permissions through natural language instead of the HTTP API directly.

## Context — read before writing any code

The project already has, under `app/core/identity/`:
- `models.py` — `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `UserPermission`, `CustomerProfile`, `VendorProfile`, `Address`. `User.has_permission(code)` and `User.has_role(name)` already exist and are the source of truth for authorization.
- `repository.py` — `UserRepository`, fully async (`AsyncSession`).
- `service.py` — `UserService`, wraps the repository, already raises `HTTPException` for domain errors (not found, duplicate username/email, etc.).
- `schemas.py` — Pydantic schemas: `UserCreate`, `UserUpdate`, `RoleCreate`, etc.
- `app/core/security.py` — `get_current_user`, `get_current_admin`, `require_permission(module, feature, action)`, JWT helpers.
- Multi-tenancy: every `User` and `Role` has a nullable `business_id`. `null` means global/system-level.
- Permission codes follow `module:feature:action`, e.g. `general:users_permissions:view`, `general:users_permissions:create`.

**Do not build a new auth system, a new database layer, or duplicate business logic.** The MCP server is a thin adapter over the existing `UserService`. If a capability doesn't exist on `UserService` yet, add the minimal method there and call it from the tool — don't reimplement it inline in the MCP layer.

## Objective

Build `app/mcp/user_server.py` (and supporting files as needed) that exposes `UserService` operations as MCP tools using the official Python MCP SDK, running over **stdio transport only** for this phase — no remote/HTTP transport, no OAuth server. This is for local development and internal admin use via Claude Desktop / Claude Code, not public exposure.

## Required tools (exact names and behavior)

Implement these as MCP tools, each backed by a real call into `UserService`:

1. `list_users(business_id: int | None = None, skip: int = 0, limit: int = 100)` — read-only.
2. `get_user(user_id: int)` — read-only.
3. `create_user(username: str, email: str, password: str, phone: str | None, business_id: int | None)` — write.
4. `update_user(user_id: int, ...same optional fields as UserUpdate...)` — write.
5. `delete_user(user_id: int)` — write, destructive.
6. `assign_role(user_id: int, role_name: str)` — write.
7. `remove_role(user_id: int, role_name: str)` — write.
8. `list_roles(business_id: int | None = None)` — read-only.

Each tool's input schema must mirror the corresponding Pydantic schema field-for-field where one exists (`UserCreate`, `UserUpdate`) — don't invent a parallel shape.

## Non-negotiable requirements

- **Every tool call must be authorized exactly like the HTTP routes are.** Before calling into `UserService`, resolve which human is behind this MCP session (see "Acting-user context" below) and run the equivalent check to what the matching FastAPI route uses — e.g. `create_user` should require the same permission as `POST /users/api` does today. Do not create a version of these operations that bypasses RBAC "because it's just for admins" — enforce it in code, not by assumption.
- **Acting-user context**: since stdio has no per-request auth, the server must be started with an explicit identity (e.g. `MCP_ACTING_USER_ID` env var read at startup, resolved to a real `User` row via `UserRepository.get_by_id`). Every tool call uses that resolved user's `has_permission()` / `has_role()` for its authorization check. If no valid acting user is configured, the server must fail to start with a clear error — never fall back to a superuser or unauthenticated default.
- **Tenant scoping**: any tool that lists or mutates data must respect `business_id` scoping the same way the repository/service already does. Don't let the acting user list or modify users outside their own business unless they're a superuser.
- **Destructive actions need confirmation in the tool description.** `delete_user`'s MCP tool description must clearly state it's irreversible and that the target cannot be a superuser (mirror the existing `delete_user` service guard).
- **Error handling**: catch the `HTTPException`s the service already raises and translate them into clear MCP tool error responses (don't leak raw stack traces). Don't swallow errors silently.
- **No new dependencies beyond** the official MCP Python SDK and what's already in `requirements.txt`, unless something is genuinely missing — if so, name it explicitly rather than silently adding it.

## Explicitly out of scope for this task

- Remote/HTTP transport, OAuth, multi-user concurrent MCP sessions — future phase, don't build it now.
- Any new UI, any changes to existing FastAPI routes.
- Payroll, ecommerce, or any module other than identity/RBAC.

## Deliverables

1. `app/mcp/user_server.py` — the MCP server entrypoint.
2. Any new minimal methods added to `UserService` if genuinely required, with a one-line note on why each was needed.
3. A short `app/mcp/README.md` explaining: how to run it locally (exact command), how `MCP_ACTING_USER_ID` is set, and a copy-pasteable Claude Desktop config snippet pointing at it.
4. Basic tests (pytest) covering: a permission-denied case, a tenant-scoping case (business A cannot touch business B), and a happy path for at least `list_users` and `create_user`.

## Before you finish

Walk through each of the 8 tools out loud and confirm which existing permission code it maps to and which `UserService`/`UserRepository` method it calls — list this mapping explicitly at the top of `user_server.py` as a comment, so it's auditable at a glance.
