# FastAPI SaaS Platform with HR & Payroll AI Assistant

An Enterprise SaaS Platform built with FastAPI, SQLAlchemy, Jinja2 Templates, and Tailwind CSS, featuring Multi-Tenancy, Granular RBAC, E-Commerce Entity Management, HR & Payroll Management, and an Application-Native AI Assistant.

---

## Native Application AI Assistant

The platform includes an in-app AI Assistant for HR & Payroll analytics and reporting, replacing external clients like Claude Desktop entirely.

### Key AI Features:
- **Application-Native Chat UI**: Integrated directly into the web application at `/mcp/manage` (under **General & Admin > AI Assistant & Reports**).
- **Backend OpenRouter Integration**: Server-side LLM processing via OpenRouter API (OpenAI-compatible tool calling format). API keys live strictly on the server.
- **Permission-Checked Tools**: Reuses shared read-only tool functions (`app/services/ai/tools.py`), enforcing user authentication (`get_current_user`), exact RBAC permission codes, and tenant business isolation.

---

## Environment Setup & Configuration

Copy `.env.example` to `.env` and configure your settings:

```env
APP_ENV=development

DB_NAME=fastapi
DB_USER=postgres
DB_PASSWORD=19863022
DB_HOST=127.0.0.1
DB_PORT=5432

SECRET_KEY=your_secret_key_here

# AI Assistant OpenRouter Settings
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=openrouter/free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

---

## Running the Application

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the FastAPI application with Uvicorn:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

3. Access the web interface at `http://127.0.0.1:8000`.

---

## Running Tests

Run unit and integration tests with SQLite in-memory database:

```bash
DATABASE_URL="sqlite+aiosqlite:///:memory:" SECRET_KEY=testsecretkey APP_ENV=production python3 -m pytest
```

---

## Tool & RBAC Mapping Reference

| Tool Name | Required Permission Code(s) | Description |
|---|---|---|
| `list_employees` | `hrm:employees:view` | List non-financial employee profiles |
| `get_employee` | `hrm:employees:view` | Detailed employee profile by UUID or code |
| `list_leave_applications` | `hrm:leave_applications:view` | Filterable leave requests list |
| `get_employee_leave_balance` | `hrm:leave_allocations:view` | Employee leave allocations and balances |
| `get_leave_summary_report` | `hrm:leave_applications:view` | Aggregated leave request counts |
| `get_employee_payslip` | `hrm:payroll_records:view` AND `hrm:compensation:view` | Payslip details (requires dual permissions) |
| `get_payroll_summary_report` | `hrm:payroll_records:view` | Aggregated company payroll summary |
| `get_attendance_summary` | `hrm:attendance:view` | Employee work hours, overtime, & attendance metrics |
