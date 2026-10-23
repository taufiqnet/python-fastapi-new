"use client";

import React, { useEffect, useState, useRef, useTransition } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import {
  DepartmentRosterStatus,
  DutyAssignBatch,
  DutyAssignBatchCreatePayload,
  DutyAssignment,
  EmployeeOut,
  MonthlyRoster,
  MonthlyRosterMatrix,
  RosterChangeApplication,
  RosterExchangeApplication,
  Shift,
  ShiftCreatePayload,
} from "@/types";

// Tab Subcomponents
import { MonthlyRosterMatrixTab } from "@/components/hr-payroll/roster/monthly-roster-matrix-tab";
import { DutyAssignTab } from "@/components/hr-payroll/roster/duty-assign-tab";
import { RosterApprovalsTab } from "@/components/hr-payroll/roster/roster-approvals-tab";
import { RosterChangesTab } from "@/components/hr-payroll/roster/roster-changes-tab";
import { RosterExchangesTab } from "@/components/hr-payroll/roster/roster-exchanges-tab";
import { ShiftsSetupTab } from "@/components/hr-payroll/roster/shifts-setup-tab";

// Modals
import { ShiftModal } from "@/components/hr-payroll/roster/modals/shift-modal";
import { DutyAssignModal } from "@/components/hr-payroll/roster/modals/duty-assign-modal";
import { RosterChangeModal } from "@/components/hr-payroll/roster/modals/roster-change-modal";
import { RosterExchangeModal } from "@/components/hr-payroll/roster/modals/roster-exchange-modal";
import { RosterReviewModal } from "@/components/hr-payroll/roster/modals/roster-review-modal";

import {
  CalendarDays,
  Clock,
  Layers,
  RefreshCw,
  ArrowLeftRight,
  Settings,
  AlertCircle,
  Loader2,
  FileCheck,
} from "lucide-react";

type RosterTabType =
  | "matrix"
  | "duty_assign"
  | "approvals"
  | "changes"
  | "exchanges"
  | "setup";

