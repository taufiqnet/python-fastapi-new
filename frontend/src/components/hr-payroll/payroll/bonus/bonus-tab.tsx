"use client";

import React, { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import {
  Gift,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  DollarSign,
  Users,
  Award,
  Sparkles,
  Calendar,
  Layers,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import {
  BonusPolicyOut,
  BonusPolicyCreatePayload,
  BonusRunOut,
  BonusRunCreatePayload,
  PayrollPeriodOut,
} from "@/types";

interface BonusTabProps {
  periods: PayrollPeriodOut[];
  currentBusinessId: number;
}

export function BonusTab({ periods, currentBusinessId }: BonusTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Data states
  const [policies, setPolicies] = useState<BonusPolicyOut[]>([]);
  const [runs, setRuns] = useState<BonusRunOut[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState<boolean>(false);
  const [isRunModalOpen, setIsRunModalOpen] = useState<boolean>(false);
  const [isSubmittingPolicy, setIsSubmittingPolicy] = useState<boolean>(false);
  const [isSubmittingRun, setIsSubmittingRun] = useState<boolean>(false);

  // Policy Form State
  const [policyForm, setPolicyForm] = useState<BonusPolicyCreatePayload>({
    business_id: currentBusinessId,
    name: "",
    bonus_type: "festival",
    calculation_basis: "percent_basic",
    percentage_or_amount: 100,
    min_service_months: 6,
    is_taxable: true,
    is_active: true,
  });

  // Run Form State
  const [runForm, setRunForm] = useState<BonusRunCreatePayload>({
    business_id: currentBusinessId,
    policy_id: "",
    payroll_period_id: periods[0]?.id || null,
    run_date: new Date().toISOString().split("T")[0],
  });

  // Fetch policies and runs
  const fetchData = useCallback(
    async (isBackground = false) => {
      if (isBackground) setIsFetching(true);
      else setInitialLoading(true);
      setError(null);

      try {
        const [policiesRes, runsRes] = await Promise.all([
          apiClient.get<BonusPolicyOut[]>(`/payroll/bonus-policies?business_id=${currentBusinessId}`),
          apiClient.get<BonusRunOut[]>(`/payroll/bonus-runs?business_id=${currentBusinessId}`),
        ]);

        setPolicies(policiesRes.data || []);
        setRuns(runsRes.data || []);
        if (policiesRes.data?.length && !runForm.policy_id) {
          setRunForm((prev) => ({ ...prev, policy_id: policiesRes.data[0].id }));
        }
      } catch (err) {
        console.error("Failed to load bonus data:", err);
        setError("Failed to load bonus policies and run history.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [currentBusinessId]
  );

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Policy lookup map
  const policyMap = useMemo(() => {
    const map: Record<string, BonusPolicyOut> = {};
    policies.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [policies]);

  // Period lookup map
  const periodMap = useMemo(() => {
    const map: Record<string, PayrollPeriodOut> = {};
    periods.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [periods]);

  // Create Bonus Policy
  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyForm.name.trim()) {
      toast.error("Validation Error", "Please provide a policy name.");
      return;
    }
    if (policyForm.percentage_or_amount <= 0) {
      toast.error("Validation Error", "Percentage or amount must be greater than zero.");
      return;
    }

    setIsSubmittingPolicy(true);
    try {
      await apiClient.post("/payroll/bonus-policies", {
        ...policyForm,
        business_id: currentBusinessId,
        percentage_or_amount: Number(policyForm.percentage_or_amount),
        min_service_months: Number(policyForm.min_service_months) || 0,
      });

      toast.success("Policy Created", `Bonus policy ${policyForm.name} configured.`);
      setIsPolicyModalOpen(false);
      setPolicyForm({
        business_id: currentBusinessId,
        name: "",
        bonus_type: "festival",
        calculation_basis: "percent_basic",
        percentage_or_amount: 100,
        min_service_months: 6,
        is_taxable: true,
        is_active: true,
      });
      fetchData(true);
    } catch (err: any) {
      toast.error("Creation Failed", err?.response?.data?.detail || "Could not create policy.");
    } finally {
      setIsSubmittingPolicy(false);
    }
  };

  // Execute Bonus Run
  const handleExecuteRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!runForm.policy_id) {
      toast.error("Validation Error", "Please select a bonus policy.");
      return;
    }

    setIsSubmittingRun(true);
    try {
      await apiClient.post("/payroll/bonus-runs", {
        ...runForm,
        business_id: currentBusinessId,
        payroll_period_id: runForm.payroll_period_id || undefined,
      });

      toast.success("Bonus Process Initiated", "Bonus batch generated and attached to payroll cycle.");
      setIsRunModalOpen(false);
      fetchData(true);
    } catch (err: any) {
      toast.error("Execution Failed", err?.response?.data?.detail || "Could not execute bonus run.");
    } finally {
      setIsSubmittingRun(false);
    }
  };

  // Metrics
  const activePoliciesCount = useMemo(() => policies.filter((p) => p.is_active).length, [policies]);
  const totalBonusPaidOut = useMemo(
    () => runs.reduce((acc, r) => acc + (r.total_amount || 0), 0),
    [runs]
  );
  const totalBeneficiaries = useMemo(
    () => runs.reduce((acc, r) => acc + (r.headcount || 0), 0),
    [runs]
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Gift className="w-5 h-5 text-indigo-600" />
              Festival & Performance Bonus Engine
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure statutory festival bonuses (Eid, Puja, Bangla New Year) or performance profit shares and link to processing cycles
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchData(true)}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => setIsPolicyModalOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              New Bonus Policy
            </button>

            <button
              type="button"
              onClick={() => setIsRunModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              Execute Bonus Run
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
            <div className="text-[10px] font-bold uppercase text-slate-400">Configured Policies</div>
            <div className="text-lg font-black text-slate-800 mt-0.5">
              {activePoliciesCount} Active ({policies.length} Total)
            </div>
          </div>

          <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
            <div className="text-[10px] font-bold uppercase text-emerald-700">Total Bonus Volume Disbursed</div>
            <div className="text-lg font-black text-emerald-800 mt-0.5">
              ৳ {totalBonusPaidOut.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-100">
            <div className="text-[10px] font-bold uppercase text-purple-700">Cumulative Beneficiaries</div>
            <div className="text-lg font-black text-purple-800 mt-0.5">
              {totalBeneficiaries} Employee Dispatches
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Policies Catalog & Runs History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Bonus Policies */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden relative flex flex-col">
          <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-500" />
                Bonus Policies Catalog
              </h3>
              <p className="text-xs text-slate-500">Formulas, eligibility criteria, and taxability</p>
            </div>
            <span className="text-xs font-bold text-slate-400">{policies.length} Policies</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5">Policy Name</th>
                  <th className="px-4 py-2.5">Basis</th>
                  <th className="px-4 py-2.5 text-right">Value</th>
                  <th className="px-4 py-2.5">Tenure Req.</th>
                  <th className="px-4 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {policies.length > 0 ? (
                  policies.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{p.bonus_type} Bonus</div>
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-700">
                        {p.calculation_basis.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-indigo-600">
                        {p.calculation_basis === "flat_amount"
                          ? `৳ ${p.percentage_or_amount.toLocaleString()}`
                          : `${p.percentage_or_amount}%`}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.min_service_months} Mo.</td>
                      <td className="px-4 py-3 text-right">
                        {p.is_active ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No bonus policies found. Click "New Bonus Policy" to add.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Bonus Runs & Dispatches */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden relative flex flex-col">
          <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                Bonus Batch Dispatches
              </h3>
              <p className="text-xs text-slate-500">Historical runs linked to salary cycles</p>
            </div>
            <span className="text-xs font-bold text-slate-400">{runs.length} Runs</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5">Policy & Cycle</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5 text-right">Headcount</th>
                  <th className="px-4 py-2.5 text-right">Batch Volume</th>
                  <th className="px-4 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {runs.length > 0 ? (
                  runs.map((r) => {
                    const policy = policyMap[r.policy_id];
                    const period = r.payroll_period_id ? periodMap[r.payroll_period_id] : null;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{policy?.name || "Bonus Batch"}</div>
                          <div className="text-[10px] text-slate-400">
                            {period ? period.name : "Standalone Run"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.run_date}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          {r.headcount || 0}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-emerald-600">
                          ৳ {(r.total_amount || 0).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                            {r.status || "Completed"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No bonus runs executed yet. Click "Execute Bonus Run" to launch.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Policy Modal */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Configure Bonus Policy</h3>
              <button
                type="button"
                onClick={() => setIsPolicyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Policy Name *</label>
                <input
                  type="text"
                  required
                  value={policyForm.name}
                  onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                  placeholder="e.g. Eid-ul-Fitr Festival Bonus, Annual Profit Bonus"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Bonus Type</label>
                  <select
                    value={policyForm.bonus_type}
                    onChange={(e: any) =>
                      setPolicyForm({ ...policyForm, bonus_type: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="festival">Festival Bonus</option>
                    <option value="performance">Performance Bonus</option>
                    <option value="attendance">Attendance Incentive</option>
                    <option value="special">Special Discretionary</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Calculation Basis</label>
                  <select
                    value={policyForm.calculation_basis}
                    onChange={(e: any) =>
                      setPolicyForm({ ...policyForm, calculation_basis: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="percent_basic">% of Basic Salary</option>
                    <option value="percent_gross">% of Gross Salary</option>
                    <option value="flat_amount">Flat Fixed Amount (৳)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Value (% or ৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={policyForm.percentage_or_amount || ""}
                    onChange={(e) =>
                      setPolicyForm({
                        ...policyForm,
                        percentage_or_amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="100"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Min Service (Months)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={policyForm.min_service_months ?? 6}
                    onChange={(e) =>
                      setPolicyForm({
                        ...policyForm,
                        min_service_months: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    placeholder="6"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyForm.is_taxable}
                    onChange={(e) => setPolicyForm({ ...policyForm, is_taxable: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium text-slate-700">Subject to Income Tax</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyForm.is_active}
                    onChange={(e) => setPolicyForm({ ...policyForm, is_active: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium text-slate-700">Active Status</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPolicyModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPolicy}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmittingPolicy ? "Saving..." : "Save Policy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Execute Run Modal */}
      {isRunModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Launch Bonus Disbursement Run</h3>
              <button
                type="button"
                onClick={() => setIsRunModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteRun} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Select Bonus Policy *
                </label>
                <select
                  required
                  value={runForm.policy_id}
                  onChange={(e) => setRunForm({ ...runForm, policy_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select Policy...</option>
                  {policies
                    .filter((p) => p.is_active)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.percentage_or_amount}
                        {p.calculation_basis === "flat_amount" ? "৳" : "%"})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Target Payroll Period
                </label>
                <select
                  value={runForm.payroll_period_id || ""}
                  onChange={(e) =>
                    setRunForm({ ...runForm, payroll_period_id: e.target.value || null })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Standalone Run (Not tied to cycle)</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Run Date *</label>
                <input
                  type="date"
                  required
                  value={runForm.run_date}
                  onChange={(e) => setRunForm({ ...runForm, run_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-purple-800 text-[11px]">
                Bonus calculation automatically inspects employee tenure against policy threshold and injects bonus credits into monthly payslips.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRunModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRun}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmittingRun ? "Processing..." : "Execute Run"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
