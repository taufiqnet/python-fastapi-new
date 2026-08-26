from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.business import BusinessProfileCreate, BusinessProfileResponse
from app.services.business_service import BusinessService

router = APIRouter(prefix="/business", tags=["Business Profile"])

service = BusinessService()


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
def update_business(business_id: int, data: BusinessProfileCreate, db: Session = Depends(get_db)):
    return service.update_business(db, business_id, data)


@router.delete("/{business_id}", status_code=204)
def delete_business(business_id: int, db: Session = Depends(get_db)):
    service.delete_business(db, business_id)