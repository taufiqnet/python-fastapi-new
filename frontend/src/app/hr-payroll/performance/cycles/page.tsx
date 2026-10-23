"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { AppraisalCycle, PerformanceStats } from "@/types";
import { useToast } from "@/context/toast-context";
import {
  Calendar,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
  Target,
  Award,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

export default function AppraisalCyclesPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const [cycles, setCycles] = useState<AppraisalCycle[]>([]);
  const [stats, setStats] = useState<PerformanceStats>({
    active_cycles: 0,
    total_goals: 0,
    appraisals_pending_self: 0,
    appraisals_pending_manager: 0,
    appraisals_pending_calibration: 0,
    completed_appraisals: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("annual");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formSelfDeadline, setFormSelfDeadline] = useState("");
  const [formManagerDeadline, setFormManagerDeadline] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async (isBackground = false) => {
    if (isBackground) setIsFetching(true);
    else setInitialLoading(true);

    try {
      const [cyclesRes, statsRes] = await Promise.allSettled([
        apiClient.get<AppraisalCycle[]>("/performance/cycles"),
        apiClient.get<PerformanceStats>("/performance/overview/stats"),
      ]);

      if (cyclesRes.status === "fulfilled") setCycles(cyclesRes.value.data || []);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
    } catch (err: any) {
      toast.error("Error Loading Cycles", err.message || "Failed to load appraisal cycles.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const handleFilterChange = (statusVal: string, query: string) => {
    startTransition(() => {
      setSelectedStatus(statusVal);
      setSearchQuery(query);
    });
  };

  const filteredCycles = cycles.filter((c) => {
    const matchesStatus = selectedStatus === "all" || c.status === selectedStatus;
    const matchesSearch =
      !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.cycle_type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formStartDate || !formEndDate) {
      toast.error("Validation Error", "Title, start date, and end date are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post("/performance/cycles", {
        title: formTitle,
        cycle_type: formType,
        start_date: formStartDate,
        end_date: formEndDate,
        self_review_deadline: formSelfDeadline || null,
        manager_review_deadline: formManagerDeadline || null,
      });
      toast.success("Cycle Created", `Appraisal cycle "${formTitle}" has been scheduled.`);
      setIsAddModalOpen(false);
      setFormTitle("");
      setFormStartDate("");
      setFormEndDate("");
      setFormSelfDeadline("");
      setFormManagerDeadline("");
      loadData(true);
    } catch (err: any) {
      toast.error("Failed to Create", err.message || "Failed to create appraisal cycle.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">Draft</span>;
      case "goal_setting":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">Goal Setting</span>;
      case "in_review":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">In Review</span>;
      case "calibration":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">Calibration</span>;
      case "closed":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">Closed</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">{status}</span>;
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
              <span className="text-slate-800 font-semibold">Appraisal Cycles</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">Appraisal Cycles & Periods</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure global evaluation timelines, self-appraisal cutoffs, and management review deadlines.
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
              <span>Create Cycle</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Active Cycles</p>
              <p className="text-xl font-bold text-slate-900">{stats.active_cycles}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total KPIs / Goals</p>
              <p className="text-xl font-bold text-slate-900">{stats.total_goals}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Pending Reviews</p>
              <p className="text-xl font-bold text-slate-900">{stats.appraisals_pending_self + stats.appraisals_pending_manager}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Completed Appraisals</p>
              <p className="text-xl font-bold text-slate-900">{stats.completed_appraisals}</p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search cycles..."
              value={searchQuery}
              onChange={(e) => handleFilterChange(selectedStatus, e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {["all", "draft", "goal_setting", "in_review", "calibration", "closed"].map((st) => (
              <button
                key={st}
                onClick={() => handleFilterChange(st, searchQuery)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedStatus === st
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                {st === "all" ? "All Statuses" : st.replace("_", " ").toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table with In-Place Non-Destructive Filtering */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden relative">
          {/* Top-rim indeterminate progress bar during background fetching */}
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-100 overflow-hidden z-10">
              <div className="h-full bg-indigo-600 animate-[indeterminate_1.5s_infinite_linear] origin-left w-1/3" />
            </div>
          )}

          <div className={`overflow-x-auto ${isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}`}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Cycle Title</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Period</th>
                  <th className="py-3.5 px-4">Self-Review Cutoff</th>
                  <th className="py-3.5 px-4">Manager Review Cutoff</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {initialLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      Loading appraisal cycles...
                    </td>
                  </tr>
                ) : filteredCycles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      No appraisal cycles found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCycles.map((cycle) => (
                    <tr key={cycle.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{cycle.title}</td>
                      <td className="py-3.5 px-4 capitalize font-medium text-slate-700">{cycle.cycle_type.replace("_", " ")}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {cycle.start_date} to {cycle.end_date}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {cycle.self_review_deadline || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {cycle.manager_review_deadline || "—"}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(cycle.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/hr-payroll/performance/appraisals?cycle_id=${cycle.id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          <span>Appraisals</span>
                          <TrendingUp className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Create Appraisal Cycle */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Schedule Appraisal Cycle</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Establish corporate evaluation timelines</p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCycle} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cycle Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FY2026 Annual Performance Cycle"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cycle Type</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                    >
                      <option value="annual">Annual</option>
                      <option value="semi_annual">Semi-Annual</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="probation">Probationary</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">End Date *</label>
                    <input
                      type="date"
                      required
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Self-Review Cutoff</label>
                    <input
                      type="date"
                      value={formSelfDeadline}
                      onChange={(e) => setFormSelfDeadline(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Manager Review Cutoff</label>
                  <input
                    type="date"
                    value={formManagerDeadline}
                    onChange={(e) => setFormManagerDeadline(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                  />
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
                    {isSubmitting ? "Creating..." : "Save Cycle"}
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
