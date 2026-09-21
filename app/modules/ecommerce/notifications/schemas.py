import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class NotificationCreate(BaseModel):
    business_id: int | None = Field(1)
    user_id: uuid.UUID
    type: str = Field(..., max_length=50)
    title: str = Field(..., max_length=255)
    body: str
    data: dict[str, Any] | None = None


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int | None = None
    user_id: uuid.UUID
    type: str
    title: str
    body: str
    is_read: bool
    read_at: datetime | None = None
    sent_at: datetime | None = None
    data: dict[str, Any] | None = None
    created_at: datetime


class NotificationPreferenceCreate(BaseModel):
    business_id: int | None = Field(1)
    user_id: uuid.UUID
    channel: str = Field(..., max_length=50)
    event_type: str = Field(..., max_length=100)
    enabled: bool = True


class NotificationPreferenceUpdate(BaseModel):
    enabled: bool


class NotificationPreferenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int | None = None
    user_id: uuid.UUID
    channel: str
    event_type: str
    enabled: bool


class NotificationTemplateCreate(BaseModel):
    business_id: int | None = Field(1)
    event_type: str = Field(..., max_length=100)
    channel: str = Field("email", max_length=50)
    name: str = Field(..., max_length=255)
    subject: str = Field(..., max_length=255)
    body_template: str
    is_active: bool = True


class NotificationTemplateUpdate(BaseModel):
    name: str | None = None
    subject: str | None = None
    body_template: str | None = None
    is_active: bool | None = None


class NotificationTemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int | None = None
    event_type: str
    channel: str
    name: str
    subject: str
    body_template: str
    is_active: bool
