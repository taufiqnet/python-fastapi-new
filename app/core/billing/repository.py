from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.billing.models import PlanPermission, SubscriptionPlan
from app.core.identity.models import Permission


class SubscriptionPlanRepository:
    async def get_by_id(
        self, db: AsyncSession, plan_id: int
    ) -> SubscriptionPlan | None:
        stmt = (
            select(SubscriptionPlan)
            .where(SubscriptionPlan.id == plan_id)
            .options(selectinload(SubscriptionPlan.permissions))
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_name(
        self, db: AsyncSession, name: str
    ) -> SubscriptionPlan | None:
        stmt = (
            select(SubscriptionPlan)
            .where(SubscriptionPlan.name == name)
            .options(selectinload(SubscriptionPlan.permissions))
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def list_all(self, db: AsyncSession) -> list[SubscriptionPlan]:
        stmt = (
            select(SubscriptionPlan)
            .order_by(SubscriptionPlan.id.asc())
            .options(selectinload(SubscriptionPlan.permissions))
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def create(
        self,
        db: AsyncSession,
        name: str,
        description: str | None = None,
        is_active: bool = True,
        permission_ids: list[int] | None = None,
    ) -> SubscriptionPlan:
        plan = SubscriptionPlan(
            name=name,
            description=description,
            is_active=is_active,
        )
        db.add(plan)
        await db.flush()

        if permission_ids:
            for pid in permission_ids:
                db.add(PlanPermission(plan_id=plan.id, permission_id=pid))
            await db.flush()

        await db.commit()
        return await self.get_by_id(db, plan.id)  # type: ignore

    async def update(
        self,
        db: AsyncSession,
        plan: SubscriptionPlan,
        name: str | None = None,
        description: str | None = None,
        is_active: bool | None = None,
        permission_ids: list[int] | None = None,
    ) -> SubscriptionPlan:
        if name is not None:
            plan.name = name
        if description is not None:
            plan.description = description
        if is_active is not None:
            plan.is_active = is_active

        if permission_ids is not None:
            plan.permissions.clear()
            await db.flush()
            if permission_ids:
                res = await db.execute(
                    select(Permission).where(Permission.id.in_(permission_ids))
                )
                plan.permissions = list(res.scalars().all())

        await db.flush()
        await db.commit()
        return await self.get_by_id(db, plan.id)  # type: ignore

    async def delete(self, db: AsyncSession, plan_id: int) -> bool:
        plan = await self.get_by_id(db, plan_id)
        if not plan:
            return False
        plan.permissions.clear()
        await db.delete(plan)
        await db.flush()
        return True
