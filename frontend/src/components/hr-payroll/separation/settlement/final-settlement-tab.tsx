"use client";

import React, { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Plus,
  Printer,
  DollarSign,
  Calculator,
  Eye,
  Check,
  X,
  CreditCard,
  Building,
  TrendingDown,
  TrendingUp,
  FileCheck,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import {
  FinalSettlement,
  EmployeeSeparation,
  SettlementPaymentStatus,
} from "@/types";

interface FinalSettlementTabProps {
  currentBusinessId: number;
  initialSeparationId?: string | null;
}

export function FinalSettlementTab({ currentBusinessId, initialSeparationId }: FinalSettlementTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Data states
  const [settlements, setSettlements] = useState<FinalSettlement[]>([]);
  const [separations, setSeparations] = useState<EmployeeSeparation[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals
  const [isComputeOpen, setIsComputeOpen] = useState<boolean>(false);
  const [isDisburseOpen, setIsDisburseOpen] = useState<boolean>(false);
  const [selectedSettlement, setSelectedSettlement] = useState<FinalSettlement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Compute form
  const [computeForm, setComputeForm] = useState({
    separation_id: initialSeparationId || "",
    unpaid_salary_days: 0,
    bonus_arrears_amount: 0,
    other_payable_amount: 0,
    asset_damage_deduction: 0,
    tax_withholding_deduction: 0,
    notes: "Full and final statutory calculations per BLA 2006",
  });

  // Disburse form
  const [disburseForm, setDisburseForm] = useState({
    payment_method: "bank_transfer",
    payment_reference: "",
    notes: "Direct EFTN / Bank Advice credited to employee payroll account",
  });

  // Fetch settlements
  const fetchSettlements = useCallback(
    async (isBackground = false) => {
      if (isBackground) setIsFetching(true);
      else setInitialLoading(true);

      try {
        const res = await apiClient.get<FinalSettlement[]>("/separation/settlements", {
          params: { business_id: currentBusinessId },
        });
        setSettlements(res.data || []);
      } catch (err: any) {
        toast.error("Failed to load settlements", err.response?.data?.detail || "Could not retrieve settlement records.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [currentBusinessId, toast]
  );

  // Fetch separations eligible for settlement
  const fetchSeparations = useCallback(async () => {
    try {
      const res = await apiClient.get<EmployeeSeparation[]>("/separation/separations", {
        params: { business_id: currentBusinessId, limit: 100 },
      });
      setSeparations(res.data || []);
    } catch {
      // ignore
    }
  }, [currentBusinessId]);

  useEffect(() => {
    fetchSettlements();
    fetchSeparations();
  }, [fetchSettlements, fetchSeparations]);

  useEffect(() => {
    if (initialSeparationId) {
      setComputeForm((prev) => ({ ...prev, separation_id: initialSeparationId }));
      setIsComputeOpen(true);
    }
  }, [initialSeparationId]);

  // Handle Compute Submit
  const handleComputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!computeForm.separation_id) {
      toast.error("Validation Error", "Please select an active separation record.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(
        `/separation/separations/${computeForm.separation_id}/settlement/compute`,
        {
          unpaid_salary_days: Number(computeForm.unpaid_salary_days) || 0,
          bonus_arrears_amount: Number(computeForm.bonus_arrears_amount) || 0,
          other_payable_amount: Number(computeForm.other_payable_amount) || 0,
          asset_damage_deduction: Number(computeForm.asset_damage_deduction) || 0,
          tax_withholding_deduction: Number(computeForm.tax_withholding_deduction) || 0,
          notes: computeForm.notes,
        },
        { params: { business_id: currentBusinessId } }
      );
      toast.success(
        "F&F Settlement Computed",
        "Statutory payables, gratuity, and clearance deductions calculated successfully."
      );
      setIsComputeOpen(false);
      fetchSettlements(true);
    } catch (err: any) {
      toast.error(
        "Computation Failed",
        err.response?.data?.detail || "Failed to compute settlement."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Disburse Submit
  const handleDisburseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSettlement) return;

    setIsSubmitting(true);
    try {
      await apiClient.post(
        `/separation/settlements/${selectedSettlement.id}/disburse`,
        disburseForm,
        { params: { business_id: currentBusinessId } }
      );
      toast.success(
        "Settlement Disbursed",
        "Payment advice completed. Employee has been marked Inactive in the system."
      );
      setIsDisburseOpen(false);
      fetchSettlements(true);
      fetchSeparations();
    } catch (err: any) {
      toast.error(
        "Disbursement Failed",
        err.response?.data?.detail || "Failed to disburse settlement."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered settlements
  const filteredSettlements = useMemo(() => {
    return settlements.filter((s) => {
      const empName = `${s.employee?.first_name || ""} ${s.employee?.last_name || ""}`.toLowerCase();
      const empCode = (s.employee?.employee_id || "").toLowerCase();
      const setNum = (s.settlement_number || "").toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch = empName.includes(query) || empCode.includes(query) || setNum.includes(query);
      const matchesStatus = statusFilter === "all" || s.payment_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [settlements, searchQuery, statusFilter]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = settlements.length;
    const disbursedCount = settlements.filter((s) => s.payment_status === "disbursed").length;
    const pendingCount = settlements.filter((s) => s.payment_status !== "disbursed").length;
    const totalDisbursedAmt = settlements
      .filter((s) => s.payment_status === "disbursed")
      .reduce((acc, s) => acc + (Number(s.net_payable_amount) || 0), 0);
    const totalPendingAmt = settlements
      .filter((s) => s.payment_status !== "disbursed")
      .reduce((acc, s) => acc + (Number(s.net_payable_amount) || 0), 0);

    return { total, disbursedCount, pendingCount, totalDisbursedAmt, totalPendingAmt };
  }, [settlements]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "disbursed":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Disbursed</span>;
      case "draft":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"><Clock className="w-3.5 h-3.5" /> Draft Computed</span>;
      case "approved":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400"><FileCheck className="w-3.5 h-3.5" /> Approved</span>;
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
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Settlements</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Calculator className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Disbursed Volume</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
              ৳{stats.totalDisbursedAmt.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Disbursement</p>
            <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
              ৳{stats.totalPendingAmt.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Discharged Cases</p>
            <p className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">{stats.disbursedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
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
              placeholder="Search settlement #, employee, code..."
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
              <option value="all">All Payment Statuses</option>
              <option value="draft">Draft Computed</option>
              <option value="approved">Approved</option>
              <option value="disbursed">Disbursed</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchSettlements(true)}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg border hover:bg-muted transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setIsComputeOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Compute F&F Settlement
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
                <th className="px-4 py-3">Settlement #</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Gross Payables</th>
                <th className="px-4 py-3">Deductions</th>
                <th className="px-4 py-3">Net Settlement</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {initialLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading final settlements...
                  </td>
                </tr>
              ) : filteredSettlements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No final settlements found.
                  </td>
                </tr>
              ) : (
                filteredSettlements.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/40 transition">
                    <td className="px-4 py-3 font-mono font-medium text-xs text-primary">
                      {s.settlement_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {s.employee?.first_name} {s.employee?.last_name || ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.employee?.employee_id} • {s.employee?.department || "General"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {s.settlement_date}
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-600 font-medium">
                      ৳{Number(s.total_payable_amount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 font-mono text-rose-600 font-medium">
                      ৳{Number(s.total_deduction_amount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-foreground">
                      ৳{Number(s.net_payable_amount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(s.payment_status)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/hr-payroll/separation/settlement/${s.id}`}
                          className="px-2.5 py-1 text-xs border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition inline-flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" /> Statement
                        </Link>

                        {s.payment_status !== "disbursed" && (
                          <button
                            onClick={() => {
                              setSelectedSettlement(s);
                              setIsDisburseOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition inline-flex items-center gap-1 shadow-sm"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> Disburse
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

      {/* Compute Settlement Modal */}
      {isComputeOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl w-full max-w-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-foreground">Compute Full & Final Settlement (FnF)</h3>
                <p className="text-xs text-muted-foreground">Automated BLA 2006 statutory remuneration engine</p>
              </div>
              <button
                onClick={() => setIsComputeOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleComputeSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Separation Case *
                </label>
                <select
                  required
                  value={computeForm.separation_id}
                  onChange={(e) => setComputeForm({ ...computeForm, separation_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                >
                  <option value="">Select Separation Case</option>
                  {separations.map((sep) => (
                    <option key={sep.id} value={sep.id}>
                      {sep.separation_number} - {sep.employee?.first_name} {sep.employee?.last_name || ""} (
                      {sep.employee?.employee_id}) - {sep.separation_type}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  The system will automatically query the employee's service tenure (gratuity), unavailed leave balance (encashment), notice shortfall, active loans, and department clearance recovery charges.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Unpaid Working Days in Exit Month
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={31}
                    value={computeForm.unpaid_salary_days}
                    onChange={(e) => setComputeForm({ ...computeForm, unpaid_salary_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground mt-0.5">Calculated at pro-rated daily gross rate</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Bonus Arrears (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={computeForm.bonus_arrears_amount}
                    onChange={(e) => setComputeForm({ ...computeForm, bonus_arrears_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Other Payables / Reimbursements (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={computeForm.other_payable_amount}
                    onChange={(e) => setComputeForm({ ...computeForm, other_payable_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Asset Damage Recovery (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={computeForm.asset_damage_deduction}
                    onChange={(e) => setComputeForm({ ...computeForm, asset_damage_deduction: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Tax (AIT) Withholding (৳)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={computeForm.tax_withholding_deduction}
                  onChange={(e) => setComputeForm({ ...computeForm, tax_withholding_deduction: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Settlement Calculation Notes
                </label>
                <textarea
                  rows={2}
                  value={computeForm.notes}
                  onChange={(e) => setComputeForm({ ...computeForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsComputeOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-muted-foreground hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition"
                >
                  {isSubmitting ? "Computing..." : "Run Statutory Calculation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disburse Settlement Modal */}
      {isDisburseOpen && selectedSettlement && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-foreground">Disburse Final Settlement</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedSettlement.settlement_number} • {selectedSettlement.employee?.first_name}{" "}
                  {selectedSettlement.employee?.last_name || ""}
                </p>
              </div>
              <button
                onClick={() => setIsDisburseOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDisburseSubmit} className="p-6 space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between items-center text-sm font-bold text-foreground">
                  <span>Net Payable to Employee:</span>
                  <span className="text-emerald-600 text-base">
                    ৳{Number(selectedSettlement.net_payable_amount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-muted-foreground text-[11px] pt-1 border-t border-emerald-500/20">
                  CRITICAL: Disbursing will automatically conclude offboarding, mark the employee profile as Inactive, and deactivate system login credentials.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Payment Method *
                </label>
                <select
                  value={disburseForm.payment_method}
                  onChange={(e) => setDisburseForm({ ...disburseForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="bank_transfer">Direct Bank Transfer / EFTN / RTGS</option>
                  <option value="cheque">Account Payee Cheque</option>
                  <option value="mfs_bkash">bKash Corporate Payout</option>
                  <option value="cash">Cash Voucher</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Transaction / Cheque Reference # *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EFTN-20261024-8849 / CHQ-104928"
                  value={disburseForm.payment_reference}
                  onChange={(e) => setDisburseForm({ ...disburseForm, payment_reference: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Disbursement Remarks
                </label>
                <textarea
                  rows={2}
                  value={disburseForm.notes}
                  onChange={(e) => setDisburseForm({ ...disburseForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsDisburseOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-muted-foreground hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
                >
                  {isSubmitting ? "Disbursing..." : "Confirm & Finalize Offboarding"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
