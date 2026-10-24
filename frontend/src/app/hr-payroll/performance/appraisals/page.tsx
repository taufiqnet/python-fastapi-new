"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { PerformanceAppraisal, AppraisalCycle, EmployeeOut, PerformanceStats } from "@/types";
import { useToast } from "@/context/toast-context";
import {
  Award,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
  ChevronRight,
  TrendingUp,
  Sliders,
  Check,
  Star,
  UserCheck,
} from "lucide-react";

function PerformanceAppraisalsContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialCycleFilter = searchParams.get("cycle_id") || "all";

  const [isPending, startTransition] = useTransition();
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const [appraisals, setAppraisals] = useState<PerformanceAppraisal[]>([]);
  const [cycles, setCycles] = useState<AppraisalCycle[]>([]);
  const [employees, setEmployees] = useState<EmployeeOut[]>([]);
  const [stats, setStats] = useState<PerformanceStats>({
    active_cycles: 0,
    total_goals: 0,
    appraisals_pending_self: 0,
    appraisals_pending_manager: 0,
    appraisals_pending_calibration: 0,
    completed_appraisals: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCycle, setSelectedCycle] = useState<string>(initialCycleFilter);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Init Appraisal Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formCycleId, setFormCycleId] = useState("");

  // Calibration Modal
  const [isCalibrateModalOpen, setIsCalibrateModalOpen] = useState(false);
  const [selectedAppraisal, setSelectedAppraisal] = useState<PerformanceAppraisal | null>(null);
  const [calibratedScore, setCalibratedScore] = useState("4.0");
  const [discussionDate, setDiscussionDate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async (isBackground = false) => {
    if (isBackground) setIsFetching(true);
    else setInitialLoading(true);

    try {
      const [appRes, cyclesRes, empsRes, statsRes] = await Promise.allSettled([
        apiClient.get<PerformanceAppraisal[]>("/performance/appraisals"),
        apiClient.get<AppraisalCycle[]>("/performance/cycles"),
        apiClient.get<EmployeeOut[]>("/employees"),
        apiClient.get<PerformanceStats>("/performance/overview/stats"),
      ]);

      if (appRes.status === "fulfilled") setAppraisals(appRes.value.data || []);
      if (cyclesRes.status === "fulfilled") {
        const cList = cyclesRes.value.data || [];
        setCycles(cList);
        if (cList.length > 0 && !formCycleId) setFormCycleId(cList[0].id);
      }
      if (empsRes.status === "fulfilled") setEmployees(empsRes.value.data || []);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
    } catch (err: any) {
      toast.error("Error Loading Appraisals", err.message || "Failed to load appraisal dossiers.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const handleFilterChange = (cyc: string, st: string, query: string) => {
    startTransition(() => {
      setSelectedCycle(cyc);
      setSelectedStatus(st);
      setSearchQuery(query);
    });
  };

  const filteredAppraisals = appraisals.filter((a) => {
    const matchesCycle = selectedCycle === "all" || a.cycle_id === selectedCycle;
    const matchesStatus = selectedStatus === "all" || a.status === selectedStatus;
    const matchesSearch =
      !searchQuery ||
      (a.employee_name && a.employee_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.cycle_title && a.cycle_title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCycle && matchesStatus && matchesSearch;
  });

  const handleCreateAppraisal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmployeeId || !formCycleId) {
      toast.error("Validation Error", "Employee and appraisal cycle are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post("/performance/appraisals", {
        employee_id: formEmployeeId,
        cycle_id: formCycleId,
      });
      toast.success("Appraisal Initiated", "Appraisal review dossier created.");
      setIsAddModalOpen(false);
      loadData(true);
    } catch (err: any) {
      toast.error("Error", err.message || "Failed to initialize appraisal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCalibrate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppraisal) return;
    setIsSubmitting(true);
    try {
      await apiClient.post(`/performance/appraisals/${selectedAppraisal.id}/calibrate`, {
        calibrated_score: parseFloat(calibratedScore) || 3.0,
        discussion_date: discussionDate || null,
      });
      toast.success("Calibrated", "Appraisal score and final grade calibrated.");
      setIsCalibrateModalOpen(false);
      setSelectedAppraisal(null);
      loadData(true);
    } catch (err: any) {
      toast.error("Calibration Error", err.message || "Failed to calibrate appraisal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "self_review_pending":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">Self Review</span>;
      case "manager_review_pending":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">Manager Review</span>;
      case "calibration_pending":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">HR Calibration</span>;
      case "acknowledgement_pending":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">Awaiting Ack</span>;
      case "completed":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">Completed</span>;
      default:
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header Breadcrumbs & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Link href="/hr-payroll" className="hover:text-indigo-600">HR & Payroll</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span>Performance Management</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-800 font-semibold">Performance Appraisals</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">Evaluation & Appraisal Dossiers</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              4-stage evaluation machine: Self-Review → Manager Review → Calibration Committee → Sign-off.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              className="p-2.5 text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs shadow-sm shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Initiate Appraisal</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee or cycle..."
              value={searchQuery}
              onChange={(e) => handleFilterChange(selectedCycle, selectedStatus, e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <select
              value={selectedCycle}
              onChange={(e) => handleFilterChange(e.target.value, selectedStatus, searchQuery)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 font-medium text-slate-700"
            >
              <option value="all">All Cycles</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => handleFilterChange(selectedCycle, e.target.value, searchQuery)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 font-medium text-slate-700"
            >
              <option value="all">All Stages</option>
              <option value="self_review_pending">Self Review Pending</option>
              <option value="manager_review_pending">Manager Review Pending</option>
              <option value="calibration_pending">Calibration Pending</option>
              <option value="acknowledgement_pending">Acknowledgement Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden relative">
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-100 overflow-hidden z-10">
              <div className="h-full bg-indigo-600 animate-[indeterminate_1.5s_infinite_linear] origin-left w-1/3" />
            </div>
          )}

          <div className={`overflow-x-auto ${isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}`}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Cycle</th>
                  <th className="py-3.5 px-4 text-center">Self Score</th>
                  <th className="py-3.5 px-4 text-center">Manager Score</th>
                  <th className="py-3.5 px-4 text-center">Calibrated Score</th>
                  <th className="py-3.5 px-4">Final Rating</th>
                  <th className="py-3.5 px-4">Stage</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {initialLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                      Loading appraisals...
                    </td>
                  </tr>
                ) : filteredAppraisals.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                      No appraisals found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAppraisals.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{item.employee_name || "—"}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{item.cycle_title || "—"}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-700">
                        {item.self_overall_score !== null && item.self_overall_score !== undefined
                          ? Number(item.self_overall_score).toFixed(2)
                          : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-700">
                        {item.manager_overall_score !== null && item.manager_overall_score !== undefined
                          ? Number(item.manager_overall_score).toFixed(2)
                          : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-indigo-700">
                        {item.calibrated_score !== null && item.calibrated_score !== undefined
                          ? Number(item.calibrated_score).toFixed(2)
                          : "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.final_rating_label ? (
                          <span className="font-semibold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {item.final_rating_label}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(item.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        {item.status === "calibration_pending" ? (
                          <button
                            onClick={() => {
                              setSelectedAppraisal(item);
                              setCalibratedScore(
                                item.manager_overall_score ? String(item.manager_overall_score) : "4.0"
                              );
                              setIsCalibrateModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs transition-colors"
                          >
                            <Sliders className="w-3 h-3" />
                            <span>Calibrate</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Initiate Appraisal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Initiate Appraisal Dossier</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Start formal evaluation for an employee</p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateAppraisal} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employee *</label>
                  <select
                    required
                    value={formEmployeeId}
                    onChange={(e) => setFormEmployeeId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                  >
                    <option value="">Select Employee...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name || ""} ({emp.employee_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Appraisal Cycle *</label>
                  <select
                    required
                    value={formCycleId}
                    onChange={(e) => setFormCycleId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                  >
                    {cycles.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? "Starting..." : "Start Appraisal"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Committee Calibration */}
        {isCalibrateModalOpen && selectedAppraisal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">HR Calibration Committee</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Finalize score and rating for {selectedAppraisal.employee_name}</p>
                </div>
                <button
                  onClick={() => setIsCalibrateModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCalibrate} className="p-6 space-y-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Self Evaluation:</span>
                    <span className="font-bold text-slate-800">{selectedAppraisal.self_overall_score || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Manager Evaluation:</span>
                    <span className="font-bold text-slate-800">{selectedAppraisal.manager_overall_score || "N/A"}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Calibrated Final Score (1.00 - 5.00) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max="5"
                    required
                    value={calibratedScore}
                    onChange={(e) => setCalibratedScore(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    4.5+: Outstanding | 3.5-4.49: Exceeds | 2.5-3.49: Meets | &lt;2.5: Needs Improvement
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Discussion Date</label>
                  <input
                    type="date"
                    value={discussionDate}
                    onChange={(e) => setDiscussionDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCalibrateModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? "Saving..." : "Approve Calibration"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function PerformanceAppraisalsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading Appraisals...</div>}>
      <PerformanceAppraisalsContent />
    </Suspense>
  );
}
