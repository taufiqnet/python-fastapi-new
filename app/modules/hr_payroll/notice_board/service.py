import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.hr_payroll.notice_board.models import Notice, NoticeReadReceipt
from app.modules.hr_payroll.notice_board.repository import NoticeBoardRepository
from app.modules.hr_payroll.notice_board.schemas import NoticeCreate, NoticeUpdate


class NoticeBoardService:
    def __init__(self, repo: NoticeBoardRepository | None = None):
        self.repo = repo or NoticeBoardRepository()

    def get_notices(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        department_id: uuid.UUID | None = None,
        active_only: bool = False,
    ) -> list[Notice]:
        return self.repo.get_all(
            db,
            skip=skip,
            limit=limit,
            business_id=business_id,
            department_id=department_id,
            active_only=active_only,
        )

    def get_notice(self, db: Session, notice_id: uuid.UUID) -> Notice:
        notice = self.repo.get_by_id(db, notice_id)
        if not notice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notice with ID '{notice_id}' not found.",
            )
        return notice

    def create_notice(self, db: Session, notice_in: NoticeCreate) -> Notice:
        notice = Notice(
            business_id=notice_in.business_id,
            title=notice_in.title,
            content=notice_in.content,
            category=notice_in.category,
            target_audience=notice_in.target_audience,
            department_id=notice_in.department_id,
            publish_date=notice_in.publish_date,
            expiry_date=notice_in.expiry_date,
            is_pinned=notice_in.is_pinned,
            is_active=notice_in.is_active,
            created_by_id=notice_in.created_by_id,
        )
        return self.repo.create(db, notice)

    def update_notice(
        self, db: Session, notice_id: uuid.UUID, notice_in: NoticeUpdate
    ) -> Notice:
        notice = self.get_notice(db, notice_id)
        update_data = notice_in.model_dump(exclude_unset=True)
        return self.repo.update(db, notice, update_data)

    def delete_notice(self, db: Session, notice_id: uuid.UUID) -> None:
        notice = self.get_notice(db, notice_id)
        self.repo.delete(db, notice)

    def mark_notice_as_read(
        self, db: Session, notice_id: uuid.UUID, employee_id: uuid.UUID
    ) -> NoticeReadReceipt:
        self.get_notice(db, notice_id)
        return self.repo.mark_as_read(db, notice_id, employee_id)
