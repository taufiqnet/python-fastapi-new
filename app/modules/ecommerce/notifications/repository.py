import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.modules.ecommerce.notifications.models import (
    Notification,
    NotificationPreference,
    NotificationTemplate,
)
from app.modules.ecommerce.notifications.schemas import (
    NotificationCreate,
    NotificationPreferenceCreate,
    NotificationTemplateCreate,
    NotificationTemplateUpdate,
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

    def get_notifications_by_business(
        self,
        db: Session,
        business_id: int | None = None,
        event_type: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Notification]:
        query = db.query(Notification)
        if business_id is not None:
            query = query.filter(Notification.business_id == business_id)
        if event_type:
            query = query.filter(Notification.type == event_type)
        return query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()

    def get_templates_by_business(
        self, db: Session, business_id: int | None = None
    ) -> list[NotificationTemplate]:
        query = db.query(NotificationTemplate)
        if business_id is not None:
            query = query.filter(NotificationTemplate.business_id == business_id)
        return query.all()

    def upsert_template(
        self, db: Session, data: NotificationTemplateCreate
    ) -> NotificationTemplate:
        tmpl = (
            db.query(NotificationTemplate)
            .filter(
                NotificationTemplate.business_id == data.business_id,
                NotificationTemplate.event_type == data.event_type,
                NotificationTemplate.channel == data.channel,
            )
            .first()
        )
        if tmpl:
            tmpl.name = data.name
            tmpl.subject = data.subject
            tmpl.body_template = data.body_template
            tmpl.is_active = data.is_active
        else:
            tmpl = NotificationTemplate(
                business_id=data.business_id,
                event_type=data.event_type,
                channel=data.channel,
                name=data.name,
                subject=data.subject,
                body_template=data.body_template,
                is_active=data.is_active,
            )
            db.add(tmpl)
        db.commit()
        db.refresh(tmpl)
        return tmpl

    def get_template_by_id(
        self, db: Session, template_id: uuid.UUID
    ) -> NotificationTemplate | None:
        return db.query(NotificationTemplate).filter(NotificationTemplate.id == template_id).first()

    def update_template(
        self, db: Session, tmpl: NotificationTemplate, data: NotificationTemplateUpdate
    ) -> NotificationTemplate:
        if data.name is not None:
            tmpl.name = data.name
        if data.subject is not None:
            tmpl.subject = data.subject
        if data.body_template is not None:
            tmpl.body_template = data.body_template
        if data.is_active is not None:
            tmpl.is_active = data.is_active
        db.commit()
        db.refresh(tmpl)
        return tmpl
