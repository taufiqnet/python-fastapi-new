import json
import os

COLLECTION_FILE = "Business Profile API.postman_collection.json"
MARKDOWN_FILE = "Business Profile API.postman_collection.md"

def build_request(name, method, url_raw, path_segments, query_params=None, body_json=None, variable_to_set=None, description=None):
    req = {
        "name": name,
        "request": {
            "method": method,
            "url": {
                "raw": url_raw,
                "host": ["{{base_url}}"],
                "path": path_segments
            },
            "header": [
                {
                    "key": "Authorization",
                    "value": "Bearer {{token}}"
                }
            ]
        },
        "response": []
    }

    if query_params:
        req["request"]["url"]["query"] = [
            {"key": k, "value": v} for k, v in query_params.items()
        ]

    if body_json is not None:
        req["request"]["header"].insert(0, {
            "key": "Content-Type",
            "value": "application/json"
        })
        req["request"]["body"] = {
            "mode": "raw",
            "raw": json.dumps(body_json, indent=2),
            "options": {
                "raw": {
                    "language": "json"
                }
            }
        }

    if description:
        req["request"]["description"] = description

    if variable_to_set:
        req["event"] = [
            {
                "listen": "test",
                "script": {
                    "exec": [
                        "if (pm.response.code === 200 || pm.response.code === 201) {",
                        "    const json = pm.response.json();",
                        f"    pm.collectionVariables.set(\"{variable_to_set}\", json.id);",
                        "}"
                    ],
                    "type": "text/javascript"
                }
            }
        ]

    return req

