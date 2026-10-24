import uuid

from sqlalchemy.orm import Session

from app.modules.hr_payroll.compensation.models import EmployeeSalary
from app.modules.hr_payroll.compensation.schemas import (
    EmployeeSalaryCreate,
    EmployeeSalaryUpdate,
)


class EmployeeSalaryRepository:
    def get_by_id(self, db: Session, salary_uuid: uuid.UUID) -> EmployeeSalary | None:
        return db.query(EmployeeSalary).filter(EmployeeSalary.id == salary_uuid).first()

    def get_by_employee_id(
        self,
        db: Session,
        employee_id: uuid.UUID,
        business_id: int | None = None,
    ) -> EmployeeSalary | None:
        query = db.query(EmployeeSalary).filter(
            EmployeeSalary.employee_id == employee_id
        )
        if business_id is not None:
            query = query.filter(EmployeeSalary.business_id == business_id)
        return query.first()

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        employee_id: uuid.UUID | None = None,
    ) -> list[EmployeeSalary]:
        query = db.query(EmployeeSalary)
        if business_id is not None:
            query = query.filter(EmployeeSalary.business_id == business_id)
        if employee_id is not None:
            query = query.filter(EmployeeSalary.employee_id == employee_id)
        return query.offset(skip).limit(limit).all()

    def create(
        self,
        db: Session,
        data: EmployeeSalaryCreate,
        gross_salary: float,
        net_salary: float,
    ) -> EmployeeSalary:
        salary_data = data.model_dump()
        salary_data["gross_salary"] = gross_salary
        salary_data["net_salary"] = net_salary
        salary = EmployeeSalary(**salary_data)
        db.add(salary)
        db.commit()
        db.refresh(salary)
        return salary

    def update(
        self,
        db: Session,
        salary: EmployeeSalary,
        data: EmployeeSalaryUpdate,
        gross_salary: float | None = None,
        net_salary: float | None = None,
    ) -> EmployeeSalary:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(salary, field, value)

        if gross_salary is not None:
            salary.gross_salary = gross_salary
        if net_salary is not None:
            salary.net_salary = net_salary

        db.commit()
        db.refresh(salary)
        return salary

    def delete(self, db: Session, salary: EmployeeSalary) -> None:
        db.delete(salary)
        db.commit()


# ============================================================
# SalaryComponentRepository & SalaryStructureRepository
# ============================================================
from app.modules.hr_payroll.compensation.models import (
    SalaryComponent,
    SalaryStructure,
    SalaryStructureItem,
)
from app.modules.hr_payroll.compensation.schemas import (
    SalaryComponentCreate,
    SalaryComponentUpdate,
    SalaryStructureCreate,
    SalaryStructureUpdate,
)


class SalaryComponentRepository:
    def get_by_id(self, db: Session, component_id: uuid.UUID) -> SalaryComponent | None:
        return db.query(SalaryComponent).filter(SalaryComponent.id == component_id).first()

    def get_by_code(self, db: Session, business_id: int, code: str) -> SalaryComponent | None:
        return db.query(SalaryComponent).filter(
            SalaryComponent.business_id == business_id,
            SalaryComponent.code == code,
        ).first()

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        is_active: bool | None = None,
    ) -> list[SalaryComponent]:
        query = db.query(SalaryComponent)
        if business_id is not None:
            query = query.filter(SalaryComponent.business_id == business_id)
        if is_active is not None:
            query = query.filter(SalaryComponent.is_active == is_active)
        return query.order_by(SalaryComponent.name.asc()).offset(skip).limit(limit).all()

    def create(self, db: Session, data: SalaryComponentCreate) -> SalaryComponent:
        component = SalaryComponent(**data.model_dump())
        db.add(component)
        db.commit()
        db.refresh(component)
        return component

    def update(
        self, db: Session, component: SalaryComponent, data: SalaryComponentUpdate
    ) -> SalaryComponent:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(component, field, value)
        db.commit()
        db.refresh(component)
        return component

    def delete(self, db: Session, component: SalaryComponent) -> None:
        db.delete(component)
        db.commit()


class SalaryStructureRepository:
    def get_by_id(self, db: Session, structure_id: uuid.UUID) -> SalaryStructure | None:
        return db.query(SalaryStructure).filter(SalaryStructure.id == structure_id).first()

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        is_active: bool | None = None,
    ) -> list[SalaryStructure]:
        query = db.query(SalaryStructure)
        if business_id is not None:
            query = query.filter(SalaryStructure.business_id == business_id)
        if is_active is not None:
            query = query.filter(SalaryStructure.is_active == is_active)
        return query.order_by(SalaryStructure.name.asc()).offset(skip).limit(limit).all()

    def create(self, db: Session, data: SalaryStructureCreate) -> SalaryStructure:
        items_data = data.items
        struct_dict = data.model_dump(exclude={"items"})
        structure = SalaryStructure(**struct_dict)
        db.add(structure)
        db.flush()

        for item in items_data:
            s_item = SalaryStructureItem(
                structure_id=structure.id,
                component_id=item.component_id,
                calculation_type=item.calculation_type,
                value=item.value,
            )
            db.add(s_item)

        db.commit()
        db.refresh(structure)
        return structure

    def update(
        self, db: Session, structure: SalaryStructure, data: SalaryStructureUpdate
    ) -> SalaryStructure:
        update_data = data.model_dump(exclude_unset=True, exclude={"items"})
        for field, value in update_data.items():
            setattr(structure, field, value)

        if data.items is not None:
            # Replace structure items
            db.query(SalaryStructureItem).filter(
                SalaryStructureItem.structure_id == structure.id
            ).delete()
            for item in data.items:
                s_item = SalaryStructureItem(
                    structure_id=structure.id,
                    component_id=item.component_id,
                    calculation_type=item.calculation_type,
                    value=item.value,
                )
                db.add(s_item)

        db.commit()
        db.refresh(structure)
        return structure

    def delete(self, db: Session, structure: SalaryStructure) -> None:
        db.delete(structure)
        db.commit()
