"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Sparkles,
  Trash2,
  RefreshCw,
  Users,
  Truck,
  ShoppingBag,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Database,
  ShieldAlert,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface SeedBatchSummary {
  id: string;
  batch_code?: string;
  module: string;
  status: string;
  record_count: number;
  created_at: string | null;
  metadata_info: Record<string, number> | null;
}

interface SeedStatusResponse {
  business_id: number;
  counts: {
    hrm: number;
    vehicles: number;
    ecommerce: number;
    finance: number;
    total: number;
  };
  recent_batches: SeedBatchSummary[];
}

interface ConfirmDialogState {
  isOpen: boolean;
  action: "generate" | "purge";
  module: string;
  moduleName: string;
}

export default function SeedDataAdministrationPage() {
  const [statusData, setStatusData] = useState<SeedStatusResponse | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isOperating, setIsOperating] = useState(false);
  const [activeOperatingModule, setActiveOperatingModule] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    action: "generate",
    module: "all",
    moduleName: "All Modules",
  });

  const [, startTransition] = useTransition();

  const fetchStatus = async (background = false) => {
    if (background) setIsFetching(true);
    try {
      const res = await apiClient.get<SeedStatusResponse>("/api/v1/system/seed-data/status");
      startTransition(() => {
        setStatusData(res.data);
        setError(null);
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Failed to load seed data status.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleExecuteAction = async () => {
    const { action, module } = confirmDialog;
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    setIsOperating(true);
    setActiveOperatingModule(module);
    setError(null);
    setSuccessMsg(null);

    try {
      if (action === "generate") {
        const res = await apiClient.post("/api/v1/system/seed-data/generate", { module });
        setSuccessMsg(res.data.message || `Successfully generated seed data for ${module}.`);
      } else {
        const res = await apiClient.delete(`/api/v1/system/seed-data/purge?module=${module}`);
        setSuccessMsg(res.data.message || `Successfully purged seed data for ${module}.`);
      }
      await fetchStatus(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || `Failed to perform ${action} operation.`);
    } finally {
      setIsOperating(false);
      setActiveOperatingModule(null);
    }
  };

  const openConfirmation = (action: "generate" | "purge", module: string, moduleName: string) => {
    setConfirmDialog({
      isOpen: true,
      action,
      module,
      moduleName,
    });
  };

  const modulesConfig = [
    {
      id: "hrm",
      name: "HR & Payroll",
      icon: Users,
      color: "from-blue-600 to-indigo-600",
      accentBg: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      countKey: "hrm" as const,
      description:
        "Generates 5 Bangladeshi employees, departments, job titles, BLA 2006 statutory leave allocations, general day shift, biometric attendance records, and annual appraisal goals.",
    },
    {
      id: "vehicles",
      name: "Vehicle & Fleet Management",
      icon: Truck,
      color: "from-amber-600 to-orange-600",
      accentBg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      countKey: "vehicles" as const,
      description:
        "Generates 4 BRTA-registered fleet vehicles (Sedan, Microbus, Covered Van, Pajero), 3 heavy/light licensed drivers, requisitions, trip sheets, fuel vouchers, work orders, and tires.",
    },
    {
      id: "ecommerce",
      name: "E-Commerce & Retail / POS",
      icon: ShoppingBag,
      color: "from-emerald-600 to-teal-600",
      accentBg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      countKey: "ecommerce" as const,
      description:
        "Generates product categories, brands (Apex, Walton), products, variants, Dhaka & Chattogram logistics warehouses, inventory levels, sample orders, and captured payments.",
    },
    {
      id: "finance",
      name: "Finance & Accounts",
      icon: Wallet,
      color: "from-purple-600 to-pink-600",
      accentBg: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      countKey: "finance" as const,
      description:
        "Generates standard Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expenses), FY 2025-2026 with 12 monthly periods, opening journal vouchers, B2B customers, sales invoices, and Mushak 6.3 challans.",
    },
  ];

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 space-y-8">
      {/* Background indeterminate fetching rim */}
      {isFetching && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-emerald-400 to-indigo-500 animate-pulse z-50" />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                Test & Demo Seed Data Management
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Tenant Scoped
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Generate and one-click safely purge realistic Bangladeshi enterprise test data across all ProERP modules.
              </p>
            </div>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchStatus(true)}
            disabled={isFetching || isOperating}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-sm font-medium transition"
          >
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            Refresh
          </button>
          <button
            onClick={() => openConfirmation("generate", "all", "All 4 Modules")}
            disabled={isOperating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            Generate All Modules
          </button>
          <button
            onClick={() => openConfirmation("purge", "all", "All 4 Modules")}
            disabled={isOperating || (statusData?.counts.total ?? 0) === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600/20 border border-rose-500/30 hover:bg-rose-600/30 text-rose-300 text-sm font-semibold transition disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            Purge All Seed Data
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            Total Seed Records
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white mt-2">
            {initialLoading ? "..." : (statusData?.counts.total ?? 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">Across all registered tables</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            HR & Payroll Records
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white mt-2">
            {initialLoading ? "..." : (statusData?.counts.hrm ?? 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">Employees, shifts & leaves</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            Vehicles & Fleet Records
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white mt-2">
            {initialLoading ? "..." : (statusData?.counts.vehicles ?? 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">BRTA fleet, drivers & trips</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            Retail & Finance Records
            <Wallet className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-white mt-2">
            {initialLoading
              ? "..."
              : ((statusData?.counts.ecommerce ?? 0) + (statusData?.counts.finance ?? 0)).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">SKUs, orders, COA & VAT</div>
        </div>
      </div>

      {/* Module Generator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modulesConfig.map((mod) => {
          const Icon = mod.icon;
          const currentCount = statusData?.counts[mod.countKey] ?? 0;
          const isCurrentOperating = isOperating && (activeOperatingModule === mod.id || activeOperatingModule === "all");

          return (
            <div
              key={mod.id}
              className="flex flex-col justify-between p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-xl backdrop-blur-md"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-3 rounded-xl bg-gradient-to-br shadow-md text-white", mod.color)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{mod.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", mod.accentBg)}>
                          {currentCount} Active Seed Records
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-400 leading-relaxed mb-6">{mod.description}</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/60">
                <button
                  onClick={() => openConfirmation("purge", mod.id, mod.name)}
                  disabled={isOperating || currentCount === 0}
                  className="px-3.5 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Purge Data
                </button>
                <button
                  onClick={() => openConfirmation("generate", mod.id, mod.name)}
                  disabled={isOperating}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className={cn("w-3.5 h-3.5 text-indigo-400", isCurrentOperating && "animate-spin")} />
                  {isCurrentOperating ? "Operating..." : "Generate Seed"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Seed Batch History Table */}
      <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 overflow-hidden shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Recent Seed Generation Batches</h2>
          </div>
          <span className="text-xs text-slate-500">Registry Log</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Batch ID / Code</th>
                <th className="py-3.5 px-6">Module</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Record Count</th>
                <th className="py-3.5 px-6">Generated At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {initialLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Loading seed batch logs...
                  </td>
                </tr>
              ) : !statusData?.recent_batches || statusData.recent_batches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No seed batches recorded yet. Click &quot;Generate Seed&quot; above to initialize test data.
                  </td>
                </tr>
              ) : (
                statusData.recent_batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-6 font-mono text-xs text-indigo-400 font-semibold">
                      {batch.batch_code || batch.id.slice(0, 8)}
                    </td>
                    <td className="py-4 px-6 capitalize font-medium text-slate-200">
                      {batch.module}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {batch.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold text-white">
                      {batch.record_count.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-400">
                      {batch.created_at ? new Date(batch.created_at).toLocaleString() : "N/A"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "p-3 rounded-xl",
                  confirmDialog.action === "purge"
                    ? "bg-rose-500/10 text-rose-500"
                    : "bg-indigo-500/10 text-indigo-500"
                )}
              >
                {confirmDialog.action === "purge" ? (
                  <ShieldAlert className="w-6 h-6" />
                ) : (
                  <Sparkles className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Confirm {confirmDialog.action === "purge" ? "Data Purge" : "Seed Generation"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Target: {confirmDialog.moduleName}</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              {confirmDialog.action === "purge" ? (
                <>
                  Are you sure you want to purge all test seed data for{" "}
                  <strong className="text-white">{confirmDialog.moduleName}</strong>? This operation will remove all
                  tracked seed entries in topological order.{" "}
                  <span className="text-rose-400 font-semibold">Real tenant production records will NOT be touched.</span>
                </>
              ) : (
                <>
                  Generate realistic enterprise test seed data for{" "}
                  <strong className="text-white">{confirmDialog.moduleName}</strong>? All generated records will be
                  visually tagged with <code className="text-indigo-400">[SEED]</code> identifiers and can be removed at
                  any time with one click.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                className={cn(
                  "px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-lg transition",
                  confirmDialog.action === "purge"
                    ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20"
                    : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20"
                )}
              >
                {confirmDialog.action === "purge" ? "Proceed Purge" : "Proceed Generate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
