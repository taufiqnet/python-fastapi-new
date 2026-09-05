import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

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
@router.get("/holidays", response_model=list[HolidayOut])
def get_holidays(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    holiday_type: str | None = Query(None),
    db: Session = Depends(get_db),
):
    return holiday_service.get_holidays(
        db,
        skip=skip,
        limit=limit,
        business_id=business_id,
        holiday_type=holiday_type,
    )


@router.get("/holidays/{holiday_id}", response_model=HolidayOut)
def get_holiday(holiday_id: uuid.UUID, db: Session = Depends(get_db)):
    return holiday_service.get_holiday(db, holiday_id)


@router.post(
    "/holidays",
    response_model=HolidayOut,
    status_code=status.HTTP_201_CREATED,
)
def create_holiday(holiday_data: HolidayCreate, db: Session = Depends(get_db)):
    return holiday_service.create_holiday(db, holiday_data)


@router.put("/holidays/{holiday_id}", response_model=HolidayOut)
def update_holiday(
    holiday_id: uuid.UUID,
    holiday_data: HolidayUpdate,
    db: Session = Depends(get_db),
):
    return holiday_service.update_holiday(db, holiday_id, holiday_data)


@router.delete("/holidays/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_holiday(holiday_id: uuid.UUID, db: Session = Depends(get_db)):
    holiday_service.delete_holiday(db, holiday_id)
    return None


# ── Payroll Periods Endpoints ──────────────────────────────────────────
@router.get("/periods", response_model=list[PayrollPeriodOut])
def get_payroll_periods(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    return period_service.get_periods(
        db,
        skip=skip,
        limit=limit,
        business_id=business_id,
        status_filter=status_filter,
    )


@router.get("/periods/{period_id}", response_model=PayrollPeriodOut)
def get_payroll_period(period_id: uuid.UUID, db: Session = Depends(get_db)):
    return period_service.get_period(db, period_id)


@router.post(
    "/periods",
    response_model=PayrollPeriodOut,
    status_code=status.HTTP_201_CREATED,
)
def create_payroll_period(
    period_data: PayrollPeriodCreate, db: Session = Depends(get_db)
):
    return period_service.create_period(db, period_data)


@router.post(
    "/periods/{period_id}/generate",
    response_model=list[PayrollRecordOut],
)
def generate_period_payroll(
    period_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    return record_service.generate_period_payroll(db, period_id)


@router.put("/periods/{period_id}", response_model=PayrollPeriodOut)
def update_payroll_period(
    period_id: uuid.UUID,
    period_data: PayrollPeriodUpdate,
    db: Session = Depends(get_db),
):
    return period_service.update_period(db, period_id, period_data)


@router.delete("/periods/{period_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payroll_period(period_id: uuid.UUID, db: Session = Depends(get_db)):
    period_service.delete_period(db, period_id)
    return None


# ── Payroll Records (Payslips) Endpoints ──────────────────────────────
@router.get("/records", response_model=list[PayrollRecordOut])
def get_payroll_records(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    period_id: uuid.UUID | None = Query(None),
    employee_id: uuid.UUID | None = Query(None),
    is_paid: bool | None = Query(None),
    db: Session = Depends(get_db),
):
    return record_service.get_records(
        db,
        skip=skip,
        limit=limit,
        business_id=business_id,
        period_id=period_id,
        employee_id=employee_id,
        is_paid=is_paid,
    )


@router.get("/records/{record_id}", response_model=PayrollRecordOut)
def get_payroll_record(record_id: uuid.UUID, db: Session = Depends(get_db)):
    return record_service.get_record(db, record_id)


@router.post(
    "/records",
    response_model=PayrollRecordOut,
    status_code=status.HTTP_201_CREATED,
)
def create_payroll_record(
    record_data: PayrollRecordCreate, db: Session = Depends(get_db)
):
    return record_service.create_record(db, record_data)


@router.put("/records/{record_id}", response_model=PayrollRecordOut)
def update_payroll_record(
    record_id: uuid.UUID,
    record_data: PayrollRecordUpdate,
    db: Session = Depends(get_db),
):
    return record_service.update_record(db, record_id, record_data)


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payroll_record(record_id: uuid.UUID, db: Session = Depends(get_db)):
    record_service.delete_record(db, record_id)
    return None


# ── Payroll Settings Endpoints ─────────────────────────────────────────
@router.get("/settings", response_model=PayrollSettingsOut)
def get_payroll_settings(
    business_id: int = Query(...),
    db: Session = Depends(get_db),
):
    return settings_service.get_settings(db, business_id=business_id)


@router.put("/settings", response_model=PayrollSettingsOut)
def update_payroll_settings(
    data: PayrollSettingsUpdate,
    business_id: int = Query(...),
    db: Session = Depends(get_db),
):
    return settings_service.update_settings(
        db, business_id=business_id, data=data
    )
