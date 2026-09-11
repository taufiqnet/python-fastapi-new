from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.identity.models import Address, User, VendorStatus
from app.core.identity.repository import UserRepository
from app.core.identity.schemas import (
    AddressCreate,
    RoleCreate,
    UserCreate,
    UserUpdate,
    VendorProfileCreate,
)


class UserService:

    def __init__(self):
        self.repository = UserRepository()

    async def create_user(self, db: AsyncSession, data: UserCreate) -> User:
        from app.core.security import hash_password
        from app.core.tenancy.models import BusinessProfile
        from app.core.billing.models import SubscriptionPlan
        from sqlalchemy import select

        if await self.repository.get_by_username(db, data.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )

        if await self.repository.get_by_email(db, data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists",
            )

        business_id = data.business_id
        is_company_owner = False

        if not business_id and data.company_name and data.company_name.strip():
            res_plan = await db.execute(
                select(SubscriptionPlan).where(SubscriptionPlan.name.in_(["Free", "Basic"]))
            )
            free_plan = res_plan.scalars().first()

            new_business = BusinessProfile(
                name_en=data.company_name.strip(),
                subscription_plan_id=free_plan.id if free_plan else None,
            )
            db.add(new_business)
            await db.flush()
            business_id = new_business.id
            is_company_owner = True

        user = User(
            username=data.username,
            email=data.email,
            password_hash=hash_password(data.password),
            phone=data.phone,
            business_id=business_id,
        )

        user = await self.repository.create(db, user)

        if is_company_owner:
            admin_role = await self.repository.get_role_by_name(db, "admin")
            if not admin_role:
                admin_role = await self.repository.create_role(
                    db, name="admin", description="Admin role"
                )
            user = await self.repository.assign_role(db, user, admin_role)
        else:
            customer_role = await self.repository.get_role_by_name(db, "customer")
            if not customer_role:
                customer_role = await self.repository.create_role(
                    db, name="customer", description="Default customer role"
                )
            user = await self.repository.assign_role(db, user, customer_role)

        if not user.customer_profile:
            await self.repository.create_customer_profile(db, user_id=user.id)
            user = await self.repository.get_by_id(db, user.id)

        return user

    async def get_user_by_username(self, db: AsyncSession, username: str) -> User | None:
        return await self.repository.get_by_username(db, username)

    async def get_user_by_email(self, db: AsyncSession, email: str) -> User | None:
        return await self.repository.get_by_email(db, email)

    async def get_user_by_username_or_email(
        self, db: AsyncSession, identifier: str
    ) -> User | None:
        return await self.repository.get_by_username_or_email(db, identifier)

    async def get_user_by_id(self, db: AsyncSession, user_id: int) -> User:
        user = await self.repository.get_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
        return user

    async def get_all_users(
        self, db: AsyncSession, business_id: int | None = None, skip: int = 0, limit: int = 100
    ) -> list[User]:
        return await self.repository.get_all(db, business_id=business_id, skip=skip, limit=limit)

    async def update_user(
        self, db: AsyncSession, user_id: int, data: UserUpdate
    ) -> User:
        from app.core.security import hash_password

        user = await self.get_user_by_id(db, user_id)

        if data.username and data.username != user.username:
            existing = await self.repository.get_by_username(db, data.username)
            if existing and existing.id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken",
                )
            user.username = data.username

        if data.email and data.email != user.email:
            existing = await self.repository.get_by_email(db, data.email)
            if existing and existing.id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already taken",
                )
            user.email = data.email

        if data.password:
            user.password_hash = hash_password(data.password)

        if data.phone is not None:
            user.phone = data.phone

        if data.business_id is not None:
            user.business_id = data.business_id

        if data.is_active is not None:
            user.is_active = data.is_active

        if data.is_superuser is not None:
            user.is_superuser = data.is_superuser

        if data.role_ids is not None:
            roles = []
            for r_id in data.role_ids:
                r = await self.repository.get_role_by_id(db, r_id)
                if r:
                    roles.append(r)
            user.roles = roles

        if data.permission_ids is not None:
            permissions = await self.repository.get_permissions_by_ids(
                db, data.permission_ids
            )
            user.direct_permissions = permissions

        return await self.repository.update(db, user)

    async def delete_user(self, db: AsyncSession, user_id: int) -> None:
        user = await self.get_user_by_id(db, user_id)
        if user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="System Admin user cannot be deleted",
            )
        await self.repository.delete(db, user)

    # ---------------------------------------------------------------------------
    # Roles & Permissions
    # ---------------------------------------------------------------------------

    async def get_all_permissions(self, db: AsyncSession):
        return await self.repository.get_permissions(db)

    async def get_roles(self, db: AsyncSession, business_id: int | None = None):
        return await self.repository.get_roles(db, business_id=business_id)

    async def get_role_by_id(self, db: AsyncSession, role_id: int):
        role = await self.repository.get_role_by_id(db, role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Role not found"
            )
        return role

    async def create_role(self, db: AsyncSession, data: RoleCreate):
        permissions = await self.repository.get_permissions_by_ids(
            db, data.permission_ids
        )
        return await self.repository.create_role(
            db,
            name=data.name,
            description=data.description,
            business_id=data.business_id,
            permissions=permissions,
        )

    async def update_role(
        self,
        db: AsyncSession,
        role_id: int,
        name: str | None = None,
        description: str | None = None,
        permission_ids: list[int] | None = None,
    ):
        role = await self.get_role_by_id(db, role_id)
        permissions = None
        if permission_ids is not None:
            permissions = await self.repository.get_permissions_by_ids(
                db, permission_ids
            )

        return await self.repository.update_role(
            db,
            role,
            name=name,
            description=description,
            permissions=permissions,
        )

    async def delete_role(self, db: AsyncSession, role_id: int):
        role = await self.get_role_by_id(db, role_id)
        await self.repository.delete_role(db, role)

    async def assign_role_to_user(
        self, db: AsyncSession, user_id: int, role_name: str
    ) -> User:
        user = await self.get_user_by_id(db, user_id)
        role = await self.repository.get_role_by_name(db, role_name)
        if not role:
            role = await self.repository.create_role(db, name=role_name)
        return await self.repository.assign_role(db, user, role)

    async def remove_role_from_user(
        self, db: AsyncSession, user_id: int, role_name: str
    ) -> User:
        user = await self.get_user_by_id(db, user_id)
        role = await self.repository.get_role_by_name(db, role_name)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Role not found"
            )
        return await self.repository.remove_role(db, user, role)

    async def create_customer_profile(
        self, db: AsyncSession, user_id: int, date_of_birth: date | None = None
    ):
        user = await self.get_user_by_id(db, user_id)
        if user.customer_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Customer profile already exists",
            )
        profile = await self.repository.create_customer_profile(
            db, user_id=user_id, date_of_birth=date_of_birth
        )
        return profile

    async def create_vendor_profile(
        self, db: AsyncSession, user_id: int, data: VendorProfileCreate
    ):
        user = await self.get_user_by_id(db, user_id)
        if user.vendor_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vendor profile already exists",
            )
        profile = await self.repository.create_vendor_profile(
            db, user_id=user_id, business_profile_id=data.business_profile_id
        )

        vendor_role = await self.repository.get_role_by_name(db, "vendor")
        if not vendor_role:
            vendor_role = await self.repository.create_role(
                db, name="vendor", description="Vendor role"
            )
        await self.repository.assign_role(db, user, vendor_role)

        return profile

    async def update_vendor_status(
        self, db: AsyncSession, user_id: int, status_val: VendorStatus
    ):
        user = await self.get_user_by_id(db, user_id)
        if not user.vendor_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor profile not found",
            )
        return await self.repository.update_vendor_status(
            db, user.vendor_profile, status_val
        )

    async def add_address(
        self, db: AsyncSession, user_id: int, address_data: AddressCreate
    ) -> Address:
        await self.get_user_by_id(db, user_id)
        address = Address(user_id=user_id, **address_data.model_dump())
        return await self.repository.add_address(db, address)

    async def delete_address(
        self, db: AsyncSession, user_id: int, address_id: int
    ) -> None:
        user = await self.get_user_by_id(db, user_id)
        address = next((a for a in user.addresses if a.id == address_id), None)
        if not address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Address not found"
            )
        await self.repository.delete_address(db, address)
