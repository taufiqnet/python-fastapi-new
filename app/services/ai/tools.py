"""
Shared HR & Payroll AI Tool Layer

Exposes framework-agnostic business tools with permission checks, tenant scoping,
and token-optimized AI response envelopes.
"""

import uuid
from datetime import datetime
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.identity.models import User
from app.modules.hr_payroll.attendance.service import AttendanceService
from app.modules.hr_payroll.employees.repository import EmployeeRepository
from app.modules.hr_payroll.employees.service import EmployeeService
from app.modules.hr_payroll.leave.service import (
    LeaveAllocationService,
    LeaveApplicationService,
)
from app.modules.hr_payroll.payroll.service import (
    PayrollPeriodService,
    PayrollRecordService,
)
from app.services.ai.response_types import (
    AIResponseEnvelope,
    ChartResponse,
    EmployeeCardResponse,
    ErrorResponse,
    ListResponse,
    NumberResponse,
    SummaryResponse,
    TableResponse,
)


def check_permissions(user: User, required_permissions: list[str]) -> None:
    """
    Ensures user has all required permission code(s).
    """
    for code in required_permissions:
        if not user.has_permission(code):
            raise PermissionError(
                f"Permission denied: user lacks required permission '{code}'"
            )


def validate_and_get_business_id(
    user: User, requested_business_id: int | None
) -> int | None:
    """
    Enforces tenant scoping based on user's business_id.
    """
    if user.is_superuser:
        return requested_business_id

    user_biz_id = user.business_id
    if requested_business_id is not None and requested_business_id != user_biz_id:
        raise PermissionError(
            f"Tenant scoping violation: cannot access data for business_id {requested_business_id}"
        )
    return user_biz_id


def parse_uuid(val: str, field_name: str = "ID") -> uuid.UUID:
    try:
        return uuid.UUID(str(val))
    except (ValueError, TypeError):
        raise ValueError(f"Invalid UUID format for {field_name}: '{val}'")


# ---------------------------------------------------------------------------
# Tool Implementations
# ---------------------------------------------------------------------------

