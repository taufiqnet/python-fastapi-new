import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.hr_payroll.offer_letters.service import OfferLetterService

router = APIRouter(prefix="/offer-letters", tags=["Offer Letter Views"])
templates = Jinja2Templates(directory="app/templates")

offer_letter_service = OfferLetterService()
business_service = BusinessService()


@router.get("/manage", response_class=HTMLResponse)
def offer_letter_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    db: Session = Depends(get_db),
    _perm = Depends(require_permission("hrm", "offer_letters", "view")),
):
    letters = offer_letter_service.get_letters(
        db, skip=skip, limit=limit, business_id=business_id
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    biz_map = {b.id: b.name_en for b in businesses}

    total_count = len(letters)
    issued_count = sum(1 for l in letters if l.status == "issued")
    draft_count = sum(1 for l in letters if l.status == "draft")
    revoked_count = sum(1 for l in letters if l.status == "revoked")

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/offer_letters/offer_letter_list.html",
        context={
            "letters": letters,
            "businesses": businesses,
            "biz_map": biz_map,
            "total_count": total_count,
            "issued_count": issued_count,
            "draft_count": draft_count,
            "revoked_count": revoked_count,
            "active_page": "offer_letters",
        },
    )


@router.get("/create", response_class=HTMLResponse)
def offer_letter_create_page(
    request: Request,
    db: Session = Depends(get_db),
    _perm = Depends(require_permission("hrm", "offer_letters", "create")),
):
    businesses = business_service.list_businesses(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/offer_letters/offer_letter_form.html",
        context={
            "letter": None,
            "is_edit": False,
            "businesses": businesses,
            "active_page": "offer_letters",
        },
    )


@router.get("/detail/{letter_id}", response_class=HTMLResponse)
def offer_letter_detail_page(
    letter_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    _perm = Depends(require_permission("hrm", "offer_letters", "view")),
):
    letter = offer_letter_service.get_letter(db, letter_id)
    business = (
        business_service.get_business(db, letter.business_id)
        if letter.business_id
        else None
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/offer_letters/printable_offer_letter.html",
        context={
            "letter": letter,
            "business": business,
            "active_page": "offer_letters",
        },
    )


@router.get("/edit/{letter_id}", response_class=HTMLResponse)
def offer_letter_edit_page(
    letter_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    _perm = Depends(require_permission("hrm", "offer_letters", "update")),
):
    letter = offer_letter_service.get_letter(db, letter_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/offer_letters/offer_letter_form.html",
        context={
            "letter": letter,
            "is_edit": True,
            "businesses": businesses,
            "active_page": "offer_letters",
        },
    )
