import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.modules.hr_payroll.employees.models import Employee
from app.modules.travel_expenses.models import (
    AdvanceStatusEnum,
    ClaimStatusEnum,
    ClaimTypeEnum,
    DAConveyancePolicy,
    ExpenseClaimLine,
    ExpenseSettlementClaim,
    TravelAdvance,
    TravelRequest,
    TravelStatusEnum,
)
from app.modules.travel_expenses.schemas import (
    DAConveyancePolicyCreate,
    DAConveyancePolicyUpdate,
    ExpenseClaimCreate,
    ExpenseClaimReview,
    ExpenseClaimSettle,
    TravelAdvanceDisburse,
    TravelExpenseStats,
    TravelRequestCreate,
    TravelRequestReview,
)


class TravelExpenseService:
    # -----------------------------------------------------------------------
    # 1. Travel Requests
    # -----------------------------------------------------------------------
    def create_travel_request(
        self, db: Session, business_id: int, employee_id: uuid.UUID, data: TravelRequestCreate
    ) -> TravelRequest:
        # Generate human-readable request number TRV-YYYYMM-XXXX
        today_str = date.today().strftime("%Y%m")
        count = (
            db.query(func.count(TravelRequest.id))
            .filter(TravelRequest.business_id == business_id)
            .scalar()
            or 0
        )
        req_number = f"TRV-{today_str}-{count + 1:04d}"

        payload = data.model_dump()
        payload.pop("employee_id", None)
        payload["travel_type"] = payload["travel_type"].value if hasattr(payload["travel_type"], "value") else payload["travel_type"]

        req = TravelRequest(
            business_id=business_id,
            employee_id=employee_id,
            request_number=req_number,
            status=TravelStatusEnum.PENDING_APPROVAL.value,
            **payload,
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        return req

    def review_travel_request(
        self,
        db: Session,
        business_id: int,
        request_id: uuid.UUID,
        approver_user_id: int,
        data: TravelRequestReview,
    ) -> TravelRequest:
        req = (
            db.query(TravelRequest)
            .filter(TravelRequest.business_id == business_id, TravelRequest.id == request_id)
            .first()
        )
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Travel request not found.")

        new_st = data.status.value if hasattr(data.status, "value") else data.status
        req.status = new_st
        req.approved_by_id = approver_user_id
        req.approved_at = datetime.utcnow()
        if data.rejection_reason:
            req.rejection_reason = data.rejection_reason
        if data.notes:
            req.notes = (req.notes or "") + f" [Approver: {data.notes}]"

        # If approved and advance is required, automatically create an advance record in UNSETTLED status
        if new_st == TravelStatusEnum.APPROVED.value and req.advance_required:
            existing_adv = db.query(TravelAdvance).filter(TravelAdvance.travel_request_id == req.id).first()
            if not existing_adv:
                today_str = date.today().strftime("%Y%m")
                adv_count = (
                    db.query(func.count(TravelAdvance.id))
                    .filter(TravelAdvance.business_id == business_id)
                    .scalar()
                    or 0
                )
                adv_number = f"ADV-{today_str}-{adv_count + 1:04d}"
                amount = data.advance_amount_approved or req.advance_amount_requested or Decimal("0.00")
                advance = TravelAdvance(
                    business_id=business_id,
                    travel_request_id=req.id,
                    employee_id=req.employee_id,
                    advance_number=adv_number,
                    amount_approved=amount,
                    settlement_status=AdvanceStatusEnum.UNSETTLED.value,
                )
                db.add(advance)

        db.commit()
        db.refresh(req)
        return req

    def get_travel_requests(
        self,
        db: Session,
        business_id: int,
        employee_id: Optional[uuid.UUID] = None,
        status_filter: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[TravelRequest]:
        query = (
            db.query(TravelRequest)
            .options(
                selectinload(TravelRequest.employee),
                selectinload(TravelRequest.approver),
                selectinload(TravelRequest.advance),
            )
            .filter(TravelRequest.business_id == business_id)
        )
        if employee_id:
            query = query.filter(TravelRequest.employee_id == employee_id)
        if status_filter:
            query = query.filter(TravelRequest.status == status_filter)

        return query.order_by(TravelRequest.created_at.desc()).offset(skip).limit(limit).all()

    def get_travel_request_by_id(self, db: Session, business_id: int, request_id: uuid.UUID) -> TravelRequest:
        req = (
            db.query(TravelRequest)
            .options(
                selectinload(TravelRequest.employee),
                selectinload(TravelRequest.approver),
                selectinload(TravelRequest.advance),
            )
            .filter(TravelRequest.business_id == business_id, TravelRequest.id == request_id)
            .first()
        )
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Travel request not found.")
        return req

    # -----------------------------------------------------------------------
    # 2. Travel Advances
    # -----------------------------------------------------------------------
    def disburse_advance(
        self,
        db: Session,
        business_id: int,
        advance_id: uuid.UUID,
        disbursed_by_user_id: int,
        data: TravelAdvanceDisburse,
    ) -> TravelAdvance:
        adv = (
            db.query(TravelAdvance)
            .filter(TravelAdvance.business_id == business_id, TravelAdvance.id == advance_id)
            .first()
        )
        if not adv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Travel advance record not found.")

        if data.amount:
            adv.amount_approved = data.amount
        adv.disbursed_at = datetime.utcnow()
        adv.disbursed_by_id = disbursed_by_user_id
        adv.disbursement_method = data.disbursement_method
        adv.payment_reference = data.payment_reference

        db.commit()
        db.refresh(adv)
        return adv

    def get_advances(
        self,
        db: Session,
        business_id: int,
        employee_id: Optional[uuid.UUID] = None,
        settlement_status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[TravelAdvance]:
        query = (
            db.query(TravelAdvance)
            .options(selectinload(TravelAdvance.employee), selectinload(TravelAdvance.disbursed_by))
            .filter(TravelAdvance.business_id == business_id)
        )
        if employee_id:
            query = query.filter(TravelAdvance.employee_id == employee_id)
        if settlement_status:
            query = query.filter(TravelAdvance.settlement_status == settlement_status)

        return query.order_by(TravelAdvance.created_at.desc()).offset(skip).limit(limit).all()

    # -----------------------------------------------------------------------
    # 3. DA & Conveyance Policies
    # -----------------------------------------------------------------------
    def create_policy(self, db: Session, business_id: int, data: DAConveyancePolicyCreate) -> DAConveyancePolicy:
        existing = (
            db.query(DAConveyancePolicy)
            .filter(
                DAConveyancePolicy.business_id == business_id,
                DAConveyancePolicy.grade_name == data.grade_name,
                DAConveyancePolicy.city_tier == data.city_tier,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Policy for grade '{data.grade_name}' and tier '{data.city_tier}' already exists.",
            )

        policy = DAConveyancePolicy(business_id=business_id, **data.model_dump())
        db.add(policy)
        db.commit()
        db.refresh(policy)
        return policy

    def get_policies(self, db: Session, business_id: int, active_only: bool = False) -> List[DAConveyancePolicy]:
        query = db.query(DAConveyancePolicy).filter(DAConveyancePolicy.business_id == business_id)
        if active_only:
            query = query.filter(DAConveyancePolicy.is_active == True)  # noqa: E712
        return query.order_by(DAConveyancePolicy.grade_name.asc(), DAConveyancePolicy.city_tier.asc()).all()

    def update_policy(
        self, db: Session, business_id: int, policy_id: uuid.UUID, data: DAConveyancePolicyUpdate
    ) -> DAConveyancePolicy:
        pol = (
            db.query(DAConveyancePolicy)
            .filter(DAConveyancePolicy.business_id == business_id, DAConveyancePolicy.id == policy_id)
            .first()
        )
        if not pol:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found.")
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(pol, k, v)
        db.commit()
        db.refresh(pol)
        return pol

    def delete_policy(self, db: Session, business_id: int, policy_id: uuid.UUID) -> None:
        pol = (
            db.query(DAConveyancePolicy)
            .filter(DAConveyancePolicy.business_id == business_id, DAConveyancePolicy.id == policy_id)
            .first()
        )
        if not pol:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found.")
        db.delete(pol)
        db.commit()

    # -----------------------------------------------------------------------
    # 4. Expense Settlement & General Claims
    # -----------------------------------------------------------------------
    def create_claim(
        self, db: Session, business_id: int, employee_id: uuid.UUID, data: ExpenseClaimCreate
    ) -> ExpenseSettlementClaim:
        today_str = date.today().strftime("%Y%m")
        count = (
            db.query(func.count(ExpenseSettlementClaim.id))
            .filter(ExpenseSettlementClaim.business_id == business_id)
            .scalar()
            or 0
        )
        claim_num = f"EXP-{today_str}-{count + 1:04d}"

        # Calculate line item sum
        total_amount = Decimal("0.00")
        for line in data.lines:
            total_amount += line.amount

        # Check advance deduction if linked to a travel request
        advance_deducted = Decimal("0.00")
        if data.travel_request_id:
            advance = (
                db.query(TravelAdvance)
                .filter(
                    TravelAdvance.business_id == business_id,
                    TravelAdvance.travel_request_id == data.travel_request_id,
                )
                .first()
            )
            if advance and advance.disbursed_at:
                advance_deducted = Decimal(str(advance.amount_approved))

        net_payable = total_amount - advance_deducted

        claim_type_str = data.claim_type.value if hasattr(data.claim_type, "value") else data.claim_type

        claim = ExpenseSettlementClaim(
            business_id=business_id,
            employee_id=employee_id,
            travel_request_id=data.travel_request_id,
            claim_type=claim_type_str,
            claim_number=claim_num,
            title=data.title,
            claim_date=data.claim_date,
            total_claim_amount=total_amount,
            advance_deducted=advance_deducted,
            net_payable_or_refundable=net_payable,
            status=ClaimStatusEnum.SUBMITTED.value,
        )
        db.add(claim)
        db.flush()

        for line in data.lines:
            cat_str = line.category.value if hasattr(line.category, "value") else line.category
            claim_line = ExpenseClaimLine(
                claim_id=claim.id,
                expense_date=line.expense_date,
                category=cat_str,
                amount=line.amount,
                conveyance_km=line.conveyance_km,
                conveyance_mode=line.conveyance_mode,
                description=line.description,
                receipt_url=line.receipt_url,
            )
            db.add(claim_line)

        db.commit()
        db.refresh(claim)
        return claim

    def review_claim(
        self,
        db: Session,
        business_id: int,
        claim_id: uuid.UUID,
        approver_user_id: int,
        data: ExpenseClaimReview,
    ) -> ExpenseSettlementClaim:
        claim = (
            db.query(ExpenseSettlementClaim)
            .filter(ExpenseSettlementClaim.business_id == business_id, ExpenseSettlementClaim.id == claim_id)
            .first()
        )
        if not claim:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

        new_st = data.status.value if hasattr(data.status, "value") else data.status
        claim.status = new_st
        claim.approved_by_id = approver_user_id
        if data.approval_notes:
            claim.approval_notes = data.approval_notes

        db.commit()
        db.refresh(claim)
        return claim

    def settle_claim(
        self,
        db: Session,
        business_id: int,
        claim_id: uuid.UUID,
        data: ExpenseClaimSettle,
    ) -> ExpenseSettlementClaim:
        claim = (
            db.query(ExpenseSettlementClaim)
            .filter(ExpenseSettlementClaim.business_id == business_id, ExpenseSettlementClaim.id == claim_id)
            .first()
        )
        if not claim:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

        claim.status = ClaimStatusEnum.SETTLED.value
        claim.settlement_channel = data.settlement_channel
        claim.payment_reference = data.payment_reference
        claim.paid_at = datetime.utcnow()

        # Update advance settlement status if linked
        if claim.travel_request_id:
            advance = (
                db.query(TravelAdvance)
                .filter(TravelAdvance.travel_request_id == claim.travel_request_id)
                .first()
            )
            if advance:
                advance.settlement_status = AdvanceStatusEnum.FULLY_SETTLED.value

        db.commit()
        db.refresh(claim)
        return claim

    def get_claims(
        self,
        db: Session,
        business_id: int,
        employee_id: Optional[uuid.UUID] = None,
        claim_type: Optional[str] = None,
        status_filter: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[ExpenseSettlementClaim]:
        query = (
            db.query(ExpenseSettlementClaim)
            .options(
                selectinload(ExpenseSettlementClaim.employee),
                selectinload(ExpenseSettlementClaim.lines),
            )
            .filter(ExpenseSettlementClaim.business_id == business_id)
        )
        if employee_id:
            query = query.filter(ExpenseSettlementClaim.employee_id == employee_id)
        if claim_type:
            query = query.filter(ExpenseSettlementClaim.claim_type == claim_type)
        if status_filter:
            query = query.filter(ExpenseSettlementClaim.status == status_filter)

        return query.order_by(ExpenseSettlementClaim.claim_date.desc()).offset(skip).limit(limit).all()

    def get_claim_by_id(self, db: Session, business_id: int, claim_id: uuid.UUID) -> ExpenseSettlementClaim:
        claim = (
            db.query(ExpenseSettlementClaim)
            .options(
                selectinload(ExpenseSettlementClaim.employee),
                selectinload(ExpenseSettlementClaim.lines),
                selectinload(ExpenseSettlementClaim.travel_request),
            )
            .filter(ExpenseSettlementClaim.business_id == business_id, ExpenseSettlementClaim.id == claim_id)
            .first()
        )
        if not claim:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")
        return claim

    # -----------------------------------------------------------------------
    # 5. Travel & Expense Stats
    # -----------------------------------------------------------------------
    def get_stats(self, db: Session, business_id: int) -> TravelExpenseStats:
        pending_trv = (
            db.query(func.count(TravelRequest.id))
            .filter(
                TravelRequest.business_id == business_id,
                TravelRequest.status == TravelStatusEnum.PENDING_APPROVAL.value,
            )
            .scalar()
            or 0
        )
        adv_query = db.query(func.count(TravelAdvance.id), func.sum(TravelAdvance.amount_approved)).filter(
            TravelAdvance.business_id == business_id,
            TravelAdvance.settlement_status == AdvanceStatusEnum.UNSETTLED.value,
        )
        active_adv_count, total_adv_sum = adv_query.first() or (0, Decimal("0.00"))

        pending_claims = (
            db.query(func.count(ExpenseSettlementClaim.id), func.sum(ExpenseSettlementClaim.total_claim_amount))
            .filter(
                ExpenseSettlementClaim.business_id == business_id,
                ExpenseSettlementClaim.status.in_([
                    ClaimStatusEnum.SUBMITTED.value,
                    ClaimStatusEnum.MANAGER_APPROVED.value,
                ]),
            )
            .first()
            or (0, Decimal("0.00"))
        )

        settled_month = (
            db.query(func.count(ExpenseSettlementClaim.id))
            .filter(
                ExpenseSettlementClaim.business_id == business_id,
                ExpenseSettlementClaim.status == ClaimStatusEnum.SETTLED.value,
            )
            .scalar()
            or 0
        )

        return TravelExpenseStats(
            pending_travel_requests=pending_trv,
            active_travel_advances=active_adv_count or 0,
            total_advances_amount=Decimal(str(total_adv_sum or 0)),
            pending_claims=pending_claims[0] or 0,
            total_claims_pending_amount=Decimal(str(pending_claims[1] or 0)),
            settled_claims_this_month=settled_month,
        )
