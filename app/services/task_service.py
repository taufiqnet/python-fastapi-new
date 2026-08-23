from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.task import Task
from app.repositories.task_repository import TaskRepository
from app.schemas.task import TaskCreate, TaskUpdate


class TaskService:

    def __init__(self): self.repository = TaskRepository()

    def get_tasks(self, db: Session): return self.repository.get_all(db)

    def get_task(self, db: Session, task_id: int):
        task = self.repository.get_by_id(db, task_id)
        if not task: raise HTTPException(status_code=404, detail="Task not found")
        return task

    def create_task(self, db: Session, data: TaskCreate):
        task = Task(title=data.title, description=data.description)
        return self.repository.create(db, task)

    def update_task(self, db: Session, task_id: int, data: TaskUpdate):
        task = self.get_task(db, task_id)

        task.title = data.title
        task.description = data.description

        if data.completed is not None:
            task.completed = data.completed

        return self.repository.update(db, task)

    def delete_task(self, db: Session, task_id: int):
        task = self.get_task(db, task_id)
        self.repository.delete(db, task)