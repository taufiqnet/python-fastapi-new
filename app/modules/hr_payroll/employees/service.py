import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.employees.repository import EmployeeRepository
from app.modules.hr_payroll.employees.schemas import (
    EmployeeCreate,
    EmployeeUpdate,
)
from app.modules.hr_payroll.organization.repository import (
    DepartmentRepository,
    JobTitleRepository,
)


class EmployeeService:

    def __init__(
        self,
        repository: EmployeeRepository | None = None,
        department_repository: DepartmentRepository | None = None,
        job_title_repository: JobTitleRepository | None = None,
    ):
        self.repository = repository or EmployeeRepository()
        self.department_repository = (
            department_repository or DepartmentRepository()
        )
        self.job_title_repository = job_title_repository or JobTitleRepository()

    def get_employees(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        department_id: uuid.UUID | None = None,
    ) -> list[Employee]:
        return self.repository.get_all(
            db,
            skip=skip,
            limit=limit,
            business_id=business_id,
            department_id=department_id,
        )

    def get_employee(self, db: Session, employee_uuid: uuid.UUID) -> Employee:
        employee = self.repository.get_by_id(db, employee_uuid)
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found",
            )
        return employee

    def validate_direct_manager(
        self,
        db: Session,
        manager_id: uuid.UUID,
        employee_id: uuid.UUID | None = None,
        business_id: int | None = None,
    ) -> None:
        """
        Validates direct manager rules:
        - Manager must exist and be active.
        - Employee cannot be their own direct manager.
        - Manager must belong to the same business profile.
        - Prevents management hierarchy cycles (A -> B -> C -> A).
        """
        if employee_id and manager_id == employee_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee cannot be their own direct manager",
            )

        manager = self.repository.get_by_id(db, manager_id)
        if not manager:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Direct manager with id '{manager_id}' not found",
            )

        if business_id is not None and manager.business_id != business_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Direct manager must belong to the same business profile",
            )

        # Cycle detection
        curr_manager_id = manager.direct_manager_id
        visited = {employee_id} if employee_id else set()
        visited.add(manager_id)

        while curr_manager_id:
            if curr_manager_id in visited:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Management hierarchy cycle detected",
                )
            visited.add(curr_manager_id)
            m = self.repository.get_by_id(db, curr_manager_id)
            if not m:
                break
            curr_manager_id = m.direct_manager_id

    def validate_department_head(
        self,
        db: Session,
        is_department_head: bool,
        is_active: bool,
        department_id: uuid.UUID | None,
        business_id: int,
        exclude_employee_id: uuid.UUID | None = None,
    ) -> None:
        """
        Validates department head rules:
        - Department head must be active and have a department assigned.
        - Unless department.multiple_heads_allowed is True, only one active department head
          is allowed per department.
        """
        if is_department_head:
            if not is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Department head must be active",
                )
            if not department_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Department head must be assigned to a department",
                )

            dept = self.department_repository.get_by_id(db, department_id)
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Department with id '{department_id}' not found",
                )

            if not dept.multiple_heads_allowed:
                existing_head = self.repository.get_active_department_head(
                    db, department_id, business_id
                )
                if existing_head and (
                    exclude_employee_id is None
                    or existing_head.id != exclude_employee_id
                ):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Department '{dept.name}' already has an active department head"
                        ),
                    )

    def create_employee(self, db: Session, data: EmployeeCreate) -> Employee:
        # Check uniqueness constraints for employee_id, work_email, phone
        if self.repository.get_by_employee_id(db, data.employee_id, data.business_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee with employee_id '{data.employee_id}' already exists",
            )
        if self.repository.get_by_work_email(db, data.work_email, data.business_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee with work_email '{data.work_email}' already exists",
            )
        if data.phone and self.repository.get_by_phone(db, data.phone, data.business_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee with phone '{data.phone}' already exists",
            )

        # Validate Foreign Keys
        if data.department_id is not None:
            dept = self.department_repository.get_by_id(db, data.department_id)
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Department with id '{data.department_id}' not found",
                )

        if data.job_title_id is not None:
            job_title = self.job_title_repository.get_by_id(db, data.job_title_id)
            if not job_title:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Job title with id '{data.job_title_id}' not found",
                )

        if data.direct_manager_id is not None:
            self.validate_direct_manager(
                db,
                manager_id=data.direct_manager_id,
                employee_id=None,
                business_id=data.business_id,
            )

        # Validate department head rules
        self.validate_department_head(
            db,
            is_department_head=data.is_department_head,
            is_active=data.is_active,
            department_id=data.department_id,
            business_id=data.business_id,
        )

        return self.repository.create(db, data)

    def update_employee(
        self, db: Session, employee_uuid: uuid.UUID, data: EmployeeUpdate
    ) -> Employee:
        employee = self.get_employee(db, employee_uuid)

        target_business_id = (
            data.business_id
            if data.business_id is not None
            else employee.business_id
        )

        # Check unique constraint changes
        if data.employee_id is not None and data.employee_id != employee.employee_id:
            existing = self.repository.get_by_employee_id(
                db, data.employee_id, target_business_id
            )
            if existing and existing.id != employee_uuid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Employee with employee_id '{data.employee_id}' already exists",
                )

        if data.work_email is not None and data.work_email != employee.work_email:
            existing = self.repository.get_by_work_email(
                db, data.work_email, target_business_id
            )
            if existing and existing.id != employee_uuid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Employee with work_email '{data.work_email}' already exists",
                )

        if data.phone is not None and data.phone != employee.phone:
            existing = self.repository.get_by_phone(
                db, data.phone, target_business_id
            )
            if existing and existing.id != employee_uuid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Employee with phone '{data.phone}' already exists",
                )

        # Foreign Key validation
        target_dept_id = (
            data.department_id
            if data.department_id is not None
            else employee.department_id
        )
        if data.department_id is not None and data.department_id != employee.department_id:
            dept = self.department_repository.get_by_id(db, data.department_id)
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Department with id '{data.department_id}' not found",
                )

        if data.job_title_id is not None and data.job_title_id != employee.job_title_id:
            job_title = self.job_title_repository.get_by_id(db, data.job_title_id)
            if not job_title:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Job title with id '{data.job_title_id}' not found",
                )

        if (
            data.direct_manager_id is not None
            and data.direct_manager_id != employee.direct_manager_id
        ):
            self.validate_direct_manager(
                db,
                manager_id=data.direct_manager_id,
                employee_id=employee_uuid,
                business_id=target_business_id,
            )

        # Department head rules
        target_is_dept_head = (
            data.is_department_head
            if data.is_department_head is not None
            else employee.is_department_head
        )
        target_is_active = (
            data.is_active if data.is_active is not None else employee.is_active
        )

        self.validate_department_head(
            db,
            is_department_head=target_is_dept_head,
            is_active=target_is_active,
            department_id=target_dept_id,
            business_id=target_business_id,
            exclude_employee_id=employee_uuid,
        )

        return self.repository.update(db, employee, data)

    def delete_employee(self, db: Session, employee_uuid: uuid.UUID) -> None:
        employee = self.get_employee(db, employee_uuid)
        self.repository.delete(db, employee)
