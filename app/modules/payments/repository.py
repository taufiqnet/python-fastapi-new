import uuid
from decimal import Decimal

from sqlalchemy.orm import Session

from app.modules.payments.models import Payment, PaymentMethod, PaymentStatus, Refund
from app.modules.payments.schemas import (
    PaymentIntentCreate,
    PaymentMethodCreate,
    RefundRequest,
)


class PaymentRepository:
    def create_payment(self, db: Session, data: PaymentIntentCreate) -> Payment:
        payment = Payment(
            business_id=data.business_id,
            order_id=data.order_id,
            provider=data.provider,
            amount=Decimal(str(data.amount)),
            currency=data.currency,
            status=PaymentStatus.PENDING,
            transaction_id=f"tx_{uuid.uuid4().hex[:12]}",
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
        return payment

    def get_payment_by_id(
        self, db: Session, payment_id: uuid.UUID, business_id: int = 1
    ) -> Payment | None:
        return (
            db.query(Payment)
            .filter(Payment.id == payment_id, Payment.business_id == business_id)
            .first()
        )

    def update_payment_status(
        self, db: Session, payment: Payment, new_status: PaymentStatus
    ) -> Payment:
        payment.status = new_status
        db.commit()
        db.refresh(payment)
        return payment

    def create_refund(
        self, db: Session, payment: Payment, req: RefundRequest
    ) -> Refund:
        refund = Refund(
            payment_id=payment.id,
            amount=Decimal(str(req.amount)),
            reason=req.reason,
            status="processed",
        )
        payment.status = PaymentStatus.REFUNDED
        db.add(refund)
        db.commit()
        db.refresh(refund)
        return refund

    def create_payment_method(
        self, db: Session, data: PaymentMethodCreate
    ) -> PaymentMethod:
        method = PaymentMethod(**data.model_dump())
        db.add(method)
        db.commit()
        db.refresh(method)
        return method

    def get_payment_methods(
        self, db: Session, user_id: uuid.UUID, business_id: int = 1
    ) -> list[PaymentMethod]:
        return (
            db.query(PaymentMethod)
            .filter(
                PaymentMethod.user_id == user_id,
                PaymentMethod.business_id == business_id,
            )
            .all()
        )
