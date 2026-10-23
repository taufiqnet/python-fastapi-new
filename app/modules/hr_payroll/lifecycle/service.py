import calendar
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.common.timezone import today_bd
from app.modules.hr_payroll.compensation.models import EmployeeSalary
from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.lifecycle.models import (
    CareerMovement,
    CaseStageEnum,
    DisciplinaryActionLog,
    DisciplinaryCase,
    IncrementTypeEnum,
    MovementStatusEnum,
    MovementTypeEnum,
    ProbationRecommendationEnum,
    ProbationReview,
    ProbationStatusEnum,
    SanctionTypeEnum,
    ShowCauseNotice,
)
from app.modules.hr_payroll.lifecycle.schemas import (
    ActionIssue,
    CaseCreate,
    ExplanationIn,
    IncrementPreview,
    LifecycleStats,
    MovementCreate,
    MovementDecision,
    ProbationDecision,
    ProbationDeskRow,
    ProbationReviewCreate,
    ShowCauseIssue,
)
from app.modules.hr_payroll.organization.models import Branch, Department, JobTitle, SalaryGrade

# Statutory minimum response window for a show-cause notice (BLA 2006 natural-justice practice)
MIN_SHOW_CAUSE_DAYS = 7
DEFAULT_SUBSISTENCE_PCT = Decimal("50.00")
EARNING_FIELDS = ["basic_salary", "house_rent", "medical_allowance", "transport_allowance", "food_allowance", "other_allowance"]


def _val(v):
    return v.value if hasattr(v, "value") else v


def add_months(d: date, months: int) -> date:
    m = d.month - 1 + months
    y = d.year + m // 12
    m = m % 12 + 1
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


def full_name(emp: Optional[Employee]) -> Optional[str]:
    return f"{emp.first_name} {emp.last_name or ''}".strip() if emp else None


def _q2(v) -> Decimal:
    return Decimal(str(v)).quantize(Decimal("0.01"))


