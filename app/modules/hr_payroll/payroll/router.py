import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.database import get_db
from app.modules.hr_payroll.payroll.schemas import (
    HolidayCreate,
    HolidayOut,
    HolidayUpdate,
    PayrollPeriodCreate,
    PayrollPeriodOut,
    PayrollPeriodUpdate,
    PayrollRecordCreate,
    PayrollRecordOut,
    PayrollRecordUpdate,
    PayrollSettingsOut,
    PayrollSettingsUpdate,
)
from app.modules.hr_payroll.payroll.service import (
    HolidayService,
    PayrollPeriodService,
    PayrollRecordService,
    PayrollSettingsService,
)

router = APIRouter(prefix="/payroll", tags=["Payroll Management"])

holiday_service = HolidayService()
period_service = PayrollPeriodService()
record_service = PayrollRecordService()
settings_service = PayrollSettingsService()


# ── Holidays Endpoints ────────────────────────────────────────────────
@router.get("/holidays/export-excel")
def export_holidays_excel(
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "holidays", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    excel_data = holiday_service.generate_export_excel(db, business_id=resolved_business_id)
    filename = "holidays_export.xlsx" if not resolved_business_id else f"holidays_export_business_{resolved_business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/holidays", response_model=list[HolidayOut])
def get_holidays(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    holiday_type: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "holidays", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return holiday_service.get_holidays(
        db,
        skip=skip,
        limit=limit,
        business_id=resolved_business_id,
        holiday_type=holiday_type,
    )


@router.get("/holidays/{holiday_id}", response_model=HolidayOut)
def get_holiday(
    holiday_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "holidays", "view")),
):
    return holiday_service.get_holiday(db, holiday_id, current_user=current_user)


@router.post(
    "/holidays",
    response_model=HolidayOut,
    status_code=status.HTTP_201_CREATED,
)
def create_holiday(
    holiday_data: HolidayCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "holidays", "create")),
):
    resolved_business_id = resolve_business_id(current_user, holiday_data.business_id)
    if not current_user.is_superuser:
        holiday_data.business_id = current_user.business_id
    elif holiday_data.business_id is None:
        holiday_data.business_id = resolved_business_id

    return holiday_service.create_holiday(db, holiday_data)


@router.put("/holidays/{holiday_id}", response_model=HolidayOut)
def update_holiday(
    holiday_id: uuid.UUID,
    holiday_data: HolidayUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "holidays", "update")),
):
    if not current_user.is_superuser:
        holiday_data.business_id = current_user.business_id

    return holiday_service.update_holiday(
        db, holiday_id, holiday_data, current_user=current_user
    )


@router.delete("/holidays/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_holiday(
    holiday_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "holidays", "delete")),
):
    holiday_service.delete_holiday(db, holiday_id, current_user=current_user)
    return None


# ── Payroll Periods Endpoints ──────────────────────────────────────────
@router.get("/periods/export-excel")
def export_payroll_periods_excel(
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_periods", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    excel_data = period_service.generate_export_excel(db, business_id=resolved_business_id)
    filename = "payroll_periods_export.xlsx" if not resolved_business_id else f"payroll_periods_export_business_{resolved_business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/periods", response_model=list[PayrollPeriodOut])
def get_payroll_periods(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_periods", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return period_service.get_periods(
        db,
        skip=skip,
        limit=limit,
        business_id=resolved_business_id,
        status_filter=status_filter,
    )


@router.get("/periods/{period_id}", response_model=PayrollPeriodOut)
def get_payroll_period(
    period_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_periods", "view")),
):
    return period_service.get_period(db, period_id, current_user=current_user)


@router.post(
    "/periods",
    response_model=PayrollPeriodOut,
    status_code=status.HTTP_201_CREATED,
)
def create_payroll_period(
    period_data: PayrollPeriodCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_periods", "create")),
):
    resolved_business_id = resolve_business_id(current_user, period_data.business_id)
    if not current_user.is_superuser:
        period_data.business_id = current_user.business_id
    elif period_data.business_id is None:
        period_data.business_id = resolved_business_id
    return period_service.create_period(db, period_data)


