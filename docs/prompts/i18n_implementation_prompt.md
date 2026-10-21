# Jules AI Prompt — Implement Multi-Language (French) Support for HR & Inventory Modules

Copy everything below into Jules.

---

## Context

This is a multi-tenant SaaS backend (FastAPI-style, PostgreSQL) covering an HR & Payroll module and an Inventory/E-commerce module. Each tenant is a `business_id`. We need to add multi-language support, starting with **French**, using a **JSONB translation pattern** (not a separate translations table — confirmed as the right fit given small master-data tables and 2–3 target locales: `en`, `fr`, and `ar` reserved for later).

Do not implement Arabic content yet — just make the schema and API locale-agnostic enough that adding `ar` later requires no migration.

## Scope — entities to localize

**HR module:**
- `departments.name`
- `job_titles.title`
- `leave_types.name`
- `holidays.name`
- `notices.title`, `notices.body`

**Inventory module:**
- `warehouses.name`

Do **not** localize: codes, slugs, numeric fields, dates, currency fields, IDs, or user-generated content (employee names, candidate names, etc.).

## Data model requirements

1. For each field above, change the column type to `JSONB NOT NULL DEFAULT '{}'`.
   Example stored value: `{"en": "Human Resources", "fr": "Ressources Humaines"}`
2. Add a `SUPPORTED_LOCALES` constant/config: `["en", "fr"]` (extendable later).
3. Add a `DEFAULT_LOCALE` config: `"en"`.
4. Add a `default_locale` column to the `business` table (tenant-level default, falls back to global `DEFAULT_LOCALE` if unset).

## API behavior requirements

1. **Locale resolution order** for every GET/list endpoint touching the entities above:
   `?lang=` query param → `Accept-Language` header → business's `default_locale` → global `DEFAULT_LOCALE`.
2. On read (GET/list), **flatten** the JSONB field to a plain string in the requested locale in the response. If the requested locale is missing for a record, fall back to `DEFAULT_LOCALE`, and if that's also missing, return the first available locale — never null/empty when at least one translation exists.
3. Add a `?lang=all` override that returns the raw translation object instead of a flattened string, for admin/editing UIs.
4. On write (POST/PUT), accept the field as a **translations object**, e.g.:
   ```json
   { "name": { "en": "Human Resources", "fr": "Ressources Humaines" } }
   ```
   Also accept a plain string as a **backward-compatible shorthand** meaning "set this for the request's resolved locale only" (don't break existing API consumers sending plain strings).
5. Update **every affected endpoint** — do not localize only the "Create" endpoints and skip "Update"/"Get"/"List". Enumerate all endpoints for the 6 entities above (Create/Get/List/Update/Delete + Excel import/export where present).

## Validation requirements

1. Reject any translation key not in `SUPPORTED_LOCALES` with a `400` error: `"Unsupported locale: <key>. Supported: en, fr"`.
2. Reject empty-string values for a provided locale key (e.g. `{"fr": ""}` is invalid) — either omit the key or provide a non-empty value.
3. On Create, require **at least one** valid locale entry for each mandatory translatable field (don't allow an entity to be created with zero translations).
4. Validate that `lang` query params and `Accept-Language` header values only resolve against `SUPPORTED_LOCALES`; unsupported requested locales should not error — just fall back per the resolution order above, and this fallback behavior must be unit-tested.
5. For Excel import/export (Departments, Job Titles, Leave Types, Holidays, Attendance, Compensation, Payroll): update templates/import logic so translatable columns are split per locale (e.g. `name_en`, `name_fr` columns in the spreadsheet), and importing must apply the same validation rules as the JSON API — do not bypass validation for the Excel import path.
6. Add a migration data-integrity check: after migrating existing plain-string columns to JSONB, verify no rows end up with an empty `{}` object (every existing row's current value must land under the `en` key).

## Step-by-step implementation process

Execute in this order, and confirm each step is complete (tests passing) before moving to the next:

### Step 1 — Config & constants
- Add `SUPPORTED_LOCALES`, `DEFAULT_LOCALE` to app config.
- Add `default_locale` column + migration to `business` table, default `"en"`.

### Step 2 — Database migration
- Write a migration that:
  - Adds new JSONB columns (e.g. `name_i18n`) alongside existing string columns for each of the 6 fields.
  - Backfills `name_i18n = jsonb_build_object('en', name)` for all existing rows.
  - Only after backfill is verified, drop the old string column and rename `name_i18n` → `name`.
- This must be a **two-phase, reversible migration** (add+backfill in one migration, drop+rename in a second), not a single destructive step.

### Step 3 — Shared locale-resolution utility
- Build one shared function/dependency (e.g. `resolve_locale(request, business) -> str`) used by all endpoints, implementing the resolution order above.
- Build one shared serializer helper (e.g. `localize_field(value: dict, locale: str) -> str`) implementing the flatten-with-fallback logic.
- Unit test both in isolation before wiring into endpoints.

### Step 4 — Pydantic/schema layer validation
- Create a reusable `TranslatedField` type/validator that:
  - Accepts either `dict[str, str]` or `str` (shorthand) on input.
  - Enforces the locale-key and non-empty-value rules above.
- Apply it to the request schemas for all 6 entities.

### Step 5 — Endpoint updates (one entity at a time)
For each of: Departments → Job Titles → Leave Types → Holidays → Notices → Warehouses:
- Update Create/Update to accept `TranslatedField`.
- Update Get/List to apply `resolve_locale` + `localize_field`, and support `?lang=all`.
- Update the Postman/API docs example bodies to show the translations object.
- Write/extend tests: create with multi-locale payload, create with shorthand string, get with `?lang=fr`, get with unsupported locale (assert fallback), get with `?lang=all`.

### Step 6 — Excel import/export
- Update templates and import/export logic for Departments, Job Titles, Leave Types, Holidays to read/write per-locale columns.
- Add validation tests for malformed locale columns in uploaded Excel files.

### Step 7 — Regression & integration pass
- Run full test suite.
- Manually verify via Postman collection: French locale end-to-end for at least Departments and Warehouses (Create in `en`+`fr` → Get with `?lang=fr` → Get with `?lang=en` → Get with `?lang=de` and confirm fallback to business default).
- Confirm no endpoint outside the 6 scoped entities was altered.

## Deliverables expected back

1. Migration files (two-phase).
2. Updated schema/model code for the 6 entities.
3. Shared `resolve_locale` and `localize_field` utilities with unit tests.
4. Updated endpoint handlers for all Create/Get/List/Update/Delete/Import/Export routes touching the 6 entities.
5. Updated Excel templates.
6. Test suite covering: valid multi-locale create, shorthand-string create, unsupported-locale rejection, empty-value rejection, locale fallback chain, `?lang=all` behavior, Excel import/export with per-locale columns.
7. A short summary of every file changed and why.

Ask me before proceeding if the existing framework isn't FastAPI/SQLAlchemy/Alembic/PostgreSQL — confirm the actual stack from the repo before writing any code.
