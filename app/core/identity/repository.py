from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.identity.models import (
    Address,
    CustomerProfile,
    Permission,
    Role,
    User,
    VendorProfile,
    VendorStatus,
)


class UserRepository:
    def _get_user_id(self, user_or_id: User | int) -> int:
        if isinstance(user_or_id, int):
            return user_or_id
        if "id" in user_or_id.__dict__:
            return user_or_id.__dict__["id"]
        return user_or_id.id

    async def get_by_username(self, db: AsyncSession, username: str) -> User | None:
        result = await db.execute(
            select(User)
            .options(
                selectinload(User.roles).selectinload(Role.permissions),
                selectinload(User.direct_permissions),
                selectinload(User.customer_profile),
                selectinload(User.vendor_profile),
                selectinload(User.addresses),
                selectinload(User.business_profile),
            )
            .execution_options(populate_existing=True)
            .filter(User.username == username)
        )
        return result.scalars().first()

    async def get_by_email(self, db: AsyncSession, email: str) -> User | None:
        result = await db.execute(
            select(User)
            .options(
                selectinload(User.roles).selectinload(Role.permissions),
                selectinload(User.direct_permissions),
                selectinload(User.customer_profile),
                selectinload(User.vendor_profile),
                selectinload(User.addresses),
                selectinload(User.business_profile),
            )
            .execution_options(populate_existing=True)
            .filter(User.email == email)
        )
        return result.scalars().first()

    async def get_by_username_or_email(
        self, db: AsyncSession, identifier: str
    ) -> User | None:
        result = await db.execute(
            select(User)
            .options(
                selectinload(User.roles).selectinload(Role.permissions),
                selectinload(User.direct_permissions),
                selectinload(User.customer_profile),
                selectinload(User.vendor_profile),
                selectinload(User.addresses),
                selectinload(User.business_profile),
            )
            .execution_options(populate_existing=True)
            .filter((User.username == identifier) | (User.email == identifier))
        )
        return result.scalars().first()

    async def get_by_id(self, db: AsyncSession, user_id: int) -> User | None:
        result = await db.execute(
            select(User)
            .options(
                selectinload(User.roles).selectinload(Role.permissions),
                selectinload(User.direct_permissions),
                selectinload(User.customer_profile),
                selectinload(User.vendor_profile),
                selectinload(User.addresses),
                selectinload(User.business_profile),
            )
            .execution_options(populate_existing=True)
            .filter(User.id == user_id)
        )
        return result.scalars().first()

    async def get_all(
        self,
        db: AsyncSession,
        business_id: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[User]:
        query = (
            select(User)
            .options(
                selectinload(User.roles).selectinload(Role.permissions),
                selectinload(User.direct_permissions),
                selectinload(User.customer_profile),
                selectinload(User.vendor_profile),
                selectinload(User.addresses),
                selectinload(User.business_profile),
            )
            .execution_options(populate_existing=True)
        )
        if business_id is not None:
            query = query.filter(User.business_id == business_id)

        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def create(self, db: AsyncSession, user: User) -> User:
        db.add(user)
        await db.flush()
        user_id = user.id
        await db.commit()
        return await self.get_by_id(db, user_id)  # type: ignore

    async def update(self, db: AsyncSession, user: User) -> User:
        db.add(user)
        await db.flush()
        user_id = user.id
        await db.commit()
        return await self.get_by_id(db, user_id)  # type: ignore

    async def delete(self, db: AsyncSession, user: User) -> None:
        await db.delete(user)
        await db.commit()

    async def get_role_by_name(
        self, db: AsyncSession, name: str, business_id: int | None = None
    ) -> Role | None:
        query = (
            select(Role)
            .options(selectinload(Role.permissions))
            .execution_options(populate_existing=True)
            .filter(Role.name == name)
        )
        if business_id is not None:
            query = query.filter(
                (Role.business_id == business_id) | (Role.business_id.is_(None))
            )
        result = await db.execute(query)
        return result.scalars().first()

    async def get_role_by_id(self, db: AsyncSession, role_id: int) -> Role | None:
        result = await db.execute(
            select(Role)
            .options(selectinload(Role.permissions))
            .execution_options(populate_existing=True)
            .filter(Role.id == role_id)
        )
        return result.scalars().first()

    async def get_roles(
        self, db: AsyncSession, business_id: int | None = None
    ) -> list[Role]:
        query = (
            select(Role)
            .options(selectinload(Role.permissions))
            .execution_options(populate_existing=True)
        )
        if business_id is not None:
            query = query.filter(
                (Role.business_id == business_id) | (Role.business_id.is_(None))
            )
        result = await db.execute(query)
        return list(result.scalars().all())

    async def create_role(
        self,
        db: AsyncSession,
        name: str,
        description: str | None = None,
        business_id: int | None = None,
        permissions: list[Permission] | None = None,
    ) -> Role:
        role = Role(name=name, description=description, business_id=business_id)
        if permissions:
            role.permissions = permissions
        db.add(role)
        await db.flush()
        role_id = role.id
        await db.commit()
        return await self.get_role_by_id(db, role_id)  # type: ignore

    async def update_role(
        self,
        db: AsyncSession,
        role: Role,
        name: str | None = None,
        description: str | None = None,
        permissions: list[Permission] | None = None,
    ) -> Role:
        if name is not None:
            role.name = name
        if description is not None:
            role.description = description
        if permissions is not None:
            role.permissions = permissions
        db.add(role)
        await db.flush()
        role_id = role.id
        await db.commit()
        return await self.get_role_by_id(db, role_id)  # type: ignore

    async def delete_role(self, db: AsyncSession, role: Role) -> None:
        await db.delete(role)
        await db.commit()

    async def assign_role(
        self, db: AsyncSession, user_or_id: User | int, role: Role
    ) -> User:
        uid = self._get_user_id(user_or_id)
        user = await self.get_by_id(db, uid)
        if user and not any(r.id == role.id for r in user.roles):
            user.roles.append(role)
            db.add(user)
            await db.commit()
            user = await self.get_by_id(db, uid)
        return user  # type: ignore

    async def remove_role(
        self, db: AsyncSession, user_or_id: User | int, role: Role
    ) -> User:
        uid = self._get_user_id(user_or_id)
        user = await self.get_by_id(db, uid)
        if user:
            user.roles = [r for r in user.roles if r.id != role.id]
            db.add(user)
            await db.commit()
            user = await self.get_by_id(db, uid)
        return user  # type: ignore

    async def get_permissions(self, db: AsyncSession) -> list[Permission]:
        result = await db.execute(select(Permission))
        return list(result.scalars().all())

    async def get_permissions_by_ids(
        self, db: AsyncSession, permission_ids: list[int]
    ) -> list[Permission]:
        if not permission_ids:
            return []
        result = await db.execute(
            select(Permission).filter(Permission.id.in_(permission_ids))
        )
        return list(result.scalars().all())

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
