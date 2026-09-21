import uuid
from decimal import Decimal

from sqlalchemy.orm import Session

from app.modules.ecommerce.payments.models import (
    Payment,
    PaymentGatewayConfig,
    PaymentMethod,
    PaymentStatus,
    Refund,
)
from app.modules.ecommerce.payments.schemas import (
    PaymentGatewayConfigCreate,
    PaymentIntentCreate,
    PaymentMethodCreate,
    RefundRequest,
)


class PaymentRepository:
    def get_gateway_configs(
        self, db: Session, business_id: int
    ) -> list[PaymentGatewayConfig]:
        return (
            db.query(PaymentGatewayConfig)
            .filter(PaymentGatewayConfig.business_id == business_id)
            .all()
        )

    def get_gateway_config(
        self, db: Session, business_id: int, provider: str
    ) -> PaymentGatewayConfig | None:
        return (
            db.query(PaymentGatewayConfig)
            .filter(
                PaymentGatewayConfig.business_id == business_id,
                PaymentGatewayConfig.provider == provider,
            )
            .first()
        )

    def save_gateway_config(
        self, db: Session, data: PaymentGatewayConfigCreate
    ) -> PaymentGatewayConfig:
        config = self.get_gateway_config(db, data.business_id, data.provider)
        if not config:
            config = PaymentGatewayConfig(
                business_id=data.business_id,
                provider=data.provider,
                is_enabled=data.is_enabled,
                merchant_id=data.merchant_id,
                api_key=data.api_key,
                api_secret=data.api_secret,
                mode=data.mode,
                currency=data.currency,
            )
            db.add(config)
        else:
            config.is_enabled = data.is_enabled
            config.merchant_id = data.merchant_id
            config.api_key = data.api_key
            config.api_secret = data.api_secret
            config.mode = data.mode
            config.currency = data.currency

        db.commit()
        db.refresh(config)
        return config

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

    def get_payment_by_transaction_id(
        self, db: Session, transaction_id: str
    ) -> Payment | None:
        return (
            db.query(Payment)
            .filter(Payment.transaction_id == transaction_id)
            .first()
        )

    def get_payments(
        self,
        db: Session,
        business_id: int,
        provider: str | None = None,
        status: PaymentStatus | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Payment]:
        query = db.query(Payment).filter(Payment.business_id == business_id)
        if provider:
            query = query.filter(Payment.provider == provider)
        if status:
            query = query.filter(Payment.status == status)
        return query.order_by(Payment.created_at.desc()).offset(skip).limit(limit).all()

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

    def get_refunds(
        self, db: Session, business_id: int, skip: int = 0, limit: int = 100
    ) -> list[Refund]:
        return (
            db.query(Refund)
            .join(Payment, Refund.payment_id == Payment.id)
            .filter(Payment.business_id == business_id)
            .order_by(Refund.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

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
