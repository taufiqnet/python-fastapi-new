"use client";

import React, { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { LeaveApplicationOut, LeaveTypeOut, EmployeeOut } from "@/types";
import { X, CheckCircle2, XCircle, AlertCircle, FileText, Calendar, ExternalLink, ShieldAlert } from "lucide-react";
import { SearchableEmployeeCombobox } from "@/components/common/searchable-employee-combobox";

interface LeaveReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  application: LeaveApplicationOut | null;
  leaveTypes: LeaveTypeOut[];
  employees: EmployeeOut[];
}

export function LeaveReviewModal({
  isOpen,
  onClose,
  onSuccess,
  application,
  leaveTypes,
  employees,
}: LeaveReviewModalProps) {
  const [reviewerId, setReviewerId] = useState<string>(employees[0]?.id || "");
  const [reviewNote, setReviewNote] = useState<string>("");
  const [syncAttendance, setSyncAttendance] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !application) return null;

  const applicant = employees.find((e) => e.id === application.employee_id);
  const leaveType = leaveTypes.find((t) => t.id === application.leave_type_id);

  const handleDecision = async (status: "approved" | "rejected") => {
    if (!reviewerId) {
      setError("Please select a reviewing manager.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      status,
      reviewed_by_id: reviewerId,
      review_note: reviewNote.trim() || null,
      sync_attendance: syncAttendance,
    };

    try {
      await apiClient.post(`/leave-applications/${application.id}/review`, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || `Failed to ${status} leave application.`;
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div>
            <h2 className="text-base font-bold">Review Leave Request</h2>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              Evaluate applicant details, policy constraints, and decide leave approval.
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
        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Review Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Applicant & Request Info Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Applicant</span>
                <p className="text-sm font-bold text-slate-900">
                  {applicant?.full_name || "Employee"}
                </p>
                <p className="text-xs text-slate-500">
                  ID: {applicant?.employee_id || "N/A"} • {applicant?.department_name || applicant?.department?.name || "General Dept"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Leave Type</span>
                <p className="text-xs font-bold text-indigo-600">
                  {leaveType?.name || "Leave"} ({leaveType?.code || "LT"})
                </p>
                <p className="text-[11px] text-slate-500">
                  {leaveType?.is_paid ? "Full Wages (Paid)" : "Unpaid Leave"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400">Date Range:</span>
                <p className="font-semibold text-slate-800">
                  {application.start_date} to {application.end_date}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Requested Duration:</span>
                <p className="font-bold text-indigo-600">
                  {application.total_days} Day(s)
                </p>
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-xs">Application Reason:</span>
              <p className="text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 mt-1">
                {application.reason || "No description provided."}
              </p>
            </div>

            {application.document_url && (
              <div className="pt-1">
                <a
                  href={application.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Attached Medical / Supporting Document</span>
                </a>
              </div>
            )}
          </div>

          {/* Atomic Deduction Notice */}
          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Atomic Balance Enforcement</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Approving this request will automatically deduct <strong>{application.total_days} day(s)</strong> from the applicant&apos;s allocation balance for this year.
              </p>
            </div>
          </div>

          {/* Review Decision Inputs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Reviewing Manager / Authority <span className="text-rose-500">*</span>
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
              placeholder="State any manager instructions, conditions, or reason for decision..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="syncAttendanceReview"
              checked={syncAttendance}
              onChange={(e) => setSyncAttendance(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <label htmlFor="syncAttendanceReview" className="text-xs text-slate-600 cursor-pointer select-none">
              Automatically sync employee daily attendance as <strong>On Leave</strong> during this date range
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDecision("rejected")}
                disabled={loading}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-60"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>

              <button
                type="button"
                onClick={() => handleDecision("approved")}
                disabled={loading}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-60"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve & Deduct Quota</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
