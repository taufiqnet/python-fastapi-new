"use client";

import React, { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  FileText,
  User,
  Calendar,
  Eye,
  Check,
  X,
  FileCheck,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { ResignationApplication, EmployeeOut, ResignationStatus, ResignationReason } from "@/types";

interface ResignationTabProps {
  currentBusinessId: number;
  onRefreshSeparations?: () => void;
}

export function ResignationTab({ currentBusinessId, onRefreshSeparations }: ResignationTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Data states
  const [resignations, setResignations] = useState<ResignationApplication[]>([]);
  const [employees, setEmployees] = useState<EmployeeOut[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reasonFilter, setReasonFilter] = useState<string>("all");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [selectedResignation, setSelectedResignation] = useState<ResignationApplication | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    employee_id: "",
    notice_date: new Date().toISOString().split("T")[0],
    proposed_last_working_day: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    contractual_notice_days: 30,
    reason_category: "career_growth" as ResignationReason,
    resignation_letter: "",
    handover_notes: "",
  });

  const [reviewForm, setReviewForm] = useState({
    status: "approved" as ResignationStatus,
    approved_last_working_day: "",
    rejection_reason: "",
  });

  // Fetch resignations
  const fetchResignations = useCallback(
    async (isBackground = false) => {
      if (isBackground) setIsFetching(true);
      else setInitialLoading(true);

      try {
        const res = await apiClient.get<ResignationApplication[]>("/separation/resignations", {
          params: { business_id: currentBusinessId },
        });
        setResignations(res.data || []);
      } catch (err: any) {
        toast.error("Failed to load resignations", err.response?.data?.detail || "Could not retrieve resignation applications.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [currentBusinessId, toast]
  );

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await apiClient.get<EmployeeOut[]>("/employees", {
        params: { business_id: currentBusinessId, is_active: true, limit: 300 },
      });
      setEmployees(res.data || []);
    } catch {
      // ignore
    }
  }, [currentBusinessId]);

  useEffect(() => {
    fetchResignations();
    fetchEmployees();
  }, [fetchResignations, fetchEmployees]);

  // Handle submit resignation
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.employee_id) {
      toast.error("Validation Error", "Please select an employee.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/separation/resignations", createForm, {
        params: { business_id: currentBusinessId },
      });
      toast.success(
        "Resignation Submitted",
        "The resignation application has been recorded for review."
      );
      setIsCreateOpen(false);
      fetchResignations(true);
    } catch (err: any) {
      toast.error(
        "Submission Failed",
        err.response?.data?.detail || "Failed to submit resignation."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle review resignation
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResignation) return;

    setIsSubmitting(true);
    try {
      await apiClient.post(
        `/separation/resignations/${selectedResignation.id}/review`,
        reviewForm,
        { params: { business_id: currentBusinessId } }
      );
      toast.success(
        reviewForm.status === "approved" ? "Resignation Approved" : "Resignation Rejected",
        reviewForm.status === "approved"
          ? "Separation and department clearances have been initiated."
          : "The resignation application has been rejected."
      );
      setIsReviewOpen(false);
      fetchResignations(true);
      if (onRefreshSeparations) onRefreshSeparations();
    } catch (err: any) {
      toast.error(
        "Review Action Failed",
        err.response?.data?.detail || "Failed to review resignation."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered resignations
  const filteredResignations = useMemo(() => {
    return resignations.filter((r) => {
      const empName = `${r.employee?.first_name || ""} ${r.employee?.last_name || ""}`.toLowerCase();
      const empCode = (r.employee?.employee_id || "").toLowerCase();
      const resNum = (r.resignation_number || "").toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch = empName.includes(query) || empCode.includes(query) || resNum.includes(query);
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesReason = reasonFilter === "all" || r.reason_category === reasonFilter;

      return matchesSearch && matchesStatus && matchesReason;
    });
  }, [resignations, searchQuery, statusFilter, reasonFilter]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = resignations.length;
    const underReview = resignations.filter((r) => r.status === "submitted" || r.status === "under_review").length;
    const approved = resignations.filter((r) => r.status === "approved").length;
    const shortfalls = resignations.filter((r) => r.shortfall_notice_days > 0).length;
    return { total, underReview, approved, shortfalls };
  }, [resignations]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>;
      case "submitted":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"><Clock className="w-3.5 h-3.5" /> Submitted</span>;
      case "under_review":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"><AlertTriangle className="w-3.5 h-3.5" /> Under Review</span>;
      case "rejected":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      case "withdrawn":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Withdrawn</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Resignations</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Review</p>
            <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{stats.underReview}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Approved Resignations</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{stats.approved}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notice Shortfalls</p>
            <p className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">{stats.shortfalls}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Header & Filters */}
      <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by employee, code, or application #..."
              value={searchQuery}
              onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => startTransition(() => setStatusFilter(e.target.value))}
              className="px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="withdrawn">Withdrawn</option>
            </select>

            <select
              value={reasonFilter}
              onChange={(e) => startTransition(() => setReasonFilter(e.target.value))}
              className="px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="all">All Reasons</option>
              <option value="career_growth">Career Growth</option>
              <option value="better_compensation">Better Compensation</option>
              <option value="relocation">Relocation</option>
              <option value="higher_studies">Higher Studies</option>
              <option value="health_personal">Health / Personal</option>
              <option value="work_environment">Work Environment</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchResignations(true)}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg border hover:bg-muted transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Submit Resignation
          </button>
        </div>
      </div>

      {/* Table Card adhering to ui_in_place_filtering.md */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden relative">
        {/* Top-rim indeterminate progress bar during background fetch */}
        {isFetching && (
          <div className="h-0.5 bg-primary/20 overflow-hidden relative">
            <div className="h-full bg-primary animate-pulse w-full" />
          </div>
        )}

        <div className={`overflow-x-auto transition-opacity duration-150 ${isFetching ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">App #</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Notice Date</th>
                <th className="px-4 py-3">Proposed LWD</th>
                <th className="px-4 py-3">Notice Tracking</th>
                <th className="px-4 py-3">Reason Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {initialLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading resignation applications...
                  </td>
                </tr>
              ) : filteredResignations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No resignation applications found.
                  </td>
                </tr>
              ) : (
                filteredResignations.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/40 transition">
                    <td className="px-4 py-3 font-mono font-medium text-xs text-primary">
                      {r.resignation_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {r.employee?.first_name} {r.employee?.last_name || ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.employee?.employee_id} • {r.employee?.department || "General"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {r.notice_date}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {r.approved_last_working_day || r.proposed_last_working_day}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs space-y-0.5">
                        <span className="text-muted-foreground">Req: {r.contractual_notice_days}d</span>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 font-medium">Served: {r.served_notice_days}d</span>
                          {r.shortfall_notice_days > 0 && (
                            <span className="text-rose-600 font-semibold bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded">
                              Shortfall: {r.shortfall_notice_days}d
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">
                      {r.reason_category.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(r.status)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {r.status === "submitted" || r.status === "under_review" ? (
                        <button
                          onClick={() => {
                            setSelectedResignation(r);
                            setReviewForm({
                              status: "approved",
                              approved_last_working_day: r.proposed_last_working_day,
                              rejection_reason: "",
                            });
                            setIsReviewOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition shadow-sm"
                        >
                          Review
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedResignation(r);
                            setIsReviewOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs border rounded-lg hover:bg-muted text-muted-foreground transition inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Resignation Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl w-full max-w-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-foreground">Submit Voluntary Resignation</h3>
                <p className="text-xs text-muted-foreground">Initiate formal departure request with contractual notice tracking</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Employee *
                </label>
                <select
                  required
                  value={createForm.employee_id}
                  onChange={(e) => setCreateForm({ ...createForm, employee_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name || ""} ({emp.employee_id}) - {emp.department_name || "Staff"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Notice Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={createForm.notice_date}
                    onChange={(e) => setCreateForm({ ...createForm, notice_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Proposed Last Working Day *
                  </label>
                  <input
                    type="date"
                    required
                    value={createForm.proposed_last_working_day}
                    onChange={(e) => setCreateForm({ ...createForm, proposed_last_working_day: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Contractual Notice (Days) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={createForm.contractual_notice_days}
                    onChange={(e) => setCreateForm({ ...createForm, contractual_notice_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Reason Category *
                  </label>
                  <select
                    value={createForm.reason_category}
                    onChange={(e) => setCreateForm({ ...createForm, reason_category: e.target.value as ResignationReason })}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="career_growth">Career Growth</option>
                    <option value="better_compensation">Better Compensation</option>
                    <option value="relocation">Relocation</option>
                    <option value="higher_studies">Higher Studies</option>
                    <option value="health_personal">Health / Personal</option>
                    <option value="work_environment">Work Environment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Formal Resignation Letter / Statement *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail your formal resignation statement and handover commitment..."
                  value={createForm.resignation_letter}
                  onChange={(e) => setCreateForm({ ...createForm, resignation_letter: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Handover Notes & Plan (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Summary of active deliverables, system access transfers, credentials..."
                  value={createForm.handover_notes}
                  onChange={(e) => setCreateForm({ ...createForm, handover_notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-muted-foreground hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition"
                >
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Resignation Modal */}
      {isReviewOpen && selectedResignation && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-foreground">
                  Review Resignation: {selectedResignation.resignation_number}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedResignation.employee?.first_name} {selectedResignation.employee?.last_name || ""} (
                  {selectedResignation.employee?.employee_id})
                </p>
              </div>
              <button
                onClick={() => setIsReviewOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-muted/40 p-3.5 rounded-xl text-xs space-y-1.5 border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Notice Date:</span>
                  <span className="font-medium text-foreground">{selectedResignation.notice_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Proposed LWD:</span>
                  <span className="font-medium text-foreground">{selectedResignation.proposed_last_working_day}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Notice Calculation:</span>
                  <span className="font-medium text-foreground">
                    Required: {selectedResignation.contractual_notice_days}d | Served: {selectedResignation.served_notice_days}d
                    {selectedResignation.shortfall_notice_days > 0 && (
                      <span className="text-rose-600 font-semibold ml-1">
                        (Shortfall: {selectedResignation.shortfall_notice_days}d)
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t">
                  <span className="text-muted-foreground block mb-1">Resignation Letter:</span>
                  <p className="text-foreground italic">{selectedResignation.resignation_letter}</p>
                </div>
              </div>

              {selectedResignation.status === "submitted" || selectedResignation.status === "under_review" ? (
                <form onSubmit={handleReviewSubmit} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Decision *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, status: "approved" })}
                        className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition ${
                          reviewForm.status === "approved"
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-600"
                            : "hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <Check className="w-4 h-4" /> Approve
                      </button>

                      <button
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, status: "rejected" })}
                        className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition ${
                          reviewForm.status === "rejected"
                            ? "bg-rose-500/10 border-rose-500 text-rose-600"
                            : "hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>

                  {reviewForm.status === "approved" ? (
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Approved Last Working Day *
                      </label>
                      <input
                        type="date"
                        required
                        value={reviewForm.approved_last_working_day}
                        onChange={(e) => setReviewForm({ ...reviewForm, approved_last_working_day: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Approving will automatically trigger Employee Separation and initiate 5 department clearance workflows.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Rejection Reason *
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="State reason why resignation is not accepted..."
                        value={reviewForm.rejection_reason}
                        onChange={(e) => setReviewForm({ ...reviewForm, rejection_reason: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-end gap-3 border-t">
                    <button
                      type="button"
                      onClick={() => setIsReviewOpen(false)}
                      className="px-4 py-2 border rounded-lg text-sm text-muted-foreground hover:bg-muted transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition"
                    >
                      {isSubmitting ? "Processing..." : "Confirm Decision"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="pt-2 text-right">
                  <button
                    onClick={() => setIsReviewOpen(false)}
                    className="px-4 py-2 border rounded-lg text-sm text-muted-foreground hover:bg-muted transition"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
