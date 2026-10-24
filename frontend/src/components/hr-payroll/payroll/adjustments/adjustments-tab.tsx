"use client";

import React, { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Sliders,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  FileText,
  User,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import {
  SalaryAdjustmentOut,
  SalaryAdjustmentCreatePayload,
  PayrollPeriodOut,
  EmployeeOut,
} from "@/types";

interface AdjustmentsTabProps {
  periods: PayrollPeriodOut[];
  currentBusinessId: number;
}

export function AdjustmentsTab({
  periods,
  currentBusinessId,
}: AdjustmentsTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Data states
  const [adjustments, setAdjustments] = useState<SalaryAdjustmentOut[]>([]);
  const [employees, setEmployees] = useState<EmployeeOut[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState<SalaryAdjustmentCreatePayload>({
    business_id: currentBusinessId,
    employee_id: "",
    period_id: periods[0]?.id || null,
    adjustment_type: "arrear",
    amount: 0,
    title: "",
    reason: "",
  });

  // Fetch adjustments
  const fetchAdjustments = useCallback(
    async (isBackground = false) => {
      if (isBackground) setIsFetching(true);
      else setInitialLoading(true);
      setError(null);

      try {
        let url = `/payroll/adjustments?business_id=${currentBusinessId}`;
        if (periodFilter !== "all") {
          url += `&period_id=${periodFilter}`;
        }
        const res = await apiClient.get<SalaryAdjustmentOut[]>(url);
        setAdjustments(res.data || []);
      } catch (err) {
        console.error("Failed to load salary adjustments:", err);
        setError("Failed to load salary adjustments.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [currentBusinessId, periodFilter]
  );

  // Fetch employees list for modal dropdown
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await apiClient.get<EmployeeOut[]>(
        `/employees?business_id=${currentBusinessId}&limit=500`
      );
      setEmployees(res.data || []);
      if (res.data?.length && !formData.employee_id) {
        setFormData((prev) => ({ ...prev, employee_id: res.data[0].id }));
      }
    } catch (err) {
      console.error("Failed to load employees for adjustments:", err);
    }
  }, [currentBusinessId]);

  useEffect(() => {
    fetchAdjustments(false);
  }, [fetchAdjustments]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Employee lookup map
  const employeeMap = useMemo(() => {
    const map: Record<string, EmployeeOut> = {};
    employees.forEach((emp) => {
      map[emp.id] = emp;
    });
    return map;
  }, [employees]);

  // Filtered adjustments
  const filteredAdjustments = useMemo(() => {
    return adjustments.filter((adj) => {
      const emp = employeeMap[adj.employee_id];
      const empName = emp ? `${emp.first_name} ${emp.last_name}`.toLowerCase() : "";
      const matchesSearch =
        !searchQuery ||
        empName.includes(searchQuery.toLowerCase()) ||
        adj.title.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === "all" || adj.adjustment_type === typeFilter;
      const matchesStatus = statusFilter === "all" || adj.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [adjustments, employeeMap, searchQuery, typeFilter, statusFilter]);

  // Handle Save New Adjustment
  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id) {
      toast.error("Validation Error", "Please select an employee.");
      return;
    }
    if (!formData.title.trim()) {
      toast.error("Validation Error", "Please enter an adjustment title.");
      return;
    }
    if (formData.amount <= 0) {
      toast.error("Validation Error", "Amount must be greater than zero.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/payroll/adjustments", {
        ...formData,
        business_id: currentBusinessId,
        amount: Number(formData.amount),
        period_id: formData.period_id || undefined,
      });

      toast.success("Adjustment Created", "Salary adjustment added to queue.");
      setIsModalOpen(false);
      setFormData({
        business_id: currentBusinessId,
        employee_id: employees[0]?.id || "",
        period_id: periods[0]?.id || null,
        adjustment_type: "arrear",
        amount: 0,
        title: "",
        reason: "",
      });
      fetchAdjustments(true);
    } catch (err: any) {
      toast.error("Creation Failed", err?.response?.data?.detail || "Could not create adjustment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Status Transition (Approve / Reject)
  const handleUpdateStatus = async (
    adj: SalaryAdjustmentOut,
    newStatus: "approved" | "rejected"
  ) => {
    try {
      await apiClient.patch(`/payroll/adjustments/${adj.id}`, {
        status: newStatus,
      });
      toast.success(
        newStatus === "approved" ? "Adjustment Approved" : "Adjustment Rejected",
        `Adjustment #${adj.title} is now ${newStatus}.`
      );
      fetchAdjustments(true);
    } catch (err: any) {
      toast.error("Action Failed", err?.response?.data?.detail || "Could not update status.");
    }
  };

  // Metrics
  const totalArrears = useMemo(
    () =>
      adjustments
        .filter((a) => (a.status === "approved" || a.status === "applied") && ["arrear", "bonus_special", "incentive"].includes(a.adjustment_type))
        .reduce((sum, a) => sum + (a.amount || 0), 0),
    [adjustments]
  );

  const totalDeductions = useMemo(
    () =>
      adjustments
        .filter((a) => (a.status === "approved" || a.status === "applied") && ["penalty_deduction", "damage_recovery", "advance_adjustment"].includes(a.adjustment_type))
        .reduce((sum, a) => sum + (a.amount || 0), 0),
    [adjustments]
  );

  const pendingCount = useMemo(
    () => adjustments.filter((a) => a.status === "pending").length,
    [adjustments]
  );

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "arrear":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Arrear (+৳)</span>;
      case "bonus_special":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Special Bonus (+৳)</span>;
      case "incentive":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">Incentive (+৳)</span>;
      case "penalty_deduction":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Penalty (-৳)</span>;
      case "damage_recovery":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Damage Recovery (-৳)</span>;
      case "advance_adjustment":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Advance Cut (-৳)</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize">{type}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "applied":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Applied in Payroll</span>;
      case "approved":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Approved</span>;
      case "pending":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Pending Review</span>;
      case "rejected":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 capitalize">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              Salary Adjustments (Arrears & Deductions)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Record one-off payroll arrears, festival incentives, disciplinary damage recoveries, or salary advance deductions
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchAdjustments(true)}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              New Adjustment
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase text-emerald-700">Approved Arrears & Additions</div>
              <div className="text-lg font-black text-emerald-800 mt-0.5">
                +৳ {totalArrears.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <TrendingUp className="w-6 h-6 text-emerald-500 opacity-80" />
          </div>

          <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase text-rose-700">Approved Penalties & Deductions</div>
              <div className="text-lg font-black text-rose-800 mt-0.5">
                -৳ {totalDeductions.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <TrendingDown className="w-6 h-6 text-rose-500 opacity-80" />
          </div>

          <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-100 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase text-amber-700">Pending Governance Review</div>
              <div className="text-lg font-black text-amber-800 mt-0.5">
                {pendingCount} Adjustments
              </div>
            </div>
            <Clock className="w-6 h-6 text-amber-500 opacity-80" />
          </div>
        </div>
      </div>

      {/* Adjustments Master Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden relative">
        {/* Top Progress Bar on background fetch */}
        {isFetching && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden z-20">
            <div className="w-full h-full bg-gradient-to-r from-indigo-500 via-teal-500 to-indigo-500 animate-pulse" />
          </div>
        )}

        {/* Filter bar */}
        <div className="p-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  startTransition(() => setSearchQuery(val));
                }}
                placeholder="Search employee or title..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-52 focus:w-64 transition-all focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                const val = e.target.value;
                startTransition(() => setTypeFilter(val));
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Types</option>
              <option value="arrear">Arrears (+৳)</option>
              <option value="bonus_special">Special Bonus (+৳)</option>
              <option value="incentive">Incentive (+৳)</option>
              <option value="penalty_deduction">Penalty Deduction (-৳)</option>
              <option value="damage_recovery">Damage Recovery (-৳)</option>
              <option value="advance_adjustment">Advance Adjustment (-৳)</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                const val = e.target.value;
                startTransition(() => setStatusFilter(val));
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="applied">Applied in Payroll</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Period Filter */}
            <select
              value={periodFilter}
              onChange={(e) => {
                const val = e.target.value;
                startTransition(() => setPeriodFilter(val));
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Periods</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing {filteredAdjustments.length} records
          </div>
        </div>

        {/* In-Place Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3">Employee</th>
                <th className="px-5 py-3">Title & Reason</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3 text-right">Adjustment Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-100 text-xs transition-opacity duration-200 ${
                isFetching ? "opacity-75" : "opacity-100"
              }`}
            >
              {initialLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="h-3.5 bg-slate-100 rounded w-32 mb-1" />
                      <div className="h-2.5 bg-slate-100 rounded w-20" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3.5 bg-slate-100 rounded w-40 mb-1" />
                      <div className="h-2.5 bg-slate-100 rounded w-28" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-5 bg-slate-100 rounded-full w-20" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="h-4 bg-slate-100 rounded w-20 ml-auto" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-5 bg-slate-100 rounded-full w-20" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="h-6 bg-slate-100 rounded w-24 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredAdjustments.length > 0 ? (
                filteredAdjustments.map((adj) => {
                  const emp = employeeMap[adj.employee_id];
                  const isAddition = ["arrear", "bonus_special", "incentive"].includes(adj.adjustment_type);
                  return (
                    <tr key={adj.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 leading-tight">
                          {emp ? `${emp.first_name} ${emp.last_name}` : `ID: ${adj.employee_id}`}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {emp?.employee_id || "EMP"}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 max-w-xs">
                        <div className="font-semibold text-slate-800 leading-tight">{adj.title}</div>
                        {adj.reason && (
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate">{adj.reason}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">{getTypeBadge(adj.adjustment_type)}</td>
                      <td className="px-5 py-3.5 text-right font-bold">
                        <span className={isAddition ? "text-emerald-600" : "text-rose-600"}>
                          {isAddition ? "+" : "-"}৳{" "}
                          {(adj.amount || 0).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">{getStatusBadge(adj.status)}</td>
                      <td className="px-5 py-3.5 text-right">
                        {adj.status === "pending" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(adj, "approved")}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs transition-colors flex items-center gap-1 border border-emerald-200"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(adj, "rejected")}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs transition-colors flex items-center gap-1 border border-rose-200"
                            >
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">No actions</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    No salary adjustments found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Adjustment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Add Salary Adjustment</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdjustment} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Beneficiary Employee *
                </label>
                <select
                  required
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_id || "EMP"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Adjustment Type *
                  </label>
                  <select
                    value={formData.adjustment_type}
                    onChange={(e: any) =>
                      setFormData({ ...formData, adjustment_type: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="arrear">Arrear (Addition)</option>
                    <option value="bonus_special">Special Bonus (Addition)</option>
                    <option value="incentive">Incentive (Addition)</option>
                    <option value="penalty_deduction">Penalty (Deduction)</option>
                    <option value="damage_recovery">Damage Recovery (Deduction)</option>
                    <option value="advance_adjustment">Advance Cut (Deduction)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Target Period
                  </label>
                  <select
                    value={formData.period_id || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, period_id: e.target.value || null })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Next Active Period</option>
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Amount in BDT (৳) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={formData.amount || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Title / Reference *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. October Overtime Arrear, Disciplinary Cut #204"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Justification / Memo Reason
                </label>
                <textarea
                  rows={2}
                  value={formData.reason || ""}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Enter detailed rationale for audit trail..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Save Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
