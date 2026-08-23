from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate


class UserService:

    def __init__(self):
        self.repository = UserRepository()

    def create_user(self, db: Session, data: UserCreate):
        if self.repository.get_by_username(db, data.username):
            raise HTTPException(status_code=400, detail="Username already exists")

        if self.repository.get_by_email(db, data.email):
            raise HTTPException(status_code=400, detail="Email already exists")

        user = User(
            username=data.username,
            email=data.email,
            hashed_password=hash_password(data.password),
        )

        return self.repository.create(db, user)

    def get_user_by_username(self, db: Session, username: str):
        return self.repository.get_by_username(db, username)