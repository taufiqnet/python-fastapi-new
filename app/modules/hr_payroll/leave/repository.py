import uuid

from sqlalchemy.orm import Session

from app.modules.hr_payroll.leave.models import (
    LeaveAllocation,
    LeaveApplication,
    LeaveType,
)
from app.modules.hr_payroll.leave.schemas import (
    LeaveAllocationCreate,
    LeaveAllocationUpdate,
    LeaveApplicationCreate,
    LeaveApplicationUpdate,
    LeaveTypeCreate,
    LeaveTypeUpdate,
)


class LeaveTypeRepository:

    def get_by_id(self, db: Session, leave_type_uuid: uuid.UUID) -> LeaveType | None:
        return db.query(LeaveType).filter(LeaveType.id == leave_type_uuid).first()

    def get_by_code(
        self, db: Session, code: str, business_id: int
    ) -> LeaveType | None:
        return (
            db.query(LeaveType)
            .filter(
                LeaveType.code == code,
                LeaveType.business_id == business_id,
            )
            .first()
        )

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
    ) -> list[LeaveType]:
        query = db.query(LeaveType)
        if business_id is not None:
            query = query.filter(LeaveType.business_id == business_id)
        return query.offset(skip).limit(limit).all()

    def create(self, db: Session, data: LeaveTypeCreate) -> LeaveType:
        leave_type_data = data.model_dump()
        leave_type = LeaveType(**leave_type_data)
        db.add(leave_type)
        db.commit()
        db.refresh(leave_type)
        return leave_type

    def update(
        self, db: Session, leave_type: LeaveType, data: LeaveTypeUpdate
    ) -> LeaveType:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(leave_type, field, value)

        db.commit()
        db.refresh(leave_type)
        return leave_type

    def delete(self, db: Session, leave_type: LeaveType) -> None:
        db.delete(leave_type)
        db.commit()


class LeaveAllocationRepository:

    def get_by_id(
        self, db: Session, allocation_uuid: uuid.UUID
    ) -> LeaveAllocation | None:
        return (
            db.query(LeaveAllocation)
            .filter(LeaveAllocation.id == allocation_uuid)
            .first()
        )

    def get_by_emp_type_year(
        self,
        db: Session,
        employee_id: uuid.UUID,
        leave_type_id: uuid.UUID,
        year: int,
        business_id: int,
    ) -> LeaveAllocation | None:
        return (
            db.query(LeaveAllocation)
            .filter(
                LeaveAllocation.employee_id == employee_id,
                LeaveAllocation.leave_type_id == leave_type_id,
                LeaveAllocation.year == year,
                LeaveAllocation.business_id == business_id,
            )
            .first()
        )

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        employee_id: uuid.UUID | None = None,
        year: int | None = None,
    ) -> list[LeaveAllocation]:
        query = db.query(LeaveAllocation)
        if business_id is not None:
            query = query.filter(LeaveAllocation.business_id == business_id)
        if employee_id is not None:
            query = query.filter(LeaveAllocation.employee_id == employee_id)
        if year is not None:
            query = query.filter(LeaveAllocation.year == year)
        return query.offset(skip).limit(limit).all()

    def create(self, db: Session, data: LeaveAllocationCreate) -> LeaveAllocation:
        allocation_data = data.model_dump()
        allocation = LeaveAllocation(**allocation_data)
        db.add(allocation)
        db.commit()
        db.refresh(allocation)
        return allocation

    def update(
        self,
        db: Session,
        allocation: LeaveAllocation,
        data: LeaveAllocationUpdate,
    ) -> LeaveAllocation:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(allocation, field, value)

        db.commit()
        db.refresh(allocation)
        return allocation

    def delete(self, db: Session, allocation: LeaveAllocation) -> None:
        db.delete(allocation)
        db.commit()


class LeaveApplicationRepository:

    def get_by_id(
        self, db: Session, application_uuid: uuid.UUID
    ) -> LeaveApplication | None:
        return (
            db.query(LeaveApplication)
            .filter(LeaveApplication.id == application_uuid)
            .first()
        )

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        employee_id: uuid.UUID | None = None,
        status: str | None = None,
    ) -> list[LeaveApplication]:
        query = db.query(LeaveApplication)
        if business_id is not None:
            query = query.filter(LeaveApplication.business_id == business_id)
        if employee_id is not None:
            query = query.filter(LeaveApplication.employee_id == employee_id)
        if status is not None:
            query = query.filter(LeaveApplication.status == status)
        return query.offset(skip).limit(limit).all()

    def create(self, db: Session, data: LeaveApplicationCreate) -> LeaveApplication:
        application_data = data.model_dump()
        application = LeaveApplication(**application_data)
        db.add(application)
        db.commit()
        db.refresh(application)
        return application

    def update(
        self,
        db: Session,
        application: LeaveApplication,
        data: LeaveApplicationUpdate,
    ) -> LeaveApplication:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(application, field, value)

        db.commit()
        db.refresh(application)
        return application

    def update_status(
        self,
        db: Session,
        application: LeaveApplication,
        status: str,
        reviewer_id: uuid.UUID,
        rejection_reason: str | None = None,
    ) -> LeaveApplication:
        application.status = status
        application.reviewer_id = reviewer_id
        application.rejection_reason = rejection_reason
        db.commit()
        db.refresh(application)
        return application

    def delete(self, db: Session, application: LeaveApplication) -> None:
        db.delete(application)
        db.commit()