export default function RosterManagementPage() {
  const [activeTab, setActiveTab] = useState<RosterTabType>("matrix");
  const [isPending, startTransition] = useTransition();

  // Two-tier Loading State (Rule: ui_in_place_filtering.md)
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const isInitialMount = useRef(true);

  // Shared Data States
  const [departments, setDepartments] = useState<DepartmentRosterStatus[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<EmployeeOut[]>([]);

  // Selected Filters
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  // Tab-Specific Data
  const [matrix, setMatrix] = useState<MonthlyRosterMatrix | null>(null);
  const [assignments, setAssignments] = useState<DutyAssignment[]>([]);
  const [monthlyRosters, setMonthlyRosters] = useState<MonthlyRoster[]>([]);
  const [dutyBatches, setDutyBatches] = useState<DutyAssignBatch[]>([]);
  const [changeRequests, setChangeRequests] = useState<RosterChangeApplication[]>([]);
  const [exchangeRequests, setExchangeRequests] = useState<RosterExchangeApplication[]>([]);

  // Filtering for Duty Assignments tab
  const [dutyStartDate, setDutyStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10)
  );
  const [dutyEndDate, setDutyEndDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().substring(0, 10)
  );
  const [dutySearchQuery, setDutySearchQuery] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Modal Control States
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{
    type: "monthly_roster" | "duty_batch";
    id: string;
    title: string;
    description: string;
  } | null>(null);

  // Data Fetching Function (decoupling initial skeleton from non-destructive background updates)
  const fetchRosterData = async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setIsFetching(true);
    }
    setError(null);

    try {
      // 1. Initial metadata if needed
      let activeDepts = departments;
      if (departments.length === 0) {
        const [deptRes, shiftRes, empRes] = await Promise.all([
          apiClient.get<DepartmentRosterStatus[]>("/roster/departments"),
          apiClient.get<Shift[]>("/roster/shifts"),
          apiClient.get<EmployeeOut[]>("/employees?limit=500"),
        ]);
        activeDepts = deptRes.data || [];
        setDepartments(activeDepts);
        setShifts(shiftRes.data || []);
        setEmployees(empRes.data || []);

        if (!selectedDeptId && activeDepts.length > 0) {
          const firstRosterDept = activeDepts.find((d) => d.is_roster_enabled) || activeDepts[0];
          setSelectedDeptId(firstRosterDept.id);
        }
      }

      const deptIdToUse = selectedDeptId || (activeDepts[0]?.id ?? "");

      // 2. Fetch according to active tab
      if (activeTab === "matrix" && deptIdToUse) {
        const matrixRes = await apiClient.get<MonthlyRosterMatrix>(
          `/roster/monthly-rosters/matrix?department_id=${deptIdToUse}&year=${selectedYear}&month=${selectedMonth}`
        );
        setMatrix(matrixRes.data);
      } else if (activeTab === "duty_assign") {
        const params = new URLSearchParams();
        if (selectedDeptId) params.append("department_id", selectedDeptId);
        if (dutyStartDate) params.append("start_date", dutyStartDate);
        if (dutyEndDate) params.append("end_date", dutyEndDate);
        const assignRes = await apiClient.get<DutyAssignment[]>(
          `/roster/duty-assignments?${params.toString()}`
        );
        let list = assignRes.data || [];
        if (dutySearchQuery.trim()) {
          const q = dutySearchQuery.toLowerCase();
          list = list.filter(
            (a) =>
              a.employee_name?.toLowerCase().includes(q) ||
              a.employee_code?.toLowerCase().includes(q)
          );
        }
        setAssignments(list);
      } else if (activeTab === "approvals") {
        const [monthlyRes, batchesRes] = await Promise.all([
          apiClient.get<MonthlyRoster[]>("/roster/monthly-rosters"),
          apiClient.get<DutyAssignBatch[]>("/roster/duty-assign-batches"),
        ]);
        setMonthlyRosters(monthlyRes.data || []);
        setDutyBatches(batchesRes.data || []);
      } else if (activeTab === "changes") {
        const changesRes = await apiClient.get<RosterChangeApplication[]>(
          "/roster/change-requests"
        );
        setChangeRequests(changesRes.data || []);
      } else if (activeTab === "exchanges") {
        const exchRes = await apiClient.get<RosterExchangeApplication[]>(
          "/roster/exchange-requests"
        );
        setExchangeRequests(exchRes.data || []);
      } else if (activeTab === "setup") {
        const [deptRes, shiftRes] = await Promise.all([
          apiClient.get<DepartmentRosterStatus[]>("/roster/departments"),
          apiClient.get<Shift[]>("/roster/shifts"),
        ]);
        setDepartments(deptRes.data || []);
        setShifts(shiftRes.data || []);
      }
    } catch (err: any) {
      setError("Failed to load roster data. Please refresh or retry.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchRosterData(true);
    } else {
      fetchRosterData(false);
    }
  }, [
    activeTab,
    selectedDeptId,
    selectedYear,
    selectedMonth,
    dutyStartDate,
    dutyEndDate,
    dutySearchQuery,
  ]);

  // Tab Handlers
  const handleTabChange = (tab: RosterTabType) => {
    startTransition(() => {
      setActiveTab(tab);
    });
  };

  // Matrix Cell Save
  const handleSaveCells = async (
    cells: Array<{ employee_id: string; date: string; shift_id: string }>
  ) => {
    if (!selectedDeptId) return;
    await apiClient.put(
      `/roster/monthly-rosters/matrix?department_id=${selectedDeptId}&year=${selectedYear}&month=${selectedMonth}`,
      { cells }
    );
    showToast("Monthly duty cells saved successfully.");
    fetchRosterData(false);
  };

  // Monthly Roster Submit
  const handleSubmitMonthlyRoster = async (rosterId: string) => {
    await apiClient.post(`/roster/monthly-rosters/${rosterId}/submit`);
    showToast("Monthly roster submitted for supervisory approval.");
    fetchRosterData(false);
  };

  // Direct Duty Assign Batch Submit
  const handleSaveDutyBatch = async (payload: DutyAssignBatchCreatePayload) => {
    await apiClient.post("/roster/duty-assign-batches", payload);
    showToast("Direct duty assign batch submitted for approval.");
    fetchRosterData(false);
  };

  // Shift Change Submit
  const handleSaveChangeRequest = async (payload: {
    employee_id: string;
    date: string;
    requested_shift_id: string;
    reason: string;
  }) => {
    await apiClient.post("/roster/change-requests", payload);
    showToast("Shift change application submitted.");
    fetchRosterData(false);
  };

  // Shift Exchange Submit
  const handleSaveExchangeRequest = async (payload: {
    requesting_employee_id: string;
    target_employee_id: string;
    requesting_date: string;
    target_date: string;
    reason: string;
  }) => {
    await apiClient.post("/roster/exchange-requests", payload);
    showToast("Shift exchange request submitted to peer for acceptance.");
    fetchRosterData(false);
  };

  // Shift CRUD
  const handleSaveShift = async (payload: ShiftCreatePayload, shiftId?: string) => {
    if (shiftId) {
      await apiClient.put(`/roster/shifts/${shiftId}`, payload);
      showToast("Shift updated successfully.");
    } else {
      await apiClient.post("/roster/shifts", payload);
      showToast("New shift created.");
    }
    fetchRosterData(false);
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm("Are you sure you want to delete this shift?")) return;
    try {
      await apiClient.delete(`/roster/shifts/${shiftId}`);
      showToast("Shift deleted.");
      fetchRosterData(false);
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Could not delete shift.");
    }
  };

  // Department Roster Policy Toggle
  const handleToggleDepartmentRoster = async (deptId: string, enabled: boolean) => {
    await apiClient.patch(`/roster/departments/${deptId}/toggle`, {
      is_roster_enabled: enabled,
    });
    showToast(enabled ? "Department enrolled in Roster scheduling." : "Department set to General (standard fixed hours).");
    fetchRosterData(false);
  };

  // Review Actions
  const handleOpenReviewModal = (type: "monthly_roster" | "duty_batch", id: string) => {
    if (type === "monthly_roster") {
      setReviewTarget({
        type,
        id,
        title: "Review Department Monthly Roster",
        description: "Approve to lock this schedule into active attendance records, or reject with feedback.",
      });
    } else {
      setReviewTarget({
        type,
        id,
        title: "Review Direct Duty Assign Batch",
        description: "Approve to activate this batch schedule or reject to cancel assignments.",
      });
    }
    setIsReviewModalOpen(true);
  };

  const handleConfirmReview = async (action: "approve" | "reject", note?: string) => {
    if (!reviewTarget) return;
    if (reviewTarget.type === "monthly_roster") {
      await apiClient.post(`/roster/monthly-rosters/${reviewTarget.id}/review`, {
        action,
        reason: note,
      });
      showToast(action === "approve" ? "Monthly roster approved and locked." : "Monthly roster rejected.");
    } else {
      await apiClient.post(`/roster/duty-assign-batches/${reviewTarget.id}/review`, {
        action,
        reason: note,
      });
      showToast(action === "approve" ? "Duty batch approved." : "Duty batch rejected.");
    }
    fetchRosterData(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold text-white flex items-center gap-2 animate-in slide-in-from-bottom duration-200 ${
              toastMessage.type === "success" ? "bg-emerald-600" : "bg-rose-600"
            }`}
          >
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <CalendarDays className="w-7 h-7 text-indigo-600" />
              Duty Roster Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Multi-shift scheduling, BLA 2006 statutory rest-day validation, shift changes, and colleague exchanges
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              BLA 2006 Statutory Compliant
            </span>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Primary Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/60 w-fit">
          <button
            onClick={() => handleTabChange("matrix")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "matrix"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Monthly Roster Matrix
          </button>

          <button
            onClick={() => handleTabChange("duty_assign")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "duty_assign"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Clock className="w-4 h-4" />
            Duty Assignments
          </button>

          <button
            onClick={() => handleTabChange("approvals")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "approvals"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <FileCheck className="w-4 h-4" />
            Approvals Queue
          </button>

          <button
            onClick={() => handleTabChange("changes")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "changes"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Shift Changes
          </button>

          <button
            onClick={() => handleTabChange("exchanges")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "exchanges"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            Shift Exchanges
          </button>

          <button
            onClick={() => handleTabChange("setup")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "setup"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Settings className="w-4 h-4" />
            Shift Setup & Departments
          </button>
        </div>

        {/* Tab Content Display */}
        {initialLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-xs font-semibold">Loading roster management system...</p>
          </div>
        ) : (
          <>
            {activeTab === "matrix" && (
              <MonthlyRosterMatrixTab
                matrix={matrix}
                departments={departments}
                shifts={shifts}
                selectedDepartmentId={selectedDeptId}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                isFetching={isFetching}
                onDepartmentChange={(deptId) => setSelectedDeptId(deptId)}
                onYearMonthChange={(year, month) => {
                  setSelectedYear(year);
                  setSelectedMonth(month);
                }}
                onSaveCells={handleSaveCells}
                onSubmitRoster={handleSubmitMonthlyRoster}
                onOpenReviewModal={(id) => handleOpenReviewModal("monthly_roster", id)}
              />
            )}

            {activeTab === "duty_assign" && (
              <DutyAssignTab
                assignments={assignments}
                departments={departments}
                shifts={shifts}
                isFetching={isFetching}
                selectedDepartmentId={selectedDeptId}
                startDate={dutyStartDate}
                endDate={dutyEndDate}
                searchQuery={dutySearchQuery}
                onFilterChange={(deptId, start, end, q) => {
                  setSelectedDeptId(deptId);
                  setDutyStartDate(start);
                  setDutyEndDate(end);
                  setDutySearchQuery(q);
                }}
                onOpenAssignModal={() => setIsAssignModalOpen(true)}
              />
            )}

            {activeTab === "approvals" && (
              <RosterApprovalsTab
                monthlyRosters={monthlyRosters}
                dutyBatches={dutyBatches}
                isFetching={isFetching}
                onReviewMonthlyRoster={(id) => handleOpenReviewModal("monthly_roster", id)}
                onReviewDutyBatch={(id) => handleOpenReviewModal("duty_batch", id)}
              />
            )}

            {activeTab === "changes" && (
              <RosterChangesTab
                changeRequests={changeRequests}
                isFetching={isFetching}
                onOpenCreateModal={() => setIsChangeModalOpen(true)}
                onReviewRequest={async (reqId, action, note) => {
                  await apiClient.post(`/roster/change-requests/${reqId}/review`, {
                    action,
                    note,
                  });
                  showToast(action === "approve" ? "Shift change approved." : "Shift change rejected.");
                  fetchRosterData(false);
                }}
              />
            )}

            {activeTab === "exchanges" && (
              <RosterExchangesTab
                exchangeRequests={exchangeRequests}
                isFetching={isFetching}
                onOpenCreateModal={() => setIsExchangeModalOpen(true)}
                onPeerReview={async (reqId, action, note) => {
                  await apiClient.post(`/roster/exchange-requests/${reqId}/peer-review`, {
                    action,
                    peer_note: note,
                  });
                  showToast(action === "accept" ? "Peer accepted. Awaiting manager approval." : "Shift swap declined.");
                  fetchRosterData(false);
                }}
                onManagerReview={async (reqId, action, note) => {
                  await apiClient.post(`/roster/exchange-requests/${reqId}/manager-review`, {
                    action,
                    review_note: note,
                  });
                  showToast(action === "approve" ? "Manager approved. Duties swapped atomically." : "Shift swap rejected.");
                  fetchRosterData(false);
                }}
              />
            )}

            {activeTab === "setup" && (
              <ShiftsSetupTab
                shifts={shifts}
                departments={departments}
                isFetching={isFetching}
                onOpenCreateShiftModal={() => {
                  setEditingShift(null);
                  setIsShiftModalOpen(true);
                }}
                onOpenEditShiftModal={(shift) => {
                  setEditingShift(shift);
                  setIsShiftModalOpen(true);
                }}
                onDeleteShift={handleDeleteShift}
                onToggleDepartmentRoster={handleToggleDepartmentRoster}
              />
            )}
          </>
        )}

        {/* Shift Modal */}
        <ShiftModal
          isOpen={isShiftModalOpen}
          onClose={() => setIsShiftModalOpen(false)}
          onSave={handleSaveShift}
          shift={editingShift}
        />

        {/* Duty Assign Batch Modal */}
        <DutyAssignModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          departments={departments}
          shifts={shifts}
          employees={employees}
          onSave={handleSaveDutyBatch}
        />

        {/* Shift Change Application Modal */}
        <RosterChangeModal
          isOpen={isChangeModalOpen}
          onClose={() => setIsChangeModalOpen(false)}
          employees={employees}
          shifts={shifts}
          onSave={handleSaveChangeRequest}
        />

        {/* Shift Exchange Application Modal */}
        <RosterExchangeModal
          isOpen={isExchangeModalOpen}
          onClose={() => setIsExchangeModalOpen(false)}
          employees={employees}
          onSave={handleSaveExchangeRequest}
        />

        {/* Review Approval Modal */}
        {reviewTarget && (
          <RosterReviewModal
            isOpen={isReviewModalOpen}
            onClose={() => setIsReviewModalOpen(false)}
            title={reviewTarget.title}
            description={reviewTarget.description}
            onConfirm={handleConfirmReview}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
