import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.ecommerce.brands.service import BrandService

router = APIRouter(prefix="", tags=["Model Views"])
templates = Jinja2Templates(directory="app/templates")
brand_service = BrandService()


@router.get("/brands/models", response_class=HTMLResponse)
def model_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    db: Session = Depends(get_db),
):
    models = brand_service.get_all_models(db, skip=skip, limit=limit)
    brands = brand_service.get_brands(db, skip=0, limit=500)
    brand_map = {b.id: b.name for b in brands}

    total_count = len(models)
    active_count = sum(1 for m in models if getattr(m, "is_active", True))
    inactive_count = total_count - active_count

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/models/model_list.html",
        context={
            "models": models,
            "brands": brands,
            "brand_map": brand_map,
            "total_count": total_count,
            "active_count": active_count,
            "inactive_count": inactive_count,
            "active_page": "models",
        },
    )


@router.get("/brands/models/create", response_class=HTMLResponse)
def model_create_page(request: Request, db: Session = Depends(get_db)):
    brands = brand_service.get_brands(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/models/model_form.html",
        context={
            "model": None,
            "is_edit": False,
            "brands": brands,
            "active_page": "models",
        },
    )


@router.get("/brands/models/detail/{model_id}", response_class=HTMLResponse)
def model_detail_page(
    model_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    model = brand_service.repository.get_model_by_id(db, model_id)
    if not model:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Model not found"
        )

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/models/model_detail.html",
        context={
            "model": model,
            "active_page": "models",
        },
    )


@router.get("/brands/models/edit/{model_id}", response_class=HTMLResponse)
def model_edit_page(
    model_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
):
    model = brand_service.repository.get_model_by_id(db, model_id)
    if not model:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Model not found"
        )

    brands = brand_service.get_brands(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/ecommerce/models/model_form.html",
        context={
            "model": model,
            "is_edit": True,
            "brands": brands,
            "active_page": "models",
        },
    )