def execute_search_employees(
    db: Session,
    user: User,
    search: str | None = None,
    business_id: int | None = None,
    department_id: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> AIResponseEnvelope:
    """
    Requires permission: hrm:employees:view
    """
    try:
        check_permissions(user, ["hrm:employees:view"])
        eff_biz_id = validate_and_get_business_id(user, business_id)
        dept_uuid = parse_uuid(department_id, "department_id") if department_id else None

        eff_page = max(1, page)
        eff_page_size = min(max(1, page_size), 50)  # Hard cap at 50
        skip = (eff_page - 1) * eff_page_size

        service = EmployeeService()
        employees, total = service.search_employees(
            db,
            search=search,
            business_id=eff_biz_id,
            department_id=dept_uuid,
            status=status,
            skip=skip,
            limit=eff_page_size,
        )

        columns = [
            "id",
            "employee_id",
            "full_name",
            "work_email",
            "department",
            "job_title",
            "employment_type",
            "is_active",
        ]

        rows = []
        for e in employees:
            rows.append({
                "id": str(e.id),
                "employee_id": e.employee_id,
                "full_name": e.full_name,
                "work_email": e.work_email,
                "department": e.department.name if e.department else None,
                "job_title": e.job_title.name if e.job_title else None,
                "employment_type": e.employment_type.value if e.employment_type else None,
                "is_active": e.is_active,
            })

        return TableResponse(
            title="Employee Directory",
            total=total,
            page=eff_page,
            page_size=eff_page_size,
            columns=columns,
            rows=rows,
        )
    except PermissionError as e:
        return ErrorResponse(message=str(e))
    except ValueError as e:
        return ErrorResponse(message=str(e))
    except HTTPException as e:
        return ErrorResponse(message=str(e.detail))
    except Exception as e:
        return ErrorResponse(message=f"Unexpected error: {str(e)}")


def execute_list_employees(
    db: Session,
    user: User,
    business_id: int | None = None,
    department_id: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> AIResponseEnvelope:
    """
    Thin backward-compatible wrapper around search_employees.
    """
    page_size = min(max(1, limit), 50)
    page = (skip // page_size) + 1 if page_size > 0 else 1
    return execute_search_employees(
        db,
        user,
        search=None,
        business_id=business_id,
        department_id=department_id,
        status=None,
        page=page,
        page_size=page_size,
    )


def execute_get_employee(
    db: Session,
    user: User,
    employee_id: str,
) -> AIResponseEnvelope:
    """
    Requires permission: hrm:employees:view
    Enforces column allowlist: employee_id, full_name, department, job_title, status, work_email.
    Excludes salary, bank details, national ID, personal address.
    """
    try:
        check_permissions(user, ["hrm:employees:view"])

        service = EmployeeService()
        employee = None
        try:
            emp_uuid = parse_uuid(employee_id, "employee_id")
            employee = service.get_employee(db, emp_uuid)
        except (ValueError, HTTPException):
            repo = EmployeeRepository()
            employee = repo.get_by_employee_id(db, employee_id, business_id=user.business_id)

        if not employee:
            return ErrorResponse(message=f"Employee '{employee_id}' not found")

        validate_and_get_business_id(user, employee.business_id)

        employee_dict = {
            "employee_id": employee.employee_id,
            "full_name": employee.full_name,
            "department": employee.department.name if employee.department else None,
            "job_title": employee.job_title.name if employee.job_title else None,
            "status": "Active" if employee.is_active else "Inactive",
            "work_email": employee.work_email,
        }

        return EmployeeCardResponse(employee=employee_dict)
    except PermissionError as e:
        return ErrorResponse(message=str(e))
    except ValueError as e:
        return ErrorResponse(message=str(e))
    except HTTPException as e:
        return ErrorResponse(message=str(e.detail))
    except Exception as e:
        return ErrorResponse(message=f"Unexpected error: {str(e)}")


def execute_list_leave_applications(
    db: Session,
    user: User,
    business_id: int | None = None,
    employee_id: str | None = None,
    status: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> AIResponseEnvelope:
    """
    Requires permission: hrm:leave_applications:view
    """
    try:
        check_permissions(user, ["hrm:leave_applications:view"])
        eff_biz_id = validate_and_get_business_id(user, business_id)
        emp_uuid = parse_uuid(employee_id, "employee_id") if employee_id else None

        eff_page = max(1, page)
        eff_page_size = min(max(1, page_size), 50)  # Hard cap at 50

        service = LeaveApplicationService()
        apps = service.get_applications(
            db, business_id=eff_biz_id, employee_id=emp_uuid, status_filter=status
        )

        if start_date or end_date:
            s_dt = datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else None
            e_dt = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else None
            filtered = []
            for a in apps:
                if s_dt and a.end_date < s_dt:
                    continue
                if e_dt and a.start_date > e_dt:
                    continue
                filtered.append(a)
            apps = filtered

        total = len(apps)
        skip = (eff_page - 1) * eff_page_size
        paged_apps = apps[skip : skip + eff_page_size]

        columns = [
            "id",
            "employee_name",
            "leave_type",
            "start_date",
            "end_date",
            "total_days",
            "status",
        ]

        rows = []
        for a in paged_apps:
            rows.append({
                "id": str(a.id),
                "employee_name": a.employee.full_name if a.employee else None,
                "leave_type": a.leave_type.name if a.leave_type else None,
                "start_date": str(a.start_date),
                "end_date": str(a.end_date),
                "total_days": a.total_days,
                "status": a.status.value if hasattr(a.status, "value") else str(a.status),
            })

        return ListResponse(
            title="Leave Applications",
            total=total,
            page=eff_page,
            page_size=eff_page_size,
            columns=columns,
            rows=rows,
        )
    except PermissionError as e:
        return ErrorResponse(message=str(e))
    except ValueError as e:
        return ErrorResponse(message=str(e))
    except HTTPException as e:
        return ErrorResponse(message=str(e.detail))
    except Exception as e:
        return ErrorResponse(message=f"Unexpected error: {str(e)}")


def execute_get_employee_leave_balance(
    db: Session,
    user: User,
    employee_id: str,
) -> AIResponseEnvelope:
    """
    Requires permission: hrm:leave_allocations:view
    """
    try:
        check_permissions(user, ["hrm:leave_allocations:view"])

        emp_service = EmployeeService()
        emp_uuid = parse_uuid(employee_id, "employee_id")
        employee = emp_service.get_employee(db, emp_uuid)
        validate_and_get_business_id(user, employee.business_id)

        alloc_service = LeaveAllocationService()
        allocations = alloc_service.get_allocations(db, employee_id=emp_uuid)

        metrics: dict[str, int | float | str] = {
            "employee_name": employee.full_name,
            "employee_id": employee.employee_id,
        }
        for a in allocations:
            allocated = float(a.allocated_days or 0.0)
            used = float(a.used_days or 0.0)
            carried = float(a.carried_forward or 0.0)
            remaining = allocated + carried - used
            lt_name = a.leave_type.name if a.leave_type else "Unknown"
            metrics[f"{lt_name} (Allocated)"] = allocated
            metrics[f"{lt_name} (Used)"] = used
            metrics[f"{lt_name} (Remaining)"] = remaining

        return SummaryResponse(
            title=f"Leave Balance for {employee.full_name}",
            metrics=metrics,
        )
    except PermissionError as e:
        return ErrorResponse(message=str(e))
    except ValueError as e:
        return ErrorResponse(message=str(e))
    except HTTPException as e:
        return ErrorResponse(message=str(e.detail))
    except Exception as e:
        return ErrorResponse(message=f"Unexpected error: {str(e)}")


def execute_get_leave_summary_report(
    db: Session,
    user: User,
    business_id: int | None = None,
    period_start: str = "2025-01-01",
    period_end: str = "2025-12-31",
) -> AIResponseEnvelope:
    """
    Requires permission: hrm:leave_applications:view
    """
    try:
        check_permissions(user, ["hrm:leave_applications:view"])
        eff_biz_id = validate_and_get_business_id(user, business_id)

        service = LeaveApplicationService()
        res = service.get_leave_summary_report(
            db, business_id=eff_biz_id, period_start=period_start, period_end=period_end
        )

        metrics: dict[str, int | float | str] = {
            "total_applications": res.get("total_applications", 0),
            "approved": res.get("approved", 0),
            "pending": res.get("pending", 0),
            "rejected": res.get("rejected", 0),
            "cancelled": res.get("cancelled", 0),
            "total_days_requested": res.get("total_days_requested", 0.0),
        }
        return SummaryResponse(
            title="Leave Summary Report",
            metrics=metrics,
        )
    except PermissionError as e:
        return ErrorResponse(message=str(e))
    except ValueError as e:
        return ErrorResponse(message=str(e))
    except HTTPException as e:
        return ErrorResponse(message=str(e.detail))
    except Exception as e:
        return ErrorResponse(message=f"Unexpected error: {str(e)}")


def execute_get_employee_payslip(
    db: Session,
    user: User,
    employee_id: str,
    payroll_period_id: str,
) -> AIResponseEnvelope:
    """
    Requires permissions: hrm:payroll_records:view AND hrm:compensation:view
    Enforces explicit allowlisted payslip fields.
    """
    try:
        check_permissions(user, ["hrm:payroll_records:view", "hrm:compensation:view"])

        emp_uuid = parse_uuid(employee_id, "employee_id")
        period_uuid = parse_uuid(payroll_period_id, "payroll_period_id")

        emp_service = EmployeeService()
        employee = emp_service.get_employee(db, emp_uuid)
        validate_and_get_business_id(user, employee.business_id)

        payroll_service = PayrollRecordService()
        record = payroll_service.repository.get_by_period_employee(
            db, period_id=period_uuid, employee_id=emp_uuid
        )

        if not record:
            return ErrorResponse(
                message=f"Payslip record not found for employee '{employee_id}' in period '{payroll_period_id}'"
            )

        employee_dict = {
            "payslip_id": str(record.id),
            "employee_id": str(record.employee_id),
            "employee_name": employee.full_name,
            "period_name": record.period.name if record.period else None,
            "working_days": record.working_days,
            "present_days": record.present_days,
            "absent_days": record.absent_days,
            "leave_days": record.leave_days,
            "gross_salary": float(record.gross_salary or 0.0),
            "total_deduction": float(record.total_deduction or 0.0),
            "net_salary": float(record.net_salary or 0.0),
            "is_paid": record.is_paid,
        }

        return EmployeeCardResponse(employee=employee_dict)
    except PermissionError as e:
        return ErrorResponse(message=str(e))
    except ValueError as e:
        return ErrorResponse(message=str(e))
    except HTTPException as e:
        return ErrorResponse(message=str(e.detail))
    except Exception as e:
        return ErrorResponse(message=f"Unexpected error: {str(e)}")


def execute_get_payroll_summary_report(
    db: Session,
    user: User,
    payroll_period_id: str,
    business_id: int | None = None,
) -> AIResponseEnvelope:
    """
    Requires permission: hrm:payroll_records:view
    Returns totals only — never a per-employee breakdown.
    """
    try:
        check_permissions(user, ["hrm:payroll_records:view"])
        eff_biz_id = validate_and_get_business_id(user, business_id)
        period_uuid = parse_uuid(payroll_period_id, "payroll_period_id")

        service = PayrollRecordService()
        res = service.get_payroll_summary_report(
            db, business_id=eff_biz_id, period_id=period_uuid
        )

        metrics: dict[str, int | float | str] = {
            "period_name": res.get("period_name", ""),
            "period_status": res.get("period_status", ""),
            "headcount": res.get("headcount", 0),
            "total_basic_salary": res.get("total_basic_salary", 0.0),
            "total_gross_salary": res.get("total_gross_salary", 0.0),
            "total_net_salary": res.get("total_net_salary", 0.0),
            "total_deductions": res.get("total_deductions", 0.0),
            "total_overtime_pay": res.get("total_overtime_pay", 0.0),
            "total_bonus": res.get("total_bonus", 0.0),
            "paid_count": res.get("paid_count", 0),
            "unpaid_count": res.get("unpaid_count", 0),
        }

        return SummaryResponse(
            title=f"Payroll Summary Report - {res.get('period_name', '')}",
            metrics=metrics,
        )
    except PermissionError as e:
        return ErrorResponse(message=str(e))
    except ValueError as e:
        return ErrorResponse(message=str(e))
    except HTTPException as e:
        return ErrorResponse(message=str(e.detail))
    except Exception as e:
        return ErrorResponse(message=f"Unexpected error: {str(e)}")


def execute_get_attendance_summary(
    db: Session,
    user: User,
    employee_id: str,
    period_start: str,
    period_end: str,
) -> AIResponseEnvelope:
    """
    Requires permission: hrm:attendance:view
    """
    try:
        check_permissions(user, ["hrm:attendance:view"])
        emp_uuid = parse_uuid(employee_id, "employee_id")

        emp_service = EmployeeService()
        employee = emp_service.get_employee(db, emp_uuid)
        validate_and_get_business_id(user, employee.business_id)

        att_service = AttendanceService()
        res = att_service.get_attendance_summary(
            db, employee_id=emp_uuid, period_start=period_start, period_end=period_end
        )

        metrics: dict[str, int | float | str] = {
            "total_days": res.get("total_days", 0),
            "present_days": res.get("present_days", 0),
            "absent_days": res.get("absent_days", 0),
            "late_days": res.get("late_days", 0),
            "half_days": res.get("half_days", 0),
            "total_overtime_hours": float(res.get("total_overtime_hours", 0.0)),
        }

        return SummaryResponse(
            title=f"Attendance Summary for {employee.full_name}",
            metrics=metrics,
        )
    except PermissionError as e:
        return ErrorResponse(message=str(e))
    except ValueError as e:
        return ErrorResponse(message=str(e))
    except HTTPException as e:
        return ErrorResponse(message=str(e.detail))
    except Exception as e:
        return ErrorResponse(message=f"Unexpected error: {str(e)}")


def execute_get_employee_count(
    db: Session,
    user: User,
    business_id: int | None = None,
    department_id: str | None = None,
    status: str | None = None,
) -> AIResponseEnvelope:
    """
    Requires permission: hrm:employees:view
    Uses COUNT(*) at database level.
    """
    try:
        check_permissions(user, ["hrm:employees:view"])
        eff_biz_id = validate_and_get_business_id(user, business_id)
        dept_uuid = parse_uuid(department_id, "department_id") if department_id else None

        service = EmployeeService()
        count = service.count_employees(
            db, business_id=eff_biz_id, department_id=dept_uuid, status=status
        )

        return NumberResponse(
            value=count,
            label="Total Employees",
        )
    except PermissionError as e:
        return ErrorResponse(message=str(e))
    except ValueError as e:
        return ErrorResponse(message=str(e))
    except HTTPException as e:
        return ErrorResponse(message=str(e.detail))
    except Exception as e:
        return ErrorResponse(message=f"Unexpected error: {str(e)}")


def execute_get_department_employee_count(
    db: Session,
    user: User,
    business_id: int | None = None,
) -> AIResponseEnvelope:
    """
    Requires permissions: hrm:employees:view AND hrm:departments:view
    Uses GROUP BY at database level.
    """
    try:
        check_permissions(user, ["hrm:employees:view", "hrm:departments:view"])
        eff_biz_id = validate_and_get_business_id(user, business_id)

        service = EmployeeService()
        dept_counts = service.count_employees_by_department(db, business_id=eff_biz_id)

        chart_data = [
            {"department": dept, "count": count} for dept, count in dept_counts
        ]

        return ChartResponse(
            chart_type="bar",
            title="Department Employee Distribution",
            data=chart_data,
        )
    except PermissionError as e:
        return ErrorResponse(message=str(e))
    except ValueError as e:
        return ErrorResponse(message=str(e))
    except HTTPException as e:
        return ErrorResponse(message=str(e.detail))
    except Exception as e:
        return ErrorResponse(message=f"Unexpected error: {str(e)}")


def execute_get_payroll_status(
    db: Session,
    user: User,
    payroll_period_id: str,
    business_id: int | None = None,
) -> AIResponseEnvelope:
    """
    Requires permission: hrm:payroll_periods:view
    Reports processing/payment status for a period.
    """
    try:
        check_permissions(user, ["hrm:payroll_periods:view"])
        eff_biz_id = validate_and_get_business_id(user, business_id)
        period_uuid = parse_uuid(payroll_period_id, "payroll_period_id")

        service = PayrollPeriodService()
        status_info = service.get_payroll_status(
            db, period_uuid=period_uuid, business_id=eff_biz_id
        )

        metrics: dict[str, int | float | str] = {
            "period_id": status_info["period_id"],
            "period_name": status_info["period_name"],
            "status": status_info["status"],
            "is_locked": "Yes" if status_info["is_locked"] else "No",
            "total_records": status_info["total_records"],
            "paid_records": status_info["paid_records"],
            "unpaid_records": status_info["unpaid_records"],
        }

        return SummaryResponse(
            title=f"Payroll Status - {status_info['period_name']}",
            metrics=metrics,
        )
    except PermissionError as e:
        return ErrorResponse(message=str(e))
    except ValueError as e:
        return ErrorResponse(message=str(e))
    except HTTPException as e:
        return ErrorResponse(message=str(e.detail))
    except Exception as e:
        return ErrorResponse(message=f"Unexpected error: {str(e)}")


AI_TOOLS_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_employees",
            "description": "Search and list employees with search term, pagination, department, and status filters. Requires permission: hrm:employees:view",
            "parameters": {
                "type": "object",
                "properties": {
                    "search": {"type": "string", "description": "Optional search query for name, code, or email"},
                    "business_id": {"type": "integer", "description": "Optional business ID filter"},
                    "department_id": {"type": "string", "description": "Optional department UUID"},
                    "status": {"type": "string", "description": "Optional status filter ('active' or 'inactive')"},
                    "page": {"type": "integer", "default": 1},
                    "page_size": {"type": "integer", "default": 20},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_employee",
            "description": "Get profile card of a specific employee by ID or UUID. Returns safe allowlisted fields only. Requires permission: hrm:employees:view",
            "parameters": {
                "type": "object",
                "properties": {
                    "employee_id": {"type": "string", "description": "Employee ID or UUID"},
                },
                "required": ["employee_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_leave_applications",
            "description": "List leave applications with optional filters and pagination. Requires permission: hrm:leave_applications:view",
            "parameters": {
                "type": "object",
                "properties": {
                    "business_id": {"type": "integer"},
                    "employee_id": {"type": "string"},
                    "status": {"type": "string", "enum": ["pending", "approved", "rejected", "cancelled"]},
                    "start_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "end_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "page": {"type": "integer", "default": 1},
                    "page_size": {"type": "integer", "default": 20},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_employee_leave_balance",
            "description": "Get leave balances and allocations for a specific employee. Requires permission: hrm:leave_allocations:view",
            "parameters": {
                "type": "object",
                "properties": {
                    "employee_id": {"type": "string", "description": "Employee UUID"},
                },
                "required": ["employee_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_leave_summary_report",
            "description": "Get aggregated leave summary counts by type and status for a date range. Requires permission: hrm:leave_applications:view",
            "parameters": {
                "type": "object",
                "properties": {
                    "business_id": {"type": "integer"},
                    "period_start": {"type": "string", "default": "2025-01-01"},
                    "period_end": {"type": "string", "default": "2025-12-31"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_employee_payslip",
            "description": "Get detailed payslip for one employee in one payroll period. Requires permissions: hrm:payroll_records:view AND hrm:compensation:view",
            "parameters": {
                "type": "object",
                "properties": {
                    "employee_id": {"type": "string", "description": "Employee UUID"},
                    "payroll_period_id": {"type": "string", "description": "Payroll Period UUID"},
                },
                "required": ["employee_id", "payroll_period_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_payroll_summary_report",
            "description": "Get aggregated payroll totals (headcount, gross, net, deductions) for a period. Requires permission: hrm:payroll_records:view. Returns totals only.",
            "parameters": {
                "type": "object",
                "properties": {
                    "payroll_period_id": {"type": "string", "description": "Payroll Period UUID"},
                    "business_id": {"type": "integer"},
                },
                "required": ["payroll_period_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_attendance_summary",
            "description": "Get attendance summary metrics for an employee in a date range. Requires permission: hrm:attendance:view",
            "parameters": {
                "type": "object",
                "properties": {
                    "employee_id": {"type": "string", "description": "Employee UUID"},
                    "period_start": {"type": "string", "description": "YYYY-MM-DD"},
                    "period_end": {"type": "string", "description": "YYYY-MM-DD"},
                },
                "required": ["employee_id", "period_start", "period_end"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_employee_count",
            "description": "Get total employee count using SQL COUNT(*). Requires permission: hrm:employees:view",
            "parameters": {
                "type": "object",
                "properties": {
                    "business_id": {"type": "integer"},
                    "department_id": {"type": "string"},
                    "status": {"type": "string", "description": "'active' or 'inactive'"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_department_employee_count",
            "description": "Get employee counts grouped by department using SQL GROUP BY. Requires permissions: hrm:employees:view AND hrm:departments:view",
            "parameters": {
                "type": "object",
                "properties": {
                    "business_id": {"type": "integer"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_payroll_status",
            "description": "Get processing and payment status for a payroll period. Requires permission: hrm:payroll_periods:view",
            "parameters": {
                "type": "object",
                "properties": {
                    "payroll_period_id": {"type": "string", "description": "Payroll Period UUID"},
                    "business_id": {"type": "integer"},
                },
                "required": ["payroll_period_id"],
            },
        },
    },
]


def dispatch_tool_call(
    db: Session, user: User, name: str, args: dict[str, Any]
) -> dict[str, Any]:
    """
    Dispatches tool execution by name using acting user context and db session,
    returning a serialized dictionary matching the response envelope model.
    """
    res: AIResponseEnvelope
    if name == "search_employees":
        res = execute_search_employees(db, user, **args)
    elif name == "list_employees":
        res = execute_list_employees(db, user, **args)
    elif name == "get_employee":
        res = execute_get_employee(db, user, **args)
    elif name == "list_leave_applications":
        res = execute_list_leave_applications(db, user, **args)
    elif name == "get_employee_leave_balance":
        res = execute_get_employee_leave_balance(db, user, **args)
    elif name == "get_leave_summary_report":
        res = execute_get_leave_summary_report(db, user, **args)
    elif name == "get_employee_payslip":
        res = execute_get_employee_payslip(db, user, **args)
    elif name == "get_payroll_summary_report":
        res = execute_get_payroll_summary_report(db, user, **args)
    elif name == "get_attendance_summary":
        res = execute_get_attendance_summary(db, user, **args)
    elif name == "get_employee_count":
        res = execute_get_employee_count(db, user, **args)
    elif name == "get_department_employee_count":
        res = execute_get_department_employee_count(db, user, **args)
    elif name == "get_payroll_status":
        res = execute_get_payroll_status(db, user, **args)
    else:
        res = ErrorResponse(message=f"Unknown tool: '{name}'")

    return res.model_dump()
