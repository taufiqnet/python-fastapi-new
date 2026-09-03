import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.hr_payroll.employees.repository import EmployeeRepository
from app.modules.hr_payroll.leave.models import (
    GenderApplicabilityEnum,
    LeaveAllocation,
    LeaveApplication,
    LeaveStatusEnum,
    LeaveType,
)
from app.modules.hr_payroll.leave.repository import (
    LeaveAllocationRepository,
    LeaveApplicationRepository,
    LeaveTypeRepository,
)
from app.modules.hr_payroll.leave.schemas import (
    LeaveAllocationCreate,
    LeaveAllocationUpdate,
    LeaveApplicationCreate,
    LeaveApplicationReview,
    LeaveApplicationUpdate,
    LeaveTypeCreate,
    LeaveTypeUpdate,
)


class LeaveTypeService:
    def __init__(self, repository: LeaveTypeRepository | None = None):
        self.repository = repository or LeaveTypeRepository()

    def get_leave_types(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
    ) -> list[LeaveType]:
        return self.repository.get_all(
            db, skip=skip, limit=limit, business_id=business_id
        )

    def get_leave_type(self, db: Session, leave_type_uuid: uuid.UUID) -> LeaveType:
        leave_type = self.repository.get_by_id(db, leave_type_uuid)
        if not leave_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Leave type not found",
            )
        return leave_type

    def create_leave_type(self, db: Session, data: LeaveTypeCreate) -> LeaveType:
        if self.repository.get_by_code(db, data.code, data.business_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Leave type with code '{data.code}' already exists",
            )
        return self.repository.create(db, data)

    def update_leave_type(
        self, db: Session, leave_type_uuid: uuid.UUID, data: LeaveTypeUpdate
    ) -> LeaveType:
        leave_type = self.get_leave_type(db, leave_type_uuid)
        target_business_id = (
            data.business_id if data.business_id is not None else leave_type.business_id
        )

        if data.code is not None and data.code != leave_type.code:
            existing = self.repository.get_by_code(db, data.code, target_business_id)
            if existing and existing.id != leave_type_uuid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Leave type with code '{data.code}' already exists",
                )

        return self.repository.update(db, leave_type, data)

    def delete_leave_type(self, db: Session, leave_type_uuid: uuid.UUID) -> None:
        leave_type = self.get_leave_type(db, leave_type_uuid)
        self.repository.delete(db, leave_type)


class LeaveAllocationService:
    def __init__(
        self,
        repository: LeaveAllocationRepository | None = None,
        leave_type_repository: LeaveTypeRepository | None = None,
        employee_repository: EmployeeRepository | None = None,
    ):
        self.repository = repository or LeaveAllocationRepository()
        self.leave_type_repository = leave_type_repository or LeaveTypeRepository()
        self.employee_repository = employee_repository or EmployeeRepository()

    def get_allocations(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        employee_id: uuid.UUID | None = None,
        year: int | None = None,
    ) -> list[LeaveAllocation]:
        return self.repository.get_all(
            db,
            skip=skip,
            limit=limit,
            business_id=business_id,
            employee_id=employee_id,
            year=year,
        )

    def get_allocation(
        self, db: Session, allocation_uuid: uuid.UUID
    ) -> LeaveAllocation:
        allocation = self.repository.get_by_id(db, allocation_uuid)
        if not allocation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Leave allocation not found",
            )
        return allocation

    def create_allocation(
        self, db: Session, data: LeaveAllocationCreate
    ) -> LeaveAllocation:
        employee = self.employee_repository.get_by_id(db, data.employee_id)
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with id '{data.employee_id}' not found",
            )

        leave_type = self.leave_type_repository.get_by_id(db, data.leave_type_id)
        if not leave_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Leave type with id '{data.leave_type_id}' not found",
            )

        existing = self.repository.get_by_emp_type_year(
            db,
            employee_id=data.employee_id,
            leave_type_id=data.leave_type_id,
            year=data.year,
            business_id=data.business_id,
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Leave allocation for employee and leave type in year "
                    f"{data.year} already exists"
                ),
            )

        return self.repository.create(db, data)

    def update_allocation(
        self, db: Session, allocation_uuid: uuid.UUID, data: LeaveAllocationUpdate
    ) -> LeaveAllocation:
        allocation = self.get_allocation(db, allocation_uuid)
        return self.repository.update(db, allocation, data)

    def delete_allocation(self, db: Session, allocation_uuid: uuid.UUID) -> None:
        allocation = self.get_allocation(db, allocation_uuid)
        self.repository.delete(db, allocation)


