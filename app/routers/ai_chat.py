import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.identity.models import User
from app.database import get_db
from app.services.ai.models import AIConversation
from app.services.ai.provider import OpenRouterProvider
from app.services.ai.tools import AI_TOOLS_DEFINITIONS, dispatch_tool_call

router = APIRouter(prefix="/api/ai", tags=["AI Chat"])

SYSTEM_PROMPT = """You are the intelligent HR & Payroll Assistant for this SaaS platform.
You assist logged-in HR managers, administrators, and employees with accurate reporting and queries.

TOOL SELECTION RULES:
1. Count/Total questions ("how many employees", "total headcount", "number of staff") -> Call matching count/aggregate tools (e.g. `get_employee_count`, `get_department_employee_count`), NEVER call `search_employees` or `list_employees` to count rows yourself.
2. "Show me" / "list" / "search" questions -> Call `search_employees` or `list_leave_applications`, defaulting to page 1.
3. Payroll status or processing overview -> Call `get_payroll_status` or `get_payroll_summary_report`.
4. Large datasets are ALWAYS paginated and capped. Never ask for or expect full unpaginated datasets.
5. NEVER compute sums, counts, or averages in your response text by processing raw lists — always invoke the matching aggregate tool instead.
6. Salary data is sensitive: only return payslips when explicitly queried and authorized.
7. RESOLVER RULES: You MUST call name-resolver tools (`resolve_business`, `resolve_payroll_period`) to resolve a business name or payroll period name/month/year/label into an ID before calling any reporting tool (`get_payroll_summary_report`, `get_leave_summary_report`, `get_employee_payslip`, `get_payroll_status`, etc.). NEVER ask the user for a raw numeric ID or UUID directly. Only ask the user for clarification if a resolver tool returns zero or multiple ambiguous matches.
8. Keep responses clear, professional, and well-structured using Markdown formatting.
"""


class AIChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class AIChatResponse(BaseModel):
    message: str
    conversation_id: str


@router.post("/chat", response_model=AIChatResponse)
async def chat_with_assistant(
    req: AIChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
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
