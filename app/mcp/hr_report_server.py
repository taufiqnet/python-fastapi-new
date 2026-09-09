"""
MCP Server: HR & Payroll Reports Server (read-only)

Tool to Permission Code & Service Method Mapping:
------------------------------------------------------------------------------------------------------------------------
Tool Name                     | Required Permission Code(s)                          | Service / Repository Method
------------------------------------------------------------------------------------------------------------------------
search_employees / list_employees | hrm:employees:view                               | EmployeeService.search_employees
get_employee                  | hrm:employees:view                                   | EmployeeService.get_employee
list_leave_applications       | hrm:leave_applications:view                          | LeaveApplicationService.get_applications
get_employee_leave_balance    | hrm:leave_allocations:view                           | LeaveAllocationService.get_allocations
get_leave_summary_report      | hrm:leave_applications:view                          | LeaveApplicationService.get_leave_summary_report
get_employee_payslip          | hrm:payroll_records:view AND hrm:compensation:view    | PayrollRecordService.get_record / get_by_period_employee
get_payroll_summary_report    | hrm:payroll_records:view                             | PayrollRecordService.get_payroll_summary_report
get_attendance_summary        | hrm:attendance:view                                  | AttendanceService.get_attendance_summary
get_employee_count            | hrm:employees:view                                   | EmployeeService.count_employees
get_department_employee_count | hrm:employees:view AND hrm:departments:view          | EmployeeService.count_employees_by_department
get_payroll_status            | hrm:payroll_periods:view                             | PayrollPeriodService.get_payroll_status
------------------------------------------------------------------------------------------------------------------------
"""

import os
from typing import Any

from mcp.server.mcpserver import MCPServer

import app.models_registry  # Ensure all SQLAlchemy models are registered
from app.database import SessionLocal
from app.core.identity.models import User
from app.services.ai.tools import (
    execute_get_attendance_summary,
    execute_get_department_employee_count,
    execute_get_employee,
    execute_get_employee_count,
    execute_get_employee_leave_balance,
    execute_get_employee_payslip,
    execute_get_leave_summary_report,
    execute_get_payroll_status,
    execute_get_payroll_summary_report,
    execute_list_employees,
    execute_list_leave_applications,
    execute_resolve_business,
    execute_resolve_payroll_period,
    execute_search_employees,
)

mcp = MCPServer("hr-report-server")


def resolve_acting_user() -> User:
    acting_user_id_str = os.getenv("MCP_ACTING_USER_ID")
    if not acting_user_id_str:
        raise RuntimeError("MCP_ACTING_USER_ID environment variable is not set")
    try:
        user_id = int(acting_user_id_str)
    except ValueError:
        raise RuntimeError(f"Invalid MCP_ACTING_USER_ID: '{acting_user_id_str}'")

    db = SessionLocal()
    try:
        from sqlalchemy.orm import selectinload
        from app.core.identity.models import Role
        user = db.query(User).options(
            selectinload(User.roles).selectinload(Role.permissions),
            selectinload(User.direct_permissions),
        ).filter(User.id == user_id).first()
        if not user:
            raise RuntimeError(f"Acting user with ID {user_id} not found in database")
        _ = user.get_all_permission_codes()
        return user
    finally:
        db.close()


def _format_res(res: Any) -> dict[str, Any] | str:
    res_dict = res.model_dump() if hasattr(res, "model_dump") else res
    if isinstance(res_dict, dict) and res_dict.get("type") == "error":
        return f"Error: {res_dict.get('message', 'Unknown error')}"
    return res_dict


@mcp.tool()
def search_employees(
    search: str | None = None,
    business_id: int | None = None,
    department_id: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any] | str:
    user = resolve_acting_user()
    db = SessionLocal()
    try:
        res = execute_search_employees(
            db,
            user,
            search=search,
            business_id=business_id,
            department_id=department_id,
            status=status,
            page=page,
            page_size=page_size,
        )
        return _format_res(res)
    finally:
        db.close()


