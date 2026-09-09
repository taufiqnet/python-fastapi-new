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
from app.modules.hr_payroll.payroll.service import PayrollRecordService


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


def tool_response_envelope(
    success: bool,
    data: Any = None,
    error: str | None = None,
    summary: str | None = None,
) -> dict[str, Any]:
    """
    Standard envelope format for AI tools to ensure compact, predictable token consumption.
    """
    res: dict[str, Any] = {"success": success}
    if summary:
        res["summary"] = summary
    if data is not None:
        res["data"] = data
    if error is not None:
        res["error"] = error
    return res


# ---------------------------------------------------------------------------
# Tool Implementations
# ---------------------------------------------------------------------------

def execute_list_employees(
    db: Session,
    user: User,
    business_id: int | None = None,
    department_id: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> dict[str, Any]:
    """
    Requires permission: hrm:employees:view
    """
    try:
        check_permissions(user, ["hrm:employees:view"])
        eff_biz_id = validate_and_get_business_id(user, business_id)
        dept_uuid = parse_uuid(department_id, "department_id") if department_id else None

        service = EmployeeService()
        employees = service.get_employees(
            db, skip=skip, limit=limit, business_id=eff_biz_id, department_id=dept_uuid
        )

        items = []
        for e in employees:
            items.append({
                "id": str(e.id),
                "employee_id": e.employee_id,
                "full_name": e.full_name,
                "work_email": e.work_email,
                "department": e.department.name if e.department else None,
                "job_title": e.job_title.name if e.job_title else None,
                "employment_type": e.employment_type.value if e.employment_type else None,
                "is_active": e.is_active,
            })

        summary = f"Retrieved {len(items)} employee(s)."
        return tool_response_envelope(success=True, data={"count": len(items), "employees": items}, summary=summary)
    except PermissionError as e:
        return tool_response_envelope(success=False, error=str(e))
    except ValueError as e:
        return tool_response_envelope(success=False, error=str(e))
    except HTTPException as e:
        return tool_response_envelope(success=False, error=e.detail)
    except Exception as e:
        return tool_response_envelope(success=False, error=f"Unexpected error: {str(e)}")


def execute_get_employee(
    db: Session,
    user: User,
    employee_id: str,
) -> dict[str, Any]:
    """
    Requires permission: hrm:employees:view
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
            return tool_response_envelope(success=False, error=f"Employee '{employee_id}' not found")

        validate_and_get_business_id(user, employee.business_id)

        data = {
            "id": str(employee.id),
            "employee_id": employee.employee_id,
            "full_name": employee.full_name,
            "work_email": employee.work_email,
            "personal_email": employee.personal_email,
            "phone": employee.phone,
            "department": employee.department.name if employee.department else None,
            "job_title": employee.job_title.name if employee.job_title else None,
            "employment_type": employee.employment_type.value if employee.employment_type else None,
            "work_arrangement": employee.work_arrangement.value if employee.work_arrangement else None,
            "start_date": employee.start_date.strftime("%Y-%m-%d") if employee.start_date else None,
            "is_active": employee.is_active,
            "business_id": employee.business_id,
        }
        return tool_response_envelope(success=True, data=data, summary=f"Profile for employee {employee.full_name} ({employee.employee_id}).")
    except PermissionError as e:
        return tool_response_envelope(success=False, error=str(e))
    except ValueError as e:
        return tool_response_envelope(success=False, error=str(e))
    except HTTPException as e:
        return tool_response_envelope(success=False, error=e.detail)
    except Exception as e:
        return tool_response_envelope(success=False, error=f"Unexpected error: {str(e)}")


def execute_list_leave_applications(
    db: Session,
    user: User,
    business_id: int | None = None,
    employee_id: str | None = None,
    status: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict[str, Any]:
    """
    Requires permission: hrm:leave_applications:view
    """
    try:
        check_permissions(user, ["hrm:leave_applications:view"])
        eff_biz_id = validate_and_get_business_id(user, business_id)
        emp_uuid = parse_uuid(employee_id, "employee_id") if employee_id else None

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

        items = []
        for a in apps[:50]:
            items.append({
                "id": str(a.id),
                "employee_name": a.employee.full_name if a.employee else None,
                "leave_type": a.leave_type.name if a.leave_type else None,
                "start_date": str(a.start_date),
                "end_date": str(a.end_date),
                "total_days": a.total_days,
                "status": a.status.value if hasattr(a.status, "value") else str(a.status),
            })

        summary = f"Found {len(apps)} leave application(s) (showing top {len(items)})."
        return tool_response_envelope(success=True, data={"count": len(apps), "leave_applications": items}, summary=summary)
    except PermissionError as e:
        return tool_response_envelope(success=False, error=str(e))
    except ValueError as e:
        return tool_response_envelope(success=False, error=str(e))
    except HTTPException as e:
        return tool_response_envelope(success=False, error=e.detail)
    except Exception as e:
        return tool_response_envelope(success=False, error=f"Unexpected error: {str(e)}")


def execute_get_employee_leave_balance(
    db: Session,
    user: User,
    employee_id: str,
) -> dict[str, Any]:
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

        items = []
        for a in allocations:
            allocated = float(a.allocated_days or 0.0)
            used = float(a.used_days or 0.0)
            carried = float(a.carried_forward or 0.0)
            remaining = allocated + carried - used
            items.append({
                "leave_type": a.leave_type.name if a.leave_type else None,
                "year": a.year,
                "allocated_days": allocated,
                "used_days": used,
                "remaining_days": remaining,
            })

        data = {
            "employee_id": str(employee.id),
            "employee_name": employee.full_name,
            "allocations": items,
        }
        return tool_response_envelope(success=True, data=data, summary=f"Leave balance for {employee.full_name}.")
    except PermissionError as e:
        return tool_response_envelope(success=False, error=str(e))
    except ValueError as e:
        return tool_response_envelope(success=False, error=str(e))
    except HTTPException as e:
        return tool_response_envelope(success=False, error=e.detail)
    except Exception as e:
        return tool_response_envelope(success=False, error=f"Unexpected error: {str(e)}")


def execute_get_leave_summary_report(
    db: Session,
    user: User,
    business_id: int | None = None,
    period_start: str = "2025-01-01",
    period_end: str = "2025-12-31",
) -> dict[str, Any]:
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
        return tool_response_envelope(success=True, data=res, summary="Aggregated leave summary report.")
    except PermissionError as e:
        return tool_response_envelope(success=False, error=str(e))
    except ValueError as e:
        return tool_response_envelope(success=False, error=str(e))
    except HTTPException as e:
        return tool_response_envelope(success=False, error=e.detail)
    except Exception as e:
        return tool_response_envelope(success=False, error=f"Unexpected error: {str(e)}")


def execute_get_employee_payslip(
    db: Session,
    user: User,
    employee_id: str,
    payroll_period_id: str,
) -> dict[str, Any]:
    """
    Requires permissions: hrm:payroll_records:view AND hrm:compensation:view
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
            return tool_response_envelope(
                success=False,
                error=f"Payslip record not found for employee '{employee_id}' in period '{payroll_period_id}'",
            )

        data = {
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
        return tool_response_envelope(success=True, data=data, summary=f"Payslip details for {employee.full_name}.")
    except PermissionError as e:
        return tool_response_envelope(success=False, error=str(e))
    except ValueError as e:
        return tool_response_envelope(success=False, error=str(e))
    except HTTPException as e:
        return tool_response_envelope(success=False, error=e.detail)
    except Exception as e:
        return tool_response_envelope(success=False, error=f"Unexpected error: {str(e)}")


def execute_get_payroll_summary_report(
    db: Session,
    user: User,
    payroll_period_id: str,
    business_id: int | None = None,
) -> dict[str, Any]:
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
        return tool_response_envelope(success=True, data=res, summary="Aggregated payroll summary report.")
    except PermissionError as e:
        return tool_response_envelope(success=False, error=str(e))
    except ValueError as e:
        return tool_response_envelope(success=False, error=str(e))
    except HTTPException as e:
        return tool_response_envelope(success=False, error=e.detail)
    except Exception as e:
        return tool_response_envelope(success=False, error=f"Unexpected error: {str(e)}")


def execute_get_attendance_summary(
    db: Session,
    user: User,
    employee_id: str,
    period_start: str,
    period_end: str,
) -> dict[str, Any]:
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
        return tool_response_envelope(success=True, data=res, summary=f"Attendance summary for {employee.full_name}.")
    except PermissionError as e:
        return tool_response_envelope(success=False, error=str(e))
    except ValueError as e:
        return tool_response_envelope(success=False, error=str(e))
    except HTTPException as e:
        return tool_response_envelope(success=False, error=e.detail)
    except Exception as e:
        return tool_response_envelope(success=False, error=f"Unexpected error: {str(e)}")


AI_TOOLS_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "list_employees",
            "description": "List employees filtered by business_id and optional department_id. Requires permission: hrm:employees:view",
            "parameters": {
                "type": "object",
                "properties": {
                    "business_id": {"type": "integer", "description": "Optional business ID filter"},
                    "department_id": {"type": "string", "description": "Optional department UUID"},
                    "skip": {"type": "integer", "default": 0},
                    "limit": {"type": "integer", "default": 50},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_employee",
            "description": "Get detailed profile of a specific employee by ID or UUID. Requires permission: hrm:employees:view",
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
            "description": "List leave applications with optional filters. Requires permission: hrm:leave_applications:view",
            "parameters": {
                "type": "object",
                "properties": {
                    "business_id": {"type": "integer"},
                    "employee_id": {"type": "string"},
                    "status": {"type": "string", "enum": ["pending", "approved", "rejected", "cancelled"]},
                    "start_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "end_date": {"type": "string", "description": "YYYY-MM-DD"},
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
]


def dispatch_tool_call(db: Session, user: User, name: str, args: dict[str, Any]) -> dict[str, Any]:
    """
    Dispatches tool execution by name using acting user context and db session.
    """
    if name == "list_employees":
        return execute_list_employees(db, user, **args)
    elif name == "get_employee":
        return execute_get_employee(db, user, **args)
    elif name == "list_leave_applications":
        return execute_list_leave_applications(db, user, **args)
    elif name == "get_employee_leave_balance":
        return execute_get_employee_leave_balance(db, user, **args)
    elif name == "get_leave_summary_report":
        return execute_get_leave_summary_report(db, user, **args)
    elif name == "get_employee_payslip":
        return execute_get_employee_payslip(db, user, **args)
    elif name == "get_payroll_summary_report":
        return execute_get_payroll_summary_report(db, user, **args)
    elif name == "get_attendance_summary":
        return execute_get_attendance_summary(db, user, **args)
    else:
        return tool_response_envelope(success=False, error=f"Unknown tool: '{name}'")
