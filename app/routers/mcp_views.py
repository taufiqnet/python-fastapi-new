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
from app.modules.hr_payroll.employees.service import EmployeeService
from app.modules.hr_payroll.payroll.service import PayrollPeriodService
from app.services.ai.tools import dispatch_tool_call

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

    tool_name = req.tool_name
    args = req.arguments or {}

    try:
        res = dispatch_tool_call(db, current_user, tool_name, args)
        if not res.get("success"):
            return JSONResponse(status_code=400, content={"error": res.get("error")})
        return {"tool_name": tool_name, "arguments": args, "result": res.get("data"), "summary": res.get("summary")}
    except Exception as e:
        return JSONResponse(
            status_code=500, content={"error": f"Tool execution failed: {str(e)}"}
        )
