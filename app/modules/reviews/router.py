import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.reviews.schemas import (
    ReviewCreate,
    ReviewOut,
    ReviewSummary,
    ReviewUpdate,
    ReviewVoteCreate,
    ReviewVoteOut,
)
from app.modules.reviews.service import ReviewService

router = APIRouter(prefix="/reviews", tags=["Reviews"])
service = ReviewService()


@router.post("", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(data: ReviewCreate, db: Session = Depends(get_db)):
    return service.create_review(db, data)


@router.get("/product/{product_id}", response_model=list[ReviewOut])
def get_reviews_by_product(
    product_id: uuid.UUID,
    rating: int | None = Query(None, ge=1, le=5),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return service.get_reviews_by_product(
        db, product_id=product_id, rating=rating, skip=skip, limit=limit
    )


@router.get("/product/{product_id}/summary", response_model=ReviewSummary)
def get_review_summary(product_id: uuid.UUID, db: Session = Depends(get_db)):
    return service.get_review_summary(db, product_id)


@router.get("/{review_id}", response_model=ReviewOut)
def get_review(review_id: uuid.UUID, db: Session = Depends(get_db)):
    return service.get_review(db, review_id)


@router.put("/{review_id}", response_model=ReviewOut)
def update_review(
    review_id: uuid.UUID, data: ReviewUpdate, db: Session = Depends(get_db)
):
    return service.update_review(db, review_id=review_id, data=data)


@router.delete("/{review_id}")
def delete_review(review_id: uuid.UUID, db: Session = Depends(get_db)):
    return service.delete_review(db, review_id=review_id)


@router.post("/{review_id}/vote", response_model=ReviewVoteOut)
def vote_review(
    review_id: uuid.UUID, data: ReviewVoteCreate, db: Session = Depends(get_db)
):
    return service.vote_review(db, review_id=review_id, data=data)
