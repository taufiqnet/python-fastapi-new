import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id, verify_record_ownership
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    if resolved_business_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business ID is required to download Excel template",
        )
    excel_data = service.generate_excel_template(db, business_id=resolved_business_id)
    filename = f"category_template_business_{resolved_business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/import-excel")
async def import_categories_excel(
    business_id: int = Query(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    if resolved_business_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business ID is required to import categories",
        )
    contents = await file.read()
    return service.import_categories_excel(
        db, business_id=resolved_business_id, file_bytes=contents
    )


@router.get("/", response_model=list[CategoryOut])
def get_categories(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    parent_id: uuid.UUID | None = Query(None),
    is_root: bool | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return service.get_categories(
        db,
        skip=skip,
        limit=limit,
        business_id=resolved_business_id,
        parent_id=parent_id,
        is_root=is_root,
    )


@router.get("/tree", response_model=list[CategoryTreeNode])
def get_category_tree(
    business_id: int | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return service.get_category_tree(db, business_id=resolved_business_id)


@router.get("/{category_id}", response_model=CategoryOut)
def get_category(
    category_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = service.get_category(db, category_id)
    verify_record_ownership(category, current_user)
    return category


@router.post("/", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    category_data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, category_data.business_id)
    category_data.business_id = resolved_business_id
    return service.create_category(db, category_data)


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: uuid.UUID,
    category_data: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = service.get_category(db, category_id)
    verify_record_ownership(category, current_user)
    if not current_user.is_superuser:
        category_data.business_id = current_user.business_id
    return service.update_category(db, category_id, category_data)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = service.get_category(db, category_id)
    verify_record_ownership(category, current_user)
    service.delete_category(db, category_id)
    return None
