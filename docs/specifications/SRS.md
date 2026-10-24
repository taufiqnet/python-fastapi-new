# Software Requirements Specification (SRS)
## Multi-Branch Super Shop & Enterprise Retail ERP Platform

**Document Identifier:** SRS-ERP-RET-2026-V1  
**Version:** 1.0.0 (Baseline Specification)  
**Target Architecture:** Multi-Tenant Distributed Micro-Modular Monolith  
**Core Stack:** Python 3.12 (FastAPI), SQLAlchemy 2.0 ORM, PostgreSQL 16, Jinja2, TailwindCSS, Progressive Web App (Service Worker / IndexedDB)  
**Last Updated:** October 2026

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [Overall Description & System Architecture](#2-overall-description--system-architecture)
3. [Multi-Branch Super Shop & POS Module Requirements](#3-multi-branch-super-shop--pos-module-requirements)
4. [Inventory & Supply Chain Management](#4-inventory--supply-chain-management)
5. [Inbound Procurement & Vendor Master](#5-inbound-procurement--vendor-master)
6. [Human Resource & Payroll (HRM) Module](#6-human-resource--payroll-hrm-module)
7. [Financial Accounting & Statutory VAT (Mushak 6.3)](#7-financial-accounting--statutory-vat-mushak-63)
8. [Multi-Tenancy, Subscriptions & RBAC](#8-multi-tenancy-subscriptions--rbac)
9. [Hardware Interface & Peripherals Specification](#9-hardware-interface--peripherals-specification)
10. [Non-Functional Requirements (NFR)](#10-non-functional-requirements-nfr)
11. [Requirements Traceability Matrix (RTM)](#11-requirements-traceability-matrix-rtm)

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) defines the end-to-end functional and non-functional requirements for the **Enterprise Multi-Branch Super Shop Retail Management & ERP System**. The platform is designed to govern distributed supermarket chain operations (FMCG, fresh produce, meat/poultry, dairy, household items, and electronics), unifying localized branch POS terminals, centralized procurement, inter-branch stock logistics, automated payroll, double-entry financial accounting, and national VAT (Mushak 6.3) compliance.

### 1.2 Scope of the Platform
The platform serves as an all-in-one ERP encompassing:
- **Distributed Multi-Branch Retail Engine:** Real-time branch inventory segregation, high-throughput Point of Sale (POS) terminals, barcode weighing scale integration, item returns/exchanges, cashier drawer balancing, and offline PWA resilience.
- **Centralized Warehouse & Supply Chain:** Automated replenishment, inter-branch transit tracking, FIFO cost-layer valuation, and thermal shelf-edge/barcode printing.
- **Procurement & Inbound Logistics:** Supplier lifecycle management, Purchase Orders (PO), and Goods Received Notes (GRN).
- **Human Resources & Payroll:** Multi-department hierarchies, staff directories, shift-based attendance, leave approval workflows, and monthly payroll computation with statutory tax withholdings.
- **Financial Accounting & National Tax Engine:** General ledger, Chart of Accounts, balanced Journal Vouchers, and automated statutory Bangladesh NBR Mushak 6.3 tax challans.
- **Multi-Tenant SaaS Foundation:** Tenant business profile isolation, subscription plan tiering, and granular Role-Based Access Control (RBAC).

### 1.3 Definitions, Acronyms, and Abbreviations
- **BIN:** Business Identification Number (13-digit mandatory VAT identifier).
- **COGS:** Cost of Goods Sold.
- **EAN-13:** 13-digit International Article Number barcode symbology.
- **FEFO:** First-Expired, First-Out perishables inventory management.
- **FIFO:** First-In, First-Out inventory cost layer tracking.
- **FMCG:** Fast-Moving Consumer Goods.
- **GRN:** Goods Received Note (formal warehouse inbound receiving document).
- **Mushak 6.3:** Statutory Tax Invoice Challan prescribed by the National Board of Revenue (NBR), Bangladesh.
- **POS:** Point of Sale.
- **PWA:** Progressive Web Application (Service Worker & IndexedDB offline cache).
- **RBAC:** Role-Based Access Control.
- **SKU:** Stock Keeping Unit.
- **UoM:** Unit of Measure (e.g., PCS, KG, GRAM, LTR, PACK, BOX).
- **Z-Report:** Certified end-of-day register closing report summarizing financial tenders, tax totals, and cash drawer variances.

---

## 2. Overall Description & System Architecture

### 2.1 Multi-Branch Super Shop Topology

```mermaid
graph TD
    subgraph Central Headquarters [Cloud / Central Data Center]
        Postgres[(PostgreSQL 16 Primary DB)]
        AppEngine[FastAPI Enterprise Application Engine]
        HQAdmin[Headquarters Executive Portal]
        CentralProcurement[Central Procurement & PO Engine]
        CentralFinance[General Ledger & VAT Engine]
        CentralHR[Centralized HR & Payroll Hub]
    end

    subgraph Central Logistics Hub
        MainWH[Central Distribution Warehouse / WH-MAIN]
    end

    subgraph Retail Branch: Gulshan Outlet
        GulshanWH[Gulshan Store Stock / WH-01]
        GulshanPOS1[Cash Counter 01 / Terminal]
        GulshanPOS2[Cash Counter 02 / Terminal]
        GulshanScale[Produce Barcode Scale]
    end

    subgraph Retail Branch: Dhanmondi Outlet
        DhanmondiWH[Dhanmondi Store Stock / WH-02]
        DhanmondiPOS1[Cash Counter 01 / Terminal]
        DhanmondiScale[Produce Barcode Scale]
    end

    HQAdmin --> AppEngine
    AppEngine --> Postgres
    CentralProcurement --> MainWH
    MainWH -. Stock Transfer Lines (In-Transit) .-> GulshanWH
    MainWH -. Stock Transfer Lines (In-Transit) .-> DhanmondiWH
    GulshanWH --> GulshanPOS1
    GulshanWH --> GulshanPOS2
    DhanmondiWH --> DhanmondiPOS1
    GulshanScale -. Printed Barcode .-> GulshanPOS1
    GulshanScale -. Printed Barcode .-> GulshanPOS2
    DhanmondiScale -. Printed Barcode .-> DhanmondiPOS1
```

### 2.2 System Modules Overview
```mermaid
mindmap
  root((Super Shop ERP))
    Multi-Branch Retail
      POS Checkout Station
      Weighing Scale Parser
      Item Returns & Refunds
      Cashier Shifts & Z-Reports
      Offline PWA & Local Sync
    Supply Chain & Inventory
      Branch Warehouses
      Inter-Branch Transfers
      Barcode & Shelf Printing
      Stock Adjustments & Counts
      FIFO Cost Layers
    Procurement
      Supplier Profiles
      Purchase Orders (PO)
      Inbound Receiving (GRN)
    HR & Payroll
      Employee Directory
      Attendance & Leave
      Salary Structures
      Monthly Payroll Cycles
    Finance & Accounting
      Double-Entry Ledger
      Chart of Accounts
      Mushak 6.3 VAT Challans
      Withholding Taxes (TDS/VDS)
    Multi-Tenancy & Security
      Business Profile Scoping
      Role-Based Access Control
      Subscription Plan Gates
```

---

## 3. Multi-Branch Super Shop & POS Module Requirements

### 3.1 Point of Sale (POS) Station Operations
- **REQ-POS-001 (Branch Register Association):** Every terminal instance must be registered under a physical `POSRegister` record bound to a specific `warehouse_id` (the branch outlet). All stock deductions initiated during checkout must deduct inventory from that branch's warehouse only.
- **REQ-POS-002 (Shift Lifecycle & Drawer Control):**
  1. A cashier cannot process sales without an open shift (`POSSession`).
  2. The cashier must declare opening float cash when opening a session.
  3. At shift close, the cashier records physical drawer cash count. The system computes drawer variance (`cash_difference = closing_cash_counted - expected_cash`).
  4. The system produces a certified **Z-Report** detailing net sales, tax breakdown, and tender splits.
- **REQ-POS-003 (Barcode Scanner Ergonomics):**
  - High-speed scanner support for EAN-13, UPC-A, Code128, and QR codes with sub-80ms item addition.
  - Complete keyboard shortcuts for touchless cash register operations:
    - `F1`: Focus search bar
    - `F2`: Item discount modal
    - `F4`: Trigger Tender / Pay modal
    - `F8`: Hold / Suspend open bill
    - `F9`: Open Returns / Refunds modal
    - `Esc`: Clear cart / Close modals
- **REQ-POS-004 (Barcode Scale Auto-Decoding):**
  - Supermarkets weigh loose items (vegetables, fruits, fish, meat) and produce price/weight embedded EAN-13 barcodes.
  - The POS scanner parser must recognize EAN-13 barcodes with prefix `20` or `21`:
    - Format: `20 [5-digit SKU / Item Code] [5-digit Weight in Grams or Price] [1-digit Checksum]`.
    - Automatically decodes weight/price, attaches the item to the bill, and computes line total without cashier manual input.
- **REQ-POS-005 (Split Tenders & Payment Methods):**
  - Supports split payment tenders in a single invoice:
    - Cash (with exact tender buttons: 10, 20, 50, 100, 500, 1000 and auto change calculator).
    - Credit / Debit Card (records POS machine approval code).
    - Mobile Financial Services (bKash, Nagad, Rocket with TrxID recording).
    - Store Credit / Gift Vouchers.
- **REQ-POS-006 (Bill Suspension / Hold Orders):**
  - Allows cashiers to park/suspend an open cart when a customer steps away, serving the next customer immediately. Parked carts can be resumed with a single click or shortcut.
- **REQ-POS-007 (Quick Customer Enrollment):**
  - In-terminal modal allows enrolling walk-in customers (`first_name`, `phone`, `email`, `address`) scoped to the tenant's `business_id` without leaving the checkout screen.
- **REQ-POS-008 (Offline PWA Architecture):**
  - In the event of network disruption or internet outage, the POS terminal functions seamlessly using IndexedDB local storage (Dexie.js).
  - Transactions queued offline automatically push to the server upon connection restoration with conflict resolution.

### 3.2 POS Item Returns, Refunds & Exchanges
- **REQ-RET-001 (Past Invoice Lookup):**
  - Cashiers can open the Return Modal (`F9`), scan or type the original invoice number (`POS-YYYYMMDD-XXXXXX`) or search by customer mobile number.
- **REQ-RET-002 (Itemized Partial/Full Return):**
  - Displays original line items, sold unit prices, purchased quantities, and remaining returnable quantities.
  - Cashier enters the return quantity (validating `return_qty <= remaining_qty`).
  - Cashier selects Return Reason: *Damaged / Defective*, *Customer Exchange*, *Wrong Item Sold*, *Expired Goods*.
- **REQ-RET-003 (Restock vs. Damage Disposal):**
  - Checkbox: *Restock to Branch Inventory*.
  - If checked: Increments branch `InventoryItem.quantity_on_hand` and variant `stock_qty` with `StockMovement(RETURN)`.
  - If unchecked: Logs item as shrinkage/damaged waste without returning to sellable stock.
- **REQ-RET-004 (Refund Tender Issuance):**
  - Issues refund as Cash (deducted from current shift drawer), Store Credit / Gift Voucher, or original electronic payment method.
  - Generates an official Credit Note / Return Receipt with barcode.

---

## 4. Inventory & Supply Chain Management

### 4.1 Branch Warehouses & Multi-Location Stock
- **REQ-INV-001 (Branch Warehouse Segregation):**
  - Stock levels (`quantity_on_hand`) are tracked independently per branch warehouse (`Warehouse`).
  - No branch can sell stock belonging to another branch unless an official stock transfer is executed.
- **REQ-INV-002 (Inter-Branch Stock Transfers):**
  - Workflow: Source Warehouse (e.g., Central Hub) ➔ Destination Warehouse (e.g., Gulshan Outlet).
  - Status progression: `PENDING` ➔ `IN_TRANSIT` ➔ `COMPLETED` (or `CANCELLED`).
  - Items dispatched are immediately deducted from source stock and marked as in-transit. Destination stock increments only upon physical delivery check-in.
- **REQ-INV-003 (Double-Entry Stock Audit Trail):**
  - Every stock alteration generates an immutable `StockMovement` entry capturing `delta`, `unit_cost`, `reason` (Sale, Return, Transfer, Purchase Receipt, Shrinkage), `source_type`, and `actor_id`.
- **REQ-INV-004 (FIFO Cost Layer Valuation):**
  - Goods inbound from purchase orders establish `CostLayer` records with quantity and cost.
  - Outbound POS sales consume the oldest active cost layers first, ensuring 100% compliant Cost of Goods Sold (COGS) reporting.
- **REQ-INV-005 (Automated Reorder Thresholds):**
  - Configurable minimum safety stock and reorder quantities per branch item.
  - Automatic alerts and draft transfer generation when branch stock reaches threshold.
- **REQ-INV-006 (Barcode & Shelf Label Generator):**
  - Batch generation and direct thermal printing of Code128 / EAN-13 labels for retail shelves and individual packaged items with prices and VAT indicators.

---

## 5. Inbound Procurement & Vendor Master

### 5.1 Vendor Directory & Purchase Order Engine
- **REQ-PROC-001 (Supplier Master):**
  - Central directory of approved suppliers with contact profiles, payment terms (Net 15, Net 30, Net 60, COD, Advance), and national tax identification (BIN).
- **REQ-PROC-002 (Purchase Order Lifecycle):**
  - Creation of formal purchase orders specifying destination warehouse, supplier, expected delivery date, itemized quantities, and purchase prices.
  - Statuses: `DRAFT` ➔ `ISSUED` ➔ `PARTIALLY_RECEIVED` ➔ `COMPLETED` ➔ `CANCELLED`.
- **REQ-PROC-003 (Goods Received Note [GRN]):**
  - Inbound delivery receiving against purchase orders.
  - Validates delivered quantity against ordered quantity.
  - Directly creates branch stock layers (`CostLayer`), updates variant cost prices, and records inventory receiving movements.

---

## 6. Human Resource & Payroll (HRM) Module

### 6.1 Organization & Employee Master
- **REQ-HRM-001 (Department & Job Designation):**
  - Hierarchical department trees with branch scoping, unique department slugs, and standardized job titles with reporting designations.
- **REQ-HRM-002 (Employee Profiles):**
  - Digital employee master files capturing personal identity, national ID (NID), emergency contacts, branch assignment, employment type, bank account details, and corporate email.

### 6.2 Attendance & Time Tracking (Biometric & Roster Governance)
- **REQ-HRM-003 (Biometric & Device Integration Engine):**
  - Hardware device registry supporting standalone TCP/IP biometric terminals (ZKTeco, Hikvision, Suprema).
  - Configurable settings: global enable/disable toggle for biometric integration (`biometric_integration_enabled`), device IP, port, secret key, and branch assignment.
  - Optional architecture: Payroll calculation operates seamlessly with or without biometric hardware active. Enabling the device integration automates punch harvesting and salary processing without manual intervention.
  - Automated network ping/handshake diagnostic probe.
- **REQ-HRM-004 (Raw Punch Logs & Ingest Gateway):**
  - Real-time HTTP push webhook listener and scheduled polling worker to harvest punch events (`raw-logs/push`, `sync-daily`).
  - Immutable raw attendance audit trail capturing device ID, biometric user ID, timestamp, verification method (fingerprint, facial recognition, RFID card), and punch state (Check-In, Check-Out, Break).
- **REQ-HRM-005 (Attendance Regularization & Missing Punch Workflow):**
  - Self-service and supervisor manual attendance request portal for forgotten check-ins, device misreads, or field emergencies.
  - Multi-tier approval workflow (Pending ➔ Approved / Rejected) with reason capture and mandatory audit notes.
- **REQ-HRM-006 (Visit & Outdoor Duty Management):**
  - Formal application and approval cycle for official client visits, branch inspections, and field duties.
  - Captures expected timeframes, destination, and purpose, automatically crediting full working day attendance upon approval.
- **REQ-HRM-007 (Overtime [OT] Authorization & Calculation):**
  - Configurable minimum daily overtime qualification threshold (default 60 minutes) and standard working hours (8.0 hours/day).
  - Employee overtime claims subjected to supervisor authorization before feeding into monthly payroll earnings.
- **REQ-HRM-008 (Monthly Attendance Period Processing & Payroll Freeze):**
  - Period-end compilation aggregating raw punches, approved regularizations, outdoor duties, statutory holidays, and approved leaves.
  - Formatted Monthly Attendance Summary matrix displaying present days, absent days, late counts, and approved overtime hours.
  - Cryptographic period locking mechanism (`period-approvals/{id}/lock`) to freeze attendance data and prevent retroactive modifications once handed over to payroll.

### 6.3 Compensation & Statutory Monthly Payroll (BLA 2006)
- **REQ-HRM-009 (Salary Breakdown Structure):**
  - Statutory 5-tier salary structure conforming to Bangladesh Labour Act:
    - Basic Salary (minimum 50% of gross)
    - House Rent Allowance (25%)
    - Medical Allowance (10%)
    - Conveyance Allowance
    - Food / Festival Allowances
- **REQ-HRM-010 (Automated Payroll Computation & TDS):**
  - Automated generation of monthly payroll cycles (`PayrollPeriod`).
  - Integration with finalized attendance roster for unpaid leave pro-rata deductions and overtime disbursements.
  - Automated Tax Deducted at Source (TDS) based on national progressive tax slabs.
  - Individual pay slip generation and bank EFT transfer schedules.

### 6.4 Separation & Offboarding Governance
- **REQ-HRM-011 (Resignation Application & Notice Calculation):**
  - Self-service resignation submission with proposed last working day and reason categorization.
  - Automated notice period evaluation (contractual notice vs. actual days served) identifying shortfall days.
  - Supervisory review and acceptance workflow with withdrawal option prior to execution.
- **REQ-HRM-012 (Employee Separation Master):**
  - Enterprise governance for all separation modes: Resignation, Termination with notice, Immediate Termination with notice pay, Statutory Retirement, Dismissal on disciplinary grounds, and Death in service.
  - Multi-state lifecycle: `Initiated` ➔ `Clearance Pending` ➔ `Settlement Ready` ➔ `Settled` ➔ `Completed`.
- **REQ-HRM-013 (5-Tier Departmental Clearance & NOC):**
  - Independent sign-off tracking across 5 mandatory departments:
    1. **IT Department:** Revocation of system logins, email accounts, VPN access, and return of computing peripherals.
    2. **Administration:** Return of access cards, uniform, corporate SIM card, and company vehicle keys.
    3. **Finance & Accounts:** Recovery of travel advances, petty cash balances, and staff purchase dues.
    4. **Legal & Compliance:** Verification of NDA post-employment obligations and non-compete clauses.
    5. **Human Resources:** Exit interview completion, PF loan clearing, and final clearance sign-off.
- **REQ-HRM-014 (Custody Asset Recovery):**
  - Direct integration with Asset Management inventory module (`assets_router`).
  - Lists all physical hardware assigned to the departing employee; enables itemized condition assessment (Good, Damaged, Lost) and auto-computes deduction charges for unreturned items.
- **REQ-HRM-015 (Exit Interview & Retention Telemetry):**
  - Structured survey capturing satisfaction ratings across compensation, management, work culture, growth opportunities, and recommendation likelihood.
- **REQ-HRM-016 (Statutory Full & Final Settlement [FnF]):**
  - Mathematical computation conforming strictly to Bangladesh Labour Act (BLA 2006):
    - **Earned Unpaid Salary:** Pro-rated for active days worked in final month.
    - **Earned Leave Encashment:** Unavailed annual leave balance encashed at `(Basic + Dearness + Allowances) / 30` per day (BLA 2006 Section 117).
    - **Statutory Gratuity:** Calculation under BLA 2006 Section 27 based on completed continuous service years (30 days basic wages for each year completed beyond 5 years).
    - **Notice Pay / Shortfall:** Compensation in lieu of notice where applicable.
    - **Deductions:** TDS, pending loan principal, unreturned asset liabilities, and departmental penalties.
  - Disbursement recording with bank EFT transaction reference.
- **REQ-HRM-017 (Service Experience & Release Letter Generation):**
  - Automated generation of official Certificate of Service and Relieving Letter carrying corporate letterhead, service tenure dates, designation, and verified reference code.

### 6.5 Employee Document Management & Digital Personal File (e-Dossier)
- **REQ-HRM-018 (Document Categories & Retention Governance):**
  - Centralized categorization with statutory mandatory flags, file extension whitelists (PDF, JPG, PNG, DOCX), maximum upload sizes, and 4 confidentiality tiers (`Public`, `Internal`, `Confidential`, `Strictly Confidential`).
- **REQ-HRM-019 (Dynamic Document Template Engine):**
  - Reusable template catalog with rich merge tag parser replacing variables in real-time (`{{employee_name}}`, `{{employee_code}}`, `{{designation}}`, `{{department}}`, `{{joining_date}}`, `{{effective_date}}`, `{{gross_salary}}`, `{{basic_salary}}`, `{{reference_no}}`, `{{current_date}}`, `{{company_name}}`).
  - Interactive live preview modal rendering layout with actual employee records before dispatch.
- **REQ-HRM-020 (Digital Personal File [e-Dossier / 201 File]):**
  - Comprehensive electronic folder for every employee tracking educational diplomas, national identity, employment contracts, and disciplinary records.
  - **Automated Completeness Scorecard:** Calculates compliance % based on uploaded vs. mandatory statutory documents required under national employment regulations.
  - Dual-state verification desk enabling HR auditors to review, verify, or reject files with reason capture.
- **REQ-HRM-021 (ID, Passport, Visa & Work Permit Tracking):**
  - Structured credential storage enforcing format validation:
    - Bangladesh Smart NID: Exactly 10 numeric digits.
    - Classic NID: Exactly 13 or 17 numeric digits.
    - Bangladesh e-TIN: Exactly 12 numeric digits.
    - Expatriate Credentials: International Passports, BIDA Work Permits, BEPZA Clearances, and Work Visas.
- **REQ-HRM-022 (Document Expiry & Renewal Alert Engine):**
  - Automated scanning engine evaluating credentials, agreements, and personal files expiring within threshold windows (15, 30, 60 days).
  - Urgency categorization (`Overdue`, `Critical`, `Warning`, `Info`) with renewal tracking stages (`Pending`, `In Progress`, `Renewed`, `Grace Period`).
- **REQ-HRM-023 (Bulk Letter Generation Worker):**
  - Multi-recipient batch letter generator for organization-wide Salary Revisions / Increments, Service Confirmations, and Transfers.
  - Dispatches and renders individual personalized documents in batch with automated reference prefix numbering.
- **REQ-HRM-024 (Statutory e-Signatures & Audit Verification [ICT Act 2006]):**
  - Legally binding electronic document execution conforming to the Bangladesh Information & Communication Technology Act 2006.
  - Support for HTML5 canvas drawn signatures, typed script signatures, and clickwrap consents.
  - Generates immutable SHA-256 cryptographic digest of document content, captures signer IP address and browser user-agent, and generates a globally verifiable audit certificate (`CERT-DOC-YYYYMMDD-XXXXXXXX`).

---

## 7. Financial Accounting & Statutory VAT (Mushak 6.3)

### 7.1 Double-Entry General Ledger
- **REQ-ACC-001 (Chart of Accounts):**
  - Localized 5-tier Chart of Accounts for Bangladesh commercial retail:
    - 1000s: Assets (Cash, Bank, Trade Receivables, Inventory, Input VAT)
    - 2000s: Liabilities (Accounts Payable, Output VAT, TDS/VDS Payable)
    - 3000s: Equity (Owner's Capital, Retained Earnings)
    - 4000s: Revenue (Retail Sales Revenue, Service Revenue)
    - 5000s: Expenses (COGS, Rent, Utilities, Salaries & Wages)
- **REQ-ACC-002 (Journal Vouchers):**
  - Automated and manual balanced double-entry vouchers enforcing `sum(debit) == sum(credit)`.
  - Automatic posting of POS daily sales totals to Cash/Bank and Sales Revenue accounts.

### 7.2 Bangladesh VAT & Mushak Compliance
- **REQ-VAT-001 (Mushak 6.3 Tax Invoice Challan):**
  - Automated generation of statutory National Board of Revenue (NBR) **Mushak 6.3** tax invoice challans for retail sales.
  - Mandatory fields: Registered Business Name & BIN, Branch Outlet Address, Customer Details, Serialized Challan Number, Fiscal Year, Itemized Goods Description, Unit Value, Supplementary Duty (SD), and VAT rate (15% standard, 5%, 7.5%, or exempt).
- **REQ-VAT-002 (Withholding Tax [TDS/VDS]):**
  - Automated tracking of VAT Deducted at Source (VDS) on vendor payments and Tax Deducted at Source (TDS) on payroll and procurement.

---

## 8. Multi-Tenancy, Subscriptions & RBAC

### 8.1 Tenant Scoping & Identity
- **REQ-SEC-001 (Data Partitioning):**
  - Strict tenant partitioning using `business_id` across all relational database entities.
  - Non-superadmin users are locked to their assigned tenant profile. Cross-tenant access is strictly denied at both API and ORM layers.
- **REQ-SEC-002 (Subscription Tiers & Gating):**
  - Feature gating enforced via `FEATURE_CONFIG` and `SubscriptionPlan` (Free, Basic, Pro, Enterprise).
  - Locked features render upsell prompts without breaking page layouts.
- **REQ-SEC-003 (Granular RBAC Permissions):**
  - Permission matrix based on `(module, feature, action)` (e.g., `ecommerce:pos:create`, `hrm:payroll:view`, `finance:vouchers:create`).

---

## 9. Hardware Interface & Peripherals Specification

| Peripheral Type | Supported Standards / Interfaces | Functional Integration |
| :--- | :--- | :--- |
| **Barcode Scanners** | USB HID, Bluetooth Keyboard Wedge | Scans SKU / EAN-13 barcodes directly into active POS listener without requiring mouse focus. |
| **Weighing Scales** | Embedded Barcode Label (EAN-13 prefix `20`/`21`) or Serial RS-232 / USB HID scale | Auto-decodes produce weight and price directly into cart lines. |
| **Thermal Receipt Printers** | 80mm / 58mm Thermal Printers (USB, Network LAN, ESC/POS) | Fast graphic & text receipt printing with store branding, VAT breakdowns, and barcodes. |
| **Electronic Cash Drawers**| RJ11 / RJ12 connection through Receipt Printer | Drawer kick pulse triggered automatically upon cash payment completion. |
| **Customer Displays (VFD)** | 2-Line USB / Serial Pole Displays | Real-time line item price and total payable display facing the customer. |
| **Biometric Timeclocks** | TCP/IP Ethernet LAN, RS-485, HTTP Push Webhook | Automated daily & real-time punch synchronization across ZKTeco, Hikvision, and Suprema devices with optional standalone fallback. |

---

## 10. Non-Functional Requirements (NFR)

### 10.1 Performance & Response Times
- **NFR-PERF-001:** POS Barcode scanning and line addition must complete in under **80 milliseconds**.
- **NFR-PERF-002:** POS checkout completion and receipt generation must finalize in under **500 milliseconds**.
- **NFR-PERF-003:** DataTables paginated views must load within **250 milliseconds** for datasets up to 50,000 records.

### 10.2 Reliability & Fault Tolerance
- **NFR-REL-001:** System API availability objective: **99.9% uptime**.
- **NFR-REL-002:** In the event of complete store internet disconnection, POS cashiers can continue uninterrupted offline checkout operations. Queued transactions sync automatically upon reconnection.

### 10.3 Security & Cryptography
- **NFR-SEC-001:** Passwords hashed using `bcrypt` / `argon2` with high work factors.
- **NFR-SEC-002:** Stateless JWT authentication tokens with configurable expiration (180 minutes).
- **NFR-SEC-003:** Role-Based Access Control verified on every individual API endpoint and template route.

---

## 11. Requirements Traceability Matrix (RTM)

| Requirement Code | Module | Database Entity | Controller / Route | UI Template |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-POS-001** | Retail POS | `POSRegister` | `/pos/terminal` | `terminal.html` |
| **REQ-POS-002** | Retail POS | `POSSession` | `/pos/sessions` | `terminal.html` |
| **REQ-POS-004** | Retail POS | `ProductVariant` | `/pos/checkout` | `terminal.html` |
| **REQ-POS-005** | Retail POS | `POSPayment` | `/pos/checkout` | `terminal.html` |
| **REQ-RET-001** | Retail POS | `Order`, `OrderItem` | `/pos/orders/{id}/return` | `terminal.html` |
| **REQ-INV-001** | Inventory | `Warehouse`, `InventoryItem` | `/inventory/` | `inventory_list.html` |
| **REQ-INV-002** | Inventory | `StockTransfer`, `StockTransferLine` | `/inventory/transfers` | `stock_transfer_list.html` |
| **REQ-INV-003** | Inventory | `StockMovement` | `/inventory/movements` | `stock_movements.html` |
| **REQ-INV-004** | Inventory | `CostLayer` | `/inventory/valuation` | `valuation_report.html` |
| **REQ-INV-006** | Inventory | `ProductVariant` | `/inventory/barcode-print` | `barcode_print_manage.html` |
| **REQ-PROC-001**| Procurement | `Supplier` | `/procurement/suppliers` | `suppliers_list.html` |
| **REQ-PROC-002**| Procurement | `PurchaseOrder` | `/procurement/purchase-orders` | `po_list.html` |
| **REQ-HRM-001** | HRM | `Department`, `JobTitle` | `/departments/manage` | `department_list.html` |
| **REQ-HRM-002** | HRM | `Employee` | `/employees/manage` | `employee_list.html` |
| **REQ-HRM-003** | HRM | `BiometricDevice` | `/attendance/devices` | `attendance/page.tsx` |
| **REQ-HRM-005** | HRM | `AttendanceRegularization` | `/attendance/regularizations` | `attendance/page.tsx` |
| **REQ-HRM-006** | HRM | `EmployeeSalary`, `PayrollPeriod` | `/payroll/settings` | `payroll_settings.html` |
| **REQ-HRM-007** | HRM | `AttendanceOvertimeRequest` | `/attendance/overtime` | `attendance/page.tsx` |
| **REQ-HRM-008** | HRM | `AttendancePeriodApproval` | `/attendance/period-approvals` | `attendance/page.tsx` |
| **REQ-HRM-011** | HRM | `ResignationApplication` | `/separation/resignations` | `resignation-tab.tsx` |
| **REQ-HRM-012** | HRM | `EmployeeSeparation` | `/separation/separations` | `separation-tab.tsx` |
| **REQ-HRM-013** | HRM | `DepartmentClearance` | `/separation/clearances` | `department-clearance-tab.tsx` |
| **REQ-HRM-016** | HRM | `EmployeeFinalSettlement` | `/separation/settlements` | `final-settlement-tab.tsx` |
| **REQ-HRM-018** | HRM | `DocumentCategory` | `/documents/categories` | `categories-tab.tsx` |
| **REQ-HRM-020** | HRM | `EmployeeDocument` | `/documents/dossier` | `dossier-tab.tsx` |
| **REQ-HRM-021** | HRM | `EmployeeIdentityRecord` | `/documents/identity-records` | `identity-tab.tsx` |
| **REQ-HRM-022** | HRM | `DocumentRenewalAlert` | `/documents/expiry-alerts` | `expiry-alerts-tab.tsx` |
| **REQ-HRM-023** | HRM | `BulkLetterJob` | `/documents/bulk-letters` | `bulk-letters-tab.tsx` |
| **REQ-HRM-024** | HRM | `DocumentAcknowledgement` | `/documents/signatures/sign` | `sign-document-modal.tsx` |
| **REQ-ACC-001** | Finance | `Account` | `/finance/accounts` | `account_list.html` |
| **REQ-ACC-002** | Finance | `JournalVoucher`, `JournalEntry` | `/finance/vouchers` | `voucher_list.html` |
| **REQ-VAT-001** | Finance | `MushakChallan`, `SalesInvoice` | `/finance/mushak-6-3` | `mushak_6_3_list.html` |
| **REQ-SEC-001** | Core | `BusinessProfile`, `User` | `/businesses/manage` | `business_list.html` |
