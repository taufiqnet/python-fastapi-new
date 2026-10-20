"use client";

import React, { useEffect, useState, useMemo, startTransition, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import {
  PayrollPeriodOut,
  PayrollPeriodCreatePayload,
  PayrollPeriodUpdatePayload,
} from "@/types";

// Subcomponents
import { PeriodStatCards } from "@/components/hr-payroll/payroll/periods/period-stat-cards";
import { PeriodFilterBar } from "@/components/hr-payroll/payroll/periods/period-filter-bar";
import { PeriodTable } from "@/components/hr-payroll/payroll/periods/period-table";
import { PeriodModal } from "@/components/hr-payroll/payroll/periods/modals/period-modal";
import { PeriodExportModal } from "@/components/hr-payroll/payroll/periods/modals/period-export-modal";
import { PayrollSettingsTab } from "@/components/hr-payroll/payroll/settings/payroll-settings-tab";

import {
  DollarSign,
  Calendar,
  Settings,
  Plus,
  Download,
  Trash2,
  AlertTriangle,
  Cog,
  CheckCircle2,
} from "lucide-react";

interface BusinessItem {
  id: number;
  name_en: string;
}

type TabType = "periods" | "settings";

function PayrollContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const isSuperuser = Boolean(user?.is_superuser);
  const currentBusinessId = user?.business_id || 1;

  // Active Tab state
  const initialTab = (searchParams.get("tab") as TabType) || "periods";
  const [activeTab, setActiveTab] = useState<TabType>(
    initialTab === "settings" ? "settings" : "periods"
  );

  // Sync tab with URL
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.replace(`/hr-payroll/payroll?tab=${tab}`);
  };

  // Data States for Periods
  const [periods, setPeriods] = useState<PayrollPeriodOut[]>([]);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);

  // Dual Loading State Invariant
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State for Periods
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBusiness, setSelectedBusiness] = useState<string | number>(
    isSuperuser ? "" : currentBusinessId
  );

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals State
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState<boolean>(false);
  const [editingPeriod, setEditingPeriod] = useState<PayrollPeriodOut | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [periodToDelete, setPeriodToDelete] = useState<PayrollPeriodOut | null>(null);

  // Generate Salary Confirm Dialog State
  const [periodToGenerate, setPeriodToGenerate] = useState<PayrollPeriodOut | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Business Mapping
  const businessMap = useMemo(() => {
    const map: Record<number, string> = {};
    businesses.forEach((b) => {
      map[b.id] = b.name_en;
    });
    return map;
  }, [businesses]);

  // Fetch Businesses
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        if (isSuperuser) {
          const res = await apiClient.get<BusinessItem[]>("/businesses");
          setBusinesses(res.data || []);
        } else {
          setBusinesses([
            {
              id: currentBusinessId,
              name_en:
                user?.business?.name_en ||
                (user as any)?.business_profile?.name_en ||
                "My Business",
            },
          ]);
        }
      } catch {
        // non-blocking
      }
    };
    fetchBusinesses();
  }, [isSuperuser, currentBusinessId, user]);

  // Fetch Payroll Periods
  const fetchPeriods = useCallback(
    async (isInitial = false) => {
      if (isInitial) {
        setInitialLoading(true);
      } else {
        setIsFetching(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams();
        const skip = (currentPage - 1) * pageSize;
        params.set("skip", String(skip));
        params.set("limit", String(pageSize));

        if (selectedBusiness) {
          params.set("business_id", String(selectedBusiness));
        } else if (!isSuperuser && currentBusinessId) {
          params.set("business_id", String(currentBusinessId));
        }

        const res = await apiClient.get<PayrollPeriodOut[]>(`/payroll/periods?${params.toString()}`);
        setPeriods(res.data || []);
      } catch {
        setError("Failed to load payroll periods from server.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [currentPage, pageSize, selectedBusiness, isSuperuser, currentBusinessId]
  );

  useEffect(() => {
    if (activeTab === "periods") {
      fetchPeriods(initialLoading);
    }
  }, [fetchPeriods, activeTab]);

  // Filter periods locally for client search & status
  const filteredPeriods = useMemo(() => {
    return periods.filter((p) => {
      if (search.trim()) {
        const term = search.toLowerCase();
        const matchName = p.name.toLowerCase().includes(term);
        const matchNotes = p.notes ? p.notes.toLowerCase().includes(term) : false;
        if (!matchName && !matchNotes) return false;
      }
      if (statusFilter && statusFilter !== "all") {
        const pStatus = (typeof p.status === "string" ? p.status : (p.status as any).value || "").toLowerCase();
        if (pStatus !== statusFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [periods, search, statusFilter]);

  // Metric counts across loaded periods
  const { draftCount, processingCount, lockedCount, paidCount } = useMemo(() => {
    let d = 0;
    let proc = 0;
    let lk = 0;
    let pd = 0;

    periods.forEach((p) => {
      const st = (typeof p.status === "string" ? p.status : (p.status as any).value || "").toLowerCase();
      if (p.is_locked || st === "locked") lk++;
      else if (st === "draft") d++;
      else if (st === "processing") proc++;
      else if (st === "paid") pd++;
    });

    return {
      draftCount: d,
      processingCount: proc,
      lockedCount: lk,
      paidCount: pd,
    };
  }, [periods]);

  // Filter handlers with startTransition
  const handleSearchChange = (val: string) => {
    startTransition(() => {
      setSearch(val);
      setCurrentPage(1);
    });
  };

  const handleStatusChange = (val: string) => {
    startTransition(() => {
      setStatusFilter(val);
      setCurrentPage(1);
    });
  };

  const handleBusinessChange = (val: string | number) => {
    startTransition(() => {
      setSelectedBusiness(val);
      setCurrentPage(1);
    });
  };

  const handleResetFilters = () => {
    startTransition(() => {
      setSearch("");
      setStatusFilter("all");
      if (isSuperuser) setSelectedBusiness("");
      setCurrentPage(1);
    });
  };

  // Save (Create or Edit Period)
  const handleSavePeriod = async (
    payload: PayrollPeriodCreatePayload | PayrollPeriodUpdatePayload,
    id?: string
  ): Promise<boolean> => {
    try {
      if (id) {
        await apiClient.put(`/payroll/periods/${id}`, payload);
        toast.success("Period Updated", "Payroll cycle updated successfully.");
      } else {
        await apiClient.post("/payroll/periods", payload);
        toast.success("Period Created", "New payroll cycle defined successfully.");
      }
      fetchPeriods(false);
      return true;
    } catch {
      toast.error("Error", "Could not save payroll period. Please try again.");
      return false;
    }
  };

  // Delete Period
  const handleConfirmDelete = async () => {
    if (!periodToDelete) return;
    try {
      await apiClient.delete(`/payroll/periods/${periodToDelete.id}`);
      toast.success("Period Deleted", "Payroll cycle has been removed.");
      setPeriodToDelete(null);
      fetchPeriods(false);
    } catch {
      toast.error("Error", "Failed to delete payroll period.");
    }
  };

  // Generate Monthly Salary
  const handleConfirmGenerateSalary = async () => {
    if (!periodToGenerate) return;
    setIsGenerating(true);
    try {
      const res = await apiClient.post<any[]>(
        `/payroll/periods/${periodToGenerate.id}/generate`
      );
      toast.success(
        "Payroll Generated",
        `Generated/updated ${res.data?.length || 0} employee payslips for ${periodToGenerate.name}.`
      );
      setPeriodToGenerate(null);
      fetchPeriods(false);
    } catch {
      toast.error("Generation Failed", "Could not calculate payroll for this period.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> HR & Payroll
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Payroll Management
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Manage salary processing cycles, batch boundaries, and calculation rules
            </p>
          </div>

          {activeTab === "periods" && (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export Excel
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingPeriod(null);
                  setIsPeriodModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Create Payroll Period
              </button>
            </div>
          )}
        </div>

        {/* Unified Tab Navigation Bar */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => handleTabChange("periods")}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "periods"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Payroll Periods</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeTab === "periods"
                  ? "bg-indigo-50 text-indigo-700 font-bold"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {periods.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("settings")}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "settings"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Payroll Settings</span>
          </button>
        </div>

        {/* Tab 1: Payroll Periods Content */}
        {activeTab === "periods" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Metric Summary Cards */}
            <PeriodStatCards
              draftCount={draftCount}
              processingCount={processingCount}
              lockedCount={lockedCount}
              paidCount={paidCount}
            />

            {/* In-Place Non-Destructive Filter Bar */}
            <PeriodFilterBar
              search={search}
              onSearchChange={handleSearchChange}
              status={statusFilter}
              onStatusChange={handleStatusChange}
              businessId={selectedBusiness}
              onBusinessChange={handleBusinessChange}
              businesses={businesses}
              isSuperuser={isSuperuser}
              onResetFilters={handleResetFilters}
              onExportClick={() => setIsExportModalOpen(true)}
              isFetching={isFetching}
            />

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => fetchPeriods(false)}
                  className="font-bold underline text-rose-800"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Periods Master Table with Non-Destructive Transitions */}
            <PeriodTable
              periods={filteredPeriods}
              businessMap={businessMap}
              isSuperuser={isSuperuser}
              onEdit={(p) => {
                setEditingPeriod(p);
                setIsPeriodModalOpen(true);
              }}
              onDelete={(p) => setPeriodToDelete(p)}
              onGenerateSalary={(p) => setPeriodToGenerate(p)}
              initialLoading={initialLoading}
              isFetching={isFetching}
              currentPage={currentPage}
              pageSize={pageSize}
              totalRecords={filteredPeriods.length}
              onPageChange={(p) =>
                startTransition(() => {
                  setCurrentPage(p);
                })
              }
              onPageSizeChange={(ps) =>
                startTransition(() => {
                  setPageSize(ps);
                  setCurrentPage(1);
                })
              }
            />
          </div>
        )}

        {/* Tab 2: Payroll Settings Content */}
        {activeTab === "settings" && (
          <div className="animate-in fade-in duration-150">
            <PayrollSettingsTab
              businesses={businesses}
              isSuperuser={isSuperuser}
              currentBusinessId={currentBusinessId}
            />
          </div>
        )}
      </div>

      {/* Period Modal (Create / Edit) */}
      <PeriodModal
        isOpen={isPeriodModalOpen}
        onClose={() => {
          setIsPeriodModalOpen(false);
          setEditingPeriod(null);
        }}
        onSave={handleSavePeriod}
        period={editingPeriod}
        businesses={businesses}
        isSuperuser={isSuperuser}
        currentBusinessId={currentBusinessId}
      />

      {/* Period Export Modal */}
      <PeriodExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        businesses={businesses}
        isSuperuser={isSuperuser}
        currentBusinessId={currentBusinessId}
      />

      {/* Delete Confirmation Modal */}
      {periodToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4 text-xs">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-900">
                Delete Payroll Period?
              </h3>
              <p className="text-slate-500 mt-1">
                Are you sure you want to delete period{" "}
                <strong className="text-slate-800">"{periodToDelete.name}"</strong>?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPeriodToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs"
              >
                Delete Period
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Salary Modal */}
      {periodToGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4 text-xs">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
              <Cog className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-900">
                Generate Monthly Salary?
              </h3>
              <p className="text-slate-500 mt-1">
                Generate and compute employee payslips for period{" "}
                <strong className="text-slate-800">"{periodToGenerate.name}"</strong>?
                Existing draft payslips will be evaluated and updated according to the active payroll rules.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPeriodToGenerate(null)}
                disabled={isGenerating}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmGenerateSalary}
                disabled={isGenerating}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold shadow-xs flex items-center gap-1.5"
              >
                {isGenerating ? "Calculating..." : "Yes, Generate Salary"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function PayrollPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-xs text-slate-500 font-medium animate-pulse">
            Loading Payroll Management...
          </div>
        </div>
      }
    >
      <PayrollContent />
    </Suspense>
  );
}
