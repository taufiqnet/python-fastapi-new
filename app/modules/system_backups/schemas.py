"""
Pydantic schemas for System Database Backups.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class SystemBackupBase(BaseModel):
    backup_type: str = "manual_admin"


class SystemBackupCreate(SystemBackupBase):
    pass


class SystemBackupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    file_size_bytes: int
    checksum_sha256: Optional[str] = None
    backup_type: str
    status: str
    error_message: Optional[str] = None
    created_by_user_id: Optional[int] = None
    created_at: datetime
    human_size: Optional[str] = None


class BackupTriggerResponse(BaseModel):
    message: str
    backup: SystemBackupOut
