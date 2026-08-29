import uuid

from sqlalchemy.orm import Session

from app.common.enums import Status
from app.modules.ecommerce.products.models import (
    AttributeValue,
    Product,
    ProductAttribute,
    ProductImage,
    ProductTag,
    ProductVariant,
)
from app.modules.ecommerce.products.schemas import (
    ProductCreate,
    ProductImageCreate,
    ProductTagCreate,
    ProductUpdate,
    VariantCreate,
    VariantUpdate,
)


class ProductRepository:

    def get_by_id(self, db: Session, product_id: uuid.UUID) -> Product | None:
        return db.query(Product).filter(Product.id == product_id).first()

    def get_by_slug(self, db: Session, slug: str) -> Product | None:
        return db.query(Product).filter(Product.slug == slug).first()

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        category_id: uuid.UUID | None = None,
        status: Status | None = None,
    ) -> list[Product]:
        query = db.query(Product)
        if business_id is not None:
            query = query.filter(Product.business_id == business_id)
        if category_id is not None:
            query = query.filter(Product.category_id == category_id)
        if status is not None:
            query = query.filter(Product.status == status)
        return query.offset(skip).limit(limit).all()

    def create(self, db: Session, data: ProductCreate) -> Product:
        product = Product(
            title=data.title,
            slug=data.slug,
            description=data.description,
            brand=data.brand,
            status=data.status,
            condition=data.condition,
            product_type=data.product_type,
            requires_shipping=data.requires_shipping,
            meta_title=data.meta_title,
            meta_description=data.meta_description,
            video_url=data.video_url,
            is_featured=data.is_featured,
            category_id=data.category_id,
            seller_id=data.seller_id,
            business_id=data.business_id,
        )

        if data.tag_ids:
            tags = db.query(ProductTag).filter(ProductTag.id.in_(data.tag_ids)).all()
            product.tags.extend(tags)

        if data.variants:
            for v_data in data.variants:
                variant = ProductVariant(
                    sku=v_data.sku,
                    barcode=v_data.barcode,
                    attributes=v_data.attributes,
                    price=v_data.price,
                    compare_at_price=v_data.compare_at_price,
                    cost_price=v_data.cost_price,
                    currency=v_data.currency,
                    stock_qty=v_data.stock_qty,
                    low_stock_threshold=v_data.low_stock_threshold,
                    backorder_allowed=v_data.backorder_allowed,
                    is_default=v_data.is_default,
                    weight=v_data.weight,
                    weight_unit=v_data.weight_unit,
                    length=v_data.length,
                    width=v_data.width,
                    height=v_data.height,
                    dimension_unit=v_data.dimension_unit,
                )
                product.variants.append(variant)

        if data.images:
            for img_data in data.images:
                image = ProductImage(
                    url=img_data.url,
                    position=img_data.position,
                    alt_text=img_data.alt_text,
                    is_primary=img_data.is_primary,
                    media_type=img_data.media_type,
                    variant_id=img_data.variant_id,
                )
                product.images.append(image)

        if data.attributes:
            for attr_data in data.attributes:
                attribute = ProductAttribute(name=attr_data.name)
                if attr_data.values:
                    for val_data in attr_data.values:
                        value = AttributeValue(value=val_data.value)
                        attribute.values.append(value)
                product.attributes.append(attribute)

        db.add(product)
        db.commit()
        db.refresh(product)
        return product

    def update(self, db: Session, product: Product, data: ProductUpdate) -> Product:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(product, field, value)

        db.commit()
        db.refresh(product)
        return product

    def delete(self, db: Session, product: Product) -> None:
        db.delete(product)
        db.commit()

    # --- Tags ---
    def create_tag(self, db: Session, data: ProductTagCreate) -> ProductTag:
        tag = ProductTag(
            name=data.name,
            slug=data.slug,
            business_id=data.business_id,
        )
        db.add(tag)
        db.commit()
        db.refresh(tag)
        return tag

    def get_tag_by_id(self, db: Session, tag_id: uuid.UUID) -> ProductTag | None:
        return db.query(ProductTag).filter(ProductTag.id == tag_id).first()

    def get_tag_by_slug(self, db: Session, slug: str) -> ProductTag | None:
        return db.query(ProductTag).filter(ProductTag.slug == slug).first()

    def get_tags(
        self, db: Session, business_id: int | None = None
    ) -> list[ProductTag]:
        query = db.query(ProductTag)
        if business_id is not None:
            query = query.filter(ProductTag.business_id == business_id)
        return query.all()

    # --- Variants ---
    def create_variant(
        self, db: Session, product_id: uuid.UUID, data: VariantCreate
    ) -> ProductVariant:
        variant = ProductVariant(
            product_id=product_id,
            sku=data.sku,
            barcode=data.barcode,
            attributes=data.attributes,
            price=data.price,
            compare_at_price=data.compare_at_price,
            cost_price=data.cost_price,
            currency=data.currency,
            stock_qty=data.stock_qty,
            low_stock_threshold=data.low_stock_threshold,
            backorder_allowed=data.backorder_allowed,
            is_default=data.is_default,
            weight=data.weight,
            weight_unit=data.weight_unit,
            length=data.length,
            width=data.width,
            height=data.height,
            dimension_unit=data.dimension_unit,
        )
        db.add(variant)
        db.commit()
        db.refresh(variant)
        return variant

    def get_variant_by_id(
        self, db: Session, variant_id: uuid.UUID
    ) -> ProductVariant | None:
        return db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()

    def update_variant(
        self, db: Session, variant: ProductVariant, data: VariantUpdate
    ) -> ProductVariant:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(variant, field, value)

        db.commit()
        db.refresh(variant)
        return variant

    def delete_variant(self, db: Session, variant: ProductVariant) -> None:
        db.delete(variant)
        db.commit()

    # --- Images ---
    def create_image(
        self, db: Session, product_id: uuid.UUID, data: ProductImageCreate
    ) -> ProductImage:
        image = ProductImage(
            product_id=product_id,
            url=data.url,
            position=data.position,
            alt_text=data.alt_text,
            is_primary=data.is_primary,
            media_type=data.media_type,
            variant_id=data.variant_id,
        )
        db.add(image)
        db.commit()
        db.refresh(image)
        return image

    def get_image_by_id(
        self, db: Session, image_id: uuid.UUID
    ) -> ProductImage | None:
        return db.query(ProductImage).filter(ProductImage.id == image_id).first()

    def delete_image(self, db: Session, image: ProductImage) -> None:
        db.delete(image)
        db.commit()
