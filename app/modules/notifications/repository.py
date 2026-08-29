import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.modules.notifications.models import Notification, NotificationPreference
from app.modules.notifications.schemas import (
    NotificationCreate,
    NotificationPreferenceCreate,
)


class NotificationRepository:
    def create_notification(self, db: Session, data: NotificationCreate) -> Notification:
        notification = Notification(
            business_id=data.business_id,
            user_id=data.user_id,
            type=data.type,
            title=data.title,
            body=data.body,
            data=data.data,
            is_read=False,
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    def get_notification_by_id(
        self, db: Session, notification_id: uuid.UUID
    ) -> Notification | None:
        return db.query(Notification).filter(Notification.id == notification_id).first()

    def get_notifications_by_user(
        self,
        db: Session,
        user_id: uuid.UUID,
        unread_only: bool = False,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Notification]:
        query = db.query(Notification).filter(Notification.user_id == user_id)
        if unread_only:
            query = query.filter(Notification.is_read.is_(False))
        return query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()

    def mark_as_read(self, db: Session, notification: Notification) -> Notification:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notification)
        return notification

    def mark_all_as_read(self, db: Session, user_id: uuid.UUID) -> int:
        count = (
            db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_read.is_(False))
            .update(
                {
                    Notification.is_read: True,
                    Notification.read_at: datetime.now(timezone.utc),
                },
                synchronize_session=False,
            )
        )
        db.commit()
        return count

    def set_preference(
        self, db: Session, data: NotificationPreferenceCreate
    ) -> NotificationPreference:
        pref = (
            db.query(NotificationPreference)
            .filter(
                NotificationPreference.user_id == data.user_id,
                NotificationPreference.channel == data.channel,
                NotificationPreference.event_type == data.event_type,
            )
            .first()
        )
        if pref:
            pref.enabled = data.enabled
            pref.business_id = data.business_id
        else:
            pref = NotificationPreference(
                business_id=data.business_id,
                user_id=data.user_id,
                channel=data.channel,
                event_type=data.event_type,
                enabled=data.enabled,
            )
            db.add(pref)
        db.commit()
        db.refresh(pref)
        return pref

    def get_user_preferences(
        self, db: Session, user_id: uuid.UUID
    ) -> list[NotificationPreference]:
        return (
            db.query(NotificationPreference)
            .filter(NotificationPreference.user_id == user_id)
            .all()
        )