@router.post(
    "/periods/{period_id}/generate",
    response_model=list[PayrollRecordOut],
)
def generate_period_payroll(
    period_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_records", "create")),
):
    return record_service.generate_period_payroll(db, period_id, current_user=current_user)


@router.put("/periods/{period_id}", response_model=PayrollPeriodOut)
def update_payroll_period(
    period_id: uuid.UUID,
    period_data: PayrollPeriodUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_periods", "update")),
):
    if not current_user.is_superuser:
        period_data.business_id = current_user.business_id
    return period_service.update_period(db, period_id, period_data, current_user=current_user)


@router.delete("/periods/{period_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payroll_period(
    period_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_periods", "delete")),
):
    period_service.delete_period(db, period_id, current_user=current_user)
    return None


# ── Payroll Records (Payslips) Endpoints ──────────────────────────────
@router.get("/records/export-excel")
def export_payroll_records_excel(
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_records", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    excel_data = record_service.generate_export_excel(db, business_id=resolved_business_id)
    filename = "payroll_records_export.xlsx" if not resolved_business_id else f"payroll_records_export_business_{resolved_business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/records", response_model=list[PayrollRecordOut])
def get_payroll_records(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    period_id: uuid.UUID | None = Query(None),
    employee_id: uuid.UUID | None = Query(None),
    is_paid: bool | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_records", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return record_service.get_records(
        db,
        skip=skip,
        limit=limit,
        business_id=resolved_business_id,
        period_id=period_id,
        employee_id=employee_id,
        is_paid=is_paid,
    )


@router.get("/records/{record_id}", response_model=PayrollRecordOut)
def get_payroll_record(
    record_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_records", "view")),
):
    return record_service.get_record(db, record_id, current_user=current_user)


@router.post(
    "/records",
    response_model=PayrollRecordOut,
    status_code=status.HTTP_201_CREATED,
)
def create_payroll_record(
    record_data: PayrollRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_records", "create")),
):
    resolved_business_id = resolve_business_id(current_user, record_data.business_id)
    if not current_user.is_superuser:
        record_data.business_id = current_user.business_id
    elif record_data.business_id is None:
        record_data.business_id = resolved_business_id
    return record_service.create_record(db, record_data)


@router.put("/records/{record_id}", response_model=PayrollRecordOut)
def update_payroll_record(
    record_id: uuid.UUID,
    record_data: PayrollRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_records", "update")),
):
    if not current_user.is_superuser:
        record_data.business_id = current_user.business_id
    return record_service.update_record(db, record_id, record_data, current_user=current_user)


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payroll_record(
    record_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_records", "delete")),
):
    record_service.delete_record(db, record_id, current_user=current_user)
    return None


# ── Payroll Settings Endpoints ─────────────────────────────────────────
@router.get("/settings/export-excel")
def export_payroll_settings_excel(
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_settings", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    excel_data = settings_service.generate_export_excel(db, business_id=resolved_business_id)
    filename = "payroll_settings_export.xlsx" if not resolved_business_id else f"payroll_settings_export_business_{resolved_business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/settings", response_model=PayrollSettingsOut)
def get_payroll_settings(
    business_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_settings", "view")),
):
    return settings_service.get_settings(db, business_id=business_id, current_user=current_user)


@router.put("/settings", response_model=PayrollSettingsOut)
def update_payroll_settings(
    data: PayrollSettingsUpdate,
    business_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_settings", "update")),
):
    return settings_service.update_settings(
        db, business_id=business_id, data=data, current_user=current_user
    )


# ============================================================
# Bank Advice & Hold Management Endpoints
# ============================================================
@router.get("/periods/{period_id}/bank-advice")
def download_bank_advice_excel(
    period_id: uuid.UUID,
    bank_account_id: uuid.UUID | None = Query(None),
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_periods", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    excel_data = record_service.generate_bank_advice_excel(
        db, period_id=period_id, bank_account_id=bank_account_id, business_id=resolved_business_id
    )
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=bank_advice_period_{period_id}.xlsx"},
    )


