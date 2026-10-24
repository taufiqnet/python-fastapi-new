"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import {
  LeaveTypeOut,
  EmployeeOut,
  LeaveAllocationOut,
  LeaveEncashmentOut,
} from "@/types";
import {
  X,
  Coins,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { SearchableEmployeeCombobox } from "@/components/common/searchable-employee-combobox";

interface LeaveEncashmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leaveTypes: LeaveTypeOut[];
  employees: EmployeeOut[];
  allocations: LeaveAllocationOut[];
  encashmentToReview?: LeaveEncashmentOut | null;
}

export function LeaveEncashmentModal({
  isOpen,
  onClose,
  onSuccess,
  leaveTypes,
  employees,
  allocations,
  encashmentToReview = null,
}: LeaveEncashmentModalProps) {
  const currentYear = new Date().getFullYear();

  // Mode: "create" or "review"
  const isReviewMode = !!encashmentToReview;

  const [employeeId, setEmployeeId] = useState<string>(employees[0]?.id || "");
  const [leaveTypeId, setLeaveTypeId] = useState<string>("");
  const [year, setYear] = useState<number>(currentYear);
  const [encashableDays, setEncashableDays] = useState<string>("5");
  const [reason, setReason] = useState<string>("");

  // Review mode fields
  const [reviewerId, setReviewerId] = useState<string>(employees[0]?.id || "");
  const [reviewNote, setReviewNote] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Eligible leave types under BLA 2006 (Annual Leave / Cumulative)
  const eligibleTypes = leaveTypes.filter(
    (lt) => lt.carry_forward || ["AL", "EL"].includes(lt.code.toUpperCase())
  );

  useEffect(() => {
    if (!leaveTypeId && eligibleTypes.length > 0) {
      setLeaveTypeId(eligibleTypes[0].id);
    }
  }, [eligibleTypes, leaveTypeId]);

  if (!isOpen) return null;

  // Selected employee & allocation details
  const currentEmpId = isReviewMode ? encashmentToReview.employee_id : employeeId;
  const currentLtId = isReviewMode ? encashmentToReview.leave_type_id : leaveTypeId;
  const currentYr = isReviewMode ? encashmentToReview.year : year;

  const selectedEmployee = employees.find((e) => e.id === currentEmpId);
  const selectedLeaveType = leaveTypes.find((lt) => lt.id === currentLtId);
  const selectedAllocation = allocations.find(
    (a) => a.employee_id === currentEmpId && a.leave_type_id === currentLtId && Number(a.year) === Number(currentYr)
  );

  const availableDays = selectedAllocation ? selectedAllocation.remaining_days : 0;

  // Rough estimation of daily rate for preview
  const estimatedBasic = 15000; // estimated default or extracted
  const estimatedDailyRate = Math.round((estimatedBasic / 30.0) * 100) / 100;
  const requestedDaysNum = parseFloat(encashableDays) || 0;
  const estimatedTotal = Math.round(requestedDaysNum * estimatedDailyRate * 100) / 100;

  const handleCreateEncashment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestedDaysNum <= 0) {
      setError("Please specify a valid number of days to encash.");
      return;
    }
    if (requestedDaysNum > availableDays) {
      setError(`Requested days (${requestedDaysNum}) exceeds employee remaining balance (${availableDays}d).`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        employee_id: employeeId,
        leave_type_id: leaveTypeId,
        year: year,
        encashable_days: requestedDaysNum,
        reason: reason.trim() || "Annual leave encashment request",
        business_id: selectedEmployee?.business_id || 1,
      };

      await apiClient.post("/leave-encashments", payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to create leave encashment request.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleReviewDecision = async (decision: "approved" | "rejected") => {
    if (!reviewerId) {
      setError("Please select the reviewing manager.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient.post(`/leave-encashments/${encashmentToReview?.id}/review`, {
        status: decision,
        reviewed_by_id: reviewerId,
        review_note: reviewNote.trim() || null,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || `Failed to ${decision} encashment.`;
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {isReviewMode ? "Review Leave Encashment" : "New Leave Encashment Request"}
              </h2>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Bangladesh Labour Act (BLA 2006 § 117) Annual Leave Payout
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
                <p className="font-semibold">Action Error</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Statutory Notice */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">BLA 2006 § 117 Encashment Formula</p>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Daily Rate is calculated from employee Basic Wages: <strong>Daily Rate = Basic Salary / 30</strong>.
                Approved encashed days are immediately deducted from the employee&apos;s annual quota so they cannot be taken or carried forward.
              </p>
            </div>
          </div>

          {!isReviewMode ? (
            /* CREATE FORM */
            <form onSubmit={handleCreateEncashment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Employee <span className="text-rose-500">*</span>
                </label>
                <SearchableEmployeeCombobox
                  employees={employees}
                  value={employeeId}
                  onChange={(empId) => setEmployeeId(empId)}
                  placeholder="Search & select employee..."
                  allowClear={false}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Eligible Leave Policy <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={leaveTypeId}
                    onChange={(e) => setLeaveTypeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                  >
                    {eligibleTypes.map((lt) => (
                      <option key={lt.id} value={lt.id}>
                        {lt.name} ({lt.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Year <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value) || currentYear)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Balance & Daily Rate Information Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Available Remaining Balance:</span>
                  <span className={`font-bold ${availableDays > 0 ? "text-emerald-700" : "text-rose-600"}`}>
                    {availableDays} Day(s)
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Calculated Daily Basic Rate:</span>
                  <span className="font-semibold text-slate-800">
                    ৳{estimatedDailyRate.toFixed(2)} / day
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Number of Days to Encash <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max={availableDays > 0 ? availableDays : 100}
                    value={encashableDays}
                    onChange={(e) => setEncashableDays(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 pr-24"
                  />
                  <div className="absolute right-3 top-2 text-xs font-bold text-emerald-700">
                    ≈ ৳{estimatedTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Reason / Settlement Context
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Annual unavailed leave settlement, separation encashment..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 resize-none"
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
                  type="submit"
                  disabled={loading || availableDays <= 0}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>{loading ? "Submitting..." : "Submit Encashment Request"}</span>
                </button>
              </div>
            </form>
          ) : (
            /* REVIEW MODE */
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Applicant</span>
                    <p className="font-bold text-slate-800">{selectedEmployee?.full_name}</p>
                    <p className="text-[11px] text-slate-500">ID: {selectedEmployee?.employee_id}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Payout</span>
                    <p className="text-base font-black text-emerald-700">৳{encashmentToReview.total_amount}</p>
                    <p className="text-[11px] text-slate-500">
                      {encashmentToReview.encashable_days} Days @ ৳{encashmentToReview.daily_rate}/day
                    </p>
                  </div>
                </div>

                <div className="text-slate-600 pt-1">
                  <p>Reason: <span className="font-medium text-slate-800">{encashmentToReview.reason || "N/A"}</span></p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Reviewing Authority / Manager <span className="text-rose-500">*</span>
                </label>
                <SearchableEmployeeCombobox
                  employees={employees}
                  value={reviewerId}
                  onChange={(empId) => setReviewerId(empId)}
                  placeholder="Search & select reviewing manager..."
                  allowClear={false}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Review Note / Decision Rationale
                </label>
                <textarea
                  rows={2}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="State review notes or instructions for payroll payout..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 resize-none"
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

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleReviewDecision("rejected")}
                    disabled={loading}
                    className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReviewDecision("approved")}
                    disabled={loading}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Deduct Quota</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
