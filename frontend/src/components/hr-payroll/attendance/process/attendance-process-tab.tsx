"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { AttendancePeriodApproval } from "@/types";
import {
  Cpu,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCw,
  Calendar,
  Users,
  Clock,
  ShieldAlert,
  ShieldCheck,
  FileSpreadsheet,
} from "lucide-react";

interface AttendanceProcessTabProps {
  currentBusinessId: number;
}

export function AttendanceProcessTab({ currentBusinessId }: AttendanceProcessTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Consolidation Runner State
  const [fromDate, setFromDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [runningConsolidation, setRunningConsolidation] = useState<boolean>(false);
  const [consolidationResult, setConsolidationResult] = useState<{
    processed_count?: number;
    updated_count?: number;
    message?: string;
  } | null>(null);

  // Period Approval State
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [periodApproval, setPeriodApproval] = useState<AttendancePeriodApproval | null>(null);
  const [fetchingPeriod, setFetchingPeriod] = useState<boolean>(false);
  const [updatingPeriod, setUpdatingPeriod] = useState<boolean>(false);
  const [targetStatus, setTargetStatus] = useState<AttendancePeriodApproval["status"]>("draft");
  const [periodComments, setPeriodComments] = useState<string>("");

  const fetchPeriodData = useCallback(async () => {
    setFetchingPeriod(true);
    try {
      const res = await apiClient.get<AttendancePeriodApproval>(
        `/attendance/period-approvals?business_id=${currentBusinessId}&year=${selectedYear}&month=${selectedMonth}`
      );
      if (res.data) {
        setPeriodApproval(res.data);
        setTargetStatus(res.data.status);
        setPeriodComments(res.data.comments || "");
      } else {
        setPeriodApproval(null);
      }
    } catch {
      setPeriodApproval(null);
    } finally {
      setFetchingPeriod(false);
    }
  }, [currentBusinessId, selectedYear, selectedMonth]);

  useEffect(() => {
    fetchPeriodData();
  }, [fetchPeriodData]);

  const handleRunConsolidation = async () => {
    setRunningConsolidation(true);
    setConsolidationResult(null);
    try {
      const res = await apiClient.post<any>("/attendance/consolidate", {
        business_id: currentBusinessId,
        from_date: fromDate,
        to_date: toDate,
      });

      setConsolidationResult(res.data);
      toast.success(
        "Consolidation Completed",
        res.data.message || `Consolidated attendance successfully for ${fromDate} to ${toDate}.`
      );
      fetchPeriodData();
    } catch (err: any) {
      toast.error(
        "Consolidation Failed",
        err.response?.data?.detail || "Could not complete attendance consolidation."
      );
    } finally {
      setRunningConsolidation(false);
    }
  };

  const handleUpdatePeriodApproval = async () => {
    setUpdatingPeriod(true);
    try {
      const res = await apiClient.post<AttendancePeriodApproval>("/attendance/period-approvals", {
        business_id: currentBusinessId,
        year: selectedYear,
        month: selectedMonth,
        status: targetStatus,
        comments: periodComments || null,
      });

      setPeriodApproval(res.data);
      toast.success(
        "Period Status Updated",
        `Attendance period ${selectedYear}-${String(selectedMonth).padStart(2, "0")} is now marked as ${targetStatus.toUpperCase()}.`
      );
    } catch (err: any) {
      toast.error("Update Failed", err.response?.data?.detail || "Could not update period approval status.");
    } finally {
      setUpdatingPeriod(false);
    }
  };

  const getStatusColor = (status: AttendancePeriodApproval["status"]) => {
    switch (status) {
      case "locked":
        return "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300";
      case "approved":
        return "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300";
      case "under_review":
        return "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300";
      default:
        return "text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-primary-600" />
            Attendance Consolidation & Period Approval
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Reconcile raw biometric punches, regularizations, and outdoor duties into official daily records, then lock the period prior to payroll disbursement.
          </p>
        </div>

        <button
          onClick={fetchPeriodData}
          disabled={fetchingPeriod}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${fetchingPeriod ? "animate-spin text-primary-600" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Batch Attendance Consolidation Engine */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary-50 dark:bg-primary-950/50 rounded-xl text-primary-600 dark:text-primary-400">
                  <Play className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Daily Consolidation Engine
                  </h3>
                  <p className="text-xs text-slate-500">
                    Runs the multi-source attendance synchronization pipeline.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
              Consolidation merges <strong>raw biometric punches</strong>, <strong>approved outdoor duties</strong>, and <strong>manual regularizations</strong>. It computes daily work hours and overtime according to business shift policies.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {consolidationResult && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs mb-5 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Consolidation Succeeded</div>
                  <div className="mt-0.5">{consolidationResult.message || "Attendance updated."}</div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={handleRunConsolidation}
              disabled={runningConsolidation}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm transition-all shadow-md shadow-primary-600/20 active:scale-95 disabled:opacity-50"
            >
              {runningConsolidation ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing Attendance...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Run Consolidation Batch
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card 2: Period Approval & Audit Lock Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 dark:bg-purple-950/50 rounded-xl text-purple-600 dark:text-purple-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Monthly Period Approval & Lock
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verify totals and lock records to ensure payroll immutability.
                  </p>
                </div>
              </div>

              {periodApproval && (
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${getStatusColor(
                    periodApproval.status
                  )}`}
                >
                  {periodApproval.status}
                </span>
              )}
            </div>

            {/* Period Picker */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1).toLocaleString("default", { month: "long" })}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
                <div className="text-xs text-slate-400">Present Days</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-1">
                  {periodApproval ? periodApproval.present_days_total : "—"}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
                <div className="text-xs text-slate-400">Absent Days</div>
                <div className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono mt-1">
                  {periodApproval ? periodApproval.absent_days_total : "—"}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
                <div className="text-xs text-slate-400">Leave Days</div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono mt-1">
                  {periodApproval ? periodApproval.leave_days_total : "—"}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
                <div className="text-xs text-slate-400">OT Hours</div>
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-1">
                  {periodApproval ? `${periodApproval.ot_hours_total}h` : "—"}
                </div>
              </div>
            </div>

            {/* Change Status & Comments */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Period Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) =>
                    setTargetStatus(e.target.value as AttendancePeriodApproval["status"])
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 font-medium"
                >
                  <option value="draft">Draft (Work in Progress)</option>
                  <option value="under_review">Under Review (HR Audit)</option>
                  <option value="approved">Approved (Ready for Payroll)</option>
                  <option value="locked">Locked (Permanent Freeze)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Audit Notes / Comments
                </label>
                <input
                  type="text"
                  placeholder="e.g. Audited by HR Manager, all regularizations verified."
                  value={periodComments}
                  onChange={(e) => setPeriodComments(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end mt-4">
            <button
              onClick={handleUpdatePeriodApproval}
              disabled={updatingPeriod}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition-all shadow-md shadow-purple-600/20 active:scale-95 disabled:opacity-50"
            >
              {updatingPeriod ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : targetStatus === "locked" ? (
                <>
                  <Lock className="w-4 h-4" />
                  Lock Attendance Period
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Save Period Status
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
