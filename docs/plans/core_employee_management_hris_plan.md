# Implementation Plan: Core Employee Management (HRIS) — Bangladesh Group of Companies Perspective

## Executive Summary
For medium to large **Groups of Companies (GoC)** and conglomerates in Bangladesh (e.g., multi-subsidiary corporations, manufacturing & RMG plants, FMCG, banking, and commercial enterprises), employee data cannot fit into a single simple form. 

This plan presents the architecture to structure **Core Employee Management (HRIS)** into specialized, decoupled modules and tabs:
1. **Employee Basic Information** (Identity, demographics, NID/TIN, corporate placement).
2. **Employee Detail Setup** (Service terms, present/permanent address, education, past experience, banking & MFS payroll disbursement).
3. **Emergency Contact & Nominee Setup** (Statutory compliance with Bangladesh Labour Act 2006 / Rules 2015 Form 33 for PF, Gratuity, and Group Insurance).
4. **ID Card & Access Control Generation** (Printable CR80 Smart ID cards with QR/Barcode and Biometric/RFID integration).
5. **Organizational Chart (Org Chart)** (Interactive company-wide and departmental reporting hierarchy).

---

## 1. Bangladesh Group of Companies (GoC) Perspective

Large business houses in Bangladesh operate across multiple sister concerns (Strategic Business Units / SBUs), factories, depots, and corporate headquarters. Key architectural considerations include:

```
                            ┌──────────────────────────────────────┐
                            │      PARENT GROUP OF COMPANIES       │
                            └──────────────────┬───────────────────┘
                                               │
            ┌──────────────────────────────────┼──────────────────────────────────┐
            ▼                                  ▼                                  ▼
┌───────────────────────┐          ┌───────────────────────┐          ┌───────────────────────┐
│ SBU 1: Manufacturing  │          │    SBU 2: Consumer    │          │  SBU 3: IT & Services │
│ (Factory Plant/Depot) │          │ (Corporate HQ/Sales)  │          │    (Tech Campus)      │
├───────────────────────┤          ├───────────────────────┤          ├───────────────────────┤
│ • Worker/Staff Cadres │          │ • Management / Sales  │          │ • Corporate Staff     │
│ • BLA Minimum Wages   │          │ • Commission & Allow  │          │ • Project Allocation  │
│ • Biometric Turnstile │          │ • RFID Smart Badges   │          │ • Hybrid / Onsite     │
└───────────────────────┘          └───────────────────────┘          └───────────────────────┘
```

1. **Dual Name Convention**: English name (as in NID/Passport) + Bengali name (বাংলায় নাম) required by factory muster rolls and labor inspectorates.
2. **Statutory Nominee Requirements (BLA 2006 § 19, 20, 38 & Form 33)**: By law, each employee must designate legally binding nominees with share percentages for Provident Fund, Gratuity, Group Term Insurance, and terminal benefits.
3. **Dual Address System**: Present Address (বর্তমান ঠিকানা) vs Permanent Address (স্থায়ী ঠিকানা) with Police Station (থানা), District (জেলা), and Post Office (ডাকঘর) for background verification.
4. **Mobile Financial Services (MFS)**: Crucial in Bangladesh; salary disbursement often happens via **bKash, Nagad, or Rocket** for factory staff alongside traditional banking (BEFTN/NPSB/RTGS) for executives.
5. **Biometric & RFID Access**: Hardware synchronization (ZKTeco/Hikvision) using Biometric User ID and Proximity Card Number.

---

## 2. Detailed Attribute & Field Specification

### Tab 1: Employee Basic Information (Identity & Placement)
Primary identification and current organizational placement.

