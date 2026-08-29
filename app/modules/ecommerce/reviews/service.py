import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.ecommerce.products.models import Product
from app.modules.ecommerce.reviews.models import Review
from app.modules.ecommerce.reviews.repository import ReviewRepository
from app.modules.ecommerce.reviews.schemas import (
    ReviewCreate,
    ReviewOut,
    ReviewSummary,
    ReviewUpdate,
    ReviewVoteCreate,
    ReviewVoteOut,
)


class ReviewService:
    def __init__(self, repository: ReviewRepository | None = None):
        self.repository = repository or ReviewRepository()

    def create_review(self, db: Session, data: ReviewCreate) -> ReviewOut:
        product = db.query(Product).filter(Product.id == data.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
            )

        existing = (
            db.query(Review)
            .filter(
                Review.product_id == data.product_id, Review.user_id == data.user_id
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User has already reviewed this product",
            )

        review = self.repository.create_review(db, data)
        return ReviewOut.model_validate(review)

    def get_review(self, db: Session, review_id: uuid.UUID) -> ReviewOut:
        review = self.repository.get_review_by_id(db, review_id)
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Review not found"
            )
        return ReviewOut.model_validate(review)

    def get_reviews_by_product(
        self,
        db: Session,
        product_id: uuid.UUID,
        rating: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[ReviewOut]:
        reviews = self.repository.get_reviews_by_product(
            db, product_id=product_id, rating=rating, skip=skip, limit=limit
        )
        return [ReviewOut.model_validate(r) for r in reviews]

    def get_review_summary(
        self, db: Session, product_id: uuid.UUID
    ) -> ReviewSummary:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
            )
        return self.repository.get_review_summary(db, product_id)

    def update_review(
        self, db: Session, review_id: uuid.UUID, data: ReviewUpdate
    ) -> ReviewOut:
        review = self.repository.get_review_by_id(db, review_id)
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Review not found"
            )
        updated = self.repository.update_review(db, review, data)
        return ReviewOut.model_validate(updated)

    def delete_review(self, db: Session, review_id: uuid.UUID) -> dict:
        review = self.repository.get_review_by_id(db, review_id)
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Review not found"
            )
        self.repository.delete_review(db, review)
        return {"message": "Review deleted successfully"}

    def vote_review(
        self, db: Session, review_id: uuid.UUID, data: ReviewVoteCreate
    ) -> ReviewVoteOut:
        review = self.repository.get_review_by_id(db, review_id)
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Review not found"
            )
        vote = self.repository.vote_review(db, review_id, data)
        return ReviewVoteOut.model_validate(vote)
