import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.modules.hr_payroll.separation.models import (
    ClearanceStatusEnum,
    DepartmentClearance,
    DepartmentClearanceTypeEnum,
    EmployeeSeparation,
    ExitInterview,
    FinalSettlement,
    ReleaseLetter,
    ResignationApplication,
    ResignationStatusEnum,
    SeparationStatusEnum,
    SeparationTypeEnum,
    SettlementPaymentStatusEnum,
)
from app.modules.hr_payroll.separation.schemas import (
    DepartmentClearanceCreate,
    DepartmentClearanceSignOff,
    EmployeeSeparationCreate,
    EmployeeSeparationUpdate,
    ExitInterviewCreate,
    ExitInterviewUpdate,
    FinalSettlementCreate,
    ReleaseLetterCreate,
    ResignationApplicationCreate,
    ResignationApplicationReview,
)


# ── 1. Resignation Repository ───────────────────────────────────────────
class ResignationRepository:
    def get_by_id(self, db: Session, res_id: uuid.UUID, business_id: Optional[int] = None) -> Optional[ResignationApplication]:
        query = db.query(ResignationApplication).filter(ResignationApplication.id == res_id)
        if business_id is not None:
            query = query.filter(ResignationApplication.business_id == business_id)
        return query.first()

    def get_by_number(self, db: Session, number: str, business_id: Optional[int] = None) -> Optional[ResignationApplication]:
        query = db.query(ResignationApplication).filter(ResignationApplication.resignation_number == number)
        if business_id is not None:
            query = query.filter(ResignationApplication.business_id == business_id)
        return query.first()

    def generate_resignation_number(self, db: Session, business_id: int) -> str:
        year = datetime.now().year
        count = (
            db.query(func.count(ResignationApplication.id))
            .filter(ResignationApplication.business_id == business_id)
            .scalar()
            or 0
        )
        return f"RES-{year}-{count + 1:04d}"

    def get_all(
        self,
        db: Session,
        business_id: int,
        employee_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[ResignationApplication]:
        query = db.query(ResignationApplication).filter(ResignationApplication.business_id == business_id)
        if employee_id:
            query = query.filter(ResignationApplication.employee_id == employee_id)
        if status:
            query = query.filter(ResignationApplication.status == status)
        return query.order_by(ResignationApplication.created_at.desc()).offset(skip).limit(limit).all()

    def count(
        self,
        db: Session,
        business_id: int,
        employee_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
    ) -> int:
        query = db.query(func.count(ResignationApplication.id)).filter(ResignationApplication.business_id == business_id)
        if employee_id:
            query = query.filter(ResignationApplication.employee_id == employee_id)
        if status:
            query = query.filter(ResignationApplication.status == status)
        return query.scalar() or 0

    def create(
        self,
        db: Session,
        business_id: int,
        data: ResignationApplicationCreate,
        served_notice_days: int,
        shortfall_notice_days: int,
    ) -> ResignationApplication:
        number = self.generate_resignation_number(db, business_id)
        record = ResignationApplication(
            business_id=business_id,
            employee_id=data.employee_id,
            resignation_number=number,
            notice_date=data.notice_date,
            proposed_last_working_day=data.proposed_last_working_day,
            contractual_notice_days=data.contractual_notice_days,
            served_notice_days=served_notice_days,
            shortfall_notice_days=shortfall_notice_days,
            reason_category=data.reason_category.value if hasattr(data.reason_category, "value") else str(data.reason_category),
            resignation_letter=data.resignation_letter,
            handover_notes=data.handover_notes,
            status=ResignationStatusEnum.SUBMITTED.value,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    def update(self, db: Session, record: ResignationApplication, update_dict: dict) -> ResignationApplication:
        for k, v in update_dict.items():
            setattr(record, k, v)
        db.commit()
        db.refresh(record)
        return record


# ── 2. Separation Repository ───────────────────────────────────────────
class SeparationRepository:
    def get_by_id(self, db: Session, sep_id: uuid.UUID, business_id: Optional[int] = None) -> Optional[EmployeeSeparation]:
        query = db.query(EmployeeSeparation).filter(EmployeeSeparation.id == sep_id)
        if business_id is not None:
            query = query.filter(EmployeeSeparation.business_id == business_id)
        return query.first()

    def get_by_number(self, db: Session, number: str, business_id: Optional[int] = None) -> Optional[EmployeeSeparation]:
        query = db.query(EmployeeSeparation).filter(EmployeeSeparation.separation_number == number)
        if business_id is not None:
            query = query.filter(EmployeeSeparation.business_id == business_id)
        return query.first()

    def get_by_resignation_id(self, db: Session, resignation_id: uuid.UUID) -> Optional[EmployeeSeparation]:
        return db.query(EmployeeSeparation).filter(EmployeeSeparation.resignation_id == resignation_id).first()

    def generate_separation_number(self, db: Session, business_id: int) -> str:
        year = datetime.now().year
        count = (
            db.query(func.count(EmployeeSeparation.id))
            .filter(EmployeeSeparation.business_id == business_id)
            .scalar()
            or 0
        )
        return f"SEP-{year}-{count + 1:04d}"

    def get_all(
        self,
        db: Session,
        business_id: int,
        employee_id: Optional[uuid.UUID] = None,
        separation_type: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[EmployeeSeparation]:
        query = db.query(EmployeeSeparation).filter(EmployeeSeparation.business_id == business_id)
        if employee_id:
            query = query.filter(EmployeeSeparation.employee_id == employee_id)
        if separation_type:
            query = query.filter(EmployeeSeparation.separation_type == separation_type)
        if status:
            query = query.filter(EmployeeSeparation.status == status)
        return query.order_by(EmployeeSeparation.created_at.desc()).offset(skip).limit(limit).all()

    def count(
        self,
        db: Session,
        business_id: int,
        employee_id: Optional[uuid.UUID] = None,
        separation_type: Optional[str] = None,
        status: Optional[str] = None,
    ) -> int:
        query = db.query(func.count(EmployeeSeparation.id)).filter(EmployeeSeparation.business_id == business_id)
        if employee_id:
            query = query.filter(EmployeeSeparation.employee_id == employee_id)
        if separation_type:
            query = query.filter(EmployeeSeparation.separation_type == separation_type)
        if status:
            query = query.filter(EmployeeSeparation.status == status)
        return query.scalar() or 0

    def create(
        self,
        db: Session,
        business_id: int,
        data: EmployeeSeparationCreate,
        service_duration_days: int,
        service_duration_years: float,
    ) -> EmployeeSeparation:
        number = self.generate_separation_number(db, business_id)
        record = EmployeeSeparation(
            business_id=business_id,
            employee_id=data.employee_id,
            separation_number=number,
            separation_type=data.separation_type.value if hasattr(data.separation_type, "value") else str(data.separation_type),
            resignation_id=data.resignation_id,
            order_date=data.order_date,
            last_working_date=data.last_working_date,
            reason=data.reason,
            status=SeparationStatusEnum.INITIATED.value,
            severance_entitled=data.severance_entitled,
            service_duration_days=service_duration_days,
            service_duration_years=service_duration_years,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    def update(self, db: Session, record: EmployeeSeparation, update_dict: dict) -> EmployeeSeparation:
        for k, v in update_dict.items():
            setattr(record, k, v)
        db.commit()
        db.refresh(record)
        return record


# ── 3. Department Clearance Repository ─────────────────────────────────
class DepartmentClearanceRepository:
    def get_by_id(self, db: Session, clearance_id: uuid.UUID, business_id: Optional[int] = None) -> Optional[DepartmentClearance]:
        query = db.query(DepartmentClearance).filter(DepartmentClearance.id == clearance_id)
        if business_id is not None:
            query = query.filter(DepartmentClearance.business_id == business_id)
        return query.first()

    def get_by_separation(self, db: Session, separation_id: uuid.UUID, business_id: Optional[int] = None) -> list[DepartmentClearance]:
        query = db.query(DepartmentClearance).filter(DepartmentClearance.separation_id == separation_id)
        if business_id is not None:
            query = query.filter(DepartmentClearance.business_id == business_id)
        return query.all()

    def get_all(
        self,
        db: Session,
        business_id: int,
        department_type: Optional[str] = None,
        status: Optional[str] = None,
        employee_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[DepartmentClearance]:
        query = db.query(DepartmentClearance).filter(DepartmentClearance.business_id == business_id)
        if department_type:
            query = query.filter(DepartmentClearance.department_type == department_type)
        if status:
            query = query.filter(DepartmentClearance.status == status)
        if employee_id:
            query = query.filter(DepartmentClearance.employee_id == employee_id)
        return query.order_by(DepartmentClearance.created_at.desc()).offset(skip).limit(limit).all()

    def create(self, db: Session, business_id: int, data: DepartmentClearanceCreate) -> DepartmentClearance:
        record = DepartmentClearance(
            business_id=business_id,
            separation_id=data.separation_id,
            employee_id=data.employee_id,
            department_type=data.department_type.value if hasattr(data.department_type, "value") else str(data.department_type),
            status=data.status.value if hasattr(data.status, "value") else str(data.status),
            outstanding_amount=data.outstanding_amount,
            checklist_remarks=data.checklist_remarks,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    def update(self, db: Session, record: DepartmentClearance, update_dict: dict) -> DepartmentClearance:
        for k, v in update_dict.items():
            setattr(record, k, v)
        db.commit()
        db.refresh(record)
        return record


# ── 4. Exit Interview Repository ───────────────────────────────────────
class ExitInterviewRepository:
    def get_by_id(self, db: Session, interview_id: uuid.UUID, business_id: Optional[int] = None) -> Optional[ExitInterview]:
        query = db.query(ExitInterview).filter(ExitInterview.id == interview_id)
        if business_id is not None:
            query = query.filter(ExitInterview.business_id == business_id)
        return query.first()

    def get_by_separation(self, db: Session, separation_id: uuid.UUID) -> Optional[ExitInterview]:
        return db.query(ExitInterview).filter(ExitInterview.separation_id == separation_id).first()

    def get_all(
        self,
        db: Session,
        business_id: int,
        employee_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[ExitInterview]:
        query = db.query(ExitInterview).filter(ExitInterview.business_id == business_id)
        if employee_id:
            query = query.filter(ExitInterview.employee_id == employee_id)
        return query.order_by(ExitInterview.interview_date.desc()).offset(skip).limit(limit).all()

    def count(self, db: Session, business_id: int, employee_id: Optional[uuid.UUID] = None) -> int:
        query = db.query(func.count(ExitInterview.id)).filter(ExitInterview.business_id == business_id)
        if employee_id:
            query = query.filter(ExitInterview.employee_id == employee_id)
        return query.scalar() or 0

    def create(self, db: Session, business_id: int, data: ExitInterviewCreate, interviewer_id: Optional[int] = None) -> ExitInterview:
        record = ExitInterview(
            business_id=business_id,
            separation_id=data.separation_id,
            employee_id=data.employee_id,
            interview_date=data.interview_date,
            interviewer_id=interviewer_id,
            primary_reason_for_leaving=data.primary_reason_for_leaving,
            rating_culture=data.rating_culture,
            rating_management=data.rating_management,
            rating_growth_opportunities=data.rating_growth_opportunities,
            rating_compensation=data.rating_compensation,
            rating_work_life_balance=data.rating_work_life_balance,
            would_recommend=data.would_recommend,
            proudest_accomplishment=data.proudest_accomplishment,
            improvement_suggestions=data.improvement_suggestions,
            confidential_hr_notes=data.confidential_hr_notes,
            status="completed",
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    def update(self, db: Session, record: ExitInterview, update_dict: dict) -> ExitInterview:
        for k, v in update_dict.items():
            setattr(record, k, v)
        db.commit()
        db.refresh(record)
        return record


# ── 5. Final Settlement Repository ─────────────────────────────────────
class FinalSettlementRepository:
    def get_by_id(self, db: Session, settlement_id: uuid.UUID, business_id: Optional[int] = None) -> Optional[FinalSettlement]:
        query = db.query(FinalSettlement).filter(FinalSettlement.id == settlement_id)
        if business_id is not None:
            query = query.filter(FinalSettlement.business_id == business_id)
        return query.first()

    def get_by_number(self, db: Session, number: str, business_id: Optional[int] = None) -> Optional[FinalSettlement]:
        query = db.query(FinalSettlement).filter(FinalSettlement.settlement_number == number)
        if business_id is not None:
            query = query.filter(FinalSettlement.business_id == business_id)
        return query.first()

    def get_by_separation(self, db: Session, separation_id: uuid.UUID) -> Optional[FinalSettlement]:
        return db.query(FinalSettlement).filter(FinalSettlement.separation_id == separation_id).first()

    def generate_settlement_number(self, db: Session, business_id: int) -> str:
        year = datetime.now().year
        count = (
            db.query(func.count(FinalSettlement.id))
            .filter(FinalSettlement.business_id == business_id)
            .scalar()
            or 0
        )
        return f"FNF-{year}-{count + 1:04d}"

    def get_all(
        self,
        db: Session,
        business_id: int,
        employee_id: Optional[uuid.UUID] = None,
        payment_status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[FinalSettlement]:
        query = db.query(FinalSettlement).filter(FinalSettlement.business_id == business_id)
        if employee_id:
            query = query.filter(FinalSettlement.employee_id == employee_id)
        if payment_status:
            query = query.filter(FinalSettlement.payment_status == payment_status)
        return query.order_by(FinalSettlement.settlement_date.desc()).offset(skip).limit(limit).all()

    def count(
        self,
        db: Session,
        business_id: int,
        employee_id: Optional[uuid.UUID] = None,
        payment_status: Optional[str] = None,
    ) -> int:
        query = db.query(func.count(FinalSettlement.id)).filter(FinalSettlement.business_id == business_id)
        if employee_id:
            query = query.filter(FinalSettlement.employee_id == employee_id)
        if payment_status:
            query = query.filter(FinalSettlement.payment_status == payment_status)
        return query.scalar() or 0

    def create(self, db: Session, business_id: int, data: FinalSettlementCreate) -> FinalSettlement:
        number = self.generate_settlement_number(db, business_id)
        record = FinalSettlement(
            business_id=business_id,
            separation_id=data.separation_id,
            employee_id=data.employee_id,
            settlement_number=number,
            settlement_date=data.settlement_date,
            unpaid_salary_days=data.unpaid_salary_days,
            unpaid_salary_amount=data.unpaid_salary_amount,
            leave_encashment_days=data.leave_encashment_days,
            leave_encashment_amount=data.leave_encashment_amount,
            gratuity_years=data.gratuity_years,
            gratuity_amount=data.gratuity_amount,
            provident_fund_amount=data.provident_fund_amount,
            severance_pay_amount=data.severance_pay_amount,
            bonus_arrears_amount=data.bonus_arrears_amount,
            other_payable_amount=data.other_payable_amount,
            total_payable_amount=data.total_payable_amount,
            notice_shortfall_days=data.notice_shortfall_days,
            notice_shortfall_deduction=data.notice_shortfall_deduction,
            loan_advance_deduction=data.loan_advance_deduction,
            asset_damage_deduction=data.asset_damage_deduction,
            clearance_charge_deduction=data.clearance_charge_deduction,
            tax_withholding_deduction=data.tax_withholding_deduction,
            total_deduction_amount=data.total_deduction_amount,
            net_payable_amount=data.net_payable_amount,
            payment_status=SettlementPaymentStatusEnum.DRAFT.value,
            payment_method=data.payment_method,
            notes=data.notes,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    def update(self, db: Session, record: FinalSettlement, update_dict: dict) -> FinalSettlement:
        for k, v in update_dict.items():
            setattr(record, k, v)
        db.commit()
        db.refresh(record)
        return record


# ── 6. Release Letter Repository ───────────────────────────────────────
class ReleaseLetterRepository:
    def get_by_id(self, db: Session, letter_id: uuid.UUID, business_id: Optional[int] = None) -> Optional[ReleaseLetter]:
        query = db.query(ReleaseLetter).filter(ReleaseLetter.id == letter_id)
        if business_id is not None:
            query = query.filter(ReleaseLetter.business_id == business_id)
        return query.first()

    def get_by_number(self, db: Session, number: str, business_id: Optional[int] = None) -> Optional[ReleaseLetter]:
        query = db.query(ReleaseLetter).filter(ReleaseLetter.letter_number == number)
        if business_id is not None:
            query = query.filter(ReleaseLetter.business_id == business_id)
        return query.first()

    def get_by_separation(self, db: Session, separation_id: uuid.UUID) -> Optional[ReleaseLetter]:
        return db.query(ReleaseLetter).filter(ReleaseLetter.separation_id == separation_id).first()

    def generate_letter_number(self, db: Session, business_id: int) -> str:
        year = datetime.now().year
        count = (
            db.query(func.count(ReleaseLetter.id))
            .filter(ReleaseLetter.business_id == business_id)
            .scalar()
            or 0
        )
        return f"REL-{year}-{count + 1:04d}"

    def get_all(
        self,
        db: Session,
        business_id: int,
        employee_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[ReleaseLetter]:
        query = db.query(ReleaseLetter).filter(ReleaseLetter.business_id == business_id)
        if employee_id:
            query = query.filter(ReleaseLetter.employee_id == employee_id)
        if status:
            query = query.filter(ReleaseLetter.status == status)
        return query.order_by(ReleaseLetter.issue_date.desc()).offset(skip).limit(limit).all()

    def count(
        self,
        db: Session,
        business_id: int,
        employee_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
    ) -> int:
        query = db.query(func.count(ReleaseLetter.id)).filter(ReleaseLetter.business_id == business_id)
        if employee_id:
            query = query.filter(ReleaseLetter.employee_id == employee_id)
        if status:
            query = query.filter(ReleaseLetter.status == status)
        return query.scalar() or 0

    def create(self, db: Session, business_id: int, data: ReleaseLetterCreate) -> ReleaseLetter:
        number = self.generate_letter_number(db, business_id)
        record = ReleaseLetter(
            business_id=business_id,
            separation_id=data.separation_id,
            employee_id=data.employee_id,
            letter_number=number,
            issue_date=data.issue_date,
            effective_exit_date=data.effective_exit_date,
            designation=data.designation,
            department=data.department,
            status="issued",
            letter_content=data.letter_content,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    def update(self, db: Session, record: ReleaseLetter, update_dict: dict) -> ReleaseLetter:
        for k, v in update_dict.items():
            setattr(record, k, v)
        db.commit()
        db.refresh(record)
        return record