class LeaveApplicationService:
    def __init__(
        self,
        repository: LeaveApplicationRepository | None = None,
        allocation_repository: LeaveAllocationRepository | None = None,
        leave_type_repository: LeaveTypeRepository | None = None,
        employee_repository: EmployeeRepository | None = None,
    ):
        self.repository = repository or LeaveApplicationRepository()
        self.allocation_repository = (
            allocation_repository or LeaveAllocationRepository()
        )
        self.leave_type_repository = leave_type_repository or LeaveTypeRepository()
        self.employee_repository = employee_repository or EmployeeRepository()

    def get_applications(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        employee_id: uuid.UUID | None = None,
        status_filter: str | LeaveStatusEnum | None = None,
    ) -> list[LeaveApplication]:
        return self.repository.get_all(
            db,
            skip=skip,
            limit=limit,
            business_id=business_id,
            employee_id=employee_id,
            status=status_filter,
        )

    def get_application(
        self, db: Session, application_uuid: uuid.UUID
    ) -> LeaveApplication:
        application = self.repository.get_by_id(db, application_uuid)
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Leave application not found",
            )
        return application

    def _check_overlapping_applications(
        self,
        db: Session,
        employee_id: uuid.UUID,
        start_date,
        end_date,
        exclude_application_id: uuid.UUID | None = None,
    ) -> None:
        existing_apps = self.repository.get_all(
            db, employee_id=employee_id, limit=500
        )
        for app_rec in existing_apps:
            if exclude_application_id and app_rec.id == exclude_application_id:
                continue
            if app_rec.status in (LeaveStatusEnum.PENDING, LeaveStatusEnum.APPROVED):
                if (app_rec.start_date <= end_date) and (app_rec.end_date >= start_date):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Overlapping leave application exists for this date range",
                    )

    def create_application(
        self, db: Session, data: LeaveApplicationCreate
    ) -> LeaveApplication:
        if data.start_date > data.end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date cannot be after end date",
            )

        employee = self.employee_repository.get_by_id(db, data.employee_id)
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with id '{data.employee_id}' not found",
            )

        leave_type = self.leave_type_repository.get_by_id(db, data.leave_type_id)
        if not leave_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Leave type with id '{data.leave_type_id}' not found",
            )

        # Check overlapping applications
        self._check_overlapping_applications(
            db,
            employee_id=data.employee_id,
            start_date=data.start_date,
            end_date=data.end_date,
        )

        # Compute total_days if 0 or not set
        if data.total_days <= 0:
            data.total_days = (data.end_date - data.start_date).days + 1

        # Check document requirement
        if leave_type.requires_document and not data.document_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Supporting document URL is required for this leave type",
            )

        # Check gender applicability
        if leave_type.applicable_gender != GenderApplicabilityEnum.ALL:
            emp_gender = getattr(employee, "gender", None)
            if emp_gender:
                emp_gender_str = (
                    str(emp_gender).value
                    if hasattr(emp_gender, "value")
                    else str(emp_gender)
                )
                if emp_gender_str.lower() != leave_type.applicable_gender.value.lower():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"This leave type is only applicable to "
                            f"{leave_type.applicable_gender.value} employees"
                        ),
                    )

        # Check initial balance if leave allocation exists
        if leave_type.max_days_per_year != 0:
            year = data.start_date.year
            allocation = self.allocation_repository.get_by_emp_type_year(
                db,
                employee_id=data.employee_id,
                leave_type_id=data.leave_type_id,
                year=year,
                business_id=data.business_id,
            )
            if allocation:
                remaining = (
                    float(allocation.allocated_days)
                    + float(allocation.carried_forward)
                    - float(allocation.used_days)
                )
                if remaining < data.total_days:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Insufficient leave balance: {remaining} day(s) "
                            f"remaining, {data.total_days} day(s) requested"
                        ),
                    )

        return self.repository.create(db, data)

    def update_application(
        self, db: Session, application_uuid: uuid.UUID, data: LeaveApplicationUpdate
    ) -> LeaveApplication:
        application = self.get_application(db, application_uuid)

        if application.status != LeaveStatusEnum.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot edit a leave application with status '{application.status}'",
            )

        start_date = data.start_date or application.start_date
        end_date = data.end_date or application.end_date
        if start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date cannot be after end date",
            )

        self._check_overlapping_applications(
            db,
            employee_id=application.employee_id,
            start_date=start_date,
            end_date=end_date,
            exclude_application_id=application_uuid,
        )

        if data.total_days is None or data.total_days <= 0:
            data.total_days = (end_date - start_date).days + 1

        return self.repository.update(db, application, data)

    def review_application(
        self,
        db: Session,
        application_uuid: uuid.UUID,
        data: LeaveApplicationReview,
    ) -> LeaveApplication:
        application = self.get_application(db, application_uuid)

        if application.status != LeaveStatusEnum.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot review leave application with status '{application.status}'",
            )

        reviewer = self.employee_repository.get_by_id(db, data.reviewed_by_id)
        if not reviewer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Reviewer with id '{data.reviewed_by_id}' not found",
            )

        target_status = (
            data.status
            if isinstance(data.status, LeaveStatusEnum)
            else LeaveStatusEnum(data.status)
        )

        if target_status == LeaveStatusEnum.APPROVED:
            leave_type = self.leave_type_repository.get_by_id(
                db, application.leave_type_id
            )
            if not leave_type:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Leave type not found for this application",
                )

            # max_days_per_year == 0 means unlimited -> skip balance enforcement
            if leave_type.max_days_per_year != 0:
                year = application.start_date.year
                allocation = self.allocation_repository.get_by_emp_type_year_locked(
                    db,
                    employee_id=application.employee_id,
                    leave_type_id=application.leave_type_id,
                    year=year,
                    business_id=application.business_id,
                )

                if not allocation:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            "No leave allocation configured for this employee, "
                            "leave type, and year. Cannot approve."
                        ),
                    )

                remaining = (
                    float(allocation.allocated_days)
                    + float(allocation.carried_forward)
                    - float(allocation.used_days)
                )
                if remaining < application.total_days:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Insufficient leave balance: {remaining} day(s) "
                            f"remaining, {application.total_days} day(s) requested"
                        ),
                    )

                allocation.used_days = (
                    float(allocation.used_days) + application.total_days
                )
                db.add(allocation)

        # NOTE: allocation change above is staged, not committed. update_status()
        # commits it together with the application status change in one
        # transaction. Do not insert a db.commit() between the two.
        return self.repository.update_status(
            db,
            application=application,
            status=target_status,
            reviewed_by_id=data.reviewed_by_id,
            review_note=data.review_note,
        )

    def cancel_application(
        self,
        db: Session,
        application_uuid: uuid.UUID,
        actor_id: uuid.UUID,
    ) -> LeaveApplication:
        """Cancel a PENDING or APPROVED application. If it was APPROVED,
        restores the balance that was deducted at approval time."""
        application = self.get_application(db, application_uuid)

        if application.status not in (
            LeaveStatusEnum.PENDING,
            LeaveStatusEnum.APPROVED,
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel a leave application with status '{application.status}'",
            )

        was_approved = application.status == LeaveStatusEnum.APPROVED

        if was_approved:
            leave_type = self.leave_type_repository.get_by_id(
                db, application.leave_type_id
            )
            if leave_type and leave_type.max_days_per_year != 0:
                year = application.start_date.year
                allocation = self.allocation_repository.get_by_emp_type_year_locked(
                    db,
                    employee_id=application.employee_id,
                    leave_type_id=application.leave_type_id,
                    year=year,
                    business_id=application.business_id,
                )
                if allocation:
                    restored = float(allocation.used_days) - application.total_days
                    allocation.used_days = max(restored, 0)
                    db.add(allocation)
                # If the allocation row no longer exists, there's nothing to
                # restore to -- proceed with cancellation regardless.

        return self.repository.update_status(
            db,
            application=application,
            status=LeaveStatusEnum.CANCELLED,
            reviewed_by_id=actor_id,
            review_note="Cancelled" if was_approved else None,
        )

    def delete_application(self, db: Session, application_uuid: uuid.UUID) -> None:
        application = self.get_application(db, application_uuid)
        self.repository.delete(db, application)