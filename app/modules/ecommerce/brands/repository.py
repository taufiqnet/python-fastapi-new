import uuid

from sqlalchemy.orm import Session

from app.modules.ecommerce.brands.models import Brand, ProductModel
from app.modules.ecommerce.brands.schemas import (
    BrandCreate,
    BrandUpdate,
    ProductModelCreate,
    ProductModelUpdate,
)


class BrandRepository:

    # --- Brand Operations ---
    def get_by_id(self, db: Session, brand_id: uuid.UUID) -> Brand | None:
        return db.query(Brand).filter(Brand.id == brand_id).first()

    def get_by_slug(self, db: Session, slug: str) -> Brand | None:
        return db.query(Brand).filter(Brand.slug == slug).first()

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        is_active: bool | None = None,
    ) -> list[Brand]:
        query = db.query(Brand)
        if business_id is not None:
            query = query.filter(Brand.business_id == business_id)
        if is_active is not None:
            query = query.filter(Brand.is_active == is_active)
        return query.offset(skip).limit(limit).all()

    def create(self, db: Session, data: BrandCreate) -> Brand:
        brand = Brand(
            name=data.name,
            slug=data.slug,
            logo_url=data.logo_url,
            description=data.description,
            is_active=data.is_active,
            business_id=data.business_id,
        )
        db.add(brand)
        db.commit()
        db.refresh(brand)
        return brand

    def update(self, db: Session, brand: Brand, data: BrandUpdate) -> Brand:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(brand, field, value)

        db.commit()
        db.refresh(brand)
        return brand

    def delete(self, db: Session, brand: Brand) -> None:
        db.delete(brand)
        db.commit()

    # --- ProductModel Operations ---
    def get_model_by_id(
        self, db: Session, model_id: uuid.UUID
    ) -> ProductModel | None:
        return db.query(ProductModel).filter(ProductModel.id == model_id).first()

    def get_model_by_slug(self, db: Session, slug: str) -> ProductModel | None:
        return db.query(ProductModel).filter(ProductModel.slug == slug).first()

    def get_models_by_brand(
        self,
        db: Session,
        brand_id: uuid.UUID,
        is_active: bool | None = None,
    ) -> list[ProductModel]:
        query = db.query(ProductModel).filter(ProductModel.brand_id == brand_id)
        if is_active is not None:
            query = query.filter(ProductModel.is_active == is_active)
        return query.all()

    def create_model(
        self, db: Session, brand_id: uuid.UUID, data: ProductModelCreate
    ) -> ProductModel:
        model = ProductModel(
            brand_id=brand_id,
            name=data.name,
            slug=data.slug,
            description=data.description,
            is_active=data.is_active,
        )
        db.add(model)
        db.commit()
        db.refresh(model)
        return model

    def update_model(
        self, db: Session, model: ProductModel, data: ProductModelUpdate
    ) -> ProductModel:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(model, field, value)

        db.commit()
        db.refresh(model)
        return model

    def delete_model(self, db: Session, model: ProductModel) -> None:
        db.delete(model)
        db.commit()
