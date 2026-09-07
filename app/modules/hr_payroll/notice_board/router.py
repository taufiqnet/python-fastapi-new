import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.hr_payroll.notice_board.schemas import (
    NoticeCreate,
    NoticeOut,
    NoticeReadReceiptOut,
    NoticeUpdate,
)
from app.modules.hr_payroll.notice_board.service import NoticeBoardService

router = APIRouter(prefix="/notices", tags=["Notice Board"])
service = NoticeBoardService()


@router.get("", response_model=list[NoticeOut])
def get_notices(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    department_id: uuid.UUID | None = Query(None),
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
):
    return service.get_notices(
        db,
        skip=skip,
        limit=limit,
        business_id=business_id,
        department_id=department_id,
        active_only=active_only,
    )


@router.get("/{notice_id}", response_model=NoticeOut)
def get_notice(notice_id: uuid.UUID, db: Session = Depends(get_db)):
    return service.get_notice(db, notice_id)


@router.post(
    "",
    response_model=NoticeOut,
    status_code=status.HTTP_201_CREATED,
)
def create_notice(notice_data: NoticeCreate, db: Session = Depends(get_db)):
    return service.create_notice(db, notice_data)


@router.put("/{notice_id}", response_model=NoticeOut)
def update_notice(
    notice_id: uuid.UUID,
    notice_data: NoticeUpdate,
    db: Session = Depends(get_db),
):
    return service.update_notice(db, notice_id, notice_data)


@router.delete("/{notice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notice(notice_id: uuid.UUID, db: Session = Depends(get_db)):
    service.delete_notice(db, notice_id)
    return None


@router.post(
    "/{notice_id}/read-receipts",
    response_model=NoticeReadReceiptOut,
    status_code=status.HTTP_201_CREATED,
)
def mark_notice_read(
    notice_id: uuid.UUID,
    employee_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
):
    return service.mark_notice_as_read(db, notice_id, employee_id)
