"""
Tool Output Envelope Types Mapping:
----------------------------------------------------------------------------------------------------
Tool Name                     | Output Envelope Type
----------------------------------------------------------------------------------------------------
search_employees / list_employees | TableResponse
get_employee                  | EmployeeCardResponse
list_leave_applications       | ListResponse
get_employee_leave_balance    | SummaryResponse
get_leave_summary_report      | SummaryResponse
get_employee_payslip          | EmployeeCardResponse
get_payroll_summary_report    | SummaryResponse
get_attendance_summary        | SummaryResponse
get_employee_count            | NumberResponse
get_department_employee_count | ChartResponse
get_payroll_status            | SummaryResponse
----------------------------------------------------------------------------------------------------
"""

from typing import Any, Literal, Union
from pydantic import BaseModel, Field


class NumberResponse(BaseModel):
    type: Literal["number"] = "number"
    value: int
    label: str


class SummaryResponse(BaseModel):
    type: Literal["summary"] = "summary"
    title: str
    metrics: dict[str, Union[int, float, str]]


class TableResponse(BaseModel):
    type: Literal["table"] = "table"
    title: str
    total: int
    page: int
    page_size: int
    columns: list[str]
    rows: list[dict[str, Any]]


class ListResponse(BaseModel):
    type: Literal["list"] = "list"
    title: str
    total: int
    page: int
    page_size: int
    columns: list[str]
    rows: list[dict[str, Any]]


class EmployeeCardResponse(BaseModel):
    type: Literal["employee_card"] = "employee_card"
    employee: dict[str, Any]


class ChartResponse(BaseModel):
    type: Literal["chart"] = "chart"
    chart_type: str
    title: str
    data: list[dict[str, Any]]


class ErrorResponse(BaseModel):
    type: Literal["error"] = "error"
    message: str


AIResponseEnvelope = Union[
    NumberResponse,
    SummaryResponse,
    TableResponse,
    ListResponse,
    EmployeeCardResponse,
    ChartResponse,
    ErrorResponse,
]
