from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.common.models import TimestampMixin, UUIDMixin
from app.database import Base


class Seller(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "sellers"

    store_name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
