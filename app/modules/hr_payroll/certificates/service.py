import datetime
import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.tenancy.scoping import verify_record_ownership
from app.modules.hr_payroll.certificates.models import (
    CertificateStatusEnum,
    SalaryCertificate,
)
from app.modules.hr_payroll.certificates.repository import SalaryCertificateRepository
from app.modules.hr_payroll.certificates.schemas import (
    SalaryCertificateCreate,
    SalaryCertificateUpdate,
)
from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.payroll.models import PayrollPeriod, PayrollRecord


def parse_fiscal_year(fy_str: str) -> tuple[datetime.date, datetime.date]:
    """
    Parse a fiscal year string like '2022-2023' or '2022–2023' into start and end dates.
    Standard fiscal year in Bangladesh: July 1, YYYY to June 30, YYYY+1.
    """
    normalized = fy_str.replace("–", "-").strip()
    parts = normalized.split("-")
    if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
        start_yr = int(parts[0])
        end_yr = int(parts[1])
        if len(parts[1]) == 2:
            end_yr = (start_yr // 100) * 100 + end_yr
        return datetime.date(start_yr, 7, 1), datetime.date(end_yr, 6, 30)
    elif len(parts) == 1 and parts[0].isdigit():
        start_yr = int(parts[0])
        return datetime.date(start_yr, 7, 1), datetime.date(start_yr + 1, 6, 30)
    else:
        # Fallback to current/prev fiscal year range
        today = datetime.date.today()
        start_yr = today.year - 1
        return datetime.date(start_yr, 7, 1), datetime.date(start_yr + 1, 6, 30)


def derive_assessment_year(fy_str: str) -> str:
    """
    Derive Assessment Year from Income Year (e.g., Income Year 2022-2023 -> Assessment Year 2023-2024 or 2021-2022 depending on convention).
    If custom assessment_year provided, caller uses that.
    """
    normalized = fy_str.replace("–", "-").strip()
    parts = normalized.split("-")
    if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
        start_yr = int(parts[0])
        end_yr = int(parts[1])
        # Income year 2022-2023 -> Assessment year 2023-2024
        return f"{start_yr + 1}-{end_yr + 1}"
    return fy_str


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

    def get_certificate(
        self, db: Session, cert_id: uuid.UUID, current_user: Any | None = None
    ) -> SalaryCertificate:
        cert = self.repo.get_by_id(db, cert_id)
        if current_user is not None:
            return verify_record_ownership(
                cert, current_user, detail=f"Salary certificate with ID '{cert_id}' not found."
            )
        if not cert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Salary certificate with ID '{cert_id}' not found.",
            )
        return cert

    def _aggregate_payroll_records(
        self, db: Session, employee_id: uuid.UUID, fiscal_year: str
    ) -> dict[str, Any]:
        fy_start, fy_end = parse_fiscal_year(fiscal_year)

        stmt = (
            select(PayrollRecord, PayrollPeriod)
            .join(PayrollPeriod, PayrollRecord.period_id == PayrollPeriod.id)
            .where(
                PayrollRecord.employee_id == employee_id,
                PayrollPeriod.start_date >= fy_start,
                PayrollPeriod.end_date <= fy_end,
            )
            .order_by(PayrollPeriod.start_date.asc())
        )
        results = db.execute(stmt).all()

        if not results:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"No payroll records found for employee for the requested fiscal year {fiscal_year} "
                    f"({fy_start.strftime('%d %B %Y')} to {fy_end.strftime('%d %B %Y')})."
                ),
            )

        min_start = min(period.start_date for record, period in results)
        max_end = max(period.end_date for record, period in results)

        basic = sum(float(rec.basic_salary or 0) for rec, p in results)
        house_rent = sum(float(rec.house_rent or 0) for rec, p in results)
        medical = sum(float(rec.medical_allowance or 0) for rec, p in results)
        conveyance = sum(float(rec.transport_allowance or 0) for rec, p in results)
        others = sum(
            float(rec.food_allowance or 0) + float(rec.other_allowance or 0) + float(rec.overtime_pay or 0)
            for rec, p in results
        )
        bonus = sum(float(rec.bonus or 0) for rec, p in results)
        gross = basic + house_rent + medical + conveyance + others + bonus

        tax = sum(float(rec.tax or 0) for rec, p in results)
        net = gross - tax

        return {
            "start_date": min_start,
            "end_date": max_end,
            "basic_salary": round(basic, 2),
            "house_rent": round(house_rent, 2),
            "medical_allowance": round(medical, 2),
            "conveyance": round(conveyance, 2),
            "others_allowance": round(others, 2),
            "bonus": round(bonus, 2),
            "gross_salary": round(gross, 2),
            "tax_deducted": round(tax, 2),
            "net_salary": round(net, 2),
        }

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

        fy_str = cert_in.fiscal_year or "2022-2023"
        agg = self._aggregate_payroll_records(db, cert_in.employee_id, fy_str)

        assessment_yr = cert_in.assessment_year or derive_assessment_year(fy_str)
        cert_no = self._generate_certificate_no(db, cert_in.business_id)

        cert = SalaryCertificate(
            business_id=cert_in.business_id,
            employee_id=cert_in.employee_id,
            certificate_no=cert_no,
            issue_date=cert_in.issue_date,
            fiscal_year=fy_str,
            assessment_year=assessment_yr,
            start_date=agg["start_date"],
            end_date=agg["end_date"],
            purpose=cert_in.purpose,
            addressed_to=cert_in.addressed_to,
            include_breakdown=cert_in.include_breakdown,
            status=CertificateStatusEnum.DRAFT,
            basic_salary=agg["basic_salary"],
            house_rent=agg["house_rent"],
            medical_allowance=agg["medical_allowance"],
            conveyance=agg["conveyance"],
            others_allowance=agg["others_allowance"],
            bonus=agg["bonus"],
            gross_salary=agg["gross_salary"],
            tax_deducted=agg["tax_deducted"],
            net_salary=agg["net_salary"],
            notes=cert_in.notes,
        )
        return self.repo.create(db, cert)

    def update_certificate(
        self,
        db: Session,
        cert_id: uuid.UUID,
        cert_in: SalaryCertificateUpdate,
        current_user: Any | None = None,
    ) -> SalaryCertificate:
        cert = self.get_certificate(db, cert_id, current_user=current_user)
        update_data = cert_in.model_dump(exclude_unset=True)

        if "fiscal_year" in update_data and update_data["fiscal_year"]:
            fy_str = update_data["fiscal_year"]
            agg = self._aggregate_payroll_records(db, cert.employee_id, fy_str)
            update_data["start_date"] = agg["start_date"]
            update_data["end_date"] = agg["end_date"]
            update_data["basic_salary"] = agg["basic_salary"]
            update_data["house_rent"] = agg["house_rent"]
            update_data["medical_allowance"] = agg["medical_allowance"]
            update_data["conveyance"] = agg["conveyance"]
            update_data["others_allowance"] = agg["others_allowance"]
            update_data["bonus"] = agg["bonus"]
            update_data["gross_salary"] = agg["gross_salary"]
            update_data["tax_deducted"] = agg["tax_deducted"]
            update_data["net_salary"] = agg["net_salary"]
            if "assessment_year" not in update_data or not update_data["assessment_year"]:
                update_data["assessment_year"] = derive_assessment_year(fy_str)

        return self.repo.update(db, cert, update_data)

    def delete_certificate(
        self, db: Session, cert_id: uuid.UUID, current_user: Any | None = None
    ) -> None:
        cert = self.get_certificate(db, cert_id, current_user=current_user)
        self.repo.delete(db, cert)
