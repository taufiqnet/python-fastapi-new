import calendar
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.core.identity.models import User
from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.organization.models import Department
from app.modules.hr_payroll.roster.models import (
    DutyAssignBatch,
    DutyAssignment,
    DutyAssignmentSourceEnum,
    DutyAssignmentStatusEnum,
    DutyBatchStatusEnum,
    MonthlyRoster,
    MonthlyRosterStatusEnum,
    RosterChangeApplication,
    RosterChangeStatusEnum,
    RosterExchangeApplication,
    RosterExchangeStatusEnum,
    Shift,
)
from app.modules.hr_payroll.roster.repository import RosterRepository
from app.modules.hr_payroll.roster.schemas import (
    DepartmentRosterStatusOut,
    DepartmentRosterToggle,
    DutyAssignBatchCreate,
    DutyAssignBatchOut,
    DutyAssignBatchReview,
    DutyAssignmentBulkCreate,
    DutyAssignmentItem,
    DutyAssignmentOut,
    EmployeeMatrixRow,
    MonthlyRosterBulkCellUpdate,
    MonthlyRosterCreate,
    MonthlyRosterMatrixOut,
    MonthlyRosterOut,
    MonthlyRosterReview,
    RestDayViolation,
    RosterChangeCreate,
    RosterChangeOut,
    RosterChangeReview,
    RosterExchangeCreate,
    RosterExchangeManagerReview,
    RosterExchangeOut,
    RosterExchangePeerReview,
    ShiftCreate,
    ShiftOut,
    ShiftUpdate,
)


