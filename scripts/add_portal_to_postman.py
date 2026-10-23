import json
import uuid

COLLECTION_FILE = "Business Profile API.postman_collection.json"

portal_folder = {
    "name": "Employee Self-Service (ESS) Portal",
    "item": [
        {
            "name": "Get Current Linked Employee Profile",
            "request": {
                "method": "GET",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "url": {
                    "raw": "{{base_url}}/portal/me",
                    "host": ["{{base_url}}"],
                    "path": ["portal", "me"]
                },
                "description": "Fetch the currently authenticated user's linked employee record, designation, department, and company scope."
            },
            "response": []
        },
        {
            "name": "Get Portal Telemetry & Leave Balances",
            "request": {
                "method": "GET",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "url": {
                    "raw": "{{base_url}}/portal/dashboard",
                    "host": ["{{base_url}}"],
                    "path": ["portal", "dashboard"]
                },
                "description": "Dashboard overview including today's attendance punch status, leave balance dials, upcoming holidays, shift roster, and recent notices."
            },
            "response": []
        },
        {
            "name": "Digital Web Punch Clock (Check-in/Out)",
            "request": {
                "method": "POST",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "body": {
                    "mode": "raw",
                    "raw": json.dumps({"action": "check_in", "note": "Arrived at office"}, indent=4)
                },
                "url": {
                    "raw": "{{base_url}}/portal/attendance/punch",
                    "host": ["{{base_url}}"],
                    "path": ["portal", "attendance", "punch"]
                },
                "description": "Performs instant biometric/web attendance punch with server timestamp."
            },
            "response": []
        },
        {
            "name": "Submit Profile Update Request",
            "request": {
                "method": "POST",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "body": {
                    "mode": "raw",
                    "raw": json.dumps({
                        "field_name": "emergency_contact_phone",
                        "new_value": "+8801700998877",
                        "supporting_document_url": "https://docs.example.com/nid_update.pdf",
                        "reason": "Updated emergency contact number"
                    }, indent=4)
                },
                "url": {
                    "raw": "{{base_url}}/portal/profile/update-requests",
                    "host": ["{{base_url}}"],
                    "path": ["portal", "profile", "update-requests"]
                },
                "description": "Employee request to change sensitive personal or banking details with audit approval queue."
            },
            "response": []
        },
        {
            "name": "List Profile Update Requests",
            "request": {
                "method": "GET",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "url": {
                    "raw": "{{base_url}}/portal/profile/update-requests",
                    "host": ["{{base_url}}"],
                    "path": ["portal", "profile", "update-requests"]
                },
                "description": "View tracking history of profile change requests and HR review statuses."
            },
            "response": []
        },
        {
            "name": "Apply for Attendance Regularisation",
            "request": {
                "method": "POST",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "body": {
                    "mode": "raw",
                    "raw": json.dumps({
                        "attendance_date": "2026-10-22",
                        "requested_check_in": "09:00:00",
                        "requested_check_out": "18:00:00",
                        "reason": "Device scanner malfunction at main lobby"
                    }, indent=4)
                },
                "url": {
                    "raw": "{{base_url}}/portal/attendance-corrections",
                    "host": ["{{base_url}}"],
                    "path": ["portal", "attendance-corrections"]
                },
                "description": "Request regularisation for missed punch or system downtime with line manager review."
            },
            "response": []
        },
        {
            "name": "List Attendance Corrections",
            "request": {
                "method": "GET",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "url": {
                    "raw": "{{base_url}}/portal/attendance-corrections",
                    "host": ["{{base_url}}"],
                    "path": ["portal", "attendance-corrections"]
                },
                "description": "List my attendance correction requests."
            },
            "response": []
        },
        {
            "name": "Apply for Employee Loan / Advance",
            "request": {
                "method": "POST",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "body": {
                    "mode": "raw",
                    "raw": json.dumps({
                        "loan_type": "salary_advance",
                        "principal_amount": 25000,
                        "monthly_installment_amount": 5000,
                        "total_installments": 5,
                        "reason": "Festival advance and travel expenses"
                    }, indent=4)
                },
                "url": {
                    "raw": "{{base_url}}/portal/loans",
                    "host": ["{{base_url}}"],
                    "path": ["portal", "loans"]
                },
                "description": "Submit request for salary advance or corporate loan with installment deduction schedule."
            },
            "response": []
        },
        {
            "name": "List My Loans & Advances",
            "request": {
                "method": "GET",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "url": {
                    "raw": "{{base_url}}/portal/loans",
                    "host": ["{{base_url}}"],
                    "path": ["portal", "loans"]
                },
                "description": "View outstanding loan balances, monthly deductions, and approval status."
            },
            "response": []
        },
        {
            "name": "Submit Expense Reimbursement Claim",
            "request": {
                "method": "POST",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "body": {
                    "mode": "raw",
                    "raw": json.dumps({
                        "title": "Client Site Inspection & Client Dinner",
                        "claim_date": "2026-10-22",
                        "items": [
                            {
                                "expense_date": "2026-10-22",
                                "category": "travel",
                                "amount": 1500,
                                "description": "Ride sharing to client headquarters",
                                "receipt_url": "https://receipts.example.com/uber_oct22.pdf"
                            },
                            {
                                "expense_date": "2026-10-22",
                                "category": "meals",
                                "amount": 2800,
                                "description": "Business lunch with client stakeholders",
                                "receipt_url": "https://receipts.example.com/lunch_oct22.pdf"
                            }
                        ]
                    }, indent=4)
                },
                "url": {
                    "raw": "{{base_url}}/portal/expense-claims",
                    "host": ["{{base_url}}"],
                    "path": ["portal", "expense-claims"]
                },
                "description": "Submit itemized corporate business expense claims with attached receipts."
            },
            "response": []
        },
        {
            "name": "List My Expense Claims",
            "request": {
                "method": "GET",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "url": {
                    "raw": "{{base_url}}/portal/expense-claims",
                    "host": ["{{base_url}}"],
                    "path": ["portal", "expense-claims"]
                },
                "description": "List my submitted expense claims and reimbursement tracking."
            },
            "response": []
        },
        {
            "name": "Request Official Letter / NOC",
            "request": {
                "method": "POST",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "body": {
                    "mode": "raw",
                    "raw": json.dumps({
                        "letter_type": "noc_visa",
                        "purpose": "Tourist visa application for personal holiday",
                        "addressed_to": "Visa Officer, Embassy of Japan",
                        "travel_country": "Japan",
                        "travel_start_date": "2026-12-15",
                        "travel_end_date": "2026-12-25"
                    }, indent=4)
                },
                "url": {
                    "raw": "{{base_url}}/portal/letter-requests",
                    "host": ["{{base_url}}"],
                    "path": ["portal", "letter-requests"]
                },
                "description": "Request official company documentation: Visa NOC, Travel NOC, Salary Certificate, or Experience Letter."
            },
            "response": []
        },
        {
            "name": "List Official Letter Requests",
            "request": {
                "method": "GET",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "url": {
                    "raw": "{{base_url}}/portal/letter-requests",
                    "host": ["{{base_url}}"],
                    "path": ["portal", "letter-requests"]
                },
                "description": "List official letter requests with download URLs once generated."
            },
            "response": []
        },
        {
            "name": "Browse Policies & Employee Handbook",
            "request": {
                "method": "GET",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "url": {
                    "raw": "{{base_url}}/portal/policies",
                    "host": ["{{base_url}}"],
                    "path": ["portal", "policies"]
                },
                "description": "Directory of company policies, code of conduct, statutory labor regulations (BLA 2006), and acknowledgement status."
            },
            "response": []
        },
        {
            "name": "Acknowledge / Sign Policy",
            "request": {
                "method": "POST",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "url": {
                    "raw": "{{base_url}}/portal/policies/{{sample_policy_id}}/acknowledge",
                    "host": ["{{base_url}}"],
                    "path": ["portal", "policies", "{{sample_policy_id}}", "acknowledge"]
                },
                "description": "Record digital signature and compliance sign-off for mandatory company policy."
            },
            "response": []
        },
        {
            "name": "Raise HR Support Ticket",
            "request": {
                "method": "POST",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "body": {
                    "mode": "raw",
                    "raw": json.dumps({
                        "category": "payroll",
                        "priority": "medium",
                        "subject": "Tax Withholding Clarification for October 2026",
                        "description": "Need breakdown on conveyance exemption applied under ITA 2023."
                    }, indent=4)
                },
                "url": {
                    "raw": "{{base_url}}/portal/tickets",
                    "host": ["{{base_url}}"],
                    "path": ["portal", "tickets"]
                },
                "description": "Raise support or grievance ticket to HR/Payroll team."
            },
            "response": []
        },
        {
            "name": "List My Support Tickets",
            "request": {
                "method": "GET",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "url": {
                    "raw": "{{base_url}}/portal/tickets",
                    "host": ["{{base_url}}"],
                    "path": ["portal", "tickets"]
                },
                "description": "View employee helpdesk tickets and status."
            },
            "response": []
        },
        {
            "name": "Get Support Ticket Thread Details",
            "request": {
                "method": "GET",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "url": {
                    "raw": "{{base_url}}/portal/tickets/{{sample_ticket_id}}",
                    "host": ["{{base_url}}"],
                    "path": ["portal", "tickets", "{{sample_ticket_id}}"]
                },
                "description": "Fetch complete ticket conversation history and comments."
            },
            "response": []
        },
        {
            "name": "Reply to Support Ticket",
            "request": {
                "method": "POST",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "body": {
                    "mode": "raw",
                    "raw": json.dumps({
                        "message": "Thank you for the clarification. The explanation aligns with the tax slab."
                    }, indent=4)
                },
                "url": {
                    "raw": "{{base_url}}/portal/tickets/{{sample_ticket_id}}/comments",
                    "host": ["{{base_url}}"],
                    "path": ["portal", "tickets", "{{sample_ticket_id}}", "comments"]
                },
                "description": "Add reply comment to support ticket discussion."
            },
            "response": []
        },
        {
            "name": "Get Payslip Archive",
            "request": {
                "method": "GET",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "url": {
                    "raw": "{{base_url}}/portal/payslips",
                    "host": ["{{base_url}}"],
                    "path": ["portal", "payslips"]
                },
                "description": "Fetch all monthly payslip records with breakdown of allowances and deductions."
            },
            "response": []
        },
        {
            "name": "Get Annual Tax Deduction Card (ITA 2023)",
            "request": {
                "method": "GET",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "url": {
                    "raw": "{{base_url}}/portal/tax-card",
                    "host": ["{{base_url}}"],
                    "path": ["portal", "tax-card"],
                    "query": [{"key": "fiscal_year", "value": "2025-2026"}]
                },
                "description": "Download/view complete Bangladesh Income Tax Act 2023 annual tax certificate summary and month-by-month deduction ledger."
            },
            "response": []
        }
    ]
}

def main():
    with open(COLLECTION_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Find "HR & Payroll" folder
    hr_folder = None
    for item in data.get("item", []):
        if item.get("name") == "HR & Payroll":
            hr_folder = item
            break

    if not hr_folder:
        print("HR & Payroll folder not found!")
        return

    # Check if Employee Self-Service (ESS) Portal already exists
    existing = [x for x in hr_folder.get("item", []) if x.get("name") == portal_folder["name"]]
    if existing:
        print("Employee Self-Service (ESS) Portal folder already exists, replacing with updated version...")
        hr_folder["item"] = [x for x in hr_folder.get("item", []) if x.get("name") != portal_folder["name"]]

    hr_folder["item"].append(portal_folder)

    with open(COLLECTION_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)
    print("Added Employee Self-Service (ESS) Portal folder to Postman collection successfully.")

if __name__ == "__main__":
    main()
