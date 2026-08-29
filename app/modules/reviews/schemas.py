import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    business_id: int | None = Field(1)
    product_id: uuid.UUID
    user_id: uuid.UUID
    order_item_id: uuid.UUID | None = None
    rating: int = Field(..., ge=1, le=5)
    title: str | None = Field(None, max_length=255)
    comment: str | None = None
    images: list[str] | None = None


class ReviewUpdate(BaseModel):
    rating: int | None = Field(None, ge=1, le=5)
    title: str | None = Field(None, max_length=255)
    comment: str | None = None
    images: list[str] | None = None
    status: str | None = Field(None, max_length=50)


class ReviewVoteCreate(BaseModel):
    user_id: uuid.UUID
    is_helpful: bool


class ReviewVoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    review_id: uuid.UUID
    user_id: uuid.UUID
    is_helpful: bool
    created_at: datetime


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int | None = None
    product_id: uuid.UUID
    user_id: uuid.UUID
    order_item_id: uuid.UUID | None = None
    rating: int
    title: str | None = None
    comment: str | None = None
    images: list[str] | None = None
    is_verified_purchase: bool
    status: str
    helpful_count: int
    created_at: datetime
    updated_at: datetime


class RatingBreakdown(BaseModel):
    star_1: int = 0
    star_2: int = 0
    star_3: int = 0
    star_4: int = 0
    star_5: int = 0


class ReviewSummary(BaseModel):
    product_id: uuid.UUID
    average_rating: float
    total_reviews: int
    breakdown: RatingBreakdown
