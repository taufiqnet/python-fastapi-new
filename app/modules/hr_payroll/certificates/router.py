import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.hr_payroll.certificates.schemas import (
    SalaryCertificateCreate,
    SalaryCertificateOut,
    SalaryCertificateUpdate,
)
from app.modules.hr_payroll.certificates.service import SalaryCertificateService

router = APIRouter(prefix="/salary-certificates", tags=["Salary Certificates"])
service = SalaryCertificateService()


@router.get("", response_model=list[SalaryCertificateOut])
def get_salary_certificates(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    employee_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.get_certificates(
        db, skip=skip, limit=limit, business_id=business_id, employee_id=employee_id
    )


@router.get("/{cert_id}", response_model=SalaryCertificateOut)
def get_salary_certificate(cert_id: uuid.UUID, db: Session = Depends(get_db)):
    return service.get_certificate(db, cert_id)


@router.post(
    "",
    response_model=SalaryCertificateOut,
    status_code=status.HTTP_201_CREATED,
)
def create_salary_certificate(
    cert_data: SalaryCertificateCreate, db: Session = Depends(get_db)
):
    return service.create_certificate(db, cert_data)


@router.put("/{cert_id}", response_model=SalaryCertificateOut)
def update_salary_certificate(
    cert_id: uuid.UUID,
    cert_data: SalaryCertificateUpdate,
    db: Session = Depends(get_db),
):
    return service.update_certificate(db, cert_id, cert_data)


@router.delete("/{cert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_salary_certificate(cert_id: uuid.UUID, db: Session = Depends(get_db)):
    service.delete_certificate(db, cert_id)
    return None
