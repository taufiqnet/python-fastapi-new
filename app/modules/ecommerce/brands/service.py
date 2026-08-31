import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.ecommerce.brands.models import Brand, ProductModel
from app.modules.ecommerce.brands.repository import BrandRepository
from app.modules.ecommerce.brands.schemas import (
    BrandCreate,
    BrandDropdownItem,
    BrandUpdate,
    ProductModelCreate,
    ProductModelUpdate,
)


class BrandService:

    def __init__(self, repository: BrandRepository | None = None):
        self.repository = repository or BrandRepository()

    # --- Brand Logic ---
    def get_brands(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        is_active: bool | None = None,
    ) -> list[Brand]:
        return self.repository.get_all(
            db,
            skip=skip,
            limit=limit,
            business_id=business_id,
            is_active=is_active,
        )

    def get_brand_dropdown_items(
        self,
        db: Session,
        business_id: int | None = None,
    ) -> list[BrandDropdownItem]:
        brands = self.get_brands(db, business_id=business_id, is_active=True)
        return [
            BrandDropdownItem(
                id=b.id,
                name=b.name,
                slug=b.slug,
                logo_url=b.logo_url,
            )
            for b in brands
        ]

    def get_brand(self, db: Session, brand_id: uuid.UUID) -> Brand:
        brand = self.repository.get_by_id(db, brand_id)
        if not brand:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Brand not found",
            )
        return brand

    def create_brand(self, db: Session, data: BrandCreate) -> Brand:
        if self.repository.get_by_slug(db, data.slug):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Brand with slug '{data.slug}' already exists",
            )
        return self.repository.create(db, data)

    def update_brand(
        self, db: Session, brand_id: uuid.UUID, data: BrandUpdate
    ) -> Brand:
        brand = self.get_brand(db, brand_id)
        if data.slug is not None and data.slug != brand.slug:
            existing = self.repository.get_by_slug(db, data.slug)
            if existing and existing.id != brand_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Brand with slug '{data.slug}' already exists",
                )
        return self.repository.update(db, brand, data)

    def delete_brand(self, db: Session, brand_id: uuid.UUID) -> None:
        brand = self.get_brand(db, brand_id)
        self.repository.delete(db, brand)

    # --- ProductModel Logic ---
    def get_brand_models(
        self,
        db: Session,
        brand_id: uuid.UUID,
        is_active: bool | None = None,
    ) -> list[ProductModel]:
        self.get_brand(db, brand_id)
        return self.repository.get_models_by_brand(
            db, brand_id, is_active=is_active
        )

    def create_model(
        self, db: Session, brand_id: uuid.UUID, data: ProductModelCreate
    ) -> ProductModel:
        self.get_brand(db, brand_id)
        if self.repository.get_model_by_slug(db, data.slug):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Model with slug '{data.slug}' already exists",
            )
        return self.repository.create_model(db, brand_id, data)

    def update_model(
        self, db: Session, model_id: uuid.UUID, data: ProductModelUpdate
    ) -> ProductModel:
        model = self.repository.get_model_by_id(db, model_id)
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product model not found",
            )
        if data.slug is not None and data.slug != model.slug:
            existing = self.repository.get_model_by_slug(db, data.slug)
            if existing and existing.id != model_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Model with slug '{data.slug}' already exists",
                )
        return self.repository.update_model(db, model, data)

    def delete_model(self, db: Session, model_id: uuid.UUID) -> None:
        model = self.repository.get_model_by_id(db, model_id)
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product model not found",
            )
        self.repository.delete_model(db, model)
