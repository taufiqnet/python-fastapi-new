import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.database import get_db
from app.modules.hr_payroll.employees.models import Employee
from app.modules.travel_expenses.schemas import (
    DAConveyancePolicyCreate,
    DAConveyancePolicyOut,
    DAConveyancePolicyUpdate,
    ExpenseClaimCreate,
    ExpenseClaimLineOut,
    ExpenseClaimOut,
    ExpenseClaimReview,
    ExpenseClaimSettle,
    TravelAdvanceDisburse,
    TravelAdvanceOut,
    TravelExpenseStats,
    TravelRequestCreate,
    TravelRequestOut,
    TravelRequestReview,
)
from app.modules.travel_expenses.services import TravelExpenseService

router = APIRouter(tags=["Travel & Expense Management"])
te_service = TravelExpenseService()


def _resolve_portal_employee(db: Session, user: User, target_emp_id: Optional[uuid.UUID] = None) -> uuid.UUID:
    """Helper to get employee_id for employee self-service or admin proxy."""
    if target_emp_id and (user.is_superuser or user.has_role("admin")):
        return target_emp_id
    emp = db.query(Employee).filter(Employee.user_id == user.id).first()
    if not emp:
        if target_emp_id:
            return target_emp_id
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user is not linked to an employee profile.",
        )
    return emp.id


