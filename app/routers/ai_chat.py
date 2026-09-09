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

RULES:
1. Treat database tools as your primary source of truth. Never invent employee names, salaries, or attendance metrics.
2. ALWAYS use an available tool when a request requires real database information.
3. Keep responses clear, professional, and well-structured using Markdown formatting.
4. When reporting employee lists or summary totals, present the key points or clean Markdown summaries without dumping massive raw tables.
5. Salary data is sensitive: only return payslips when explicitly queried and authorized.
6. Ask for clarification if employee or period parameters are ambiguous.
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
