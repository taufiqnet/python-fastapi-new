import uuid
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.modules.orders.models import Order, OrderItem
from app.modules.products.models import Product, ProductVariant
from app.modules.reviews.models import Review, ReviewVote
from app.modules.reviews.schemas import (
    RatingBreakdown,
    ReviewCreate,
    ReviewSummary,
    ReviewUpdate,
    ReviewVoteCreate,
)


class ReviewRepository:
    def create_review(self, db: Session, data: ReviewCreate) -> Review:
        # Check verified purchase status
        is_verified = False
        if data.order_item_id:
            item = db.query(OrderItem).filter(OrderItem.id == data.order_item_id).first()
            if item:
                order = db.query(Order).filter(Order.id == item.order_id, Order.user_id == data.user_id).first()
                if order:
                    is_verified = True
        else:
            # Fallback check: user ordered any variant of this product
            verified_item = (
                db.query(OrderItem)
                .join(Order, Order.id == OrderItem.order_id)
                .join(ProductVariant, ProductVariant.id == OrderItem.variant_id)
                .filter(
                    Order.user_id == data.user_id,
                    ProductVariant.product_id == data.product_id,
                )
                .first()
            )
            if verified_item:
                is_verified = True

        review = Review(
            business_id=data.business_id,
            product_id=data.product_id,
            user_id=data.user_id,
            order_item_id=data.order_item_id,
            rating=data.rating,
            title=data.title,
            comment=data.comment,
            images=data.images,
            is_verified_purchase=is_verified,
            status="approved",
        )
        db.add(review)
        db.commit()
        db.refresh(review)

        self.update_product_rating_stats(db, data.product_id)
        return review

    def get_review_by_id(self, db: Session, review_id: uuid.UUID) -> Review | None:
        return db.query(Review).filter(Review.id == review_id).first()

    def get_reviews_by_product(
        self,
        db: Session,
        product_id: uuid.UUID,
        rating: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Review]:
        query = db.query(Review).filter(Review.product_id == product_id, Review.status == "approved")
        if rating:
            query = query.filter(Review.rating == rating)
        return query.order_by(Review.created_at.desc()).offset(skip).limit(limit).all()

    def get_review_summary(self, db: Session, product_id: uuid.UUID) -> ReviewSummary:
        reviews = db.query(Review).filter(Review.product_id == product_id, Review.status == "approved").all()
        total = len(reviews)
        if total == 0:
            return ReviewSummary(
                product_id=product_id,
                average_rating=0.0,
                total_reviews=0,
                breakdown=RatingBreakdown(),
            )

        avg_rating = sum(r.rating for r in reviews) / total
        breakdown = RatingBreakdown(
            star_1=sum(1 for r in reviews if r.rating == 1),
            star_2=sum(1 for r in reviews if r.rating == 2),
            star_3=sum(1 for r in reviews if r.rating == 3),
            star_4=sum(1 for r in reviews if r.rating == 4),
            star_5=sum(1 for r in reviews if r.rating == 5),
        )
        return ReviewSummary(
            product_id=product_id,
            average_rating=round(avg_rating, 2),
            total_reviews=total,
            breakdown=breakdown,
        )

    def update_review(self, db: Session, review: Review, data: ReviewUpdate) -> Review:
        update_dict = data.model_dump(exclude_unset=True)
        for key, val in update_dict.items():
            setattr(review, key, val)
        db.commit()
        db.refresh(review)

        self.update_product_rating_stats(db, review.product_id)
        return review

    def delete_review(self, db: Session, review: Review) -> None:
        product_id = review.product_id
        db.delete(review)
        db.commit()
        self.update_product_rating_stats(db, product_id)

    def vote_review(self, db: Session, review_id: uuid.UUID, data: ReviewVoteCreate) -> ReviewVote:
        vote = (
            db.query(ReviewVote)
            .filter(ReviewVote.review_id == review_id, ReviewVote.user_id == data.user_id)
            .first()
        )
        if vote:
            vote.is_helpful = data.is_helpful
        else:
            vote = ReviewVote(
                review_id=review_id,
                user_id=data.user_id,
                is_helpful=data.is_helpful,
            )
            db.add(vote)
        db.flush()

        helpful_count = (
            db.query(func.count(ReviewVote.id))
            .filter(ReviewVote.review_id == review_id, ReviewVote.is_helpful.is_(True))
            .scalar()
        ) or 0

        review = self.get_review_by_id(db, review_id)
        if review:
            review.helpful_count = helpful_count

        db.commit()
        db.refresh(vote)
        return vote

    def update_product_rating_stats(self, db: Session, product_id: uuid.UUID) -> None:
        stats = (
            db.query(func.avg(Review.rating), func.count(Review.id))
            .filter(Review.product_id == product_id, Review.status == "approved")
            .first()
        )
        product = db.query(Product).filter(Product.id == product_id).first()
        if product:
            avg_val, count_val = stats if stats else (0.0, 0)
            product.average_rating = Decimal(str(round(avg_val or 0.0, 2)))
            product.review_count = count_val or 0
            db.commit()
