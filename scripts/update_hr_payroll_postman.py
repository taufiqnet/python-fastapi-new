import json
import os

COLLECTION_FILE = "Business Profile API.postman_collection.json"

def create_request(name, method, path_segments, query_params=None, body_json=None, description=""):
    headers = [
        {"key": "Authorization", "value": "Bearer {{token}}", "type": "text"},
        {"key": "Content-Type", "value": "application/json", "type": "text"}
    ]
    
    url = {
        "raw": f"{{{{base_url}}}}/{'/'.join(path_segments)}",
        "host": ["{{base_url}}"],
        "path": path_segments
    }
    
    if query_params:
        url["query"] = [{"key": k, "value": v} for k, v in query_params.items()]
        query_str = "&".join([f"{k}={v}" for k, v in query_params.items()])
        url["raw"] += f"?{query_str}"
        
    req = {
        "name": name,
        "request": {
            "method": method,
            "header": headers,
            "url": url,
            "description": description
        },
        "response": []
    }
    
    if body_json is not None:
        req["request"]["body"] = {
            "mode": "raw",
            "raw": json.dumps(body_json, indent=4),
            "options": {"raw": {"language": "json"}}
        }
        
    return req

def build_attendance_subfolders():
    return [
        {
            "name": "Biometric Device Integration Setup",
            "item": [
                create_request(
                    "Get Attendance Settings",
                    "GET",
                    ["attendance", "settings"],
                    {"business_id": "1"},
                    description="Retrieve global attendance configuration including biometric device integration toggle, overtime rules, and grace periods."
                ),
                create_request(
                    "Update Attendance Settings (Enable/Disable Biometric)",
                    "PUT",
                    ["attendance", "settings"],
                    {"business_id": "1"},
                    body_json={
                        "biometric_integration_enabled": True,
                        "grace_period_minutes": 15,
                        "overtime_minimum_minutes": 60,
                        "work_hours_per_day": 8.0,
                        "allow_manual_requests": True,
                        "require_outdoor_duty_approval": True
                    },
                    description="Configure attendance operation rules and toggle hardware biometric automation."
                ),
                create_request(
                    "List Biometric Devices",
                    "GET",
                    ["attendance", "devices"],
                    {"business_id": "1"},
                    description="List registered biometric timeclocks across branches (ZKTeco, Hikvision, Suprema)."
                ),
                create_request(
                    "Register Biometric Device",
                    "POST",
                    ["attendance", "devices"],
                    {"business_id": "1"},
                    body_json={
                        "business_id": 1,
                        "name": "Main Entrance Turnstile ZKTeco",
                        "device_code": "BIO-GUL-01",
                        "ip_address": "192.168.1.201",
                        "port": 4370,
                        "device_type": "zkteco_standalone",
                        "branch_id": 1,
                        "location": "Gulshan Flagship Outlet Reception",
                        "secret_key": "sec_zk_991823",
                        "is_active": True
                    },
                    description="Enroll a new hardware biometric device for automated daily sync."
                ),
                create_request(
                    "Test Device Connection (Ping)",
                    "POST",
                    ["attendance", "devices", "{{device_id}}", "ping"],
                    {"business_id": "1"},
                    description="Execute network handshake and protocol probe to verify biometric device connectivity."
                ),
                create_request(
                    "Trigger Device Sync & Pull Logs",
                    "POST",
                    ["attendance", "sync-daily"],
                    {"business_id": "1"},
                    body_json={
                        "business_id": 1,
                        "target_date": "2026-10-24",
                        "device_ids": []
                    },
                    description="Execute scheduled or manual punch retrieval from online biometric hardware terminals."
                )
            ]
        },
        {
            "name": "Raw Attendance Logs & Webhooks",
            "item": [
                create_request(
                    "Get Raw Attendance Logs",
                    "GET",
                    ["attendance", "raw-logs"],
                    {"business_id": "1", "date": "2026-10-24"},
                    description="View immutable audit log of raw biometric hardware clockings."
                ),
                create_request(
                    "Push Device Attendance Punch (Webhook)",
                    "POST",
                    ["attendance", "raw-logs", "push"],
                    {"business_id": "1"},
                    body_json={
                        "business_id": 1,
                        "device_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                        "biometric_user_id": "EMP-001",
                        "punch_time": "2026-10-24T09:02:15",
                        "punch_type": "in",
                        "verification_mode": "fingerprint"
                    },
                    description="Receives punch notifications pushed directly by smart biometric terminals or edge gateways."
                )
            ]
        },
        {
            "name": "Manual Attendance & Regularizations",
            "item": [
                create_request(
                    "List Manual Attendance Requests",
                    "GET",
                    ["attendance", "regularizations"],
                    {"business_id": "1", "status": "pending"},
                    description="Fetch employee regularizations and missing punch adjustments."
                ),
                create_request(
                    "Submit Manual Attendance Request",
                    "POST",
                    ["attendance", "regularizations"],
                    {"business_id": "1"},
                    body_json={
                        "business_id": 1,
                        "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                        "attendance_date": "2026-10-24",
                        "requested_check_in": "09:00:00",
                        "requested_check_out": "18:00:00",
                        "reason": "Biometric device scanner failed to recognize fingerprint during peak rush."
                    },
                    description="Employee submission for missing punch regularization."
                ),
                create_request(
                    "Review Regularization (Approve / Reject)",
                    "PATCH",
                    ["attendance", "regularizations", "{{reg_id}}", "review"],
                    {"business_id": "1"},
                    body_json={
                        "action": "approved",
                        "reviewer_notes": "Verified with CCTV entrance footage."
                    },
                    description="HR or supervisor approval of manual attendance adjustment."
                )
            ]
        },
        {
            "name": "Visit & Outdoor Duty Management",
            "item": [
                create_request(
                    "List Outdoor Duty Applications",
                    "GET",
                    ["attendance", "outdoor-duties"],
                    {"business_id": "1"},
                    description="View customer visits, vendor site inspections, and outdoor duty records."
                ),
                create_request(
                    "Submit Outdoor Duty Application",
                    "POST",
                    ["attendance", "outdoor-duties"],
                    {"business_id": "1"},
                    body_json={
                        "business_id": 1,
                        "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                        "visit_date": "2026-10-24",
                        "expected_start_time": "10:00:00",
                        "expected_end_time": "16:00:00",
                        "destination": "Bashundhara R/A - Central Super Store Site",
                        "purpose": "Store equipment calibration and cashier training."
                    },
                    description="Apply for outdoor duty / field assignment with location details."
                ),
                create_request(
                    "Review Outdoor Duty Application",
                    "PATCH",
                    ["attendance", "outdoor-duties", "{{od_id}}", "review"],
                    {"business_id": "1"},
                    body_json={
                        "action": "approved",
                        "reviewer_notes": "Official visit approved."
                    },
                    description="Approve or decline outdoor duty request."
                )
            ]
        },
        {
            "name": "Overtime (OT) Management",
            "item": [
                create_request(
                    "List Overtime Requests",
                    "GET",
                    ["attendance", "overtime"],
                    {"business_id": "1"},
                    description="View overtime applications and authorization statuses."
                ),
                create_request(
                    "Apply for Overtime",
                    "POST",
                    ["attendance", "overtime"],
                    {"business_id": "1"},
                    body_json={
                        "business_id": 1,
                        "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                        "ot_date": "2026-10-24",
                        "ot_hours": 3.5,
                        "reason": "Emergency inventory cycle counting and month-end shelf audit."
                    },
                    description="Submit pre-approved or post-shift overtime claim."
                ),
                create_request(
                    "Review Overtime Request",
                    "PATCH",
                    ["attendance", "overtime", "{{ot_id}}", "review"],
                    {"business_id": "1"},
                    body_json={
                        "action": "approved",
                        "approved_hours": 3.0,
                        "reviewer_notes": "Approved 3.0 hours active inventory count."
                    },
                    description="Authorize and approve overtime hours for monthly payroll computation."
                )
            ]
        },
        {
            "name": "Attendance Processing & Monthly Summary",
            "item": [
                create_request(
                    "Process Period Attendance",
                    "POST",
                    ["attendance", "process-period"],
                    {"business_id": "1"},
                    body_json={
                        "business_id": 1,
                        "start_date": "2026-10-01",
                        "end_date": "2026-10-31"
                    },
                    description="Compile raw punches, leaves, holidays, and regularizations into finalized attendance records."
                ),
                create_request(
                    "List Period Approvals",
                    "GET",
                    ["attendance", "period-approvals"],
                    {"business_id": "1"},
                    description="View period sign-off records and payroll locking status."
                ),
                create_request(
                    "Create Period Approval",
                    "POST",
                    ["attendance", "period-approvals"],
                    {"business_id": "1"},
                    body_json={
                        "business_id": 1,
                        "year": 2026,
                        "month": 10,
                        "period_name": "October 2026 Attendance Final",
                        "notes": "Verified by HR Operations."
                    },
                    description="Initiate attendance period approval cycle."
                ),
                create_request(
                    "Lock Period Attendance (Freeze for Payroll)",
                    "POST",
                    ["attendance", "period-approvals", "{{approval_id}}", "lock"],
                    {"business_id": "1"},
                    description="Freeze period attendance to prevent tampering and hand over to automated salary processing."
                ),
                create_request(
                    "Get Monthly Attendance Summary",
                    "GET",
                    ["attendance", "monthly-summary"],
                    {"business_id": "1", "year": "2026", "month": "10"},
                    description="Comprehensive tabular roster breakdown of days present, late, absent, on leave, and overtime hours."
                ),
                create_request(
                    "Export Monthly Summary to Excel",
                    "GET",
                    ["attendance", "monthly-summary", "export-excel"],
                    {"business_id": "1", "year": "2026", "month": "10"},
                    description="Download formatted spreadsheet of monthly attendance summary."
                )
            ]
        }
    ]