def update_collection():
    with open(COLLECTION_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Find "HR & Payroll"
    hr_item = next((item for item in data.get("item", []) if item.get("name") == "HR & Payroll"), None)
    if not hr_item:
        print("HR & Payroll item not found in collection!")
        return

    hr_folders = hr_item.get("item", [])

    # 1. Update Organization folder with Branches, Salary Grades, Organogram
    org_folder = next((f for f in hr_folders if f.get("name") == "Organization"), None)
    if org_folder:
        existing_names = [x.get("name") for x in org_folder.get("item", [])]

        new_org_items = [
            build_request(
                "Export Branches to Excel",
                "GET",
                "{{base_url}}/branches/export-excel?business_id={{business_id}}",
                ["branches", "export-excel"],
                {"business_id": "{{business_id}}"},
                description="Export branch offices to an Excel spreadsheet."
            ),
            build_request(
                "List Branches",
                "GET",
                "{{base_url}}/branches?skip=0&limit=100&business_id={{business_id}}",
                ["branches"],
                {"skip": "0", "limit": "100", "business_id": "{{business_id}}"},
                description="List all active branch offices for the business."
            ),
            build_request(
                "Create Branch",
                "POST",
                "{{base_url}}/branches",
                ["branches"],
                body_json={
                    "business_id": 1,
                    "name": "Chittagong Regional Office",
                    "code": "CTG-01",
                    "address": "Agrabad Commercial Area, Chittagong",
                    "phone": "+8801812345678",
                    "email": "ctg.branch@proerp.com",
                    "is_head_office": False,
                    "is_active": True
                },
                variable_to_set="branch_id",
                description="Create a new physical branch office."
            ),
            build_request(
                "Get Branch",
                "GET",
                "{{base_url}}/branches/{{branch_id}}",
                ["branches", "{{branch_id}}"],
                description="Get branch office details by ID."
            ),
            build_request(
                "Update Branch",
                "PUT",
                "{{base_url}}/branches/{{branch_id}}",
                ["branches", "{{branch_id}}"],
                body_json={
                    "phone": "+8801899998888",
                    "is_active": True
                },
                description="Update branch office details."
            ),
            build_request(
                "Delete Branch",
                "DELETE",
                "{{base_url}}/branches/{{branch_id}}",
                ["branches", "{{branch_id}}"],
                description="Delete branch office record."
            ),
            build_request(
                "Export Salary Grades to Excel",
                "GET",
                "{{base_url}}/salary-grades/export-excel?business_id={{business_id}}",
                ["salary-grades", "export-excel"],
                {"business_id": "{{business_id}}"},
                description="Export salary pay grades to Excel."
            ),
            build_request(
                "List Salary Grades",
                "GET",
                "{{base_url}}/salary-grades?skip=0&limit=100&business_id={{business_id}}",
                ["salary-grades"],
                {"skip": "0", "limit": "100", "business_id": "{{business_id}}"},
                description="List all structured salary grades."
            ),
            build_request(
                "Apply Bangladesh National Pay Scale 2015 Presets",
                "POST",
                "{{base_url}}/salary-grades/presets/bangladesh_national_pay_scale_2015?business_id={{business_id}}",
                ["salary-grades", "presets", "bangladesh_national_pay_scale_2015"],
                {"business_id": "{{business_id}}"},
                description="Seed all 20 standard Bangladesh Government Pay Scale grades."
            ),
            build_request(
                "Create Salary Grade",
                "POST",
                "{{base_url}}/salary-grades",
                ["salary-grades"],
                body_json={
                    "business_id": 1,
                    "grade_name": "Grade 9 - Senior Officer",
                    "grade_level": 9,
                    "min_basic_salary": 22000.0,
                    "max_basic_salary": 53060.0,
                    "yearly_increment_pct": 5.0,
                    "is_active": True
                },
                variable_to_set="salary_grade_id",
                description="Define custom pay grade tier."
            ),
            build_request(
                "Get Salary Grade",
                "GET",
                "{{base_url}}/salary-grades/{{salary_grade_id}}",
                ["salary-grades", "{{salary_grade_id}}"],
                description="Get salary grade details."
            ),
            build_request(
                "Update Salary Grade",
                "PUT",
                "{{base_url}}/salary-grades/{{salary_grade_id}}",
                ["salary-grades", "{{salary_grade_id}}"],
                body_json={
                    "yearly_increment_pct": 6.0
                },
                description="Update pay grade rules."
            ),
            build_request(
                "Delete Salary Grade",
                "DELETE",
                "{{base_url}}/salary-grades/{{salary_grade_id}}",
                ["salary-grades", "{{salary_grade_id}}"],
                description="Delete custom salary grade."
            ),
            build_request(
                "Get Reporting Organogram",
                "GET",
                "{{base_url}}/organization/organogram/reporting?business_id={{business_id}}",
                ["organization", "organogram", "reporting"],
                {"business_id": "{{business_id}}"},
                description="Get employee hierarchical reporting tree (Supervisor -> Subordinates)."
            ),
            build_request(
                "Get Structural Organogram",
                "GET",
                "{{base_url}}/organization/organogram/structure?business_id={{business_id}}",
                ["organization", "organogram", "structure"],
                {"business_id": "{{business_id}}"},
                description="Get department and branch architectural hierarchy tree."
            )
        ]

        for item in new_org_items:
            if item["name"] not in existing_names:
                org_folder["item"].append(item)

    # 2. Update Leave Management folder with Rollback, Carry Forward & Encashment
    leave_folder = next((f for f in hr_folders if f.get("name") == "Leave Management"), None)
    if leave_folder:
        existing_names = [x.get("name") for x in leave_folder.get("item", [])]

        new_leave_items = [
            build_request(
                "Rollback Leave Application Approval",
                "POST",
                "{{base_url}}/leave-applications/{{leave_application_id}}/rollback",
                ["leave-applications", "{{leave_application_id}}", "rollback"],
                body_json={
                    "rollback_reason": "Correction required by HR supervisor. Reverting deducted balance.",
                    "force_override": False
                },
                description="Rollback APPROVED application to PENDING. Restores employee leave allocation quota and reverts attendance days. Guards against locked/paid payroll periods."
            ),
            build_request(
                "Preview Yearly Leave Carry Forward",
                "POST",
                "{{base_url}}/leave-allocations/carry-forward/preview",
                ["leave-allocations", "carry-forward", "preview"],
                body_json={
                    "business_id": 1,
                    "source_year": 2025,
                    "target_year": 2026,
                    "leave_type_id": "{{leave_type_id}}"
                },
                description="Dry-run simulation of yearly carry-forward rules without altering database balances."
            ),
            build_request(
                "Execute Yearly Leave Carry Forward",
                "POST",
                "{{base_url}}/leave-allocations/carry-forward/execute",
                ["leave-allocations", "carry-forward", "execute"],
                body_json={
                    "business_id": 1,
                    "source_year": 2025,
                    "target_year": 2026,
                    "leave_type_id": "{{leave_type_id}}"
                },
                description="Execute batch carry forward from source year to target year enforcing max carry limits."
            ),
            build_request(
                "Get Leave Carry Forward Logs",
                "GET",
                "{{base_url}}/leave-allocations/carry-forward/logs?skip=0&limit=100&business_id={{business_id}}",
                ["leave-allocations", "carry-forward", "logs"],
                {"skip": "0", "limit": "100", "business_id": "{{business_id}}"},
                description="Audit logs of executed yearly carry-forward batches."
            ),
            build_request(
                "List Leave Encashments",
                "GET",
                "{{base_url}}/leave-encashments?skip=0&limit=100&business_id={{business_id}}&year=2025",
                ["leave-encashments"],
                {"skip": "0", "limit": "100", "business_id": "{{business_id}}", "year": "2025"},
                description="List employee earned leave encashment requests pursuant to BLA 2006 Section 117."
            ),
            build_request(
                "Create Leave Encashment Application",
                "POST",
                "{{base_url}}/leave-encashments",
                ["leave-encashments"],
                body_json={
                    "business_id": 1,
                    "employee_id": "{{employee_id}}",
                    "leave_type_id": "{{leave_type_id}}",
                    "year": 2025,
                    "days_to_encash": 10.0,
                    "note": "Annual earned leave encashment application"
                },
                variable_to_set="encashment_id",
                description="Apply for leave encashment payout. Validates earned leave balance."
            ),
            build_request(
                "Get Leave Encashment Details",
                "GET",
                "{{base_url}}/leave-encashments/{{encashment_id}}",
                ["leave-encashments", "{{encashment_id}}"],
                description="Get detailed leave encashment record with computed amount."
            ),
            build_request(
                "Review Leave Encashment (Approve/Reject)",
                "POST",
                "{{base_url}}/leave-encashments/{{encashment_id}}/review",
                ["leave-encashments", "{{encashment_id}}", "review"],
                body_json={
                    "status": "approved",
                    "review_note": "Approved by Head of HR"
                },
                description="Approve or reject leave encashment."
            ),
            build_request(
                "Disburse Leave Encashment Payment",
                "POST",
                "{{base_url}}/leave-encashments/{{encashment_id}}/disburse",
                ["leave-encashments", "{{encashment_id}}", "disburse"],
                body_json={
                    "payment_method": "bank_transfer",
                    "disbursement_reference": "EFT-ENCASH-2025-001",
                    "disbursement_note": "Disbursed along with month-end payroll"
                },
                description="Disburse approved encashment amount."
            ),
            build_request(
                "Delete Leave Encashment",
                "DELETE",
                "{{base_url}}/leave-encashments/{{encashment_id}}",
                ["leave-encashments", "{{encashment_id}}"],
                description="Delete pending leave encashment application."
            )
        ]

        for item in new_leave_items:
            if item["name"] not in existing_names:
                leave_folder["item"].append(item)

    # 3. Update Appointment Letters folder with Convert to Employee
    appt_folder = next((f for f in hr_folders if f.get("name") == "Appointment Letters"), None)
    if appt_folder:
        existing_names = [x.get("name") for x in appt_folder.get("item", [])]
        convert_item = build_request(
            "Convert Appointment Letter to Active Employee",
            "POST",
            "{{base_url}}/appointment-letters/{{appointment_id}}/convert-to-employee",
            ["appointment-letters", "{{appointment_id}}", "convert-to-employee"],
            description="Onboard hired candidate: converts accepted appointment letter directly into active Employee record."
        )
        if convert_item["name"] not in existing_names:
            appt_folder["item"].append(convert_item)

    # 4. Add Offer Letters Folder
    if not any(f.get("name") == "Offer Letters" for f in hr_folders):
        offer_folder = {
            "name": "Offer Letters",
            "item": [
                build_request(
                    "List Offer Letters",
                    "GET",
                    "{{base_url}}/offer-letters?skip=0&limit=100&business_id={{business_id}}",
                    ["offer-letters"],
                    {"skip": "0", "limit": "100", "business_id": "{{business_id}}"},
                    description="List candidate job offer letters with status filter."
                ),
                build_request(
                    "Create Offer Letter",
                    "POST",
                    "{{base_url}}/offer-letters",
                    ["offer-letters"],
                    body_json={
                        "business_id": 1,
                        "candidate_name": "Tariqul Islam",
                        "candidate_email": "tariqul.islam@example.com",
                        "candidate_phone": "+8801711223344",
                        "job_title_id": "{{job_title_id}}",
                        "department_id": "{{department_id}}",
                        "offered_joining_date": "2026-11-01",
                        "offered_basic_salary": 45000.0,
                        "offered_gross_salary": 75000.0,
                        "allowance_details": "House Rent: 22,500; Medical: 4,500; Conveyance: 3,000",
                        "issue_date": "2026-10-23",
                        "valid_until": "2026-10-30"
                    },
                    variable_to_set="offer_letter_id",
                    description="Issue formal job offer letter."
                ),
                build_request(
                    "Get Offer Letter",
                    "GET",
                    "{{base_url}}/offer-letters/{{offer_letter_id}}",
                    ["offer-letters", "{{offer_letter_id}}"],
                    description="Get offer letter details."
                ),
                build_request(
                    "Update Offer Letter",
                    "PUT",
                    "{{base_url}}/offer-letters/{{offer_letter_id}}",
                    ["offer-letters", "{{offer_letter_id}}"],
                    body_json={
                        "status": "accepted",
                        "offered_gross_salary": 78000.0
                    },
                    description="Update offer terms or candidate response status (draft, sent, accepted, rejected, expired)."
                ),
                build_request(
                    "Delete Offer Letter",
                    "DELETE",
                    "{{base_url}}/offer-letters/{{offer_letter_id}}",
                    ["offer-letters", "{{offer_letter_id}}"],
                    description="Delete draft offer letter."
                )
            ]
        }
        # Insert after Appointment Letters or near letters
        hr_folders.append(offer_folder)

    # 5. Add Experience Letters Folder
    if not any(f.get("name") == "Experience Letters" for f in hr_folders):
        exp_folder = {
            "name": "Experience Letters",
            "item": [
                build_request(
                    "List Experience Letters",
                    "GET",
                    "{{base_url}}/experience-letters?skip=0&limit=100&business_id={{business_id}}",
                    ["experience-letters"],
                    {"skip": "0", "limit": "100", "business_id": "{{business_id}}"},
                    description="List service experience certificate letters."
                ),
                build_request(
                    "Create Experience Letter",
                    "POST",
                    "{{base_url}}/experience-letters",
                    ["experience-letters"],
                    body_json={
                        "business_id": 1,
                        "employee_id": "{{employee_id}}",
                        "issue_date": "2026-10-23",
                        "conduct_evaluation": "excellent",
                        "roles_summary": "Served diligently as Lead Backend Architect, responsible for high-availability microservices.",
                        "reason_for_leaving": "Career advancement and higher studies",
                        "authorized_signatory_name": "Amina Rahman",
                        "authorized_signatory_title": "Chief Human Resources Officer"
                    },
                    variable_to_set="experience_letter_id",
                    description="Generate formal employee experience certificate."
                ),
                build_request(
                    "Get Experience Letter",
                    "GET",
                    "{{base_url}}/experience-letters/{{experience_letter_id}}",
                    ["experience-letters", "{{experience_letter_id}}"],
                    description="Retrieve experience letter."
                ),
                build_request(
                    "Update Experience Letter",
                    "PUT",
                    "{{base_url}}/experience-letters/{{experience_letter_id}}",
                    ["experience-letters", "{{experience_letter_id}}"],
                    body_json={
                        "conduct_evaluation": "exemplary"
                    },
                    description="Update experience letter text or status."
                ),
                build_request(
                    "Delete Experience Letter",
                    "DELETE",
                    "{{base_url}}/experience-letters/{{experience_letter_id}}",
                    ["experience-letters", "{{experience_letter_id}}"],
                    description="Delete experience letter record."
                )
            ]
        }
        hr_folders.append(exp_folder)

    # 6. Add Roster Management Folder
    if not any(f.get("name") == "Roster Management" for f in hr_folders):
        roster_folder = {
            "name": "Roster Management",
            "item": [
                build_request(
                    "List Shifts",
                    "GET",
                    "{{base_url}}/roster/shifts?skip=0&limit=100&business_id={{business_id}}",
                    ["roster", "shifts"],
                    {"skip": "0", "limit": "100", "business_id": "{{business_id}}"},
                    description="List all master shifts (Morning, Evening, Night, General)."
                ),
                build_request(
                    "Create Shift",
                    "POST",
                    "{{base_url}}/roster/shifts",
                    ["roster", "shifts"],
                    body_json={
                        "business_id": 1,
                        "name": "Morning Shift (Hospital)",
                        "code": "MS-01",
                        "start_time": "08:00:00",
                        "end_time": "16:00:00",
                        "is_night_shift": False,
                        "color_code": "#10B981"
                    },
                    variable_to_set="shift_id",
                    description="Create a work shift."
                ),
                build_request(
                    "Update Shift",
                    "PUT",
                    "{{base_url}}/roster/shifts/{{shift_id}}",
                    ["roster", "shifts", "{{shift_id}}"],
                    body_json={
                        "color_code": "#059669"
                    },
                    description="Update shift timings or attributes."
                ),
                build_request(
                    "Delete Shift",
                    "DELETE",
                    "{{base_url}}/roster/shifts/{{shift_id}}",
                    ["roster", "shifts", "{{shift_id}}"],
                    description="Delete shift."
                ),
                build_request(
                    "List Department Roster Status",
                    "GET",
                    "{{base_url}}/roster/departments?business_id={{business_id}}",
                    ["roster", "departments"],
                    {"business_id": "{{business_id}}"},
                    description="List departments indicating whether roster scheduling is enabled."
                ),
                build_request(
                    "Toggle Department Roster Requirement",
                    "PATCH",
                    "{{base_url}}/roster/departments/{{department_id}}/toggle",
                    ["roster", "departments", "{{department_id}}", "toggle"],
                    description="Toggle roster scheduling requirement for a department."
                ),
                build_request(
                    "List Monthly Rosters",
                    "GET",
                    "{{base_url}}/roster/monthly-rosters?business_id={{business_id}}&year=2026&month=10",
                    ["roster", "monthly-rosters"],
                    {"business_id": "{{business_id}}", "year": "2026", "month": "10"},
                    description="List monthly department roster header records."
                ),
                build_request(
                    "Get Monthly Roster Matrix",
                    "GET",
                    "{{base_url}}/roster/monthly-rosters/matrix?business_id={{business_id}}&department_id={{department_id}}&year=2026&month=10",
                    ["roster", "monthly-rosters", "matrix"],
                    {"business_id": "{{business_id}}", "department_id": "{{department_id}}", "year": "2026", "month": "10"},
                    description="Fetch employee-by-day interactive matrix grid for the entire month."
                ),
                build_request(
                    "Save Monthly Roster Matrix",
                    "PUT",
                    "{{base_url}}/roster/monthly-rosters/matrix",
                    ["roster", "monthly-rosters", "matrix"],
                    body_json={
                        "business_id": 1,
                        "department_id": "{{department_id}}",
                        "year": 2026,
                        "month": 10,
                        "assignments": [
                            {
                                "employee_id": "{{employee_id}}",
                                "date": "2026-10-01",
                                "shift_id": "{{shift_id}}"
                            }
                        ]
                    },
                    description="Batch save shift allocations across the monthly calendar."
                ),
                build_request(
                    "Submit Monthly Roster for Approval",
                    "POST",
                    "{{base_url}}/roster/monthly-rosters/{{roster_id}}/submit",
                    ["roster", "monthly-rosters", "{{roster_id}}", "submit"],
                    description="Submit draft monthly roster to department head."
                ),
                build_request(
                    "Review Monthly Roster (Approve/Reject)",
                    "POST",
                    "{{base_url}}/roster/monthly-rosters/{{roster_id}}/review",
                    ["roster", "monthly-rosters", "{{roster_id}}", "review"],
                    body_json={
                        "status": "approved",
                        "review_note": "Reviewed and approved for October operations."
                    },
                    description="Approve or reject submitted department monthly roster."
                ),
                build_request(
                    "List Duty Assignments",
                    "GET",
                    "{{base_url}}/roster/duty-assignments?business_id={{business_id}}&date_from=2026-10-01&date_to=2026-10-31",
                    ["roster", "duty-assignments"],
                    {"business_id": "{{business_id}}", "date_from": "2026-10-01", "date_to": "2026-10-31"},
                    description="Query daily shift assignments by employee or date range."
                ),
                build_request(
                    "List Duty Assign Batches",
                    "GET",
                    "{{base_url}}/roster/duty-assign-batches?business_id={{business_id}}",
                    ["roster", "duty-assign-batches"],
                    {"business_id": "{{business_id}}"},
                    description="List multi-employee duty assignment batches."
                ),
                build_request(
                    "Create Duty Assign Batch",
                    "POST",
                    "{{base_url}}/roster/duty-assign-batches",
                    ["roster", "duty-assign-batches"],
                    body_json={
                        "business_id": 1,
                        "title": "Emergency Night Rotation - Oct 2026",
                        "date_from": "2026-10-15",
                        "date_to": "2026-10-21",
                        "shift_id": "{{shift_id}}",
                        "employee_ids": ["{{employee_id}}"]
                    },
                    variable_to_set="batch_id",
                    description="Create a bulk duty assignment batch."
                ),
                build_request(
                    "Review Duty Assign Batch",
                    "POST",
                    "{{base_url}}/roster/duty-assign-batches/{{batch_id}}/review",
                    ["roster", "duty-assign-batches", "{{batch_id}}", "review"],
                    body_json={
                        "status": "approved",
                        "review_note": "Batch approved"
                    },
                    description="Approve or reject duty assign batch."
                ),
                build_request(
                    "List Roster Change Requests",
                    "GET",
                    "{{base_url}}/roster/change-requests?business_id={{business_id}}",
                    ["roster", "change-requests"],
                    {"business_id": "{{business_id}}"},
                    description="List employee individual shift change requests."
                ),
                build_request(
                    "Create Roster Change Request",
                    "POST",
                    "{{base_url}}/roster/change-requests",
                    ["roster", "change-requests"],
                    body_json={
                        "business_id": 1,
                        "employee_id": "{{employee_id}}",
                        "date": "2026-10-20",
                        "target_shift_id": "{{shift_id}}",
                        "reason": "Personal medical appointment in the morning"
                    },
                    variable_to_set="change_request_id",
                    description="Submit a shift change request."
                ),
                build_request(
                    "Review Roster Change Request",
                    "POST",
                    "{{base_url}}/roster/change-requests/{{change_request_id}}/review",
                    ["roster", "change-requests", "{{change_request_id}}", "review"],
                    body_json={
                        "status": "approved",
                        "review_note": "Approved by supervisor"
                    },
                    description="Approve or reject a shift change request."
                ),
                build_request(
                    "List Roster Exchange Requests",
                    "GET",
                    "{{base_url}}/roster/exchange-requests?business_id={{business_id}}",
                    ["roster", "exchange-requests"],
                    {"business_id": "{{business_id}}"},
                    description="List peer-to-peer shift swap requests."
                ),
                build_request(
                    "Create Roster Exchange Request",
                    "POST",
                    "{{base_url}}/roster/exchange-requests",
                    ["roster", "exchange-requests"],
                    body_json={
                        "business_id": 1,
                        "requester_id": "{{employee_id}}",
                        "target_employee_id": "00000000-0000-0000-0000-000000000002",
                        "requester_date": "2026-10-22",
                        "target_date": "2026-10-23",
                        "reason": "Exchanging night shift for weekend coverage"
                    },
                    variable_to_set="exchange_request_id",
                    description="Initiate mutual peer shift exchange."
                ),
                build_request(
                    "Peer Review Exchange Request",
                    "POST",
                    "{{base_url}}/roster/exchange-requests/{{exchange_request_id}}/peer-review",
                    ["roster", "exchange-requests", "{{exchange_request_id}}", "peer-review"],
                    body_json={
                        "status": "accepted",
                        "note": "Agreed to swap shifts."
                    },
                    description="Target colleague accepts or rejects peer shift swap."
                ),
                build_request(
                    "Manager Review Exchange Request",
                    "POST",
                    "{{base_url}}/roster/exchange-requests/{{exchange_request_id}}/manager-review",
                    ["roster", "exchange-requests", "{{exchange_request_id}}", "manager-review"],
                    body_json={
                        "status": "approved",
                        "note": "Final manager authorization for shift exchange."
                    },
                    description="Final managerial sign-off applying swap to duty assignments."
                )
            ]
        }
        hr_folders.append(roster_folder)

    # 7. Add Collection Variables
    existing_vars = {v["key"] for v in data.get("variable", [])}
    new_vars = [
        {"key": "branch_id", "value": "", "type": "string"},
        {"key": "salary_grade_id", "value": "", "type": "string"},
        {"key": "offer_letter_id", "value": "", "type": "string"},
        {"key": "experience_letter_id", "value": "", "type": "string"},
        {"key": "encashment_id", "value": "", "type": "string"},
        {"key": "shift_id", "value": "", "type": "string"},
        {"key": "roster_id", "value": "", "type": "string"},
        {"key": "batch_id", "value": "", "type": "string"},
        {"key": "change_request_id", "value": "", "type": "string"},
        {"key": "exchange_request_id", "value": "", "type": "string"},
    ]
    for v in new_vars:
        if v["key"] not in existing_vars:
            data.setdefault("variable", []).append(v)

    # Save JSON
    with open(COLLECTION_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print(f"Updated {COLLECTION_FILE} successfully.")

if __name__ == "__main__":
    update_collection()
