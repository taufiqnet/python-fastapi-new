"""
MCP Server: HR & Payroll Reports Server (read-only)

Tool to Permission Code & Service Method Mapping:
------------------------------------------------------------------------------------------------------------------------
Tool Name                     | Required Permission Code(s)                          | Service / Repository Method
------------------------------------------------------------------------------------------------------------------------
list_employees                | hrm:employees:view                                   | EmployeeService.get_employees
get_employee                  | hrm:employees:view                                   | EmployeeService.get_employee
list_leave_applications       | hrm:leave_applications:view                          | LeaveApplicationService.get_applications
get_employee_leave_balance    | hrm:leave_allocations:view                           | LeaveAllocationService.get_allocations
get_leave_summary_report      | hrm:leave_applications:view                          | LeaveApplicationService.get_leave_summary_report
get_employee_payslip          | hrm:payroll_records:view AND hrm:compensation:view    | PayrollRecordService.get_record / get_by_period_employee
get_payroll_summary_report    | hrm:payroll_records:view                             | PayrollRecordService.get_payroll_summary_report
get_attendance_summary        | hrm:attendance:view                                  | AttendanceService.get_attendance_summary
------------------------------------------------------------------------------------------------------------------------
"""

import asyncio
import os
import uuid
from datetime import datetime
from typing import Any

from fastapi import HTTPException
from mcp.server.mcpserver import MCPServer

import app.models_registry  # Ensure all SQLAlchemy models are registered
from app.database import AsyncSessionLocal, SessionLocal
from app.core.identity.models import User
from app.core.identity.repository import UserRepository
from app.modules.hr_payroll.employees.service import EmployeeService
from app.modules.hr_payroll.employees.repository import EmployeeRepository
from app.modules.hr_payroll.leave.service import (
    LeaveAllocationService,
    LeaveApplicationService,
)
from app.modules.hr_payroll.payroll.service import PayrollRecordService
from app.modules.hr_payroll.attendance.service import AttendanceService

# Initialize MCP Server
mcp = MCPServer("hr-report-server")


def resolve_acting_user() -> User:
    """
    Resolves acting user identity from MCP_ACTING_USER_ID env var using UserRepository.
    Fails startup with clear error if missing or user not found.
    """
    acting_user_id_str = os.getenv("MCP_ACTING_USER_ID")
    if not acting_user_id_str:
        raise RuntimeError("MCP_ACTING_USER_ID environment variable is not set")
    try:
        user_id = int(acting_user_id_str)
    except ValueError:
        raise RuntimeError(f"Invalid MCP_ACTING_USER_ID: '{acting_user_id_str}'")

    async def _fetch():
        async with AsyncSessionLocal() as async_db:
            repo = UserRepository()
            u = await repo.get_by_id(async_db, user_id)
            if u:
                # Pre-evaluate permission codes while session is active to prevent DetachedInstanceError
                _ = u.get_all_permission_codes()
            return u

    user = asyncio.run(_fetch())
    if not user:
        raise RuntimeError(f"Acting user with ID {user_id} not found in database")
    return user


def check_permissions(acting_user: User, required_permissions: list[str]) -> None:
    """
    Ensures acting user has all required permission code(s).
    """
    for code in required_permissions:
        if not acting_user.has_permission(code):
            raise PermissionError(
                f"Permission denied: acting user lacks required permission '{code}'"
            )


def validate_and_get_business_id(
    acting_user: User, requested_business_id: int | None
) -> int | None:
    """
    Enforces tenant scoping based on acting user's business_id.
    """
    if acting_user.is_superuser:
        return requested_business_id
    
    user_biz_id = acting_user.business_id
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
# MCP Tools
# ---------------------------------------------------------------------------

