# Implementation Plan: Attendance & Time Tracking Module

Comprehensive architectural and engineering plan to implement the enterprise **Attendance & Time Tracking** module for ProERP SaaS. This plan integrates optional biometric device hardware integration, raw punch logs, manual attendance regularization, outdoor duty/visit applications, overtime workflows (BLA 2006 compliant), period consolidation & approval locks, and monthly attendance summaries—all while guaranteeing **100% backward compatibility and zero disruption to the existing monthly salary process**.

---

## 1. Goal Description

Build a high-reliability, multi-tenant attendance engine that supports both **manual/web-based timekeeping** (current default) and **automated biometric device synchronization** (optional toggle). When device synchronization is disabled, payroll and attendance proceed seamlessly without requiring any physical hardware. When enabled in the future, the system connects to biometric devices (ZKTeco, Hikvision, Realtime, Anviz, Generic Webhook), captures raw punch streams, applies shift and grace period policies, processes attendance regularizations and outdoor duties, and automatically feeds verified attendance into the monthly salary process.

### The 10 Core Functional Pillars:
1. **Biometric Device Integration Setup**: Manage hardware terminals (IP address, port, protocol, communication key, branch/location, online status, ping test).
2. **Device Enable / Disable Settings**: Central toggle (`enable_biometric_device: false` by default) ensuring zero dependency on physical devices until the business is ready.
3. **Raw Attendance Log Stream**: Unfiltered historical ledger of all physical device punches (fingerprint, facial recognition, RFID card) before consolidation.
4. **Employee Daily Attendance Sync & Consolidation Engine**: Algorithm comparing daily punches against assigned shifts, grace periods, approved leaves, and holidays to establish daily status (`present`, `late`, `half_day`, `absent`, `on_leave`).
5. **Manual Attendance & Regularization Requests**: Workflow for employees to request missed punch corrections, late excuses, or manual entries with supervisor approval.
6. **Visit / Outdoor Duty (OD) Applications**: Application and approval workflow for client meetings, field visits, and training; approved visits automatically mark attendance as present.
7. **Overtime (OT) Application, Update & Approval**: Statutory BLA 2006 overtime management (capping, double basic hourly rate tracking, manager approval).
8. **Batch Attendance Process Engine**: Re-computes and consolidates time logs for an entire calendar month or payroll period across all employees.
9. **Attendance Period Approval & Lock**: Multi-stage governance sign-off (Department Head $\rightarrow$ HR Audit) that locks attendance before salary generation.
10. **Monthly Attendance Summary**: Aggregated employee calendar register (present, absent, late, leave, outdoor duty, work hours, overtime) with export to Excel and direct feed into the payroll calculation engine.

---

## 2. User Review Required

> [!IMPORTANT]
> **Optional Biometric Integration & Backward Compatibility Invariant**:
> - **Biometric Device Integration is purely optional**: By default, `enable_biometric_device` is set to `False`. The current salary generation engine (`/payroll/periods/{id}/generate`) continues to function exactly as it does now.
> - **Toggle-Based Automation**: When a company purchases biometric hardware in the future, they enable the setting. The system then automatically switches to processing raw logs into daily summaries and feeds them into payroll without requiring code changes.
> - **Fallback Grace**: If a biometric device fails or goes offline, HR can immediately log manual attendance or trigger manual sync without blocking payroll.

> [!TIP]
> **Statutory BLA 2006 Overtime Standards**:
> - Under BLA 2006 Sections 100, 102, and 108, standard working hours are 8 hours/day (48 hours/week).
> - Daily overtime is typically capped at a maximum of 2 hours/day (or 60 hours/week total). Overtime pay is computed at **2 times the employee basic hourly rate** ($\text{Basic Hourly Rate} = \frac{\text{Basic Salary}}{208}$).
> - Our Overtime Application workflow enforces this calculation and requires manager approval before overtime hours are approved for payroll.

---

## 3. Architecture & Data Flow

