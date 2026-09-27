import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.identity.models import User
from app.database import get_async_db
from app.modules.ecommerce.orders.models import Order
from app.modules.finance.models import SalesInvoice

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/sync", tags=["Offline Sync"])


class SyncMutation(BaseModel):
    entity: str  # "orders", "invoices"
    action: str  # "CREATE", "UPDATE", "DELETE"
    client_uuid: uuid.UUID
    client_updated_at: datetime
    payload: dict[str, Any] = {}


class SyncPushRequest(BaseModel):
    mutations: list[SyncMutation] = []


class SyncResultItem(BaseModel):
    client_uuid: uuid.UUID
    server_id: str | int
    entity: str
    status: str  # "created", "updated", "deleted", "skipped"
    detail: str | None = None


class SyncPushResponse(BaseModel):
    synced: list[SyncResultItem] = []


def parse_iso_datetime(dt_str: str | None) -> datetime | None:
    if not dt_str:
        return None
    try:
        if dt_str.endswith("Z"):
            dt_str = dt_str[:-1] + "+00:00"
        return datetime.fromisoformat(dt_str)
    except Exception:
        return None


@router.post("/push", response_model=SyncPushResponse)
async def sync_push(
    data: SyncPushRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    if not current_user.can_use_offline_mode and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Offline sync feature is not enabled for this account",
        )

    results: list[SyncResultItem] = []

    for m in data.mutations:
        entity_name = m.entity.lower()
        client_dt = m.client_updated_at
        if client_dt.tzinfo is None:
            client_dt = client_dt.replace(tzinfo=timezone.utc)

        try:
            if entity_name in ("orders", "order"):
                result = await _sync_order(db, current_user, m, client_dt)
            elif entity_name in ("invoices", "invoice", "sales_invoices"):
                result = await _sync_invoice(db, current_user, m, client_dt)
            else:
                result = SyncResultItem(
                    client_uuid=m.client_uuid,
                    server_id=str(m.client_uuid),
                    entity=m.entity,
                    status="skipped",
                    detail=f"Unsupported entity type '{m.entity}'",
                )
            results.append(result)
        except Exception as e:
            logger.exception("Error syncing mutation %s", m.client_uuid)
            results.append(
                SyncResultItem(
                    client_uuid=m.client_uuid,
                    server_id=str(m.client_uuid),
                    entity=m.entity,
                    status="skipped",
                    detail=str(e),
                )
            )

    await db.commit()
    return SyncPushResponse(synced=results)


async def _sync_order(
    db: AsyncSession, current_user: User, m: SyncMutation, client_dt: datetime
) -> SyncResultItem:
    stmt = select(Order).where(Order.client_uuid == m.client_uuid)
    existing = (await db.execute(stmt)).scalar_one_or_none()

    biz_id = current_user.business_id or 1

    if existing:
        server_dt = existing.client_updated_at or existing.updated_at
        if server_dt and server_dt.tzinfo is None:
            server_dt = server_dt.replace(tzinfo=timezone.utc)

        if server_dt and server_dt > client_dt:
            return SyncResultItem(
                client_uuid=m.client_uuid,
                server_id=str(existing.id),
                entity="orders",
                status="skipped",
                detail="Server record is newer",
            )

        if m.action == "DELETE":
            existing.is_deleted = True
            existing.client_updated_at = client_dt
            return SyncResultItem(
                client_uuid=m.client_uuid,
                server_id=str(existing.id),
                entity="orders",
                status="deleted",
            )
        else:
            p = m.payload
            if "total_amount" in p:
                existing.total_amount = p["total_amount"]
            if "payment_status" in p:
                existing.payment_status = p["payment_status"]
            if "fulfillment_status" in p:
                existing.fulfillment_status = p["fulfillment_status"]
            existing.client_updated_at = client_dt
            existing.is_deleted = False
            return SyncResultItem(
                client_uuid=m.client_uuid,
                server_id=str(existing.id),
                entity="orders",
                status="updated",
            )
    else:
        if m.action == "DELETE":
            return SyncResultItem(
                client_uuid=m.client_uuid,
                server_id=str(m.client_uuid),
                entity="orders",
                status="skipped",
            )

        p = m.payload
        order_num = p.get("order_number") or f"ORD-{uuid.uuid4().hex[:8].upper()}"
        order = Order(
            id=m.client_uuid,
            business_id=biz_id,
            order_number=order_num,
            guest_email=p.get("guest_email") or (current_user.email if current_user else "offline@guest.com"),
            subtotal_amount=p.get("subtotal_amount", 0.00),
            tax_amount=p.get("tax_amount", 0.00),
            shipping_amount=p.get("shipping_amount", 0.00),
            discount_amount=p.get("discount_amount", 0.00),
            total_amount=p.get("total_amount", 0.00),
            currency=p.get("currency", "USD"),
            client_uuid=m.client_uuid,
            client_updated_at=client_dt,
            is_deleted=False,
        )
        db.add(order)
        await db.flush()
        return SyncResultItem(
            client_uuid=m.client_uuid,
            server_id=str(order.id),
            entity="orders",
            status="created",
        )


