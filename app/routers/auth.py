from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.security import create_access_token, verify_password
from app.database import get_async_db
from app.core.identity.models import User
from app.core.identity.schemas import (
    AddressCreate,
    AddressResponse,
    Token,
    UserCreate,
    UserResponse,
    VendorProfileCreate,
    VendorProfileResponse,
)
from app.core.identity.service import UserService

router = APIRouter(prefix="/auth", tags=["Authentication"])

service = UserService()


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(data: UserCreate, db: AsyncSession = Depends(get_async_db)):
    return await service.create_user(db, data)


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_async_db),
):
    user = await service.get_user_by_username(db, form_data.username)

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    token = create_access_token({"sub": str(user.id)})

    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/me/vendor-profile", response_model=VendorProfileResponse, status_code=201)
async def create_vendor_profile(
    data: VendorProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    return await service.create_vendor_profile(db, current_user.id, data)


@router.post("/me/addresses", response_model=AddressResponse, status_code=201)
async def add_address(
    data: AddressCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    return await service.add_address(db, current_user.id, data)


@router.delete("/me/addresses/{address_id}", status_code=204)
async def delete_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    await service.delete_address(db, current_user.id, address_id)
