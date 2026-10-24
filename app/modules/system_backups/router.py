"""
REST API Router for System Database Backups.
"""
import os
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.core.identity.models import User
from app.database import get_db
from app.modules.system_backups.schemas import (
    BackupTriggerResponse,
    SystemBackupCreate,
    SystemBackupOut,
)
from app.modules.system_backups.service import backup_service, format_human_size

router = APIRouter(prefix="/system/backups", tags=["System Backups"])


@router.get("", response_model=List[SystemBackupOut])
def list_backups(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin),
):
    """List all database backups (Superuser / Admin only)."""
    backups = backup_service.list_backups(db)
    result = []
    for b in backups:
        out = SystemBackupOut.model_validate(b)
        out.human_size = format_human_size(b.file_size_bytes)
        result.append(out)
    return result


@router.post("", response_model=BackupTriggerResponse, status_code=status.HTTP_201_CREATED)
async def create_backup(
    payload: SystemBackupCreate = SystemBackupCreate(),
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin),
):
    """Trigger an instant database backup snapshot (Superuser / Admin only)."""
    record = await backup_service.create_backup(
        db=db,
        user_id=admin_user.id,
        backup_type=payload.backup_type,
    )

    out = SystemBackupOut.model_validate(record)
    out.human_size = format_human_size(record.file_size_bytes)

    if record.status == "failed":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Backup creation failed: {record.error_message}",
        )

    return BackupTriggerResponse(
        message="Database backup created successfully",
        backup=out,
    )


@router.get("/{backup_id}/download")
def download_backup(
    backup_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin),
):
    """Securely download a database backup file (Superuser / Admin only)."""
    record = backup_service.get_backup(db, backup_id)
    if not record or not os.path.exists(record.filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup file not found",
        )

    return FileResponse(
        path=record.filepath,
        filename=record.filename,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{record.filename}"',
            "X-Backup-Checksum-SHA256": record.checksum_sha256 or "",
        },
    )


@router.delete("/{backup_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_backup(
    backup_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin),
):
    """Delete a database backup file (Superuser / Admin only)."""
    success = backup_service.delete_backup(db, backup_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup not found",
        )
    return None
