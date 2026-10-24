"""
Seed data generator for HR & Payroll module.
Generates departments, job titles, employees, statutory leave types,
leave allocations, standard shifts, attendance logs, and performance appraisal cycle/goals.
"""
import uuid
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Callable, Dict
from sqlalchemy.orm import Session

from app.modules.hr_payroll.organization.models import Department, JobTitle
from app.modules.hr_payroll.employees.models import (
    Employee,
    EmploymentTypeEnum,
    GenderEnum,
    MaritalStatusEnum,
    WorkArrangementEnum,
)
from app.modules.hr_payroll.leave.models import (
    LeaveType,
    LeaveAllocation,
    GenderApplicabilityEnum,
)
from app.modules.hr_payroll.roster.models import Shift
from app.modules.hr_payroll.attendance.models import (
    Attendance,
    AttendanceStatusEnum,
    AttendanceSourceEnum,
)
from app.modules.hr_payroll.performance.models import (
    AppraisalCycle,
    EmployeeGoal,
    CycleTypeEnum,
    CycleStatusEnum,
    GoalCategoryEnum,
    GoalMetricEnum,
    GoalStatusEnum,
)


def seed_hr_data(db: Session, business_id: int, log_record: Callable[[str, str], None]) -> Dict[str, int]:
    counts = {
        "departments": 0,
        "job_titles": 0,
        "employees": 0,
        "leave_types": 0,
        "leave_allocations": 0,
        "shifts": 0,
        "attendance": 0,
        "performance_cycles": 0,
        "employee_goals": 0,
    }

    current_year = date.today().year

    # 1. Departments
    dept_specs = [
        ("Human Resources [SEED]", "SEED-DEP-HR", f"seed-hr-{business_id}", "HR & Corporate Culture"),
        ("Engineering & Technology [SEED]", "SEED-DEP-ENG", f"seed-eng-{business_id}", "Core Software & Cloud Architecture"),
        ("Finance & Accounts [SEED]", "SEED-DEP-FIN", f"seed-fin-{business_id}", "General Ledger & Statutory VAT"),
        ("Operations & Logistics [SEED]", "SEED-DEP-OPS", f"seed-ops-{business_id}", "Supply Chain & Fleet Coordination"),
        ("Sales & Marketing [SEED]", "SEED-DEP-SAL", f"seed-sal-{business_id}", "Enterprise B2B Business Development"),
    ]

    created_depts = []
    for name, code, slug, desc in dept_specs:
        dept = Department(
            business_id=business_id,
            name=name,
            code=code,
            slug=slug,
            description=desc,
            is_active=True,
            is_roster_enabled=True,
        )
        db.add(dept)
        db.flush()
        log_record("departments", str(dept.id))
        created_depts.append(dept)
        counts["departments"] += 1

    # 2. Job Titles
    # (name, short_name, dept_index, level_rank)
    job_specs = [
        ("Chief Technology Officer [SEED]", "CTO", 1, 1),
        ("HR Business Partner [SEED]", "HRBP", 0, 3),
        ("Senior Software Engineer [SEED]", "SSE", 1, 4),
        ("Finance Manager [SEED]", "FM", 2, 3),
        ("Supply Chain Officer [SEED]", "SCO", 3, 5),
    ]

    created_jobs = []
    for title, short_name, d_idx, rank in job_specs:
        job = JobTitle(
            business_id=business_id,
            department_id=created_depts[d_idx].id,
            name=title,
            short_name=short_name,
            level_rank=rank,
            is_active=True,
        )
        db.add(job)
        db.flush()
        log_record("job_titles", str(job.id))
        created_jobs.append(job)
        counts["job_titles"] += 1

    # 3. Employees (5 Bangladeshi enterprise profiles)
    emp_specs = [
        (
            "Tahmidul", "Islam", "SEED-EMP-101", f"seed.tahmidul.{business_id}@proerp.test", "+8801711100201",
            GenderEnum.MALE, MaritalStatusEnum.MARRIED, 0, created_depts[1].id, created_jobs[0].id,
        ),
        (
            "Nusrat", "Jahan", "SEED-EMP-102", f"seed.nusrat.{business_id}@proerp.test", "+8801811100202",
            GenderEnum.FEMALE, MaritalStatusEnum.MARRIED, 1, created_depts[0].id, created_jobs[1].id,
        ),
        (
            "Kazi Tariqul", "Hassan", "SEED-EMP-103", f"seed.tariqul.{business_id}@proerp.test", "+8801911100203",
            GenderEnum.MALE, MaritalStatusEnum.SINGLE, 2, created_depts[1].id, created_jobs[2].id,
        ),
        (
            "Farhana", "Ahmed", "SEED-EMP-104", f"seed.farhana.{business_id}@proerp.test", "+8801611100204",
            GenderEnum.FEMALE, MaritalStatusEnum.MARRIED, 3, created_depts[2].id, created_jobs[3].id,
        ),
        (
            "Mahmudul", "Haque", "SEED-EMP-105", f"seed.mahmudul.{business_id}@proerp.test", "+8801511100205",
            GenderEnum.MALE, MaritalStatusEnum.SINGLE, 4, created_depts[3].id, created_jobs[4].id,
        ),
    ]

    created_employees = []
    for fn, ln, emp_id_str, email, phone, gender, marital, idx, dept_id, job_id in emp_specs:
        emp = Employee(
            business_id=business_id,
            first_name=fn,
            last_name=ln,
            employee_id=emp_id_str,
            work_email=email,
            phone=phone,
            gender=gender,
            marital_status=marital,
            nationality="Bangladeshi",
            date_of_birth=date(1990 + idx, 3, 15),
            start_date=date(2022, 1, 1),
            confirmation_date=date(2022, 4, 1),
            employment_type=EmploymentTypeEnum.FULL_TIME,
            work_arrangement=WorkArrangementEnum.ONSITE,
            department_id=dept_id,
            job_title_id=job_id,
            present_district="Dhaka",
            present_division="Dhaka",
            permanent_district="Chattogram" if idx % 2 == 1 else "Dhaka",
            disbursement_method="bank_transfer",
            bank_name="Dutch-Bangla Bank PLC",
            bank_account_no=f"115.120.00{idx}992",
            is_active=True,
        )
        db.add(emp)
        db.flush()
        log_record("employees", str(emp.id))
        created_employees.append(emp)
        counts["employees"] += 1

    # Assign Department Heads
    created_depts[0].head_employee_id = created_employees[1].id  # Nusrat is HR head
    created_depts[1].head_employee_id = created_employees[0].id  # Tahmidul is Tech head
    created_depts[2].head_employee_id = created_employees[3].id  # Farhana is Finance head
    db.flush()

    # 4. Leave Types (Statutory BLA 2006 compliant)
    leave_type_specs = [
        ("Annual Leave [SEED]", "S-AL", 18, True, False, GenderApplicabilityEnum.ALL, True),
        ("Casual Leave [SEED]", "S-CL", 10, True, False, GenderApplicabilityEnum.ALL, False),
        ("Medical / Sick Leave [SEED]", "S-SL", 14, True, True, GenderApplicabilityEnum.ALL, False),
    ]

    created_leave_types = []
    for name, code, max_days, is_paid, req_doc, gender_app, carry in leave_type_specs:
        full_code = f"{code[:5]}-{business_id % 1000}" if len(f"{code[:5]}-{business_id % 1000}") <= 10 else code[:10]
        lt = LeaveType(
            business_id=business_id,
            name=name,
            code=full_code,
            description=f"Statutory leave allocation policy: {name}",
            max_days_per_year=max_days,
            is_paid=is_paid,
            requires_document=req_doc,
            applicable_gender=gender_app,
            carry_forward=carry,
            is_active=True,
        )
        db.add(lt)
        db.flush()
        log_record("leave_types", str(lt.id))
        created_leave_types.append(lt)
        counts["leave_types"] += 1

    # 5. Leave Allocations for all 5 employees
    for emp in created_employees:
        for lt in created_leave_types:
            alloc = LeaveAllocation(
                business_id=business_id,
                employee_id=emp.id,
                leave_type_id=lt.id,
                year=current_year,
                allocated_days=float(lt.max_days_per_year),
                used_days=0.0,
            )
            db.add(alloc)
            db.flush()
            log_record("leave_allocations", str(alloc.id))
            counts["leave_allocations"] += 1

    # 6. Standard Working Shift
    shift_code = f"S-DAY-{business_id % 1000}"[:20]
    shift = Shift(
        business_id=business_id,
        name="General Day Shift (9 AM - 5 PM) [SEED]",
        code=shift_code,
        start_time=time(9, 0),
        end_time=time(17, 0),
        work_hours=8.0,
        break_duration_minutes=60,
        grace_in_minutes=15,
        grace_out_minutes=15,
        is_night_shift=False,
        is_off_day=False,
        color_code="#2563EB",
        is_active=True,
    )
    db.add(shift)
    db.flush()
    log_record("shifts", str(shift.id))
    counts["shifts"] += 1

    # 7. Attendance Records (Last 5 working days for each employee)
    today = date.today()
    for day_offset in range(1, 6):
        att_date = today - timedelta(days=day_offset)
        # Skip Fridays if applicable, but for seed we can generate weekdays
        for emp in created_employees:
            att = Attendance(
                business_id=business_id,
                employee_id=emp.id,
                date=att_date,
                status=AttendanceStatusEnum.PRESENT,
                check_in=time(9, 2 + day_offset),
                check_out=time(17, 10 + day_offset),
                work_hours=8.0,
                overtime_hours=0.0,
                source=AttendanceSourceEnum.BIOMETRIC,
                note="Seed regular punch log",
            )
            db.add(att)
            db.flush()
            log_record("attendance", str(att.id))
            counts["attendance"] += 1

    # 8. Performance Appraisal Cycle & Goals
    cycle = AppraisalCycle(
        business_id=business_id,
        title=f"FY {current_year} Annual Performance Cycle [SEED]",
        cycle_type=CycleTypeEnum.ANNUAL.value,
        start_date=date(current_year, 1, 1),
        end_date=date(current_year, 12, 31),
        self_review_deadline=date(current_year, 11, 15),
        manager_review_deadline=date(current_year, 11, 30),
        status=CycleStatusEnum.GOAL_SETTING.value,
    )
    db.add(cycle)
    db.flush()
    log_record("performance_cycles", str(cycle.id))
    counts["performance_cycles"] += 1

    for emp in created_employees:
        goal = EmployeeGoal(
            business_id=business_id,
            employee_id=emp.id,
            cycle_id=cycle.id,
            title=f"Achieve H1 Key Performance Deliverables for {emp.first_name} [SEED]",
            description="Complete sprint deliverables and uphold ISO 27001 data governance compliance.",
            category=GoalCategoryEnum.OPERATIONAL.value,
            metric_type=GoalMetricEnum.PERCENTAGE.value,
            target_value=Decimal("100.00"),
            achieved_value=Decimal("75.00"),
            weightage=Decimal("40.00"),
            due_date=date(current_year, 6, 30),
            status=GoalStatusEnum.ON_TRACK.value,
        )
        db.add(goal)
        db.flush()
        log_record("employee_goals", str(goal.id))
        counts["employee_goals"] += 1

    return counts