| Category | Field Name | Type | Bangladesh Legal / Business Context |
| :--- | :--- | :--- | :--- |
| **Identity** | `first_name`, `last_name` | String | Official English name matching NID / Educational Certificates |
| **Identity (Bangla)** | `bangla_name` (বাংলায় নাম) | String | Mandatory for factory compliance, service books & muster rolls |
| **Family Lineage** | `father_name`, `mother_name` | String | Statutory requirement under Bangladesh Labour Rules 2015 |
| **Family Lineage** | `spouse_name` | String | Optional (if married) |
| **Demographics** | `gender` | Enum | Male, Female, Other |
| **Demographics** | `date_of_birth` | Date | Statutory age verification (min 18 for adult worker) |
| **Demographics** | `blood_group` | Enum | A+, A-, B+, B-, O+, O-, AB+, AB- (Printed on corporate ID card) |
| **Demographics** | `religion` | Enum | Islam, Hinduism, Buddhism, Christianity, Other (determines Festival Bonus calendar: Eid vs Puja vs Christmas) |
| **Demographics** | `marital_status` | Enum | Single, Married, Divorced, Widowed |
| **Statutory IDs** | `national_id` (NID) | String | 10-digit Smart Card or 13/17-digit Legacy NID |
| **Statutory IDs** | `tin` (e-TIN) | String | 12-digit Tax Identification Number (mandatory for tax deduction) |
| **Statutory IDs** | `passport_no`, `passport_expiry` | String, Date | For foreign travel or expatriate work permits |
| **Corporate Placement**| `business_id` (Sister Concern) | Integer | SBU / Subsidiary Company within the Group |
| **Corporate Placement**| `employee_id` | String | Official Employee Code (e.g., `GOC-10492` or `ON-2026-001`) |
| **Corporate Placement**| `branch_id` (Branch / Plant) | UUID | Specific factory plant, regional depot, or HQ office |
| **Corporate Placement**| `department_id` | UUID | Assigned department |
| **Corporate Placement**| `job_title_id` | UUID | Functional designation |
| **Corporate Placement**| `grade_id` | UUID (Opt) | Salary Grade / Pay Band (as per Grade architecture) |
| **Corporate Placement**| `direct_manager_id` | UUID | Reports to (Supervisor for Org Chart) |
| **Corporate Placement**| `joining_date` | Date | Official date of joining the organization |
| **Corporate Placement**| `photo_url` | String | Formal headshot photograph for ID card and profile |

---

### Tab 2: Employee Detail Setup (Service, Address, Education, Banking)
Comprehensive HR master records.

| Category | Field Name | Type | Bangladesh Legal / Business Context |
| :--- | :--- | :--- | :--- |
| **Service Terms** | `employee_category` | Enum | `management` (Executive/Officer), `staff`, `worker` (শ্রমিক) |
| **Service Terms** | `employment_type` | Enum | `full_time`, `contractual`, `probationary`, `intern`, `deputation` |
| **Service Terms** | `probation_period_months` | Integer | Standard 3 to 6 months per BLA Section 4 |
| **Service Terms** | `confirmation_date` | Date | Date when employee was formally confirmed |
| **Service Terms** | `notice_period_days` | Integer | Standard 30/60/90/120 days based on management grade |
| **Service Terms** | `is_overtime_eligible` | Boolean | True for workers/staff under BLA Section 102/108 |
| **Present Address** | `present_address` | Text | House/Holding, Road/Village |
| **Present Address** | `present_thana` (থানা) | String | Police Station / Upazila |
| **Present Address** | `present_district` (জেলা) | String | District (e.g., Dhaka, Gazipur, Chattogram) |
| **Present Address** | `present_division` (বিভাগ) | String | Division (Dhaka, Chattogram, Rajshahi, Khulna, etc.) |
| **Present Address** | `present_post_code` | String | Postal Code |
| **Permanent Address** | `permanent_address` | Text | Village/Road (with "Same as Present" toggle) |
| **Permanent Address** | `permanent_thana`, `district`| String | Required for legal notices and police verification |
| **Disbursement** | `disbursement_method` | Enum | `bank_transfer`, `mfs_bkash`, `mfs_nagad`, `mfs_rocket`, `cash` |
| **Bank Account** | `bank_name`, `bank_branch` | String | Scheduled Bank in Bangladesh (e.g., Dutch-Bangla, BRAC, City) |
| **Bank Account** | `bank_account_no`, `title` | String | 13-16 digit account number and exact title |
| **Bank Account** | `bank_routing_number` | String | 9-digit electronic routing number for BEFTN / NPSB |
| **MFS Account** | `mfs_provider`, `mfs_number` | String | bKash / Nagad / Rocket 11-digit mobile number |
| **Education Record**| `qualifications` (JSON/Table)| List | Degree, Institution (DU, BUET, etc.), Passing Year, CGPA |
| **Experience Record**| `past_experience` (JSON/Table)| List | Previous company, Designation, Duration, Last salary |

---

### Tab 3: Emergency Contact & Nominee Setup
Legal compliance with Bangladesh Labour Act 2006 & Bangladesh Labour Rules 2015 Form 33.

