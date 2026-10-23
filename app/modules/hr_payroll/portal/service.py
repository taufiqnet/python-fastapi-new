import json
import uuid
from datetime import date, datetime, timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.identity.models import User
from app.modules.hr_payroll.attendance.models import Attendance, AttendanceStatusEnum
from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.leave.models import LeaveAllocation, LeaveApplication, LeaveType
from app.modules.hr_payroll.notice_board.models import Notice, NoticeReadReceipt
from app.modules.hr_payroll.payroll.models import Holiday, PayrollPeriod, PayrollRecord
from app.modules.hr_payroll.portal.models import (
    AttendanceCorrectionRequest,
    CompanyPolicy,
    EmployeeLoan,
    ExpenseClaim,
    ExpenseClaimItem,
    HRTicket,
    HRTicketComment,
    OfficialLetterRequest,
    PolicyAcknowledgement,
    ProfileUpdateRequest,
)
from app.modules.hr_payroll.portal.schemas import (
    AttendanceCorrectionRequestCreate,
    AttendanceCorrectionRequestReview,
    CompanyPolicyCreate,
    EmployeeLoanCreate,
    EmployeeLoanDisburse,
    EmployeeLoanReview,
    ExpenseClaimCreate,
    ExpenseClaimReimburse,
    ExpenseClaimReview,
    HRTicketCommentCreate,
    HRTicketCreate,
    HRTicketStatusUpdate,
    OfficialLetterRequestCreate,
    OfficialLetterRequestReview,
    PortalDashboardOut,
    PortalHolidayItem,
    PortalLeaveBalanceItem,
    PortalMeOut,
    PortalNoticeItem,
    PortalRosterShiftItem,
    ProfileUpdateRequestCreate,
    ProfileUpdateRequestReview,
    TaxCardMonthlyRow,
    TaxCardSummaryOut,
)
from app.modules.hr_payroll.roster.models import DutyAssignment, Shift


