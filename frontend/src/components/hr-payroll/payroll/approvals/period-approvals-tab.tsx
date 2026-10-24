"use client";

import React, { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  Clock,
  UserCheck,
  Search,
  RefreshCw,
  FileText,
  BadgeAlert,
  ChevronRight,
  Filter,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import {
  PayrollPeriodOut,
  PayrollPeriodApprovalOut,
  PayrollRecordOut,
} from "@/types";

interface PeriodApprovalsTabProps {
  periods: PayrollPeriodOut[];
  currentBusinessId: number;
  onRefreshPeriods?: () => void;
}

export function PeriodApprovalsTab({
  periods,
  currentBusinessId,
  onRefreshPeriods,
}: PeriodApprovalsTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Selected period
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    periods[0]?.id || ""
  );

  useEffect(() => {
    if (!selectedPeriodId && periods.length > 0) {
      setSelectedPeriodId(periods[0].id);
    }
  }, [periods, selectedPeriodId]);

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.id === selectedPeriodId),
    [periods, selectedPeriodId]
  );

  // Approvals & Records state
  const [approvals, setApprovals] = useState<PayrollPeriodApprovalOut[]>([]);
  const [records, setRecords] = useState<PayrollRecordOut[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Approval action modal state
  const [approvalModalStage, setApprovalModalStage] = useState<string | null>(null);
  const [approvalAction, setApprovalAction] = useState<"approved" | "rejected" | "returned_for_revision">("approved");
  const [approvalComments, setApprovalComments] = useState<string>("");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState<boolean>(false);

  // Hold action modal state
  const [holdRecord, setHoldRecord] = useState<PayrollRecordOut | null>(null);
  const [holdReason, setHoldReason] = useState<string>("");
  const [isSubmittingHold, setIsSubmittingHold] = useState<boolean>(false);

  // Filters for Hold Management Table
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [holdFilter, setHoldFilter] = useState<"all" | "held" | "active">("all");

  // Fetch approvals and records for the selected period
  const fetchData = useCallback(
    async (isBackground = false) => {
      if (!selectedPeriodId) return;
      if (isBackground) setIsFetching(true);
      else setInitialLoading(true);
      setError(null);

      try {
        const [approvalsRes, recordsRes] = await Promise.all([
          apiClient.get<PayrollPeriodApprovalOut[]>(
            `/payroll/periods/${selectedPeriodId}/approvals`
          ),
          apiClient.get<PayrollRecordOut[]>(
            `/payroll/records?period_id=${selectedPeriodId}&business_id=${currentBusinessId}&limit=500`
          ),
        ]);

        setApprovals(approvalsRes.data || []);
        setRecords(recordsRes.data || []);
      } catch (err: any) {
        console.error("Failed to load approval details:", err);
        setError("Failed to load approval workflow and payslip records for this cycle.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [selectedPeriodId, currentBusinessId]
  );

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Stage status helper
  const getStageStatus = (stage: string) => {
    const stageApprovals = approvals.filter((a) => a.stage === stage);
    if (!stageApprovals.length) return { status: "pending", approval: null };
    const latest = stageApprovals[stageApprovals.length - 1];
    return { status: latest.action, approval: latest };
  };

  const hrStatus = getStageStatus("hr_review");
  const financeStatus = getStageStatus("finance_review");
  const mgmtStatus = getStageStatus("management_sign_off");

  // Handle Submit Approval
  const handleSubmitApproval = async () => {
    if (!approvalModalStage || !selectedPeriodId) return;
    setIsSubmittingApproval(true);
    try {
      await apiClient.post(`/payroll/periods/${selectedPeriodId}/approvals`, {
        business_id: currentBusinessId,
        period_id: selectedPeriodId,
        stage: approvalModalStage,
        action: approvalAction,
        comments: approvalComments || undefined,
      });

      toast.success(
        "Workflow Updated",
        `Approval stage ${approvalModalStage.replace("_", " ")} updated to ${approvalAction}.`
      );
      setApprovalModalStage(null);
      setApprovalComments("");
      fetchData(true);
      if (onRefreshPeriods) onRefreshPeriods();
    } catch (err: any) {
      toast.error("Approval Failed", err?.response?.data?.detail || "Could not record sign-off.");
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Handle Toggle Hold on a record
  const handleToggleHold = async () => {
    if (!holdRecord) return;
    setIsSubmittingHold(true);
    try {
      const willHold = !holdRecord.is_held;
      await apiClient.patch(`/payroll/records/${holdRecord.id}/hold`, {
        is_held: willHold,
        hold_reason: willHold ? holdReason : undefined,
      });

      toast.success(
        willHold ? "Salary Held" : "Salary Released",
        `Payslip for ${holdRecord.employee_name || "employee"} is now ${willHold ? "on hold" : "released"}.`
      );
      setHoldRecord(null);
      setHoldReason("");
      fetchData(true);
    } catch (err: any) {
      toast.error("Operation Failed", err?.response?.data?.detail || "Could not update salary hold status.");
    } finally {
      setIsSubmittingHold(false);
    }
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        !searchQuery ||
        (r.employee_name && r.employee_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.employee_code && r.employee_code.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesHold =
        holdFilter === "all"
          ? true
          : holdFilter === "held"
          ? Boolean(r.is_held)
          : !r.is_held;

      return matchesSearch && matchesHold;
    });
  }, [records, searchQuery, holdFilter]);

  const heldCount = useMemo(() => records.filter((r) => r.is_held).length, [records]);
  const totalNet = useMemo(
    () => records.reduce((acc, r) => acc + (r.net_salary || 0), 0),
    [records]
  );
  const heldNet = useMemo(
    () => records.filter((r) => r.is_held).reduce((acc, r) => acc + (r.net_salary || 0), 0),
    [records]
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Period Selector */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Salary Approval & Hold Management
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-tier governance workflow (HR → Finance → Management) and individual salary release controls
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-600 shrink-0">
              Active Period:
            </label>
            <select
              value={selectedPeriodId}
              onChange={(e) => {
                const val = e.target.value;
                startTransition(() => {
                  setSelectedPeriodId(val);
                });
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status.toUpperCase()})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => fetchData(true)}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Period Summary Metric Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
            <div className="text-[10px] font-bold uppercase text-slate-400">Total Headcount</div>
            <div className="text-sm font-bold text-slate-800 mt-0.5">{records.length} Employees</div>
          </div>
          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
            <div className="text-[10px] font-bold uppercase text-slate-400">Gross Payroll Volume</div>
            <div className="text-sm font-bold text-emerald-600 mt-0.5">৳ {totalNet.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
            <div className="text-[10px] font-bold uppercase text-amber-600">Salaries on Hold</div>
            <div className="text-sm font-bold text-amber-700 mt-0.5">
              {heldCount} on Hold (৳ {heldNet.toLocaleString("en-BD", { minimumFractionDigits: 2 })})
            </div>
          </div>
          <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
            <div className="text-[10px] font-bold uppercase text-indigo-600">Ready for Disbursement</div>
            <div className="text-sm font-bold text-indigo-700 mt-0.5">
              {records.length - heldCount} Employees (৳ {(totalNet - heldNet).toLocaleString("en-BD", { minimumFractionDigits: 2 })})
            </div>
          </div>
        </div>
      </div>

      {/* 3-Tier Approval Flow Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stage 1: HR Review */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                Stage 1
              </span>
              {hrStatus.status === "approved" ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                </span>
              ) : hrStatus.status === "rejected" ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600">
                  <XCircle className="w-3.5 h-3.5" /> Rejected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600">
                  <Clock className="w-3.5 h-3.5" /> Pending Review
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-800">HR Attendance & Leave Audit</h3>
            <p className="text-xs text-slate-500 mt-1">
              Validates attendance punches, approved leaves, unexcused absence cuts, and roster shifts.
            </p>

            {hrStatus.approval?.comments && (
              <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 italic">
                "{hrStatus.approval.comments}"
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setApprovalModalStage("hr_review");
                setApprovalAction("approved");
              }}
              className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors"
            >
              Sign Off
            </button>
            <button
              type="button"
              onClick={() => {
                setApprovalModalStage("hr_review");
                setApprovalAction("returned_for_revision");
              }}
              className="py-1.5 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
            >
              Return
            </button>
          </div>
        </div>

        {/* Stage 2: Finance Review */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                Stage 2
              </span>
              {financeStatus.status === "approved" ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                </span>
              ) : financeStatus.status === "rejected" ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600">
                  <XCircle className="w-3.5 h-3.5" /> Rejected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600">
                  <Clock className="w-3.5 h-3.5" /> Pending Review
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-800">Finance & Tax Reconciliation</h3>
            <p className="text-xs text-slate-500 mt-1">
              Audits progressive tax slabs (ITA 2023), PF contributions, loan EMI cuts, and bank balances.
            </p>

            {financeStatus.approval?.comments && (
              <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 italic">
                "{financeStatus.approval.comments}"
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setApprovalModalStage("finance_review");
                setApprovalAction("approved");
              }}
              className="flex-1 py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-2xs transition-colors"
            >
              Finance Sign Off
            </button>
            <button
              type="button"
              onClick={() => {
                setApprovalModalStage("finance_review");
                setApprovalAction("returned_for_revision");
              }}
              className="py-1.5 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
            >
              Return
            </button>
          </div>
        </div>

        {/* Stage 3: Management Sign-off */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Stage 3
              </span>
              {mgmtStatus.status === "approved" ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Authorized
                </span>
              ) : mgmtStatus.status === "rejected" ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600">
                  <XCircle className="w-3.5 h-3.5" /> Rejected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600">
                  <Clock className="w-3.5 h-3.5" /> Final Authorization
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-800">Management Disbursement Order</h3>
            <p className="text-xs text-slate-500 mt-1">
              Executive approval releasing the batch to generate bank advice letters and EFT transfer instructions.
            </p>

            {mgmtStatus.approval?.comments && (
              <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 italic">
                "{mgmtStatus.approval.comments}"
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setApprovalModalStage("management_sign_off");
                setApprovalAction("approved");
              }}
              className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors"
            >
              Executive Order
            </button>
            <button
              type="button"
              onClick={() => {
                setApprovalModalStage("management_sign_off");
                setApprovalAction("rejected");
              }}
              className="py-1.5 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
            >
              Halt Batch
            </button>
          </div>
        </div>
      </div>

      {/* Salary Hold Management Table Section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden relative">
        {/* Top Progress Bar on background fetch */}
        {isFetching && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden z-20">
            <div className="w-full h-full bg-gradient-to-r from-indigo-500 via-teal-500 to-indigo-500 animate-pulse" />
          </div>
        )}

        <div className="p-4 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BadgeAlert className="w-4 h-4 text-amber-500" />
              Employee Salary Hold Management
            </h3>
            <p className="text-xs text-slate-500">
              Hold individual salaries (e.g. pending exit clearance, disciplinary dispute) without halting the entire payroll batch.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  startTransition(() => setSearchQuery(val));
                }}
                placeholder="Search employee..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-48 focus:w-60 transition-all focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => startTransition(() => setHoldFilter("all"))}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  holdFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "hover:text-slate-900"
                }`}
              >
                All ({records.length})
              </button>
              <button
                type="button"
                onClick={() => startTransition(() => setHoldFilter("held"))}
                className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  holdFilter === "held" ? "bg-amber-500 text-white shadow-2xs" : "hover:text-slate-900"
                }`}
              >
                On Hold ({heldCount})
              </button>
              <button
                type="button"
                onClick={() => startTransition(() => setHoldFilter("active"))}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  holdFilter === "active" ? "bg-white text-slate-900 shadow-2xs" : "hover:text-slate-900"
                }`}
              >
                Active ({records.length - heldCount})
              </button>
            </div>
          </div>
        </div>

        {/* In-Place Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3">Employee</th>
                <th className="px-5 py-3 text-right">Gross Pay</th>
                <th className="px-5 py-3 text-right">Deductions</th>
                <th className="px-5 py-3 text-right">Net Payable</th>
                <th className="px-5 py-3">Hold Status</th>
                <th className="px-5 py-3">Reason / Hold Notes</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-100 text-xs transition-opacity duration-200 ${
                isFetching ? "opacity-75" : "opacity-100"
              }`}
            >
              {initialLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="h-3.5 bg-slate-100 rounded w-32 mb-1" />
                      <div className="h-2.5 bg-slate-100 rounded w-20" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="h-3 bg-slate-100 rounded w-16 ml-auto" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="h-3 bg-slate-100 rounded w-16 ml-auto" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="h-3 bg-slate-100 rounded w-20 ml-auto" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-5 bg-slate-100 rounded-full w-16" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3 bg-slate-100 rounded w-28" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="h-6 bg-slate-100 rounded w-20 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 leading-tight">
                        {r.employee_name || "Employee"}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {r.employee_code || r.employee_id}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-700">
                      ৳ {(r.gross_salary || 0).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-rose-600">
                      -৳ {(r.total_deduction || 0).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                      ৳ {(r.net_salary || 0).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5">
                      {r.is_held ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <PauseCircle className="w-3 h-3 text-amber-600" /> On Hold
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate">
                      {r.hold_reason || <span className="text-slate-300 italic">None</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {r.is_held ? (
                        <button
                          type="button"
                          onClick={() => {
                            setHoldRecord(r);
                            setHoldReason("");
                          }}
                          className="px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-semibold text-xs transition-colors inline-flex items-center gap-1"
                        >
                          <PlayCircle className="w-3 h-3" /> Release
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setHoldRecord(r);
                            setHoldReason("");
                          }}
                          className="px-2.5 py-1 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 font-semibold text-xs transition-colors inline-flex items-center gap-1"
                        >
                          <PauseCircle className="w-3 h-3" /> Put On Hold
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    No employee payslips found matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Stage Modal */}
      {approvalModalStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 capitalize">
                {approvalModalStage.replace("_", " ")} Sign-off
              </h3>
              <button
                type="button"
                onClick={() => setApprovalModalStage(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Decision</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setApprovalAction("approved")}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition-all ${
                      approvalAction === "approved"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalAction("returned_for_revision")}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition-all ${
                      approvalAction === "returned_for_revision"
                        ? "bg-amber-50 border-amber-500 text-amber-700 shadow-2xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Return
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalAction("rejected")}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition-all ${
                      approvalAction === "rejected"
                        ? "bg-rose-50 border-rose-500 text-rose-700 shadow-2xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Comments / Justification Note
                </label>
                <textarea
                  rows={3}
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder="Enter audit notes or review justification..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApprovalModalStage(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingApproval}
                onClick={handleSubmitApproval}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs disabled:opacity-50"
              >
                {isSubmittingApproval ? "Submitting..." : "Confirm Sign-off"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hold Reason Modal */}
      {holdRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4 text-xs">
            <div className="text-center">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${
                  holdRecord.is_held ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                }`}
              >
                {holdRecord.is_held ? <PlayCircle className="w-5 h-5" /> : <PauseCircle className="w-5 h-5" />}
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {holdRecord.is_held ? "Release Salary Hold?" : "Put Salary on Hold?"}
              </h3>
              <p className="text-slate-500 mt-1">
                For employee <strong className="text-slate-800">{holdRecord.employee_name}</strong> (৳{" "}
                {(holdRecord.net_salary || 0).toLocaleString("en-BD", { minimumFractionDigits: 2 })}).
              </p>
            </div>

            {!holdRecord.is_held && (
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Reason for Hold (Required)
                </label>
                <input
                  type="text"
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  placeholder="e.g. Clearance pending, Exit handover, Bank info dispute"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setHoldRecord(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingHold || (!holdRecord.is_held && !holdReason.trim())}
                onClick={handleToggleHold}
                className={`px-4 py-2 rounded-xl text-white font-semibold shadow-xs disabled:opacity-50 ${
                  holdRecord.is_held
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {isSubmittingHold
                  ? "Saving..."
                  : holdRecord.is_held
                  ? "Release Salary"
                  : "Confirm Hold"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
