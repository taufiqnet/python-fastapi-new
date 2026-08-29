from typing import Callable
from fastapi import HTTPException


def require_module(module_name: str) -> Callable:
    """
    Dependency helper to check module entitlement for tenant subscriptions.
    """
    async def checker():
        # Entitlement logic stub for module access gating
        return True
    return checker
