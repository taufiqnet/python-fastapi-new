from typing import Any
from fastapi import HTTPException, status


def resolve_business_id(user: Any, requested_business_id: int | None = None) -> int | None:
    """
    Resolves the business_id for a query or mutation.
    For superusers, honours the requested_business_id.
    For regular users, ignores requested_business_id and forces user.business_id.
    """
    if user and getattr(user, "is_superuser", False):
        return requested_business_id
    if user and getattr(user, "business_id", None) is not None:
        return user.business_id
    return None


def verify_record_ownership(
    record: Any, user: Any, detail: str = "Department not found"
) -> Any:
    """
    Verifies that the record exists and belongs to the acting user's business.
    Raises 404 Not Found (rather than 403) if missing or owned by another tenant
    to avoid revealing record existence. Superusers bypass this check.
    """
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
        )
    if user and getattr(user, "is_superuser", False):
        return record

    user_biz_id = getattr(user, "business_id", None)
    record_biz_id = getattr(record, "business_id", None)

    if user_biz_id is None or record_biz_id != user_biz_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
        )

    return record