class PortalService:
    # -----------------------------------------------------------------------
    # Employee Context Resolution
    # -----------------------------------------------------------------------
    def resolve_employee_for_user(
        self, db: Session, user: User, target_employee_id: uuid.UUID | None = None
    ) -> Employee:
        """Resolve the linked employee record for an authenticated user."""
        if target_employee_id and (user.is_superuser or user.has_role("admin")):
            emp = db.query(Employee).filter(Employee.id == target_employee_id).first()
            if emp:
                return emp

        # Check by user_id
        emp = db.query(Employee).filter(Employee.user_id == user.id).first()
        if not emp and user.email:
            # Fallback by email match within user's business
            emp = (
                db.query(Employee)
                .filter(
                    func.lower(Employee.work_email) == user.email.lower(),
                    Employee.business_id == user.business_id,
                )
                .first()
            )
            # If found, auto-link user_id for faster subsequent lookups
            if emp and emp.user_id is None:
                emp.user_id = user.id
                db.commit()

        if not emp and (user.is_superuser or user.has_role("admin")):
            # Superadmin preview fallback to the first active employee in the business
            emp = (
                db.query(Employee)
                .filter(Employee.business_id == (user.business_id or 1))
                .first()
            )

        if not emp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No employee profile is currently linked to your user account.",
            )
        return emp

    # -----------------------------------------------------------------------
    # 1. Profile & Dashboard Telemetry
    # -----------------------------------------------------------------------
    def get_me(self, db: Session, employee: Employee) -> PortalMeOut:
        return PortalMeOut(
            id=employee.id,
            business_id=employee.business_id,
            user_id=employee.user_id,
            employee_id=employee.employee_id,
            first_name=employee.first_name,
            last_name=employee.last_name,
            full_name=employee.full_name,
            bangla_name=employee.bangla_name,
            work_email=employee.work_email,
            personal_email=employee.personal_email,
            phone=employee.phone,
            date_of_birth=employee.date_of_birth,
            gender=employee.gender.value if employee.gender else None,
            blood_group=employee.blood_group,
            national_id=employee.national_id,
            tin=employee.tin,
            photo_url=employee.photo_url,
            department_name=employee.department_name,
            job_title_name=employee.job_title_name,
            branch_name=employee.branch_name,
            manager_name=employee.manager_name,
            employment_type=employee.employment_type.value if employee.employment_type else None,
            employee_category=employee.employee_category,
            work_arrangement=employee.work_arrangement.value if employee.work_arrangement else None,
            start_date=employee.start_date,
            confirmation_date=employee.confirmation_date,
            is_active=employee.is_active,
            disbursement_method=employee.disbursement_method,
            bank_name=employee.bank_name,
            bank_branch=employee.bank_branch,
            bank_account_no=employee.bank_account_no,
            bank_routing_number=employee.bank_routing_number,
            mfs_provider=employee.mfs_provider,
            mfs_number=employee.mfs_number,
            present_address=employee.present_address,
            permanent_address=employee.permanent_address,
            emergency_contact_name=employee.emergency_contact_name,
            emergency_contact_relation=employee.emergency_contact_relation,
            emergency_contact_phone=employee.emergency_contact_phone,
        )

    def get_dashboard(self, db: Session, employee: Employee) -> PortalDashboardOut:
        today = date.today()
        month_start = today.replace(day=1)
        next_month = (month_start + timedelta(days=32)).replace(day=1)

        # 1. Attendance Telemetry for current month
        attendances = (
            db.query(Attendance)
            .filter(
                Attendance.employee_id == employee.id,
                Attendance.date >= month_start,
                Attendance.date < next_month,
            )
            .all()
        )
        present_count = sum(1 for a in attendances if a.status == AttendanceStatusEnum.PRESENT)
        late_count = sum(1 for a in attendances if getattr(a, "is_late", False))
        absent_count = sum(1 for a in attendances if a.status == AttendanceStatusEnum.ABSENT)
        leave_count = sum(1 for a in attendances if a.status in (AttendanceStatusEnum.ON_LEAVE, AttendanceStatusEnum.HALF_DAY))
        total_overtime = sum(float(getattr(a, "overtime_hours", 0) or 0) for a in attendances)

        today_att = next((a for a in attendances if a.date == today), None)
        attendance_summary = {
            "month": today.strftime("%B %Y"),
            "present_days": present_count,
            "late_days": late_count,
            "absent_days": absent_count,
            "leave_days": leave_count,
            "overtime_hours": round(total_overtime, 1),
            "today_status": today_att.status.value if today_att else "not_punched",
            "today_punch_in": str(today_att.check_in) if today_att and today_att.check_in else None,
            "today_punch_out": str(today_att.check_out) if today_att and today_att.check_out else None,
        }

        # 2. Leave Balances
        allocations = (
            db.query(LeaveAllocation)
            .filter(
                LeaveAllocation.employee_id == employee.id,
                LeaveAllocation.year == today.year,
            )
            .all()
        )
        leave_balances = []
        for alloc in allocations:
            lt = alloc.leave_type
            if lt:
                alloc_days = float(alloc.allocated_days or 0)
                used_days = float(alloc.used_days or 0)
                cf_days = float(alloc.carried_forward or 0)
                enc_days = float(alloc.encashed_days or 0)
                rem_days = max(0.0, (alloc_days + cf_days) - (used_days + enc_days))
                leave_balances.append(
                    PortalLeaveBalanceItem(
                        leave_type_id=lt.id,
                        leave_type_name=lt.name,
                        code=lt.code,
                        is_statutory=getattr(lt, "is_statutory", lt.code in ("CL", "SL", "EL", "AL")),
                        allocated_days=alloc_days + cf_days,
                        used_days=used_days,
                        remaining_days=rem_days,
                    )
                )

        # 3. Upcoming Holidays (Next 60 days)
        sixty_days_ahead = today + timedelta(days=60)
        holidays = (
            db.query(Holiday)
            .filter(
                Holiday.business_id == employee.business_id,
                Holiday.start_date >= today,
                Holiday.start_date <= sixty_days_ahead,
            )
            .order_by(Holiday.start_date.asc())
            .limit(5)
            .all()
        )
        upcoming_holidays = [
            PortalHolidayItem(
                name=h.name,
                holiday_type=h.holiday_type.value,
                start_date=h.start_date,
                end_date=h.end_date,
                is_paid=h.is_paid,
            )
            for h in holidays
        ]

        # 4. Weekly Roster Shifts (Next 7 days)
        one_week_ahead = today + timedelta(days=7)
        duties = (
            db.query(DutyAssignment)
            .filter(
                DutyAssignment.employee_id == employee.id,
                DutyAssignment.date >= today,
                DutyAssignment.date <= one_week_ahead,
            )
            .order_by(DutyAssignment.date.asc())
            .all()
        )
        upcoming_shifts = []
        for d in duties:
            shift = d.shift
            if shift:
                upcoming_shifts.append(
                    PortalRosterShiftItem(
                        duty_date=d.date,
                        shift_name=shift.name,
                        start_time=str(shift.start_time) if shift.start_time else "09:00",
                        end_time=str(shift.end_time) if shift.end_time else "18:00",
                        is_night_shift=getattr(shift, "is_night_shift", False),
                    )
                )

        # 5. Recent Notices & Read Receipts
        notices = (
            db.query(Notice)
            .filter(
                Notice.business_id == employee.business_id,
                Notice.is_active == True,
                or_(
                    Notice.target_audience == "all",
                    Notice.department_id == employee.department_id,
                ),
            )
            .order_by(Notice.is_pinned.desc(), Notice.publish_date.desc())
            .limit(6)
            .all()
        )
        read_notice_ids = {
            r.notice_id
            for r in db.query(NoticeReadReceipt.notice_id)
            .filter(NoticeReadReceipt.employee_id == employee.id)
            .all()
        }
        recent_notices = [
            PortalNoticeItem(
                id=n.id,
                title=n.title,
                category=n.category.value,
                publish_date=n.publish_date,
                is_pinned=n.is_pinned,
                is_acknowledged=(n.id in read_notice_ids),
            )
            for n in notices
        ]
        unread_notices_count = sum(1 for n in recent_notices if not n.is_acknowledged)

        # 6. Counter metrics
        pending_requests = (
            db.query(ProfileUpdateRequest)
            .filter(
                ProfileUpdateRequest.employee_id == employee.id,
                ProfileUpdateRequest.status == "pending",
            )
            .count()
            + db.query(AttendanceCorrectionRequest)
            .filter(
                AttendanceCorrectionRequest.employee_id == employee.id,
                AttendanceCorrectionRequest.status == "pending",
            )
            .count()
            + db.query(LeaveApplication)
            .filter(
                LeaveApplication.employee_id == employee.id,
                LeaveApplication.status == "pending",
            )
            .count()
        )

        active_tickets = (
            db.query(HRTicket)
            .filter(
                HRTicket.employee_id == employee.id,
                HRTicket.status.in_(["open", "in_progress"]),
            )
            .count()
        )

        return PortalDashboardOut(
            profile=self.get_me(db, employee),
            attendance_summary=attendance_summary,
            leave_balances=leave_balances,
            upcoming_holidays=upcoming_holidays,
            upcoming_shifts=upcoming_shifts,
            recent_notices=recent_notices,
            unread_notices_count=unread_notices_count,
            pending_requests_count=pending_requests,
            active_tickets_count=active_tickets,
        )

    # -----------------------------------------------------------------------
    # 2. Profile Update Requests
    # -----------------------------------------------------------------------
    def create_profile_update_request(
        self, db: Session, employee: Employee, data: ProfileUpdateRequestCreate
    ) -> ProfileUpdateRequest:
        req = ProfileUpdateRequest(
            business_id=employee.business_id,
            employee_id=employee.id,
            requested_changes=json.dumps(data.requested_changes),
            reason=data.reason,
            status="pending",
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        return req

    def get_profile_update_requests(
        self, db: Session, employee_id: uuid.UUID | None = None, business_id: int | None = None
    ) -> list[ProfileUpdateRequest]:
        q = db.query(ProfileUpdateRequest)
        if employee_id:
            q = q.filter(ProfileUpdateRequest.employee_id == employee_id)
        if business_id:
            q = q.filter(ProfileUpdateRequest.business_id == business_id)
        return q.order_by(ProfileUpdateRequest.created_at.desc()).all()

    def review_profile_update_request(
        self, db: Session, request_id: uuid.UUID, reviewer_user_id: int, data: ProfileUpdateRequestReview
    ) -> ProfileUpdateRequest:
        req = db.query(ProfileUpdateRequest).filter(ProfileUpdateRequest.id == request_id).first()
        if not req:
            raise HTTPException(status_code=404, detail="Profile update request not found.")
        if req.status != "pending":
            raise HTTPException(status_code=400, detail=f"Request is already {req.status}.")

        req.status = data.status
        req.review_notes = data.review_notes
        req.reviewed_by_id = reviewer_user_id
        req.reviewed_at = datetime.utcnow()

        if data.status == "approved":
            # Apply changes to Employee record
            emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
            if emp:
                changes = json.loads(req.requested_changes)
                allowed_fields = {
                    "phone",
                    "personal_email",
                    "present_address",
                    "permanent_address",
                    "emergency_contact_name",
                    "emergency_contact_relation",
                    "emergency_contact_phone",
                    "disbursement_method",
                    "bank_name",
                    "bank_branch",
                    "bank_account_no",
                    "bank_routing_number",
                    "mfs_provider",
                    "mfs_number",
                    "photo_url",
                }
                for k, v in changes.items():
                    if k in allowed_fields and hasattr(emp, k):
                        setattr(emp, k, v)
        db.commit()
        db.refresh(req)
        return req

    # -----------------------------------------------------------------------
    # 3. Attendance Correction Requests
    # -----------------------------------------------------------------------
    def create_attendance_correction(
        self, db: Session, employee: Employee, data: AttendanceCorrectionRequestCreate
    ) -> AttendanceCorrectionRequest:
        req = AttendanceCorrectionRequest(
            business_id=employee.business_id,
            employee_id=employee.id,
            attendance_date=data.attendance_date,
            request_type=data.request_type,
            requested_time_in=data.requested_time_in,
            requested_time_out=data.requested_time_out,
            reason=data.reason,
            supporting_document_url=data.supporting_document_url,
            status="pending",
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        return req

    def get_attendance_corrections(
        self, db: Session, employee_id: uuid.UUID | None = None, business_id: int | None = None
    ) -> list[AttendanceCorrectionRequest]:
        q = db.query(AttendanceCorrectionRequest)
        if employee_id:
            q = q.filter(AttendanceCorrectionRequest.employee_id == employee_id)
        if business_id:
            q = q.filter(AttendanceCorrectionRequest.business_id == business_id)
        return q.order_by(AttendanceCorrectionRequest.created_at.desc()).all()

    def review_attendance_correction(
        self, db: Session, request_id: uuid.UUID, reviewer_user_id: int, data: AttendanceCorrectionRequestReview
    ) -> AttendanceCorrectionRequest:
        req = db.query(AttendanceCorrectionRequest).filter(AttendanceCorrectionRequest.id == request_id).first()
        if not req:
            raise HTTPException(status_code=404, detail="Attendance correction request not found.")
        if req.status != "pending":
            raise HTTPException(status_code=400, detail=f"Request is already {req.status}.")

        req.status = data.status
        req.review_notes = data.review_notes
        req.reviewed_by_id = reviewer_user_id
        req.reviewed_at = datetime.utcnow()

        if data.status == "approved":
            # Find or create Attendance record
            att = (
                db.query(Attendance)
                .filter(
                    Attendance.employee_id == req.employee_id,
                    Attendance.date == req.attendance_date,
                )
                .first()
            )
            if not att:
                att = Attendance(
                    business_id=req.business_id,
                    employee_id=req.employee_id,
                    date=req.attendance_date,
                    status=AttendanceStatusEnum.PRESENT,
                    note=f"Regularised: {req.reason}"[:255],
                )
                db.add(att)
            else:
                att.status = AttendanceStatusEnum.PRESENT
                att.note = ((att.note or "") + f" [Regularised: {req.reason}]")[:255]

            if req.requested_time_in:
                try:
                    att.check_in = datetime.strptime(req.requested_time_in, "%H:%M").time()
                except ValueError:
                    pass
            if req.requested_time_out:
                try:
                    att.check_out = datetime.strptime(req.requested_time_out, "%H:%M").time()
                except ValueError:
                    pass

        db.commit()
        db.refresh(req)
        return req

    # -----------------------------------------------------------------------
    # 4. Loans & Salary Advances
    # -----------------------------------------------------------------------
    def create_loan(
        self, db: Session, employee: Employee, data: EmployeeLoanCreate
    ) -> EmployeeLoan:
        monthly_inst = round(data.principal_amount / max(1, data.total_installments), 2)
        loan = EmployeeLoan(
            business_id=employee.business_id,
            employee_id=employee.id,
            loan_type=data.loan_type,
            principal_amount=data.principal_amount,
            monthly_installment_amount=monthly_inst,
            total_installments=data.total_installments,
            remaining_balance=data.principal_amount,
            repayment_start_date=data.repayment_start_date or (date.today() + timedelta(days=30)),
            reason=data.reason,
            status="pending",
        )
        db.add(loan)
        db.commit()
        db.refresh(loan)
        return loan

    def review_loan(
        self, db: Session, loan_id: uuid.UUID, reviewer_user_id: int, data: EmployeeLoanReview
    ) -> EmployeeLoan:
        loan = db.query(EmployeeLoan).filter(EmployeeLoan.id == loan_id).first()
        if not loan:
            raise HTTPException(status_code=404, detail="Loan application not found.")
        if loan.status != "pending":
            raise HTTPException(status_code=400, detail=f"Loan is already {loan.status}.")

        loan.status = data.status
        loan.notes = data.notes
        loan.approved_by_id = reviewer_user_id
        db.commit()
        db.refresh(loan)
        return loan

    def disburse_loan(
        self, db: Session, loan_id: uuid.UUID, data: EmployeeLoanDisburse
    ) -> EmployeeLoan:
        loan = db.query(EmployeeLoan).filter(EmployeeLoan.id == loan_id).first()
        if not loan:
            raise HTTPException(status_code=404, detail="Loan application not found.")
        if loan.status != "approved":
            raise HTTPException(status_code=400, detail="Only approved loans can be disbursed.")

        loan.status = "disbursed"
        loan.disbursed_amount = loan.principal_amount
        loan.disbursed_at = datetime.utcnow()
        loan.notes = (loan.notes or "") + f" [Disbursed ref: {data.payment_reference}]"
        db.commit()
        db.refresh(loan)
        return loan

    # -----------------------------------------------------------------------
    # 5. Expense Claims
    # -----------------------------------------------------------------------
    def create_expense_claim(
        self, db: Session, employee: Employee, data: ExpenseClaimCreate
    ) -> ExpenseClaim:
        claim_number = f"EXP-{datetime.utcnow().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
        total = sum(item.amount for item in data.items)

        claim = ExpenseClaim(
            business_id=employee.business_id,
            employee_id=employee.id,
            claim_number=claim_number,
            title=data.title,
            claim_date=data.claim_date,
            total_amount=total,
            status="submitted",
        )
        db.add(claim)
        db.flush()

        for itm in data.items:
            claim_item = ExpenseClaimItem(
                claim_id=claim.id,
                expense_date=itm.expense_date,
                category=itm.category,
                amount=itm.amount,
                description=itm.description,
                receipt_url=itm.receipt_url,
            )
            db.add(claim_item)

        db.commit()
        db.refresh(claim)
        return claim

    def review_expense_claim(
        self, db: Session, claim_id: uuid.UUID, reviewer_user_id: int, data: ExpenseClaimReview
    ) -> ExpenseClaim:
        claim = db.query(ExpenseClaim).filter(ExpenseClaim.id == claim_id).first()
        if not claim:
            raise HTTPException(status_code=404, detail="Expense claim not found.")
        if claim.status != "submitted":
            raise HTTPException(status_code=400, detail=f"Claim is already {claim.status}.")

        claim.status = data.status
        claim.review_notes = data.review_notes
        claim.reviewer_id = reviewer_user_id
        db.commit()
        db.refresh(claim)
        return claim

    def reimburse_expense_claim(
        self, db: Session, claim_id: uuid.UUID, data: ExpenseClaimReimburse
    ) -> ExpenseClaim:
        claim = db.query(ExpenseClaim).filter(ExpenseClaim.id == claim_id).first()
        if not claim:
            raise HTTPException(status_code=404, detail="Expense claim not found.")
        if claim.status != "approved":
            raise HTTPException(status_code=400, detail="Only approved claims can be reimbursed.")

        claim.status = "reimbursed"
        claim.payment_reference = data.payment_reference
        claim.reimbursed_at = datetime.utcnow()
        if data.review_notes:
            claim.review_notes = (claim.review_notes or "") + f" [Reimburse note: {data.review_notes}]"
        db.commit()
        db.refresh(claim)
        return claim

    # -----------------------------------------------------------------------
    # 6. Official Letters & NOC
    # -----------------------------------------------------------------------
    def create_letter_request(
        self, db: Session, employee: Employee, data: OfficialLetterRequestCreate
    ) -> OfficialLetterRequest:
        req = OfficialLetterRequest(
            business_id=employee.business_id,
            employee_id=employee.id,
            letter_type=data.letter_type,
            purpose=data.purpose,
            addressed_to=data.addressed_to,
            travel_country=data.travel_country,
            travel_start_date=data.travel_start_date,
            travel_end_date=data.travel_end_date,
            status="pending",
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        return req

    def review_letter_request(
        self, db: Session, request_id: uuid.UUID, reviewer_user_id: int, data: OfficialLetterRequestReview
    ) -> OfficialLetterRequest:
        req = db.query(OfficialLetterRequest).filter(OfficialLetterRequest.id == request_id).first()
        if not req:
            raise HTTPException(status_code=404, detail="Official letter request not found.")
        req.status = data.status
        req.review_notes = data.review_notes
        req.reviewed_by_id = reviewer_user_id
        req.reviewed_at = datetime.utcnow()
        if data.generated_file_url:
            req.generated_file_url = data.generated_file_url
        db.commit()
        db.refresh(req)
        return req

    # -----------------------------------------------------------------------
    # 7. Policies & Handbook Directory
    # -----------------------------------------------------------------------
    def get_policies(self, db: Session, business_id: int, employee_id: uuid.UUID) -> list[dict]:
        policies = (
            db.query(CompanyPolicy)
            .filter(
                CompanyPolicy.business_id == business_id,
                CompanyPolicy.is_active == True,
            )
            .order_by(CompanyPolicy.category.asc(), CompanyPolicy.title.asc())
            .all()
        )
        acks = {
            a.policy_id: a.acknowledged_at
            for a in db.query(PolicyAcknowledgement)
            .filter(PolicyAcknowledgement.employee_id == employee_id)
            .all()
        }
        res = []
        for p in policies:
            res.append(
                {
                    "id": p.id,
                    "business_id": p.business_id,
                    "title": p.title,
                    "category": p.category,
                    "version": p.version,
                    "effective_date": p.effective_date,
                    "summary": p.summary,
                    "content": p.content,
                    "attachment_url": p.attachment_url,
                    "is_mandatory_acknowledgement": p.is_mandatory_acknowledgement,
                    "is_active": p.is_active,
                    "acknowledged_by_me": (p.id in acks),
                    "acknowledged_at": acks.get(p.id),
                    "created_at": p.created_at,
                }
            )
        return res

    def acknowledge_policy(
        self, db: Session, policy_id: uuid.UUID, employee: Employee, ip_address: str | None = None
    ) -> PolicyAcknowledgement:
        existing = (
            db.query(PolicyAcknowledgement)
            .filter(
                PolicyAcknowledgement.policy_id == policy_id,
                PolicyAcknowledgement.employee_id == employee.id,
            )
            .first()
        )
        if existing:
            return existing

        ack = PolicyAcknowledgement(
            policy_id=policy_id,
            employee_id=employee.id,
            acknowledged_at=datetime.utcnow(),
            ip_address=ip_address,
        )
        db.add(ack)
        db.commit()
        db.refresh(ack)
        return ack

    # -----------------------------------------------------------------------
    # 8. HR Helpdesk & Ticketing
    # -----------------------------------------------------------------------
    def create_ticket(
        self, db: Session, employee: Employee, data: HRTicketCreate
    ) -> HRTicket:
        tkt_no = f"TKT-{datetime.utcnow().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
        tkt = HRTicket(
            business_id=employee.business_id,
            ticket_number=tkt_no,
            employee_id=employee.id,
            category=data.category,
            priority=data.priority,
            subject=data.subject,
            description=data.description,
            attachment_url=data.attachment_url,
            status="open",
        )
        db.add(tkt)
        db.commit()
        db.refresh(tkt)
        return tkt

    def add_ticket_comment(
        self, db: Session, ticket_id: uuid.UUID, author_user: User, data: HRTicketCommentCreate
    ) -> HRTicketComment:
        tkt = db.query(HRTicket).filter(HRTicket.id == ticket_id).first()
        if not tkt:
            raise HTTPException(status_code=404, detail="Ticket not found.")

        is_hr = author_user.is_superuser or author_user.has_role("admin") or author_user.has_permission("hrm:employees:view")
        comment = HRTicketComment(
            ticket_id=ticket_id,
            author_user_id=author_user.id,
            is_hr_staff=is_hr,
            message=data.message,
            attachment_url=data.attachment_url,
        )
        db.add(comment)
        # Advance status to in_progress if currently open
        if tkt.status == "open":
            tkt.status = "in_progress"
        db.commit()
        db.refresh(comment)
        return comment

    def update_ticket_status(
        self, db: Session, ticket_id: uuid.UUID, data: HRTicketStatusUpdate
    ) -> HRTicket:
        tkt = db.query(HRTicket).filter(HRTicket.id == ticket_id).first()
        if not tkt:
            raise HTTPException(status_code=404, detail="Ticket not found.")
        tkt.status = data.status
        if data.status in ("resolved", "closed"):
            tkt.resolved_at = datetime.utcnow()
            tkt.resolution_notes = data.resolution_notes
        db.commit()
        db.refresh(tkt)
        return tkt

    # -----------------------------------------------------------------------
    # 9. Payslip Archive & Tax Card (ITA 2023)
    # -----------------------------------------------------------------------
    def get_payslips(self, db: Session, employee: Employee) -> list[PayrollRecord]:
        return (
            db.query(PayrollRecord)
            .filter(PayrollRecord.employee_id == employee.id)
            .order_by(PayrollRecord.created_at.desc())
            .all()
        )

    def get_tax_card_summary(
        self, db: Session, employee: Employee, fiscal_year: str = "2024-2025"
    ) -> TaxCardSummaryOut:
        """
        Calculates annual tax withholding and statutory exemption summary
        under Bangladesh Income Tax Act (ITA 2023).
        """
        records = (
            db.query(PayrollRecord)
            .join(PayrollPeriod, PayrollRecord.period_id == PayrollPeriod.id)
            .filter(
                PayrollRecord.employee_id == employee.id,
                # e.g. names starting with 2024 or 2025
            )
            .order_by(PayrollPeriod.start_date.asc())
            .all()
        )

        total_basic = 0.0
        total_house_rent = 0.0
        total_medical = 0.0
        total_conveyance = 0.0
        total_bonus = 0.0
        total_gross = 0.0
        total_tax_withheld = 0.0
        monthly_breakdown = []

        for r in records:
            p_name = r.period.name if getattr(r, "period", None) else "Payroll"
            b_sal = float(r.basic_salary or 0)
            h_rent = float(r.house_rent or 0)
            med = float(r.medical_allowance or 0)
            conv = float(r.transport_allowance or 0)
            oth = float(r.other_allowance or 0) + float(r.food_allowance or 0)
            grs = float(r.gross_salary or 0)
            tx = float(r.tax or 0)

            total_basic += b_sal
            total_house_rent += h_rent
            total_medical += med
            total_conveyance += conv
            total_bonus += float(r.bonus or 0)
            total_gross += grs
            total_tax_withheld += tx

            monthly_breakdown.append(
                TaxCardMonthlyRow(
                    month_name=p_name,
                    period_id=r.period_id,
                    basic_salary=b_sal,
                    house_rent=h_rent,
                    medical_allowance=med,
                    conveyance=conv,
                    other_allowance=oth,
                    gross_salary=grs,
                    tax_deducted=tx,
                )
            )

        # Statutory Bangladesh ITA 2023 exemptions:
        # House rent exemption: lower of 50% basic or 300,000/yr (25,000/mo)
        exempt_house_rent = min(total_house_rent, min(total_basic * 0.5, 300000.0))
        # Conveyance exemption: up to 30,000/yr
        exempt_conveyance = min(total_conveyance, 30000.0)
        # Medical allowance exemption: lower of 10% basic or 120,000/yr
        exempt_medical = min(total_medical, min(total_basic * 0.1, 120000.0))

        total_exemptions = exempt_house_rent + exempt_conveyance + exempt_medical
        taxable_income = max(0.0, total_gross - total_exemptions)

        return TaxCardSummaryOut(
            employee_id=employee.id,
            employee_name=employee.full_name,
            tin=employee.tin,
            designation=employee.job_title_name,
            department=employee.department_name,
            fiscal_year=fiscal_year,
            assessment_year=f"{int(fiscal_year.split('-')[1])}-{int(fiscal_year.split('-')[1]) + 1}" if "-" in fiscal_year else "2025-2026",
            total_basic=round(total_basic, 2),
            total_house_rent=round(total_house_rent, 2),
            total_medical=round(total_medical, 2),
            total_conveyance=round(total_conveyance, 2),
            total_bonus=round(total_bonus, 2),
            total_gross_income=round(total_gross, 2),
            total_tax_exempted=round(total_exemptions, 2),
            taxable_income=round(taxable_income, 2),
            total_tax_withheld=round(total_tax_withheld, 2),
            monthly_breakdown=monthly_breakdown,
        )
