# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Scheduled for Phase 2: Time, Attendance & Statutory Leave
- **Shift & Duty Roster Management**: Custom working hour schedules, multi-shift patterns, and dynamic roster assignments.
- **Attendance Processing**: Real-time punch log capture, biometric device sync, late-in/early-out tracking, and regularization workflow.
- **Statutory Leave Management (BLA 2006)**: Casual, Sick, Annual/Earned, and Maternity leave allocations with auto-computed carry-forward rules.
- **Self-Service Leave Applications**: Two-tier approval routing (Line Manager -> HR Head) with balance validations.

### Scheduled for Phase 3: Compensation & Payroll
- **Salary Components & Grade Structure**: Basic, House Rent, Medical, Conveyance, statutory allowances, and PF/Tax deductions.
- **Monthly Payroll Computation**: Automatic deduction of unpaid leaves, overtime calculation, and tax withholding.
- **Bank Advice & Payslips**: Bulk bank transfer generation and self-service downloadable payslip PDFs.

### Scheduled for Phase 4: Lifecycle, Letters & Offboarding
- **Letter Generation Engine**: Offer letters, appointment letters, salary certificates, and experience letters with template tokens.
- **Career Lifecycle**: Promotions, designation changes, salary increments, and inter-branch transfers.
- **Separation & Final Settlement**: Resignation workflow, clearance checklist, gratuity/provident fund settlement.

---

## [1.1.0] - 2026-11-05
### Phase 1: HR & Payroll Core Foundation & Workforce Management

#### Added
- **Core HR & Organization Data Models**:
  - `Department`, `JobTitle`, `Branch` entities with strict multi-tenant scoping (`business_id`).
  - `Employee` master model supporting personal, contact, identity, emergency, job, and banking profiles.
  - `EmployeeDocument` digital dossier repository for NID, passport, educational certificates, and employment contracts.
- **REST APIs**:
  - `GET /api/v1/departments`, `POST /api/v1/departments`, `PUT /api/v1/departments/{id}`
  - `GET /api/v1/job-titles`, `POST /api/v1/job-titles`, `PUT /api/v1/job-titles/{id}`
  - `GET /api/v1/employees`, `POST /api/v1/employees`, `GET /api/v1/employees/{id}`, `PUT /api/v1/employees/{id}`
  - `POST /api/v1/employees/bulk-import` for batch CSV/Excel employee onboarding.
  - `GET /api/v1/employees/export` for regulatory reporting.
- **Frontend User Interface (Next.js)**:
  - In-place searchable employee roster with non-destructive filtering (`initialLoading` vs `isFetching`).
  - Searchable dropdowns for departments and job titles with quick-add modal triggers.
  - Multi-tab employee profile editor with client-side and server-side BLA 2006 validation.
- **RBAC & Security**:
  - Seeded permission codes: `hrm:departments:*`, `hrm:job_titles:*`, `hrm:employees:*`, `hrm:documents:*`.
  - Enforced tenant isolation via `business_id` across all queries and commands.

#### Changed
- Updated `sidebar.tsx` navigation to partition the HR & Payroll menu into distinct functional phases.
- Enhanced `_sync_missing_columns` in `app/main.py` to auto-reconcile schema updates on server startup without requiring destructive drops.
- Configured `frontend/next.config.ts` for `output: "standalone"` production packaging on cPanel.

---

## [1.0.0] - 2026-09-01
### Baseline Multi-Tenant Enterprise Platform

#### Added
- FastAPI async backend with SQLAlchemy 2.0 and PostgreSQL support.
- Central identity and RBAC engine (superadmins, tenant roles, granular permission codes).
- Enterprise Multi-tenancy architecture with `business_id` tenancy scoping.
- E-commerce and inventory modules (Products, Categories, Brands, Orders, POS Register).
- Passenger WSGI bridge (`passenger_wsgi.py`) for CloudLinux cPanel LiteSpeed hosting.

