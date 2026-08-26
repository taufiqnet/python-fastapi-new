from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user import Address, User, VendorStatus
from app.repositories.user_repository import UserRepository
from app.schemas.user import AddressCreate, UserCreate, VendorProfileCreate


class UserService:

    def __init__(self):
        self.repository = UserRepository()

    async def create_user(self, db: AsyncSession, data: UserCreate) -> User:
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

        user = User(
            username=data.username,
            email=data.email,
            password_hash=hash_password(data.password),
        )

        user = await self.repository.create(db, user)

        # Default role: customer
        customer_role = await self.repository.get_role_by_name(db, "customer")
        if not customer_role:
            customer_role = await self.repository.create_role(
                db, name="customer", description="Default customer role"
            )
        user = await self.repository.assign_role(db, user, customer_role)

        # Default customer profile
        if not user.customer_profile:
            await self.repository.create_customer_profile(db, user_id=user.id)
            user = await self.repository.get_by_id(db, user.id)

        return user

    async def get_user_by_username(self, db: AsyncSession, username: str) -> User | None:
        return await self.repository.get_by_username(db, username)

    async def get_user_by_id(self, db: AsyncSession, user_id: int) -> User:
        user = await self.repository.get_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
        return user

    async def get_all_users(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> list[User]:
        return await self.repository.get_all(db, skip=skip, limit=limit)

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

        # Assign vendor role if not assigned
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
