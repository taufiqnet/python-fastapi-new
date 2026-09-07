import enum
import uuid

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID
from sqlalchemy.types import Enum as SAEnum

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


class NoticeCategoryEnum(str, enum.Enum):
    GENERAL = "general"
    POLICY = "policy"
    HOLIDAY = "holiday"
    EVENT = "event"
    URGENT = "urgent"


class NoticeTargetEnum(str, enum.Enum):
    ALL = "all"
    DEPARTMENT = "department"


class Notice(Base, UUIDMixin, TimestampMixin):
    """Notice Board model for broadcasting announcements and company updates."""

    __tablename__ = "notices"

    business_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[NoticeCategoryEnum] = mapped_column(
        SAEnum(NoticeCategoryEnum, name="notice_category"),
        default=NoticeCategoryEnum.GENERAL,
        nullable=False,
    )
    target_audience: Mapped[NoticeTargetEnum] = mapped_column(
        SAEnum(NoticeTargetEnum, name="notice_target_audience"),
        default=NoticeTargetEnum.ALL,
        nullable=False,
    )
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="CASCADE"),
        nullable=True,
    )

    publish_date: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    expiry_date: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    department: Mapped["Department | None"] = relationship(  # noqa: F821
        "Department", lazy="selectin"
    )
    created_by: Mapped["Employee | None"] = relationship("Employee", lazy="selectin")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Notice {self.title} [{self.category}]>"


class NoticeReadReceipt(Base, UUIDMixin, TimestampMixin):
    """Read receipt tracker for employee notice acknowledgments."""

    __tablename__ = "notice_read_receipts"
    __table_args__ = (
        UniqueConstraint("notice_id", "employee_id", name="uq_notice_read_employee"),
    )

    notice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("notices.id", ondelete="CASCADE"),
        nullable=False,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
    )
    read_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationships
    notice: Mapped["Notice"] = relationship("Notice", lazy="selectin")
    employee: Mapped["Employee"] = relationship("Employee", lazy="selectin")  # noqa: F821
