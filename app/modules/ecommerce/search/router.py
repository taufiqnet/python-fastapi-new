import uuid
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.common.enums import Status
from app.database import get_db
from app.modules.ecommerce.search.schemas import SearchQuery, SearchResult
from app.modules.ecommerce.search.service import SearchService

router = APIRouter(prefix="/search", tags=["Search"])
service = SearchService()


@router.get("", response_model=SearchResult)
def search_products(
    q: str | None = Query(None, description="Free text search term"),
    business_id: int | None = Query(1),
    category_id: uuid.UUID | None = Query(None),
    brand: str | None = Query(None),
    min_price: Decimal | None = Query(None, ge=0),
    max_price: Decimal | None = Query(None, ge=0),
    status: Status | None = Query(Status.ACTIVE),
    rating_min: float | None = Query(None, ge=0, le=5),
    is_featured: bool | None = Query(None),
    sort_by: Literal["relevance", "price", "rating", "created_at", "sold_count"] = Query("relevance"),
    sort_order: Literal["asc", "desc"] = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = SearchQuery(
        q=q,
        business_id=business_id,
        category_id=category_id,
        brand=brand,
        min_price=min_price,
        max_price=max_price,
        status=status,
        rating_min=rating_min,
        is_featured=is_featured,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    return service.search_products(db, query)


@router.post("", response_model=SearchResult)
def search_products_post(query: SearchQuery, db: Session = Depends(get_db)):
    return service.search_products(db, query)
