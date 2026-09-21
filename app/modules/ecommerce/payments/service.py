import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.ecommerce.payments.models import PaymentStatus
from app.modules.ecommerce.payments.repository import PaymentRepository
from app.modules.ecommerce.payments.schemas import (
    PaymentGatewayConfigCreate,
    PaymentGatewayConfigOut,
    PaymentIntentCreate,
    PaymentMethodCreate,
    PaymentMethodOut,
    PaymentOut,
    PaymentWebhookPayload,
    RefundOut,
    RefundRequest,
)


class PaymentService:
    def __init__(self, repository: PaymentRepository | None = None):
        self.repository = repository or PaymentRepository()

    def get_gateway_configs(
        self, db: Session, business_id: int
    ) -> list[PaymentGatewayConfigOut]:
        configs = self.repository.get_gateway_configs(db, business_id=business_id)
        return [PaymentGatewayConfigOut.model_validate(c) for c in configs]

    def save_gateway_config(
        self, db: Session, data: PaymentGatewayConfigCreate
    ) -> PaymentGatewayConfigOut:
        config = self.repository.save_gateway_config(db, data)
        return PaymentGatewayConfigOut.model_validate(config)

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

    def get_payments(
        self,
        db: Session,
        business_id: int,
        provider: str | None = None,
        status_filter: PaymentStatus | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[PaymentOut]:
        payments = self.repository.get_payments(
            db,
            business_id=business_id,
            provider=provider,
            status=status_filter,
            skip=skip,
            limit=limit,
        )
        return [PaymentOut.model_validate(p) for p in payments]

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

    def get_refunds(
        self, db: Session, business_id: int, skip: int = 0, limit: int = 100
    ) -> list[RefundOut]:
        refunds = self.repository.get_refunds(
            db, business_id=business_id, skip=skip, limit=limit
        )
        return [RefundOut.model_validate(r) for r in refunds]

    def process_webhook(
        self, db: Session, provider: str, payload: PaymentWebhookPayload
    ) -> PaymentOut:
        payment = self.repository.get_payment_by_transaction_id(
            db, payload.transaction_id
        )
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transaction '{payload.transaction_id}' not found",
            )

        status_lower = payload.status.lower()
        if status_lower in ("captured", "completed", "success", "paid"):
            new_status = PaymentStatus.CAPTURED
        elif status_lower in ("failed", "cancelled", "error"):
            new_status = PaymentStatus.FAILED
        elif status_lower in ("refunded", "refund"):
            new_status = PaymentStatus.REFUNDED
            if payload.amount and payload.amount > 0:
                self.repository.create_refund(
                    db,
                    payment,
                    RefundRequest(
                        amount=payload.amount,
                        reason=payload.reason or f"{provider} webhook refund",
                    ),
                )
        else:
            new_status = PaymentStatus.PENDING

        updated = self.repository.update_payment_status(db, payment, new_status)
        return PaymentOut.model_validate(updated)

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