# ===========================================================================
# 1. Travel Requests
# ===========================================================================
@router.post("/travel/requests", response_model=TravelRequestOut, status_code=status.HTTP_201_CREATED)
def create_travel_request(
    data: TravelRequestCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    emp_id = _resolve_portal_employee(db, current_user, data.employee_id)
    req = te_service.create_travel_request(db, biz_id, emp_id, data)

    out = TravelRequestOut.model_validate(req)
    if req.employee:
        out.employee_name = f"{req.employee.first_name} {req.employee.last_name or ''}".strip()
        out.employee_code = getattr(req.employee, "employee_id", None)
    return out


@router.get("/travel/requests", response_model=List[TravelRequestOut])
def list_travel_requests(
    employee_id: Optional[uuid.UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    requests = te_service.get_travel_requests(
        db, biz_id, employee_id=employee_id, status_filter=status_filter, skip=skip, limit=limit
    )

    results = []
    for r in requests:
        out = TravelRequestOut.model_validate(r)
        if r.employee:
            out.employee_name = f"{r.employee.first_name} {r.employee.last_name or ''}".strip()
            out.employee_code = getattr(r.employee, "employee_id", None)
        if r.approver:
            out.approver_name = r.approver.full_name or r.approver.email
        if r.advance:
            out.advance_id = r.advance.id
            out.advance_settlement_status = r.advance.settlement_status
        results.append(out)
    return results


@router.get("/travel/requests/{request_id}", response_model=TravelRequestOut)
def get_travel_request(
    request_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    req = te_service.get_travel_request_by_id(db, biz_id, request_id)
    out = TravelRequestOut.model_validate(req)
    if req.employee:
        out.employee_name = f"{req.employee.first_name} {req.employee.last_name or ''}".strip()
        out.employee_code = getattr(req.employee, "employee_id", None)
    if req.approver:
        out.approver_name = req.approver.full_name or req.approver.email
    if req.advance:
        out.advance_id = r.advance.id if (r := req) else None
        out.advance_settlement_status = req.advance.settlement_status
    return out


@router.post("/travel/requests/{request_id}/review", response_model=TravelRequestOut)
def review_travel_request(
    request_id: uuid.UUID,
    data: TravelRequestReview,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    req = te_service.review_travel_request(db, biz_id, request_id, current_user.id, data)
    out = TravelRequestOut.model_validate(req)
    if req.employee:
        out.employee_name = f"{req.employee.first_name} {req.employee.last_name or ''}".strip()
        out.employee_code = getattr(req.employee, "employee_id", None)
    return out


# ===========================================================================
# 2. Travel Advances
# ===========================================================================
@router.get("/travel/advances", response_model=List[TravelAdvanceOut])
def list_travel_advances(
    employee_id: Optional[uuid.UUID] = Query(None),
    settlement_status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return te_service.get_advances(
        db, biz_id, employee_id=employee_id, settlement_status=settlement_status, skip=skip, limit=limit
    )


@router.post("/travel/advances/{advance_id}/disburse", response_model=TravelAdvanceOut)
def disburse_travel_advance(
    advance_id: uuid.UUID,
    data: TravelAdvanceDisburse,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return te_service.disburse_advance(db, biz_id, advance_id, current_user.id, data)


# ===========================================================================
# 3. DA & Conveyance Policies
# ===========================================================================
@router.post("/expenses/policies", response_model=DAConveyancePolicyOut, status_code=status.HTTP_201_CREATED)
def create_policy(
    data: DAConveyancePolicyCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return te_service.create_policy(db, biz_id, data)


@router.get("/expenses/policies", response_model=List[DAConveyancePolicyOut])
def list_policies(
    active_only: bool = Query(False),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return te_service.get_policies(db, biz_id, active_only=active_only)


@router.put("/expenses/policies/{policy_id}", response_model=DAConveyancePolicyOut)
def update_policy(
    policy_id: uuid.UUID,
    data: DAConveyancePolicyUpdate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return te_service.update_policy(db, biz_id, policy_id, data)


@router.delete("/expenses/policies/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_policy(
    policy_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    te_service.delete_policy(db, biz_id, policy_id)
    return None


# ===========================================================================
# 4. Expense Settlement Claims
# ===========================================================================
@router.post("/expenses/claims", response_model=ExpenseClaimOut, status_code=status.HTTP_201_CREATED)
def create_expense_claim(
    data: ExpenseClaimCreate,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    emp_id = _resolve_portal_employee(db, current_user, data.employee_id)
    claim = te_service.create_claim(db, biz_id, emp_id, data)

    out = ExpenseClaimOut.model_validate(claim)
    if claim.employee:
        out.employee_name = f"{claim.employee.first_name} {claim.employee.last_name or ''}".strip()
        out.employee_code = getattr(claim.employee, "employee_id", None)
    out.lines = [ExpenseClaimLineOut.model_validate(ln) for ln in claim.lines]
    return out


@router.get("/expenses/claims", response_model=List[ExpenseClaimOut])
def list_expense_claims(
    employee_id: Optional[uuid.UUID] = Query(None),
    claim_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    claims = te_service.get_claims(
        db, biz_id, employee_id=employee_id, claim_type=claim_type, status_filter=status_filter, skip=skip, limit=limit
    )

    results = []
    for c in claims:
        out = ExpenseClaimOut.model_validate(c)
        if c.employee:
            out.employee_name = f"{c.employee.first_name} {c.employee.last_name or ''}".strip()
            out.employee_code = getattr(c.employee, "employee_id", None)
        out.lines = [ExpenseClaimLineOut.model_validate(ln) for ln in c.lines]
        results.append(out)
    return results


@router.get("/expenses/claims/{claim_id}", response_model=ExpenseClaimOut)
def get_expense_claim(
    claim_id: uuid.UUID,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    claim = te_service.get_claim_by_id(db, biz_id, claim_id)
    out = ExpenseClaimOut.model_validate(claim)
    if claim.employee:
        out.employee_name = f"{claim.employee.first_name} {claim.employee.last_name or ''}".strip()
        out.employee_code = getattr(claim.employee, "employee_id", None)
    out.lines = [ExpenseClaimLineOut.model_validate(ln) for ln in claim.lines]
    return out


@router.post("/expenses/claims/{claim_id}/review", response_model=ExpenseClaimOut)
def review_expense_claim(
    claim_id: uuid.UUID,
    data: ExpenseClaimReview,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    claim = te_service.review_claim(db, biz_id, claim_id, current_user.id, data)
    out = ExpenseClaimOut.model_validate(claim)
    if claim.employee:
        out.employee_name = f"{claim.employee.first_name} {claim.employee.last_name or ''}".strip()
        out.employee_code = getattr(claim.employee, "employee_id", None)
    out.lines = [ExpenseClaimLineOut.model_validate(ln) for ln in claim.lines]
    return out


@router.post("/expenses/claims/{claim_id}/settle", response_model=ExpenseClaimOut)
def settle_expense_claim(
    claim_id: uuid.UUID,
    data: ExpenseClaimSettle,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    claim = te_service.settle_claim(db, biz_id, claim_id, data)
    out = ExpenseClaimOut.model_validate(claim)
    if claim.employee:
        out.employee_name = f"{claim.employee.first_name} {claim.employee.last_name or ''}".strip()
        out.employee_code = getattr(claim.employee, "employee_id", None)
    out.lines = [ExpenseClaimLineOut.model_validate(ln) for ln in claim.lines]
    return out


# ===========================================================================
# 5. Travel & Expense Stats
# ===========================================================================
@router.get("/travel/overview/stats", response_model=TravelExpenseStats)
def get_travel_stats(
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    biz_id = resolve_business_id(current_user, business_id)
    return te_service.get_stats(db, biz_id)
