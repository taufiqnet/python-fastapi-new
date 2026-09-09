import json
from abc import ABC, abstractmethod
from typing import Any, Callable

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.identity.models import User


class AIProvider(ABC):
    @abstractmethod
    async def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        tool_executor: Callable[[Session, User, str, dict[str, Any]], dict[str, Any]] | None = None,
        db: Session | None = None,
        user: User | None = None,
    ) -> str:
        pass


class OpenRouterProvider(AIProvider):
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
    ):
        self.api_key = api_key or settings.openrouter_api_key
        self.model = model or settings.openrouter_model
        self.base_url = (base_url or settings.openrouter_base_url).rstrip("/")

    async def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        tool_executor: Callable[[Session, User, str, dict[str, Any]], dict[str, Any]] | None = None,
        db: Session | None = None,
        user: User | None = None,
    ) -> str:
        if not self.api_key:
            return "AI service is currently not configured (API key missing). Please set OPENROUTER_API_KEY."

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://fastapi-saas-platform.local",
            "X-Title": "FastAPI SaaS Platform AI Assistant",
            "Content-Type": "application/json",
        }

        current_messages = list(messages)
        max_turns = 5

        async with httpx.AsyncClient(timeout=45.0) as client:
            for _ in range(max_turns):
                payload: dict[str, Any] = {
                    "model": self.model,
                    "messages": current_messages,
                }
                if tools:
                    payload["tools"] = tools

                try:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 401:
                        return "AI service configuration error (Invalid API Key)."
                    elif resp.status_code == 429:
                        return "AI service rate limit reached. Please try again in a few moments."
                    elif resp.status_code >= 500:
                        return "AI service is temporarily unavailable. Please try again later."
                    elif resp.status_code != 200:
                        return f"AI service error (HTTP {resp.status_code}). Please try again."

                    data = resp.json()
                    choice = data.get("choices", [{}])[0]
                    message = choice.get("message", {})

                    tool_calls = message.get("tool_calls")
                    if not tool_calls:
                        content = message.get("content", "")
                        return content or "I processed your request, but received no response text."

                    # Append assistant message with tool calls to context
                    current_messages.append(message)

                    # Handle tool calls
                    for tool_call in tool_calls:
                        tool_call_id = tool_call.get("id")
                        func_info = tool_call.get("function", {})
                        func_name = func_info.get("name")
                        raw_args = func_info.get("arguments", "{}")

                        try:
                            func_args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
                        except json.JSONDecodeError:
                            func_args = {}

                        if tool_executor and db and user:
                            tool_res = tool_executor(db, user, func_name, func_args)
                        else:
                            tool_res = {"success": False, "error": "Tool executor environment missing"}

                        current_messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call_id,
                            "content": json.dumps(tool_res),
                        })

                except httpx.TimeoutException:
                    return "AI service request timed out. Please try again."
                except Exception as e:
                    return f"AI service is temporarily unavailable. Please try again."

            return "Exceeded maximum internal tool iterations without a final response."
