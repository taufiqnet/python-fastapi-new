import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.database import get_db
from app.modules.ecommerce.payments.models import PaymentStatus
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
from app.modules.ecommerce.payments.service import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments"])
service = PaymentService()


@router.get("/gateways/config", response_model=list[PaymentGatewayConfigOut])
def get_gateway_configs(
    business_id: int = Query(1),
    current_user: User = Depends(require_permission("ecommerce", "orders", "view")),
    db: Session = Depends(get_db),
):
    return service.get_gateway_configs(db, business_id=business_id)


@router.post("/gateways/config", response_model=PaymentGatewayConfigOut)
def save_gateway_config(
    data: PaymentGatewayConfigCreate,
    current_user: User = Depends(require_permission("ecommerce", "orders", "update")),
    db: Session = Depends(get_db),
):
    return service.save_gateway_config(db, data)


@router.get("", response_model=list[PaymentOut])
def get_payments(
    business_id: int = Query(1),
    provider: str | None = Query(None),
    status_filter: PaymentStatus | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_permission("ecommerce", "orders", "view")),
    db: Session = Depends(get_db),
):
    return service.get_payments(
        db,
        business_id=business_id,
        provider=provider,
        status_filter=status_filter,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def create_payment_intent(
    data: PaymentIntentCreate,
    current_user: User = Depends(require_permission("ecommerce", "orders", "create")),
    db: Session = Depends(get_db),
):
    return service.create_payment_intent(db, data)


@router.get("/refunds", response_model=list[RefundOut])
def get_refunds(
    business_id: int = Query(1),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_permission("ecommerce", "orders", "view")),
    db: Session = Depends(get_db),
):
    return service.get_refunds(db, business_id=business_id, skip=skip, limit=limit)


@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(
    payment_id: uuid.UUID,
    business_id: int = Query(1),
    current_user: User = Depends(require_permission("ecommerce", "orders", "view")),
    db: Session = Depends(get_db),
):
    return service.get_payment(db, payment_id=payment_id, business_id=business_id)


@router.post("/{payment_id}/capture", response_model=PaymentOut)
def capture_payment(
    payment_id: uuid.UUID,
    business_id: int = Query(1),
    current_user: User = Depends(require_permission("ecommerce", "orders", "update")),
    db: Session = Depends(get_db),
):
    return service.capture_payment(db, payment_id=payment_id, business_id=business_id)


@router.post("/{payment_id}/refund", response_model=RefundOut)
def refund_payment(
    payment_id: uuid.UUID,
    req: RefundRequest,
    business_id: int = Query(1),
    current_user: User = Depends(require_permission("ecommerce", "orders", "update")),
    db: Session = Depends(get_db),
):
    return service.refund_payment(
        db, payment_id=payment_id, req=req, business_id=business_id
    )


@router.post("/webhook/{provider}", response_model=PaymentOut)
def process_webhook(
    provider: str,
    payload: PaymentWebhookPayload,
    db: Session = Depends(get_db),
):
    return service.process_webhook(db, provider=provider, payload=payload)


@router.post(
    "/methods", response_model=PaymentMethodOut, status_code=status.HTTP_201_CREATED
)
def create_payment_method(
    data: PaymentMethodCreate,
    current_user: User = Depends(require_permission("ecommerce", "orders", "create")),
    db: Session = Depends(get_db),
):
    return service.create_payment_method(db, data)


@router.get("/methods", response_model=list[PaymentMethodOut])
def get_payment_methods(
    user_id: uuid.UUID = Query(...),
    business_id: int = Query(1),
    current_user: User = Depends(require_permission("ecommerce", "orders", "view")),
    db: Session = Depends(get_db),
):
    return service.get_payment_methods(db, user_id=user_id, business_id=business_id)
