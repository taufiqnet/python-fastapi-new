from sqlalchemy.orm import Session

from app.models.task import Task


class TaskRepository:

    def get_all(self, db: Session): return db.query(Task).all()

    def get_by_id(self, db: Session, task_id: int): return db.query(Task).filter(Task.id == task_id).first()

    def create(self, db: Session, task: Task):
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    def update(self, db: Session, task: Task):
        db.commit()
        db.refresh(task)
        return task

    def delete(self, db: Session, task: Task):
        db.delete(task)
        db.commit()