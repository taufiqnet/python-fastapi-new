"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { EmployeeGoal, AppraisalCycle, EmployeeOut, PerformanceStats } from "@/types";
import { useToast } from "@/context/toast-context";
import {
  Target,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
  ChevronRight,
  TrendingUp,
  Percent,
  Calendar,
  AlertCircle,
} from "lucide-react";

export default function GoalsManagementPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const [goals, setGoals] = useState<EmployeeGoal[]>([]);
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
  const [selectedCycle, setSelectedCycle] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formCycleId, setFormCycleId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("operational");
  const [formMetric, setFormMetric] = useState("percentage");
  const [formTarget, setFormTarget] = useState("100");
  const [formWeightage, setFormWeightage] = useState("20");
  const [formDueDate, setFormDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async (isBackground = false) => {
    if (isBackground) setIsFetching(true);
    else setInitialLoading(true);

    try {
      const [goalsRes, cyclesRes, empsRes, statsRes] = await Promise.allSettled([
        apiClient.get<EmployeeGoal[]>("/performance/goals"),
        apiClient.get<AppraisalCycle[]>("/performance/cycles"),
        apiClient.get<EmployeeOut[]>("/employees"),
        apiClient.get<PerformanceStats>("/performance/overview/stats"),
      ]);

      if (goalsRes.status === "fulfilled") setGoals(goalsRes.value.data || []);
      if (cyclesRes.status === "fulfilled") {
        const cList = cyclesRes.value.data || [];
        setCycles(cList);
        if (cList.length > 0 && !formCycleId) {
          setFormCycleId(cList[0].id);
        }
      }
      if (empsRes.status === "fulfilled") setEmployees(empsRes.value.data || []);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
    } catch (err: any) {
      toast.error("Error Loading Goals", err.message || "Failed to load employee goals.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const handleFilterChange = (cyc: string, cat: string, st: string, query: string) => {
    startTransition(() => {
      setSelectedCycle(cyc);
      setSelectedCategory(cat);
      setSelectedStatus(st);
      setSearchQuery(query);
    });
  };

  const filteredGoals = goals.filter((g) => {
    const matchesCycle = selectedCycle === "all" || g.cycle_id === selectedCycle;
    const matchesCat = selectedCategory === "all" || g.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || g.status === selectedStatus;
    const matchesSearch =
      !searchQuery ||
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.employee_name && g.employee_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCycle && matchesCat && matchesStatus && matchesSearch;
  });

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmployeeId || !formCycleId || !formTitle) {
      toast.error("Validation Error", "Employee, cycle, and goal title are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/performance/goals", {
        employee_id: formEmployeeId,
        cycle_id: formCycleId,
        title: formTitle,
        description: formDescription || null,
        category: formCategory,
        metric_type: formMetric,
        target_value: parseFloat(formTarget) || 0,
        weightage: parseFloat(formWeightage) || 0,
        due_date: formDueDate || null,
      });

      toast.success("Goal Created", `KPI "${formTitle}" has been assigned.`);
      setIsAddModalOpen(false);
      setFormTitle("");
      setFormDescription("");
      loadData(true);
    } catch (err: any) {
      toast.error("Failed to Create", err.message || "Failed to set up goal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "not_started":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">Not Started</span>;
      case "in_progress":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">In Progress</span>;
      case "achieved":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">Achieved</span>;
      case "partially_achieved":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">Partially</span>;
      case "deferred":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-700">Deferred</span>;
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
              <span className="text-slate-800 font-semibold">Goals & KPIs</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">Employee Goals & KPI Registry</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Set SMART goals, track measurable targets, and enforce 100% total weightage limits per cycle.
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
              <span>Assign Goal</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search goals or employee name..."
              value={searchQuery}
              onChange={(e) => handleFilterChange(selectedCycle, selectedCategory, selectedStatus, e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <select
              value={selectedCycle}
              onChange={(e) => handleFilterChange(e.target.value, selectedCategory, selectedStatus, searchQuery)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 font-medium text-slate-700"
            >
              <option value="all">All Cycles</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => handleFilterChange(selectedCycle, e.target.value, selectedStatus, searchQuery)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 font-medium text-slate-700"
            >
              <option value="all">All Categories</option>
              <option value="strategic">Strategic</option>
              <option value="operational">Operational</option>
              <option value="developmental">Developmental</option>
              <option value="behavioral">Behavioral</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => handleFilterChange(selectedCycle, selectedCategory, e.target.value, searchQuery)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 font-medium text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="achieved">Achieved</option>
              <option value="partially_achieved">Partially Achieved</option>
              <option value="deferred">Deferred</option>
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
                  <th className="py-3.5 px-4">Goal / KPI</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-center">Weightage</th>
                  <th className="py-3.5 px-4">Target / Achieved</th>
                  <th className="py-3.5 px-4">Progress</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {initialLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                      Loading goals...
                    </td>
                  </tr>
                ) : filteredGoals.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                      No goals found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredGoals.map((goal) => {
                    const ach = goal.achievement_pct || 0;
                    return (
                      <tr key={goal.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{goal.title}</p>
                          {goal.description && <p className="text-[11px] text-slate-500 line-clamp-1">{goal.description}</p>}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">{goal.employee_name || "—"}</td>
                        <td className="py-3.5 px-4 capitalize text-slate-600 font-medium">{goal.category}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-900">{goal.weightage}%</td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                          {goal.achieved_value} / {goal.target_value} <span className="text-slate-400">({goal.metric_type})</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="w-24">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 mb-1">
                              <span>{Math.round(ach)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  ach >= 100 ? "bg-emerald-500" : ach >= 60 ? "bg-indigo-500" : "bg-amber-500"
                                }`}
                                style={{ width: `${Math.min(ach, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(goal.status)}</td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">{goal.due_date || "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Setup New Goal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Assign KPI / Goal</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Define measurable objectives for the appraisal cycle</p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateGoal} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Goal / Objective Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Deliver ProERP SaaS Multi-tenant Module"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Key Results</label>
                  <textarea
                    rows={2}
                    placeholder="Success criteria, deliverables, and performance benchmarks..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                    >
                      <option value="strategic">Strategic</option>
                      <option value="operational">Operational</option>
                      <option value="developmental">Developmental</option>
                      <option value="behavioral">Behavioral</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Metric Type</label>
                    <select
                      value={formMetric}
                      onChange={(e) => setFormMetric(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="numeric">Numeric Target</option>
                      <option value="currency">Currency (BDT)</option>
                      <option value="boolean">Boolean (0 or 1)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Target Value</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formTarget}
                      onChange={(e) => setFormTarget(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Weightage (%) *</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={formWeightage}
                      onChange={(e) => setFormWeightage(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                    />
                  </div>
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
                    {isSubmitting ? "Saving..." : "Assign Goal"}
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
