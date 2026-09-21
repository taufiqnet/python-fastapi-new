import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy import resolve_business_id
from app.database import get_db
from app.modules.ecommerce.sellers.schemas import (
    SellerCommissionUpdate,
    SellerCreate,
    SellerOut,
    SellerStatusUpdate,
    SellerUpdate,
)
from app.modules.ecommerce.sellers.service import SellerService

router = APIRouter(prefix="/sellers", tags=["Sellers & Multi-Vendor"])
service = SellerService()


@router.post("", response_model=SellerOut, status_code=status.HTTP_201_CREATED)
def onboard_seller(
    data: SellerCreate,
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "products", "create")),
    db: Session = Depends(get_db),
):
    target_business_id = resolve_business_id(current_user, business_id or data.business_id)
    seller = service.create_seller(db, data, business_id=target_business_id)
    return seller


@router.get("", response_model=list[SellerOut])
def list_sellers(
    business_id: int | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=1000),
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    target_business_id = resolve_business_id(current_user, business_id)
    sellers = service.list_sellers(
        db,
        business_id=target_business_id,
        status_filter=status_filter,
        search=search,
        skip=skip,
        limit=limit,
    )
    res = []
    for s in sellers:
        out = SellerOut.model_validate(s)
        out.products_count = len(s.products) if s.products else 0
        res.append(out)
    return res


@router.get("/{seller_id}", response_model=SellerOut)
def get_seller(
    seller_id: uuid.UUID,
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    target_business_id = resolve_business_id(current_user, business_id)
    seller = service.get_seller(db, seller_id, business_id=target_business_id)
    out = SellerOut.model_validate(seller)
    out.products_count = len(seller.products) if seller.products else 0
    return out


@router.put("/{seller_id}", response_model=SellerOut)
def update_seller(
    seller_id: uuid.UUID,
    data: SellerUpdate,
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "products", "update")),
    db: Session = Depends(get_db),
):
    target_business_id = resolve_business_id(current_user, business_id)
    seller = service.update_seller(db, seller_id, data, business_id=target_business_id)
    out = SellerOut.model_validate(seller)
    out.products_count = len(seller.products) if seller.products else 0
    return out


@router.put("/{seller_id}/status", response_model=SellerOut)
def update_seller_status(
    seller_id: uuid.UUID,
    data: SellerStatusUpdate,
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "products", "update")),
    db: Session = Depends(get_db),
):
    target_business_id = resolve_business_id(current_user, business_id)
    seller = service.update_seller_status(
        db, seller_id, data, business_id=target_business_id
    )
    out = SellerOut.model_validate(seller)
    out.products_count = len(seller.products) if seller.products else 0
    return out


@router.put("/{seller_id}/commission", response_model=SellerOut)
def update_seller_commission(
    seller_id: uuid.UUID,
    data: SellerCommissionUpdate,
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "products", "update")),
    db: Session = Depends(get_db),
):
    target_business_id = resolve_business_id(current_user, business_id)
    seller = service.update_seller_commission(
        db, seller_id, data, business_id=target_business_id
    )
    out = SellerOut.model_validate(seller)
    out.products_count = len(seller.products) if seller.products else 0
    return out


@router.delete("/{seller_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_seller(
    seller_id: uuid.UUID,
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "products", "delete")),
    db: Session = Depends(get_db),
):
    target_business_id = resolve_business_id(current_user, business_id)
    service.delete_seller(db, seller_id, business_id=target_business_id)


@router.get("/{seller_id}/products")
def get_seller_products(
    seller_id: uuid.UUID,
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    target_business_id = resolve_business_id(current_user, business_id)
    products = service.get_seller_products(db, seller_id, business_id=target_business_id)
    return [
        {
            "id": str(p.id),
            "title": p.title,
            "slug": p.slug,
            "status": getattr(p.status, "value", str(p.status)),
            "brand": p.brand,
            "price": str(p.variants[0].price) if p.variants else None,
        }
        for p in products
    ]


@router.post("/{seller_id}/products/{product_id}")
def associate_product(
    seller_id: uuid.UUID,
    product_id: uuid.UUID,
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "products", "update")),
    db: Session = Depends(get_db),
):
    target_business_id = resolve_business_id(current_user, business_id)
    product = service.associate_product(
        db, seller_id, product_id, business_id=target_business_id
    )
    return {
        "message": "Product successfully associated with seller",
        "product_id": str(product.id),
        "seller_id": str(seller_id),
    }


@router.delete("/{seller_id}/products/{product_id}")
def disassociate_product(
    seller_id: uuid.UUID,
    product_id: uuid.UUID,
    business_id: int | None = Query(None),
    current_user: User = Depends(require_permission("ecommerce", "products", "update")),
    db: Session = Depends(get_db),
):
    target_business_id = resolve_business_id(current_user, business_id)
    service.disassociate_product(
        db, seller_id, product_id, business_id=target_business_id
    )
    return {
        "message": "Product successfully disassociated from seller",
        "product_id": str(product_id),
        "seller_id": str(seller_id),
    }
