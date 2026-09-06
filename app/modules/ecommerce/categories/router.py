import uuid

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.ecommerce.categories.schemas import (
    CategoryCreate,
    CategoryOut,
    CategoryTreeNode,
    CategoryUpdate,
)
from app.modules.ecommerce.categories.service import CategoryService

router = APIRouter(prefix="/categories", tags=["Categories"])
service = CategoryService()


@router.get("/template-excel")
def download_categories_excel_template(
    business_id: int = Query(...),
    db: Session = Depends(get_db),
):
    excel_data = service.generate_excel_template(db, business_id=business_id)
    filename = f"category_template_business_{business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/import-excel")
async def import_categories_excel(
    business_id: int = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    contents = await file.read()
    return service.import_categories_excel(
        db, business_id=business_id, file_bytes=contents
    )


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