| Component | Attribute | Type | Description |
| :--- | :--- | :--- | :--- |
| **Emergency Contact** | `emergency_contact_name` | String | Primary contact person's full name |
| **Emergency Contact** | `emergency_contact_relation`| String | Father, Mother, Spouse, Brother, Sister, Relative |
| **Emergency Contact** | `emergency_contact_phone` | String | Primary mobile phone |
| **Emergency Contact** | `emergency_contact_address`| Text | Residence address |
| **Statutory Nominee** | `nominee_name` | String | Nominee's full legal name (English & Bengali) |
| **Statutory Nominee** | `nominee_relation` | String | Relationship with employee (e.g., Spouse, Child, Parent) |
| **Statutory Nominee** | `nominee_nid_or_birth_cert`| String | Nominee's National ID or Birth Certificate number |
| **Statutory Nominee** | `nominee_dob` | Date | Nominee date of birth (determines if minor) |
| **Statutory Nominee** | `share_percentage` | Numeric | Share of terminal benefits ($\Sigma = 100\%$, e.g., 50% / 50%) |
| **Statutory Nominee** | `nominee_phone` | String | Nominee's mobile number |
| **Statutory Nominee** | `nominee_photo_url` | String | Passport-size photo of nominee |
| **Minor Guardian** | `guardian_name` | String | Guardian name if nominee is $< 18$ years old |
| **Minor Guardian** | `guardian_relation` | String | Guardian relationship with minor |
| **Minor Guardian** | `guardian_nid` & `phone` | String | Guardian NID & contact number |

---

### Tab 4: ID Card & Access Control Generation
Seamless physical badge production and biometric integration.

```
┌────────────────────────────────────────────────────────┐
│           FRONT SIDE (CR80 PVC Card)                   │
├────────────────────────────────────────────────────────┤
│  [ GROUP LOGO ]                  [ SBU / SISTER CONCERN]
│                                                        │
│                    ┌──────────┐                        │
│                    │  PHOTO   │                        │
│                    └──────────┘                        │
│                MD. TANVIR HASAN                        │
│           Senior Software Engineer                     │
│               IT & Automation                          │
│                                                        │
│  ID: GOC-10492                      Blood Group: B+    │
│  Valid Thru: 12/2028                Emergency: 017...  │
└────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────┐
│           BACK SIDE (CR80 PVC Card)                    │
├────────────────────────────────────────────────────────┤
│  If found, please return to:                           │
│  Onoda Group Tower, Gulshan-2, Dhaka-1212              │
│  Phone: +880 2 9876543 | www.onodagroup.com            │
│                                                        │
│                 ┌────────────────┐                     │
│                 │  QR / BARCODE  │                     │
│                 └────────────────┘                     │
│                [Authorized Signature]                  │
└────────────────────────────────────────────────────────┘
```

- **ID Card Features**:
  - Live interactive preview in browser.
  - Printable layout conforming to standard CR80 PVC dimensions ($85.60 \times 53.98\text{ mm}$).
  - Dynamic QR code encoding verified digital employee card link (`/verify/emp/GOC-10492`).
  - Batch PDF export for multiple selected employees (for factory onboarding batches).
- **Access Control & Biometric Sync**:
  - `biometric_device_user_id`: Numeric/string identifier configured in attendance machine (ZKTeco, Suprema, Hikvision).
  - `rfid_card_number`: 10-digit decimal or 8-character hex Mifare/EM proximity card badge number.
  - `access_zones`: Assigned physical doors/gates (e.g., "Main Gate Turnstile", "Server Room", "Factory Floor 2").
  - `access_status`: Active / Blocked / Revoked upon resignation.

---

### Tab 5: Organizational Chart (Org Chart)
Interactive, responsive organogram visualizing the corporate reporting lines:
- **Hierarchical Layout**: Group Chairman / Managing Director $\rightarrow$ C-Suite & SBU Heads $\rightarrow$ Department Heads $\rightarrow$ Team Leads $\rightarrow$ Officers / Staff.
- **Dynamic Filtering**:
  - Filter by Sister Concern / Business Unit.
  - Filter by Branch / Factory Plant.
  - Filter by Department.
- **Interactive Node Features**:
  - Card displays: Avatar, Name, Job Designation, Grade, Department, and Direct Reports count.
  - Collapsible branches (+ / - buttons to expand or collapse sub-trees).
  - Search & Center: Type any employee name to instantly highlight and pan the tree to their position.
  - Quick Slide-Over: Click any node to open the employee's detail drawer.
  - Export: Download the full chart as High-Resolution PNG or PDF.

