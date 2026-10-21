# ProERP Documentation Index

This directory organizes all project specifications, architecture plans, implementation prompts, and guides.

---

## 📁 Directory Structure

```
docs/
├── plans/            # Feature & architecture implementation plans
├── specifications/   # System requirements (SRS), modular architecture, & CI/CD
├── prompts/          # AI and feature specification prompts
└── guides/           # Operational runbooks, commands, & user manuals
```

---

## 📐 Architecture & Implementation Plans (`docs/plans/`)

| Document | Description |
| :--- | :--- |
| [user_role_permission_plan.md](plans/user_role_permission_plan.md) | User accounts, roles, granular permissions matrix, and Pure RBAC design |
| [subscription_plan_strategy_plan.md](plans/subscription_plan_strategy_plan.md) | Subscription plan strategy, domestic single-strategy resolution, and admin catalog |
| [core_employee_management_hris_plan.md](plans/core_employee_management_hris_plan.md) | Core HRIS employee profiles, work arrangements, and employment lifecycles |
| [leave_management_nextjs_architecture_plan.md](plans/leave_management_nextjs_architecture_plan.md) | Next.js leave management architecture, statutory allocations, and approvals |
| [organogram_and_organization_setup_plan.md](plans/organogram_and_organization_setup_plan.md) | Visual organizational hierarchy, departments, and job titles setup |
| [department_tab_enhancement_plan.md](plans/department_tab_enhancement_plan.md) | Department management UI/UX enhancements and tab navigation |
| [employee_basic_and_details_crud_plan.md](plans/employee_basic_and_details_crud_plan.md) | Employee CRUD forms, validation rules, and tabbed details view |
| [full_stack_separation_plan.md](plans/full_stack_separation_plan.md) | Next.js full-stack separation from legacy monolith views |
| [bangladesh_job_grade_architecture_plan.md](plans/bangladesh_job_grade_architecture_plan.md) | Bangladesh statutory job grading & compensation alignment (BLA 2006) |

---

## 📋 System Specifications (`docs/specifications/`)

| Document | Description |
| :--- | :--- |
| [SRS.md](specifications/SRS.md) | System Requirements Specification (SRS) for ProERP SaaS Platform |
| [saas-platform-modular-structure.md](specifications/saas-platform-modular-structure.md) | Modular domain architecture (Identity, Tenancy, HRM, Finance, Ecommerce) |
| [system_structure.md](specifications/system_structure.md) | Directory structure and module-by-module backend package organization |
| [authentication_flow.md](specifications/authentication_flow.md) | End-to-end authentication flow diagram (Registration, Password hashing, JWT, RBAC) |
| [cicd_architecture.md](specifications/cicd_architecture.md) | Continuous integration, delivery pipelines, and container deployment |
| [ai_assistant.md](specifications/ai_assistant.md) | AI Assistant domain architecture, prompt definitions, and tool integrations |

---

## 💬 Prompts & Templates (`docs/prompts/`)

| Document | Description |
| :--- | :--- |
| [prompt_proerp_standard_list_layout.md](prompts/prompt_proerp_standard_list_layout.md) | Standard UI list layout guidelines, in-place filtering, and pagination rules |
| [prompt_mcp_hr_payroll_reports.md](prompts/prompt_mcp_hr_payroll_reports.md) | Model Context Protocol (MCP) server for HR & Payroll reporting tools |
| [prompt_mcp_user_service.md](prompts/prompt_mcp_user_service.md) | MCP service layer for identity and user management |
| [prompt_ai_response_envelope_and_tools.md](prompts/prompt_ai_response_envelope_and_tools.md) | Structured AI response format and tool call schemas |
| [prompt_import_excel.md](prompts/prompt_import_excel.md) | Bulk Excel data import specifications for employee and product catalogs |
| [i18n_implementation_prompt.md](prompts/i18n_implementation_prompt.md) | Multi-language localization and translation setup (EN / BN) |
| [prompt_list.md](prompts/prompt_list.md) | Master catalog of development prompts |

---

## 📖 Operational Guides & Manuals (`docs/guides/`)

| Document | Description |
| :--- | :--- |
| [user_manual.md](guides/user_manual.md) | End-user navigation and operational manual |
| [offline_sync_guide.md](guides/offline_sync_guide.md) | Local SQLite to cloud PostgreSQL offline synchronization guide |
| [commands.md](guides/commands.md) | Developer reference commands for Docker, testing, and migration workflows |
