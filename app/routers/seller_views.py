from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.ecommerce.sellers.models import SellerStatus
from app.modules.ecommerce.sellers.service import SellerService

router = APIRouter(prefix="", tags=["Seller Views"])
templates = Jinja2Templates(directory="app/templates")

seller_service = SellerService()
business_service = BusinessService()


@router.get("/sellers/manage", response_class=HTMLResponse)
def sellers_manage_page(
    request: Request,
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

    selected_business_id = resolved_business_id or (
        businesses[0].id if businesses else 1
    )

    sellers = seller_service.list_sellers(
        db, business_id=selected_business_id, limit=1000
    )
    stats = seller_service.get_seller_stats(db, business_id=selected_business_id)
    unassigned_products = seller_service.get_unassigned_products(
        db, business_id=selected_business_id
    )

    seller_statuses = [s.value for s in SellerStatus]

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/sellers/sellers_manage.html",
        context={
            "sellers": sellers,
            "stats": stats,
            "businesses": businesses,
            "selected_business_id": selected_business_id,
            "unassigned_products": unassigned_products,
            "seller_statuses": seller_statuses,
            "active_page": "sellers",
            "current_user": current_user,
        },
    )
