import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.categories.schemas import (
    CategoryCreate,
    CategoryOut,
    CategoryTreeNode,
    CategoryUpdate,
)
from app.modules.categories.service import CategoryService

router = APIRouter(prefix="/categories", tags=["Categories"])
service = CategoryService()


@router.get("/", response_model=list[CategoryOut])
def get_categories(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    parent_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.get_categories(
        db, skip=skip, limit=limit, business_id=business_id, parent_id=parent_id
    )


@router.get("/tree", response_model=list[CategoryTreeNode])
def get_category_tree(
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.get_category_tree(db, business_id=business_id)


@router.get("/{category_id}", response_model=CategoryOut)
def get_category(category_id: uuid.UUID, db: Session = Depends(get_db)):
    return service.get_category(db, category_id)


@router.post("/", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    category_data: CategoryCreate, db: Session = Depends(get_db)
):
    return service.create_category(db, category_data)


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: uuid.UUID,
    category_data: CategoryUpdate,
    db: Session = Depends(get_db),
):
    return service.update_category(db, category_id, category_data)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: uuid.UUID, db: Session = Depends(get_db)):
    service.delete_category(db, category_id)
    return None
