"""
SQLAlchemy models for System Database Backups.
"""
from datetime import datetime, timezone
from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from app.database import Base


class SystemBackup(Base):
    __tablename__ = "system_backups"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False, unique=True, index=True)
    filepath = Column(String(512), nullable=False)
    file_size_bytes = Column(BigInteger, default=0, nullable=False)
    checksum_sha256 = Column(String(64), nullable=True)
    backup_type = Column(String(50), default="manual_admin", nullable=False)  # manual_admin, scheduled_cron, pre_deploy
    status = Column(String(50), default="completed", nullable=False)  # pending, in_progress, completed, failed
    error_message = Column(Text, nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
