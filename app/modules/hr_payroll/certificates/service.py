import datetime
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.hr_payroll.certificates.models import (
    CertificateStatusEnum,
    SalaryCertificate,
)
from app.modules.hr_payroll.certificates.repository import SalaryCertificateRepository
from app.modules.hr_payroll.certificates.schemas import (
    SalaryCertificateCreate,
    SalaryCertificateUpdate,
)
from app.modules.hr_payroll.compensation.models import EmployeeSalary
from app.modules.hr_payroll.employees.models import Employee


class SalaryCertificateService:
    def __init__(self, repo: SalaryCertificateRepository | None = None):
        self.repo = repo or SalaryCertificateRepository()

    def _generate_certificate_no(self, db: Session, business_id: int) -> str:
        count = self.repo.count_by_business(db, business_id) + 1
        year = datetime.date.today().year
        return f"SC-{year}-{count:04d}"

    def get_certificates(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        employee_id: uuid.UUID | None = None,
    ) -> list[SalaryCertificate]:
        return self.repo.get_all(
            db, skip=skip, limit=limit, business_id=business_id, employee_id=employee_id
        )

    def get_certificate(self, db: Session, cert_id: uuid.UUID) -> SalaryCertificate:
        cert = self.repo.get_by_id(db, cert_id)
        if not cert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Salary certificate with ID '{cert_id}' not found.",
            )
        return cert

    def create_certificate(
        self, db: Session, cert_in: SalaryCertificateCreate
    ) -> SalaryCertificate:
        employee = db.get(Employee, cert_in.employee_id)
        if not employee or employee.business_id != cert_in.business_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"Employee with ID '{cert_in.employee_id}' "
                    f"not found in business '{cert_in.business_id}'."
                ),
            )

        # Get active salary compensation snapshot
        salary_stmt = (
            select(EmployeeSalary)
            .where(EmployeeSalary.employee_id == cert_in.employee_id)
            .order_by(EmployeeSalary.effective_from.desc())
        )
        active_salary = db.scalar(salary_stmt)

        basic_val = float(active_salary.basic_salary) if active_salary else 0.0
        gross_val = float(active_salary.gross_salary) if active_salary else 0.0
        net_val = float(active_salary.net_salary) if active_salary else 0.0

        cert_no = self._generate_certificate_no(db, cert_in.business_id)

        cert = SalaryCertificate(
            business_id=cert_in.business_id,
            employee_id=cert_in.employee_id,
            certificate_no=cert_no,
            issue_date=cert_in.issue_date,
            purpose=cert_in.purpose,
            addressed_to=cert_in.addressed_to,
            include_breakdown=cert_in.include_breakdown,
            status=CertificateStatusEnum.DRAFT,
            basic_salary=basic_val,
            gross_salary=gross_val,
            net_salary=net_val,
            notes=cert_in.notes,
        )
        return self.repo.create(db, cert)

    def update_certificate(
        self, db: Session, cert_id: uuid.UUID, cert_in: SalaryCertificateUpdate
    ) -> SalaryCertificate:
        cert = self.get_certificate(db, cert_id)
        update_data = cert_in.model_dump(exclude_unset=True)
        return self.repo.update(db, cert, update_data)

    def delete_certificate(self, db: Session, cert_id: uuid.UUID) -> None:
        cert = self.get_certificate(db, cert_id)
        self.repo.delete(db, cert)
