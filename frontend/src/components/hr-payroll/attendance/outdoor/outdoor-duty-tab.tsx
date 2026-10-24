"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { OutdoorDutyApplication, EmployeeOut } from "@/types";
import { SearchableEmployeeCombobox } from "@/components/common/searchable-employee-combobox";
import {
  Briefcase,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  Building2,
  FileText,
} from "lucide-react";

interface OutdoorDutyTabProps {
  currentBusinessId: number;
  employees: EmployeeOut[];
}

export function OutdoorDutyTab({ currentBusinessId, employees }: OutdoorDutyTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [applications, setApplications] = useState<OutdoorDutyApplication[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [visitTypeFilter, setVisitTypeFilter] = useState<string>("all");
  const [searchEmp, setSearchEmp] = useState<string>("");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    is_full_day: true,
    visit_type: "client_meeting" as OutdoorDutyApplication["visit_type"],
    destination_or_client: "",
    purpose: "",
  });

  // Review Modal
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [reviewingItem, setReviewingItem] = useState<OutdoorDutyApplication | null>(null);
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected">("approved");
  const [reviewRemarks, setReviewRemarks] = useState<string>("");
  const [processingReview, setProcessingReview] = useState<boolean>(false);

  const fetchApplications = useCallback(
    async (isInitial = false) => {
      if (isInitial) setInitialLoading(true);
      else setIsFetching(true);

      try {
        const params = new URLSearchParams();
        params.set("business_id", String(currentBusinessId));
        if (statusFilter !== "all") params.set("status", statusFilter);

        const res = await apiClient.get<OutdoorDutyApplication[]>(
          `/attendance/outdoor-duties?${params.toString()}`
        );
        setApplications(res.data || []);
      } catch (err: any) {
        toast.error("Error", err.response?.data?.detail || "Failed to load outdoor duty records.");
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
    if (!formData.destination_or_client.trim()) {
      toast.error("Validation Error", "Please specify the destination or client.");
      return;
    }
    if (!formData.purpose.trim()) {
      toast.error("Validation Error", "Please provide a purpose of visit.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        business_id: currentBusinessId,
        ...formData,
      };

      await apiClient.post("/attendance/outdoor-duties", payload);
      toast.success("Success", "Outdoor duty application submitted.");
      setIsCreateOpen(false);
      setFormData({
        employee_id: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
        is_full_day: true,
        visit_type: "client_meeting",
        destination_or_client: "",
        purpose: "",
      });
      fetchApplications();
    } catch (err: any) {
      toast.error("Error", err.response?.data?.detail || "Failed to create application.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewingItem) return;
    setProcessingReview(true);
    try {
      await apiClient.put(`/attendance/outdoor-duties/${reviewingItem.id}/status`, {
        status: reviewAction,
        review_remarks: reviewRemarks || undefined,
      });

      toast.success(
        "Application Updated",
        `Outdoor duty application ${reviewAction === "approved" ? "approved" : "rejected"} successfully.`
      );
      setIsReviewOpen(false);
      setReviewingItem(null);
      setReviewRemarks("");
      fetchApplications();
    } catch (err: any) {
      toast.error("Review Failed", err.response?.data?.detail || "Failed to update status.");
    } finally {
      setProcessingReview(false);
    }
  };

  const filteredItems = applications.filter((item) => {
    if (visitTypeFilter !== "all" && item.visit_type !== visitTypeFilter) return false;
    if (searchEmp.trim()) {
      const q = searchEmp.toLowerCase();
      const name = (item.employee_name || "").toLowerCase();
      const code = (item.employee_code || "").toLowerCase();
      const dest = (item.destination_or_client || "").toLowerCase();
      if (!name.includes(q) && !code.includes(q) && !dest.includes(q)) return false;
    }
    return true;
  });

  const getStatusBadge = (status: OutdoorDutyApplication["status"]) => {
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

  const getVisitTypeBadge = (type: OutdoorDutyApplication["visit_type"]) => {
    const labels: Record<string, string> = {
      client_meeting: "Client Meeting",
      field_work: "Field Work",
      customer_site: "Customer Site",
      training_seminar: "Training / Seminar",
      government_office: "Govt Office / Regulatory",
      other: "Other Visit",
    };
    return (
      <span className="px-2 py-0.5 text-xs rounded bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-medium">
        {labels[type] || type}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            Visit & Outdoor Duty (OD) Management
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Authorize off-site client meetings, field visits, and auto-credit daily attendance upon approval.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchApplications()}
            disabled={isFetching}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-sky-600" : ""}`} />
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm transition-all shadow-md shadow-sky-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Apply for Outdoor Duty
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee or destination..."
            value={searchEmp}
            onChange={(e) => setSearchEmp(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
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
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Visit Type:</span>
          <select
            value={visitTypeFilter}
            onChange={(e) => setVisitTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">All Types</option>
            <option value="client_meeting">Client Meeting</option>
            <option value="field_work">Field Work</option>
            <option value="customer_site">Customer Site</option>
            <option value="training_seminar">Training / Seminar</option>
            <option value="government_office">Govt Office</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* In-Place Non-Destructive Table */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {(isFetching || isPending) && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-sky-100 dark:bg-sky-950 overflow-hidden z-20">
            <div className="h-full bg-sky-600 animate-pulse w-full" />
          </div>
        )}

        {initialLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-sky-600 mb-3" />
            <p className="text-sm font-medium">Loading outdoor duty applications...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Briefcase className="w-12 h-12 stroke-[1.5] mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
              No outdoor duty applications found
            </p>
            <p className="text-sm mt-1">There are no records matching the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Destination / Client</th>
                  <th className="px-6 py-4">Purpose</th>
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

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700 dark:text-slate-300">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {item.start_date} {item.start_date !== item.end_date ? `to ${item.end_date}` : ""}
                      </div>
                      <div className="text-slate-400 mt-0.5">
                        {item.is_full_day ? "Full Day" : "Partial Day"}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">{getVisitTypeBadge(item.visit_type)}</td>

                    <td className="px-6 py-4 whitespace-nowrap text-slate-800 dark:text-slate-200 font-medium flex items-center gap-1.5 pt-5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{item.destination_or_client}</span>
                    </td>

                    <td className="px-6 py-4 max-w-xs">
                      <p className="truncate text-xs text-slate-700 dark:text-slate-300" title={item.purpose}>
                        {item.purpose}
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
                          {item.reviewer_name ? `Approved by ${item.reviewer_name}` : "Processed"}
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

      {/* Modal: Create Outdoor Duty */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-sky-600" />
                Apply for Visit / Outdoor Duty
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
                <SearchableEmployeeCombobox
                  employees={employees}
                  value={formData.employee_id}
                  onChange={(empId) => setFormData({ ...formData, employee_id: empId })}
                  placeholder="Search & select employee..."
                  allowClear={false}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Visit Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.visit_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        visit_type: e.target.value as OutdoorDutyApplication["visit_type"],
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="client_meeting">Client Meeting</option>
                    <option value="field_work">Field Work</option>
                    <option value="customer_site">Customer Site Visit</option>
                    <option value="training_seminar">Training / Seminar</option>
                    <option value="government_office">Government / Regulatory Office</option>
                    <option value="other">Other Business Purpose</option>
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_full_day}
                      onChange={(e) => setFormData({ ...formData, is_full_day: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-sky-600"></div>
                    <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                      Full Day Duty
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Destination / Client Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp HQ, Gulshan-2, Dhaka"
                  value={formData.destination_or_client}
                  onChange={(e) => setFormData({ ...formData, destination_or_client: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Purpose / Agenda <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the objective, meeting agenda, or expected outcome..."
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
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
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/20 disabled:opacity-50"
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
                {reviewAction === "approved" ? "Approve Outdoor Duty" : "Reject Outdoor Duty"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                For {reviewingItem.employee_name} ({reviewingItem.start_date})
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
                <div className="text-slate-500">Destination: {reviewingItem.destination_or_client}</div>
                <div className="text-slate-800 dark:text-slate-200 font-medium">
                  Purpose: {reviewingItem.purpose}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Manager Review Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional review notes or instructions..."
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
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