@mcp.tool()
def list_employees(
    business_id: int | None = None,
    department_id: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> dict[str, Any] | str:
    """
    List employees filtered by business_id and optional department_id.
    Requires permission: hrm:employees:view
    """
    try:
        acting_user = resolve_acting_user()
        check_permissions(acting_user, ["hrm:employees:view"])
        eff_biz_id = validate_and_get_business_id(acting_user, business_id)

        dept_uuid = parse_uuid(department_id, "department_id") if department_id else None

        db = SessionLocal()
        try:
            service = EmployeeService()
            employees = service.get_employees(
                db, skip=skip, limit=limit, business_id=eff_biz_id, department_id=dept_uuid
            )
            result = []
            for e in employees:
                result.append({
                    "id": str(e.id),
                    "employee_id": e.employee_id,
                    "full_name": e.full_name,
                    "first_name": e.first_name,
                    "last_name": e.last_name,
                    "work_email": e.work_email,
                    "phone": e.phone,
                    "department": e.department.name if e.department else None,
                    "job_title": e.job_title.name if e.job_title else None,
                    "employment_type": e.employment_type.value if e.employment_type else None,
                    "work_arrangement": e.work_arrangement.value if e.work_arrangement else None,
                    "is_active": e.is_active,
                    "business_id": e.business_id,
                })
            return {"count": len(result), "employees": result}
        finally:
            db.close()
    except (PermissionError, ValueError) as e:
        return f"Error: {str(e)}"
    except HTTPException as e:
        return f"Error: {e.detail}"
    except Exception as e:
        return f"Error: An unexpected error occurred: {str(e)}"


@mcp.tool()
def get_employee(employee_id: str) -> dict[str, Any] | str:
    """
    Get detailed profile of a specific employee by ID or UUID.
    Requires permission: hrm:employees:view
    """
    try:
        acting_user = resolve_acting_user()
        check_permissions(acting_user, ["hrm:employees:view"])

        db = SessionLocal()
        try:
            service = EmployeeService()
            employee = None
            try:
                emp_uuid = parse_uuid(employee_id, "employee_id")
                employee = service.get_employee(db, emp_uuid)
            except (ValueError, HTTPException):
                # Fallback search by employee_id string code
                repo = EmployeeRepository()
                employee = repo.get_by_employee_id(db, employee_id, business_id=acting_user.business_id)

            if not employee:
                return f"Error: Employee '{employee_id}' not found"

            validate_and_get_business_id(acting_user, employee.business_id)

            return {
                "id": str(employee.id),
                "employee_id": employee.employee_id,
                "full_name": employee.full_name,
                "first_name": employee.first_name,
                "middle_name": employee.middle_name,
                "last_name": employee.last_name,
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
        finally:
            db.close()
    except (PermissionError, ValueError) as e:
        return f"Error: {str(e)}"
    except HTTPException as e:
        return f"Error: {e.detail}"
    except Exception as e:
        return f"Error: An unexpected error occurred: {str(e)}"


@mcp.tool()
def list_leave_applications(
    business_id: int | None = None,
    employee_id: str | None = None,
    status: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict[str, Any] | str:
    """
    List leave applications with optional filters.
    Requires permission: hrm:leave_applications:view
    """
    try:
        acting_user = resolve_acting_user()
        check_permissions(acting_user, ["hrm:leave_applications:view"])
        eff_biz_id = validate_and_get_business_id(acting_user, business_id)

        emp_uuid = parse_uuid(employee_id, "employee_id") if employee_id else None

        db = SessionLocal()
        try:
            service = LeaveApplicationService()
            apps = service.get_applications(
                db, business_id=eff_biz_id, employee_id=emp_uuid, status_filter=status
            )

            # Date range filtering if provided
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

            result = []
            for a in apps:
                result.append({
                    "id": str(a.id),
                    "employee_id": str(a.employee_id),
                    "employee_name": a.employee.full_name if a.employee else None,
                    "leave_type": a.leave_type.name if a.leave_type else None,
                    "start_date": str(a.start_date),
                    "end_date": str(a.end_date),
                    "total_days": a.total_days,
                    "reason": a.reason,
                    "status": a.status.value if hasattr(a.status, "value") else str(a.status),
                    "business_id": a.business_id,
                })
            return {"count": len(result), "leave_applications": result}
        finally:
            db.close()
    except (PermissionError, ValueError) as e:
        return f"Error: {str(e)}"
    except HTTPException as e:
        return f"Error: {e.detail}"
    except Exception as e:
        return f"Error: An unexpected error occurred: {str(e)}"


@mcp.tool()
def get_employee_leave_balance(employee_id: str) -> dict[str, Any] | str:
    """
    Get leave balances and allocations for a specific employee.
    Requires permission: hrm:leave_allocations:view
    """
    try:
        acting_user = resolve_acting_user()
        check_permissions(acting_user, ["hrm:leave_allocations:view"])

        db = SessionLocal()
        try:
            emp_service = EmployeeService()
            emp_uuid = parse_uuid(employee_id, "employee_id")
            employee = emp_service.get_employee(db, emp_uuid)
            validate_and_get_business_id(acting_user, employee.business_id)

            alloc_service = LeaveAllocationService()
            allocations = alloc_service.get_allocations(db, employee_id=emp_uuid)

            result = []
            for a in allocations:
                allocated = float(a.allocated_days or 0.0)
                used = float(a.used_days or 0.0)
                carried = float(a.carried_forward or 0.0)
                remaining = allocated + carried - used
                result.append({
                    "allocation_id": str(a.id),
                    "leave_type": a.leave_type.name if a.leave_type else None,
                    "leave_type_code": a.leave_type.code if a.leave_type else None,
                    "year": a.year,
                    "allocated_days": allocated,
                    "used_days": used,
                    "carried_forward": carried,
                    "remaining_days": remaining,
                })
            return {
                "employee_id": str(employee.id),
                "employee_name": employee.full_name,
                "allocations": result,
            }
        finally:
            db.close()
    except (PermissionError, ValueError) as e:
        return f"Error: {str(e)}"
    except HTTPException as e:
        return f"Error: {e.detail}"
    except Exception as e:
        return f"Error: An unexpected error occurred: {str(e)}"


@mcp.tool()
def get_leave_summary_report(business_id: int, period_start: str, period_end: str) -> dict[str, Any] | str:
    """
    Get aggregated leave summary counts by type and status for a date range.
    Requires permission: hrm:leave_applications:view
    """
    try:
        acting_user = resolve_acting_user()
        check_permissions(acting_user, ["hrm:leave_applications:view"])
        eff_biz_id = validate_and_get_business_id(acting_user, business_id)

        db = SessionLocal()
        try:
            service = LeaveApplicationService()
            return service.get_leave_summary_report(
                db, business_id=eff_biz_id, period_start=period_start, period_end=period_end
            )
        finally:
            db.close()
    except (PermissionError, ValueError) as e:
        return f"Error: {str(e)}"
    except HTTPException as e:
        return f"Error: {e.detail}"
    except Exception as e:
        return f"Error: An unexpected error occurred: {str(e)}"


@mcp.tool()
def get_employee_payslip(employee_id: str, payroll_period_id: str) -> dict[str, Any] | str:
    """
    Get detailed payslip for one employee in one payroll period.
    Requires permissions: hrm:payroll_records:view AND hrm:compensation:view
    """
    try:
        acting_user = resolve_acting_user()
        check_permissions(acting_user, ["hrm:payroll_records:view", "hrm:compensation:view"])

        emp_uuid = parse_uuid(employee_id, "employee_id")
        period_uuid = parse_uuid(payroll_period_id, "payroll_period_id")

        db = SessionLocal()
        try:
            emp_service = EmployeeService()
            employee = emp_service.get_employee(db, emp_uuid)
            validate_and_get_business_id(acting_user, employee.business_id)

            payroll_service = PayrollRecordService()
            record = payroll_service.repository.get_by_period_employee(
                db, period_id=period_uuid, employee_id=emp_uuid
            )

            if not record:
                return f"Error: Payslip record not found for employee '{employee_id}' in period '{payroll_period_id}'"

            return {
                "payslip_id": str(record.id),
                "employee_id": str(record.employee_id),
                "employee_name": employee.full_name,
                "period_id": str(record.period_id),
                "period_name": record.period.name if record.period else None,
                "working_days": record.working_days,
                "present_days": record.present_days,
                "absent_days": record.absent_days,
                "leave_days": record.leave_days,
                "holiday_days": record.holiday_days,
                "overtime_hours": float(record.overtime_hours or 0.0),
                "basic_salary": float(record.basic_salary or 0.0),
                "house_rent": float(record.house_rent or 0.0),
                "transport_allowance": float(record.transport_allowance or 0.0),
                "medical_allowance": float(record.medical_allowance or 0.0),
                "food_allowance": float(record.food_allowance or 0.0),
                "other_allowance": float(record.other_allowance or 0.0),
                "overtime_pay": float(record.overtime_pay or 0.0),
                "bonus": float(record.bonus or 0.0),
                "gross_salary": float(record.gross_salary or 0.0),
                "tax": float(record.tax or 0.0),
                "provident_fund": float(record.provident_fund or 0.0),
                "unpaid_leave_deduction": float(record.unpaid_leave_deduction or 0.0),
                "loan_installment": float(record.loan_installment or 0.0),
                "other_deduction": float(record.other_deduction or 0.0),
                "total_deduction": float(record.total_deduction or 0.0),
                "net_salary": float(record.net_salary or 0.0),
                "payment_method": record.payment_method.value if hasattr(record.payment_method, "value") else str(record.payment_method),
                "is_paid": record.is_paid,
            }
        finally:
            db.close()
    except (PermissionError, ValueError) as e:
        return f"Error: {str(e)}"
    except HTTPException as e:
        return f"Error: {e.detail}"
    except Exception as e:
        return f"Error: An unexpected error occurred: {str(e)}"


@mcp.tool()
def get_payroll_summary_report(business_id: int, payroll_period_id: str) -> dict[str, Any] | str:
    """
    Get aggregated payroll totals (headcount, total gross, net, deductions) for a period.
    Requires permission: hrm:payroll_records:view
    Note: Returns totals only — never a per-employee breakdown.
    """
    try:
        acting_user = resolve_acting_user()
        check_permissions(acting_user, ["hrm:payroll_records:view"])
        eff_biz_id = validate_and_get_business_id(acting_user, business_id)

        period_uuid = parse_uuid(payroll_period_id, "payroll_period_id")

        db = SessionLocal()
        try:
            service = PayrollRecordService()
            return service.get_payroll_summary_report(
                db, business_id=eff_biz_id, period_id=period_uuid
            )
        finally:
            db.close()
    except (PermissionError, ValueError) as e:
        return f"Error: {str(e)}"
    except HTTPException as e:
        return f"Error: {e.detail}"
    except Exception as e:
        return f"Error: An unexpected error occurred: {str(e)}"


@mcp.tool()
def get_attendance_summary(employee_id: str, period_start: str, period_end: str) -> dict[str, Any] | str:
    """
    Get attendance summary metrics for an employee in a date range.
    Requires permission: hrm:attendance:view
    """
    try:
        acting_user = resolve_acting_user()
        check_permissions(acting_user, ["hrm:attendance:view"])

        emp_uuid = parse_uuid(employee_id, "employee_id")

        db = SessionLocal()
        try:
            emp_service = EmployeeService()
            employee = emp_service.get_employee(db, emp_uuid)
            validate_and_get_business_id(acting_user, employee.business_id)

            att_service = AttendanceService()
            return att_service.get_attendance_summary(
                db, employee_id=emp_uuid, period_start=period_start, period_end=period_end
            )
        finally:
            db.close()
    except (PermissionError, ValueError) as e:
        return f"Error: {str(e)}"
    except HTTPException as e:
        return f"Error: {e.detail}"
    except Exception as e:
        return f"Error: An unexpected error occurred: {str(e)}"


if __name__ == "__main__":
    mcp.run("stdio")
