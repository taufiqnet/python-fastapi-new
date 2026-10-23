import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.performance.models import (
    AppraisalCycle,
    AppraisalStatusEnum,
    CycleStatusEnum,
    EmployeeGoal,
    GoalStatusEnum,
    PerformanceAppraisal,
)
from app.modules.hr_payroll.performance.schemas import (
    AppraisalCreate,
    CalibrateIn,
    CycleCreate,
    CycleUpdate,
    GoalCreate,
    GoalUpdate,
    ManagerReviewIn,
    PerformanceStats,
    SelfReviewIn,
)


def rating_label(score: Decimal) -> str:
    s = float(score)
    if s >= 4.5:
        return "outstanding"
    if s >= 3.5:
        return "exceeds_expectations"
    if s >= 2.5:
        return "meets_expectations"
    if s >= 1.5:
        return "needs_improvement"
    return "unsatisfactory"


def employee_full_name(emp: Optional[Employee]) -> Optional[str]:
    if not emp:
        return None
    return f"{emp.first_name} {emp.last_name or ''}".strip()


def _val(v):
    return v.value if hasattr(v, "value") else v


class PerformanceService:
    # ------------------------------------------------------------------ helpers
    def get_employee(self, db: Session, business_id: Optional[int], employee_id: uuid.UUID) -> Employee:
        q = db.query(Employee).filter(Employee.id == employee_id)
        if business_id is not None:
            q = q.filter(Employee.business_id == business_id)
        emp = q.first()
        if not emp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
        return emp

    def get_cycle(self, db: Session, business_id: Optional[int], cycle_id: uuid.UUID) -> AppraisalCycle:
        q = db.query(AppraisalCycle).filter(AppraisalCycle.id == cycle_id)
        if business_id is not None:
            q = q.filter(AppraisalCycle.business_id == business_id)
        cycle = q.first()
        if not cycle:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appraisal cycle not found.")
        return cycle

    # ------------------------------------------------------------------ cycles
    def create_cycle(self, db: Session, business_id: int, data: CycleCreate) -> AppraisalCycle:
        if data.end_date < data.start_date:
            raise HTTPException(status_code=400, detail="Cycle end date cannot be before start date.")
        payload = data.model_dump()
        payload["cycle_type"] = _val(payload["cycle_type"])
        cycle = AppraisalCycle(business_id=business_id, status=CycleStatusEnum.DRAFT.value, **payload)
        db.add(cycle)
        db.commit()
        db.refresh(cycle)
        return cycle

    def update_cycle(self, db: Session, business_id: Optional[int], cycle_id: uuid.UUID, data: CycleUpdate) -> AppraisalCycle:
        cycle = self.get_cycle(db, business_id, cycle_id)
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(cycle, k, _val(v))
        db.commit()
        db.refresh(cycle)
        return cycle

    def list_cycles(self, db: Session, business_id: Optional[int], status_filter: Optional[str] = None) -> List[AppraisalCycle]:
        q = db.query(AppraisalCycle)
        if business_id is not None:
            q = q.filter(AppraisalCycle.business_id == business_id)
        if status_filter:
            q = q.filter(AppraisalCycle.status == status_filter)
        return q.order_by(AppraisalCycle.start_date.desc()).all()

    # ------------------------------------------------------------------ goals
    def _weight_total(self, db: Session, employee_id, cycle_id, exclude_id=None) -> Decimal:
        q = db.query(func.coalesce(func.sum(EmployeeGoal.weightage), 0)).filter(
            EmployeeGoal.employee_id == employee_id, EmployeeGoal.cycle_id == cycle_id
        )
        if exclude_id:
            q = q.filter(EmployeeGoal.id != exclude_id)
        return Decimal(str(q.scalar() or 0))

    def create_goal(self, db: Session, business_id: int, data: GoalCreate) -> EmployeeGoal:
        self.get_employee(db, business_id, data.employee_id)
        self.get_cycle(db, business_id, data.cycle_id)
        total = self._weight_total(db, data.employee_id, data.cycle_id) + data.weightage
        if total > Decimal("100"):
            raise HTTPException(
                status_code=400,
                detail=f"Total goal weightage for this employee/cycle would be {total}%, which exceeds 100%.",
            )
        payload = data.model_dump()
        payload["category"] = _val(payload["category"])
        payload["metric_type"] = _val(payload["metric_type"])
        goal = EmployeeGoal(business_id=business_id, status=GoalStatusEnum.NOT_STARTED.value, **payload)
        db.add(goal)
        db.commit()
        db.refresh(goal)
        return goal

    def get_goal(self, db: Session, business_id: Optional[int], goal_id: uuid.UUID) -> EmployeeGoal:
        q = db.query(EmployeeGoal).filter(EmployeeGoal.id == goal_id)
        if business_id is not None:
            q = q.filter(EmployeeGoal.business_id == business_id)
        goal = q.first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found.")
        return goal

    def update_goal(self, db: Session, business_id: Optional[int], goal_id: uuid.UUID, data: GoalUpdate) -> EmployeeGoal:
        goal = self.get_goal(db, business_id, goal_id)
        changes = data.model_dump(exclude_unset=True)
        if "weightage" in changes and changes["weightage"] is not None:
            total = self._weight_total(db, goal.employee_id, goal.cycle_id, exclude_id=goal.id) + changes["weightage"]
            if total > Decimal("100"):
                raise HTTPException(status_code=400, detail=f"Total goal weightage would be {total}%, exceeding 100%.")
        for k, v in changes.items():
            setattr(goal, k, _val(v))
        db.commit()
        db.refresh(goal)
        return goal

    def delete_goal(self, db: Session, business_id: Optional[int], goal_id: uuid.UUID) -> None:
        goal = self.get_goal(db, business_id, goal_id)
        db.delete(goal)
        db.commit()

    def list_goals(
        self,
        db: Session,
        business_id: Optional[int],
        employee_id: Optional[uuid.UUID] = None,
        cycle_id: Optional[uuid.UUID] = None,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[EmployeeGoal]:
        q = db.query(EmployeeGoal)
        if business_id is not None:
            q = q.filter(EmployeeGoal.business_id == business_id)
        if employee_id:
            q = q.filter(EmployeeGoal.employee_id == employee_id)
        if cycle_id:
            q = q.filter(EmployeeGoal.cycle_id == cycle_id)
        if status_filter:
            q = q.filter(EmployeeGoal.status == status_filter)
        if search:
            q = q.filter(EmployeeGoal.title.ilike(f"%{search}%"))
        return q.order_by(EmployeeGoal.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def achievement_pct(goal: EmployeeGoal) -> Optional[Decimal]:
        target = Decimal(str(goal.target_value or 0))
        if target <= 0:
            return None
        return (Decimal(str(goal.achieved_value or 0)) / target * 100).quantize(Decimal("0.01"))

    # ------------------------------------------------------------------ appraisals
    def create_appraisal(self, db: Session, business_id: int, data: AppraisalCreate) -> PerformanceAppraisal:
        emp = self.get_employee(db, business_id, data.employee_id)
        self.get_cycle(db, business_id, data.cycle_id)
        dup = (
            db.query(PerformanceAppraisal)
            .filter(PerformanceAppraisal.employee_id == data.employee_id, PerformanceAppraisal.cycle_id == data.cycle_id)
            .first()
        )
        if dup:
            raise HTTPException(status_code=400, detail="An appraisal already exists for this employee in the selected cycle.")
        appraisal = PerformanceAppraisal(
            business_id=business_id,
            employee_id=data.employee_id,
            cycle_id=data.cycle_id,
            reviewer_id=data.reviewer_id or emp.direct_manager_id,
            status=AppraisalStatusEnum.SELF_REVIEW_PENDING.value,
        )
        db.add(appraisal)
        db.commit()
        db.refresh(appraisal)
        return appraisal

    def get_appraisal(self, db: Session, business_id: Optional[int], appraisal_id: uuid.UUID) -> PerformanceAppraisal:
        q = db.query(PerformanceAppraisal).filter(PerformanceAppraisal.id == appraisal_id)
        if business_id is not None:
            q = q.filter(PerformanceAppraisal.business_id == business_id)
        a = q.first()
        if not a:
            raise HTTPException(status_code=404, detail="Appraisal not found.")
        return a

    def list_appraisals(
        self,
        db: Session,
        business_id: Optional[int],
        employee_id: Optional[uuid.UUID] = None,
        cycle_id: Optional[uuid.UUID] = None,
        status_filter: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[PerformanceAppraisal]:
        q = db.query(PerformanceAppraisal)
        if business_id is not None:
            q = q.filter(PerformanceAppraisal.business_id == business_id)
        if employee_id:
            q = q.filter(PerformanceAppraisal.employee_id == employee_id)
        if cycle_id:
            q = q.filter(PerformanceAppraisal.cycle_id == cycle_id)
        if status_filter:
            q = q.filter(PerformanceAppraisal.status == status_filter)
        return q.order_by(PerformanceAppraisal.created_at.desc()).offset(skip).limit(limit).all()

    def _require_stage(self, a: PerformanceAppraisal, expected: AppraisalStatusEnum) -> None:
        if a.status != expected.value:
            raise HTTPException(
                status_code=400,
                detail=f"Appraisal is in '{a.status}' stage; expected '{expected.value}'.",
            )

    def submit_self_review(self, db: Session, business_id: Optional[int], appraisal_id: uuid.UUID, data: SelfReviewIn):
        a = self.get_appraisal(db, business_id, appraisal_id)
        self._require_stage(a, AppraisalStatusEnum.SELF_REVIEW_PENDING)
        a.self_evaluation_text = data.self_evaluation_text
        a.self_overall_score = data.self_overall_score
        a.status = AppraisalStatusEnum.MANAGER_REVIEW_PENDING.value
        db.commit()
        db.refresh(a)
        return a

    def submit_manager_review(self, db: Session, business_id: Optional[int], appraisal_id: uuid.UUID, data: ManagerReviewIn):
        a = self.get_appraisal(db, business_id, appraisal_id)
        self._require_stage(a, AppraisalStatusEnum.MANAGER_REVIEW_PENDING)
        for k, v in data.model_dump().items():
            setattr(a, k, v)
        a.status = AppraisalStatusEnum.CALIBRATION_PENDING.value
        db.commit()
        db.refresh(a)
        return a

    def calibrate(self, db: Session, business_id: Optional[int], appraisal_id: uuid.UUID, data: CalibrateIn):
        a = self.get_appraisal(db, business_id, appraisal_id)
        self._require_stage(a, AppraisalStatusEnum.CALIBRATION_PENDING)
        a.calibrated_score = data.calibrated_score
        a.final_rating_label = rating_label(data.calibrated_score)
        a.discussion_date = data.discussion_date
        a.status = AppraisalStatusEnum.ACKNOWLEDGEMENT_PENDING.value
        db.commit()
        db.refresh(a)
        return a

    def acknowledge(self, db: Session, business_id: Optional[int], appraisal_id: uuid.UUID):
        a = self.get_appraisal(db, business_id, appraisal_id)
        self._require_stage(a, AppraisalStatusEnum.ACKNOWLEDGEMENT_PENDING)
        a.employee_acknowledged_at = datetime.now(timezone.utc)
        a.status = AppraisalStatusEnum.COMPLETED.value
        db.commit()
        db.refresh(a)
        return a

    # ------------------------------------------------------------------ stats
    def stats(self, db: Session, business_id: Optional[int]) -> PerformanceStats:
        def scoped(model):
            q = db.query(func.count(model.id))
            return q.filter(model.business_id == business_id) if business_id is not None else q

        open_cycles = (CycleStatusEnum.GOAL_SETTING.value, CycleStatusEnum.IN_REVIEW.value, CycleStatusEnum.CALIBRATING.value)
        return PerformanceStats(
            active_cycles=scoped(AppraisalCycle).filter(AppraisalCycle.status.in_(open_cycles)).scalar() or 0,
            total_goals=scoped(EmployeeGoal).scalar() or 0,
            goals_completed=scoped(EmployeeGoal).filter(EmployeeGoal.status == GoalStatusEnum.COMPLETED.value).scalar() or 0,
            goals_at_risk=scoped(EmployeeGoal).filter(EmployeeGoal.status == GoalStatusEnum.AT_RISK.value).scalar() or 0,
            appraisals_pending=scoped(PerformanceAppraisal)
            .filter(PerformanceAppraisal.status != AppraisalStatusEnum.COMPLETED.value)
            .scalar()
            or 0,
            appraisals_completed=scoped(PerformanceAppraisal)
            .filter(PerformanceAppraisal.status == AppraisalStatusEnum.COMPLETED.value)
            .scalar()
            or 0,
        )