async def _sync_invoice(
    db: AsyncSession, current_user: User, m: SyncMutation, client_dt: datetime
) -> SyncResultItem:
    stmt = select(SalesInvoice).where(SalesInvoice.client_uuid == m.client_uuid)
    existing = (await db.execute(stmt)).scalar_one_or_none()

    biz_id = current_user.business_id or 1

    if existing:
        server_dt = existing.client_updated_at or existing.updated_at
        if server_dt and server_dt.tzinfo is None:
            server_dt = server_dt.replace(tzinfo=timezone.utc)

        if server_dt and server_dt > client_dt:
            return SyncResultItem(
                client_uuid=m.client_uuid,
                server_id=str(existing.id),
                entity="invoices",
                status="skipped",
                detail="Server record is newer",
            )

        if m.action == "DELETE":
            existing.is_deleted = True
            existing.client_updated_at = client_dt
            return SyncResultItem(
                client_uuid=m.client_uuid,
                server_id=str(existing.id),
                entity="invoices",
                status="deleted",
            )
        else:
            p = m.payload
            if "buyer_name" in p:
                existing.buyer_name = p["buyer_name"]
            if "total_payable" in p:
                existing.total_payable = p["total_payable"]
            if "status" in p:
                existing.status = p["status"]
            existing.client_updated_at = client_dt
            existing.is_deleted = False
            return SyncResultItem(
                client_uuid=m.client_uuid,
                server_id=str(existing.id),
                entity="invoices",
                status="updated",
            )
    else:
        if m.action == "DELETE":
            return SyncResultItem(
                client_uuid=m.client_uuid,
                server_id=str(m.client_uuid),
                entity="invoices",
                status="skipped",
            )

        p = m.payload
        inv_num = p.get("invoice_number") or f"INV-{uuid.uuid4().hex[:8].upper()}"
        issue_date_val = datetime.now(timezone.utc).date()
        if "issue_date" in p and isinstance(p["issue_date"], str):
            try:
                issue_date_val = datetime.fromisoformat(p["issue_date"]).date()
            except Exception:
                pass

        invoice = SalesInvoice(
            id=m.client_uuid,
            business_id=biz_id,
            invoice_number=inv_num,
            issue_date=issue_date_val,
            buyer_name=p.get("buyer_name", "Unknown Buyer"),
            total_payable=p.get("total_payable", 0.00),
            client_uuid=m.client_uuid,
            client_updated_at=client_dt,
            is_deleted=False,
        )
        db.add(invoice)
        await db.flush()
        return SyncResultItem(
            client_uuid=m.client_uuid,
            server_id=str(invoice.id),
            entity="invoices",
            status="created",
        )


@router.get("/pull")
async def sync_pull(
    since: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    if not current_user.can_use_offline_mode and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Offline sync feature is not enabled for this account",
        )

    since_dt = parse_iso_datetime(since)
    if not since_dt:
        since_dt = datetime(1970, 1, 1, tzinfo=timezone.utc)
    elif since_dt.tzinfo is None:
        since_dt = since_dt.replace(tzinfo=timezone.utc)

    # Pull orders for user business
    orders_stmt = select(Order).where(
        (Order.updated_at >= since_dt) | (Order.client_updated_at >= since_dt)
    )
    if current_user.business_id:
        orders_stmt = orders_stmt.where(Order.business_id == current_user.business_id)
    orders = (await db.execute(orders_stmt)).scalars().all()

    # Pull invoices for user business
    invoices_stmt = select(SalesInvoice).where(
        (SalesInvoice.updated_at >= since_dt) | (SalesInvoice.client_updated_at >= since_dt)
    )
    if current_user.business_id:
        invoices_stmt = invoices_stmt.where(SalesInvoice.business_id == current_user.business_id)
    invoices = (await db.execute(invoices_stmt)).scalars().all()

    now_iso = datetime.now(timezone.utc).isoformat()

    return {
        "timestamp": now_iso,
        "changes": {
            "orders": [
                {
                    "id": str(o.id),
                    "order_number": o.order_number,
                    "total_amount": float(o.total_amount or 0),
                    "payment_status": o.payment_status,
                    "fulfillment_status": o.fulfillment_status,
                    "client_uuid": str(o.client_uuid) if o.client_uuid else None,
                    "client_updated_at": o.client_updated_at.isoformat() if o.client_updated_at else None,
                    "updated_at": o.updated_at.isoformat() if o.updated_at else None,
                    "is_deleted": o.is_deleted,
                }
                for o in orders
            ],
            "invoices": [
                {
                    "id": str(inv.id),
                    "invoice_number": inv.invoice_number,
                    "buyer_name": inv.buyer_name,
                    "total_payable": float(inv.total_payable or 0),
                    "status": inv.status,
                    "client_uuid": str(inv.client_uuid) if inv.client_uuid else None,
                    "client_updated_at": inv.client_updated_at.isoformat() if inv.client_updated_at else None,
                    "updated_at": inv.updated_at.isoformat() if inv.updated_at else None,
                    "is_deleted": inv.is_deleted,
                }
                for inv in invoices
            ],
        },
    }
