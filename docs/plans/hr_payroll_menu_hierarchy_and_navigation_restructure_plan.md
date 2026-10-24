# Implementation Plan: HR & Payroll Menu Hierarchy & Navigation Restructuring

**Module**: `frontend/src/components/layout/sidebar.tsx` & HR Navigation Architecture  
**Target Platform**: ProERP Enterprise SaaS Platform  
**Status**: Proposal & Strategy Review (Awaiting User Feedback & Approval)  

---

## 1. Problem Diagnosis & Current Flaws

As observed in the current sidebar navigation screenshot:
- **Flat 22-Item Dump**: Under the single accordion `HR & Payroll`, 22 completely disparate features are dumped into a single flat list.
- **Unorganized Working Hierarchy**:
  1. **Organization Setup** is placed randomly at item #6 (after Payroll Management, before Offer Letters). In HR architecture, Organization (Organogram, Branches, Departments, Designations) is foundation master data and must precede or anchor employee management.
  2. **Letters & Certificates Fragmented**: `Offer Letters`, `Appointment Letters`, `Payroll Payslips`, `Salary Certificates`, and `Experience Letters` are scattered between active operational menus.
  3. **Travel & Expenses Polluting HR**: `Travel Requests`, `Expense Claims`, and `DA & Conveyance Policies` are general corporate expense features, not core HR, yet occupy 3 full slots.
  4. **Performance Management Disconnected**: `Appraisal Cycles`, `Goals & KPIs`, and `Performance Appraisals` are separated from career lifecycle items (`Probation Desk`, `Career Movements`, `Disciplinary Actions`, and `Separation`).
  5. **Missing Vehicle & Fleet Module**: The newly delivered Fleet & Vehicle Management system is not yet accessible from the sidebar.

---

## 2. Proposed Navigation Architecture Options

We propose two proven enterprise patterns for your selection:

### Option A (Recommended): Enterprise Sub-Grouped Hierarchy within "HR & Payroll"
Keeps `HR & Payroll` as a unified department module, but organizes its children into **6 clean, functional sub-groups** with subtle uppercase headers and dividers inside the dropdown:

```
├── HR & PAYROLL
│   ├── ── CORE HR & WORKFORCE ──
│   │   ├── Organization (Organogram, Branches, Depts, Titles)
│   │   ├── Employee Directory
│   │   └── Document Management
│   │
│   ├── ── TIME & ATTENDANCE ──
│   │   ├── Daily Attendance & Biometrics
│   │   ├── Duty Roster & Shifts
│   │   └── Leave Management
│   │
│   ├── ── PAYROLL & COMPENSATION ──
│   │   ├── Payroll Periods & Processing
│   │   ├── Payslips & Salary Records
│   │   └── Salary Certificates
│   │
│   ├── ── LETTERS & ONBOARDING ──
│   │   ├── Offer Letters
│   │   ├── Appointment Letters
│   │   └── Experience Letters
│   │
│   ├── ── TALENT & PERFORMANCE ──
│   │   ├── Performance Appraisals
│   │   ├── Goals & KPIs
│   │   └── Appraisal Cycles
│   │
│   └── ── LIFECYCLE & DISCIPLINARY ──
│       ├── Probation Desk
│       ├── Career Movements (Promotions & Transfers)
│       ├── Disciplinary Actions & Show Cause
│       └── Separation & Offboarding
```

And moves **Travel & Expenses** to its own dedicated top-level section (matching the backend module `app/modules/travel_expenses`).

---

### Option B: Split into Dedicated Top-Level Modules (Workday / SAP Style)
Splits the bloated HR section into 3 distinct, focused main-navigation accordions on the sidebar:
1. 👥 **Human Resources (HRIS)**: Organization, Employees, Onboarding/Letters, Lifecycle, Separation, Documents.
2. ⏱️ **Time, Roster & Leave**: Attendance, Shifts & Duty Roster, Leave Management.
3. 💳 **Payroll & Compensation**: Payroll Processing, Payslips, Tax Slabs, Salary Certificates.
4. 📈 **Performance & Talent**: Appraisals, Goals & KPIs, Cycles.
5. ✈️ **Travel & Expenses**: Requests, Settlement Claims, Conveyance Policies.
6. 🚗 **Vehicle & Fleet Management**: Vehicles, Pool Car Bookings, Trip Sheets, Fuel Logs.

---

## 3. UI/UX Enhancements for Sidebar Component

To support this hierarchy in `frontend/src/components/layout/sidebar.tsx`:
1. **Sub-Group Dividers & Section Headings**:
   Update `NavItem` type to support group dividers:
   ```typescript
   export interface NavChildItem {
     name: string;
     href: string;
     permission?: { module: string; feature: string; action: string };
     groupHeader?: string; // Optional uppercase sub-header (e.g. "TIME & ATTENDANCE")
     badge?: string;
   }
   ```
2. **Visual Hierarchy**:
   - Sub-group headers rendered as:
     ```tsx
     {sub.groupHeader && (
       <div className="pt-3 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-t border-slate-800/60 first:border-0 first:pt-1">
         {sub.groupHeader}
       </div>
     )}
     ```
   - Nested links with proper indent (`pl-4`), hover glow, and active pill highlights.

---

## 4. Proposed Changes

### [MODIFY] `frontend/src/components/layout/sidebar.tsx`
- Reorganize `navItems` under `sectionKey: "hr"` according to the approved working hierarchy.
- Add group headers (`groupHeader: "Core HR & Workforce"`, `groupHeader: "Time & Attendance"`, etc.).
- Add dedicated `Travel & Expenses` sidebar module (`icon: Plane`, `href: "/hr-payroll/travel-requests"`).
- Add dedicated `Vehicle & Fleet` sidebar module (`icon: Car`, `href: "/fleet"`).

---

## 5. Verification Plan

1. **Visual Alignment**:
   - Confirm in browser that `HR & Payroll` dropdown opens with clean visual categories.
   - Confirm active page highlights correctly (e.g. clicking `Organization` highlights without expanding wrong sections).
2. **Automated Component Tests**:
   - Run `npx vitest run src/components/layout/__tests__/` (or add sidebar rendering test).
3. **TypeScript Build Verification**:
   - Run `npx tsc --noEmit` to ensure 0 typing errors.
