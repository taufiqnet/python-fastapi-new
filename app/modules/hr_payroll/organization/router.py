import uuid

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.hr_payroll.organization.schemas import (
    DepartmentCreate,
    DepartmentOut,
    DepartmentUpdate,
    JobTitleCreate,
    JobTitleOut,
    JobTitleUpdate,
)
from app.modules.hr_payroll.organization.service import (
    DepartmentService,
    JobTitleService,
)

router = APIRouter(tags=["Organization"])

department_service = DepartmentService()
job_title_service = JobTitleService()


# --- Departments Endpoints ---
@router.get("/departments/export-excel")
def export_departments_excel(
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    excel_data = department_service.generate_export_excel(db, business_id=business_id)
    filename = "departments_export.xlsx" if not business_id else f"departments_export_business_{business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/departments/template-excel")
def download_departments_excel_template(
    business_id: int = Query(...),
    db: Session = Depends(get_db),
):
    excel_data = department_service.generate_excel_template(db, business_id=business_id)
    filename = f"department_template_business_{business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/departments/import-excel")
async def import_departments_excel(
    business_id: int = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    contents = await file.read()
    return department_service.import_departments_excel(
        db, business_id=business_id, file_bytes=contents
    )


@router.get("/departments", response_model=list[DepartmentOut])
def get_departments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return department_service.get_departments(
        db, skip=skip, limit=limit, business_id=business_id
    )


@router.get("/departments/{department_id}", response_model=DepartmentOut)
def get_department(department_id: uuid.UUID, db: Session = Depends(get_db)):
    return department_service.get_department(db, department_id)


@router.post(
    "/departments",
    response_model=DepartmentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_department(
    department_data: DepartmentCreate, db: Session = Depends(get_db)
):
    return department_service.create_department(db, department_data)


@router.put("/departments/{department_id}", response_model=DepartmentOut)
def update_department(
    department_id: uuid.UUID,
    department_data: DepartmentUpdate,
    db: Session = Depends(get_db),
):
    return department_service.update_department(db, department_id, department_data)


@router.delete("/departments/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(department_id: uuid.UUID, db: Session = Depends(get_db)):
    department_service.delete_department(db, department_id)
    return None


# --- Job Titles Endpoints ---
@router.get("/job-titles/export-excel")
def export_job_titles_excel(
    business_id: int | None = Query(None),
    department_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    excel_data = job_title_service.generate_export_excel(
        db, business_id=business_id, department_id=department_id
    )
    filename = "job_titles_export.xlsx" if not business_id else f"job_titles_export_business_{business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/job-titles/template-excel")
def download_job_titles_excel_template(
    business_id: int = Query(...),
    db: Session = Depends(get_db),
):
    excel_data = job_title_service.generate_excel_template(db, business_id=business_id)
    filename = f"job_title_template_business_{business_id}.xlsx"
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/job-titles/import-excel")
async def import_job_titles_excel(
    business_id: int = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    contents = await file.read()
    return job_title_service.import_job_titles_excel(
        db, business_id=business_id, file_bytes=contents
    )


@router.get("/job-titles", response_model=list[JobTitleOut])
def get_job_titles(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    business_id: int | None = Query(None),
    department_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    return job_title_service.get_job_titles(
        db,
        skip=skip,
        limit=limit,
        business_id=business_id,
        department_id=department_id,
    )


@router.get("/job-titles/{job_title_id}", response_model=JobTitleOut)
def get_job_title(job_title_id: uuid.UUID, db: Session = Depends(get_db)):
    return job_title_service.get_job_title(db, job_title_id)


@router.post(
    "/job-titles",
    response_model=JobTitleOut,
    status_code=status.HTTP_201_CREATED,
)
def create_job_title(
    job_title_data: JobTitleCreate, db: Session = Depends(get_db)
):
    return job_title_service.create_job_title(db, job_title_data)


@router.put("/job-titles/{job_title_id}", response_model=JobTitleOut)
def update_job_title(
    job_title_id: uuid.UUID,
    job_title_data: JobTitleUpdate,
    db: Session = Depends(get_db),
):
    return job_title_service.update_job_title(db, job_title_id, job_title_data)


@router.delete("/job-titles/{job_title_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_title(job_title_id: uuid.UUID, db: Session = Depends(get_db)):
    job_title_service.delete_job_title(db, job_title_id)
    return None
