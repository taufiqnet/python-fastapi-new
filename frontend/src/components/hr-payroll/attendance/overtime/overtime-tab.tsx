"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { OvertimeApplication, EmployeeOut } from "@/types";
import {
  Timer,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Scale,
  DollarSign,
  AlertCircle,
  Edit3,
} from "lucide-react";

interface OvertimeTabProps {
  currentBusinessId: number;
  employees: EmployeeOut[];
}

export function OvertimeTab({ currentBusinessId, employees }: OvertimeTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [applications, setApplications] = useState<OvertimeApplication[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchEmp, setSearchEmp] = useState<string>("");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    ot_date: new Date().toISOString().split("T")[0],
    start_time: "18:00",
    end_time: "20:00",
    claimed_hours: 2,
    purpose: "",
    project_name_or_task: "",
  });

  // Review / Approval Modal
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [reviewingItem, setReviewingItem] = useState<OvertimeApplication | null>(null);
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected">("approved");
  const [approvedHours, setApprovedHours] = useState<number>(0);
  const [managerRemarks, setManagerRemarks] = useState<string>("");
  const [processingReview, setProcessingReview] = useState<boolean>(false);

  const fetchApplications = useCallback(
    async (isInitial = false) => {
      if (isInitial) setInitialLoading(true);
      else setIsFetching(true);

      try {
        const params = new URLSearchParams();
        params.set("business_id", String(currentBusinessId));
        if (statusFilter !== "all") params.set("status", statusFilter);

        const res = await apiClient.get<OvertimeApplication[]>(
          `/attendance/overtime?${params.toString()}`
        );
        setApplications(res.data || []);
      } catch (err: any) {
        toast.error("Error", err.response?.data?.detail || "Failed to load overtime records.");
      } finally {
        if (isInitial) setInitialLoading(false);
        else setIsFetching(false);
      }
    },
    [currentBusinessId, statusFilter, toast]
  );

  useEffect(() => {
    fetchApplications(true);
  }, [fetchApplications]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id) {
      toast.error("Validation Error", "Please select an employee.");
      return;
    }
    if (formData.claimed_hours <= 0) {
      toast.error("Validation Error", "Claimed hours must be greater than zero.");
      return;
    }
    if (!formData.purpose.trim()) {
      toast.error("Validation Error", "Please provide a purpose or justification for overtime.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        business_id: currentBusinessId,
        employee_id: formData.employee_id,
        ot_date: formData.ot_date,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        claimed_hours: Number(formData.claimed_hours),
        purpose: formData.purpose,
        project_name_or_task: formData.project_name_or_task || null,
      };

      await apiClient.post("/attendance/overtime", payload);
      toast.success("Success", "Overtime application submitted.");
      setIsCreateOpen(false);
      setFormData({
        employee_id: "",
        ot_date: new Date().toISOString().split("T")[0],
        start_time: "18:00",
        end_time: "20:00",
        claimed_hours: 2,
        purpose: "",
        project_name_or_task: "",
      });
      fetchApplications();
    } catch (err: any) {
      toast.error("Error", err.response?.data?.detail || "Failed to submit overtime application.");
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewModal = (item: OvertimeApplication, action: "approved" | "rejected") => {
    setReviewingItem(item);
    setReviewAction(action);
    setApprovedHours(action === "approved" ? item.claimed_hours : 0);
    setManagerRemarks("");
    setIsReviewOpen(true);
  };

  const handleReviewSubmit = async () => {
    if (!reviewingItem) return;
    setProcessingReview(true);
    try {
      await apiClient.put(`/attendance/overtime/${reviewingItem.id}/approval`, {
        status: reviewAction,
        approved_hours: reviewAction === "approved" ? Number(approvedHours) : 0,
        manager_remarks: managerRemarks || undefined,
      });

      toast.success(
        "Overtime Updated",
        `Overtime request ${reviewAction === "approved" ? "approved" : "rejected"} successfully.`
      );
      setIsReviewOpen(false);
      setReviewingItem(null);
      fetchApplications();
    } catch (err: any) {
      toast.error("Action Failed", err.response?.data?.detail || "Could not update overtime status.");
    } finally {
      setProcessingReview(false);
    }
  };

  const filteredItems = applications.filter((item) => {
    if (searchEmp.trim()) {
      const q = searchEmp.toLowerCase();
      const name = (item.employee_name || "").toLowerCase();
      const code = (item.employee_code || "").toLowerCase();
      const task = (item.project_name_or_task || "").toLowerCase();
      if (!name.includes(q) && !code.includes(q) && !task.includes(q)) return false;
    }
    return true;
  });

  const getStatusBadge = (status: OvertimeApplication["status"]) => {
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

  return (
    <div className="space-y-6">
      {/* Statutory Compliance Info Banner */}
      <div className="bg-gradient-to-r from-indigo-900/10 via-purple-900/10 to-transparent dark:from-indigo-950/40 dark:via-purple-950/20 p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-600 dark:bg-indigo-500 rounded-xl text-white shadow-md shadow-indigo-600/20">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              BLA 2006 Statutory Overtime Invariant
              <span className="text-[11px] font-mono px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded font-bold">
                Section 108 Compliant
              </span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Standard work hours: 8 hrs/day (48 hrs/week). Statutory Overtime Rate ={" "}
              <strong className="text-indigo-600 dark:text-indigo-400">2 × Basic Hourly Rate</strong> (calculated as Basic Salary / 208 × 2).
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Apply for Overtime
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee or task description..."
            value={searchEmp}
            onChange={(e) => setSearchEmp(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <button
          onClick={() => fetchApplications()}
          disabled={isFetching}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
        </button>
      </div>

      {/* Table */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {(isFetching || isPending) && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-100 dark:bg-indigo-950 overflow-hidden z-20">
            <div className="h-full bg-indigo-600 animate-pulse w-full" />
          </div>
        )}

        {initialLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
            <p className="text-sm font-medium">Loading overtime ledger...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Timer className="w-12 h-12 stroke-[1.5] mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
              No overtime applications found
            </p>
            <p className="text-sm mt-1">There are no records matching the selected filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">OT Date</th>
                  <th className="px-6 py-4">Timings</th>
                  <th className="px-6 py-4 text-center">Claimed Hrs</th>
                  <th className="px-6 py-4 text-center">Approved Hrs</th>
                  <th className="px-6 py-4">Purpose / Project</th>
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
                      {item.ot_date}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 font-mono">
                      {item.start_time || "—"} - {item.end_time || "—"}
                    </td>

                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                        {item.claimed_hours.toFixed(1)}h
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span
                        className={`font-bold font-mono ${
                          item.approved_hours > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-400"
                        }`}
                      >
                        {item.status === "approved" ? `${item.approved_hours.toFixed(1)}h` : "—"}
                      </span>
                    </td>

                    <td className="px-6 py-4 max-w-xs">
                      <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-200" title={item.purpose}>
                        {item.purpose}
                      </p>
                      {item.project_name_or_task && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          Project: {item.project_name_or_task}
                        </p>
                      )}
                      {item.manager_remarks && (
                        <p className="text-[11px] text-indigo-500 italic truncate mt-0.5" title={item.manager_remarks}>
                          Mgr Note: {item.manager_remarks}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(item.status)}</td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {item.status === "pending" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openReviewModal(item, "approved")}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openReviewModal(item, "rejected")}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          {item.approver_name ? `Reviewed by ${item.approver_name}` : "Processed"}
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

      {/* Modal: Apply Overtime */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Timer className="w-5 h-5 text-indigo-600" />
                Apply for Overtime (OT)
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
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
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
                    Overtime Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.ot_date}
                    onChange={(e) => setFormData({ ...formData, ot_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Claimed Hours <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="12"
                    required
                    value={formData.claimed_hours}
                    onChange={(e) => setFormData({ ...formData, claimed_hours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Project / Task (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Month-End Billing or Emergency Server Maintenance"
                  value={formData.project_name_or_task}
                  onChange={(e) => setFormData({ ...formData, project_name_or_task: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Reason / Purpose <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Justify why work beyond regular hours was necessary..."
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Submit Overtime Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Review / Approval with Hour Adjustment */}
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
                {reviewAction === "approved" ? "Approve Overtime Hours" : "Reject Overtime Claim"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                For {reviewingItem.employee_name} on {reviewingItem.ot_date}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
                <div>
                  Claimed: <span className="font-bold text-slate-900 dark:text-white">{reviewingItem.claimed_hours} hrs</span>
                </div>
                <div className="text-slate-500">Purpose: {reviewingItem.purpose}</div>
              </div>

              {reviewAction === "approved" && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Approved Hours <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max={reviewingItem.claimed_hours}
                    required
                    value={approvedHours}
                    onChange={(e) => setApprovedHours(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    You can adjust down from the employee&apos;s claimed {reviewingItem.claimed_hours} hrs if needed.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Manager Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional review feedback..."
                  value={managerRemarks}
                  onChange={(e) => setManagerRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
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
