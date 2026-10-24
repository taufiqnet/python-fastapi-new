import math
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.identity.models import User
from app.modules.assets.models import AllocationStatusEnum, AssetAssignment, AssetStatusEnum, CompanyAsset
from app.modules.hr_payroll.compensation.models import EmployeeSalary
from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.leave.models import LeaveAllocation, LeaveType
from app.modules.hr_payroll.portal.models import EmployeeLoan
from app.modules.hr_payroll.separation.models import (
    ClearanceStatusEnum,
    DepartmentClearance,
    DepartmentClearanceTypeEnum,
    EmployeeSeparation,
    ExitInterview,
    FinalSettlement,
    ReleaseLetter,
    ReleaseLetterStatusEnum,
    ResignationApplication,
    ResignationStatusEnum,
    SeparationStatusEnum,
    SeparationTypeEnum,
    SettlementPaymentStatusEnum,
)
from app.modules.hr_payroll.separation.repository import (
    DepartmentClearanceRepository,
    ExitInterviewRepository,
    FinalSettlementRepository,
    ReleaseLetterRepository,
    ResignationRepository,
    SeparationRepository,
)
from app.modules.hr_payroll.separation.schemas import (
    AssetHandoverItem,
    DepartmentClearanceSignOff,
    EmployeeSeparationCreate,
    EmployeeSeparationUpdate,
    ExitInterviewCreate,
    ExitInterviewUpdate,
    FinalSettlementComputeRequest,
    FinalSettlementCreate,
    FinalSettlementDisburse,
    ReleaseLetterCreate,
    ResignationApplicationCreate,
    ResignationApplicationReview,
)