class RosterService:
    def __init__(self, repository: RosterRepository | None = None):
        self.repo = repository or RosterRepository()

    # ── Shift Management ────────────────────────────────────────────────
    def seed_default_shifts_if_needed(self, db: Session, business_id: int) -> list[Shift]:
        shifts = self.repo.get_shifts(db, business_id)
        if shifts:
            return shifts

        defaults = [
            Shift(
                business_id=business_id,
                name="Morning Shift",
                code="MS-1",
                start_time=datetime.strptime("08:00", "%H:%M").time(),
                end_time=datetime.strptime("16:30", "%H:%M").time(),
                work_hours=8.0,
                break_duration_minutes=30,
                grace_in_minutes=15,
                grace_out_minutes=15,
                is_night_shift=False,
                is_off_day=False,
                color_code="#3B82F6",
                is_active=True,
            ),
            Shift(
                business_id=business_id,
                name="Evening Shift",
                code="ES-2",
                start_time=datetime.strptime("16:00", "%H:%M").time(),
                end_time=datetime.strptime("00:30", "%H:%M").time(),
                work_hours=8.0,
                break_duration_minutes=30,
                grace_in_minutes=15,
                grace_out_minutes=15,
                is_night_shift=False,
                is_off_day=False,
                color_code="#F59E0B",
                is_active=True,
            ),
            Shift(
                business_id=business_id,
                name="Night Shift",
                code="NS-3",
                start_time=datetime.strptime("00:00", "%H:%M").time(),
                end_time=datetime.strptime("08:30", "%H:%M").time(),
                work_hours=8.0,
                break_duration_minutes=30,
                grace_in_minutes=15,
                grace_out_minutes=15,
                is_night_shift=True,
                is_off_day=False,
                color_code="#8B5CF6",
                is_active=True,
            ),
            Shift(
                business_id=business_id,
                name="Weekly Rest Day",
                code="OFF",
                start_time=None,
                end_time=None,
                work_hours=0.0,
                break_duration_minutes=0,
                grace_in_minutes=0,
                grace_out_minutes=0,
                is_night_shift=False,
                is_off_day=True,
                color_code="#64748B",
                is_active=True,
            ),
        ]
        for s in defaults:
            db.add(s)
        db.commit()
        return self.repo.get_shifts(db, business_id)

    def get_shifts(
        self, db: Session, business_id: int, is_active: bool | None = None
    ) -> list[Shift]:
        shifts = self.repo.get_shifts(db, business_id, is_active=is_active)
        if not shifts and is_active is not False:
            shifts = self.seed_default_shifts_if_needed(db, business_id)
        return shifts

    def create_shift(self, db: Session, payload: ShiftCreate, business_id: int) -> Shift:
        existing = self.repo.get_shift_by_code(db, payload.code.strip().upper(), business_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Shift code '{payload.code}' already exists for this business.",
            )

        shift = Shift(
            business_id=business_id,
            name=payload.name.strip(),
            code=payload.code.strip().upper(),
            start_time=payload.start_time,
            end_time=payload.end_time,
            work_hours=payload.work_hours,
            break_duration_minutes=payload.break_duration_minutes,
            grace_in_minutes=payload.grace_in_minutes,
            grace_out_minutes=payload.grace_out_minutes,
            is_night_shift=payload.is_night_shift,
            is_off_day=payload.is_off_day,
            color_code=payload.color_code,
            is_active=payload.is_active,
        )
        return self.repo.create_shift(db, shift)

    def update_shift(
        self, db: Session, shift_id: uuid.UUID, payload: ShiftUpdate, business_id: int
    ) -> Shift:
        shift = self.repo.get_shift_by_id(db, shift_id, business_id)
        if not shift:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found."
            )

        if payload.code is not None:
            new_code = payload.code.strip().upper()
            if new_code != shift.code:
                existing = self.repo.get_shift_by_code(db, new_code, business_id)
                if existing:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Shift code '{new_code}' already exists.",
                    )
                shift.code = new_code

        if payload.name is not None:
            shift.name = payload.name.strip()
        if payload.start_time is not None:
            shift.start_time = payload.start_time
        if payload.end_time is not None:
            shift.end_time = payload.end_time
        if payload.work_hours is not None:
            shift.work_hours = payload.work_hours
        if payload.break_duration_minutes is not None:
            shift.break_duration_minutes = payload.break_duration_minutes
        if payload.grace_in_minutes is not None:
            shift.grace_in_minutes = payload.grace_in_minutes
        if payload.grace_out_minutes is not None:
            shift.grace_out_minutes = payload.grace_out_minutes
        if payload.is_night_shift is not None:
            shift.is_night_shift = payload.is_night_shift
        if payload.is_off_day is not None:
            shift.is_off_day = payload.is_off_day
        if payload.color_code is not None:
            shift.color_code = payload.color_code
        if payload.is_active is not None:
            shift.is_active = payload.is_active

        return self.repo.update_shift(db, shift)

    def delete_shift(self, db: Session, shift_id: uuid.UUID, business_id: int) -> None:
        shift = self.repo.get_shift_by_id(db, shift_id, business_id)
        if not shift:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found."
            )
        # Check if duty assignments exist
        stmt = select(DutyAssignment).where(DutyAssignment.shift_id == shift_id).limit(1)
        if db.scalar(stmt):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete shift that has recorded duty assignments. Mark it inactive instead.",
            )
        self.repo.delete_shift(db, shift)

    # ── Department Roster Config ────────────────────────────────────────
    def get_departments_config(
        self, db: Session, business_id: int
    ) -> list[DepartmentRosterStatusOut]:
        depts = self.repo.get_departments(db, business_id)
        res = []
        for d in depts:
            res.append(
                DepartmentRosterStatusOut(
                    id=d.id,
                    name=d.name,
                    code=d.code,
                    is_roster_enabled=bool(d.is_roster_enabled),
                    employee_count=d.employee_count,
                )
            )
        return res

    def toggle_department_roster(
        self,
        db: Session,
        department_id: uuid.UUID,
        payload: DepartmentRosterToggle,
        business_id: int,
    ) -> DepartmentRosterStatusOut:
        dept = self.repo.get_department_by_id(db, department_id, business_id)
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Department not found."
            )
        dept = self.repo.set_department_roster_enabled(
            db, dept, payload.is_roster_enabled
        )
        return DepartmentRosterStatusOut(
            id=dept.id,
            name=dept.name,
            code=dept.code,
            is_roster_enabled=bool(dept.is_roster_enabled),
            employee_count=dept.employee_count,
        )

    # ── Monthly Roster & Matrix Planner ─────────────────────────────────
    def _validate_bla_rest_days(
        self,
        duties_by_date: dict[date, Shift],
        employee_id: uuid.UUID,
        employee_name: str,
        start_date: date,
        end_date: date,
    ) -> list[RestDayViolation]:
        """
        Bangladesh Labour Act 2006 (Sec 103):
        Mandatory 1 weekly rest day (at least 24 consecutive hours) in every 7 days.
        Flags consecutive working days >= 7 without an OFF day.
        """
        violations = []
        consecutive_work_days = 0
        window_start = None

        curr = start_date
        while curr <= end_date:
            shift = duties_by_date.get(curr)
            is_working_day = (shift is not None) and (not shift.is_off_day)

            if is_working_day:
                if consecutive_work_days == 0:
                    window_start = curr
                consecutive_work_days += 1
                if consecutive_work_days >= 7:
                    violations.append(
                        RestDayViolation(
                            employee_id=employee_id,
                            employee_name=employee_name,
                            consecutive_work_days=consecutive_work_days,
                            start_date=window_start or curr,
                            end_date=curr,
                        )
                    )
            else:
                consecutive_work_days = 0
                window_start = None

            curr += timedelta(days=1)

        return violations

    def get_monthly_roster_matrix(
        self,
        db: Session,
        department_id: uuid.UUID,
        year: int,
        month: int,
        business_id: int,
    ) -> MonthlyRosterMatrixOut:
        dept = self.repo.get_department_by_id(db, department_id, business_id)
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Department not found."
            )

        # Days in month
        num_days = calendar.monthrange(year, month)[1]
        start_date = date(year, month, 1)
        end_date = date(year, month, num_days)

        # Shifts
        shifts = self.get_shifts(db, business_id, is_active=True)
        shifts_map = {s.id: s for s in shifts}

        # Monthly Roster header
        m_roster = self.repo.get_monthly_roster(
            db, business_id, department_id, year, month
        )

        # Employees in department
        stmt = (
            select(Employee)
            .where(
                and_(
                    Employee.business_id == business_id,
                    Employee.department_id == department_id,
                    Employee.is_active.is_(True),
                )
            )
            .order_by(Employee.first_name.asc(), Employee.last_name.asc())
        )
        employees = list(db.scalars(stmt).all())

        # Existing duties
        assignments = self.repo.get_assignments(
            db,
            business_id=business_id,
            department_id=department_id,
            start_date=start_date,
            end_date=end_date,
        )
        duty_lookup: dict[tuple[uuid.UUID, date], DutyAssignment] = {
            (a.employee_id, a.date): a for a in assignments
        }

        # Build rows and compute compliance
        rows: list[EmployeeMatrixRow] = []
        all_violations: list[RestDayViolation] = []
        daily_shift_counts: dict[str, dict[str, int]] = {
            f"{year}-{month:02d}-{d:02d}": {} for d in range(1, num_days + 1)
        }

        for emp in employees:
            emp_duties: dict[str, DutyAssignmentOut] = {}
            duties_for_bla: dict[date, Shift] = {}
            total_shifts = 0
            total_off = 0
            total_hours = 0.0

            for d in range(1, num_days + 1):
                cur_date = date(year, month, d)
                date_str = cur_date.isoformat()
                assignment = duty_lookup.get((emp.id, cur_date))

                if assignment and assignment.shift_id in shifts_map:
                    shift_obj = shifts_map[assignment.shift_id]
                    duties_for_bla[cur_date] = shift_obj
                    shift_out = ShiftOut.model_validate(shift_obj)

                    out_assign = DutyAssignmentOut(
                        id=assignment.id,
                        business_id=assignment.business_id,
                        monthly_roster_id=assignment.monthly_roster_id,
                        batch_id=assignment.batch_id,
                        employee_id=assignment.employee_id,
                        department_id=assignment.department_id,
                        date=assignment.date,
                        shift_id=assignment.shift_id,
                        status=assignment.status,
                        source=assignment.source,
                        notes=assignment.notes,
                        created_at=assignment.created_at,
                        updated_at=assignment.updated_at,
                        employee_name=emp.full_name,
                        employee_code=emp.employee_id,
                        department_name=dept.name,
                        shift=shift_out,
                    )
                    emp_duties[date_str] = out_assign

                    # Count for daily totals
                    s_code = shift_obj.code
                    daily_shift_counts[date_str][s_code] = (
                        daily_shift_counts[date_str].get(s_code, 0) + 1
                    )

                    if shift_obj.is_off_day:
                        total_off += 1
                    else:
                        total_shifts += 1
                        total_hours += shift_obj.work_hours

            # Validate BLA 2006 for this employee
            emp_violations = self._validate_bla_rest_days(
                duties_for_bla, emp.id, emp.full_name, start_date, end_date
            )
            all_violations.extend(emp_violations)

            rows.append(
                EmployeeMatrixRow(
                    employee_id=emp.id,
                    employee_name=emp.full_name,
                    employee_code=emp.employee_id,
                    job_title=emp.job_title.name if getattr(emp, "job_title", None) else None,
                    duties=emp_duties,
                    total_shifts=total_shifts,
                    total_off_days=total_off,
                    total_work_hours=round(total_hours, 2),
                )
            )

        m_out = None
        if m_roster:
            m_out = MonthlyRosterOut(
                id=m_roster.id,
                business_id=m_roster.business_id,
                department_id=m_roster.department_id,
                department_name=dept.name,
                year=m_roster.year,
                month=m_roster.month,
                status=m_roster.status,
                submitted_by_id=m_roster.submitted_by_id,
                submitted_by_name=m_roster.submitted_by.full_name if m_roster.submitted_by else None,
                submitted_at=m_roster.submitted_at,
                approved_by_id=m_roster.approved_by_id,
                approved_by_name=m_roster.approved_by.full_name if m_roster.approved_by else None,
                approved_at=m_roster.approved_at,
                rejection_reason=m_roster.rejection_reason,
                notes=m_roster.notes,
                total_assignments=len(assignments),
                created_at=m_roster.created_at,
            )

        return MonthlyRosterMatrixOut(
            monthly_roster=m_out,
            department_id=dept.id,
            department_name=dept.name,
            is_roster_enabled=bool(dept.is_roster_enabled),
            year=year,
            month=month,
            days_in_month=num_days,
            shifts=[ShiftOut.model_validate(s) for s in shifts],
            rows=rows,
            daily_shift_counts=daily_shift_counts,
            rest_day_violations=all_violations,
        )

    def save_monthly_roster_cells(
        self,
        db: Session,
        department_id: uuid.UUID,
        year: int,
        month: int,
        payload: MonthlyRosterBulkCellUpdate,
        business_id: int,
    ) -> dict[str, Any]:
        dept = self.repo.get_department_by_id(db, department_id, business_id)
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Department not found."
            )

        m_roster = self.repo.get_monthly_roster(
            db, business_id, department_id, year, month
        )
        if not m_roster:
            m_roster = MonthlyRoster(
                business_id=business_id,
                department_id=department_id,
                year=year,
                month=month,
                status=MonthlyRosterStatusEnum.DRAFT,
            )
            m_roster = self.repo.create_monthly_roster(db, m_roster)
        elif m_roster.status == MonthlyRosterStatusEnum.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Monthly roster has already been approved and locked. Use Roster Change or Exchange application.",
            )

        saved_count = 0
        assign_status = (
            DutyAssignmentStatusEnum.APPROVED
            if m_roster.status == MonthlyRosterStatusEnum.APPROVED
            else DutyAssignmentStatusEnum.DRAFT
        )

        for cell in payload.cells:
            self.repo.upsert_assignment(
                db,
                business_id=business_id,
                employee_id=cell.employee_id,
                department_id=department_id,
                date_val=cell.date,
                shift_id=cell.shift_id,
                source=DutyAssignmentSourceEnum.MONTHLY_ROSTER,
                status=assign_status,
                monthly_roster_id=m_roster.id,
                notes=cell.notes,
            )
            saved_count += 1

        return {
            "monthly_roster_id": str(m_roster.id),
            "saved_count": saved_count,
            "status": m_roster.status,
            "message": f"Successfully updated {saved_count} duty cells.",
        }

    def submit_monthly_roster(
        self,
        db: Session,
        roster_id: uuid.UUID,
        business_id: int,
        current_user: User,
    ) -> MonthlyRoster:
        roster = self.repo.get_monthly_roster_by_id(db, roster_id, business_id)
        if not roster:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Monthly roster not found."
            )
        if roster.status == MonthlyRosterStatusEnum.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Roster is already approved.",
            )

        roster.status = MonthlyRosterStatusEnum.SUBMITTED
        roster.submitted_at = datetime.now(timezone.utc)
        if hasattr(current_user, "employee_id") and current_user.employee_id:
            roster.submitted_by_id = current_user.employee_id

        db.commit()
        db.refresh(roster)
        return roster

    def review_monthly_roster(
        self,
        db: Session,
        roster_id: uuid.UUID,
        payload: MonthlyRosterReview,
        business_id: int,
        current_user: User,
    ) -> MonthlyRoster:
        roster = self.repo.get_monthly_roster_by_id(db, roster_id, business_id)
        if not roster:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Monthly roster not found."
            )

        now = datetime.now(timezone.utc)
        reviewer_id = getattr(current_user, "employee_id", None)

        if payload.action == "approve":
            roster.status = MonthlyRosterStatusEnum.APPROVED
            roster.approved_at = now
            roster.approved_by_id = reviewer_id
            roster.rejection_reason = None

            # Activate all child duty assignments
            stmt = select(DutyAssignment).where(
                DutyAssignment.monthly_roster_id == roster.id
            )
            assignments = list(db.scalars(stmt).all())
            for a in assignments:
                a.status = DutyAssignmentStatusEnum.APPROVED
        else:
            roster.status = MonthlyRosterStatusEnum.REJECTED
            roster.rejection_reason = payload.reason or "Rejected by supervisor/HR."

        db.commit()
        db.refresh(roster)
        return roster

    # ── Duty Assign Batches (Direct Scheduling) ─────────────────────────
    def create_duty_assign_batch(
        self,
        db: Session,
        payload: DutyAssignBatchCreate,
        business_id: int,
        current_user: User,
    ) -> DutyAssignBatch:
        dept = self.repo.get_department_by_id(db, payload.department_id, business_id)
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Department not found."
            )

        batch = DutyAssignBatch(
            business_id=business_id,
            department_id=payload.department_id,
            title=payload.title.strip(),
            start_date=payload.start_date,
            end_date=payload.end_date,
            assigned_count=len(payload.assignments),
            status=DutyBatchStatusEnum.PENDING_APPROVAL,
            submitted_by_id=getattr(current_user, "employee_id", None),
        )
        batch = self.repo.create_batch(db, batch)

        for item in payload.assignments:
            self.repo.upsert_assignment(
                db,
                business_id=business_id,
                employee_id=item.employee_id,
                department_id=payload.department_id,
                date_val=item.date,
                shift_id=item.shift_id,
                source=DutyAssignmentSourceEnum.DIRECT_ASSIGN,
                status=DutyAssignmentStatusEnum.DRAFT,
                batch_id=batch.id,
                notes=item.notes,
            )

        return batch

    def review_duty_assign_batch(
        self,
        db: Session,
        batch_id: uuid.UUID,
        payload: DutyAssignBatchReview,
        business_id: int,
        current_user: User,
    ) -> DutyAssignBatch:
        batch = self.repo.get_batch_by_id(db, batch_id, business_id)
        if not batch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Duty batch not found."
            )

        now = datetime.now(timezone.utc)
        reviewer_id = getattr(current_user, "employee_id", None)

        if payload.action == "approve":
            batch.status = DutyBatchStatusEnum.APPROVED
            batch.approved_at = now
            batch.approved_by_id = reviewer_id
            batch.rejection_reason = None

            # Activate duty assignments
            stmt = select(DutyAssignment).where(DutyAssignment.batch_id == batch.id)
            assignments = list(db.scalars(stmt).all())
            for a in assignments:
                a.status = DutyAssignmentStatusEnum.APPROVED
        else:
            batch.status = DutyBatchStatusEnum.REJECTED
            batch.rejection_reason = payload.reason or "Rejected by supervisor/HR."

            # Cancel duty assignments
            stmt = select(DutyAssignment).where(DutyAssignment.batch_id == batch.id)
            assignments = list(db.scalars(stmt).all())
            for a in assignments:
                a.status = DutyAssignmentStatusEnum.CANCELLED

        db.commit()
        db.refresh(batch)
        return batch

    # ── Roster Change Application & Approval ────────────────────────────
    def create_roster_change_request(
        self, db: Session, payload: RosterChangeCreate, business_id: int
    ) -> RosterChangeApplication:
        # Check active assignment on that date
        duty = self.repo.get_assignment_for_date(
            db, payload.employee_id, payload.date, business_id
        )
        if not duty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No approved duty assignment found for employee on {payload.date}.",
            )
        if duty.shift_id == payload.requested_shift_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Requested shift is identical to currently assigned shift.",
            )

        req = RosterChangeApplication(
            business_id=business_id,
            employee_id=payload.employee_id,
            duty_assignment_id=duty.id,
            date=payload.date,
            current_shift_id=duty.shift_id,
            requested_shift_id=payload.requested_shift_id,
            reason=payload.reason.strip(),
            status=RosterChangeStatusEnum.PENDING,
        )
        return self.repo.create_change_request(db, req)

    def review_roster_change_request(
        self,
        db: Session,
        req_id: uuid.UUID,
        payload: RosterChangeReview,
        business_id: int,
        current_user: User,
    ) -> RosterChangeApplication:
        req = self.repo.get_change_request_by_id(db, req_id, business_id)
        if not req:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Change request not found."
            )
        if req.status != RosterChangeStatusEnum.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot review request with status '{req.status}'.",
            )

        now = datetime.now(timezone.utc)
        req.reviewed_at = now
        req.reviewed_by_id = getattr(current_user, "employee_id", None)
        req.review_note = payload.note

        if payload.action == "approve":
            req.status = RosterChangeStatusEnum.APPROVED
            # Update the underlying duty assignment
            duty = self.repo.get_assignment_for_date(
                db, req.employee_id, req.date, business_id
            )
            if duty:
                duty.shift_id = req.requested_shift_id
                duty.source = DutyAssignmentSourceEnum.SHIFT_CHANGE
                duty.notes = f"Shift changed via approved request #{str(req.id)[:8]}"
        else:
            req.status = RosterChangeStatusEnum.REJECTED

        db.commit()
        db.refresh(req)
        return req

    # ── Roster Exchange Application & Approval (Shift Swap) ────────────
    def create_roster_exchange_request(
        self, db: Session, payload: RosterExchangeCreate, business_id: int
    ) -> RosterExchangeApplication:
        if payload.requesting_employee_id == payload.target_employee_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot exchange shift with oneself.",
            )

        duty_req = self.repo.get_assignment_for_date(
            db, payload.requesting_employee_id, payload.requesting_date, business_id
        )
        if not duty_req:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Requesting employee has no approved duty on {payload.requesting_date}.",
            )

        duty_target = self.repo.get_assignment_for_date(
            db, payload.target_employee_id, payload.target_date, business_id
        )
        if not duty_target:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Target employee has no approved duty on {payload.target_date}.",
            )

        exchange = RosterExchangeApplication(
            business_id=business_id,
            requesting_employee_id=payload.requesting_employee_id,
            target_employee_id=payload.target_employee_id,
            requesting_date=payload.requesting_date,
            requesting_shift_id=duty_req.shift_id,
            target_date=payload.target_date,
            target_shift_id=duty_target.shift_id,
            reason=payload.reason.strip(),
            status=RosterExchangeStatusEnum.PENDING_PEER_APPROVAL,
        )
        return self.repo.create_exchange_request(db, exchange)

    def peer_review_exchange(
        self,
        db: Session,
        req_id: uuid.UUID,
        payload: RosterExchangePeerReview,
        business_id: int,
        current_user: User,
    ) -> RosterExchangeApplication:
        req = self.repo.get_exchange_request_by_id(db, req_id, business_id)
        if not req:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Exchange request not found."
            )
        if req.status != RosterExchangeStatusEnum.PENDING_PEER_APPROVAL:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Request is not awaiting peer acceptance.",
            )

        req.peer_reviewed_at = datetime.now(timezone.utc)
        req.peer_note = payload.peer_note

        if payload.action == "accept":
            req.status = RosterExchangeStatusEnum.PENDING_MANAGER_APPROVAL
        else:
            req.status = RosterExchangeStatusEnum.REJECTED

        db.commit()
        db.refresh(req)
        return req

    def manager_review_exchange(
        self,
        db: Session,
        req_id: uuid.UUID,
        payload: RosterExchangeManagerReview,
        business_id: int,
        current_user: User,
    ) -> RosterExchangeApplication:
        req = self.repo.get_exchange_request_by_id(db, req_id, business_id)
        if not req:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Exchange request not found."
            )
        if req.status != RosterExchangeStatusEnum.PENDING_MANAGER_APPROVAL:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Request must be accepted by peer before manager approval.",
            )

        now = datetime.now(timezone.utc)
        req.reviewed_at = now
        req.reviewed_by_id = getattr(current_user, "employee_id", None)
        req.review_note = payload.review_note

        if payload.action == "approve":
            req.status = RosterExchangeStatusEnum.APPROVED

            # Atomically swap shifts on underlying duty assignments
            duty_req = self.repo.get_assignment_for_date(
                db, req.requesting_employee_id, req.requesting_date, business_id
            )
            duty_target = self.repo.get_assignment_for_date(
                db, req.target_employee_id, req.target_date, business_id
            )

            if duty_req and duty_target:
                # Swap shift IDs
                duty_req.shift_id, duty_target.shift_id = (
                    req.target_shift_id,
                    req.requesting_shift_id,
                )
                duty_req.source = DutyAssignmentSourceEnum.SHIFT_EXCHANGE
                duty_target.source = DutyAssignmentSourceEnum.SHIFT_EXCHANGE
                duty_req.notes = f"Shift swapped with {req.target_employee.full_name} via exchange #{str(req.id)[:8]}"
                duty_target.notes = f"Shift swapped with {req.requesting_employee.full_name} via exchange #{str(req.id)[:8]}"
        else:
            req.status = RosterExchangeStatusEnum.REJECTED

        db.commit()
        db.refresh(req)
        return req

    # ── Zero-Dependency Fallback Query Helper ───────────────────────────
    def get_employee_scheduled_shift(
        self, db: Session, employee: Employee, date_val: date, business_id: int
    ) -> Shift | None:
        """
        Used by AttendanceService to resolve scheduled shift.
        If employee's department is NOT roster-enabled, returns None immediately (fallback to standard 8h day).
        If roster-enabled, retrieves approved DutyAssignment's Shift.
        """
        if not employee.department or not employee.department.is_roster_enabled:
            return None

        duty = self.repo.get_assignment_for_date(db, employee.id, date_val, business_id)
        if duty and duty.shift:
            return duty.shift

        return None
