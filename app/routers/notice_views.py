import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.identity.models import User
from app.core.tenancy.scoping import resolve_business_id
from app.core.tenancy.service import BusinessService
from app.database import get_db
from app.modules.hr_payroll.notice_board.service import NoticeBoardService
from app.modules.hr_payroll.organization.service import DepartmentService

router = APIRouter(prefix="/notices", tags=["Notice Board Views"])
templates = Jinja2Templates(directory="app/templates")

notice_service = NoticeBoardService()
department_service = DepartmentService()
business_service = BusinessService()


@router.get("/manage", response_class=HTMLResponse)
def notice_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: int | None = None,
    department_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "notice_board", "view")),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    notices = notice_service.get_notices(
        db, skip=skip, limit=limit, business_id=resolved_business_id, department_id=department_id
    )
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    if not current_user.is_superuser:
        businesses = [b for b in businesses if b.id == resolved_business_id]
    departments = department_service.get_departments(
        db, skip=0, limit=500, business_id=resolved_business_id
    )

    biz_map = {b.id: b.name_en for b in businesses}

    total_count = len(notices)
    active_count = sum(1 for n in notices if n.is_active)
    pinned_count = sum(1 for n in notices if n.is_pinned)
    urgent_count = sum(1 for n in notices if n.category == "urgent")

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/notice_board/notice_list.html",
        context={
            "notices": notices,
            "businesses": businesses,
            "departments": departments,
            "biz_map": biz_map,
            "total_count": total_count,
            "active_count": active_count,
            "pinned_count": pinned_count,
            "urgent_count": urgent_count,
            "active_page": "notice_board",
            "current_user": current_user,
        },
    )


@router.get("/create", response_class=HTMLResponse)
def notice_create_page(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "notice_board", "create")),
):
    resolved_business_id = resolve_business_id(current_user, None)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    if not current_user.is_superuser:
        businesses = [b for b in businesses if b.id == resolved_business_id]
    departments = department_service.get_departments(
        db, skip=0, limit=500, business_id=resolved_business_id
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/notice_board/notice_form.html",
        context={
            "notice": None,
            "is_edit": False,
            "businesses": businesses,
            "departments": departments,
            "active_page": "notice_board",
            "current_user": current_user,
        },
    )


@router.get("/detail/{notice_id}", response_class=HTMLResponse)
def notice_detail_page(
    notice_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "notice_board", "view")),
):
    notice = notice_service.get_notice(db, notice_id, current_user=current_user)
    business = (
        business_service.get_business(db, notice.business_id)
        if notice.business_id
        else None
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/notice_board/notice_detail.html",
        context={
            "notice": notice,
            "business": business,
            "active_page": "notice_board",
            "current_user": current_user,
        },
    )


@router.get("/edit/{notice_id}", response_class=HTMLResponse)
def notice_edit_page(
    notice_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("hrm", "notice_board", "update")),
):
    notice = notice_service.get_notice(db, notice_id, current_user=current_user)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    if not current_user.is_superuser:
        businesses = [b for b in businesses if b.id == notice.business_id]
    departments = department_service.get_departments(
        db, skip=0, limit=500, business_id=notice.business_id
    )

    return templates.TemplateResponse(
        request=request,
        name="modules/hr_payroll/notice_board/notice_form.html",
        context={
            "notice": notice,
            "is_edit": True,
            "businesses": businesses,
            "departments": departments,
            "active_page": "notice_board",
            "current_user": current_user,
        },
    )