```mermaid
graph TD
    subgraph Device Layer (Optional)
        A[Biometric Devices / Face / RFID] -->|Push Webhook / Local Agent| B[Raw Attendance Log Stream]
    end
    
    subgraph Human / Operational Layer
        C[Web Punch / Manual Entry] --> D[Daily Attendance Log]
        E[Missed Punch Regularization] -->|Approval| D
        F[Outdoor Duty / Client Visit] -->|Approval| D
        G[Approved Leave Ledger] --> D
        H[Company Holiday Calendar] --> D
    end
    
    B -->|Sync & Consolidation Engine| D
    
    subgraph Overtime Workflow
        I[Overtime Application] -->|Manager Approval| J[Approved OT Hours]
        J --> D
    end
    
    subgraph Governance & Payroll
        D --> K[Batch Attendance Process]
        K --> L[Attendance Period Approval & Lock]
        L --> M[Monthly Attendance Summary]
        M -->|Feeds Attendance| N[Monthly Salary Process Engine]
    end
```

---

## 4. Proposed Changes

### Backend Components (`app/modules/hr_payroll/attendance/`)

#### [MODIFY] `app/modules/hr_payroll/attendance/models.py`
Add new models alongside the existing `Attendance` model:
- `AttendanceSettings`:
  - `business_id` (unique FK to `business_profiles.id`).
  - `enable_biometric_device` (bool, default `False`).
  - `auto_sync_device_logs` (bool, default `False`).
  - `sync_interval_minutes` (int, default `15`).
  - `grace_period_minutes` (int, default `15`).
  - `half_day_late_minutes` (int, default `120`).
  - `standard_daily_work_hours` (float, default `8.0`).
  - `minimum_work_hours_half_day` (float, default `4.0`).
  - `require_ot_pre_approval` (bool, default `True`).
  - `require_attendance_approval_before_payroll` (bool, default `False`).
- `BiometricDevice`:
  - `id`, `business_id`.
  - `device_name` (e.g. "HQ Main Gate - ZKTeco MB360", "Factory Section A").
  - `device_brand` (`zkteco`, `hikvision`, `anviz`, `realtime`, `generic_webhook`).
  - `device_type` (`fingerprint`, `face_recognition`, `rfid_card`, `hybrid`).
  - `ip_address`, `port` (default 4370), `comm_key`, `serial_number`, `mac_address`.
  - `branch_id` (optional FK to `branches.id`).
  - `status` (`online`, `offline`, `disabled`).
  - `last_heartbeat_at`, `last_synced_at`, `is_active` (bool).
