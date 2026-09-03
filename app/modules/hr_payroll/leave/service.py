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

        return self.repository.create(db, data)

    def update_application(
        self,
        db: Session,
        application_uuid: uuid.UUID,
        data: LeaveApplicationUpdate,
    ) -> LeaveApplication:
        application = self.get_application(db, application_uuid)

        start_date = data.start_date or application.start_date
        end_date = data.end_date or application.end_date

        if start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date cannot be after end date",
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

        if (
            application.status != LeaveStatusEnum.PENDING
            and str(application.status) != "pending"
        ):
            app_status = application.status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot review leave application with status '{app_status}'",
            )

        reviewer = self.employee_repository.get_by_id(db, data.reviewed_by_id)
        if not reviewer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Reviewer with id '{data.reviewed_by_id}' not found",
            )

        if data.status in (LeaveStatusEnum.APPROVED, "approved"):
            year = application.start_date.year
            allocation = self.allocation_repository.get_by_emp_type_year(
                db,
                employee_id=application.employee_id,
                leave_type_id=application.leave_type_id,
                year=year,
                business_id=application.business_id,
            )
            if allocation:
                allocation.used_days += application.total_days
                db.add(allocation)

        return self.repository.update_status(
            db,
            application=application,
            status=data.status,
            reviewed_by_id=data.reviewed_by_id,
            review_note=data.review_note,
        )

    def delete_application(self, db: Session, application_uuid: uuid.UUID) -> None:
        application = self.get_application(db, application_uuid)
        self.repository.delete(db, application)
