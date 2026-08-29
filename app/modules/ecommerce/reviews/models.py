import enum
import uuid

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID

from app.common.enums import pg_enum
from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


class ReviewStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FLAGGED = "flagged"


class Review(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "reviews"
    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_reviews_rating_range"),
        UniqueConstraint("product_id", "user_id", name="uq_reviews_product_user"),
    )

    business_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # TODO: same recurring gap as other modules — add
    # ForeignKey("users.id", ondelete="CASCADE") once the identity module's
    # table name is confirmed.
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    order_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("order_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    images: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    is_verified_purchase: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    # Was String(50) defaulting to "approved" — meaning every review went
    # live immediately with no moderation step, by default, silently. If
    # instant-publish is genuinely the intended behavior (no moderation
    # queue at all), that's a legitimate product decision — but it should
    # be an explicit choice made in the service layer when creating a
    # review, not a column default that bypasses moderation before anyone
    # decided to. Defaulting to PENDING here forces that decision to be
    # made deliberately wherever reviews are created.
    status: Mapped[ReviewStatus] = mapped_column(
        pg_enum(ReviewStatus, name="reviewstatus"),
        default=ReviewStatus.PENDING,
        nullable=False,
    )
    helpful_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    product: Mapped["Product"] = relationship("Product", lazy="selectin")  # noqa: F821
    votes: Mapped[list["ReviewVote"]] = relationship(
        "ReviewVote",
        back_populates="review",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class ReviewVote(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "review_votes"
    __table_args__ = (
        UniqueConstraint("review_id", "user_id", name="uq_review_votes_review_user"),
    )

    review_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("reviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    is_helpful: Mapped[bool] = mapped_column(Boolean, nullable=False)

    review: Mapped["Review"] = relationship("Review", back_populates="votes")
