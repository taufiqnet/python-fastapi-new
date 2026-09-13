import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.database import get_db
from app.services.ai.models import AIConversation
from app.services.ai.provider import OpenRouterProvider
from app.services.ai.tools import AI_TOOLS_DEFINITIONS, dispatch_tool_call

router = APIRouter(prefix="/api/ai", tags=["AI Chat"])

SYSTEM_PROMPT = """You are the intelligent HR & Payroll Assistant for this SaaS platform.
You assist logged-in HR managers, administrators, and employees with accurate reporting, leave requests, and queries.

LEAVE WORKFLOW GUIDED DIALOGUE RULES:
1. **Apply for Leave Workflow**:
   - Step 1: Call `get_leave_types` to fetch active leave types. If none are configured, inform the user: "No leave types are available. Please contact your administrator." and stop.
   - Step 2: Ask the user to choose a leave type if not already specified.
   - Step 3: Ask for the start and end dates (explaining accepted format e.g. YYYY-MM-DD). Validate date ordering (start <= end).
   - Step 4: Check remaining balance (call `get_employee_leave_balance`) for that leave type.
   - Step 5: Present a full confirmation summary (Leave Type, Date Range, Total Days, Remaining Balance) and explicitly ask for confirmation before submitting (e.g. "Would you like me to submit this request?").
   - Step 6: NEVER call `create_leave_application` until the user explicitly confirms (e.g. "yes", "submit", "confirm").
   - Step 7: On confirmation, invoke `create_leave_application` and report the result (Application ID, updated balance, approver chain).

2. **Check Leave Status Workflow**:
   - Call `get_my_leave_applications` to fetch the logged-in user's leave requests.
   - Summarize each request with Application ID, Leave Type, Date Range, Total Days, Status, and current approver/pending step.
   - If no requests exist, state plainly that no leave applications were found.

TOOL SELECTION RULES:
1. Count/Total questions ("how many employees", "total headcount", "number of staff") -> Call matching count/aggregate tools (e.g. `get_employee_count`, `get_department_employee_count`), NEVER call `search_employees` or `list_employees` to count rows yourself.
2. "Show me" / "list" / "search" questions -> Call `search_employees` or `list_leave_applications`, defaulting to page 1.
3. Payroll status or processing overview -> Call `get_payroll_status` or `get_payroll_summary_report`.
4. Large datasets are ALWAYS paginated and capped. Never ask for or expect full unpaginated datasets.
5. NEVER compute sums, counts, or averages in your response text by processing raw lists — always invoke the matching aggregate tool instead.
6. Salary data is sensitive: only return payslips when explicitly queried and authorized.
7. RESOLVER RULES: You MUST call name-resolver tools (`resolve_business`, `resolve_payroll_period`) to resolve a business name or payroll period name/month/year/label into an ID before calling any reporting tool (`get_payroll_summary_report`, `get_leave_summary_report`, `get_employee_payslip`, `get_payroll_status`, etc.). NEVER ask the user for a raw numeric ID or UUID directly.
8. Every reply must rely on live data for the logged-in employee/business — NEVER guess or fabricate business data.
9. Keep responses clear, professional, and well-structured using Markdown formatting.
"""


class AIChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class AIChatResponse(BaseModel):
    message: str
    conversation_id: str


from app.core.config import settings


@router.post("/chat", response_model=AIChatResponse)
async def chat_with_assistant(
    req: AIChatRequest,
    current_user: User = Depends(require_permission("general", "ai_assistant", "view")),
    db: Session = Depends(get_db),
):
    if not settings.ai_assistant_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI Assistant is currently disabled by administrator.",
        )

    user_msg = req.message.strip()
    if not user_msg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty.",
        )

    # Fetch or create conversation
    conv = None
    if req.conversation_id:
        conv = (
            db.query(AIConversation)
            .filter(
                AIConversation.id == req.conversation_id,
                AIConversation.user_id == current_user.id,
            )
            .first()
        )

    if not conv:
        conv_id = req.conversation_id or str(uuid.uuid4())
        conv = AIConversation(
            id=conv_id,
            user_id=current_user.id,
            title=user_msg[:50],
            messages=[],
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # Build conversation payload for AI
    messages_for_llm: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Reconstruct history
    stored_msgs = conv.messages or []
    for m in stored_msgs:
        if isinstance(m, dict) and "role" in m and "content" in m:
            messages_for_llm.append({"role": m["role"], "content": m["content"]})

    # Append current user message
    messages_for_llm.append({"role": "user", "content": user_msg})

    provider = OpenRouterProvider()
    assistant_reply = await provider.chat(
        messages=messages_for_llm,
        tools=AI_TOOLS_DEFINITIONS,
        tool_executor=dispatch_tool_call,
        db=db,
        user=current_user,
    )

    # Update conversation history
    updated_messages = list(stored_msgs)
    updated_messages.append({"role": "user", "content": user_msg, "timestamp": datetime.utcnow().isoformat()})
    updated_messages.append({"role": "assistant", "content": assistant_reply, "timestamp": datetime.utcnow().isoformat()})

    conv.messages = updated_messages
    conv.updated_at = datetime.utcnow()
    db.commit()

    return AIChatResponse(message=assistant_reply, conversation_id=conv.id)
