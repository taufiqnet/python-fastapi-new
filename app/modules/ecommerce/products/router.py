import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.common.enums import Status
from app.database import get_db
from app.modules.ecommerce.products.schemas import (
    ProductCreate,
    ProductDetailOut,
    ProductImageCreate,
    ProductImageOut,
    ProductListItem,
    ProductTagCreate,
    ProductTagOut,
    ProductUpdate,
    VariantCreate,
    VariantOut,
    VariantUpdate,
)
from app.modules.ecommerce.products.service import ProductService

router = APIRouter(prefix="/products", tags=["Products"])
service = ProductService()


# --- Product Endpoints ---
@router.get("/", response_model=list[ProductListItem])
def get_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    category_id: uuid.UUID | None = Query(None),
    product_status: Status | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    return service.get_product_list_items(
        db,
        skip=skip,
        limit=limit,
        business_id=business_id,
        category_id=category_id,
        status=product_status,
    )


@router.get("/tags", response_model=list[ProductTagOut])
def get_tags(
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.get_tags(db, business_id=business_id)


@router.post("/tags", response_model=ProductTagOut, status_code=status.HTTP_201_CREATED)
def create_tag(
    tag_data: ProductTagCreate,
    db: Session = Depends(get_db),
):
    return service.create_tag(db, tag_data)


@router.get("/{product_id}", response_model=ProductDetailOut)
def get_product(product_id: uuid.UUID, db: Session = Depends(get_db)):
    return service.get_product(db, product_id)


@router.post("/", response_model=ProductDetailOut, status_code=status.HTTP_201_CREATED)
def create_product(
    product_data: ProductCreate, db: Session = Depends(get_db)
):
    return service.create_product(db, product_data)


@router.put("/{product_id}", response_model=ProductDetailOut)
def update_product(
    product_id: uuid.UUID,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
):
    return service.update_product(db, product_id, product_data)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: uuid.UUID, db: Session = Depends(get_db)):
    service.delete_product(db, product_id)
    return None


# --- Variant Sub-resources ---
@router.post(
    "/{product_id}/variants",
    response_model=VariantOut,
    status_code=status.HTTP_201_CREATED,
)
def add_variant(
    product_id: uuid.UUID,
    variant_data: VariantCreate,
    db: Session = Depends(get_db),
):
    return service.add_variant(db, product_id, variant_data)


@router.put(
    "/variants/{variant_id}",
    response_model=VariantOut,
)
def update_variant(
    variant_id: uuid.UUID,
    variant_data: VariantUpdate,
    db: Session = Depends(get_db),
):
    return service.update_variant(db, variant_id, variant_data)


@router.delete(
    "/variants/{variant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_variant(
    variant_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    service.delete_variant(db, variant_id)
    return None


# --- Image Sub-resources ---
@router.post(
    "/{product_id}/images",
    response_model=ProductImageOut,
    status_code=status.HTTP_201_CREATED,
)
def add_image(
    product_id: uuid.UUID,
    image_data: ProductImageCreate,
    db: Session = Depends(get_db),
):
    return service.add_image(db, product_id, image_data)


@router.delete(
    "/images/{image_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_image(
    image_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    service.delete_image(db, image_id)
    return None
