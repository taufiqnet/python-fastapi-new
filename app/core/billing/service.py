from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.billing.models import SubscriptionPlan
from app.core.billing.repository import SubscriptionPlanRepository
from app.core.billing.schemas import SubscriptionPlanCreate, SubscriptionPlanUpdate


class SubscriptionPlanService:
    def __init__(self, plan_repo: SubscriptionPlanRepository | None = None):
        self.plan_repo = plan_repo or SubscriptionPlanRepository()

    async def list_plans(self, db: AsyncSession) -> list[SubscriptionPlan]:
        return await self.plan_repo.list_all(db)

    async def get_plan(self, db: AsyncSession, plan_id: int) -> SubscriptionPlan:
        plan = await self.plan_repo.get_by_id(db, plan_id)
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subscription plan with ID {plan_id} not found",
            )
        return plan

    async def create_plan(
        self, db: AsyncSession, data: SubscriptionPlanCreate
    ) -> SubscriptionPlan:
        existing = await self.plan_repo.get_by_name(db, data.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Subscription plan with name '{data.name}' already exists",
            )
        return await self.plan_repo.create(
            db,
            name=data.name,
            description=data.description,
            is_active=data.is_active,
            permission_ids=data.permission_ids,
        )

    async def update_plan(
        self, db: AsyncSession, plan_id: int, data: SubscriptionPlanUpdate
    ) -> SubscriptionPlan:
        plan = await self.get_plan(db, plan_id)
        if data.name and data.name != plan.name:
            existing = await self.plan_repo.get_by_name(db, data.name)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Subscription plan with name '{data.name}' already exists",
                )
        return await self.plan_repo.update(
            db,
            plan,
            name=data.name,
            description=data.description,
            is_active=data.is_active,
            permission_ids=data.permission_ids,
        )

    async def delete_plan(self, db: AsyncSession, plan_id: int) -> bool:
        plan = await self.get_plan(db, plan_id)
        return await self.plan_repo.delete(db, plan.id)
