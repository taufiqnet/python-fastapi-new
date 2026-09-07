import datetime
import uuid
from pydantic import BaseModel, ConfigDict, Field

from app.modules.hr_payroll.notice_board.models import NoticeCategoryEnum, NoticeTargetEnum


class NoticeBase(BaseModel):
    business_id: int
    title: str
    content: str
    category: NoticeCategoryEnum = NoticeCategoryEnum.GENERAL
    target_audience: NoticeTargetEnum = NoticeTargetEnum.ALL
    department_id: uuid.UUID | None = None
    publish_date: datetime.datetime
    expiry_date: datetime.datetime | None = None
    is_pinned: bool = False
    is_active: bool = True
    created_by_id: uuid.UUID | None = None


class NoticeCreate(NoticeBase):
    pass


class NoticeUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    category: NoticeCategoryEnum | None = None
    target_audience: NoticeTargetEnum | None = None
    department_id: uuid.UUID | None = None
    publish_date: datetime.datetime | None = None
    expiry_date: datetime.datetime | None = None
    is_pinned: bool | None = None
    is_active: bool | None = None


class NoticeOut(NoticeBase):
    id: uuid.UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class NoticeReadReceiptOut(BaseModel):
    id: uuid.UUID
    notice_id: uuid.UUID
    employee_id: uuid.UUID
    read_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
