import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.database import get_db
from app.modules.ecommerce.reviews.schemas import (
    ReviewCreate,
    ReviewOut,
    ReviewSummary,
    ReviewUpdate,
    ReviewVoteCreate,
    ReviewVoteOut,
)
from app.modules.ecommerce.reviews.service import ReviewService

router = APIRouter(prefix="/reviews", tags=["Reviews"])
service = ReviewService()


@router.post("", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(
    data: ReviewCreate,
    current_user: User = Depends(require_permission("ecommerce", "products", "create")),
    db: Session = Depends(get_db),
):
    return service.create_review(db, data)


@router.get("", response_model=list[ReviewOut])
def get_all_reviews(
    business_id: int | None = Query(1),
    status_filter: str | None = Query(None, alias="status"),
    rating: int | None = Query(None, ge=1, le=5),
    product_id: uuid.UUID | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=1000),
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    return service.get_all_reviews(
        db,
        business_id=business_id,
        status=status_filter,
        rating=rating,
        product_id=product_id,
        skip=skip,
        limit=limit,
    )


@router.get("/product/{product_id}", response_model=list[ReviewOut])
def get_reviews_by_product(
    product_id: uuid.UUID,
    rating: int | None = Query(None, ge=1, le=5),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    return service.get_reviews_by_product(
        db, product_id=product_id, rating=rating, skip=skip, limit=limit
    )


@router.get("/product/{product_id}/summary", response_model=ReviewSummary)
def get_review_summary(
    product_id: uuid.UUID,
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    return service.get_review_summary(db, product_id)


@router.get("/{review_id}", response_model=ReviewOut)
def get_review(
    review_id: uuid.UUID,
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    return service.get_review(db, review_id)


@router.put("/{review_id}", response_model=ReviewOut)
def update_review(
    review_id: uuid.UUID,
    data: ReviewUpdate,
    current_user: User = Depends(require_permission("ecommerce", "products", "update")),
    db: Session = Depends(get_db),
):
    return service.update_review(db, review_id, data)


@router.put("/{review_id}/approve", response_model=ReviewOut)
def approve_review(
    review_id: uuid.UUID,
    current_user: User = Depends(require_permission("ecommerce", "products", "update")),
    db: Session = Depends(get_db),
):
    return service.update_review_status(db, review_id, status="approved")


@router.put("/{review_id}/status", response_model=ReviewOut)
def update_review_status(
    review_id: uuid.UUID,
    status_val: str = Query(..., alias="status"),
    current_user: User = Depends(require_permission("ecommerce", "products", "update")),
    db: Session = Depends(get_db),
):
    return service.update_review_status(db, review_id, status=status_val)


@router.delete("/{review_id}")
def delete_review(
    review_id: uuid.UUID,
    current_user: User = Depends(require_permission("ecommerce", "products", "delete")),
    db: Session = Depends(get_db),
):
    return service.delete_review(db, review_id)


@router.post("/{review_id}/vote", response_model=ReviewVoteOut)
def vote_review(
    review_id: uuid.UUID,
    data: ReviewVoteCreate,
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    return service.vote_review(db, review_id, data)
