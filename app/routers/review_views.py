import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.ecommerce.products.service import ProductService
from app.modules.ecommerce.reviews.models import ReviewStatus
from app.modules.ecommerce.reviews.service import ReviewService

router = APIRouter(prefix="", tags=["Review Views"])
templates = Jinja2Templates(directory="app/templates")

review_service = ReviewService()
product_service = ProductService()
business_service = BusinessService()


@router.get("/reviews/manage", response_class=HTMLResponse)
def reviews_manage_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    current_user: User = Depends(require_permission("ecommerce", "products", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    all_businesses = business_service.list_businesses(db, skip=0, limit=500)
    if current_user and not current_user.is_superuser and current_user.business_id:
        businesses = [b for b in all_businesses if b.id == current_user.business_id]
    else:
        businesses = all_businesses

    selected_business_id = resolved_business_id or (businesses[0].id if businesses else 1)

    reviews = review_service.get_all_reviews(
        db, business_id=selected_business_id, skip=skip, limit=limit
    )
    products = product_service.get_products(
        db, business_id=selected_business_id, skip=0, limit=500
    )

    prod_map = {p.id: p for p in products}

    total_reviews = len(reviews)
    pending_count = sum(
        1
        for r in reviews
        if (getattr(r.status, "value", r.status) == ReviewStatus.PENDING.value)
    )
    approved_count = sum(
        1
        for r in reviews
        if (getattr(r.status, "value", r.status) == ReviewStatus.APPROVED.value)
    )
    rejected_count = sum(
        1
        for r in reviews
        if (getattr(r.status, "value", r.status) == ReviewStatus.REJECTED.value)
    )

    avg_rating = (
        round(sum(r.rating for r in reviews) / total_reviews, 2)
        if total_reviews > 0
        else 0.0
    )

    statuses = [s.value for s in ReviewStatus]

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/reviews/reviews_manage.html",
        context={
            "reviews": reviews,
            "products": products,
            "prod_map": prod_map,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "total_reviews": total_reviews,
            "pending_count": pending_count,
            "approved_count": approved_count,
            "rejected_count": rejected_count,
            "avg_rating": avg_rating,
            "review_statuses": statuses,
            "active_page": "reviews",
            "current_user": current_user,
        },
    )
