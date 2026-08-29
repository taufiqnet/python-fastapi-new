import uuid
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.common.enums import Status


class SearchQuery(BaseModel):
    q: str | None = Field(None, description="Free text search term")
    business_id: int | None = Field(1)
    category_id: uuid.UUID | None = None
    brand: str | None = None
    min_price: Decimal | None = Field(None, ge=0)
    max_price: Decimal | None = Field(None, ge=0)
    status: Status | None = Status.ACTIVE
    rating_min: float | None = Field(None, ge=0, le=5)
    is_featured: bool | None = None
    sort_by: Literal["relevance", "price", "rating", "created_at", "sold_count"] = "relevance"
    sort_order: Literal["asc", "desc"] = "desc"
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class SearchResultItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: int | None = None
    title: str
    slug: str
    brand: str | None = None
    description: str | None = None
    status: Status
    category_id: uuid.UUID | None = None
    min_price: float | None = None
    max_price: float | None = None
    average_rating: float
    review_count: int
    sold_count: int
    is_featured: bool
    primary_image_url: str | None = None


class FacetValueOut(BaseModel):
    value: str
    count: int


class FacetOut(BaseModel):
    name: str
    values: list[FacetValueOut]


class SearchResult(BaseModel):
    query: str | None = None
    items: list[SearchResultItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool
    facets: list[FacetOut] = []
