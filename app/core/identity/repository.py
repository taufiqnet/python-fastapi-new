from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.identity.models import (
    Address,
    CustomerProfile,
    Role,
    User,
    VendorProfile,
    VendorStatus,
)


class UserRepository:

    async def get_by_username(self, db: AsyncSession, username: str) -> User | None:
        db.expire_all()
        result = await db.execute(
            select(User)
            .options(
                selectinload(User.roles),
                selectinload(User.customer_profile),
                selectinload(User.vendor_profile),
                selectinload(User.addresses),
            )
            .filter(User.username == username)
        )
        return result.scalars().first()

    async def get_by_email(self, db: AsyncSession, email: str) -> User | None:
        db.expire_all()
        result = await db.execute(
            select(User)
            .options(
                selectinload(User.roles),
                selectinload(User.customer_profile),
                selectinload(User.vendor_profile),
                selectinload(User.addresses),
            )
            .filter(User.email == email)
        )
        return result.scalars().first()

    async def get_by_id(self, db: AsyncSession, user_id: int) -> User | None:
        db.expire_all()
        result = await db.execute(
            select(User)
            .options(
                selectinload(User.roles),
                selectinload(User.customer_profile),
                selectinload(User.vendor_profile),
                selectinload(User.addresses),
            )
            .filter(User.id == user_id)
        )
        return result.scalars().first()

    async def get_all(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> list[User]:
        db.expire_all()
        result = await db.execute(
            select(User)
            .options(
                selectinload(User.roles),
                selectinload(User.customer_profile),
                selectinload(User.vendor_profile),
                selectinload(User.addresses),
            )
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def create(self, db: AsyncSession, user: User) -> User:
        db.add(user)
        await db.commit()
        return await self.get_by_id(db, user.id)  # type: ignore

    async def get_role_by_name(self, db: AsyncSession, name: str) -> Role | None:
        result = await db.execute(select(Role).filter(Role.name == name))
        return result.scalars().first()

    async def create_role(self, db: AsyncSession, name: str, description: str | None = None) -> Role:
        role = Role(name=name, description=description)
        db.add(role)
        await db.commit()
        await db.refresh(role)
        return role

    async def assign_role(self, db: AsyncSession, user: User, role: Role) -> User:
        if role not in user.roles:
            user.roles.append(role)
            db.add(user)
            await db.commit()
            await db.refresh(user)
        return await self.get_by_id(db, user.id)  # type: ignore

    async def remove_role(self, db: AsyncSession, user: User, role: Role) -> User:
        if role in user.roles:
            user.roles.remove(role)
            db.add(user)
            await db.commit()
            await db.refresh(user)
        return await self.get_by_id(db, user.id)  # type: ignore

    async def create_customer_profile(
        self, db: AsyncSession, user_id: int, date_of_birth=None
    ) -> CustomerProfile:
        profile = CustomerProfile(user_id=user_id, date_of_birth=date_of_birth)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
        return profile

    async def create_vendor_profile(
        self, db: AsyncSession, user_id: int, business_profile_id: int
    ) -> VendorProfile:
        profile = VendorProfile(
            user_id=user_id,
            business_profile_id=business_profile_id,
            status=VendorStatus.PENDING,
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
        return profile

    async def update_vendor_status(
        self, db: AsyncSession, vendor_profile: VendorProfile, status: VendorStatus
    ) -> VendorProfile:
        vendor_profile.status = status
        db.add(vendor_profile)
        await db.commit()
        await db.refresh(vendor_profile)
        return vendor_profile

    async def add_address(self, db: AsyncSession, address: Address) -> Address:
        db.add(address)
        await db.commit()
        await db.refresh(address)
        return address

    async def delete_address(self, db: AsyncSession, address: Address) -> None:
        await db.delete(address)
        await db.commit()
