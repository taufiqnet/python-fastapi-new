import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.database import get_db
from app.modules.ecommerce.notifications.schemas import (
    NotificationCreate,
    NotificationOut,
    NotificationPreferenceCreate,
    NotificationPreferenceOut,
)
from app.modules.ecommerce.notifications.service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])
service = NotificationService()


@router.post("", response_model=NotificationOut, status_code=status.HTTP_201_CREATED)
def create_notification(
    data: NotificationCreate,
    current_user: User = Depends(require_permission("ecommerce", "orders", "create")),
    db: Session = Depends(get_db),
):
    return service.create_notification(db, data)


@router.get("", response_model=list[NotificationOut])
def get_user_notifications(
    user_id: uuid.UUID = Query(...),
    unread_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_permission("ecommerce", "orders", "view")),
    db: Session = Depends(get_db),
):
    return service.get_user_notifications(
        db, user_id=user_id, unread_only=unread_only, skip=skip, limit=limit
    )


@router.put("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_as_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(require_permission("ecommerce", "orders", "update")),
    db: Session = Depends(get_db),
):
    return service.mark_as_read(db, notification_id=notification_id)


@router.put("/read-all")
def mark_all_notifications_as_read(
    user_id: uuid.UUID = Query(...),
    current_user: User = Depends(require_permission("ecommerce", "orders", "update")),
    db: Session = Depends(get_db),
):
    return service.mark_all_as_read(db, user_id=user_id)


@router.post("/preferences", response_model=NotificationPreferenceOut)
def set_notification_preference(
    data: NotificationPreferenceCreate,
    current_user: User = Depends(require_permission("ecommerce", "orders", "update")),
    db: Session = Depends(get_db),
):
    return service.set_preference(db, data)


@router.get("/preferences", response_model=list[NotificationPreferenceOut])
def get_notification_preferences(
    user_id: uuid.UUID = Query(...),
    current_user: User = Depends(require_permission("ecommerce", "orders", "view")),
    db: Session = Depends(get_db),
):
    return service.get_user_preferences(db, user_id=user_id)
