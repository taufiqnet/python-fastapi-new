import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

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
@router.get("/", response_model=list[BrandOut])
def get_brands(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    is_active: bool | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.get_brands(
        db,
        skip=skip,
        limit=limit,
        business_id=business_id,
        is_active=is_active,
    )


@router.get("/dropdown", response_model=list[BrandDropdownItem])
def get_brand_dropdown(
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.get_brand_dropdown_items(db, business_id=business_id)


@router.get("/{brand_id}", response_model=BrandOut)
def get_brand(brand_id: uuid.UUID, db: Session = Depends(get_db)):
    return service.get_brand(db, brand_id)


@router.post("/", response_model=BrandOut, status_code=status.HTTP_201_CREATED)
def create_brand(data: BrandCreate, db: Session = Depends(get_db)):
    return service.create_brand(db, data)


@router.put("/{brand_id}", response_model=BrandOut)
def update_brand(
    brand_id: uuid.UUID, data: BrandUpdate, db: Session = Depends(get_db)
):
    return service.update_brand(db, brand_id, data)


@router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brand(brand_id: uuid.UUID, db: Session = Depends(get_db)):
    service.delete_brand(db, brand_id)
    return None


# --- ProductModel Endpoints ---
@router.get("/{brand_id}/models", response_model=list[ProductModelOut])
def get_brand_models(
    brand_id: uuid.UUID,
    is_active: bool | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.get_brand_models(db, brand_id, is_active=is_active)


@router.post(
    "/{brand_id}/models",
    response_model=ProductModelOut,
    status_code=status.HTTP_201_CREATED,
)
def create_model(
    brand_id: uuid.UUID,
    data: ProductModelCreate,
    db: Session = Depends(get_db),
):
    return service.create_model(db, brand_id, data)


@router.put("/models/{model_id}", response_model=ProductModelOut)
def update_model(
    model_id: uuid.UUID,
    data: ProductModelUpdate,
    db: Session = Depends(get_db),
):
    return service.update_model(db, model_id, data)


@router.delete("/models/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_model(model_id: uuid.UUID, db: Session = Depends(get_db)):
    service.delete_model(db, model_id)
    return None
