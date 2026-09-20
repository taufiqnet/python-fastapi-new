import os
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.identity.models import User
from app.core.tenancy.schemas import BusinessProfileCreate, BusinessProfileResponse
from app.core.tenancy.service import BusinessService
from app.database import get_db

router = APIRouter(prefix="/business", tags=["Business Profile"])

service = BusinessService()

ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".svg"}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB limit


@router.post("/my-profile/logo", response_model=BusinessProfileResponse)
async def upload_my_business_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with any business profile",
        )

    business = service.get_business(db, current_user.business_id)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 2MB limit",
        )

    upload_dir = "app/static/uploads/logos"
    os.makedirs(upload_dir, exist_ok=True)

    filename = f"tenant_{business.id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(upload_dir, filename)

    # Remove old logo if exists on disk
    if business.logo and business.logo.startswith("/static/uploads/logos/"):
        old_filename = os.path.basename(business.logo)
        old_filepath = os.path.join(upload_dir, old_filename)
        if os.path.exists(old_filepath):
            try:
                os.remove(old_filepath)
            except OSError:
                pass

    with open(filepath, "wb") as f:
        f.write(contents)

    logo_url = f"/static/uploads/logos/{filename}"
    business.logo = logo_url
    db.commit()
    db.refresh(business)

    return business


@router.delete("/my-profile/logo", response_model=BusinessProfileResponse)
def remove_my_business_logo(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with any business profile",
        )

    business = service.get_business(db, current_user.business_id)

    if business.logo and business.logo.startswith("/static/uploads/logos/"):
        upload_dir = "app/static/uploads/logos"
        filename = os.path.basename(business.logo)
        filepath = os.path.join(upload_dir, filename)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except OSError:
                pass

    business.logo = None
    db.commit()
    db.refresh(business)

    return business


@router.post("/", response_model=BusinessProfileResponse, status_code=201)
def create_business(data: BusinessProfileCreate, db: Session = Depends(get_db)):
    return service.create_business(db, data)


@router.get("/{business_id}", response_model=BusinessProfileResponse)
def get_business(business_id: int, db: Session = Depends(get_db)):
    return service.get_business(db, business_id)


@router.get("/", response_model=list[BusinessProfileResponse])
def list_businesses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return service.list_businesses(db, skip, limit)


@router.put("/{business_id}", response_model=BusinessProfileResponse)
def update_business(
    business_id: int, data: BusinessProfileCreate, db: Session = Depends(get_db)
):
    return service.update_business(db, business_id, data)


@router.delete("/{business_id}", status_code=204)
def delete_business(business_id: int, db: Session = Depends(get_db)):
    service.delete_business(db, business_id)
