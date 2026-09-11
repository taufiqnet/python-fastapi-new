from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SubscriptionPlanBase(BaseModel):
    name: str
    description: str | None = None
    is_active: bool = True


class SubscriptionPlanCreate(SubscriptionPlanBase):
    permission_ids: list[int] = []


class SubscriptionPlanUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
    permission_ids: list[int] | None = None


class SubscriptionPlanOut(SubscriptionPlanBase):
    id: int
    created_at: datetime
    updated_at: datetime
    permission_ids: list[int] = []
    permission_codes: list[str] = []

    model_config = ConfigDict(from_attributes=True)