class SeparationService:
    def __init__(self):
        self.resignation_repo = ResignationRepository()
        self.separation_repo = SeparationRepository()
        self.clearance_repo = DepartmentClearanceRepository()
        self.exit_interview_repo = ExitInterviewRepository()
        self.settlement_repo = FinalSettlementRepository()
        self.release_letter_repo = ReleaseLetterRepository()

    # ── 1. Resignation Management ──────────────────────────────────────────
    def submit_resignation(
        self, db: Session, business_id: int, user: User, data: ResignationApplicationCreate
    ) -> ResignationApplication:
        employee = (
            db.query(Employee)
            .filter(Employee.id == data.employee_id, Employee.business_id == business_id)
            .first()
        )
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found in the current business context",
            )

        if data.proposed_last_working_day < data.notice_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Proposed last working day cannot precede the notice date",
            )

        served_notice_days = (data.proposed_last_working_day - data.notice_date).days
        shortfall_notice_days = max(0, data.contractual_notice_days - served_notice_days)

        return self.resignation_repo.create(
            db=db,
            business_id=business_id,
            data=data,
            served_notice_days=served_notice_days,
            shortfall_notice_days=shortfall_notice_days,
        )

    def review_resignation(
        self, db: Session, business_id: int, user: User, resignation_id: uuid.UUID, data: ResignationApplicationReview
    ) -> ResignationApplication:
        resignation = self.resignation_repo.get_by_id(db, resignation_id, business_id=business_id)
        if not resignation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Resignation application not found"
            )

        if resignation.status in [ResignationStatusEnum.APPROVED.value, ResignationStatusEnum.WITHDRAWN.value]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot review resignation in status '{resignation.status}'",
            )

        update_dict = {
            "status": data.status.value,
            "reviewed_by_id": user.id,
            "reviewed_at": datetime.utcnow(),
        }

        if data.status == ResignationStatusEnum.APPROVED:
            approved_lwd = data.approved_last_working_day or resignation.proposed_last_working_day
            served_days = (approved_lwd - resignation.notice_date).days
            shortfall = max(0, resignation.contractual_notice_days - served_days)

            update_dict["approved_last_working_day"] = approved_lwd
            update_dict["served_notice_days"] = served_days
            update_dict["shortfall_notice_days"] = shortfall

            resignation = self.resignation_repo.update(db, resignation, update_dict)

            # Auto initiate separation workflow if not already linked
            existing_sep = self.separation_repo.get_by_resignation_id(db, resignation.id)
            if not existing_sep:
                sep_create = EmployeeSeparationCreate(
                    employee_id=resignation.employee_id,
                    separation_type=SeparationTypeEnum.RESIGNATION,
                    order_date=date.today(),
                    last_working_date=approved_lwd,
                    reason=f"Voluntary Resignation: {resignation.reason_category}",
                    resignation_id=resignation.id,
                    severance_entitled=False,
                )
                self.initiate_separation(db, business_id, user, sep_create)
            return resignation

        elif data.status == ResignationStatusEnum.REJECTED:
            update_dict["rejection_reason"] = data.rejection_reason or "Management rejected resignation application"
            return self.resignation_repo.update(db, resignation, update_dict)

        else:
            return self.resignation_repo.update(db, resignation, update_dict)

    def withdraw_resignation(
        self, db: Session, business_id: int, user: User, resignation_id: uuid.UUID
    ) -> ResignationApplication:
        resignation = self.resignation_repo.get_by_id(db, resignation_id, business_id=business_id)
        if not resignation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Resignation application not found"
            )

        if resignation.status == ResignationStatusEnum.APPROVED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Approved resignations cannot be withdrawn directly. Contact HR management.",
            )

        return self.resignation_repo.update(
            db, resignation, {"status": ResignationStatusEnum.WITHDRAWN.value}
        )

    # ── 2. Employee Separation Master ──────────────────────────────────────
    def initiate_separation(
        self, db: Session, business_id: int, user: User, data: EmployeeSeparationCreate
    ) -> EmployeeSeparation:
        employee = (
            db.query(Employee)
            .filter(Employee.id == data.employee_id, Employee.business_id == business_id)
            .first()
        )
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found in the current business"
            )

        # Calculate service duration
        start_date = employee.start_date or date.today()
        service_duration_days = max(0, (data.last_working_date - start_date).days)
        service_duration_years = round(service_duration_days / 365.25, 2)

        separation = self.separation_repo.create(
            db=db,
            business_id=business_id,
            data=data,
            service_duration_days=service_duration_days,
            service_duration_years=service_duration_years,
        )

        # Auto-provision 5 department clearances
        department_types = [
            DepartmentClearanceTypeEnum.LINE_MANAGER,
            DepartmentClearanceTypeEnum.IT_SYSTEMS,
            DepartmentClearanceTypeEnum.FINANCE_ACCOUNTS,
            DepartmentClearanceTypeEnum.ADMIN_FACILITIES,
            DepartmentClearanceTypeEnum.HUMAN_RESOURCES,
        ]
        for dept in department_types:
            clearance = DepartmentClearance(
                business_id=business_id,
                separation_id=separation.id,
                employee_id=separation.employee_id,
                department_type=dept.value,
                status=ClearanceStatusEnum.PENDING.value,
                outstanding_amount=Decimal("0.00"),
                checklist_remarks=f"Initial pending clearance for {dept.value}",
            )
            db.add(clearance)
        db.commit()
        db.refresh(separation)
        return separation

    def update_separation(
        self, db: Session, business_id: int, user: User, separation_id: uuid.UUID, data: EmployeeSeparationUpdate
    ) -> EmployeeSeparation:
        separation = self.separation_repo.get_by_id(db, separation_id, business_id=business_id)
        if not separation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Separation record not found"
            )

        update_dict = data.model_dump(exclude_unset=True)
        if "separation_type" in update_dict and update_dict["separation_type"] is not None:
            update_dict["separation_type"] = (
                update_dict["separation_type"].value
                if hasattr(update_dict["separation_type"], "value")
                else str(update_dict["separation_type"])
            )
        if "status" in update_dict and update_dict["status"] is not None:
            update_dict["status"] = (
                update_dict["status"].value
                if hasattr(update_dict["status"], "value")
                else str(update_dict["status"])
            )

        if "last_working_date" in update_dict and update_dict["last_working_date"] is not None:
            start_date = separation.employee.start_date or date.today()
            days = max(0, (update_dict["last_working_date"] - start_date).days)
            update_dict["service_duration_days"] = days
            update_dict["service_duration_years"] = round(days / 365.25, 2)

        return self.separation_repo.update(db, separation, update_dict)

    # ── 3. Department Clearance (NOC) ──────────────────────────────────────
    def sign_off_department_clearance(
        self, db: Session, business_id: int, user: User, clearance_id: uuid.UUID, data: DepartmentClearanceSignOff
    ) -> DepartmentClearance:
        clearance = self.clearance_repo.get_by_id(db, clearance_id, business_id=business_id)
        if not clearance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Department clearance record not found"
            )

        update_dict = {
            "status": data.status.value if hasattr(data.status, "value") else str(data.status),
            "outstanding_amount": data.outstanding_amount,
            "checklist_remarks": data.checklist_remarks,
            "cleared_by_id": user.id,
            "cleared_at": datetime.utcnow(),
        }
        updated_clearance = self.clearance_repo.update(db, clearance, update_dict)

        # Check if all clearances for the separation are cleared or waived
        all_clearances = self.clearance_repo.get_by_separation(db, clearance.separation_id, business_id=business_id)
        all_cleared = all(c.status in [ClearanceStatusEnum.CLEARED.value, ClearanceStatusEnum.WAIVED.value] for c in all_clearances)

        separation = self.separation_repo.get_by_id(db, clearance.separation_id, business_id=business_id)
        if separation:
            if all_cleared and separation.status in [SeparationStatusEnum.INITIATED.value, SeparationStatusEnum.CLEARANCE_IN_PROGRESS.value]:
                self.separation_repo.update(db, separation, {"status": SeparationStatusEnum.SETTLEMENT_PENDING.value})
            elif not all_cleared and separation.status == SeparationStatusEnum.INITIATED.value:
                self.separation_repo.update(db, separation, {"status": SeparationStatusEnum.CLEARANCE_IN_PROGRESS.value})

        return updated_clearance

    # ── 4. Asset Handover Desk ─────────────────────────────────────────────
    def get_asset_handover_items(self, db: Session, business_id: int, employee_id: uuid.UUID) -> list[AssetHandoverItem]:
        assignments = (
            db.query(AssetAssignment)
            .filter(
                AssetAssignment.business_id == business_id,
                AssetAssignment.employee_id == employee_id,
            )
            .all()
        )
        items = []
        for a in assignments:
            asset = a.asset if hasattr(a, "asset") else db.query(CompanyAsset).filter(CompanyAsset.id == a.asset_id).first()
            category_name = asset.category.name if asset and hasattr(asset, "category") and asset.category else None
            items.append(
                AssetHandoverItem(
                    assignment_id=a.id,
                    asset_id=a.asset_id,
                    asset_name=asset.name if asset and hasattr(asset, "name") else "Asset Item",
                    asset_tag=asset.asset_tag if asset else "UNKNOWN",
                    category=category_name,
                    assigned_date=a.assigned_date,
                    status=a.status,
                    condition_notes=a.issue_notes or a.return_notes,
                )
            )
        return items

    def process_asset_return(
        self, db: Session, business_id: int, user: User, assignment_id: uuid.UUID, return_condition: str, return_notes: Optional[str] = None
    ) -> AssetAssignment:
        assignment = (
            db.query(AssetAssignment)
            .filter(AssetAssignment.id == assignment_id, AssetAssignment.business_id == business_id)
            .first()
        )
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Asset assignment not found"
            )

        assignment.status = AllocationStatusEnum.RETURNED.value
        assignment.actual_return_date = date.today()
        assignment.return_condition = return_condition
        assignment.return_notes = return_notes

        asset = db.query(CompanyAsset).filter(CompanyAsset.id == assignment.asset_id).first()
        if asset:
            asset.current_status = (
                AssetStatusEnum.DAMAGED.value if return_condition == "damaged" else AssetStatusEnum.AVAILABLE.value
            )

        db.commit()
        db.refresh(assignment)
        return assignment

    # ── 5. Exit Interview ──────────────────────────────────────────────────
    def record_exit_interview(
        self, db: Session, business_id: int, user: User, data: ExitInterviewCreate
    ) -> ExitInterview:
        separation = self.separation_repo.get_by_id(db, data.separation_id, business_id=business_id)
        if not separation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Separation record not found"
            )

        existing = self.exit_interview_repo.get_by_separation(db, data.separation_id)
        if existing:
            update_data = data.model_dump()
            return self.exit_interview_repo.update(db, existing, update_data)

        return self.exit_interview_repo.create(db, business_id, data, interviewer_id=user.id)

    # ── 6. Full & Final Settlement (FnF) ───────────────────────────────────
    def compute_final_settlement(
        self,
        db: Session,
        business_id: int,
        user: User,
        separation_id: uuid.UUID,
        request_data: Optional[FinalSettlementComputeRequest] = None,
    ) -> FinalSettlement:
        separation = self.separation_repo.get_by_id(db, separation_id, business_id=business_id)
        if not separation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Separation record not found"
            )

        employee = separation.employee

        # Salary Structure
        salary_record = (
            db.query(EmployeeSalary)
            .filter(EmployeeSalary.employee_id == employee.id, EmployeeSalary.business_id == business_id)
            .first()
        )
        basic_salary = Decimal(str(salary_record.basic_salary)) if salary_record else Decimal("0.00")
        gross_salary = Decimal(str(salary_record.gross_salary)) if salary_record else Decimal("0.00")

        daily_basic = (basic_salary / Decimal("30")).quantize(Decimal("0.01"))
        daily_gross = (gross_salary / Decimal("30")).quantize(Decimal("0.01"))

        # 1. Unpaid Salary Days
        unpaid_days = request_data.unpaid_salary_days if (request_data and request_data.unpaid_salary_days is not None) else 0
        unpaid_amount = (Decimal(str(unpaid_days)) * daily_gross).quantize(Decimal("0.01"))

        # 2. Leave Encashment (BLA 2006 Sec 117: unavailed annual earned leave encashed at daily basic rate)
        leave_alloc = (
            db.query(LeaveAllocation)
            .join(LeaveType, LeaveAllocation.leave_type_id == LeaveType.id)
            .filter(
                LeaveAllocation.employee_id == employee.id,
                LeaveAllocation.business_id == business_id,
            )
            .first()
        )
        leave_days = float(leave_alloc.remaining_days) if leave_alloc and hasattr(leave_alloc, "remaining_days") else 0.0
        leave_amount = (Decimal(str(leave_days)) * daily_basic).quantize(Decimal("0.01"))

        # 3. Gratuity (BLA 2006 Sec 2(10) & 27)
        # Eligibility: 5+ continuous years of service (or retrenchment / legal severance)
        service_years = separation.service_duration_years
        gratuity_amount = Decimal("0.00")
        if service_years >= 5.0 or separation.severance_entitled:
            if service_years < 10.0:
                # 30 days basic wages for each year
                gratuity_amount = (Decimal(str(service_years)) * basic_salary).quantize(Decimal("0.01"))
            else:
                # 45 days basic wages for each year beyond 10 years (or across tenure per BLA 2006 amendments)
                gratuity_amount = (Decimal(str(service_years)) * basic_salary * Decimal("1.5")).quantize(Decimal("0.01"))

        # 4. Severance Pay
        severance_amount = Decimal("0.00")
        if separation.severance_entitled and separation.separation_type in [
            SeparationTypeEnum.RETRENCHMENT.value,
            SeparationTypeEnum.TERMINATION.value,
        ]:
            # 30 days wages per completed year of service (BLA 2006 Sec 20)
            severance_amount = (Decimal(str(math.floor(service_years))) * gross_salary).quantize(Decimal("0.01"))

        # 5. Provident Fund
        pf_amount = Decimal(str(salary_record.provident_fund * 2)) if (salary_record and salary_record.provident_fund) else Decimal("0.00")

        # 6. Bonus Arrears & Other Payables
        bonus_arrears = request_data.bonus_arrears_amount if (request_data and request_data.bonus_arrears_amount is not None) else Decimal("0.00")
        other_payables = request_data.other_payable_amount if (request_data and request_data.other_payable_amount is not None) else Decimal("0.00")

        total_payable = (
            unpaid_amount
            + leave_amount
            + gratuity_amount
            + severance_amount
            + pf_amount
            + bonus_arrears
            + other_payables
        ).quantize(Decimal("0.01"))

        # 7. Deductions
        # Notice Shortfall
        shortfall_days = 0
        if separation.resignation:
            shortfall_days = separation.resignation.shortfall_notice_days
        shortfall_deduction = (Decimal(str(shortfall_days)) * daily_basic).quantize(Decimal("0.01"))

        # Active Loan Recovery
        active_loans = (
            db.query(EmployeeLoan)
            .filter(
                EmployeeLoan.employee_id == employee.id,
                EmployeeLoan.business_id == business_id,
                EmployeeLoan.status.in_(["approved", "disbursed", "active"]),
            )
            .all()
        )
        loan_deduction = sum(
            [Decimal(str(l.remaining_balance)) for l in active_loans if hasattr(l, "remaining_balance") and l.remaining_balance],
            Decimal("0.00"),
        )

        # Department Clearances Outstanding Recoveries
        clearances = self.clearance_repo.get_by_separation(db, separation.id, business_id=business_id)
        clearance_charges = sum([Decimal(str(c.outstanding_amount)) for c in clearances], Decimal("0.00"))

        asset_damage = request_data.asset_damage_deduction if (request_data and request_data.asset_damage_deduction is not None) else Decimal("0.00")
        tax_deduction = request_data.tax_withholding_deduction if (request_data and request_data.tax_withholding_deduction is not None) else Decimal("0.00")

        total_deduction = (
            shortfall_deduction
            + loan_deduction
            + clearance_charges
            + asset_damage
            + tax_deduction
        ).quantize(Decimal("0.01"))

        net_payable = max(Decimal("0.00"), total_payable - total_deduction).quantize(Decimal("0.01"))

        settlement_date = (
            request_data.settlement_date if (request_data and request_data.settlement_date) else separation.last_working_date
        )

        existing_settlement = self.settlement_repo.get_by_separation(db, separation.id)
        if existing_settlement:
            update_data = {
                "settlement_date": settlement_date,
                "unpaid_salary_days": unpaid_days,
                "unpaid_salary_amount": unpaid_amount,
                "leave_encashment_days": leave_days,
                "leave_encashment_amount": leave_amount,
                "gratuity_years": service_years,
                "gratuity_amount": gratuity_amount,
                "provident_fund_amount": pf_amount,
                "severance_pay_amount": severance_amount,
                "bonus_arrears_amount": bonus_arrears,
                "other_payable_amount": other_payables,
                "total_payable_amount": total_payable,
                "notice_shortfall_days": shortfall_days,
                "notice_shortfall_deduction": shortfall_deduction,
                "loan_advance_deduction": loan_deduction,
                "asset_damage_deduction": asset_damage,
                "clearance_charge_deduction": clearance_charges,
                "tax_withholding_deduction": tax_deduction,
                "total_deduction_amount": total_deduction,
                "net_payable_amount": net_payable,
                "notes": request_data.notes if request_data else existing_settlement.notes,
            }
            return self.settlement_repo.update(db, existing_settlement, update_data)

        create_dto = FinalSettlementCreate(
            separation_id=separation.id,
            employee_id=employee.id,
            settlement_date=settlement_date,
            unpaid_salary_days=unpaid_days,
            unpaid_salary_amount=unpaid_amount,
            leave_encashment_days=leave_days,
            leave_encashment_amount=leave_amount,
            gratuity_years=service_years,
            gratuity_amount=gratuity_amount,
            provident_fund_amount=pf_amount,
            severance_pay_amount=severance_amount,
            bonus_arrears_amount=bonus_arrears,
            other_payable_amount=other_payables,
            total_payable_amount=total_payable,
            notice_shortfall_days=shortfall_days,
            notice_shortfall_deduction=shortfall_deduction,
            loan_advance_deduction=loan_deduction,
            asset_damage_deduction=asset_damage,
            clearance_charge_deduction=clearance_charges,
            tax_withholding_deduction=tax_deduction,
            total_deduction_amount=total_deduction,
            net_payable_amount=net_payable,
            payment_method="bank_transfer",
            notes=request_data.notes if request_data else "Statutory F&F calculation per BLA 2006",
        )
        return self.settlement_repo.create(db, business_id, create_dto)

    def disburse_settlement(
        self, db: Session, business_id: int, user: User, settlement_id: uuid.UUID, data: FinalSettlementDisburse
    ) -> FinalSettlement:
        settlement = self.settlement_repo.get_by_id(db, settlement_id, business_id=business_id)
        if not settlement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Final settlement record not found"
            )

        if settlement.payment_status == SettlementPaymentStatusEnum.DISBURSED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Final settlement has already been disbursed.",
            )

        update_dict = {
            "payment_status": SettlementPaymentStatusEnum.DISBURSED.value,
            "payment_method": data.payment_method,
            "payment_reference": data.payment_reference,
            "disbursed_at": datetime.utcnow(),
            "notes": data.notes or settlement.notes,
        }
        settlement = self.settlement_repo.update(db, settlement, update_dict)

        # Mark separation completed
        separation = self.separation_repo.get_by_id(db, settlement.separation_id, business_id=business_id)
        if separation:
            self.separation_repo.update(db, separation, {"status": SeparationStatusEnum.COMPLETED.value})

        # CRITICAL: Deactivate Employee record
        employee = db.query(Employee).filter(Employee.id == settlement.employee_id).first()
        if employee:
            employee.is_active = False

            # If user login exists for employee, disable it immediately
            if employee.user_id:
                user_account = db.query(User).filter(User.id == employee.user_id).first()
                if user_account:
                    user_account.is_active = False

            db.commit()

        return settlement

    # ── 7. Relieving & Release Letter ──────────────────────────────────────
    def generate_release_letter(
        self, db: Session, business_id: int, user: User, data: ReleaseLetterCreate
    ) -> ReleaseLetter:
        separation = self.separation_repo.get_by_id(db, data.separation_id, business_id=business_id)
        if not separation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Separation record not found"
            )

        existing = self.release_letter_repo.get_by_separation(db, data.separation_id)
        if existing:
            update_data = data.model_dump()
            return self.release_letter_repo.update(db, existing, update_data)

        return self.release_letter_repo.create(db, business_id, data)
