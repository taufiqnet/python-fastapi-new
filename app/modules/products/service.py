import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.common.enums import Status
from app.modules.products.models import (
    Product,
    ProductImage,
    ProductTag,
    ProductVariant,
)
from app.modules.products.repository import ProductRepository
from app.modules.products.schemas import (
    ProductCreate,
    ProductImageCreate,
    ProductListItem,
    ProductTagCreate,
    ProductUpdate,
    VariantCreate,
    VariantUpdate,
)


class ProductService:

    def __init__(self, repository: ProductRepository | None = None):
        self.repository = repository or ProductRepository()

    def get_products(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        category_id: uuid.UUID | None = None,
        status: Status | None = None,
    ) -> list[Product]:
        return self.repository.get_all(
            db,
            skip=skip,
            limit=limit,
            business_id=business_id,
            category_id=category_id,
            status=status,
        )

    def get_product_list_items(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        category_id: uuid.UUID | None = None,
        status: Status | None = None,
    ) -> list[ProductListItem]:
        products = self.get_products(
            db,
            skip=skip,
            limit=limit,
            business_id=business_id,
            category_id=category_id,
            status=status,
        )
        items = []
        for p in products:
            primary_img = next((img.url for img in p.images if img.is_primary), None)
            if not primary_img and p.images:
                primary_img = p.images[0].url

            min_price = None
            if p.variants:
                min_price = min(v.price for v in p.variants)

            items.append(
                ProductListItem(
                    id=p.id,
                    title=p.title,
                    slug=p.slug,
                    brand=p.brand,
                    status=p.status,
                    thumbnail_url=primary_img,
                    min_price=min_price,
                    business_id=p.business_id,
                    is_featured=p.is_featured,
                    average_rating=p.average_rating,
                )
            )
        return items

    def get_product(self, db: Session, product_id: uuid.UUID) -> Product:
        product = self.repository.get_by_id(db, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found",
            )
        return product

    def get_product_by_slug(self, db: Session, slug: str) -> Product:
        product = self.repository.get_by_slug(db, slug)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found",
            )
        return product

    def create_product(self, db: Session, data: ProductCreate) -> Product:
        if self.repository.get_by_slug(db, data.slug):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with slug '{data.slug}' already exists",
            )
        return self.repository.create(db, data)

    def update_product(
        self, db: Session, product_id: uuid.UUID, data: ProductUpdate
    ) -> Product:
        product = self.get_product(db, product_id)

        if data.slug is not None and data.slug != product.slug:
            existing = self.repository.get_by_slug(db, data.slug)
            if existing and existing.id != product_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product with slug '{data.slug}' already exists",
                )

        return self.repository.update(db, product, data)

    def delete_product(self, db: Session, product_id: uuid.UUID) -> None:
        product = self.get_product(db, product_id)
        self.repository.delete(db, product)

    # --- Tags ---
    def create_tag(self, db: Session, data: ProductTagCreate) -> ProductTag:
        if self.repository.get_tag_by_slug(db, data.slug):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tag with slug '{data.slug}' already exists",
            )
        return self.repository.create_tag(db, data)

    def get_tags(
        self, db: Session, business_id: int | None = None
    ) -> list[ProductTag]:
        return self.repository.get_tags(db, business_id=business_id)

    # --- Variants ---
    def add_variant(
        self, db: Session, product_id: uuid.UUID, data: VariantCreate
    ) -> ProductVariant:
        self.get_product(db, product_id)
        return self.repository.create_variant(db, product_id, data)

    def update_variant(
        self, db: Session, variant_id: uuid.UUID, data: VariantUpdate
    ) -> ProductVariant:
        variant = self.repository.get_variant_by_id(db, variant_id)
        if not variant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Variant not found",
            )
        return self.repository.update_variant(db, variant, data)

    def delete_variant(self, db: Session, variant_id: uuid.UUID) -> None:
        variant = self.repository.get_variant_by_id(db, variant_id)
        if not variant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Variant not found",
            )
        self.repository.delete_variant(db, variant)

    # --- Images ---
    def add_image(
        self, db: Session, product_id: uuid.UUID, data: ProductImageCreate
    ) -> ProductImage:
        self.get_product(db, product_id)
        return self.repository.create_image(db, product_id, data)

    def delete_image(self, db: Session, image_id: uuid.UUID) -> None:
        image = self.repository.get_image_by_id(db, image_id)
        if not image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image not found",
            )
        self.repository.delete_image(db, image)
