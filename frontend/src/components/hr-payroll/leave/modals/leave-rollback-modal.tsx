"use client";

import React, { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { LeaveApplicationOut, LeaveTypeOut, EmployeeOut } from "@/types";
import { X, RotateCcw, AlertCircle, ShieldAlert } from "lucide-react";

interface LeaveRollbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  application: LeaveApplicationOut | null;
  leaveTypes: LeaveTypeOut[];
  employees: EmployeeOut[];
}

export function LeaveRollbackModal({
  isOpen,
  onClose,
  onSuccess,
  application,
  leaveTypes,
  employees,
}: LeaveRollbackModalProps) {
  const [actorId, setActorId] = useState<string>(employees[0]?.id || "");
  const [reason, setReason] = useState<string>("");
  const [forceOverride, setForceOverride] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !application) return null;

  const applicant = employees.find((e) => e.id === application.employee_id);
  const leaveType = leaveTypes.find((t) => t.id === application.leave_type_id);

  const handleRollback = async () => {
    if (!reason.trim()) {
      setError("Please provide an explicit rationale for rolling back this approved leave.");
      return;
    }
    if (!actorId) {
      setError("Please select the manager/authority authorized to execute the rollback.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient.post(`/leave-applications/${application.id}/rollback`, {
        reason: reason.trim(),
        actor_id: actorId,
        force_override: forceOverride,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to rollback leave application approval.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-900 via-slate-900 to-amber-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Rollback Leave Approval</h2>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Revert approved leave back to pending & restore allocated quota.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Rollback Error</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Request Information Summary */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Applicant</span>
                <p className="font-bold text-slate-800">{applicant?.full_name || "Employee"}</p>
                <p className="text-[11px] text-slate-500">ID: {applicant?.employee_id || "N/A"}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Leave Type</span>
                <p className="font-bold text-indigo-600">
                  {leaveType?.name || "Leave"} ({leaveType?.code || "LT"})
                </p>
                <p className="text-[11px] font-bold text-amber-700">
                  {application.total_days} Day(s) to Restore
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 flex items-center justify-between pt-1">
              <span>Date Span: <strong>{application.start_date} → {application.end_date}</strong></span>
              <span>Status: <span className="uppercase text-emerald-600 font-bold">Approved</span></span>
            </div>
          </div>

          {/* Payroll Lock Guard Warning */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Statutory Payroll Lock Guard</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                If the month covering these dates is in a <strong>Locked or Paid Payroll Period</strong>, the system restricts rollback to maintain financial ledger consistency.
              </p>
            </div>
          </div>

          {/* Actor Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Authorized Authority / Manager <span className="text-rose-500">*</span>
            </label>
            <select
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-white"
            >
              <option value="">-- Choose Manager --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.employee_id || "ID"})
                </option>
              ))}
            </select>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Rollback Rationale / Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this approved request is being rolled back (e.g. employee reported to duty, approval given in error, date modification required)..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 resize-none"
            />
          </div>

          {/* Force Override Option */}
          <div className="pt-1 flex items-center gap-2">
            <input
              type="checkbox"
              id="forceOverride"
              checked={forceOverride}
              onChange={(e) => setForceOverride(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
            />
            <label htmlFor="forceOverride" className="text-xs text-slate-600 cursor-pointer">
              Force override locked payroll check (Requires Superuser Privileges)
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleRollback}
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-60"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{loading ? "Processing Rollback..." : "Confirm Rollback to Pending"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