@mcp.tool()
def list_employees(
    business_id: int | None = None,
    department_id: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> dict[str, Any] | str:
    user = resolve_acting_user()
    db = SessionLocal()
    try:
        res = execute_list_employees(
            db, user, business_id=business_id, department_id=department_id, skip=skip, limit=limit
        )
        return _format_res(res)
    finally:
        db.close()


@mcp.tool()
def get_employee(employee_id: str) -> dict[str, Any] | str:
    user = resolve_acting_user()
    db = SessionLocal()
    try:
        res = execute_get_employee(db, user, employee_id=employee_id)
        return _format_res(res)
    finally:
        db.close()


@mcp.tool()
def list_leave_applications(
    business_id: int | None = None,
    employee_id: str | None = None,
    status: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any] | str:
    user = resolve_acting_user()
    db = SessionLocal()
    try:
        res = execute_list_leave_applications(
            db,
            user,
            business_id=business_id,
            employee_id=employee_id,
            status=status,
            start_date=start_date,
            end_date=end_date,
            page=page,
            page_size=page_size,
        )
        return _format_res(res)
    finally:
        db.close()


@mcp.tool()
def get_employee_leave_balance(employee_id: str) -> dict[str, Any] | str:
    user = resolve_acting_user()
    db = SessionLocal()
    try:
        res = execute_get_employee_leave_balance(db, user, employee_id=employee_id)
        return _format_res(res)
    finally:
        db.close()


@mcp.tool()
def get_leave_summary_report(business_id: int | None = None, period_start: str = "2025-01-01", period_end: str = "2025-12-31") -> dict[str, Any] | str:
    user = resolve_acting_user()
    db = SessionLocal()
    try:
        res = execute_get_leave_summary_report(db, user, business_id=business_id, period_start=period_start, period_end=period_end)
        return _format_res(res)
    finally:
        db.close()


@mcp.tool()
def get_employee_payslip(employee_id: str, payroll_period_id: str) -> dict[str, Any] | str:
    user = resolve_acting_user()
    db = SessionLocal()
    try:
        res = execute_get_employee_payslip(db, user, employee_id=employee_id, payroll_period_id=payroll_period_id)
        return _format_res(res)
    finally:
        db.close()


@mcp.tool()
def get_payroll_summary_report(payroll_period_id: str, business_id: int | None = None) -> dict[str, Any] | str:
    user = resolve_acting_user()
    db = SessionLocal()
    try:
        res = execute_get_payroll_summary_report(db, user, payroll_period_id=payroll_period_id, business_id=business_id)
        return _format_res(res)
    finally:
        db.close()


@mcp.tool()
def get_attendance_summary(employee_id: str, period_start: str, period_end: str) -> dict[str, Any] | str:
    user = resolve_acting_user()
    db = SessionLocal()
    try:
        res = execute_get_attendance_summary(db, user, employee_id=employee_id, period_start=period_start, period_end=period_end)
        return _format_res(res)
    finally:
        db.close()


@mcp.tool()
def get_employee_count(
    business_id: int | None = None,
    department_id: str | None = None,
    status: str | None = None,
) -> dict[str, Any] | str:
    user = resolve_acting_user()
    db = SessionLocal()
    try:
        res = execute_get_employee_count(
            db, user, business_id=business_id, department_id=department_id, status=status
        )
        return _format_res(res)
    finally:
        db.close()


@mcp.tool()
def get_department_employee_count(business_id: int | None = None) -> dict[str, Any] | str:
    user = resolve_acting_user()
    db = SessionLocal()
    try:
        res = execute_get_department_employee_count(db, user, business_id=business_id)
        return _format_res(res)
    finally:
        db.close()


@mcp.tool()
def get_payroll_status(payroll_period_id: str, business_id: int | None = None) -> dict[str, Any] | str:
    user = resolve_acting_user()
    db = SessionLocal()
    try:
        res = execute_get_payroll_status(
            db, user, payroll_period_id=payroll_period_id, business_id=business_id
        )
        return _format_res(res)
    finally:
        db.close()


@mcp.tool()
def resolve_business(name: str) -> dict[str, Any] | str:
    user = resolve_acting_user()
    db = SessionLocal()
    try:
        res = execute_resolve_business(db, user, name=name)
        return _format_res(res)
    finally:
        db.close()


@mcp.tool()
def resolve_payroll_period(
    business_id: int,
    month: str | None = None,
    year: int | None = None,
    label: str | None = None,
) -> dict[str, Any] | str:
    user = resolve_acting_user()
    db = SessionLocal()
    try:
        res = execute_resolve_payroll_period(
            db, user, business_id=business_id, month=month, year=year, label=label
        )
        return _format_res(res)
    finally:
        db.close()


if __name__ == "__main__":
    mcp.run("stdio")