def build_separation_folder():
    return {
        "name": "Separation & Offboarding",
        "item": [
            {
                "name": "Resignation Applications",
                "item": [
                    create_request(
                        "Submit Resignation Application",
                        "POST",
                        ["separation", "resignations"],
                        {"business_id": "1"},
                        body_json={
                            "business_id": 1,
                            "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                            "resignation_date": "2026-10-24",
                            "proposed_last_working_day": "2026-11-23",
                            "reason_type": "career_growth",
                            "reason_details": "Accepted a new role closer to home.",
                            "handover_notes": "Completed handover checklist and documentation."
                        },
                        description="Employee submits formal resignation specifying proposed last working day."
                    ),
                    create_request(
                        "List Resignation Applications",
                        "GET",
                        ["separation", "resignations"],
                        {"business_id": "1"},
                        description="Retrieve all submitted resignation applications with status filters."
                    ),
                    create_request(
                        "Get Resignation Details",
                        "GET",
                        ["separation", "resignations", "{{resignation_id}}"],
                        {"business_id": "1"},
                        description="View full resignation details including notice calculation and review history."
                    ),
                    create_request(
                        "Review Resignation (Approve/Reject)",
                        "POST",
                        ["separation", "resignations", "{{resignation_id}}", "review"],
                        {"business_id": "1"},
                        body_json={
                            "action": "approved",
                            "approved_last_working_day": "2026-11-23",
                            "notice_shortfall_days": 0,
                            "reviewer_notes": "Resignation accepted with full 30-day notice served."
                        },
                        description="Manager/HR reviews and signs off on resignation application."
                    ),
                    create_request(
                        "Withdraw Resignation Application",
                        "POST",
                        ["separation", "resignations", "{{resignation_id}}", "withdraw"],
                        {"business_id": "1"},
                        description="Allows employee to retract resignation before separation execution."
                    )
                ]
            },
            {
                "name": "Employee Separation Master",
                "item": [
                    create_request(
                        "Create Employee Separation (Termination/Retirement/Dismissal)",
                        "POST",
                        ["separation", "separations"],
                        {"business_id": "1"},
                        body_json={
                            "business_id": 1,
                            "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                            "separation_type": "termination",
                            "separation_date": "2026-10-24",
                            "last_working_day": "2026-10-24",
                            "reason": "Business restructuring of branch operations.",
                            "is_eligible_for_rehire": True,
                            "gratuity_applicable": True,
                            "remarks": "Separated with full statutory severance package."
                        },
                        description="Initiate formal employee separation under Bangladesh Labour Act (BLA 2006)."
                    ),
                    create_request(
                        "List Employee Separations",
                        "GET",
                        ["separation", "separations"],
                        {"business_id": "1"},
                        description="List all ongoing and completed employee separations."
                    ),
                    create_request(
                        "Get Separation Details",
                        "GET",
                        ["separation", "separations", "{{separation_id}}"],
                        {"business_id": "1"},
                        description="View complete separation record, department clearances, and settlement links."
                    ),
                    create_request(
                        "Update Separation Record",
                        "PUT",
                        ["separation", "separations", "{{separation_id}}"],
                        {"business_id": "1"},
                        body_json={
                            "last_working_day": "2026-11-01",
                            "remarks": "Extended last working day for additional audit sign-off."
                        },
                        description="Modify separation metadata and key offboarding milestones."
                    )
                ]
            },
            {
                "name": "Department Clearances & NOC",
                "item": [
                    create_request(
                        "List All Department Clearances",
                        "GET",
                        ["separation", "clearances"],
                        {"business_id": "1"},
                        description="Retrieve clearance sign-off statuses across IT, Admin, Finance, Legal, and HR."
                    ),
                    create_request(
                        "Get Separation Clearance Status (5 Departments)",
                        "GET",
                        ["separation", "separations", "{{separation_id}}", "clearances"],
                        {"business_id": "1"},
                        description="View itemized departmental sign-offs for an active separation."
                    ),
                    create_request(
                        "Sign-Off Department Clearance",
                        "POST",
                        ["separation", "clearances", "{{clearance_id}}", "sign-off"],
                        {"business_id": "1"},
                        body_json={
                            "status": "cleared",
                            "deduction_amount": 0.0,
                            "notes": "All access tokens, email credentials, and hardware verified."
                        },
                        description="Authorized department representative signs off on employee clearance."
                    )
                ]
            },
            {
                "name": "Asset Handover & Recovery",
                "item": [
                    create_request(
                        "List Custody Assets for Employee",
                        "GET",
                        ["separation", "employees", "{{employee_id}}", "assets"],
                        {"business_id": "1"},
                        description="Query asset inventory to identify all laptops, ID cards, SIMs, and keys held by departing staff."
                    ),
                    create_request(
                        "Execute Asset Return & Handover Sign-off",
                        "POST",
                        ["separation", "assets", "{{assignment_id}}", "return"],
                        {"business_id": "1"},
                        body_json={
                            "return_condition": "good",
                            "recovery_amount": 0.0,
                            "notes": "MacBook Pro returned in immaculate condition with original charger."
                        },
                        description="Register physical return of company property into inventory."
                    )
                ]
            },
            {
                "name": "Exit Interview",
                "item": [
                    create_request(
                        "Conduct Exit Interview",
                        "POST",
                        ["separation", "exit-interviews"],
                        {"business_id": "1"},
                        body_json={
                            "business_id": 1,
                            "separation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                            "interviewer_name": "Taufiqul Islam (Head of HR)",
                            "primary_reason_for_leaving": "Higher compensation & remote work flexibility",
                            "job_satisfaction_rating": 4,
                            "management_rating": 4,
                            "work_culture_rating": 5,
                            "recommend_company": True,
                            "feedback_notes": "Appreciated team support and career mentorship."
                        },
                        description="Document exit interview ratings, retention feedback, and cultural scores."
                    ),
                    create_request(
                        "List Exit Interviews",
                        "GET",
                        ["separation", "exit-interviews"],
                        {"business_id": "1"},
                        description="Review enterprise offboarding analytics and exit interviews."
                    ),
                    create_request(
                        "Get Separation Exit Interview Details",
                        "GET",
                        ["separation", "separations", "{{separation_id}}", "exit-interview"],
                        {"business_id": "1"},
                        description="Inspect specific exit survey submitted for a separation."
                    )
                ]
            },
            {
                "name": "Final Settlement (FnF - BLA 2006)",
                "item": [
                    create_request(
                        "List Final Settlements",
                        "GET",
                        ["separation", "settlements"],
                        {"business_id": "1"},
                        description="Query full & final settlement records across all offboarded staff."
                    ),
                    create_request(
                        "Compute Statutory Final Settlement (FnF)",
                        "POST",
                        ["separation", "separations", "{{separation_id}}", "settlement", "compute"],
                        {"business_id": "1"},
                        body_json={
                            "payable_salary_days": 24,
                            "unpaid_salary": 45000.0,
                            "encashable_leave_days": 14,
                            "leave_encashment_amount": 26250.0,
                            "service_years": 4.5,
                            "gratuity_amount": 105000.0,
                            "notice_pay": 0.0,
                            "bonus_payable": 0.0,
                            "other_allowances": 5000.0,
                            "total_earnings": 181250.0,
                            "notice_shortfall_deduction": 0.0,
                            "unreturned_asset_deduction": 0.0,
                            "loan_deduction": 12000.0,
                            "tax_deduction": 3500.0,
                            "other_deductions": 0.0,
                            "total_deductions": 15500.0,
                            "net_settlement_amount": 165750.0
                        },
                        description="Compute statutory compensation adhering to BLA 2006 leave encashment and gratuity formulas."
                    ),
                    create_request(
                        "Get Final Settlement Breakdown",
                        "GET",
                        ["separation", "settlements", "{{settlement_id}}"],
                        {"business_id": "1"},
                        description="View full financial calculation breakdown and audit sign-off for a final settlement."
                    ),
                    create_request(
                        "Disburse Final Settlement Funds",
                        "POST",
                        ["separation", "settlements", "{{settlement_id}}", "disburse"],
                        {"business_id": "1"},
                        body_json={
                            "payment_method": "bank_transfer",
                            "reference_number": "EFT-FNF-2026-9901",
                            "disbursed_at": "2026-10-24T12:00:00",
                            "remarks": "Disbursed to verified employee salary bank account."
                        },
                        description="Complete disbursement of net FnF settlement and lock separation profile."
                    )
                ]
            },
            {
                "name": "Experience & Release Letters",
                "item": [
                    create_request(
                        "Generate Experience & Release Letter",
                        "POST",
                        ["separation", "release-letters"],
                        {"business_id": "1"},
                        body_json={
                            "business_id": 1,
                            "separation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                            "reference_number": "HR/EXP/2026/042",
                            "title": "Experience & Certificate of Service",
                            "content": "This is to certify that Mr. Tariqul Islam was employed with our organization from 01 Jan 2022 to 24 Oct 2026 as Senior Retail Operations Lead. His conduct during his tenure was exemplary.",
                            "issued_date": "2026-10-24"
                        },
                        description="Create authenticated certificate of service and official release letter."
                    ),
                    create_request(
                        "List Release Letters",
                        "GET",
                        ["separation", "release-letters"],
                        {"business_id": "1"},
                        description="View generated release letters across the enterprise."
                    ),
                    create_request(
                        "Get Release Letter by Separation",
                        "GET",
                        ["separation", "separations", "{{separation_id}}", "release-letter"],
                        {"business_id": "1"},
                        description="Fetch the officially issued certificate of service and experience letter."
                    )
                ]
            }
        ]
    }

