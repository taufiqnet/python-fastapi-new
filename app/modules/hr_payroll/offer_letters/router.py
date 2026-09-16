import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.database import get_db
from app.modules.hr_payroll.offer_letters.schemas import (
    OfferLetterCreate,
    OfferLetterOut,
    OfferLetterUpdate,
)
from app.modules.hr_payroll.offer_letters.service import OfferLetterService

router = APIRouter(prefix="/offer-letters", tags=["Offer Letters"])
service = OfferLetterService()


@router.get("", response_model=list[OfferLetterOut])
def get_offer_letters(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "offer_letters", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return service.get_letters(db, skip=skip, limit=limit, business_id=resolved_business_id)


@router.get("/{letter_id}", response_model=OfferLetterOut)
def get_offer_letter(
    letter_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "offer_letters", "view")),
):
    return service.get_letter(db, letter_id, current_user=current_user)


@router.post(
    "",
    response_model=OfferLetterOut,
    status_code=status.HTTP_201_CREATED,
)
def create_offer_letter(
    letter_data: OfferLetterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "offer_letters", "create")),
):
    resolved_business_id = resolve_business_id(current_user, letter_data.business_id)
    if not current_user.is_superuser:
        letter_data.business_id = current_user.business_id
    elif letter_data.business_id is None:
        letter_data.business_id = resolved_business_id
    return service.create_letter(db, letter_data)


@router.put("/{letter_id}", response_model=OfferLetterOut)
def update_offer_letter(
    letter_id: uuid.UUID,
    letter_data: OfferLetterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "offer_letters", "update")),
):
    return service.update_letter(db, letter_id, letter_data, current_user=current_user)


@router.delete("/{letter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_offer_letter(
    letter_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "offer_letters", "delete")),
):
    service.delete_letter(db, letter_id, current_user=current_user)
    return None
