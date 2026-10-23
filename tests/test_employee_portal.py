import uuid
import pytest
from datetime import date, datetime
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.core.identity.models import User
from app.core.security import create_access_token
from app.modules.hr_payroll.employees.models import Employee
from app.modules.hr_payroll.portal.models import (
    CompanyPolicy,
    EmployeeLoan,
    ExpenseClaim,
    HRTicket,
    OfficialLetterRequest,
    ProfileUpdateRequest,
)


@pytest.fixture
def auth_client():
    client = TestClient(app)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.is_superuser == True).first()
        token = create_access_token(data={"sub": str(user.id)})
        client.headers.update({"Authorization": f"Bearer {token}"})
        yield client
    finally:
        db.close()


def test_portal_me_and_dashboard(auth_client):
    # Test GET /portal/me
    res = auth_client.get("/portal/me")
    assert res.status_code == 200, res.text
    data = res.json()
    assert "employee_id" in data
    assert "first_name" in data
    assert "work_email" in data

    # Test GET /portal/dashboard
    res = auth_client.get("/portal/dashboard")
    assert res.status_code == 200, res.text
    dash = res.json()
    assert "profile" in dash
    assert "attendance_summary" in dash
    assert "leave_balances" in dash
    assert "unread_notices_count" in dash


def test_profile_update_request_flow(auth_client):
    # Submit request with unique phone
    unique_phone = f"+88019{uuid.uuid4().int % 100000000:08d}"
    payload = {
        "requested_changes": {
            "phone": unique_phone,
            "present_address": "House 12, Road 4, Banani, Dhaka",
        },
        "reason": "Relocated to new apartment",
    }
    res = auth_client.post("/portal/profile-update-requests", json=payload)
    assert res.status_code == 200, res.text
    req_data = res.json()
    req_id = req_data["id"]
    assert req_data["status"] == "pending"

    # Query list
    res = auth_client.get("/portal/profile-update-requests")
    assert res.status_code == 200
    assert any(r["id"] == req_id for r in res.json())

    # Admin Review (Approve)
    review_res = auth_client.patch(
        f"/portal/admin/profile-update-requests/{req_id}/review",
        json={"status": "approved", "review_notes": "Valid utility bill submitted"},
    )
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "approved"


def test_attendance_correction_flow(auth_client):
    payload = {
        "attendance_date": str(date.today()),
        "request_type": "late_excuse",
        "requested_time_in": "09:45",
        "requested_time_out": "18:30",
        "reason": "Severe metro rail delay",
    }
    res = auth_client.post("/portal/attendance/correction-requests", json=payload)
    assert res.status_code == 200, res.text
    corr_id = res.json()["id"]

    # Review
    review_res = auth_client.patch(
        f"/portal/admin/attendance-corrections/{corr_id}/review",
        json={"status": "approved", "review_notes": "Metro delay verified via news"},
    )
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "approved"


def test_loan_and_expense_claim_flow(auth_client):
    # 1. Loan
    loan_payload = {
        "loan_type": "personal_loan",
        "principal_amount": 50000.0,
        "total_installments": 5,
        "reason": "Home renovation advance",
    }
    loan_res = auth_client.post("/portal/loans", json=loan_payload)
    assert loan_res.status_code == 200, loan_res.text
    loan_id = loan_res.json()["id"]
    assert loan_res.json()["monthly_installment_amount"] == 10000.0

    # Approve and disburse loan
    appr = auth_client.patch(
        f"/portal/admin/loans/{loan_id}/review",
        json={"status": "approved", "notes": "Approved by HR Director"},
    )
    assert appr.status_code == 200

    disb = auth_client.post(
        f"/portal/admin/loans/{loan_id}/disburse",
        json={"payment_reference": "EFT-8849201"},
    )
    assert disb.status_code == 200
    assert disb.json()["status"] == "disbursed"

    # 2. Expense Claim
    claim_payload = {
        "title": "Client Lunch Meeting",
        "claim_date": str(date.today()),
        "items": [
            {
                "expense_date": str(date.today()),
                "category": "meals",
                "amount": 3500.0,
                "description": "Lunch with prospective client at Gulshan",
            }
        ],
    }
    exp_res = auth_client.post("/portal/expense-claims", json=claim_payload)
    assert exp_res.status_code == 200, exp_res.text
    claim_id = exp_res.json()["id"]

    # Approve & Reimburse
    auth_client.patch(
        f"/portal/admin/expense-claims/{claim_id}/review",
        json={"status": "approved", "review_notes": "Official client project"},
    )
    reimb = auth_client.post(
        f"/portal/admin/expense-claims/{claim_id}/reimburse",
        json={"payment_reference": "BEFTN-293847"},
    )
    assert reimb.status_code == 200
    assert reimb.json()["status"] == "reimbursed"


def test_official_letters_and_policies(auth_client):
    # 1. Official Letter Request
    req_payload = {
        "letter_type": "noc_travel",
        "purpose": "Attending regional developer summit in Bangkok",
        "addressed_to": "Royal Thai Embassy, Dhaka",
        "travel_country": "Thailand",
        "travel_start_date": "2026-11-01",
        "travel_end_date": "2026-11-08",
    }
    let_res = auth_client.post("/portal/letter-requests", json=req_payload)
    assert let_res.status_code == 200, let_res.text
    req_id = let_res.json()["id"]

    # Review
    rev = auth_client.patch(
        f"/portal/admin/letter-requests/{req_id}/review",
        json={
            "status": "generated",
            "generated_file_url": "https://storage.example.com/letters/noc_travel_123.pdf",
            "review_notes": "Approved and signed by Managing Director",
        },
    )
    assert rev.status_code == 200
    assert rev.json()["status"] == "generated"

    # 2. Policies & Acknowledgement
    pol_res = auth_client.get("/portal/policies")
    assert pol_res.status_code == 200
    policies = pol_res.json()
    assert len(policies) > 0

    first_policy_id = policies[0]["id"]
    ack_res = auth_client.post(f"/portal/policies/{first_policy_id}/acknowledge")
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "acknowledged"


def test_helpdesk_ticketing_and_tax_card(auth_client):
    # 1. Ticket & Thread
    tkt_payload = {
        "category": "it",
        "priority": "medium",
        "subject": "Need secondary monitor for workstation",
        "description": "Requesting 27-inch monitor for frontend UI design work.",
    }
    tkt_res = auth_client.post("/portal/tickets", json=tkt_payload)
    assert tkt_res.status_code == 200, tkt_res.text
    tkt_id = tkt_res.json()["id"]

    # Post comment
    cmt_res = auth_client.post(
        f"/portal/tickets/{tkt_id}/comments",
        json={"message": "Model DELL-U2723QE requested"},
    )
    assert cmt_res.status_code == 200

    # Close ticket
    close_res = auth_client.patch(
        f"/portal/tickets/{tkt_id}/status",
        json={"status": "resolved", "resolution_notes": "Monitor dispatched from IT storage."},
    )
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "resolved"

    # 2. Tax Card
    tc_res = auth_client.get("/portal/tax-card?fiscal_year=2024-2025")
    assert tc_res.status_code == 200
    tc = tc_res.json()
    assert "total_gross_income" in tc
    assert "taxable_income" in tc
    assert "total_tax_withheld" in tc
