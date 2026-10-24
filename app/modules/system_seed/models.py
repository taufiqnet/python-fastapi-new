"""
SQLAlchemy models for tracking and purging test seed data.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from app.database import Base


class SystemSeedBatch(Base):
    __tablename__ = "system_seed_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_code = Column(String(64), nullable=False, unique=True, index=True)
    module = Column(String(50), nullable=False, index=True)  # 'hrm', 'vehicles', 'ecommerce', 'finance', 'all'
    business_id = Column(Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="completed", nullable=False)
    record_count = Column(Integer, default=0, nullable=False)
    record_counts = Column(JSON, nullable=True)  # e.g. {"employees": 5, "vehicles": 4}
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class SystemSeedRecord(Base):
    __tablename__ = "system_seed_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("system_seed_batches.id", ondelete="CASCADE"), nullable=False, index=True)
    business_id = Column(Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    module = Column(String(50), nullable=False, index=True)
    table_name = Column(String(100), nullable=False, index=True)
    record_id = Column(String(100), nullable=False, index=True)  # Supports integer or UUID string
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
