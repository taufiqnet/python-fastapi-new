"use client";

import React, { useState } from "react";
import { apiClient } from "@/lib/api-client";
import {
  LeaveTypeOut,
  LeaveCarryForwardPreviewResponse,
  LeaveCarryForwardPreviewItem,
  LeaveCarryForwardExecuteResponse,
} from "@/types";
import {
  X,
  Layers,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  ShieldCheck,
  Search,
  Loader2,
} from "lucide-react";

interface CarryForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leaveTypes: LeaveTypeOut[];
}

export function CarryForwardModal({
  isOpen,
  onClose,
  onSuccess,
  leaveTypes,
}: CarryForwardModalProps) {
  const currentYear = new Date().getFullYear();
  const [fromYear, setFromYear] = useState<number>(currentYear - 1);
  const [toYear, setToYear] = useState<number>(currentYear);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<string>("");
  const [maxCap, setMaxCap] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [step, setStep] = useState<"configure" | "preview" | "complete">("configure");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [previewData, setPreviewData] = useState<LeaveCarryForwardPreviewResponse | null>(null);
  const [executeResult, setExecuteResult] = useState<LeaveCarryForwardExecuteResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  if (!isOpen) return null;

  const handleSimulate = async () => {
    if (fromYear >= toYear) {
      setError("Source year must be earlier than target year.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        from_year: fromYear,
        to_year: toYear,
        leave_type_id: selectedLeaveTypeId || null,
        max_cap: maxCap ? parseFloat(maxCap) : null,
      };

      const res = await apiClient.post<LeaveCarryForwardPreviewResponse>(
        "/leave-allocations/carry-forward/preview",
        payload
      );
      setPreviewData(res.data);
      setStep("preview");
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Simulation failed. Please verify parameters.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        from_year: fromYear,
        to_year: toYear,
        leave_type_id: selectedLeaveTypeId || null,
        max_cap: maxCap ? parseFloat(maxCap) : null,
        notes: notes.trim() || `Year-end batch processed for ${fromYear} -> ${toYear}`,
      };

      const res = await apiClient.post<LeaveCarryForwardExecuteResponse>(
        "/leave-allocations/carry-forward/execute",
        payload
      );
      setExecuteResult(res.data);
      setStep("complete");
      onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to execute carry forward process.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = (previewData?.items || []).filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.employee_name.toLowerCase().includes(q) ||
      item.employee_code.toLowerCase().includes(q) ||
      item.department_name.toLowerCase().includes(q) ||
      item.leave_type_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Yearly Leave Carry Forward Process</h2>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Statutory Year-End Quota Transition (BLA 2006 Rules)
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
                <p className="font-semibold">Processing Error</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* STEP 1: CONFIGURE */}
          {step === "configure" && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Bangladesh Labour Act (BLA 2006) Year-End Invariant</p>
                  <p className="text-[11px] text-indigo-800 leading-relaxed">
                    Casual Leave (10 days) and Sick Leave (14 days) strictly <strong>lapse on December 31</strong>.
                    Only <strong>Earned / Annual Leave</strong> is cumulative and eligible for statutory carry forward (subject to cap).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Source Year (From Year) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={fromYear}
                    onChange={(e) => setFromYear(parseInt(e.target.value) || currentYear - 1)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Target Year (To Year) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={toYear}
                    onChange={(e) => setToYear(parseInt(e.target.value) || currentYear)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Target Leave Policy
                  </label>
                  <select
                    value={selectedLeaveTypeId}
                    onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                  >
                    <option value="">-- All Active Leave Types --</option>
                    {leaveTypes.map((lt) => (
                      <option key={lt.id} value={lt.id}>
                        {lt.name} ({lt.code}) - {lt.carry_forward ? "Carry-Forward Eligible" : "Non-Cumulative (Lapses)"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Statutory Carry Forward Cap Limit (Days)
                  </label>
                  <input
                    type="number"
                    value={maxCap}
                    onChange={(e) => setMaxCap(e.target.value)}
                    placeholder="e.g. 40 or 60 (BLA statutory ceiling)"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Leave blank to use default (2x max days or 60 days).
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Audit Notes / Reference
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional administrative notes for this annual transition..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSimulate}
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simulate & Preview Breakdown</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SIMULATION PREVIEW */}
          {step === "preview" && previewData && (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Active Staff</span>
                  <p className="text-xl font-black text-slate-900 mt-0.5">{previewData.total_employees}</p>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Days to Carry Forward</span>
                  <p className="text-xl font-black text-emerald-700 mt-0.5">+{previewData.total_carried_days}d</p>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Days Lapsed</span>
                  <p className="text-xl font-black text-rose-700 mt-0.5">{previewData.total_lapsed_days}d</p>
                </div>
              </div>

              {/* Search Toolbar */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search preview by employee or department..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
                <span className="text-xs text-slate-500">
                  Showing {filteredItems.length} of {previewData.items.length} records
                </span>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[360px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Employee</th>
                      <th className="py-2.5 px-3">Leave Policy</th>
                      <th className="py-2.5 px-3 text-right">{fromYear} Balance</th>
                      <th className="py-2.5 px-3 text-right">Carry Forward</th>
                      <th className="py-2.5 px-3 text-right">Lapsed</th>
                      <th className="py-2.5 px-3 text-right">{toYear} Starting</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item, idx) => (
                      <tr key={`${item.employee_id}-${item.leave_type_id}-${idx}`} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3">
                          <p className="font-bold text-slate-800">{item.employee_name}</p>
                          <p className="text-[10px] text-slate-400">{item.employee_code} • {item.department_name}</p>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-semibold text-slate-700">{item.leave_type_name}</span>
                          <span className="text-[10px] text-slate-400 block">
                            {item.carry_forward_allowed ? "Eligible" : "Lapses"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-slate-600">
                          {item.from_year_balance}d
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-600">
                          +{item.proposed_carry_forward}d
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-rose-500">
                          {item.proposed_lapsed > 0 ? `-${item.proposed_lapsed}d` : "0d"}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-indigo-700">
                          {item.projected_starting_balance}d
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep("configure")}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition-colors"
                >
                  Back to Parameters
                </button>

                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={loading}
                  className="px-6 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm & Commit Carry Forward</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: COMPLETED */}
          {step === "complete" && executeResult && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">Carry Forward Completed Successfully!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {executeResult.message}
                </p>
              </div>

              <div className="inline-flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Allocations Updated</span>
                  <p className="text-base font-black text-slate-800">{executeResult.allocations_created_or_updated}</p>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Total Carried</span>
                  <p className="text-base font-black text-emerald-600">+{executeResult.total_carried_days}d</p>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Total Lapsed</span>
                  <p className="text-base font-black text-rose-600">{executeResult.total_lapsed_days}d</p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setStep("configure");
                  }}
                  className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
