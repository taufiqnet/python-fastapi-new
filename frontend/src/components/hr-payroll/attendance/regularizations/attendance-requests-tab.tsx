"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { AttendanceRegularization, EmployeeOut } from "@/types";
import {
  FileCheck2,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  User,
  AlertCircle,
  FileText,
  Building,
} from "lucide-react";

interface AttendanceRequestsTabProps {
  currentBusinessId: number;
  employees: EmployeeOut[];
}

export function AttendanceRequestsTab({
  currentBusinessId,
  employees,
}: AttendanceRequestsTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [regularizations, setRegularizations] = useState<AttendanceRegularization[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchEmp, setSearchEmp] = useState<string>("");
  const [selectedEmp, setSelectedEmp] = useState<string>("");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    attendance_date: new Date().toISOString().split("T")[0],
    request_type: "missed_in" as AttendanceRegularization["request_type"],
    requested_check_in: "09:00",
    requested_check_out: "18:00",
    reason: "",
    supporting_doc_url: "",
  });

  // Action / Approval Modal
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [reviewingItem, setReviewingItem] = useState<AttendanceRegularization | null>(null);
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected">("approved");
  const [reviewRemarks, setReviewRemarks] = useState<string>("");
  const [processingReview, setProcessingReview] = useState<boolean>(false);

  const fetchRegularizations = useCallback(
    async (isInitial = false) => {
      if (isInitial) setInitialLoading(true);
      else setIsFetching(true);

      try {
        const params = new URLSearchParams();
        params.set("business_id", String(currentBusinessId));
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (selectedEmp) params.set("employee_id", selectedEmp);

        const res = await apiClient.get<AttendanceRegularization[]>(
          `/attendance/regularizations?${params.toString()}`
        );
        setRegularizations(res.data || []);
      } catch (err: any) {
        toast.error("Error", err.response?.data?.detail || "Failed to load regularization requests.");
      } finally {
        if (isInitial) setInitialLoading(false);
        else setIsFetching(false);
      }
    },
    [currentBusinessId, statusFilter, selectedEmp, toast]
  );

  useEffect(() => {
    fetchRegularizations(true);
  }, [fetchRegularizations]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id) {
      toast.error("Validation Error", "Please select an employee.");
      return;
    }
    if (!formData.reason.trim()) {
      toast.error("Validation Error", "Please provide a valid reason.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        business_id: currentBusinessId,
        employee_id: formData.employee_id,
        attendance_date: formData.attendance_date,
        request_type: formData.request_type,
        requested_check_in:
          formData.request_type === "missed_out" ? null : formData.requested_check_in,
        requested_check_out:
          formData.request_type === "missed_in" ? null : formData.requested_check_out,
        reason: formData.reason,
        supporting_doc_url: formData.supporting_doc_url || null,
      };

      await apiClient.post("/attendance/regularizations", payload);
      toast.success("Success", "Attendance regularization submitted successfully.");
      setIsCreateOpen(false);
      setFormData({
        employee_id: "",
        attendance_date: new Date().toISOString().split("T")[0],
        request_type: "missed_in",
        requested_check_in: "09:00",
        requested_check_out: "18:00",
        reason: "",
        supporting_doc_url: "",
      });
      fetchRegularizations();
    } catch (err: any) {
      toast.error("Error", err.response?.data?.detail || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewingItem) return;
    setProcessingReview(true);
    try {
      await apiClient.put(`/attendance/regularizations/${reviewingItem.id}/status`, {
        status: reviewAction,
        review_remarks: reviewRemarks || undefined,
      });

      toast.success(
        "Request Updated",
        `Regularization request ${reviewAction === "approved" ? "approved" : "rejected"} successfully.`
      );
      setIsReviewOpen(false);
      setReviewingItem(null);
      setReviewRemarks("");
      fetchRegularizations();
    } catch (err: any) {
      toast.error("Review Failed", err.response?.data?.detail || "Could not update status.");
    } finally {
      setProcessingReview(false);
    }
  };

  const filteredItems = regularizations.filter((item) => {
    if (typeFilter !== "all" && item.request_type !== typeFilter) return false;
    if (searchEmp.trim()) {
      const q = searchEmp.toLowerCase();
      const name = (item.employee_name || "").toLowerCase();
      const code = (item.employee_code || "").toLowerCase();
      if (!name.includes(q) && !code.includes(q)) return false;
    }
    return true;
  });

  const getStatusBadge = (status: AttendanceRegularization["status"]) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
            <Clock className="w-3 h-3" /> Pending Review
          </span>
        );
    }
  };

  const getRequestTypeBadge = (type: AttendanceRegularization["request_type"]) => {
    const labels: Record<string, string> = {
      missed_in: "Missed Check-In",
      missed_out: "Missed Check-Out",
      both_punches: "Missed Both Punches",
      late_excuse: "Late Excuse / Waiver",
      work_from_home: "Work From Home",
    };
    return (
      <span className="px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
        {labels[type] || type}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            Attendance Regularization & Requests
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review and adjust employee missed punches, late arrivals, and outdoor attendance claims.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchRegularizations()}
            disabled={isFetching}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-primary-600" : ""}`} />
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm transition-all shadow-md shadow-primary-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Regularization
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee name or code..."
            value={searchEmp}
            onChange={(e) => setSearchEmp(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              const val = e.target.value;
              startTransition(() => {
                setStatusFilter(val);
              });
            }}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Request Types</option>
            <option value="missed_in">Missed Check-In</option>
            <option value="missed_out">Missed Check-Out</option>
            <option value="both_punches">Missed Both Punches</option>
            <option value="late_excuse">Late Excuse</option>
            <option value="work_from_home">Work From Home</option>
          </select>
        </div>
      </div>

      {/* In-Place Table with Top-Rim Progress Bar */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Top indeterminate progress bar */}
        {(isFetching || isPending) && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary-100 dark:bg-primary-950 overflow-hidden z-20">
            <div className="h-full bg-primary-600 animate-pulse w-full" />
          </div>
        )}

        {initialLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mb-3" />
            <p className="text-sm font-medium">Loading regularization applications...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <FileCheck2 className="w-12 h-12 stroke-[1.5] mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
              No regularization requests found
            </p>
            <p className="text-sm mt-1">There are no attendance requests matching the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Requested Timings</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.employee_name || "Employee"}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-[11px]">
                          {item.employee_code || "—"}
                        </span>
                        {item.department_name && (
                          <span className="truncate max-w-[140px]">{item.department_name}</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {new Date(item.attendance_date).toLocaleDateString(undefined, {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">{getRequestTypeBadge(item.request_type)}</td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                      <div>
                        In: <span className="font-semibold font-mono">{item.requested_check_in || "—"}</span>
                      </div>
                      <div>
                        Out: <span className="font-semibold font-mono">{item.requested_check_out || "—"}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 max-w-xs">
                      <p className="truncate text-xs text-slate-700 dark:text-slate-300" title={item.reason}>
                        {item.reason}
                      </p>
                      {item.review_remarks && (
                        <p className="text-[11px] text-slate-400 mt-1 italic truncate" title={item.review_remarks}>
                          Note: {item.review_remarks}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(item.status)}</td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {item.status === "pending" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setReviewingItem(item);
                              setReviewAction("approved");
                              setIsReviewOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setReviewingItem(item);
                              setReviewAction("rejected");
                              setIsReviewOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          {item.reviewer_name ? `Reviewed by ${item.reviewer_name}` : "Processed"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: New Regularization */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-primary-600" />
                Apply for Attendance Regularization
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_id || "No ID"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.attendance_date}
                    onChange={(e) => setFormData({ ...formData, attendance_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Request Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.request_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        request_type: e.target.value as AttendanceRegularization["request_type"],
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="missed_in">Missed Check-In</option>
                    <option value="missed_out">Missed Check-Out</option>
                    <option value="both_punches">Missed Both Punches</option>
                    <option value="late_excuse">Late Excuse / Waiver</option>
                    <option value="work_from_home">Work From Home</option>
                  </select>
                </div>
              </div>

              {formData.request_type !== "missed_out" && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Requested Check-In Time
                  </label>
                  <input
                    type="time"
                    value={formData.requested_check_in}
                    onChange={(e) => setFormData({ ...formData, requested_check_in: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}

              {formData.request_type !== "missed_in" && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Requested Check-Out Time
                  </label>
                  <input
                    type="time"
                    value={formData.requested_check_out}
                    onChange={(e) => setFormData({ ...formData, requested_check_out: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this punch was missed or why late arrival should be excused..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-600/20 disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Review / Approval */}
      {isReviewOpen && reviewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {reviewAction === "approved" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-500" />
                )}
                {reviewAction === "approved" ? "Approve Regularization" : "Reject Regularization"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                For {reviewingItem.employee_name} on {reviewingItem.attendance_date}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
                <div className="text-slate-500">Reason:</div>
                <div className="text-slate-800 dark:text-slate-200 font-medium">{reviewingItem.reason}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Decision Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional review note or feedback for the employee..."
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReviewOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReviewSubmit}
                  disabled={processingReview}
                  className={`flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-xl text-white shadow-md ${
                    reviewAction === "approved"
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                      : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                  }`}
                >
                  {processingReview && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Confirm {reviewAction === "approved" ? "Approval" : "Rejection"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
