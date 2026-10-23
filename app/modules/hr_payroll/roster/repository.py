import uuid
from datetime import date as date_type
from typing import Sequence

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

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


class RosterRepository:
    # ── Shifts ──────────────────────────────────────────────────────────
    def get_shifts(
        self, db: Session, business_id: int, is_active: bool | None = None
    ) -> list[Shift]:
        stmt = select(Shift).where(Shift.business_id == business_id)
        if is_active is not None:
            stmt = stmt.where(Shift.is_active == is_active)
        stmt = stmt.order_by(Shift.is_off_day.asc(), Shift.code.asc())
        return list(db.scalars(stmt).all())

    def get_shift_by_id(
        self, db: Session, shift_id: uuid.UUID, business_id: int
    ) -> Shift | None:
        stmt = select(Shift).where(
            and_(Shift.id == shift_id, Shift.business_id == business_id)
        )
        return db.scalar(stmt)

    def get_shift_by_code(
        self, db: Session, code: str, business_id: int
    ) -> Shift | None:
        stmt = select(Shift).where(
            and_(Shift.code == code, Shift.business_id == business_id)
        )
        return db.scalar(stmt)

    def create_shift(self, db: Session, shift: Shift) -> Shift:
        db.add(shift)
        db.commit()
        db.refresh(shift)
        return shift

    def update_shift(self, db: Session, shift: Shift) -> Shift:
        db.commit()
        db.refresh(shift)
        return shift

    def delete_shift(self, db: Session, shift: Shift) -> None:
        db.delete(shift)
        db.commit()

    # ── Departments Roster Status ──────────────────────────────────────
    def get_departments(self, db: Session, business_id: int) -> list[Department]:
        stmt = (
            select(Department)
            .where(Department.business_id == business_id)
            .order_by(Department.name.asc())
        )
        return list(db.scalars(stmt).all())

    def get_department_by_id(
        self, db: Session, department_id: uuid.UUID, business_id: int
    ) -> Department | None:
        stmt = select(Department).where(
            and_(Department.id == department_id, Department.business_id == business_id)
        )
        return db.scalar(stmt)

    def set_department_roster_enabled(
        self, db: Session, department: Department, is_roster_enabled: bool
    ) -> Department:
        department.is_roster_enabled = is_roster_enabled
        db.commit()
        db.refresh(department)
        return department

    # ── Duty Assignments ───────────────────────────────────────────────
    def get_assignments(
        self,
        db: Session,
        business_id: int,
        department_id: uuid.UUID | None = None,
        employee_id: uuid.UUID | None = None,
        start_date: date_type | None = None,
        end_date: date_type | None = None,
        status: DutyAssignmentStatusEnum | None = None,
    ) -> list[DutyAssignment]:
        stmt = (
            select(DutyAssignment)
            .options(
                joinedload(DutyAssignment.employee),
                joinedload(DutyAssignment.department),
                joinedload(DutyAssignment.shift),
            )
            .where(DutyAssignment.business_id == business_id)
        )
        if department_id:
            stmt = stmt.where(DutyAssignment.department_id == department_id)
        if employee_id:
            stmt = stmt.where(DutyAssignment.employee_id == employee_id)
        if start_date:
            stmt = stmt.where(DutyAssignment.date >= start_date)
        if end_date:
            stmt = stmt.where(DutyAssignment.date <= end_date)
        if status:
            stmt = stmt.where(DutyAssignment.status == status)

        stmt = stmt.order_by(DutyAssignment.date.asc(), DutyAssignment.employee_id.asc())
        return list(db.scalars(stmt).unique().all())

    def get_assignment_for_date(
        self, db: Session, employee_id: uuid.UUID, att_date: date_type, business_id: int
    ) -> DutyAssignment | None:
        stmt = (
            select(DutyAssignment)
            .options(joinedload(DutyAssignment.shift))
            .where(
                and_(
                    DutyAssignment.business_id == business_id,
                    DutyAssignment.employee_id == employee_id,
                    DutyAssignment.date == att_date,
                    DutyAssignment.status == DutyAssignmentStatusEnum.APPROVED,
                )
            )
        )
        return db.scalar(stmt)

    def get_assignment_by_id(
        self, db: Session, assignment_id: uuid.UUID, business_id: int
    ) -> DutyAssignment | None:
        stmt = (
            select(DutyAssignment)
            .options(
                joinedload(DutyAssignment.employee),
                joinedload(DutyAssignment.shift),
            )
            .where(
                and_(
                    DutyAssignment.id == assignment_id,
                    DutyAssignment.business_id == business_id,
                )
            )
        )
        return db.scalar(stmt)

    def upsert_assignment(
        self,
        db: Session,
        business_id: int,
        employee_id: uuid.UUID,
        department_id: uuid.UUID,
        date_val: date_type,
        shift_id: uuid.UUID,
        source: DutyAssignmentSourceEnum = DutyAssignmentSourceEnum.MONTHLY_ROSTER,
        status: DutyAssignmentStatusEnum = DutyAssignmentStatusEnum.DRAFT,
        monthly_roster_id: uuid.UUID | None = None,
        batch_id: uuid.UUID | None = None,
        notes: str | None = None,
    ) -> DutyAssignment:
        stmt = select(DutyAssignment).where(
            and_(
                DutyAssignment.business_id == business_id,
                DutyAssignment.employee_id == employee_id,
                DutyAssignment.date == date_val,
            )
        )
        existing = db.scalar(stmt)
        if existing:
            existing.shift_id = shift_id
            existing.department_id = department_id
            existing.source = source
            existing.status = status
            if monthly_roster_id:
                existing.monthly_roster_id = monthly_roster_id
            if batch_id:
                existing.batch_id = batch_id
            if notes is not None:
                existing.notes = notes
            db.commit()
            db.refresh(existing)
            return existing

        new_assign = DutyAssignment(
            business_id=business_id,
            employee_id=employee_id,
            department_id=department_id,
            date=date_val,
            shift_id=shift_id,
            source=source,
            status=status,
            monthly_roster_id=monthly_roster_id,
            batch_id=batch_id,
            notes=notes,
        )
        db.add(new_assign)
        db.commit()
        db.refresh(new_assign)
        return new_assign

    # ── Duty Assign Batches ────────────────────────────────────────────
    def create_batch(self, db: Session, batch: DutyAssignBatch) -> DutyAssignBatch:
        db.add(batch)
        db.commit()
        db.refresh(batch)
        return batch

    def get_batches(
        self,
        db: Session,
        business_id: int,
        department_id: uuid.UUID | None = None,
        status: DutyBatchStatusEnum | None = None,
    ) -> list[DutyAssignBatch]:
        stmt = (
            select(DutyAssignBatch)
            .options(
                joinedload(DutyAssignBatch.department),
                joinedload(DutyAssignBatch.submitted_by),
                joinedload(DutyAssignBatch.approved_by),
            )
            .where(DutyAssignBatch.business_id == business_id)
        )
        if department_id:
            stmt = stmt.where(DutyAssignBatch.department_id == department_id)
        if status:
            stmt = stmt.where(DutyAssignBatch.status == status)

        stmt = stmt.order_by(DutyAssignBatch.created_at.desc())
        return list(db.scalars(stmt).unique().all())

    def get_batch_by_id(
        self, db: Session, batch_id: uuid.UUID, business_id: int
    ) -> DutyAssignBatch | None:
        stmt = (
            select(DutyAssignBatch)
            .options(
                joinedload(DutyAssignBatch.department),
                joinedload(DutyAssignBatch.submitted_by),
                joinedload(DutyAssignBatch.approved_by),
            )
            .where(
                and_(
                    DutyAssignBatch.id == batch_id,
                    DutyAssignBatch.business_id == business_id,
                )
            )
        )
        return db.scalar(stmt)

    # ── Monthly Rosters ────────────────────────────────────────────────
    def get_monthly_roster(
        self,
        db: Session,
        business_id: int,
        department_id: uuid.UUID,
        year: int,
        month: int,
    ) -> MonthlyRoster | None:
        stmt = (
            select(MonthlyRoster)
            .options(
                joinedload(MonthlyRoster.department),
                joinedload(MonthlyRoster.submitted_by),
                joinedload(MonthlyRoster.approved_by),
            )
            .where(
                and_(
                    MonthlyRoster.business_id == business_id,
                    MonthlyRoster.department_id == department_id,
                    MonthlyRoster.year == year,
                    MonthlyRoster.month == month,
                )
            )
        )
        return db.scalar(stmt)

    def get_monthly_rosters(
        self,
        db: Session,
        business_id: int,
        department_id: uuid.UUID | None = None,
        year: int | None = None,
        month: int | None = None,
        status: MonthlyRosterStatusEnum | None = None,
    ) -> list[MonthlyRoster]:
        stmt = (
            select(MonthlyRoster)
            .options(
                joinedload(MonthlyRoster.department),
                joinedload(MonthlyRoster.submitted_by),
                joinedload(MonthlyRoster.approved_by),
            )
            .where(MonthlyRoster.business_id == business_id)
        )
        if department_id:
            stmt = stmt.where(MonthlyRoster.department_id == department_id)
        if year:
            stmt = stmt.where(MonthlyRoster.year == year)
        if month:
            stmt = stmt.where(MonthlyRoster.month == month)
        if status:
            stmt = stmt.where(MonthlyRoster.status == status)

        stmt = stmt.order_by(MonthlyRoster.year.desc(), MonthlyRoster.month.desc())
        return list(db.scalars(stmt).unique().all())

    def get_monthly_roster_by_id(
        self, db: Session, roster_id: uuid.UUID, business_id: int
    ) -> MonthlyRoster | None:
        stmt = (
            select(MonthlyRoster)
            .options(
                joinedload(MonthlyRoster.department),
                joinedload(MonthlyRoster.submitted_by),
                joinedload(MonthlyRoster.approved_by),
            )
            .where(
                and_(
                    MonthlyRoster.id == roster_id,
                    MonthlyRoster.business_id == business_id,
                )
            )
        )
        return db.scalar(stmt)

    def create_monthly_roster(self, db: Session, roster: MonthlyRoster) -> MonthlyRoster:
        db.add(roster)
        db.commit()
        db.refresh(roster)
        return roster

    # ── Roster Change Applications ─────────────────────────────────────
    def create_change_request(
        self, db: Session, req: RosterChangeApplication
    ) -> RosterChangeApplication:
        db.add(req)
        db.commit()
        db.refresh(req)
        return req

    def get_change_requests(
        self,
        db: Session,
        business_id: int,
        employee_id: uuid.UUID | None = None,
        status: RosterChangeStatusEnum | None = None,
    ) -> list[RosterChangeApplication]:
        stmt = (
            select(RosterChangeApplication)
            .options(
                joinedload(RosterChangeApplication.employee),
                joinedload(RosterChangeApplication.current_shift),
                joinedload(RosterChangeApplication.requested_shift),
                joinedload(RosterChangeApplication.reviewed_by),
            )
            .where(RosterChangeApplication.business_id == business_id)
        )
        if employee_id:
            stmt = stmt.where(RosterChangeApplication.employee_id == employee_id)
        if status:
            stmt = stmt.where(RosterChangeApplication.status == status)

        stmt = stmt.order_by(RosterChangeApplication.applied_at.desc())
        return list(db.scalars(stmt).unique().all())

    def get_change_request_by_id(
        self, db: Session, req_id: uuid.UUID, business_id: int
    ) -> RosterChangeApplication | None:
        stmt = (
            select(RosterChangeApplication)
            .options(
                joinedload(RosterChangeApplication.employee),
                joinedload(RosterChangeApplication.current_shift),
                joinedload(RosterChangeApplication.requested_shift),
                joinedload(RosterChangeApplication.reviewed_by),
            )
            .where(
                and_(
                    RosterChangeApplication.id == req_id,
                    RosterChangeApplication.business_id == business_id,
                )
            )
        )
        return db.scalar(stmt)

    # ── Roster Exchange Applications ───────────────────────────────────
    def create_exchange_request(
        self, db: Session, req: RosterExchangeApplication
    ) -> RosterExchangeApplication:
        db.add(req)
        db.commit()
        db.refresh(req)
        return req

    def get_exchange_requests(
        self,
        db: Session,
        business_id: int,
        employee_id: uuid.UUID | None = None,
        status: RosterExchangeStatusEnum | None = None,
    ) -> list[RosterExchangeApplication]:
        stmt = (
            select(RosterExchangeApplication)
            .options(
                joinedload(RosterExchangeApplication.requesting_employee),
                joinedload(RosterExchangeApplication.target_employee),
                joinedload(RosterExchangeApplication.requesting_shift),
                joinedload(RosterExchangeApplication.target_shift),
                joinedload(RosterExchangeApplication.reviewed_by),
            )
            .where(RosterExchangeApplication.business_id == business_id)
        )
        if employee_id:
            stmt = stmt.where(
                or_(
                    RosterExchangeApplication.requesting_employee_id == employee_id,
                    RosterExchangeApplication.target_employee_id == employee_id,
                )
            )
        if status:
            stmt = stmt.where(RosterExchangeApplication.status == status)

        stmt = stmt.order_by(RosterExchangeApplication.applied_at.desc())
        return list(db.scalars(stmt).unique().all())

    def get_exchange_request_by_id(
        self, db: Session, req_id: uuid.UUID, business_id: int
    ) -> RosterExchangeApplication | None:
        stmt = (
            select(RosterExchangeApplication)
            .options(
                joinedload(RosterExchangeApplication.requesting_employee),
                joinedload(RosterExchangeApplication.target_employee),
                joinedload(RosterExchangeApplication.requesting_shift),
                joinedload(RosterExchangeApplication.target_shift),
                joinedload(RosterExchangeApplication.reviewed_by),
            )
            .where(
                and_(
                    RosterExchangeApplication.id == req_id,
                    RosterExchangeApplication.business_id == business_id,
                )
            )
        )
        return db.scalar(stmt)
