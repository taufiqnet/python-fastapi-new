import json
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_permission
from app.core.identity.models import User
from app.database import get_db
from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.portal.schemas import (
    AttendanceCorrectionRequestCreate,
    AttendanceCorrectionRequestOut,
    AttendanceCorrectionRequestReview,
    CompanyPolicyCreate,
    CompanyPolicyOut,
    EmployeeLoanCreate,
    EmployeeLoanDisburse,
    EmployeeLoanOut,
    EmployeeLoanReview,
    ExpenseClaimCreate,
    ExpenseClaimOut,
    ExpenseClaimReimburse,
    ExpenseClaimReview,
    HRTicketCommentCreate,
    HRTicketCommentOut,
    HRTicketCreate,
    HRTicketOut,
    HRTicketStatusUpdate,
    OfficialLetterRequestCreate,
    OfficialLetterRequestOut,
    OfficialLetterRequestReview,
    PortalDashboardOut,
    PortalMeOut,
    ProfileUpdateRequestCreate,
    ProfileUpdateRequestOut,
    ProfileUpdateRequestReview,
    TaxCardSummaryOut,
)
from app.modules.hr_payroll.portal.service import PortalService

router = APIRouter(prefix="/portal", tags=["Employee Portal"])
portal_service = PortalService()


def get_current_portal_employee(
    employee_id: uuid.UUID | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Employee:
    """Dependency to retrieve the employee corresponding to the current authenticated user."""
    return portal_service.resolve_employee_for_user(db, current_user, employee_id)


# ===========================================================================
# 1. Profile & Dashboard
# ===========================================================================
@router.get("/me", response_model=PortalMeOut)
def get_my_profile(
    emp: Employee = Depends(get_current_portal_employee),
    db: Session = Depends(get_db),
):
    """Retrieve self-service employee profile."""
    return portal_service.get_me(db, emp)


@router.get("/dashboard", response_model=PortalDashboardOut)
def get_my_dashboard(
    emp: Employee = Depends(get_current_portal_employee),
    db: Session = Depends(get_db),
):
    """Retrieve personal employee dashboard telemetry, attendance, leave dials, shifts, and notices."""
    return portal_service.get_dashboard(db, emp)


# ===========================================================================
# 2. Profile Update Requests
# ===========================================================================
@router.post("/profile-update-requests", response_model=ProfileUpdateRequestOut)
def submit_profile_update_request(
    data: ProfileUpdateRequestCreate,
    emp: Employee = Depends(get_current_portal_employee),
    db: Session = Depends(get_db),
):
    """Submit a request to update personal details, bank info, or addresses."""
    req = portal_service.create_profile_update_request(db, emp, data)
    return ProfileUpdateRequestOut(
        id=req.id,
        business_id=req.business_id,
        employee_id=req.employee_id,
        requested_changes=json.loads(req.requested_changes),
        reason=req.reason,
        status=req.status,
        reviewed_by_id=req.reviewed_by_id,
        review_notes=req.review_notes,
        reviewed_at=req.reviewed_at,
        created_at=req.created_at,
    )


@router.get("/profile-update-requests", response_model=list[ProfileUpdateRequestOut])
def get_my_profile_update_requests(
    emp: Employee = Depends(get_current_portal_employee),
    db: Session = Depends(get_db),
):
    """View self-service profile update requests."""
    items = portal_service.get_profile_update_requests(db, employee_id=emp.id)
    return [
        ProfileUpdateRequestOut(
            id=r.id,
            business_id=r.business_id,
            employee_id=r.employee_id,
            requested_changes=json.loads(r.requested_changes),
            reason=r.reason,
            status=r.status,
            reviewed_by_id=r.reviewed_by_id,
            review_notes=r.review_notes,
            reviewed_at=r.reviewed_at,
            created_at=r.created_at,
        )
        for r in items
    ]


@router.patch("/admin/profile-update-requests/{request_id}/review", response_model=ProfileUpdateRequestOut)
def review_profile_update_request(
    request_id: uuid.UUID,
    data: ProfileUpdateRequestReview,
    current_user: User = Depends(require_permission("hrm", "employees", "manage")),
    db: Session = Depends(get_db),
):
    """HR Admin approval/rejection of employee profile update requests."""
    req = portal_service.review_profile_update_request(db, request_id, current_user.id, data)
    return ProfileUpdateRequestOut(
        id=req.id,
        business_id=req.business_id,
        employee_id=req.employee_id,
        requested_changes=json.loads(req.requested_changes),
        reason=req.reason,
        status=req.status,
        reviewed_by_id=req.reviewed_by_id,
        review_notes=req.review_notes,
        reviewed_at=req.reviewed_at,
        created_at=req.created_at,
    )


# ===========================================================================
# 3. Attendance Corrections
# ===========================================================================
@router.post("/attendance/correction-requests", response_model=AttendanceCorrectionRequestOut)
def submit_attendance_correction(
    data: AttendanceCorrectionRequestCreate,
    emp: Employee = Depends(get_current_portal_employee),
    db: Session = Depends(get_db),
):
    """Submit missed-punch or late excuse regularisation request."""
    return portal_service.create_attendance_correction(db, emp, data)


@router.get("/attendance/correction-requests", response_model=list[AttendanceCorrectionRequestOut])
def get_my_attendance_corrections(
    emp: Employee = Depends(get_current_portal_employee),
    db: Session = Depends(get_db),
):
    """List employee's attendance regularisation requests."""
    return portal_service.get_attendance_corrections(db, employee_id=emp.id)


@router.patch("/admin/attendance-corrections/{request_id}/review", response_model=AttendanceCorrectionRequestOut)
def review_attendance_correction(
    request_id: uuid.UUID,
    data: AttendanceCorrectionRequestReview,
    current_user: User = Depends(require_permission("hrm", "attendance", "manage")),
    db: Session = Depends(get_db),
):
    """HR Admin approval/rejection of attendance regularisation."""
    return portal_service.review_attendance_correction(db, request_id, current_user.id, data)


# ===========================================================================
# 4. Loans & Salary Advances
# ===========================================================================
@router.post("/loans", response_model=EmployeeLoanOut)
def apply_for_loan(
    data: EmployeeLoanCreate,
    emp: Employee = Depends(get_current_portal_employee),
    db: Session = Depends(get_db),
):
    """Apply for a salary advance or employee loan."""
    return portal_service.create_loan(db, emp, data)


@router.get("/loans", response_model=list[EmployeeLoanOut])
def get_my_loans(
    emp: Employee = Depends(get_current_portal_employee),
    db: Session = Depends(get_db),
):
    """List loan & advance applications with balances."""
    return db.query(portal_service.get_loans(db, employee_id=emp.id) if hasattr(portal_service, "get_loans") else []).all() if False else (
        db.query(EmployeeLoan).filter(EmployeeLoan.employee_id == emp.id).order_by(EmployeeLoan.created_at.desc()).all()
    )


@router.patch("/admin/loans/{loan_id}/review", response_model=EmployeeLoanOut)
def review_loan_application(
    loan_id: uuid.UUID,
    data: EmployeeLoanReview,
    current_user: User = Depends(require_permission("hrm", "payroll_records", "manage")),
    db: Session = Depends(get_db),
):
    """HR/Finance review of employee loan application."""
    return portal_service.review_loan(db, loan_id, current_user.id, data)


@router.post("/admin/loans/{loan_id}/disburse", response_model=EmployeeLoanOut)
def disburse_loan(
    loan_id: uuid.UUID,
    data: EmployeeLoanDisburse,
    current_user: User = Depends(require_permission("hrm", "payroll_records", "manage")),
    db: Session = Depends(get_db),
):
    """Disburse approved loan funds to employee."""
    return portal_service.disburse_loan(db, loan_id, data)


# ===========================================================================
# 5. Expense Reimbursement Claims
# ===========================================================================
@router.post("/expense-claims", response_model=ExpenseClaimOut)
def submit_expense_claim(
    data: ExpenseClaimCreate,
    emp: Employee = Depends(get_current_portal_employee),
    db: Session = Depends(get_db),
):
    """Submit business expense claim with receipt items."""
    return portal_service.create_expense_claim(db, emp, data)


@router.get("/expense-claims", response_model=list[ExpenseClaimOut])
def get_my_expense_claims(
    emp: Employee = Depends(get_current_portal_employee),
    db: Session = Depends(get_db),
):
    """List expense reimbursement claims."""
    return (
        db.query(ExpenseClaim)
        .filter(ExpenseClaim.employee_id == emp.id)
        .order_by(ExpenseClaim.created_at.desc())
        .all()
    )


@router.patch("/admin/expense-claims/{claim_id}/review", response_model=ExpenseClaimOut)
def review_expense_claim(
    claim_id: uuid.UUID,
    data: ExpenseClaimReview,
    current_user: User = Depends(require_permission("hrm", "payroll_records", "manage")),
    db: Session = Depends(get_db),
):
    """HR/Finance review of expense claim."""
    return portal_service.review_expense_claim(db, claim_id, current_user.id, data)


@router.post("/admin/expense-claims/{claim_id}/reimburse", response_model=ExpenseClaimOut)
def reimburse_expense_claim(
    claim_id: uuid.UUID,
    data: ExpenseClaimReimburse,
    current_user: User = Depends(require_permission("hrm", "payroll_records", "manage")),
    db: Session = Depends(get_db),
):
    """Mark expense claim as reimbursed."""
    return portal_service.reimburse_expense_claim(db, claim_id, data)


# ===========================================================================
# 6. Official Letters & NOC
# ===========================================================================
@router.post("/letter-requests", response_model=OfficialLetterRequestOut)
def request_official_letter(
    data: OfficialLetterRequestCreate,
    emp: Employee = Depends(get_current_portal_employee),
    db: Session = Depends(get_db),
):
    """Request an official letter (Visa NOC, Travel NOC, Salary Certificate, etc)."""
    return portal_service.create_letter_request(db, emp, data)


@router.get("/letter-requests", response_model=list[OfficialLetterRequestOut])
def get_my_letter_requests(
    emp: Employee = Depends(get_current_portal_employee),
    db: Session = Depends(get_db),
):
    """List employee official letter requests with download links."""
    return (
        db.query(OfficialLetterRequest)
        .filter(OfficialLetterRequest.employee_id == emp.id)
        .order_by(OfficialLetterRequest.created_at.desc())
        .all()
    )


@router.patch("/admin/letter-requests/{request_id}/review", response_model=OfficialLetterRequestOut)
def review_letter_request(
    request_id: uuid.UUID,
    data: OfficialLetterRequestReview,
    current_user: User = Depends(require_permission("hrm", "employees", "manage")),
    db: Session = Depends(get_db),
):
    """HR review and generation of requested official letter."""
    return portal_service.review_letter_request(db, request_id, current_user.id, data)


# ===========================================================================
# 7. Company Policies & Handbook
# ===========================================================================
@router.get("/policies", response_model=list[CompanyPolicyOut])
def get_company_policies(
    emp: Employee = Depends(get_current_portal_employee),
    db: Session = Depends(get_db),
):
    """Browse company policies and employee handbook with acknowledgement status."""
    return portal_service.get_policies(db, emp.business_id, emp.id)


@router.post("/policies/{policy_id}/acknowledge")
def acknowledge_policy(
    policy_id: uuid.UUID,
    request: Request,
    emp: Employee = Depends(get_current_portal_employee),
    db: Session = Depends(get_db),
):
    """Acknowledge reading of mandatory policy or employee handbook."""
    client_ip = request.client.host if request.client else None
    ack = portal_service.acknowledge_policy(db, policy_id, emp, client_ip)
    return {"status": "acknowledged", "acknowledged_at": ack.acknowledged_at}


@router.post("/admin/policies", response_model=CompanyPolicyOut)
def create_company_policy(
    data: CompanyPolicyCreate,
    current_user: User = Depends(require_permission("hrm", "departments", "manage")),
    db: Session = Depends(get_db),
):
    """HR publish a new policy or handbook version."""
    policy = CompanyPolicy(
        business_id=current_user.business_id or 1,
        title=data.title,
        category=data.category,
        version=data.version,
        effective_date=data.effective_date,
        summary=data.summary,
        content=data.content,
        attachment_url=data.attachment_url,
        is_mandatory_acknowledgement=data.is_mandatory_acknowledgement,
        is_active=data.is_active,
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return CompanyPolicyOut(
        id=policy.id,
        business_id=policy.business_id,
        title=policy.title,
        category=policy.category,
        version=policy.version,
        effective_date=policy.effective_date,
        summary=policy.summary,
        content=policy.content,
        attachment_url=policy.attachment_url,
        is_mandatory_acknowledgement=policy.is_mandatory_acknowledgement,
        is_active=policy.is_active,
        acknowledged_by_me=False,
        acknowledged_at=None,
        created_at=policy.created_at,
    )


# ===========================================================================
# 8. HR Helpdesk & Ticketing System
# ===========================================================================
@router.post("/tickets", response_model=HRTicketOut)
def create_helpdesk_ticket(
    data: HRTicketCreate,
    emp: Employee = Depends(get_current_portal_employee),
    db: Session = Depends(get_db),
):
    """Raise a support/grievance ticket to HR."""
    return portal_service.create_ticket(db, emp, data)


@router.get("/tickets", response_model=list[HRTicketOut])
def get_my_tickets(
    emp: Employee = Depends(get_current_portal_employee),
    db: Session = Depends(get_db),
):
    """List employee support tickets."""
    return (
        db.query(HRTicket)
        .filter(HRTicket.employee_id == emp.id)
        .order_by(HRTicket.created_at.desc())
        .all()
    )


@router.get("/tickets/{ticket_id}", response_model=HRTicketOut)
def get_ticket_detail(
    ticket_id: uuid.UUID,
    emp: Employee = Depends(get_current_portal_employee),
    db: Session = Depends(get_db),
):
    """Get full ticket details and discussion thread."""
    tkt = (
        db.query(HRTicket)
        .filter(HRTicket.id == ticket_id, HRTicket.employee_id == emp.id)
        .first()
    )
    if not tkt:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    return tkt


@router.post("/tickets/{ticket_id}/comments", response_model=HRTicketCommentOut)
def add_ticket_comment(
    ticket_id: uuid.UUID,
    data: HRTicketCommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Post reply to helpdesk discussion thread."""
    return portal_service.add_ticket_comment(db, ticket_id, current_user, data)


@router.patch("/tickets/{ticket_id}/status", response_model=HRTicketOut)
def update_ticket_status(
    ticket_id: uuid.UUID,
    data: HRTicketStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update ticket status (e.g. employee closes ticket or HR marks resolved)."""
    return portal_service.update_ticket_status(db, ticket_id, data)


# ===========================================================================
# 9. Payslips & Annual Tax Card (ITA 2023)
# ===========================================================================
@router.get("/payslips")
def get_my_payslips(
    emp: Employee = Depends(get_current_portal_employee),
    db: Session = Depends(get_db),
):
    """Retrieve historical monthly payslips."""
    records = portal_service.get_payslips(db, emp)
    return [
        {
            "id": r.id,
            "period_id": r.period_id,
            "period_name": r.period.name if getattr(r, "period", None) else "Payroll",
            "working_days": r.working_days,
            "present_days": r.present_days,
            "absent_days": r.absent_days,
            "leave_days": r.leave_days,
            "basic_salary": float(r.basic_salary or 0),
            "house_rent": float(r.house_rent or 0),
            "transport_allowance": float(r.transport_allowance or 0),
            "medical_allowance": float(r.medical_allowance or 0),
            "food_allowance": float(r.food_allowance or 0),
            "other_allowance": float(r.other_allowance or 0),
            "bonus": float(r.bonus or 0),
            "gross_salary": float(r.gross_salary or 0),
            "tax": float(r.tax or 0),
            "net_salary": float(r.net_salary or 0),
            "payment_status": getattr(r, "payment_status", "paid"),
            "created_at": r.created_at,
        }
        for r in records
    ]


@router.get("/tax-card", response_model=TaxCardSummaryOut)
def get_my_tax_card(
    fiscal_year: str = Query("2024-2025", description="e.g. 2024-2025"),
    emp: Employee = Depends(get_current_portal_employee),
    db: Session = Depends(get_db),
):
    """
    Download annual Income Tax Card (TDS Certificate) with statutory
    exemptions under Bangladesh Income Tax Act 2023.
    """
    return portal_service.get_tax_card_summary(db, emp, fiscal_year)
