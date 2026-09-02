import os
import uuid

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.common.enums import Status
from app.modules.ecommerce.products.models import (
    Product,
    ProductImage,
    ProductTag,
    ProductVariant,
)
from app.modules.ecommerce.products.repository import ProductRepository
from app.modules.ecommerce.products.schemas import (
    ProductCreate,
    ProductImageCreate,
    ProductListItem,
    ProductTagCreate,
    ProductUpdate,
    VariantCreate,
    VariantUpdate,
)

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


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
        brand_id: uuid.UUID | None = None,
        model_id: uuid.UUID | None = None,
        status: Status | None = None,
    ) -> list[Product]:
        return self.repository.get_all(
            db,
            skip=skip,
            limit=limit,
            business_id=business_id,
            category_id=category_id,
            brand_id=brand_id,
            model_id=model_id,
            status=status,
        )

    def get_product_list_items(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        category_id: uuid.UUID | None = None,
        brand_id: uuid.UUID | None = None,
        model_id: uuid.UUID | None = None,
        status: Status | None = None,
    ) -> list[ProductListItem]:
        products = self.get_products(
            db,
            skip=skip,
            limit=limit,
            business_id=business_id,
            category_id=category_id,
            brand_id=brand_id,
            model_id=model_id,
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
                    brand=p.brand or (p.brand_rel.name if p.brand_rel else None),
                    brand_id=p.brand_id,
                    model_id=p.model_id,
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

        # Delete physical images
        for img in product.images:
            self._delete_physical_image_file(img.url)

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
    def upload_product_images(
        self, product_slug: str, files: list[UploadFile]
    ) -> list[str]:
        if not files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No files provided",
            )

        upload_dir = "app/static/ecommerce/images"
        os.makedirs(upload_dir, exist_ok=True)

        saved_urls = []
        for index, file in enumerate(files):
            if not file.content_type or not file.content_type.startswith("image/"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File '{file.filename}' is not a valid image.",
                )

            # Check size
            file.file.seek(0, os.SEEK_END)
            file_size = file.file.tell()
            file.file.seek(0)

            if file_size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File '{file.filename}' exceeds maximum allowed size of 5MB.",
                )

            # Determine extension
            ext = ".jpg"
            if file.filename and "." in file.filename:
                ext = "." + file.filename.rsplit(".", 1)[-1].lower()

            # Format name: product_slug, product_slug_1, product_slug_2, etc.
            if index == 0 and not os.path.exists(os.path.join(upload_dir, f"{product_slug}{ext}")):
                filename = f"{product_slug}{ext}"
            else:
                counter = index if index > 0 else 1
                while os.path.exists(os.path.join(upload_dir, f"{product_slug}_{counter}{ext}")):
                    counter += 1
                filename = f"{product_slug}_{counter}{ext}"

            filepath = os.path.join(upload_dir, filename)
            with open(filepath, "wb") as f:
                f.write(file.file.read())

            relative_url = f"/static/ecommerce/images/{filename}"
            saved_urls.append(relative_url)

        return saved_urls

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

        self._delete_physical_image_file(image.url)
        self.repository.delete_image(db, image)

    def _delete_physical_image_file(self, url: str) -> None:
        if url and url.startswith("/static/ecommerce/images/"):
            filename = url.replace("/static/ecommerce/images/", "")
            file_path = os.path.join("app/static/ecommerce/images", filename)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception:
                    pass
