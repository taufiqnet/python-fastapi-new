import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import and_, desc, func, or_
from sqlalchemy.orm import Session, selectinload

from app.modules.hr_payroll.attendance.models import (
    ApprovalStatusEnum,
    Attendance,
    AttendancePeriodApproval,
    AttendanceRegularization,
    AttendanceSettings,
    AttendanceStatusEnum,
    BiometricDevice,
    ImportJob,
    OutdoorDutyApplication,
    OvertimeApplication,
    PeriodApprovalStatusEnum,
    RawAttendanceLog,
)
from app.modules.hr_payroll.attendance.schemas import (
    AttendanceCreate,
    AttendancePeriodApprovalCreate,
    AttendanceRegularizationCreate,
    AttendanceSettingsUpdate,
    AttendanceUpdate,
    BiometricDeviceCreate,
    BiometricDeviceUpdate,
    OutdoorDutyCreate,
    OvertimeCreate,
    RawAttendanceLogCreate,
)


# ===========================================================================
# Core Attendance Repository
# ===========================================================================
class AttendanceRepository:
    def get_by_id(self, db: Session, attendance_uuid: uuid.UUID) -> Attendance | None:
        return (
            db.query(Attendance)
            .options(selectinload(Attendance.employee))
            .filter(Attendance.id == attendance_uuid)
            .first()
        )

    def get_by_emp_date(
        self,
        db: Session,
        employee_id: uuid.UUID,
        att_date: date,
        business_id: int | None = None,
    ) -> Attendance | None:
        query = db.query(Attendance).options(selectinload(Attendance.employee)).filter(
            Attendance.employee_id == employee_id,
            Attendance.date == att_date,
        )
        if business_id is not None:
            query = query.filter(Attendance.business_id == business_id)
        return query.first()

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        employee_id: uuid.UUID | None = None,
        att_date: date | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        status: str | AttendanceStatusEnum | None = None,
    ) -> list[Attendance]:
        query = db.query(Attendance).options(selectinload(Attendance.employee))
        if business_id is not None:
            query = query.filter(Attendance.business_id == business_id)
        if employee_id is not None:
            query = query.filter(Attendance.employee_id == employee_id)
        if att_date is not None:
            query = query.filter(Attendance.date == att_date)
        if start_date is not None:
            query = query.filter(Attendance.date >= start_date)
        if end_date is not None:
            query = query.filter(Attendance.date <= end_date)
        if status is not None:
            query = query.filter(Attendance.status == status)

        return (
            query.order_by(Attendance.date.desc(), Attendance.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count(
        self,
        db: Session,
        business_id: int | None = None,
        employee_id: uuid.UUID | None = None,
        att_date: date | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        status: str | AttendanceStatusEnum | None = None,
    ) -> int:
        query = db.query(func.count(Attendance.id))
        if business_id is not None:
            query = query.filter(Attendance.business_id == business_id)
        if employee_id is not None:
            query = query.filter(Attendance.employee_id == employee_id)
        if att_date is not None:
            query = query.filter(Attendance.date == att_date)
        if start_date is not None:
            query = query.filter(Attendance.date >= start_date)
        if end_date is not None:
            query = query.filter(Attendance.date <= end_date)
        if status is not None:
            query = query.filter(Attendance.status == status)
        return query.scalar() or 0

    def create(self, db: Session, data: AttendanceCreate) -> Attendance:
        att_data = data.model_dump()
        attendance = Attendance(**att_data)
        db.add(attendance)
        db.commit()
        db.refresh(attendance)
        return attendance

    def update(
        self,
        db: Session,
        attendance: Attendance,
        data: AttendanceUpdate,
    ) -> Attendance:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(attendance, field, value)

        db.commit()
        db.refresh(attendance)
        return attendance

    def delete(self, db: Session, attendance: Attendance) -> None:
        db.delete(attendance)
        db.commit()

    def bulk_delete(
        self,
        db: Session,
        attendance_ids: list[uuid.UUID] | None = None,
        business_id: int | None = None,
        delete_all: bool = False,
    ) -> int:
        query = db.query(Attendance)
        if not delete_all:
            if attendance_ids:
                query = query.filter(Attendance.id.in_(attendance_ids))
            elif business_id is not None:
                query = query.filter(Attendance.business_id == business_id)
            else:
                return 0

        count = query.count()
        query.delete(synchronize_session=False)
        db.commit()
        return count

    def create_import_job(self, db: Session, job: ImportJob) -> ImportJob:
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    def get_import_job(self, db: Session, job_id: uuid.UUID) -> ImportJob | None:
        return db.query(ImportJob).filter(ImportJob.id == job_id).first()


# ===========================================================================
# Settings Repository
# ===========================================================================
class AttendanceSettingsRepository:
    def get_or_create(self, db: Session, business_id: int) -> AttendanceSettings:
        settings = (
            db.query(AttendanceSettings)
            .filter(AttendanceSettings.business_id == business_id)
            .first()
        )
        if not settings:
            settings = AttendanceSettings(
                business_id=business_id,
                enable_biometric_device=False,
                auto_sync_device_logs=False,
                sync_interval_minutes=15,
                grace_period_minutes=15,
                half_day_late_minutes=120,
                standard_daily_work_hours=8.0,
                minimum_work_hours_half_day=4.0,
                require_ot_pre_approval=True,
                require_attendance_approval_before_payroll=False,
            )
            db.add(settings)
            db.commit()
            db.refresh(settings)
        return settings

    def update(
        self, db: Session, business_id: int, data: AttendanceSettingsUpdate
    ) -> AttendanceSettings:
        settings = self.get_or_create(db, business_id)
        update_data = data.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            if val is not None:
                setattr(settings, key, val)
        db.commit()
        db.refresh(settings)
        return settings


# ===========================================================================
# Biometric Device Repository
# ===========================================================================
class BiometricDeviceRepository:
    def get_by_id(self, db: Session, device_id: uuid.UUID) -> BiometricDevice | None:
        return (
            db.query(BiometricDevice)
            .options(selectinload(BiometricDevice.branch))
            .filter(BiometricDevice.id == device_id)
            .first()
        )

    def get_all(
        self,
        db: Session,
        business_id: int,
        is_active: bool | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[BiometricDevice]:
        query = (
            db.query(BiometricDevice)
            .options(selectinload(BiometricDevice.branch))
            .filter(BiometricDevice.business_id == business_id)
        )
        if is_active is not None:
            query = query.filter(BiometricDevice.is_active == is_active)
        return (
            query.order_by(BiometricDevice.device_name.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def create(self, db: Session, data: BiometricDeviceCreate) -> BiometricDevice:
        device = BiometricDevice(**data.model_dump())
        db.add(device)
        db.commit()
        db.refresh(device)
        return device

    def update(
        self, db: Session, device: BiometricDevice, data: BiometricDeviceUpdate
    ) -> BiometricDevice:
        update_dict = data.model_dump(exclude_unset=True)
        for key, val in update_dict.items():
            setattr(device, key, val)
        db.commit()
        db.refresh(device)
        return device

    def delete(self, db: Session, device: BiometricDevice) -> None:
        db.delete(device)
        db.commit()


# ===========================================================================
# Raw Attendance Log Repository
# ===========================================================================
class RawAttendanceLogRepository:
    def create(self, db: Session, data: RawAttendanceLogCreate) -> RawAttendanceLog:
        raw_log = RawAttendanceLog(**data.model_dump())
        db.add(raw_log)
        db.commit()
        db.refresh(raw_log)
        return raw_log

    def bulk_create(
        self, db: Session, data_list: list[RawAttendanceLogCreate]
    ) -> list[RawAttendanceLog]:
        logs = [RawAttendanceLog(**d.model_dump()) for d in data_list]
        db.add_all(logs)
        db.commit()
        for log in logs:
            db.refresh(log)
        return logs

    def get_all(
        self,
        db: Session,
        business_id: int,
        employee_id: uuid.UUID | None = None,
        device_id: uuid.UUID | None = None,
        is_processed: bool | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[RawAttendanceLog]:
        query = (
            db.query(RawAttendanceLog)
            .options(
                selectinload(RawAttendanceLog.employee),
                selectinload(RawAttendanceLog.device),
            )
            .filter(RawAttendanceLog.business_id == business_id)
        )
        if employee_id is not None:
            query = query.filter(RawAttendanceLog.employee_id == employee_id)
        if device_id is not None:
            query = query.filter(RawAttendanceLog.device_id == device_id)
        if is_processed is not None:
            query = query.filter(RawAttendanceLog.is_processed == is_processed)
        if start_date is not None:
            query = query.filter(
                RawAttendanceLog.punch_time >= datetime.combine(start_date, datetime.min.time())
            )
        if end_date is not None:
            query = query.filter(
                RawAttendanceLog.punch_time <= datetime.combine(end_date, datetime.max.time())
            )
        return (
            query.order_by(desc(RawAttendanceLog.punch_time))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count(
        self,
        db: Session,
        business_id: int,
        employee_id: uuid.UUID | None = None,
        device_id: uuid.UUID | None = None,
        is_processed: bool | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> int:
        query = db.query(func.count(RawAttendanceLog.id)).filter(
            RawAttendanceLog.business_id == business_id
        )
        if employee_id is not None:
            query = query.filter(RawAttendanceLog.employee_id == employee_id)
        if device_id is not None:
            query = query.filter(RawAttendanceLog.device_id == device_id)
        if is_processed is not None:
            query = query.filter(RawAttendanceLog.is_processed == is_processed)
        if start_date is not None:
            query = query.filter(
                RawAttendanceLog.punch_time >= datetime.combine(start_date, datetime.min.time())
            )
        if end_date is not None:
            query = query.filter(
                RawAttendanceLog.punch_time <= datetime.combine(end_date, datetime.max.time())
            )
        return query.scalar() or 0

    def get_unprocessed(
        self, db: Session, business_id: int, limit: int = 500
    ) -> list[RawAttendanceLog]:
        return (
            db.query(RawAttendanceLog)
            .filter(
                RawAttendanceLog.business_id == business_id,
                RawAttendanceLog.is_processed == False,
            )
            .order_by(RawAttendanceLog.punch_time.asc())
            .limit(limit)
            .all()
        )

    def mark_processed(
        self, db: Session, log_id: uuid.UUID, error_message: str | None = None
    ) -> None:
        log = (
            db.query(RawAttendanceLog)
            .filter(RawAttendanceLog.id == log_id)
            .first()
        )
        if log:
            log.is_processed = True
            log.processed_at = datetime.utcnow()
            log.error_message = error_message
            db.commit()


# ===========================================================================
# Regularization Repository
# ===========================================================================
class AttendanceRegularizationRepository:
    def get_by_id(
        self, db: Session, reg_id: uuid.UUID
    ) -> AttendanceRegularization | None:
        return (
            db.query(AttendanceRegularization)
            .options(
                selectinload(AttendanceRegularization.employee),
                selectinload(AttendanceRegularization.reviewed_by),
            )
            .filter(AttendanceRegularization.id == reg_id)
            .first()
        )

    def get_all(
        self,
        db: Session,
        business_id: int,
        employee_id: uuid.UUID | None = None,
        status: ApprovalStatusEnum | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[AttendanceRegularization]:
        query = (
            db.query(AttendanceRegularization)
            .options(
                selectinload(AttendanceRegularization.employee),
                selectinload(AttendanceRegularization.reviewed_by),
            )
            .filter(AttendanceRegularization.business_id == business_id)
        )
        if employee_id is not None:
            query = query.filter(AttendanceRegularization.employee_id == employee_id)
        if status is not None:
            query = query.filter(AttendanceRegularization.status == status)
        if start_date is not None:
            query = query.filter(AttendanceRegularization.attendance_date >= start_date)
        if end_date is not None:
            query = query.filter(AttendanceRegularization.attendance_date <= end_date)

        return (
            query.order_by(desc(AttendanceRegularization.attendance_date))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count(
        self,
        db: Session,
        business_id: int,
        employee_id: uuid.UUID | None = None,
        status: ApprovalStatusEnum | None = None,
    ) -> int:
        query = db.query(func.count(AttendanceRegularization.id)).filter(
            AttendanceRegularization.business_id == business_id
        )
        if employee_id is not None:
            query = query.filter(AttendanceRegularization.employee_id == employee_id)
        if status is not None:
            query = query.filter(AttendanceRegularization.status == status)
        return query.scalar() or 0

    def create(
        self, db: Session, data: AttendanceRegularizationCreate
    ) -> AttendanceRegularization:
        reg = AttendanceRegularization(**data.model_dump())
        db.add(reg)
        db.commit()
        db.refresh(reg)
        return reg

    def update(
        self,
        db: Session,
        reg: AttendanceRegularization,
        status: ApprovalStatusEnum,
        reviewed_by_id: int | None,
        review_remarks: str | None,
    ) -> AttendanceRegularization:
        reg.status = status
        reg.reviewed_by_id = reviewed_by_id
        reg.reviewed_at = datetime.utcnow()
        reg.review_remarks = review_remarks
        db.commit()
        db.refresh(reg)
        return reg


# ===========================================================================
# Outdoor Duty Repository
# ===========================================================================
class OutdoorDutyRepository:
    def get_by_id(self, db: Session, od_id: uuid.UUID) -> OutdoorDutyApplication | None:
        return (
            db.query(OutdoorDutyApplication)
            .options(
                selectinload(OutdoorDutyApplication.employee),
                selectinload(OutdoorDutyApplication.reviewed_by),
            )
            .filter(OutdoorDutyApplication.id == od_id)
            .first()
        )

    def get_all(
        self,
        db: Session,
        business_id: int,
        employee_id: uuid.UUID | None = None,
        status: ApprovalStatusEnum | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[OutdoorDutyApplication]:
        query = (
            db.query(OutdoorDutyApplication)
            .options(
                selectinload(OutdoorDutyApplication.employee),
                selectinload(OutdoorDutyApplication.reviewed_by),
            )
            .filter(OutdoorDutyApplication.business_id == business_id)
        )
        if employee_id is not None:
            query = query.filter(OutdoorDutyApplication.employee_id == employee_id)
        if status is not None:
            query = query.filter(OutdoorDutyApplication.status == status)
        if start_date is not None:
            query = query.filter(OutdoorDutyApplication.start_date >= start_date)
        if end_date is not None:
            query = query.filter(OutdoorDutyApplication.end_date <= end_date)

        return (
            query.order_by(desc(OutdoorDutyApplication.start_date))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def create(self, db: Session, data: OutdoorDutyCreate) -> OutdoorDutyApplication:
        od = OutdoorDutyApplication(**data.model_dump())
        db.add(od)
        db.commit()
        db.refresh(od)
        return od

    def update(
        self,
        db: Session,
        od: OutdoorDutyApplication,
        status: ApprovalStatusEnum,
        reviewed_by_id: int | None,
        review_remarks: str | None,
    ) -> OutdoorDutyApplication:
        od.status = status
        od.reviewed_by_id = reviewed_by_id
        od.reviewed_at = datetime.utcnow()
        od.review_remarks = review_remarks
        db.commit()
        db.refresh(od)
        return od


# ===========================================================================
# Overtime Repository
# ===========================================================================
class OvertimeRepository:
    def get_by_id(self, db: Session, ot_id: uuid.UUID) -> OvertimeApplication | None:
        return (
            db.query(OvertimeApplication)
            .options(
                selectinload(OvertimeApplication.employee),
                selectinload(OvertimeApplication.approved_by),
            )
            .filter(OvertimeApplication.id == ot_id)
            .first()
        )

    def get_all(
        self,
        db: Session,
        business_id: int,
        employee_id: uuid.UUID | None = None,
        status: ApprovalStatusEnum | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[OvertimeApplication]:
        query = (
            db.query(OvertimeApplication)
            .options(
                selectinload(OvertimeApplication.employee),
                selectinload(OvertimeApplication.approved_by),
            )
            .filter(OvertimeApplication.business_id == business_id)
        )
        if employee_id is not None:
            query = query.filter(OvertimeApplication.employee_id == employee_id)
        if status is not None:
            query = query.filter(OvertimeApplication.status == status)
        if start_date is not None:
            query = query.filter(OvertimeApplication.ot_date >= start_date)
        if end_date is not None:
            query = query.filter(OvertimeApplication.ot_date <= end_date)

        return (
            query.order_by(desc(OvertimeApplication.ot_date))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def create(self, db: Session, data: OvertimeCreate) -> OvertimeApplication:
        ot = OvertimeApplication(**data.model_dump())
        ot.approved_hours = 0.0  # initial claimed hours
        db.add(ot)
        db.commit()
        db.refresh(ot)
        return ot

    def update(
        self,
        db: Session,
        ot: OvertimeApplication,
        status: ApprovalStatusEnum,
        approved_hours: float | None,
        approved_by_id: int | None,
        manager_remarks: str | None,
    ) -> OvertimeApplication:
        ot.status = status
        if approved_hours is not None:
            ot.approved_hours = approved_hours
        elif status == ApprovalStatusEnum.APPROVED:
            ot.approved_hours = ot.claimed_hours
        else:
            ot.approved_hours = 0.0
        ot.approved_by_id = approved_by_id
        ot.approved_at = datetime.utcnow()
        ot.manager_remarks = manager_remarks
        db.commit()
        db.refresh(ot)
        return ot


# ===========================================================================
# Attendance Period Approval Repository
# ===========================================================================
class AttendancePeriodApprovalRepository:
    def get_by_id(
        self, db: Session, approval_id: uuid.UUID
    ) -> AttendancePeriodApproval | None:
        return (
            db.query(AttendancePeriodApproval)
            .options(selectinload(AttendancePeriodApproval.approved_by))
            .filter(AttendancePeriodApproval.id == approval_id)
            .first()
        )

    def get_by_month(
        self, db: Session, business_id: int, year: int, month: int
    ) -> AttendancePeriodApproval | None:
        return (
            db.query(AttendancePeriodApproval)
            .options(selectinload(AttendancePeriodApproval.approved_by))
            .filter(
                AttendancePeriodApproval.business_id == business_id,
                AttendancePeriodApproval.year == year,
                AttendancePeriodApproval.month == month,
            )
            .first()
        )

    def get_all(
        self,
        db: Session,
        business_id: int,
        year: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[AttendancePeriodApproval]:
        query = (
            db.query(AttendancePeriodApproval)
            .options(selectinload(AttendancePeriodApproval.approved_by))
            .filter(AttendancePeriodApproval.business_id == business_id)
        )
        if year is not None:
            query = query.filter(AttendancePeriodApproval.year == year)
        return (
            query.order_by(
                desc(AttendancePeriodApproval.year), desc(AttendancePeriodApproval.month)
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

    def create(
        self, db: Session, data: AttendancePeriodApprovalCreate, totals: dict
    ) -> AttendancePeriodApproval:
        from calendar import monthrange

        _, last_day = monthrange(data.year, data.month)
        start_d = date(data.year, data.month, 1)
        end_d = date(data.year, data.month, last_day)

        record = AttendancePeriodApproval(
            business_id=data.business_id,
            year=data.year,
            month=data.month,
            start_date=start_d,
            end_date=end_d,
            total_employees=totals.get("total_employees", 0),
            present_days_total=totals.get("present_days_total", 0.0),
            absent_days_total=totals.get("absent_days_total", 0.0),
            leave_days_total=totals.get("leave_days_total", 0.0),
            ot_hours_total=totals.get("ot_hours_total", 0.0),
            status=PeriodApprovalStatusEnum.DRAFT,
            comments=data.comments,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    def update_status(
        self,
        db: Session,
        approval: AttendancePeriodApproval,
        status: PeriodApprovalStatusEnum,
        approved_by_id: int | None,
        comments: str | None = None,
    ) -> AttendancePeriodApproval:
        approval.status = status
        approval.approved_by_id = approved_by_id
        approval.approved_at = datetime.utcnow()
        if comments:
            approval.comments = comments
        db.commit()
        db.refresh(approval)
        return approval
