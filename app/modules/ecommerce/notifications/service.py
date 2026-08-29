import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.ecommerce.notifications.repository import NotificationRepository
from app.modules.ecommerce.notifications.schemas import (
    NotificationCreate,
    NotificationOut,
    NotificationPreferenceCreate,
    NotificationPreferenceOut,
)


class NotificationService:
    def __init__(self, repository: NotificationRepository | None = None):
        self.repository = repository or NotificationRepository()

    def create_notification(self, db: Session, data: NotificationCreate) -> NotificationOut:
        notification = self.repository.create_notification(db, data)
        return NotificationOut.model_validate(notification)

    def get_user_notifications(
        self,
        db: Session,
        user_id: uuid.UUID,
        unread_only: bool = False,
        skip: int = 0,
        limit: int = 100,
    ) -> list[NotificationOut]:
        notifications = self.repository.get_notifications_by_user(
            db, user_id=user_id, unread_only=unread_only, skip=skip, limit=limit
        )
        return [NotificationOut.model_validate(n) for n in notifications]

    def mark_as_read(self, db: Session, notification_id: uuid.UUID) -> NotificationOut:
        notification = self.repository.get_notification_by_id(db, notification_id)
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
            )
        updated = self.repository.mark_as_read(db, notification)
        return NotificationOut.model_validate(updated)

    def mark_all_as_read(self, db: Session, user_id: uuid.UUID) -> dict:
        count = self.repository.mark_all_as_read(db, user_id)
        return {"message": f"{count} notifications marked as read", "count": count}

    def set_preference(
        self, db: Session, data: NotificationPreferenceCreate
    ) -> NotificationPreferenceOut:
        pref = self.repository.set_preference(db, data)
        return NotificationPreferenceOut.model_validate(pref)

    def get_user_preferences(
        self, db: Session, user_id: uuid.UUID
    ) -> list[NotificationPreferenceOut]:
        prefs = self.repository.get_user_preferences(db, user_id)
        return [NotificationPreferenceOut.model_validate(p) for p in prefs]