---

## 3. Navigation & Screen Flow Structure

In the Frontend application, we will organize the Employee Management section into a clean multi-tab Hub:

```
/hr-payroll/employees
  ├── Header KPI Metrics (Total Staff, Confirmed, Probationary, Factory Workers, Management)
  ├── Search & Multi-Filter Toolbar (Search, SBU, Department, Designation, Branch, Status)
  ├── Main Navigation Tabs:
  │    ├── Tab 1: "Employee Directory" (List / Table / Grid with instant actions)
  │    ├── Tab 2: "ID Cards & Access" (Badge generator, RFID mapping, Batch Print)
  │    └── Tab 3: "Organizational Chart" (Interactive reporting tree)
  │
  └── Employee Detail / Create / Edit Modal & Page (/hr-payroll/employees/[id]):
       ├── Tab A: Basic Information (Demographics, NID/TIN, Placement)
       ├── Tab B: Detail Setup (Service, Addresses, Education, Banking/MFS)
       ├── Tab C: Emergency & Nominees (Emergency contacts & Form 33 Nominees)
       ├── Tab D: Compensation & Salary Structure (Basic, House Rent, Allowances)
       └── Tab E: ID Card Preview & Print
```

---

## 4. Proposed Database Schema Changes

### A. New Models
1. **`EmployeeNominee` Model** (`app/modules/hr_payroll/employees/models.py`):
   - Stores multiple nominees per employee with share percentage totaling 100%.
   - Fields: `employee_id`, `nominee_name`, `nominee_name_bangla`, `relation`, `nid_or_birth_cert`, `dob`, `share_percentage`, `phone`, `photo_url`, `is_minor`, `guardian_name`, `guardian_relation`, `guardian_nid`, `guardian_phone`.
2. **`EmployeeEducation` & `EmployeeExperience`**:
   - Structured sub-tables for academic degrees and past employment history.
3. **`EmployeeAccessControl`**:
   - Hardware integration fields: `biometric_user_id`, `rfid_card_number`, `device_group`, `is_synced`.

### B. Additions to `Employee` Model
- Add: `bangla_name`, `father_name`, `mother_name`, `spouse_name`, `religion`, `blood_group`.
- Add: `present_thana`, `present_district`, `present_division`, `present_post_code`.
- Add: `permanent_address`, `permanent_thana`, `permanent_district`, `permanent_division`, `permanent_post_code`.
- Add: `disbursement_method`, `bank_name`, `bank_branch`, `bank_account_no`, `bank_account_title`, `bank_routing_number`, `mfs_provider`, `mfs_number`.
- Add: `employee_category`, `probation_period_months`, `confirmation_date`, `notice_period_days`, `is_overtime_eligible`.
- Add: `grade_id` (optional FK to `salary_grades.id`).

---

## 5. Verification Plan

### Automated Backend Tests
- Pytest test cases in `tests/test_hr_payroll_employees.py`:
  - `test_employee_bangladesh_attributes_creation()`: Verify NID, TIN, Bangla name, father/mother name validation.
  - `test_nominee_creation_and_share_validation()`: Ensure nominee share percentages cannot exceed 100%.
  - `test_org_chart_reporting_hierarchy()`: Verify recursive supervisor-subordinate tree traversal with zero cycles.
  - `test_id_card_and_biometric_uniqueness()`: Verify unique constraint on RFID card number and biometric ID within a business.

### Frontend Compilation & Verification
- Run `npm run build` in `frontend/` to ensure zero TypeScript errors.
- Visual inspection of the ID Card generator (print styles, barcode/QR rendering, CR80 proportions).
- Interactive verification of Org Chart zoom, pan, search, and collapse nodes.

---

## 6. Open Questions for User Approval

> [!IMPORTANT]
> **Questions for User Confirmation:**
> 1. **Nominee Share Enforcement**: Should the system strictly enforce that the sum of nominee share percentages must equal exactly 100% before saving, or allow partial entries during draft onboarding?
> 2. **ID Card Orientation**: Do you prefer **Vertical (Portrait)** or **Horizontal (Landscape)** ID card format, or should the generator support a toggle for both?
> 3. **MFS Support**: Are **bKash, Nagad, and Rocket** sufficient for mobile financial services disbursement, or should we include **Upay** and **Tap** as well?