- `RawAttendanceLog`:
  - `id`, `business_id`, `device_id` (optional FK).
  - `biometric_user_id` (string matching employee's biometric ID / card no).
  - `employee_id` (optional FK to `employees.id`).
  - `punch_time` (datetime, indexed).
  - `punch_state` (`check_in`, `check_out`, `break_out`, `break_in`, `auto`).
  - `verification_type` (`fingerprint`, `face`, `rfid`, `password`).
  - `device_ip`, `is_processed` (bool, indexed), `processed_at`, `error_message`.
- `AttendanceRegularization`:
  - `id`, `business_id`, `employee_id`.
  - `attendance_date` (date, indexed).
  - `request_type` (`missed_in`, `missed_out`, `both_punches`, `late_excuse`, `work_from_home`).
  - `requested_check_in` (time), `requested_check_out` (time).
  - `reason` (text), `supporting_doc_url` (string).
  - `status` (`pending`, `approved`, `rejected`).
  - `reviewed_by_id`, `reviewed_at`, `review_remarks`.
- `OutdoorDutyApplication`:
  - `id`, `business_id`, `employee_id`.
  - `start_date`, `end_date`, `is_full_day` (bool).
  - `visit_type` (`client_meeting`, `field_work`, `customer_site`, `training_seminar`, `government_office`, `other`).
  - `destination_or_client` (string), `purpose` (text).
  - `status` (`pending`, `approved`, `rejected`), `reviewed_by_id`, `reviewed_at`, `remarks`.
- `OvertimeApplication`:
  - `id`, `business_id`, `employee_id`.
  - `ot_date` (date, indexed).
  - `start_time` (time), `end_time` (time).
  - `claimed_hours` (float), `approved_hours` (float).
  - `purpose` (text), `project_name_or_task` (string).
  - `status` (`pending`, `approved`, `rejected`).
  - `approved_by_id`, `approved_at`, `manager_remarks`.
- `AttendancePeriodApproval`:
  - `id`, `business_id`, `year`, `month`, `start_date`, `end_date`.
  - `total_employees`, `present_days_total`, `absent_days_total`, `leave_days_total`, `ot_hours_total`.
  - `status` (`draft`, `under_review`, `approved`, `locked`).
  - `approved_by_id`, `approved_at`, `comments`.

#### [MODIFY] `app/modules/hr_payroll/attendance/schemas.py`
Add Pydantic schemas:
- `AttendanceSettingsOut`, `AttendanceSettingsUpdate`
- `BiometricDeviceOut`, `BiometricDeviceCreate`, `BiometricDeviceUpdate`
- `RawAttendanceLogOut`, `RawAttendancePushPayload`
- `AttendanceRegularizationOut`, `AttendanceRegularizationCreate`, `AttendanceRegularizationReview`
- `OutdoorDutyApplicationOut`, `OutdoorDutyApplicationCreate`, `OutdoorDutyReview`
- `OvertimeApplicationOut`, `OvertimeApplicationCreate`, `OvertimeReview`
- `AttendancePeriodApprovalOut`, `AttendancePeriodApprovalCreate`
- `MonthlyAttendanceSummaryItem`, `MonthlyAttendanceSummaryOut`

#### [MODIFY] `app/modules/hr_payroll/attendance/repository.py`
Add repository classes for each new model with `business_id` scoping:
- `AttendanceSettingsRepository`
- `BiometricDeviceRepository`
- `RawAttendanceLogRepository`
- `AttendanceRegularizationRepository`
- `OutdoorDutyRepository`
- `OvertimeRepository`
- `AttendancePeriodApprovalRepository`

#### [MODIFY] `app/modules/hr_payroll/attendance/service.py`
Add core business logic services:
- `AttendanceSettingsService`: Get and update settings with default initialization.
- `BiometricDeviceService`: CRUD, device ping simulation, and heartbeat recording.
- `RawAttendanceService`: Ingest push logs from hardware terminals; import `.dat`/`.csv` files.
- `AttendanceConsolidationService`:
  - `sync_daily_attendance(business_id, date)`: Parses raw logs for the day, detects earliest and latest punch, accounts for grace period and assigned roster shift timings, cross-references approved leaves/holidays/outdoor duties, and updates or creates daily `Attendance` record.
  - `process_period_attendance(business_id, start_date, end_date)`: Batch processes an entire date range.
- `AttendanceRegularizationService`: Application and review workflow; on approval, updates the daily `Attendance` record with source=`manual`.
- `OutdoorDutyService`: Application and review workflow; on approval, marks matching dates as `present` with outdoor duty note.
- `OvertimeService`: Application and review workflow; locks approved OT hours into `Attendance.overtime_hours`.
- `AttendancePeriodApprovalService`: Submits and locks attendance period.
- `MonthlyAttendanceSummaryService`: Compiles monthly attendance statistics per employee (working days, present, late, absent, leaves, holidays, outdoor duties, OT hours) with export to Excel.

#### [MODIFY] `app/modules/hr_payroll/attendance/router.py`
Expose REST API endpoints:
- Settings: `GET /attendance/settings`, `PUT /attendance/settings`
- Devices: `GET /attendance/devices`, `POST /attendance/devices`, `PUT /attendance/devices/{id}`, `DELETE /attendance/devices/{id}`, `POST /attendance/devices/{id}/ping`
- Raw Logs: `GET /attendance/raw-logs`, `POST /attendance/raw-logs/push`, `POST /attendance/raw-logs/upload-dat`
- Daily Sync & Process: `POST /attendance/sync-daily`, `POST /attendance/process-period`
- Regularizations: `GET /attendance/regularizations`, `POST /attendance/regularizations`, `PATCH /attendance/regularizations/{id}/review`
- Outdoor Duties: `GET /attendance/outdoor-duties`, `POST /attendance/outdoor-duties`, `PATCH /attendance/outdoor-duties/{id}/review`
- Overtime: `GET /attendance/overtime`, `POST /attendance/overtime`, `PATCH /attendance/overtime/{id}/review`
- Approvals & Lock: `GET /attendance/period-approvals`, `POST /attendance/period-approvals`, `POST /attendance/period-approvals/{id}/lock`
- Monthly Summary: `GET /attendance/monthly-summary`, `GET /attendance/monthly-summary/export-excel`

#### [MODIFY] `app/modules/hr_payroll/payroll/service.py`
Update `generate_period_payroll()`:
- Check `attendance_settings.enable_biometric_device`:
  - If `True` and monthly attendance summary is available: use exact verified `present_days`, `absent_days`, `leave_days`, and `overtime_hours`.
  - If `False` (default): seamlessly use existing attendance count or manual records with **zero disruption**.

#### [MODIFY] `app/models_registry.py`
Register `AttendanceSettings`, `BiometricDevice`, `RawAttendanceLog`, `AttendanceRegularization`, `OutdoorDutyApplication`, `OvertimeApplication`, `AttendancePeriodApproval`.

#### [MODIFY] `app/core/identity/seed.py`
Add permission features under `hrm`:
- `biometric_devices` ("Biometric & Attendance Devices")
- `attendance_regularizations` ("Attendance Regularizations & Requests")
- `outdoor_duties` ("Outdoor Duty & Visit Applications")
- `overtime_applications` ("Overtime Applications & Approvals")
- `attendance_approvals` ("Attendance Period Sign-off & Lock")

#### [NEW] `tests/test_hr_payroll_attendance_extended.py`
Pytest suite covering:
- Settings toggle (`enable_biometric_device` True/False).
- Biometric device creation and ping.
- Raw attendance log ingestion and daily punch consolidation into `Attendance`.
- Manual attendance regularization request and approval.
- Outdoor duty request and auto-marking of presence.
- Overtime request, approval, and BLA 2006 rate calculation.
- Attendance period approval and lock.
- Seamless compatibility with salary generation when biometric device is disabled.

---

### Frontend Components (`frontend/src/`)

#### [MODIFY] `frontend/src/types/index.ts`
Add TypeScript interfaces:
- `AttendanceSettingsOut`, `AttendanceSettingsUpdatePayload`
- `BiometricDeviceOut`, `BiometricDeviceCreatePayload`
- `RawAttendanceLogOut`
- `AttendanceRegularizationOut`, `AttendanceRegularizationCreatePayload`
- `OutdoorDutyApplicationOut`, `OutdoorDutyCreatePayload`
- `OvertimeApplicationOut`, `OvertimeCreatePayload`
- `AttendancePeriodApprovalOut`
- `MonthlyAttendanceSummaryItem`

#### [NEW] `frontend/src/components/hr-payroll/attendance/`
Tab components adhering strictly to [.agents/rules/ui_in_place_filtering.md](file:///d:/Onoda%20Inc/Test%20Projects/python/python-fastapi-new/.agents/rules/ui_in_place_filtering.md):
1. `devices/biometric-devices-tab.tsx`:
   - Biometric toggle switch (Enable/Disable Biometric Integration).
   - Devices management table (device name, brand, IP, port, online indicator, ping button, edit/delete).
   - "Register Device" modal.
   - Settings card: Grace period (mins), half-day threshold, OT pre-approval toggle.
2. `raw-logs/raw-attendance-tab.tsx`:
   - Filterable stream of physical punch logs (biometric ID, timestamp, punch state, verification mode, processing status).
   - "Import .DAT / Excel Punches" action.
   - "Re-sync Punches" button.
3. `regularizations/attendance-requests-tab.tsx`:
   - Requests table: Employee, attendance date, request type (missed punch, late excuse), requested times, reason, status.
   - Single-click Approve / Reject action with comments dialog.
   - "Submit Regularization" modal.
4. `outdoor/outdoor-duty-tab.tsx`:
   - Outdoor duty applications table: Employee, dates, visit type, client/destination, purpose, status.
   - "Apply for Outdoor Duty" modal.
   - Approve / Reject action.
5. `overtime/overtime-tab.tsx`:
   - Overtime ledger: Employee, OT date, start/end time, claimed hours, approved hours, task, status.
   - BLA 2006 statutory hourly rate indicator (Double Basic / 208).
   - "Approve OT" modal (allows adjusting approved hours).
   - "New OT Application" modal.
6. `process/attendance-process-tab.tsx`:
   - Batch consolidation runner: Select date range (or month), run consolidation algorithm across all employees.
   - Period approval & lock card: Review attendance totals and lock period.
7. `summary/monthly-attendance-summary-tab.tsx`:
   - Monthly calendar register view per employee (working days, present, late, absent, half-day, leave, holiday, OD, OT hours).
   - "Export Monthly Register (Excel)" button.

#### [MODIFY] `frontend/src/app/hr-payroll/attendance/page.tsx`
Refactor the main Attendance page into a unified tabbed hub:
- Top statistical KPI cards (Total Records, Present %, Absent Rate, Pending Regularizations, Approved OT Hours).
- Horizontal scrollable tab navigation bar:
  1. **Daily Logs** (Current Attendance Records Table)
  2. **Biometric Devices & Settings**
  3. **Raw Device Logs**
  4. **Attendance Requests**
  5. **Outdoor Duty / Visits**
  6. **Overtime Management**
  7. **Attendance Process & Lock**
  8. **Monthly Summary Register**
- Dual-tier loading (`initialLoading` vs `isFetching`), top-rim indeterminate progress bar, and React `startTransition`.

---

## 5. Verification Plan

### Automated Tests
Run pytest in virtual environment:
```powershell
.\venv\Scripts\python.exe -m pytest tests/test_hr_payroll_attendance_extended.py -v
```
Run full test suite including payroll and attendance:
```powershell
.\venv\Scripts\python.exe -m pytest tests/test_hr_payroll_payroll.py tests/test_payroll_extended_features.py tests/test_hr_payroll_attendance_extended.py -v
```

### Frontend Type-Check & Build
Run Next.js build verification:
```powershell
cd frontend
npm run build
```

### Manual Verification
1. Open `/hr-payroll/attendance` in browser.
2. In **Biometric Devices & Settings**:
   - Verify toggle: "Enable Biometric Device Auto-Sync" is initially disabled.
   - Switch toggle to enabled, save grace period (15 mins), and register a demo device ("Main Gate ZKTeco", IP `192.168.1.201`, port `4370`).
3. In **Raw Device Logs**:
   - Push a simulated punch log for an employee and verify it appears with status "Unprocessed".
4. In **Attendance Process & Lock**:
   - Run daily sync for today; verify raw punch is consolidated into **Daily Logs** as `present` with exact check-in time.
5. In **Attendance Requests**:
   - Submit a missed punch regularization for yesterday; approve it and verify daily log is updated with source=`manual`.
6. In **Outdoor Duty**:
   - Submit client visit application; approve it and verify attendance status displays `present` (OD).
7. In **Overtime Management**:
   - Submit 2 hours OT; approve 2 hours and verify overtime hours reflect on attendance record.
8. In **Monthly Summary Register**:
   - Verify summary table aggregates present days, absent days, leave days, and OT hours.
9. Open `/hr-payroll/payroll` and generate payroll:
   - Confirm salary generation executes smoothly whether biometric device is enabled or disabled.
