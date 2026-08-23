from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True,)
    title: Mapped[str] = mapped_column(String(255), nullable=False,)
    description: Mapped[str | None] = mapped_column(Text, nullable=True,)
    completed: Mapped[bool] = mapped_column(Boolean, default=False,)