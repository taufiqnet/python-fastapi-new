import re
import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.ecommerce.sellers.models import CommissionType, Seller, SellerStatus
from app.modules.ecommerce.sellers.repository import SellerRepository
from app.modules.ecommerce.sellers.schemas import (
    SellerCommissionUpdate,
    SellerCreate,
    SellerStatusUpdate,
    SellerUpdate,
)


class SellerService:
    def __init__(self, repo: SellerRepository | None = None):
        self.repo = repo or SellerRepository()

    def _generate_slug(self, db: Session, name: str, business_id: int | None = None) -> str:
        base_slug = re.sub(r"[^\w\s-]", "", name.lower()).strip()
        base_slug = re.sub(r"[-\s]+", "-", base_slug) or "seller"
        slug = base_slug
        counter = 1
        while self.repo.get_by_slug(db, slug, business_id=business_id):
            slug = f"{base_slug}-{counter}"
            counter += 1
        return slug

    def create_seller(
        self, db: Session, data: SellerCreate, business_id: int | None = None
    ) -> Seller:
        target_business_id = business_id or data.business_id
        data_dict = data.model_dump()
        data_dict["business_id"] = target_business_id

        if not data_dict.get("slug"):
            data_dict["slug"] = self._generate_slug(
                db, data_dict["store_name"], business_id=target_business_id
            )
        else:
            existing = self.repo.get_by_slug(db, data_dict["slug"], business_id=target_business_id)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Seller slug '{data_dict['slug']}' is already in use.",
                )

        return self.repo.create(db, data_dict)

    def get_seller(
        self, db: Session, seller_id: uuid.UUID, business_id: int | None = None
    ) -> Seller:
        seller = self.repo.get_by_id(db, seller_id, business_id=business_id)
        if not seller:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Seller profile not found.",
            )
        return seller

    def list_sellers(
        self,
        db: Session,
        business_id: int | None = None,
        status_filter: SellerStatus | str | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 500,
    ) -> list[Seller]:
        return self.repo.get_multi(
            db,
            business_id=business_id,
            status=status_filter,
            search=search,
            skip=skip,
            limit=limit,
        )

    def update_seller(
        self,
        db: Session,
        seller_id: uuid.UUID,
        data: SellerUpdate,
        business_id: int | None = None,
    ) -> Seller:
        seller = self.get_seller(db, seller_id, business_id=business_id)
        update_dict = data.model_dump(exclude_unset=True)

        if "slug" in update_dict and update_dict["slug"] and update_dict["slug"] != seller.slug:
            existing = self.repo.get_by_slug(db, update_dict["slug"], business_id=business_id)
            if existing and existing.id != seller.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Seller slug '{update_dict['slug']}' is already in use.",
                )

        return self.repo.update(db, seller, update_dict)

    def update_seller_status(
        self,
        db: Session,
        seller_id: uuid.UUID,
        data: SellerStatusUpdate,
        business_id: int | None = None,
    ) -> Seller:
        seller = self.get_seller(db, seller_id, business_id=business_id)
        update_dict = {"status": data.status}
        if data.is_verified is not None:
            update_dict["is_verified"] = data.is_verified
        elif data.status == SellerStatus.ACTIVE:
            update_dict["is_verified"] = True

        return self.repo.update(db, seller, update_dict)

    def update_seller_commission(
        self,
        db: Session,
        seller_id: uuid.UUID,
        data: SellerCommissionUpdate,
        business_id: int | None = None,
    ) -> Seller:
        seller = self.get_seller(db, seller_id, business_id=business_id)
        update_dict = data.model_dump()
        return self.repo.update(db, seller, update_dict)

    def delete_seller(
        self, db: Session, seller_id: uuid.UUID, business_id: int | None = None
    ) -> None:
        seller = self.get_seller(db, seller_id, business_id=business_id)
        # Disassociate products first
        products = self.repo.get_seller_products(db, seller.id)
        for p in products:
            p.seller_id = None
            db.add(p)
        db.commit()
        self.repo.delete(db, seller)

    def associate_product(
        self,
        db: Session,
        seller_id: uuid.UUID,
        product_id: uuid.UUID,
        business_id: int | None = None,
    ):
        seller = self.get_seller(db, seller_id, business_id=business_id)
        product = self.repo.associate_product(db, seller.id, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found.",
            )
        return product

    def disassociate_product(
        self,
        db: Session,
        seller_id: uuid.UUID,
        product_id: uuid.UUID,
        business_id: int | None = None,
    ):
        seller = self.get_seller(db, seller_id, business_id=business_id)
        product = self.repo.disassociate_product(db, seller.id, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product is not associated with this seller.",
            )
        return product

    def get_seller_products(
        self, db: Session, seller_id: uuid.UUID, business_id: int | None = None
    ):
        seller = self.get_seller(db, seller_id, business_id=business_id)
        return self.repo.get_seller_products(db, seller.id)

    def get_unassigned_products(
        self, db: Session, business_id: int | None = None
    ):
        return self.repo.get_unassigned_products(db, business_id=business_id)

    def get_seller_stats(self, db: Session, business_id: int | None = None) -> dict:
        sellers = self.repo.get_multi(db, business_id=business_id, limit=5000)
        total_sellers = len(sellers)
        active_vendors = sum(
            1 for s in sellers if getattr(s.status, "value", s.status) == SellerStatus.ACTIVE.value
        )
        pending_onboarding = sum(
            1 for s in sellers if getattr(s.status, "value", s.status) == SellerStatus.PENDING.value
        )

        rates = [s.commission_rate for s in sellers if s.commission_rate is not None]
        avg_commission = (sum(rates) / len(rates)) if rates else Decimal("0.00")

        return {
            "total_sellers": total_sellers,
            "active_vendors": active_vendors,
            "pending_onboarding": pending_onboarding,
            "avg_commission_rate": round(avg_commission, 2),
        }
