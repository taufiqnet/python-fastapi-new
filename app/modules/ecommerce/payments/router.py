import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.ecommerce.payments.schemas import (
    PaymentIntentCreate,
    PaymentMethodCreate,
    PaymentMethodOut,
    PaymentOut,
    RefundOut,
    RefundRequest,
)
from app.modules.ecommerce.payments.service import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments"])
service = PaymentService()


@router.post("", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def create_payment_intent(data: PaymentIntentCreate, db: Session = Depends(get_db)):
    return service.create_payment_intent(db, data)


@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(
    payment_id: uuid.UUID,
    business_id: int = Query(1),
    db: Session = Depends(get_db),
):
    return service.get_payment(db, payment_id=payment_id, business_id=business_id)


@router.post("/{payment_id}/capture", response_model=PaymentOut)
def capture_payment(
    payment_id: uuid.UUID,
    business_id: int = Query(1),
    db: Session = Depends(get_db),
):
    return service.capture_payment(db, payment_id=payment_id, business_id=business_id)


@router.post("/{payment_id}/refund", response_model=RefundOut)
def refund_payment(
    payment_id: uuid.UUID,
    req: RefundRequest,
    business_id: int = Query(1),
    db: Session = Depends(get_db),
):
    return service.refund_payment(
        db, payment_id=payment_id, req=req, business_id=business_id
    )


@router.post(
    "/methods", response_model=PaymentMethodOut, status_code=status.HTTP_201_CREATED
)
def create_payment_method(data: PaymentMethodCreate, db: Session = Depends(get_db)):
    return service.create_payment_method(db, data)


@router.get("/methods", response_model=list[PaymentMethodOut])
def get_payment_methods(
    user_id: uuid.UUID = Query(...),
    business_id: int = Query(1),
    db: Session = Depends(get_db),
):
    return service.get_payment_methods(db, user_id=user_id, business_id=business_id)