class LifecycleService:
    # ------------------------------------------------------------------ helpers
    def get_employee(self, db: Session, business_id: Optional[int], employee_id: uuid.UUID) -> Employee:
        q = db.query(Employee).filter(Employee.id == employee_id)
        if business_id is not None:
            q = q.filter(Employee.business_id == business_id)
        emp = q.first()
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found.")
        return emp

    def _next_number(self, db: Session, model, business_id: int, prefix: str) -> str:
        count = db.query(func.count(model.id)).filter(model.business_id == business_id).scalar() or 0
        return f"{prefix}-{today_bd().strftime('%Y%m')}-{count + 1:04d}"

    def _check_ref(self, db: Session, model, ref_id, business_id: int, label: str):
        if ref_id is None:
            return
        obj = db.get(model, ref_id)
        if not obj or getattr(obj, "business_id", business_id) != business_id:
            raise HTTPException(status_code=400, detail=f"{label} not found.")

    # ================================================================== PROBATION
    def probation_desk(self, db: Session, business_id: Optional[int], search: Optional[str] = None) -> List[ProbationDeskRow]:
        q = db.query(Employee).filter(
            Employee.is_active.is_(True),
            Employee.confirmation_date.is_(None),
            Employee.probation_end_date.is_not(None),
        )
        if business_id is not None:
            q = q.filter(Employee.business_id == business_id)
        if search:
            like = f"%{search}%"
            q = q.filter((Employee.first_name.ilike(like)) | (Employee.last_name.ilike(like)) | (Employee.employee_id.ilike(like)))
        today = today_bd()
        rows = []
        for e in q.order_by(Employee.probation_end_date.asc()).all():
            days = (e.probation_end_date - today).days
            rows.append(
                ProbationDeskRow(
                    employee_id=e.id,
                    employee_name=full_name(e) or "",
                    employee_code=e.employee_id,
                    department_name=e.department.name if e.department else None,
                    job_title_name=e.job_title.name if e.job_title else None,
                    start_date=e.start_date,
                    probation_end_date=e.probation_end_date,
                    days_remaining=days,
                    confirmation_date=e.confirmation_date,
                    is_overdue=days < 0,
                )
            )
        return rows

    def create_probation_review(self, db: Session, business_id: int, data: ProbationReviewCreate) -> ProbationReview:
        emp = self.get_employee(db, business_id, data.employee_id)
        if emp.confirmation_date is not None:
            raise HTTPException(status_code=400, detail="Employee is already confirmed.")
        pending = (
            db.query(ProbationReview)
            .filter(ProbationReview.employee_id == emp.id, ProbationReview.status == ProbationStatusEnum.SUBMITTED.value)
            .first()
        )
        if pending:
            raise HTTPException(status_code=400, detail="A probation review is already awaiting decision for this employee.")
        review = ProbationReview(
            business_id=business_id,
            employee_id=emp.id,
            reviewer_id=data.reviewer_id or emp.direct_manager_id,
            review_number=self._next_number(db, ProbationReview, business_id, "PRB"),
            due_date=emp.probation_end_date,
            review_date=data.review_date,
            performance_rating=data.performance_rating,
            conduct_rating=data.conduct_rating,
            punctuality_rating=data.punctuality_rating,
            recommendation=_val(data.recommendation),
            extension_months=data.extension_months,
            effective_confirmation_date=data.effective_confirmation_date,
            comments=data.comments,
            status=ProbationStatusEnum.SUBMITTED.value,
        )
        db.add(review)
        db.commit()
        db.refresh(review)
        return review

    def get_probation_review(self, db: Session, business_id: Optional[int], review_id: uuid.UUID) -> ProbationReview:
        q = db.query(ProbationReview).filter(ProbationReview.id == review_id)
        if business_id is not None:
            q = q.filter(ProbationReview.business_id == business_id)
        r = q.first()
        if not r:
            raise HTTPException(status_code=404, detail="Probation review not found.")
        return r

    def list_probation_reviews(
        self, db: Session, business_id: Optional[int], status_filter: Optional[str] = None, employee_id: Optional[uuid.UUID] = None
    ) -> List[ProbationReview]:
        q = db.query(ProbationReview)
        if business_id is not None:
            q = q.filter(ProbationReview.business_id == business_id)
        if status_filter:
            q = q.filter(ProbationReview.status == status_filter)
        if employee_id:
            q = q.filter(ProbationReview.employee_id == employee_id)
        return q.order_by(ProbationReview.created_at.desc()).all()

    def decide_probation(
        self, db: Session, business_id: Optional[int], review_id: uuid.UUID, user_id: int, data: ProbationDecision
    ) -> ProbationReview:
        review = self.get_probation_review(db, business_id, review_id)
        if review.status != ProbationStatusEnum.SUBMITTED.value:
            raise HTTPException(status_code=400, detail="This review has already been decided.")
        emp = self.get_employee(db, business_id, review.employee_id)

        review.decided_by_id = user_id
        review.decided_at = datetime.now(timezone.utc)
        if data.notes:
            review.comments = f"{review.comments or ''}\n[Decision] {data.notes}".strip()

        if not data.approve:
            review.status = ProbationStatusEnum.REJECTED.value
        else:
            review.status = ProbationStatusEnum.APPROVED.value
            rec = review.recommendation
            if rec == ProbationRecommendationEnum.CONFIRM.value:
                emp.confirmation_date = review.effective_confirmation_date or today_bd()
                review.effective_confirmation_date = emp.confirmation_date
                review.letter_reference_no = f"CNF-{review.review_number}"
            elif rec == ProbationRecommendationEnum.EXTEND.value:
                base = emp.probation_end_date or today_bd()
                emp.probation_end_date = add_months(base, review.extension_months or 1)
                emp.probation_period_months = (emp.probation_period_months or 0) + (review.extension_months or 1)
                review.letter_reference_no = f"EXT-{review.review_number}"
            # 'terminate' only records the decision; separation must go through the exit/clearance workflow.
        db.commit()
        db.refresh(review)
        return review

    # ================================================================== MOVEMENTS
    def _salary(self, db: Session, employee_id: uuid.UUID) -> Optional[EmployeeSalary]:
        return db.query(EmployeeSalary).filter(EmployeeSalary.employee_id == employee_id).first()

    @staticmethod
    def compute_increment(salary: EmployeeSalary, inc_type: str, value: Decimal) -> dict:
        value = Decimal(str(value))
        new = {}
        if inc_type == IncrementTypeEnum.PERCENTAGE.value:
            factor = Decimal("1") + value / Decimal("100")
            for f in EARNING_FIELDS:
                new[f] = _q2(Decimal(str(getattr(salary, f) or 0)) * factor)
        else:
            for f in EARNING_FIELDS:
                new[f] = _q2(getattr(salary, f) or 0)
            new["basic_salary"] = _q2(new["basic_salary"] + value)
        gross = sum(new.values(), Decimal("0"))
        deductions = sum(Decimal(str(getattr(salary, f) or 0)) for f in ("tax", "provident_fund", "other_deduction"))
        new["gross_salary"] = _q2(gross)
        new["net_salary"] = _q2(gross - deductions)
        return new

    def preview_increment(self, db: Session, business_id: Optional[int], employee_id: uuid.UUID, inc_type, value) -> IncrementPreview:
        self.get_employee(db, business_id, employee_id)
        salary = self._salary(db, employee_id)
        if not salary:
            raise HTTPException(status_code=400, detail="Employee has no salary structure; set compensation first.")
        new = self.compute_increment(salary, _val(inc_type), value)
        return IncrementPreview(
            employee_id=employee_id,
            previous_basic_salary=_q2(salary.basic_salary),
            new_basic_salary=new["basic_salary"],
            previous_gross_salary=_q2(salary.gross_salary),
            new_gross_salary=new["gross_salary"],
            previous_net_salary=_q2(salary.net_salary),
            new_net_salary=new["net_salary"],
        )

    def create_movement(self, db: Session, business_id: int, data: MovementCreate) -> CareerMovement:
        emp = self.get_employee(db, business_id, data.employee_id)
        self._check_ref(db, JobTitle, data.new_job_title_id, business_id, "Job title")
        self._check_ref(db, SalaryGrade, data.new_salary_grade_id, business_id, "Salary grade")
        self._check_ref(db, Branch, data.new_branch_id, business_id, "Branch")
        self._check_ref(db, Department, data.new_department_id, business_id, "Department")
        if data.new_manager_id:
            if data.new_manager_id == emp.id:
                raise HTTPException(status_code=400, detail="An employee cannot report to themselves.")
            self.get_employee(db, business_id, data.new_manager_id)

        t = _val(data.action_type)
        mv = CareerMovement(
            business_id=business_id,
            employee_id=emp.id,
            movement_number=self._next_number(db, CareerMovement, business_id, "MOV"),
            action_type=t,
            effective_date=data.effective_date,
            reason_category=data.reason_category,
            justification_notes=data.justification_notes,
            appraisal_id=data.appraisal_id,
            status=MovementStatusEnum.PENDING_APPROVAL.value,
        )
        if t in (MovementTypeEnum.PROMOTION.value, MovementTypeEnum.PROMOTION_INCREMENT.value):
            mv.previous_job_title_id, mv.new_job_title_id = emp.job_title_id, data.new_job_title_id
            mv.previous_salary_grade_id, mv.new_salary_grade_id = emp.salary_grade_id, data.new_salary_grade_id
        if t == MovementTypeEnum.TRANSFER.value:
            mv.previous_branch_id, mv.new_branch_id = emp.branch_id, data.new_branch_id
            mv.previous_department_id, mv.new_department_id = emp.department_id, data.new_department_id
            mv.previous_manager_id, mv.new_manager_id = emp.direct_manager_id, data.new_manager_id
        if t in (MovementTypeEnum.INCREMENT.value, MovementTypeEnum.PROMOTION_INCREMENT.value):
            prev = self.preview_increment(db, business_id, emp.id, data.increment_type, data.increment_value)
            mv.increment_type = _val(data.increment_type)
            mv.increment_value = data.increment_value
            mv.previous_basic_salary, mv.new_basic_salary = prev.previous_basic_salary, prev.new_basic_salary
            mv.previous_gross_salary, mv.new_gross_salary = prev.previous_gross_salary, prev.new_gross_salary
        db.add(mv)
        db.commit()
        db.refresh(mv)
        return mv

    def get_movement(self, db: Session, business_id: Optional[int], movement_id: uuid.UUID) -> CareerMovement:
        q = db.query(CareerMovement).filter(CareerMovement.id == movement_id)
        if business_id is not None:
            q = q.filter(CareerMovement.business_id == business_id)
        mv = q.first()
        if not mv:
            raise HTTPException(status_code=404, detail="Career movement not found.")
        return mv

    def list_movements(
        self,
        db: Session,
        business_id: Optional[int],
        action_type: Optional[str] = None,
        status_filter: Optional[str] = None,
        employee_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[CareerMovement]:
        q = db.query(CareerMovement)
        if business_id is not None:
            q = q.filter(CareerMovement.business_id == business_id)
        if action_type:
            q = q.filter(CareerMovement.action_type == action_type)
        if status_filter:
            q = q.filter(CareerMovement.status == status_filter)
        if employee_id:
            q = q.filter(CareerMovement.employee_id == employee_id)
        return q.order_by(CareerMovement.created_at.desc()).offset(skip).limit(limit).all()

    def decide_movement(
        self, db: Session, business_id: Optional[int], movement_id: uuid.UUID, user_id: int, data: MovementDecision
    ) -> CareerMovement:
        mv = self.get_movement(db, business_id, movement_id)
        if mv.status != MovementStatusEnum.PENDING_APPROVAL.value:
            raise HTTPException(status_code=400, detail="This movement has already been decided.")
        mv.approver_id = user_id
        mv.approved_at = datetime.now(timezone.utc)
        if not data.approve:
            mv.status = MovementStatusEnum.REJECTED.value
            mv.rejection_reason = data.rejection_reason
            db.commit()
            db.refresh(mv)
            return mv

        emp = self.get_employee(db, business_id, mv.employee_id)
        t = mv.action_type
        if t in (MovementTypeEnum.PROMOTION.value, MovementTypeEnum.PROMOTION_INCREMENT.value):
            if mv.new_job_title_id:
                emp.job_title_id = mv.new_job_title_id
            if mv.new_salary_grade_id:
                emp.salary_grade_id = mv.new_salary_grade_id
        if t == MovementTypeEnum.TRANSFER.value:
            if mv.new_branch_id:
                emp.branch_id = mv.new_branch_id
            if mv.new_department_id:
                emp.department_id = mv.new_department_id
            if mv.new_manager_id:
                emp.direct_manager_id = mv.new_manager_id
        if t in (MovementTypeEnum.INCREMENT.value, MovementTypeEnum.PROMOTION_INCREMENT.value):
            salary = self._salary(db, emp.id)
            if not salary:
                raise HTTPException(status_code=400, detail="Employee has no salary structure to revise.")
            # Recompute against the *current* salary so a stale preview can never corrupt payroll.
            mv.previous_basic_salary, mv.previous_gross_salary = _q2(salary.basic_salary), _q2(salary.gross_salary)
            new = self.compute_increment(salary, mv.increment_type, mv.increment_value)
            for k, v in new.items():
                setattr(salary, k, v)
            salary.effective_from = mv.effective_date
            mv.new_basic_salary, mv.new_gross_salary = new["basic_salary"], new["gross_salary"]
        mv.status = MovementStatusEnum.APPLIED.value
        mv.letter_reference_no = f"LTR-{mv.movement_number}"
        db.commit()
        db.refresh(mv)
        return mv

    # ================================================================== DISCIPLINARY
    def create_case(self, db: Session, business_id: int, data: CaseCreate) -> DisciplinaryCase:
        emp = self.get_employee(db, business_id, data.employee_id)
        case = DisciplinaryCase(
            business_id=business_id,
            employee_id=emp.id,
            case_number=self._next_number(db, DisciplinaryCase, business_id, "DISC"),
            current_stage=CaseStageEnum.REPORTED.value,
            **data.model_dump(exclude={"employee_id"}),
        )
        db.add(case)
        db.commit()
        db.refresh(case)
        return case

    def get_case(self, db: Session, business_id: Optional[int], case_id: uuid.UUID) -> DisciplinaryCase:
        q = db.query(DisciplinaryCase).filter(DisciplinaryCase.id == case_id)
        if business_id is not None:
            q = q.filter(DisciplinaryCase.business_id == business_id)
        c = q.first()
        if not c:
            raise HTTPException(status_code=404, detail="Disciplinary case not found.")
        return c

    def list_cases(
        self,
        db: Session,
        business_id: Optional[int],
        stage: Optional[str] = None,
        employee_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[DisciplinaryCase]:
        q = db.query(DisciplinaryCase)
        if business_id is not None:
            q = q.filter(DisciplinaryCase.business_id == business_id)
        if stage:
            q = q.filter(DisciplinaryCase.current_stage == stage)
        if employee_id:
            q = q.filter(DisciplinaryCase.employee_id == employee_id)
        if search:
            q = q.filter(DisciplinaryCase.allegation_title.ilike(f"%{search}%") | DisciplinaryCase.case_number.ilike(f"%{search}%"))
        return q.order_by(DisciplinaryCase.created_at.desc()).offset(skip).limit(limit).all()

    def issue_show_cause(self, db: Session, business_id: Optional[int], case_id: uuid.UUID, data: ShowCauseIssue) -> DisciplinaryCase:
        case = self.get_case(db, business_id, case_id)
        if case.current_stage != CaseStageEnum.REPORTED.value:
            raise HTTPException(status_code=400, detail="A show-cause notice can only be issued for a newly reported case.")
        deadline = data.response_deadline or (data.issue_date + timedelta(days=MIN_SHOW_CAUSE_DAYS))
        if (deadline - data.issue_date).days < MIN_SHOW_CAUSE_DAYS:
            raise HTTPException(
                status_code=400,
                detail=f"The employee must be given at least {MIN_SHOW_CAUSE_DAYS} days to respond to a show-cause notice.",
            )
        content = data.notice_content or (
            f"You are hereby required to show cause in writing within {(deadline - data.issue_date).days} days why "
            f"disciplinary action should not be taken against you for: {case.allegation_title}."
        )
        notice = ShowCauseNotice(
            business_id=case.business_id,
            case_id=case.id,
            employee_id=case.employee_id,
            notice_number=self._next_number(db, ShowCauseNotice, case.business_id, "SCN"),
            issue_date=data.issue_date,
            response_deadline=deadline,
            notice_content=content,
        )
        db.add(notice)
        case.current_stage = CaseStageEnum.SHOW_CAUSE_ISSUED.value
        db.commit()
        db.refresh(case)
        return case

    def record_explanation(self, db: Session, business_id: Optional[int], case_id: uuid.UUID, data: ExplanationIn) -> DisciplinaryCase:
        case = self.get_case(db, business_id, case_id)
        if case.current_stage != CaseStageEnum.SHOW_CAUSE_ISSUED.value:
            raise HTTPException(status_code=400, detail="No open show-cause notice is awaiting an explanation.")
        notice = case.notices[-1]
        notice.employee_explanation = data.employee_explanation
        notice.explanation_received_date = data.explanation_received_date
        notice.explanation_accepted = data.explanation_accepted
        case.current_stage = CaseStageEnum.EXPLANATION_RECEIVED.value
        db.commit()
        db.refresh(case)
        return case

    def issue_action(self, db: Session, business_id: Optional[int], case_id: uuid.UUID, user_id: int, data: ActionIssue) -> DisciplinaryCase:
        case = self.get_case(db, business_id, case_id)
        if case.current_stage == CaseStageEnum.CLOSED.value:
            raise HTTPException(status_code=400, detail="This case is already closed.")
        sanction = _val(data.sanction_type)
        light = sanction in (SanctionTypeEnum.VERBAL_COUNSELING.value, SanctionTypeEnum.NO_ACTION.value)
        if not light:
            notice = case.notices[-1] if case.notices else None
            if not notice:
                raise HTTPException(status_code=400, detail="A show-cause notice must be issued before imposing this sanction.")
            responded = case.current_stage == CaseStageEnum.EXPLANATION_RECEIVED.value
            lapsed = today_bd() > notice.response_deadline
            if not responded and not lapsed:
                raise HTTPException(status_code=400, detail="Wait for the employee's explanation or for the response deadline to lapse.")
        if sanction == SanctionTypeEnum.SUSPENSION.value and not data.suspension_days:
            raise HTTPException(status_code=400, detail="suspension_days is required for a suspension.")

        action = DisciplinaryActionLog(
            business_id=case.business_id,
            case_id=case.id,
            employee_id=case.employee_id,
            sanction_type=sanction,
            effective_date=data.effective_date,
            suspension_days=data.suspension_days,
            subsistence_allowance_pct=(
                (data.subsistence_allowance_pct or DEFAULT_SUBSISTENCE_PCT) if sanction == SanctionTypeEnum.SUSPENSION.value else None
            ),
            remarks=data.remarks,
            letter_reference_no=f"WRN-{case.case_number}",
            issued_by_id=user_id,
        )
        db.add(action)
        case.current_stage = CaseStageEnum.CLOSED.value
        db.commit()
        db.refresh(case)
        return case

    # ================================================================== STATS
    def stats(self, db: Session, business_id: Optional[int]) -> LifecycleStats:
        today = today_bd()
        eq = db.query(Employee).filter(
            Employee.is_active.is_(True), Employee.confirmation_date.is_(None), Employee.probation_end_date.is_not(None)
        )
        if business_id is not None:
            eq = eq.filter(Employee.business_id == business_id)

        def scoped(model):
            q = db.query(func.count(model.id))
            return q.filter(model.business_id == business_id) if business_id is not None else q

        return LifecycleStats(
            on_probation=eq.count(),
            probation_due_30_days=eq.filter(
                Employee.probation_end_date >= today, Employee.probation_end_date <= today + timedelta(days=30)
            ).count(),
            probation_overdue=eq.filter(Employee.probation_end_date < today).count(),
            pending_movements=scoped(CareerMovement).filter(CareerMovement.status == MovementStatusEnum.PENDING_APPROVAL.value).scalar() or 0,
            open_disciplinary_cases=scoped(DisciplinaryCase).filter(DisciplinaryCase.current_stage != CaseStageEnum.CLOSED.value).scalar() or 0,
        )
