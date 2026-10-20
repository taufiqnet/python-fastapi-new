"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { LeaveTypeOut, EmployeeOut, LeaveAllocationOut } from "@/types";
import { X, Calendar, AlertCircle, CheckCircle2, FileText, Link as LinkIcon, Info } from "lucide-react";

interface LeaveApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leaveTypes: LeaveTypeOut[];
  employees: EmployeeOut[];
  allocations: LeaveAllocationOut[];
  businessId?: number | null;
}

export function LeaveApplicationModal({
  isOpen,
  onClose,
  onSuccess,
  leaveTypes,
  employees,
  allocations,
  businessId,
}: LeaveApplicationModalProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  const [employeeId, setEmployeeId] = useState<string>("");
  const [leaveTypeId, setLeaveTypeId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [reason, setReason] = useState<string>("");
  const [documentUrl, setDocumentUrl] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmployeeId(employees[0]?.id || "");
      setLeaveTypeId(leaveTypes[0]?.id || "");
      setStartDate(todayStr);
      setEndDate(todayStr);
      setReason("");
      setDocumentUrl("");
      setError(null);
    }
  }, [isOpen, employees, leaveTypes, todayStr]);

  if (!isOpen) return null;

  // Selected entities
  const selectedEmployee = employees.find((e) => e.id === employeeId);
  const selectedLeaveType = leaveTypes.find((t) => t.id === leaveTypeId);

  // Compute total days requested
  let calculatedDays = 0;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
  }

  // Find allocation for the employee, leave type, and year
  const applicationYear = startDate ? new Date(startDate).getFullYear() : new Date().getFullYear();
  const matchedAllocation = allocations.find(
    (a) =>
      a.employee_id === employeeId &&
      a.leave_type_id === leaveTypeId &&
      Number(a.year) === Number(applicationYear)
  );

  const remainingBalance = matchedAllocation ? Number(matchedAllocation.remaining_days) : null;
  const isUnlimited = selectedLeaveType ? selectedLeaveType.max_days_per_year === 0 : false;
  const isBalanceInsufficient = !isUnlimited && remainingBalance !== null && calculatedDays > remainingBalance;

  // Gender check
  const isGenderMismatch =
    selectedLeaveType &&
    selectedLeaveType.applicable_gender !== "all" &&
    selectedEmployee?.gender &&
    selectedEmployee.gender.toLowerCase() !== selectedLeaveType.applicable_gender.toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (calculatedDays <= 0) {
      setError("Start date cannot be after end date.");
      return;
    }

    if (isGenderMismatch) {
      setError(`This leave policy is restricted to ${selectedLeaveType?.applicable_gender} staff.`);
      return;
    }

    if (selectedLeaveType?.requires_document && !documentUrl.trim()) {
      setError("Supporting medical or verification document URL is mandatory for this leave policy.");
      return;
    }

    if (isBalanceInsufficient) {
      setError(
        `Insufficient leave balance! You have ${remainingBalance} day(s) available, but requested ${calculatedDays} day(s).`
      );
      return;
    }

    setLoading(true);

    const payload = {
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      start_date: startDate,
      end_date: endDate,
      total_days: calculatedDays,
      reason: reason.trim(),
      document_url: documentUrl.trim() || null,
      business_id: businessId || 1,
    };

    try {
      await apiClient.post("/leave-applications", payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to submit leave application.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div>
            <h2 className="text-base font-bold">Apply for Leave</h2>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              Submit an employee leave request with automatic balance validation.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Application Issue</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Applicant Employee <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white transition-colors"
            >
              <option value="">-- Choose Employee --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.employee_id || "No ID"}) {emp.department_name ? `- ${emp.department_name}` : (emp.department?.name ? `- ${emp.department.name}` : "")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Leave Policy / Type <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white transition-colors"
            >
              <option value="">-- Choose Leave Type --</option>
              {leaveTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.code}) - {type.is_paid ? "Paid" : "Unpaid"}
                </option>
              ))}
            </select>
          </div>

          {/* Live Balance Card */}
          <div className="p-3.5 rounded-xl border bg-slate-50 border-slate-200/80 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-600" />
                Live Balance Check ({applicationYear})
              </span>
              {isUnlimited ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Unlimited Policy
                </span>
              ) : matchedAllocation ? (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    remainingBalance && remainingBalance > 0
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {remainingBalance} Days Available
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  No Allocation Assigned
                </span>
              )}
            </div>

            {matchedAllocation ? (
              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                <div>
                  Allocated: <span className="font-bold text-slate-800">{matchedAllocation.allocated_days}d</span>
                </div>
                <div>
                  Used: <span className="font-bold text-slate-800">{matchedAllocation.used_days}d</span>
                </div>
                <div>
                  Remaining: <span className="font-bold text-indigo-600">{matchedAllocation.remaining_days}d</span>
                </div>
              </div>
            ) : !isUnlimited ? (
              <p className="text-[11px] text-amber-600 mt-1">
                Warning: No allocation record for Year {applicationYear}. Approval requires an allocation or will be rejected by policy.
              </p>
            ) : null}
          </div>

          {/* Dates & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Calculated Duration Display */}
          <div className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs">
            <span className="font-bold text-indigo-900">Requested Leave Duration:</span>
            <span className="font-mono font-bold text-indigo-600 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">
              {calculatedDays > 0 ? `${calculatedDays} Calendar Day(s)` : "Invalid date range"}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Reason for Absence <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State clear purpose or medical reason for the leave request..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Supporting Document Link / Certificate URL</span>
              {selectedLeaveType?.requires_document && (
                <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Required by Policy</span>
              )}
            </label>
            <div className="relative">
              <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="url"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                placeholder="https://storage.company.com/leave-docs/certificate.pdf"
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || calculatedDays <= 0 || isBalanceInsufficient}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{loading ? "Submitting..." : "Submit Application"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
