import uuid

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id, verify_record_ownership
from app.database import get_db
from app.modules.ecommerce.brands.schemas import (
    BrandCreate,
    BrandDropdownItem,
    BrandOut,
    BrandUpdate,
    ProductModelCreate,
    ProductModelOut,
    ProductModelUpdate,
)
from app.modules.ecommerce.brands.service import BrandService

router = APIRouter(prefix="/brands", tags=["Brands"])
service = BrandService()


# --- Brand Endpoints ---
@router.get("/template-excel")
def download_brands_excel_template(
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "brands", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    excel_data = service.generate_excel_template(db, business_id=resolved_business_id)
    filename = f"brand_template_business_{resolved_business_id or 'all'}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/import-excel")
async def import_brands_excel(
    business_id: int | None = Query(None),
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission("ecommerce", "brands", "create")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    contents = await file.read()
    return service.import_brands_excel(
        db, business_id=resolved_business_id, file_bytes=contents
    )


@router.get("/", response_model=list[BrandOut])
def get_brands(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    is_active: bool | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "brands", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return service.get_brands(
        db,
        skip=skip,
        limit=limit,
        business_id=resolved_business_id,
        is_active=is_active,
    )


@router.get("/dropdown", response_model=list[BrandDropdownItem])
def get_brand_dropdown(
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "brands", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return service.get_brand_dropdown_items(db, business_id=resolved_business_id)


@router.get("/{brand_id}", response_model=BrandOut)
def get_brand(
    brand_id: uuid.UUID,
    current_user: User = Depends(require_permission("ecommerce", "brands", "view")),
    db: Session = Depends(get_db),
):
    brand = service.get_brand(db, brand_id)
    verify_record_ownership(brand, current_user)
    return brand


@router.post("/", response_model=BrandOut, status_code=status.HTTP_201_CREATED)
def create_brand(
    data: BrandCreate,
    current_user: User = Depends(require_permission("ecommerce", "brands", "create")),
    db: Session = Depends(get_db),
):
    data.business_id = resolve_business_id(current_user, data.business_id)
    return service.create_brand(db, data)


@router.put("/{brand_id}", response_model=BrandOut)
def update_brand(
    brand_id: uuid.UUID,
    data: BrandUpdate,
    current_user: User = Depends(require_permission("ecommerce", "brands", "update")),
    db: Session = Depends(get_db),
):
    brand = service.get_brand(db, brand_id)
    verify_record_ownership(brand, current_user)
    if data.business_id is not None or (current_user and not current_user.is_superuser):
        data.business_id = resolve_business_id(current_user, data.business_id)
    return service.update_brand(db, brand_id, data)


@router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brand(
    brand_id: uuid.UUID,
    current_user: User = Depends(require_permission("ecommerce", "brands", "delete")),
    db: Session = Depends(get_db),
):
    brand = service.get_brand(db, brand_id)
    verify_record_ownership(brand, current_user)
    service.delete_brand(db, brand_id)
    return None


# --- ProductModel Endpoints ---
@router.get("/models/template-excel")
def download_models_excel_template(
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "models", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    excel_data = service.generate_model_excel_template(
        db, business_id=resolved_business_id
    )
    filename = f"model_template_business_{resolved_business_id or 'all'}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/models/import-excel")
async def import_models_excel(
    business_id: int | None = Query(None),
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission("ecommerce", "models", "create")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    contents = await file.read()
    return service.import_models_excel(
        db, business_id=resolved_business_id, file_bytes=contents
    )


@router.get("/{brand_id}/models", response_model=list[ProductModelOut])
def get_brand_models(
    brand_id: uuid.UUID,
    is_active: bool | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "models", "view")),
    db: Session = Depends(get_db),
):
    brand = service.get_brand(db, brand_id)
    verify_record_ownership(brand, current_user)
    return service.get_brand_models(db, brand_id, is_active=is_active)


@router.post(
    "/{brand_id}/models",
    response_model=ProductModelOut,
    status_code=status.HTTP_201_CREATED,
)
def create_model(
    brand_id: uuid.UUID,
    data: ProductModelCreate,
    current_user: User = Depends(require_permission("ecommerce", "models", "create")),
    db: Session = Depends(get_db),
):
    brand = service.get_brand(db, brand_id)
    verify_record_ownership(brand, current_user)
    return service.create_model(db, brand_id, data)


@router.put("/models/{model_id}", response_model=ProductModelOut)
def update_model(
    model_id: uuid.UUID,
    data: ProductModelUpdate,
    current_user: User = Depends(require_permission("ecommerce", "models", "update")),
    db: Session = Depends(get_db),
):
    model = service.repository.get_model_by_id(db, model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product model not found",
        )
    verify_record_ownership(model.brand, current_user)
    return service.update_model(db, model_id, data)


@router.delete("/models/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_model(
    model_id: uuid.UUID,
    current_user: User = Depends(require_permission("ecommerce", "models", "delete")),
    db: Session = Depends(get_db),
):
    model = service.repository.get_model_by_id(db, model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product model not found",
        )
    verify_record_ownership(model.brand, current_user)
    service.delete_model(db, model_id)
    return None
