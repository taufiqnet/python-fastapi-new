import datetime
import uuid
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.modules.hr_payroll.notice_board.models import Notice, NoticeReadReceipt, NoticeTargetEnum


class NoticeBoardRepository:
    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        department_id: uuid.UUID | None = None,
        active_only: bool = False,
    ) -> list[Notice]:
        query = select(Notice)
        if business_id is not None:
            query = query.where(Notice.business_id == business_id)
        if department_id is not None:
            query = query.where(
                or_(
                    Notice.target_audience == NoticeTargetEnum.ALL,
                    Notice.department_id == department_id,
                )
            )
        if active_only:
            now = datetime.datetime.now(datetime.timezone.utc)
            query = query.where(
                Notice.is_active == True,
                Notice.publish_date <= now,
                or_(Notice.expiry_date == None, Notice.expiry_date >= now),
            )
        return list(
            db.scalars(
                query.order_by(Notice.is_pinned.desc(), Notice.publish_date.desc())
                .offset(skip)
                .limit(limit)
            ).all()
        )

    def get_by_id(self, db: Session, notice_id: uuid.UUID) -> Notice | None:
        return db.get(Notice, notice_id)

    def create(self, db: Session, obj_in: Notice) -> Notice:
        db.add(obj_in)
        db.commit()
        db.refresh(obj_in)
        return obj_in

    def update(self, db: Session, db_obj: Notice, update_data: dict) -> Notice:
        for field, value in update_data.items():
            if value is not None:
                setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, db_obj: Notice) -> None:
        db.delete(db_obj)
        db.commit()

    def mark_as_read(
        self, db: Session, notice_id: uuid.UUID, employee_id: uuid.UUID
    ) -> NoticeReadReceipt:
        receipt = db.scalar(
            select(NoticeReadReceipt).where(
                NoticeReadReceipt.notice_id == notice_id,
                NoticeReadReceipt.employee_id == employee_id,
            )
        )
        if not receipt:
            receipt = NoticeReadReceipt(
                notice_id=notice_id,
                employee_id=employee_id,
                read_at=datetime.datetime.now(datetime.timezone.utc),
            )
            db.add(receipt)
            db.commit()
            db.refresh(receipt)
        return receipt