def build_documents_folder():
    return {
        "name": "Employee Document Management",
        "item": [
            {
                "name": "Document Categories",
                "item": [
                    create_request(
                        "List Document Categories",
                        "GET",
                        ["documents", "categories"],
                        {"business_id": "1"},
                        description="Fetch document categories configured with statutory and confidentiality policies."
                    ),
                    create_request(
                        "Create Document Category",
                        "POST",
                        ["documents", "categories"],
                        {"business_id": "1"},
                        body_json={
                            "business_id": 1,
                            "name": "Academic & Professional Certifications",
                            "code": "EDU_CERT",
                            "description": "University diplomas, academic transcripts, and professional licensures.",
                            "is_mandatory": False,
                            "has_expiry": False,
                            "confidentiality_level": "internal",
                            "allowed_extensions": "pdf,png,jpg,jpeg",
                            "max_file_size_mb": 10
                        },
                        description="Configure new document category for employee personal files."
                    ),
                    create_request(
                        "Update Document Category",
                        "PUT",
                        ["documents", "categories", "{{category_id}}"],
                        {"business_id": "1"},
                        body_json={
                            "is_mandatory": True,
                            "confidentiality_level": "confidential"
                        },
                        description="Update retention, size, or statutory flags on an existing category."
                    )
                ]
            },
            {
                "name": "Document Templates & Preview Engine",
                "item": [
                    create_request(
                        "List Document Templates",
                        "GET",
                        ["documents", "templates"],
                        {"business_id": "1"},
                        description="Retrieve document generation blueprints with merge token schemas."
                    ),
                    create_request(
                        "Create Document Template",
                        "POST",
                        ["documents", "templates"],
                        {"business_id": "1"},
                        body_json={
                            "business_id": 1,
                            "name": "Annual Appraisal Salary Increment Letter",
                            "template_type": "increment",
                            "subject": "Notice of Compensation Revision",
                            "content_html": "REF: {{reference_no}}\nDate: {{current_date}}\n\nDear {{employee_name}},\n\nWe are pleased to inform you that effective {{effective_date}}, your revised monthly gross salary is BDT {{gross_salary}}.",
                            "header_content": "Official Corporate Letterhead",
                            "footer_content": "Confidential - Addressee Only",
                            "is_active": True
                        },
                        description="Register reusable document template containing merge tags."
                    ),
                    create_request(
                        "Update Document Template",
                        "PUT",
                        ["documents", "templates", "{{template_id}}"],
                        {"business_id": "1"},
                        body_json={
                            "name": "Revised Increment Letter 2026",
                            "is_active": True
                        },
                        description="Update template content or active flag."
                    ),
                    create_request(
                        "Live Preview Template with Tokens",
                        "POST",
                        ["documents", "templates", "preview"],
                        {"business_id": "1"},
                        body_json={
                            "template_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                            "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                            "custom_tokens": {
                                "reference_no": "HR/INC/2026/001",
                                "effective_date": "2026-11-01"
                            }
                        },
                        description="Test render template with dynamic employee profile variables and custom token overrides."
                    )
                ]
            },
            {
                "name": "Digital Personal File (e-Dossier / 201 File)",
                "item": [
                    create_request(
                        "List Employee Dossier Documents",
                        "GET",
                        ["documents", "dossier"],
                        {"business_id": "1", "employee_id": "{{employee_id}}"},
                        description="Retrieve all digital files uploaded to an employee's e-Dossier folder."
                    ),
                    create_request(
                        "Upload Document to Dossier",
                        "POST",
                        ["documents", "dossier"],
                        {"business_id": "1"},
                        body_json={
                            "business_id": 1,
                            "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                            "category_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                            "document_title": "Graduation Diploma - BSc CSE",
                            "document_number": "DIP-DU-2020-891",
                            "file_url": "/uploads/dossier/emp1/diploma.pdf",
                            "file_name": "diploma.pdf",
                            "file_size_bytes": 1048576,
                            "mime_type": "application/pdf",
                            "issue_date": "2020-06-30",
                            "issuing_authority": "University of Dhaka"
                        },
                        description="Upload authenticated document to employee's 201 personal file."
                    ),
                    create_request(
                        "Get Dossier Completeness Scorecard",
                        "GET",
                        ["documents", "dossier", "summary", "{{employee_id}}"],
                        {"business_id": "1"},
                        description="Evaluate compliance percentage across all mandatory statutory categories (NID, Photos, Agreements)."
                    ),
                    create_request(
                        "Verify / Reject Dossier Document",
                        "PUT",
                        ["documents", "dossier", "{{doc_id}}", "verify"],
                        {"business_id": "1"},
                        body_json={
                            "status": "verified",
                            "rejection_reason": None
                        },
                        description="HR auditor verifies or rejects uploaded document with audit trail."
                    )
                ]
            },
            {
                "name": "ID, Passport, Visa & Work Permit Tracking",
                "item": [
                    create_request(
                        "List Employee Identity Records",
                        "GET",
                        ["documents", "identity-records"],
                        {"business_id": "1"},
                        description="Fetch statutory credentials including Smart NID, Passports, and BIDA work permits."
                    ),
                    create_request(
                        "Create Identity Record (Smart NID / Passport / BIDA)",
                        "POST",
                        ["documents", "identity-records"],
                        {"business_id": "1"},
                        body_json={
                            "business_id": 1,
                            "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                            "identity_type": "nid_smart_card",
                            "document_number": "1992019283",
                            "issuing_country": "Bangladesh",
                            "issuing_authority": "Election Commission Bangladesh",
                            "issue_date": "2018-05-15",
                            "expiry_date": "2028-05-15",
                            "alert_threshold_days": 60,
                            "is_primary": True
                        },
                        description="Store verified statutory identification with automated expiration tracking."
                    ),
                    create_request(
                        "Update Identity Record",
                        "PUT",
                        ["documents", "identity-records", "{{record_id}}"],
                        {"business_id": "1"},
                        body_json={
                            "document_number": "1992019284",
                            "expiry_date": "2029-05-15"
                        },
                        description="Update credential details and renewed expiration dates."
                    )
                ]
            },
            {
                "name": "Contracts, NDAs & Agreements",
                "item": [
                    create_request(
                        "List Employee Agreements",
                        "GET",
                        ["documents", "agreements"],
                        {"business_id": "1"},
                        description="Query permanent contracts, fixed-term employment agreements, NDAs, and training bonds."
                    ),
                    create_request(
                        "Create Agreement (Employment Contract, NDA, Bond)",
                        "POST",
                        ["documents", "agreements"],
                        {"business_id": "1"},
                        body_json={
                            "business_id": 1,
                            "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                            "agreement_type": "permanent_contract",
                            "reference_no": "AGR-EMP-2026-001",
                            "title": "Permanent Employment Agreement",
                            "start_date": "2026-10-24",
                            "end_date": None,
                            "notice_period_days": 30,
                            "probation_months": 3,
                            "bond_amount": 0.0,
                            "governing_law": "Laws of Bangladesh (BLA 2006)",
                            "status": "active"
                        },
                        description="Register legally binding employment agreement with statutory governance parameters."
                    ),
                    create_request(
                        "Renew / Extend Agreement",
                        "POST",
                        ["documents", "agreements", "{{agreement_id}}", "renew"],
                        {"business_id": "1"},
                        body_json={
                            "new_start_date": "2026-11-01",
                            "new_end_date": "2027-10-31",
                            "new_reference_no": "AGR-EMP-2026-001-R1",
                            "renewal_notes": "Annual fixed-term contract renewed based on outstanding performance."
                        },
                        description="Execute agreement extension and archive historical term."
                    )
                ]
            },
            {
                "name": "Document Expiry & Renewal Alerts",
                "item": [
                    create_request(
                        "List Expiry Alerts",
                        "GET",
                        ["documents", "expiry-alerts"],
                        {"business_id": "1"},
                        description="View documents, credentials, and agreements approaching expiration."
                    ),
                    create_request(
                        "Run Expiry Scan Engine",
                        "POST",
                        ["documents", "expiry-alerts", "scan"],
                        {"business_id": "1", "threshold_days": "60"},
                        description="Trigger background scanner to evaluate passports, work permits, and contracts expiring within threshold."
                    ),
                    create_request(
                        "Update Renewal Tracking Status",
                        "PUT",
                        ["documents", "expiry-alerts", "{{alert_id}}"],
                        {"business_id": "1"},
                        body_json={
                            "renewal_status": "in_progress",
                            "tracking_reference": "PASSPORT-RNW-2026-001",
                            "notes": "Submitted renewal packet to Embassy."
                        },
                        description="Update resolution stage on active expiration alert."
                    )
                ]
            },
            {
                "name": "Bulk Letter Generation",
                "item": [
                    create_request(
                        "List Bulk Letter Jobs",
                        "GET",
                        ["documents", "bulk-letters", "jobs"],
                        {"business_id": "1"},
                        description="List batch letter generation runs and dispatch statuses."
                    ),
                    create_request(
                        "Create & Dispatch Bulk Letter Batch",
                        "POST",
                        ["documents", "bulk-letters", "generate"],
                        {"business_id": "1"},
                        body_json={
                            "business_id": 1,
                            "job_type": "increment",
                            "template_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                            "batch_title": "Annual Increment Cycle 2026",
                            "reference_prefix": "HR/INC/2026",
                            "issue_date": "2026-10-24",
                            "employee_ids": ["3fa85f64-5717-4562-b3fc-2c963f66afa6"]
                        },
                        description="Generate and dispatch personalized increment, appointment, or confirmation letters in batch."
                    ),
                    create_request(
                        "Get Bulk Letter Job Details",
                        "GET",
                        ["documents", "bulk-letters", "jobs", "{{job_id}}"],
                        {"business_id": "1"},
                        description="View batch statistics, success/failure counts, and rendered letters."
                    ),
                    create_request(
                        "Get Bulk Letter Job Items",
                        "GET",
                        ["documents", "bulk-letters", "jobs", "{{job_id}}", "items"],
                        {"business_id": "1"},
                        description="Inspect individual recipient letters with acknowledgment status."
                    )
                ]
            },
            {
                "name": "Statutory e-Signature & Verification (ICT Act 2006)",
                "item": [
                    create_request(
                        "Execute Digital Signature (SHA-256 Stamp)",
                        "POST",
                        ["documents", "signatures", "sign"],
                        {"business_id": "1"},
                        body_json={
                            "business_id": 1,
                            "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                            "document_content_to_hash": "I accept the terms of the Employment Contract Ref: AGR-001.",
                            "signature_mode": "drawn_canvas",
                            "signature_image_base64_or_url": "data:image/png;base64,iVBORw0KGgo...",
                            "signer_full_name": "Tariqul Islam",
                            "signer_email": "tariqul@company.com",
                            "acknowledgement_text": "I hereby confirm that I have reviewed the contents of this document. By executing this electronic signature, I intend to legally bind myself under the Information & Communication Technology (ICT) Act 2006."
                        },
                        description="Legally bind employee/signatory to document with tamper-evident SHA-256 hash and audit certificate number."
                    ),
                    create_request(
                        "Verify Certificate & Audit Authenticity",
                        "GET",
                        ["documents", "signatures", "verify", "{{certificate_no}}"],
                        {"business_id": "1"},
                        description="Public/Internal verification of electronic signature certificate authenticity and checksum integrity."
                    )
                ]
            }
        ]
    }

