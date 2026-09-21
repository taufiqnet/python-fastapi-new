import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.ecommerce.brands.service import BrandService
from app.modules.ecommerce.categories.service import CategoryService
from app.modules.ecommerce.search.schemas import SearchQuery
from app.modules.ecommerce.search.service import SearchService

router = APIRouter(prefix="", tags=["Catalog Views"])
templates = Jinja2Templates(directory="app/templates")

search_service = SearchService()
category_service = CategoryService()
brand_service = BrandService()
business_service = BusinessService()


@router.get("/catalog/browse", response_class=HTMLResponse)
def catalog_browse_page(
    request: Request,
    q: str | None = None,
    business_id: int | None = None,
    category_id: uuid.UUID | None = None,
    brand: str | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    rating_min: float | None = None,
    is_featured: bool | None = None,
    sort_by: str = "relevance",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 12,
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

    categories = category_service.get_categories(db, business_id=selected_business_id, skip=0, limit=500)
    brands = brand_service.get_brands(db, business_id=selected_business_id, skip=0, limit=500)

    search_req = SearchQuery(
        q=q,
        business_id=selected_business_id,
        category_id=category_id,
        brand=brand,
        min_price=min_price,
        max_price=max_price,
        rating_min=rating_min,
        is_featured=is_featured,
        sort_by=sort_by if sort_by in ["relevance", "price", "rating", "created_at", "sold_count"] else "relevance",
        sort_order=sort_order if sort_order in ["asc", "desc"] else "desc",
        page=page,
        page_size=page_size,
    )

    search_result = search_service.search_products(db, search_req)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/catalog/catalog_browse.html",
        context={
            "result": search_result,
            "categories": categories,
            "brands": brands,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "q": q or "",
            "category_id": category_id,
            "selected_brand": brand or "",
            "min_price": min_price,
            "max_price": max_price,
            "rating_min": rating_min,
            "is_featured": is_featured,
            "sort_by": sort_by,
            "sort_order": sort_order,
            "active_page": "catalog",
            "current_user": current_user,
        },
    )
