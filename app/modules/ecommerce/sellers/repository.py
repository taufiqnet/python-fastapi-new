import uuid
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.modules.ecommerce.products.models import Product
from app.modules.ecommerce.sellers.models import Seller, SellerStatus
from app.modules.ecommerce.sellers.schemas import SellerCreate


class SellerRepository:
    def create(self, db: Session, obj_in: SellerCreate | dict) -> Seller:
        if isinstance(obj_in, dict):
            data = obj_in
        else:
            data = obj_in.model_dump()
        seller = Seller(**data)
        db.add(seller)
        db.commit()
        db.refresh(seller)
        return seller

    def get_by_id(
        self, db: Session, seller_id: uuid.UUID, business_id: int | None = None
    ) -> Seller | None:
        query = db.query(Seller).filter(Seller.id == seller_id)
        if business_id is not None:
            query = query.filter(
                or_(Seller.business_id == business_id, Seller.business_id.is_(None))
            )
        return query.first()

    def get_by_slug(
        self, db: Session, slug: str, business_id: int | None = None
    ) -> Seller | None:
        query = db.query(Seller).filter(Seller.slug == slug)
        if business_id is not None:
            query = query.filter(
                or_(Seller.business_id == business_id, Seller.business_id.is_(None))
            )
        return query.first()

    def get_multi(
        self,
        db: Session,
        business_id: int | None = None,
        status: SellerStatus | str | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 500,
    ) -> list[Seller]:
        query = db.query(Seller)
        if business_id is not None:
            query = query.filter(
                or_(Seller.business_id == business_id, Seller.business_id.is_(None))
            )
        if status:
            if isinstance(status, str):
                query = query.filter(Seller.status == status)
            else:
                query = query.filter(Seller.status == status.value)
        if search:
            pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Seller.store_name.ilike(pattern),
                    Seller.company_name.ilike(pattern),
                    Seller.contact_email.ilike(pattern),
                    Seller.contact_phone.ilike(pattern),
                )
            )
        return query.order_by(Seller.created_at.desc()).offset(skip).limit(limit).all()

    def update(self, db: Session, db_obj: Seller, obj_in: dict) -> Seller:
        for field, value in obj_in.items():
            if value is not None:
                setattr(db_obj, field, value)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, db_obj: Seller) -> None:
        db.delete(db_obj)
        db.commit()

    def associate_product(
        self, db: Session, seller_id: uuid.UUID, product_id: uuid.UUID
    ) -> Product | None:
        product = db.query(Product).filter(Product.id == product_id).first()
        if product:
            product.seller_id = seller_id
            db.add(product)
            db.commit()
            db.refresh(product)
        return product

    def disassociate_product(
        self, db: Session, seller_id: uuid.UUID, product_id: uuid.UUID
    ) -> Product | None:
        product = (
            db.query(Product)
            .filter(Product.id == product_id, Product.seller_id == seller_id)
            .first()
        )
        if product:
            product.seller_id = None
            db.add(product)
            db.commit()
            db.refresh(product)
        return product

    def get_seller_products(
        self, db: Session, seller_id: uuid.UUID
    ) -> list[Product]:
        return db.query(Product).filter(Product.seller_id == seller_id).all()

    def get_unassigned_products(
        self, db: Session, business_id: int | None = None
    ) -> list[Product]:
        query = db.query(Product).filter(Product.seller_id.is_(None))
        if business_id is not None:
            query = query.filter(
                or_(Product.business_id == business_id, Product.business_id.is_(None))
            )
        return query.order_by(Product.title.asc()).all()