def main():
    if not os.path.exists(COLLECTION_FILE):
        print(f"File {COLLECTION_FILE} not found.")
        return

    with open(COLLECTION_FILE, "r", encoding="utf-8") as f:
        collection = json.load(f)

    # Find "HR & Payroll"
    hr_folder = None
    for folder in collection.get("item", []):
        if folder.get("name") == "HR & Payroll":
            hr_folder = folder
            break

    if not hr_folder:
        print("HR & Payroll folder not found in collection.")
        return

    # 1. Update / augment Attendance
    attendance_folder = None
    for item in hr_folder.get("item", []):
        if item.get("name") == "Attendance":
            attendance_folder = item
            break

    att_subfolders = build_attendance_subfolders()
    if attendance_folder:
        # Check if already upgraded to subfolders
        existing_sub_names = [x.get("name") for x in attendance_folder.get("item", [])]
        for sub in att_subfolders:
            if sub["name"] not in existing_sub_names:
                attendance_folder["item"].append(sub)
            else:
                # Replace with updated
                for i, ex in enumerate(attendance_folder["item"]):
                    if ex.get("name") == sub["name"]:
                        attendance_folder["item"][i] = sub
                        break
        print("Updated 'Attendance' folder with biometric, manual attendance, overtime, and monthly processes.")
    else:
        hr_folder["item"].append({
            "name": "Attendance & Time Tracking",
            "item": att_subfolders
        })
        print("Added 'Attendance & Time Tracking' folder.")

    # 2. Add / Update "Separation & Offboarding"
    separation_folder = build_separation_folder()
    existing_idx = None
    for idx, item in enumerate(hr_folder.get("item", [])):
        if item.get("name") == "Separation & Offboarding":
            existing_idx = idx
            break

    if existing_idx is not None:
        hr_folder["item"][existing_idx] = separation_folder
        print("Replaced existing 'Separation & Offboarding' folder with full suite.")
    else:
        hr_folder["item"].append(separation_folder)
        print("Appended 'Separation & Offboarding' folder.")

    # 3. Add / Update "Employee Document Management"
    documents_folder = build_documents_folder()
    existing_doc_idx = None
    for idx, item in enumerate(hr_folder.get("item", [])):
        if item.get("name") == "Employee Document Management":
            existing_doc_idx = idx
            break

    if existing_doc_idx is not None:
        hr_folder["item"][existing_doc_idx] = documents_folder
        print("Replaced existing 'Employee Document Management' folder with full suite.")
    else:
        hr_folder["item"].append(documents_folder)
        print("Appended 'Employee Document Management' folder.")

    # Save collection
    with open(COLLECTION_FILE, "w", encoding="utf-8") as f:
        json.dump(collection, f, indent=4)

    print("Successfully updated Business Profile API.postman_collection.json!")

if __name__ == "__main__":
    main()
