import uuid

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.common.enums import Status
from app.core.deps import get_current_user_optional
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id, verify_record_ownership
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
@router.get("/template-excel")
def download_products_excel_template(
    business_id: int | None = Query(None),
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    excel_data = service.generate_excel_template(db, business_id=resolved_business_id)
    filename = f"product_template_business_{resolved_business_id or 'all'}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/import-excel")
async def import_products_excel(
    business_id: int | None = Query(None),
    file: UploadFile = File(...),
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    contents = await file.read()
    return service.import_products_excel(
        db, business_id=resolved_business_id, file_bytes=contents
    )


@router.get("/", response_model=list[ProductListItem])
def get_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    category_id: uuid.UUID | None = Query(None),
    brand_id: uuid.UUID | None = Query(None),
    model_id: uuid.UUID | None = Query(None),
    product_status: Status | None = Query(None, alias="status"),
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return service.get_product_list_items(
        db,
        skip=skip,
        limit=limit,
        business_id=resolved_business_id,
        category_id=category_id,
        brand_id=brand_id,
        model_id=model_id,
        status=product_status,
    )


@router.get("/tags", response_model=list[ProductTagOut])
def get_tags(
    business_id: int | None = Query(None),
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return service.get_tags(db, business_id=resolved_business_id)


@router.post("/tags", response_model=ProductTagOut, status_code=status.HTTP_201_CREATED)
def create_tag(
    tag_data: ProductTagCreate,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    tag_data.business_id = resolve_business_id(current_user, tag_data.business_id)
    return service.create_tag(db, tag_data)


@router.post("/upload-images", response_model=list[str])
def upload_images(
    product_slug: str = Form(...),
    files: list[UploadFile] = File(...),
):
    return service.upload_product_images(product_slug=product_slug, files=files)


@router.get("/{product_id}", response_model=ProductDetailOut)
def get_product(
    product_id: uuid.UUID,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    product = service.get_product(db, product_id)
    verify_record_ownership(product, current_user)
    return product


@router.post("/", response_model=ProductDetailOut, status_code=status.HTTP_201_CREATED)
def create_product(
    product_data: ProductCreate,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    product_data.business_id = resolve_business_id(current_user, product_data.business_id)
    return service.create_product(db, product_data)


@router.put("/{product_id}", response_model=ProductDetailOut)
def update_product(
    product_id: uuid.UUID,
    product_data: ProductUpdate,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    product = service.get_product(db, product_id)
    verify_record_ownership(product, current_user)
    if product_data.business_id is not None or (current_user and not current_user.is_superuser):
        product_data.business_id = resolve_business_id(current_user, product_data.business_id)
    return service.update_product(db, product_id, product_data)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: uuid.UUID,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    product = service.get_product(db, product_id)
    verify_record_ownership(product, current_user)
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
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    product = service.get_product(db, product_id)
    verify_record_ownership(product, current_user)
    return service.add_variant(db, product_id, variant_data)


@router.put(
    "/variants/{variant_id}",
    response_model=VariantOut,
)
def update_variant(
    variant_id: uuid.UUID,
    variant_data: VariantUpdate,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    variant = service.repository.get_variant_by_id(db, variant_id)
    if not variant:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Variant not found")
    verify_record_ownership(variant.product, current_user)
    return service.update_variant(db, variant_id, variant_data)


@router.delete(
    "/variants/{variant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_variant(
    variant_id: uuid.UUID,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    variant = service.repository.get_variant_by_id(db, variant_id)
    if not variant:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Variant not found")
    verify_record_ownership(variant.product, current_user)
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
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    product = service.get_product(db, product_id)
    verify_record_ownership(product, current_user)
    return service.add_image(db, product_id, image_data)


@router.delete(
    "/images/{image_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_image(
    image_id: uuid.UUID,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    image = service.repository.get_image_by_id(db, image_id)
    if not image:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Product image not found")
    verify_record_ownership(image.product, current_user)
    service.delete_image(db, image_id)
    return None
