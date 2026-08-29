import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.ecommerce.categories.models import Category
from app.modules.ecommerce.categories.repository import CategoryRepository
from app.modules.ecommerce.categories.schemas import CategoryCreate, CategoryUpdate


class CategoryService:

    def __init__(self, repository: CategoryRepository | None = None):
        self.repository = repository or CategoryRepository()

    def get_categories(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        parent_id: uuid.UUID | None = None,
    ) -> list[Category]:
        return self.repository.get_all(
            db, skip=skip, limit=limit, business_id=business_id, parent_id=parent_id
        )

    def get_category_tree(
        self, db: Session, business_id: int | None = None
    ) -> list[Category]:
        return self.repository.get_tree(db, business_id=business_id)

    def get_category(self, db: Session, category_id: uuid.UUID) -> Category:
        category = self.repository.get_by_id(db, category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )
        return category

    def get_category_by_slug(self, db: Session, slug: str) -> Category:
        category = self.repository.get_by_slug(db, slug)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )
        return category

    def create_category(self, db: Session, data: CategoryCreate) -> Category:
        if self.repository.get_by_slug(db, data.slug):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with slug '{data.slug}' already exists",
            )

        if data.parent_id is not None:
            parent = self.repository.get_by_id(db, data.parent_id)
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Parent category with id '{data.parent_id}' not found",
                )

        return self.repository.create(db, data)

    def update_category(
        self, db: Session, category_id: uuid.UUID, data: CategoryUpdate
    ) -> Category:
        category = self.get_category(db, category_id)

        if data.slug is not None and data.slug != category.slug:
            existing = self.repository.get_by_slug(db, data.slug)
            if existing and existing.id != category_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Category with slug '{data.slug}' already exists",
                )

        if data.parent_id is not None:
            if data.parent_id == category_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Category cannot be its own parent",
                )
            parent = self.repository.get_by_id(db, data.parent_id)
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Parent category with id '{data.parent_id}' not found",
                )

        return self.repository.update(db, category, data)

    def delete_category(self, db: Session, category_id: uuid.UUID) -> None:
        category = self.get_category(db, category_id)
        self.repository.delete(db, category)