@router.get("/periods/{period_id}/mfs-advice")
def download_mfs_advice_excel(
    period_id: uuid.UUID,
    provider: str = Query("bkash"),
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_periods", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    excel_data = record_service.generate_mfs_advice_excel(
        db, period_id=period_id, mfs_provider=provider, business_id=resolved_business_id
    )
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={provider}_advice_period_{period_id}.xlsx"},
    )


from pydantic import BaseModel


class RecordHoldPayload(BaseModel):
    is_held: bool
    hold_reason: str | None = None


@router.put("/records/{record_id}/hold", response_model=PayrollRecordOut)
def toggle_payroll_record_hold(
    record_id: uuid.UUID,
    payload: RecordHoldPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_records", "update")),
):
    return record_service.toggle_record_hold(
        db,
        record_id=record_id,
        is_held=payload.is_held,
        hold_reason=payload.hold_reason,
        current_user=current_user,
    )


# ============================================================
# Auxiliary Payroll Feature Routers & Services
# ============================================================
from app.modules.hr_payroll.payroll.schemas import (
    BonusPolicyCreate,
    BonusPolicyOut,
    BonusPolicyUpdate,
    BonusRunCreate,
    BonusRunOut,
    CompanyBankAccountCreate,
    CompanyBankAccountOut,
    CompanyBankAccountUpdate,
    LoanRepaymentScheduleOut,
    LoanRepaymentScheduleUpdate,
    PayscaleStepCreate,
    PayscaleStepOut,
    PayscaleStepUpdate,
    PayrollPeriodApprovalCreate,
    PayrollPeriodApprovalOut,
    SalaryAdjustmentCreate,
    SalaryAdjustmentOut,
    SalaryAdjustmentUpdate,
    StatutoryComplianceSettingOut,
    StatutoryComplianceSettingUpdate,
    TaxSlabCreate,
    TaxSlabOut,
    TaxSlabUpdate,
)
from app.modules.hr_payroll.payroll.service import (
    BonusPolicyService,
    BonusRunService,
    CompanyBankAccountService,
    LoanRepaymentScheduleService,
    PayscaleStepService,
    PayrollPeriodApprovalService,
    SalaryAdjustmentService,
    StatutoryComplianceService,
    TaxSlabService,
)

payscale_step_service = PayscaleStepService()
bank_account_service = CompanyBankAccountService()
tax_slab_service = TaxSlabService()
statutory_service = StatutoryComplianceService()
adjustment_service = SalaryAdjustmentService()
loan_schedule_service = LoanRepaymentScheduleService()
bonus_policy_service = BonusPolicyService()
bonus_run_service = BonusRunService()
period_approval_service = PayrollPeriodApprovalService()


