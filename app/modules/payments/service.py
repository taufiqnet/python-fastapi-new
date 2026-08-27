import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.payments.models import PaymentStatus
from app.modules.payments.repository import PaymentRepository
from app.modules.payments.schemas import (
    PaymentIntentCreate,
    PaymentMethodCreate,
    PaymentMethodOut,
    PaymentOut,
    RefundOut,
    RefundRequest,
)


class PaymentService:
    def __init__(self, repository: PaymentRepository | None = None):
        self.repository = repository or PaymentRepository()

    def create_payment_intent(
        self, db: Session, data: PaymentIntentCreate
    ) -> PaymentOut:
        payment = self.repository.create_payment(db, data)
        return PaymentOut.model_validate(payment)

    def get_payment(
        self, db: Session, payment_id: uuid.UUID, business_id: int = 1
    ) -> PaymentOut:
        payment = self.repository.get_payment_by_id(
            db, payment_id, business_id=business_id
        )
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found"
            )
        return PaymentOut.model_validate(payment)

    def capture_payment(
        self, db: Session, payment_id: uuid.UUID, business_id: int = 1
    ) -> PaymentOut:
        payment = self.repository.get_payment_by_id(
            db, payment_id, business_id=business_id
        )
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found"
            )
        updated = self.repository.update_payment_status(
            db, payment, PaymentStatus.CAPTURED
        )
        return PaymentOut.model_validate(updated)

    def refund_payment(
        self,
        db: Session,
        payment_id: uuid.UUID,
        req: RefundRequest,
        business_id: int = 1,
    ) -> RefundOut:
        payment = self.repository.get_payment_by_id(
            db, payment_id, business_id=business_id
        )
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found"
            )
        refund = self.repository.create_refund(db, payment, req)
        return RefundOut.model_validate(refund)

    def create_payment_method(
        self, db: Session, data: PaymentMethodCreate
    ) -> PaymentMethodOut:
        method = self.repository.create_payment_method(db, data)
        return PaymentMethodOut.model_validate(method)

    def get_payment_methods(
        self, db: Session, user_id: uuid.UUID, business_id: int = 1
    ) -> list[PaymentMethodOut]:
        methods = self.repository.get_payment_methods(
            db, user_id=user_id, business_id=business_id
        )
        return [PaymentMethodOut.model_validate(m) for m in methods]
