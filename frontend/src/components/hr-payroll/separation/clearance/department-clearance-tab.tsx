"use client";

import React, { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  FileCheck,
  ShieldCheck,
  DollarSign,
  User,
  Check,
  X,
  Layers,
  Building,
  Laptop,
  Coins,
  Briefcase,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { DepartmentClearance, DepartmentClearanceType, ClearanceStatus } from "@/types";

interface DepartmentClearanceTabProps {
  currentBusinessId: number;
}

export function DepartmentClearanceTab({ currentBusinessId }: DepartmentClearanceTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Data states
  const [clearances, setClearances] = useState<DepartmentClearance[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Sign off modal
  const [selectedClearance, setSelectedClearance] = useState<DepartmentClearance | null>(null);
  const [isSignOffOpen, setIsSignOffOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [signOffForm, setSignOffForm] = useState({
    status: "cleared" as ClearanceStatus,
    outstanding_amount: 0,
    checklist_remarks: "",
  });

  // Fetch clearances
  const fetchClearances = useCallback(
    async (isBackground = false) => {
      if (isBackground) setIsFetching(true);
      else setInitialLoading(true);

      try {
        const res = await apiClient.get<DepartmentClearance[]>("/separation/clearances", {
          params: { business_id: currentBusinessId },
        });
        setClearances(res.data || []);
      } catch (err: any) {
        toast.error("Failed to load clearances", err.response?.data?.detail || "Could not retrieve department clearances.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [currentBusinessId, toast]
  );

  useEffect(() => {
    fetchClearances();
  }, [fetchClearances]);

  // Handle Sign-off Submit
  const handleSignOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClearance) return;

    setIsSubmitting(true);
    try {
      await apiClient.post(
        `/separation/clearances/${selectedClearance.id}/sign-off`,
        {
          status: signOffForm.status,
          outstanding_amount: Number(signOffForm.outstanding_amount) || 0,
          checklist_remarks: signOffForm.checklist_remarks,
        },
        { params: { business_id: currentBusinessId } }
      );
      toast.success(
        "Clearance Updated",
        `Department clearance marked as ${signOffForm.status}.`
      );
      setIsSignOffOpen(false);
      fetchClearances(true);
    } catch (err: any) {
      toast.error(
        "Action Failed",
        err.response?.data?.detail || "Failed to update clearance sign-off."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered clearances
  const filteredClearances = useMemo(() => {
    return clearances.filter((c) => {
      const empName = `${c.employee?.first_name || ""} ${c.employee?.last_name || ""}`.toLowerCase();
      const empCode = (c.employee?.employee_id || "").toLowerCase();
      const deptName = c.department_type.toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch = empName.includes(query) || empCode.includes(query) || deptName.includes(query);
      const matchesDept = departmentFilter === "all" || c.department_type === departmentFilter;
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [clearances, searchQuery, departmentFilter, statusFilter]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = clearances.length;
    const pending = clearances.filter((c) => c.status === "pending" || c.status === "issue_flagged").length;
    const cleared = clearances.filter((c) => c.status === "cleared" || c.status === "waived").length;
    const totalRecoveries = clearances.reduce((acc, c) => acc + (Number(c.outstanding_amount) || 0), 0);
    return { total, pending, cleared, totalRecoveries };
  }, [clearances]);

  const getDeptIcon = (type: string) => {
    switch (type) {
      case "line_manager":
        return <User className="w-4 h-4 text-blue-500" />;
      case "it_systems":
        return <Laptop className="w-4 h-4 text-purple-500" />;
      case "finance_accounts":
        return <Coins className="w-4 h-4 text-emerald-500" />;
      case "admin_facilities":
        return <Building className="w-4 h-4 text-amber-500" />;
      case "human_resources":
        return <Briefcase className="w-4 h-4 text-indigo-500" />;
      default:
        return <Layers className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "cleared":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Cleared</span>;
      case "pending":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"><Clock className="w-3.5 h-3.5" /> Pending</span>;
      case "waived":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"><ShieldCheck className="w-3.5 h-3.5" /> Waived</span>;
      case "issue_flagged":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400"><AlertTriangle className="w-3.5 h-3.5" /> Issue Flagged</span>;
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
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Clearance Items</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Sign-off</p>
            <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{stats.pending}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cleared / Waived</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{stats.cleared}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Outstanding Recoveries</p>
            <p className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">
              ৳{stats.totalRecoveries.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
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
              placeholder="Search employee, ID, or department..."
              value={searchQuery}
              onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={departmentFilter}
              onChange={(e) => startTransition(() => setDepartmentFilter(e.target.value))}
              className="px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="all">All Departments</option>
              <option value="line_manager">Line Manager</option>
              <option value="it_systems">IT Systems & Access</option>
              <option value="finance_accounts">Finance & Accounts</option>
              <option value="admin_facilities">Admin & Facilities</option>
              <option value="human_resources">Human Resources</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => startTransition(() => setStatusFilter(e.target.value))}
              className="px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="cleared">Cleared</option>
              <option value="waived">Waived</option>
              <option value="issue_flagged">Issue Flagged</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => fetchClearances(true)}
          className="p-2 text-muted-foreground hover:text-foreground rounded-lg border hover:bg-muted transition"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
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
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Clearance Department</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Outstanding Amount</th>
                <th className="px-4 py-3">Checklist Remarks</th>
                <th className="px-4 py-3">Signed At</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {initialLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading department clearances...
                  </td>
                </tr>
              ) : filteredClearances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No department clearances found.
                  </td>
                </tr>
              ) : (
                filteredClearances.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/40 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {c.employee?.first_name} {c.employee?.last_name || ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.employee?.employee_id} • {c.employee?.department || "General"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getDeptIcon(c.department_type)}
                        <span className="font-medium capitalize text-foreground">
                          {c.department_type.replace("_", " ")}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(c.status)}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium">
                      {Number(c.outstanding_amount) > 0 ? (
                        <span className="text-rose-600 font-bold">
                          ৳{Number(c.outstanding_amount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">৳0.00</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[250px] truncate">
                      {c.checklist_remarks || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {c.cleared_at ? new Date(c.cleared_at).toLocaleDateString() : "Pending"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedClearance(c);
                          setSignOffForm({
                            status: (c.status === "pending" ? "cleared" : c.status) as ClearanceStatus,
                            outstanding_amount: Number(c.outstanding_amount) || 0,
                            checklist_remarks: c.checklist_remarks || "",
                          });
                          setIsSignOffOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition shadow-sm"
                      >
                        Sign Off
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sign-Off Modal */}
      {isSignOffOpen && selectedClearance && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-foreground capitalize">
                  Sign Off: {selectedClearance.department_type.replace("_", " ")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Employee: {selectedClearance.employee?.first_name} {selectedClearance.employee?.last_name || ""} (
                  {selectedClearance.employee?.employee_id})
                </p>
              </div>
              <button
                onClick={() => setIsSignOffOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSignOffSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Clearance Status *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSignOffForm({ ...signOffForm, status: "cleared" })}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      signOffForm.status === "cleared"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-600"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" /> Cleared
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignOffForm({ ...signOffForm, status: "waived" })}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      signOffForm.status === "waived"
                        ? "bg-blue-500/10 border-blue-500 text-blue-600"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Waived
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignOffForm({ ...signOffForm, status: "issue_flagged" })}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      signOffForm.status === "issue_flagged"
                        ? "bg-rose-500/10 border-rose-500 text-rose-600"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Issue
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Outstanding Recovery Amount (BDT ৳)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={signOffForm.outstanding_amount}
                  onChange={(e) => setSignOffForm({ ...signOffForm, outstanding_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Any outstanding charges recorded here will be automatically recovered during Full & Final Settlement.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Checklist Remarks & Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail returned items, ID card handover, email revocation, or damages..."
                  value={signOffForm.checklist_remarks}
                  onChange={(e) => setSignOffForm({ ...signOffForm, checklist_remarks: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsSignOffOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-muted-foreground hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition"
                >
                  {isSubmitting ? "Saving..." : "Confirm Sign-off"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
