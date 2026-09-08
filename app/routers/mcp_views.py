import os
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user_optional
from app.core.tenancy.service import BusinessService
from app.database import get_async_db, get_db
try:
    from app.mcp import hr_report_server
except ImportError:
    hr_report_server = None
from app.modules.hr_payroll.employees.service import EmployeeService
from app.modules.hr_payroll.payroll.service import PayrollPeriodService

router = APIRouter(prefix="", tags=["MCP Views"])
templates = Jinja2Templates(directory="app/templates")

business_service = BusinessService()
employee_service = EmployeeService()
period_service = PayrollPeriodService()


class MCPRunToolRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = {}


@router.get("/mcp/manage", response_class=HTMLResponse)
async def mcp_hub_page(
    request: Request,
    db: Session = Depends(get_db),
    async_db=Depends(get_async_db),
):
    current_user = await get_current_user_optional(request, None, async_db)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    employees = employee_service.get_employees(db, skip=0, limit=500)
    periods = period_service.get_periods(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/mcp/mcp_manage.html",
        context={
            "current_user": current_user,
            "businesses": businesses,
            "employees": employees,
            "periods": periods,
            "active_page": "mcp",
        },
    )


@router.post("/mcp/api/run-tool")
async def run_mcp_tool(
    req: MCPRunToolRequest,
    request: Request,
    db: Session = Depends(get_db),
    async_db=Depends(get_async_db),
):
    current_user = await get_current_user_optional(request, None, async_db)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to run MCP tools.",
        )

    # Set acting user env var dynamically for the MCP request context
    os.environ["MCP_ACTING_USER_ID"] = str(current_user.id)

    tool_name = req.tool_name
    args = req.arguments or {}

    if not hr_report_server:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MCP HR Report Server is not installed or available.",
        )

    tool_map = {
        "list_employees": hr_report_server.list_employees,
        "get_employee": hr_report_server.get_employee,
        "list_leave_applications": hr_report_server.list_leave_applications,
        "get_employee_leave_balance": hr_report_server.get_employee_leave_balance,
        "get_leave_summary_report": hr_report_server.get_leave_summary_report,
        "get_employee_payslip": hr_report_server.get_employee_payslip,
        "get_payroll_summary_report": hr_report_server.get_payroll_summary_report,
        "get_attendance_summary": hr_report_server.get_attendance_summary,
    }

    if tool_name not in tool_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown MCP tool: '{tool_name}'",
        )

    tool_func = tool_map[tool_name]

    try:
        result = tool_func(**args)
        if isinstance(result, str) and result.startswith("Error:"):
            return JSONResponse(status_code=400, content={"error": result})
        return {"tool_name": tool_name, "arguments": args, "result": result}
    except Exception as e:
        return JSONResponse(
            status_code=500, content={"error": f"Tool execution failed: {str(e)}"}
        )
