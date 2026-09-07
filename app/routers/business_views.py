from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.deps import get_current_user_optional
from app.core.tenancy.service import BusinessService
from app.database import get_async_db, get_db

router = APIRouter(prefix="", tags=["Business Views"])
templates = Jinja2Templates(directory="app/templates")
service = BusinessService()


def add_no_cache_headers(response: Response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@router.get("/", response_class=HTMLResponse)
async def root_or_business_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    async_db=Depends(get_async_db),
):
    current_user = await get_current_user_optional(request, None, async_db)
    if not current_user or not current_user.is_active:
        res = RedirectResponse(url="/auth/login", status_code=status.HTTP_302_FOUND)
        return add_no_cache_headers(res)

    businesses = service.list_businesses(db, skip=skip, limit=limit)
    total_count = len(businesses)
    active_count = sum(1 for b in businesses if getattr(b, "is_active", True))
    inactive_count = total_count - active_count
    countries = sorted(
        list({b.country for b in businesses if getattr(b, "country", None)})
    )

    response = templates.TemplateResponse(
        request=request,
        name="modules/tenancy/business_list.html",
        context={
            "businesses": businesses,
            "total_count": total_count,
            "active_count": active_count,
            "inactive_count": inactive_count,
            "countries_count": len(countries),
            "countries": countries,
        },
    )
    return add_no_cache_headers(response)


@router.get("/businesses/manage", response_class=HTMLResponse)
def business_manage_page(
    request: Request, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    businesses = service.list_businesses(db, skip=skip, limit=limit)
    total_count = len(businesses)
    active_count = sum(1 for b in businesses if getattr(b, "is_active", True))
    inactive_count = total_count - active_count
    countries = sorted(
        list({b.country for b in businesses if getattr(b, "country", None)})
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/tenancy/business_list.html",
        context={
            "businesses": businesses,
            "total_count": total_count,
            "active_count": active_count,
            "inactive_count": inactive_count,
            "countries_count": len(countries),
            "countries": countries,
        },
    )


@router.get("/businesses/create", response_class=HTMLResponse)
def business_create_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="modules/tenancy/business_form.html",
        context={
            "business": None,
            "is_edit": False,
        },
    )


@router.get("/businesses/{business_id}", response_class=HTMLResponse)
def business_detail_page(
    business_id: int, request: Request, db: Session = Depends(get_db)
):
    business = service.get_business(db, business_id)
    return templates.TemplateResponse(
        request=request,
        name="modules/tenancy/business_detail.html",
        context={
            "business": business,
        },
    )


@router.get("/businesses/{business_id}/edit", response_class=HTMLResponse)
def business_edit_page(
    business_id: int, request: Request, db: Session = Depends(get_db)
):
    business = service.get_business(db, business_id)
    return templates.TemplateResponse(
        request=request,
        name="modules/tenancy/business_form.html",
        context={
            "business": business,
            "is_edit": True,
        },
    )