# ── Payscale Steps ────────────────────────────────────────────────────
@router.get("/payscale/grades/{grade_id}/steps", response_model=list[PayscaleStepOut])
def get_payscale_steps(
    grade_id: uuid.UUID,
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_settings", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return payscale_step_service.get_steps_by_grade(db, grade_id, business_id=resolved_business_id)


@router.post("/payscale/steps", response_model=PayscaleStepOut, status_code=status.HTTP_201_CREATED)
def create_payscale_step(
    data: PayscaleStepCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_settings", "create")),
):
    resolved_business_id = resolve_business_id(current_user, data.business_id)
    if not current_user.is_superuser:
        data.business_id = current_user.business_id
    elif data.business_id is None:
        data.business_id = resolved_business_id
    return payscale_step_service.create_step(db, data)


@router.put("/payscale/steps/{step_id}", response_model=PayscaleStepOut)
def update_payscale_step(
    step_id: uuid.UUID,
    data: PayscaleStepUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_settings", "update")),
):
    return payscale_step_service.update_step(db, step_id, data)


@router.delete("/payscale/steps/{step_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payscale_step(
    step_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_settings", "delete")),
):
    payscale_step_service.delete_step(db, step_id)
    return None


# ── Company Bank Accounts ─────────────────────────────────────────────
@router.get("/bank-accounts", response_model=list[CompanyBankAccountOut])
def get_company_bank_accounts(
    business_id: int | None = Query(None),
    is_active: bool | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_settings", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return bank_account_service.get_accounts(db, business_id=resolved_business_id or 1, is_active=is_active)


@router.post("/bank-accounts", response_model=CompanyBankAccountOut, status_code=status.HTTP_201_CREATED)
def create_company_bank_account(
    data: CompanyBankAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_settings", "create")),
):
    resolved_business_id = resolve_business_id(current_user, data.business_id)
    if not current_user.is_superuser:
        data.business_id = current_user.business_id
    elif data.business_id is None:
        data.business_id = resolved_business_id
    return bank_account_service.create_account(db, data)


@router.put("/bank-accounts/{account_id}", response_model=CompanyBankAccountOut)
def update_company_bank_account(
    account_id: uuid.UUID,
    data: CompanyBankAccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_settings", "update")),
):
    return bank_account_service.update_account(db, account_id, data)


@router.delete("/bank-accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company_bank_account(
    account_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_settings", "delete")),
):
    bank_account_service.delete_account(db, account_id)
    return None


# ── Tax Slabs (ITA 2023) ──────────────────────────────────────────────
@router.get("/tax-slabs", response_model=list[TaxSlabOut])
def get_tax_slabs(
    fiscal_year: str | None = Query(None),
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_settings", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return tax_slab_service.get_slabs(db, business_id=resolved_business_id or 1, fiscal_year=fiscal_year)


@router.post("/tax-slabs", response_model=TaxSlabOut, status_code=status.HTTP_201_CREATED)
def create_tax_slab(
    data: TaxSlabCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_settings", "create")),
):
    resolved_business_id = resolve_business_id(current_user, data.business_id)
    if not current_user.is_superuser:
        data.business_id = current_user.business_id
    elif data.business_id is None:
        data.business_id = resolved_business_id
    return tax_slab_service.create_slab(db, data)


@router.put("/tax-slabs/{slab_id}", response_model=TaxSlabOut)
def update_tax_slab(
    slab_id: uuid.UUID,
    data: TaxSlabUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_settings", "update")),
):
    return tax_slab_service.update_slab(db, slab_id, data)


@router.delete("/tax-slabs/{slab_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tax_slab(
    slab_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_settings", "delete")),
):
    tax_slab_service.delete_slab(db, slab_id)
    return None


# ── Statutory Compliance Settings ─────────────────────────────────────
@router.get("/statutory-settings", response_model=StatutoryComplianceSettingOut)
def get_statutory_compliance_settings(
    business_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_settings", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return statutory_service.get_setting(db, business_id=resolved_business_id or 1)


@router.put("/statutory-settings", response_model=StatutoryComplianceSettingOut)
def update_statutory_compliance_settings(
    data: StatutoryComplianceSettingUpdate,
    business_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_settings", "update")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return statutory_service.update_setting(db, business_id=resolved_business_id or 1, data=data)


# ── Salary Adjustments (Arrears / Deductions) ─────────────────────────
@router.get("/adjustments", response_model=list[SalaryAdjustmentOut])
def get_salary_adjustments(
    period_id: uuid.UUID | None = Query(None),
    employee_id: uuid.UUID | None = Query(None),
    status: str | None = Query(None),
    business_id: int | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_records", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return adjustment_service.get_adjustments(
        db,
        business_id=resolved_business_id or 1,
        period_id=period_id,
        employee_id=employee_id,
        status=status,
        skip=skip,
        limit=limit,
    )


@router.post("/adjustments", response_model=SalaryAdjustmentOut, status_code=status.HTTP_201_CREATED)
def create_salary_adjustment(
    data: SalaryAdjustmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_records", "create")),
):
    resolved_business_id = resolve_business_id(current_user, data.business_id)
    if not current_user.is_superuser:
        data.business_id = current_user.business_id
    elif data.business_id is None:
        data.business_id = resolved_business_id
    return adjustment_service.create_adjustment(db, data)


@router.put("/adjustments/{adjustment_id}", response_model=SalaryAdjustmentOut)
def update_salary_adjustment(
    adjustment_id: uuid.UUID,
    data: SalaryAdjustmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_records", "update")),
):
    return adjustment_service.update_adjustment(db, adjustment_id, data)


@router.delete("/adjustments/{adjustment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_salary_adjustment(
    adjustment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_records", "delete")),
):
    adjustment_service.delete_adjustment(db, adjustment_id)
    return None


# ── Loan Repayment Schedules ──────────────────────────────────────────
@router.get("/loans/{loan_id}/schedules", response_model=list[LoanRepaymentScheduleOut])
def get_loan_repayment_schedules(
    loan_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_records", "view")),
):
    return loan_schedule_service.get_schedules_by_loan(db, loan_id)


@router.put("/loan-schedules/{schedule_id}", response_model=LoanRepaymentScheduleOut)
def update_loan_repayment_schedule(
    schedule_id: uuid.UUID,
    data: LoanRepaymentScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_records", "update")),
):
    return loan_schedule_service.update_schedule(db, schedule_id, data)


# ── Bonus Policies & Bonus Runs ───────────────────────────────────────
@router.get("/bonus-policies", response_model=list[BonusPolicyOut])
def get_bonus_policies(
    business_id: int | None = Query(None),
    is_active: bool | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_settings", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return bonus_policy_service.get_policies(db, business_id=resolved_business_id or 1, is_active=is_active)


@router.post("/bonus-policies", response_model=BonusPolicyOut, status_code=status.HTTP_201_CREATED)
def create_bonus_policy(
    data: BonusPolicyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_settings", "create")),
):
    resolved_business_id = resolve_business_id(current_user, data.business_id)
    if not current_user.is_superuser:
        data.business_id = current_user.business_id
    elif data.business_id is None:
        data.business_id = resolved_business_id
    return bonus_policy_service.create_policy(db, data)


@router.put("/bonus-policies/{policy_id}", response_model=BonusPolicyOut)
def update_bonus_policy(
    policy_id: uuid.UUID,
    data: BonusPolicyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_settings", "update")),
):
    return bonus_policy_service.update_policy(db, policy_id, data)


@router.delete("/bonus-policies/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bonus_policy(
    policy_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_settings", "delete")),
):
    bonus_policy_service.delete_policy(db, policy_id)
    return None


@router.get("/bonus-runs", response_model=list[BonusRunOut])
def get_bonus_runs(
    period_id: uuid.UUID | None = Query(None),
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_records", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    return bonus_run_service.get_runs(db, business_id=resolved_business_id or 1, period_id=period_id)


@router.post("/bonus-runs", response_model=BonusRunOut, status_code=status.HTTP_201_CREATED)
def create_bonus_run(
    data: BonusRunCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_records", "create")),
):
    resolved_business_id = resolve_business_id(current_user, data.business_id)
    if not current_user.is_superuser:
        data.business_id = current_user.business_id
    elif data.business_id is None:
        data.business_id = resolved_business_id
    return bonus_run_service.create_run(db, data)


class BonusRunStatusPayload(BaseModel):
    status: str


@router.put("/bonus-runs/{run_id}/status", response_model=BonusRunOut)
def update_bonus_run_status(
    run_id: uuid.UUID,
    payload: BonusRunStatusPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_records", "update")),
):
    return bonus_run_service.update_run_status(db, run_id, payload.status)


# ── Multi-Tier Period Approvals ───────────────────────────────────────
@router.get("/periods/{period_id}/approvals", response_model=list[PayrollPeriodApprovalOut])
def get_payroll_period_approvals(
    period_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_periods", "view")),
):
    return period_approval_service.get_approvals(db, period_id)


@router.post("/periods/{period_id}/approvals", response_model=PayrollPeriodApprovalOut, status_code=status.HTTP_201_CREATED)
def submit_payroll_period_approval(
    period_id: uuid.UUID,
    data: PayrollPeriodApprovalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "payroll_periods", "update")),
):
    return period_approval_service.submit_approval(db, data, action_by_id=current_user.id)

