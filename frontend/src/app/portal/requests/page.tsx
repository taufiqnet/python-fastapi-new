"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { AttendanceCorrectionRequest } from "@/types";
import { useToast } from "@/context/toast-context";
import {
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  X,
  Loader2,
  ArrowRightLeft,
} from "lucide-react";

interface LeaveAppRow {
  id: string;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  applied_at: string;
  review_note?: string | null;
}

interface LeaveTypeOption {
  id: string;
  name: string;
  code: string;
}

export default function PortalRequestsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"leave" | "attendance">("leave");
  const [leaveApps, setLeaveApps] = useState<LeaveAppRow[]>([]);
  const [corrections, setCorrections] = useState<AttendanceCorrectionRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Leave Modal State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Attendance Correction Modal State
  const [isAttModalOpen, setIsAttModalOpen] = useState(false);
  const [attDate, setAttDate] = useState("");
  const [reqType, setReqType] = useState<"missed_punch" | "late_excuse" | "work_on_holiday">("missed_punch");
  const [timeIn, setTimeIn] = useState("09:00");
  const [timeOut, setTimeOut] = useState("18:00");
  const [attReason, setAttReason] = useState("");
  const [isSubmittingAtt, setIsSubmittingAtt] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [lRes, cRes, ltRes] = await Promise.allSettled([
        apiClient.get<any[]>("/leave-applications"),
        apiClient.get<AttendanceCorrectionRequest[]>("/portal/attendance/correction-requests"),
        apiClient.get<any[]>("/leave-types"),
      ]);

      if (lRes.status === "fulfilled") {
        const raw = lRes.value.data || [];
        setLeaveApps(
          raw.map((item: any) => ({
            id: item.id,
            leave_type_name: item.leave_type?.name || "Leave",
            start_date: item.start_date,
            end_date: item.end_date,
            total_days: item.total_days,
            reason: item.reason,
            status: item.status,
            applied_at: item.applied_at || item.created_at,
            review_note: item.review_note,
          }))
        );
      }

      if (cRes.status === "fulfilled") {
        setCorrections(cRes.value.data || []);
      }

      if (ltRes.status === "fulfilled") {
        const types = (ltRes.value.data || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          code: t.code,
        }));
        setLeaveTypes(types);
        if (types.length > 0) setLeaveTypeId(types[0].id);
      }
    } catch {
      toast.error("Failed", "Unable to load requests data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveTypeId || !startDate || !endDate || !leaveReason) {
      toast.error("Validation Error", "Please fill out all required fields.");
      return;
    }
    setIsSubmittingLeave(true);
    try {
      await apiClient.post("/leave-applications", {
        leave_type_id: leaveTypeId,
        start_date: startDate,
        end_date: endDate,
        reason: leaveReason,
      });
      toast.success("Leave Application Submitted", "Routed to management for review.");
      setIsLeaveModalOpen(false);
      setStartDate("");
      setEndDate("");
      setLeaveReason("");
      loadData();
    } catch (err: any) {
      toast.error("Submission Failed", err.response?.data?.detail || "Could not apply for leave.");
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleApplyCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attDate || !attReason) {
      toast.error("Validation Error", "Please provide date and reason.");
      return;
    }
    setIsSubmittingAtt(true);
    try {
      await apiClient.post("/portal/attendance/correction-requests", {
        attendance_date: attDate,
        request_type: reqType,
        requested_time_in: timeIn,
        requested_time_out: timeOut,
        reason: attReason,
      });
      toast.success("Correction Request Submitted", "HR will review your regularisation.");
      setIsAttModalOpen(false);
      setAttDate("");
      setAttReason("");
      loadData();
    } catch (err: any) {
      toast.error("Submission Failed", err.response?.data?.detail || "Could not submit correction.");
    } finally {
      setIsSubmittingAtt(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("leave")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "leave"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Leave Applications
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "attendance"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Attendance Regularisation
          </button>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "leave" ? (
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Apply for Leave</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAttModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Request Punch Correction</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs text-slate-500">Loading your self-service requests...</p>
        </div>
      ) : activeTab === "leave" ? (
        /* ================= LEAVE APPLICATIONS TABLE ================= */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Submitted Leave History</h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {leaveApps.length} Applications
            </span>
          </div>

          {leaveApps.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No leave applications submitted yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Days</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Review Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaveApps.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {l.leave_type_name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {l.start_date} to {l.end_date}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                        {l.total_days} {l.total_days === 1 ? "day" : "days"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{l.reason}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            l.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : l.status === "rejected"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 italic">{l.review_note || "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ================= ATTENDANCE REGULARISATION TABLE ================= */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Attendance Correction Requests</h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {corrections.length} Requests
            </span>
          </div>

          {corrections.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No attendance corrections submitted.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Requested Timings</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">HR Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {corrections.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        {c.attendance_date}
                      </td>
                      <td className="py-3.5 px-4 capitalize font-medium text-slate-700">
                        {c.request_type.replace("_", " ")}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {c.requested_time_in || "--:--"} - {c.requested_time_out || "--:--"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{c.reason}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            c.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : c.status === "rejected"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 italic">{c.review_notes || "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Leave Application Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Apply for Leave</h3>
              <button onClick={() => setIsLeaveModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Leave Type</label>
                <select
                  value={leaveTypeId}
                  onChange={(e) => setLeaveTypeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reason for Leave</label>
                <textarea
                  rows={3}
                  required
                  placeholder="State the purpose of absence..."
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLeave}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {isSubmittingLeave ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Correction Modal */}
      {isAttModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Attendance Regularisation</h3>
              <button onClick={() => setIsAttModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyCorrection} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Correction Type</label>
                  <select
                    value={reqType}
                    onChange={(e: any) => setReqType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="missed_punch">Missed Punch</option>
                    <option value="late_excuse">Late Arrival Excuse</option>
                    <option value="work_on_holiday">Work on Holiday/Weekend</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Check In Time</label>
                  <input
                    type="time"
                    value={timeIn}
                    onChange={(e) => setTimeIn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Check Out Time</label>
                  <input
                    type="time"
                    value={timeOut}
                    onChange={(e) => setTimeOut(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Justification Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain device malfunction or travel delay..."
                  value={attReason}
                  onChange={(e) => setAttReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAttModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAtt}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {isSubmittingAtt ? "Submitting..." : "Submit Correction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
