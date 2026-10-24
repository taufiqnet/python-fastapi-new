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
  ShieldAlert,
  ArrowRight,
  Calculator,
  UserX,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import {
  EmployeeSeparation,
  EmployeeOut,
  SeparationType,
  SeparationStatus,
} from "@/types";

interface SeparationTabProps {
  currentBusinessId: number;
  onNavigateTab?: (tab: string, separationId?: string) => void;
}

export function SeparationTab({ currentBusinessId, onNavigateTab }: SeparationTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Data states
  const [separations, setSeparations] = useState<EmployeeSeparation[]>([]);
  const [employees, setEmployees] = useState<EmployeeOut[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [selectedSeparation, setSelectedSeparation] = useState<EmployeeSeparation | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    employee_id: "",
    separation_type: "termination" as SeparationType,
    order_date: new Date().toISOString().split("T")[0],
    last_working_date: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
    reason: "",
    severance_entitled: false,
  });

  // Fetch separations
  const fetchSeparations = useCallback(
    async (isBackground = false) => {
      if (isBackground) setIsFetching(true);
      else setInitialLoading(true);

      try {
        const res = await apiClient.get<EmployeeSeparation[]>("/separation/separations", {
          params: { business_id: currentBusinessId },
        });
        setSeparations(res.data || []);
      } catch (err: any) {
        toast.error("Failed to load separations", err.response?.data?.detail || "Could not retrieve separation records.");
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
    fetchSeparations();
    fetchEmployees();
  }, [fetchSeparations, fetchEmployees]);

  // Handle direct separation initiation (Termination, Retirement, Dismissal, etc.)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.employee_id) {
      toast.error("Validation Error", "Please select an employee.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/separation/separations", createForm, {
        params: { business_id: currentBusinessId },
      });
      toast.success(
        "Separation Initiated",
        "The separation master and 5 department clearances have been created."
      );
      setIsCreateOpen(false);
      fetchSeparations(true);
    } catch (err: any) {
      toast.error(
        "Initiation Failed",
        err.response?.data?.detail || "Failed to initiate separation."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered separations
  const filteredSeparations = useMemo(() => {
    return separations.filter((s) => {
      const empName = `${s.employee?.first_name || ""} ${s.employee?.last_name || ""}`.toLowerCase();
      const empCode = (s.employee?.employee_id || "").toLowerCase();
      const sepNum = (s.separation_number || "").toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch = empName.includes(query) || empCode.includes(query) || sepNum.includes(query);
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesType = typeFilter === "all" || s.separation_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [separations, searchQuery, statusFilter, typeFilter]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = separations.length;
    const inProgress = separations.filter(
      (s) => s.status === "initiated" || s.status === "clearance_in_progress"
    ).length;
    const settlementPending = separations.filter((s) => s.status === "settlement_pending").length;
    const completed = separations.filter((s) => s.status === "completed").length;
    return { total, inProgress, settlementPending, completed };
  }, [separations]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "initiated":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"><Clock className="w-3.5 h-3.5" /> Initiated</span>;
      case "clearance_in_progress":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"><AlertTriangle className="w-3.5 h-3.5" /> Clearance Active</span>;
      case "settlement_pending":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400"><Calculator className="w-3.5 h-3.5" /> F&F Pending</span>;
      case "completed":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Offboarded</span>;
      case "cancelled":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">{status}</span>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "resignation":
        return <span className="text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded">Resignation</span>;
      case "termination":
        return <span className="text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded">Termination</span>;
      case "dismissal":
        return <span className="text-xs font-medium text-red-700 bg-red-100 dark:bg-red-950/40 px-2 py-0.5 rounded">Dismissal</span>;
      case "retirement":
        return <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded">Retirement</span>;
      case "retrenchment":
        return <span className="text-xs font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded">Retrenchment</span>;
      case "death":
        return <span className="text-xs font-medium text-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Demise</span>;
      default:
        return <span className="text-xs font-medium capitalize text-muted-foreground">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Separations</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <UserX className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Clearances In-Flight</p>
            <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{stats.inProgress}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Settlements Pending</p>
            <p className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">{stats.settlementPending}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
            <Calculator className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Offboarded</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{stats.completed}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
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
              placeholder="Search by employee name, ID, or separation #..."
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
              <option value="initiated">Initiated</option>
              <option value="clearance_in_progress">Clearance In Progress</option>
              <option value="settlement_pending">Settlement Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => startTransition(() => setTypeFilter(e.target.value))}
              className="px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="all">All Types</option>
              <option value="resignation">Resignation</option>
              <option value="termination">Termination</option>
              <option value="dismissal">Dismissal</option>
              <option value="retirement">Retirement</option>
              <option value="retrenchment">Retrenchment</option>
              <option value="death">Demise</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchSeparations(true)}
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
            Initiate Separation
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden relative">
        {isFetching && (
          <div className="h-0.5 bg-primary/20 overflow-hidden relative">
            <div className="h-full bg-primary animate-pulse w-full" />
          </div>
        )}

        <div className={`overflow-x-auto transition-opacity duration-150 ${isFetching ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Sep #</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Order Date</th>
                <th className="px-4 py-3">Last Working Date</th>
                <th className="px-4 py-3">Tenure</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {initialLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading employee separation records...
                  </td>
                </tr>
              ) : filteredSeparations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No employee separations found.
                  </td>
                </tr>
              ) : (
                filteredSeparations.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/40 transition">
                    <td className="px-4 py-3 font-mono font-medium text-xs text-primary">
                      {s.separation_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {s.employee?.first_name} {s.employee?.last_name || ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.employee?.employee_id} • {s.employee?.department || "General"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getTypeBadge(s.separation_type)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {s.order_date}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {s.last_working_date}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      <span className="font-semibold">{s.service_duration_years} yrs</span>
                      <span className="text-muted-foreground ml-1">({s.service_duration_days}d)</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(s.status)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedSeparation(s);
                            setIsDetailsOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </button>

                        {s.status === "settlement_pending" && onNavigateTab && (
                          <button
                            onClick={() => onNavigateTab("settlement", s.id)}
                            className="px-2.5 py-1 text-xs font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition inline-flex items-center gap-1 shadow-sm"
                          >
                            <Calculator className="w-3.5 h-3.5" /> F&F
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Initiate Separation Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl w-full max-w-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-foreground">Initiate Direct Separation</h3>
                <p className="text-xs text-muted-foreground">Order termination, retirement, dismissal, or statutory retrenchment</p>
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
                    Separation Category *
                  </label>
                  <select
                    value={createForm.separation_type}
                    onChange={(e) => setCreateForm({ ...createForm, separation_type: e.target.value as SeparationType })}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="termination">Termination (Employer Initiated)</option>
                    <option value="dismissal">Dismissal (Misconduct / Disciplinary)</option>
                    <option value="retirement">Retirement (Age / Tenure)</option>
                    <option value="retrenchment">Retrenchment (Redundancy BLA 2006)</option>
                    <option value="death">Demise / Deceased</option>
                  </select>
                </div>

                <div className="flex items-center mt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.severance_entitled}
                      onChange={(e) => setCreateForm({ ...createForm, severance_entitled: e.target.checked })}
                      className="w-4 h-4 rounded border-primary text-primary focus:ring-primary/20"
                    />
                    <span className="text-sm font-medium text-foreground">Severance / Retrenchment Compensation Entitled</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Order / Notice Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={createForm.order_date}
                    onChange={(e) => setCreateForm({ ...createForm, order_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Effective Last Working Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={createForm.last_working_date}
                    onChange={(e) => setCreateForm({ ...createForm, last_working_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Reason & Background Notes *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Official justification, management memo reference, or disciplinary findings..."
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
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
                  {isSubmitting ? "Initiating..." : "Initiate Separation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Separation Dossier Details Modal */}
      {isDetailsOpen && selectedSeparation && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-foreground">
                  Offboarding Dossier: {selectedSeparation.separation_number}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedSeparation.employee?.first_name} {selectedSeparation.employee?.last_name || ""} (
                  {selectedSeparation.employee?.employee_id}) • {selectedSeparation.employee?.department || "General"}
                </p>
              </div>
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Overview Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/30 p-3.5 rounded-xl border text-xs">
                <div>
                  <span className="text-muted-foreground block">Category:</span>
                  <span className="font-semibold capitalize text-foreground">{selectedSeparation.separation_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Order Date:</span>
                  <span className="font-semibold text-foreground">{selectedSeparation.order_date}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Last Working Date:</span>
                  <span className="font-semibold text-foreground">{selectedSeparation.last_working_date}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Service Duration:</span>
                  <span className="font-semibold text-foreground">
                    {selectedSeparation.service_duration_years} yrs ({selectedSeparation.service_duration_days}d)
                  </span>
                </div>
              </div>

              {selectedSeparation.reason && (
                <div className="bg-muted/20 p-3 rounded-lg border text-xs">
                  <span className="text-muted-foreground block font-medium mb-1">Reason / Order Details:</span>
                  <p className="text-foreground">{selectedSeparation.reason}</p>
                </div>
              )}

              {/* Department Clearances Checklist */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Department Clearances (NOC)
                </h4>
                <div className="space-y-2">
                  {selectedSeparation.clearances && selectedSeparation.clearances.length > 0 ? (
                    selectedSeparation.clearances.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border bg-background text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{c.department_type.replace("_", " ")}</span>
                          {c.checklist_remarks && (
                            <span className="text-muted-foreground truncate max-w-[200px]">({c.checklist_remarks})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {Number(c.outstanding_amount) > 0 && (
                            <span className="font-semibold text-rose-600">
                              Recovery: ৳{Number(c.outstanding_amount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              c.status === "cleared"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : c.status === "waived"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No clearances registered yet.</p>
                  )}
                </div>
              </div>

              {/* Exit Interview Summary */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Exit Interview Status
                </h4>
                {selectedSeparation.exit_interview ? (
                  <div className="p-3 bg-muted/20 border rounded-lg text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Primary Reason:</span>
                      <span className="font-medium text-foreground">
                        {selectedSeparation.exit_interview.primary_reason_for_leaving}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Would Recommend:</span>
                      <span className="font-medium capitalize text-emerald-600">
                        {selectedSeparation.exit_interview.would_recommend}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Exit interview has not been conducted yet.</p>
                )}
              </div>

              {/* Final Settlement Summary */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Full & Final Financial Settlement (FnF)
                </h4>
                {selectedSeparation.settlement ? (
                  <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">
                        Settlement #{selectedSeparation.settlement.settlement_number}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300">
                        {selectedSeparation.settlement.payment_status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1 border-t border-purple-500/10">
                      <div>Payables: ৳{Number(selectedSeparation.settlement.total_payable_amount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}</div>
                      <div>Deductions: ৳{Number(selectedSeparation.settlement.total_deduction_amount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className="pt-1 border-t border-purple-500/20 flex justify-between items-center font-bold text-sm text-foreground">
                      <span>Net Remuneration:</span>
                      <span className="text-emerald-600">
                        ৳{Number(selectedSeparation.settlement.net_payable_amount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-muted/20 border rounded-lg text-xs flex items-center justify-between">
                    <span className="text-muted-foreground">F&F Settlement has not been computed yet.</span>
                    {onNavigateTab && (
                      <button
                        onClick={() => {
                          setIsDetailsOpen(false);
                          onNavigateTab("settlement", selectedSeparation.id);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
                      >
                        Compute Now
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3 border-t bg-muted/20 flex justify-end">
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="px-4 py-1.5 border rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
