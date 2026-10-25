"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  Warehouse,
  Calendar,
  CheckCircle2,
  Clock,
  Play,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  AlertCircle,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { formatDate } from "@/lib/utils";
import { StockCountOut, WarehouseOut } from "@/types";

export default function StockCountsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  // Primary State
  const [counts, setCounts] = useState<StockCountOut[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOut[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Schedule Modal
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [modalWarehouseId, setModalWarehouseId] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [countNotes, setCountNotes] = useState<string>("");
  const [countSaving, setCountSaving] = useState<boolean>(false);

  // Fetch Warehouses
  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await apiClient.get<WarehouseOut[]>("/inventory/warehouses", {
        params: { business_id: user?.business_id || 1 },
      });
      setWarehouses(res.data || []);
      if (res.data?.length > 0) {
        setModalWarehouseId(res.data[0].id);
      }
    } catch (err) {
      console.error("Failed to load warehouses", err);
    }
  }, [user?.business_id]);

  // Fetch Stock Counts with in-place transition
  const fetchCounts = useCallback(
    async (isBackground = false) => {
      if (!isBackground) {
        setInitialLoading(true);
      } else {
        setIsFetching(true);
      }

      try {
        const params: Record<string, unknown> = {
          business_id: user?.business_id || 1,
          skip: (currentPage - 1) * pageSize,
          limit: pageSize,
        };

        if (statusFilter !== "all") {
          params.status = statusFilter;
        }
        if (selectedWarehouseId !== "all") {
          params.warehouse_id = selectedWarehouseId;
        }

        const res = await apiClient.get<StockCountOut[]>("/inventory/counts", { params });
        let data = res.data || [];

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          data = data.filter(
            (c) =>
              c.warehouse_name?.toLowerCase().includes(q) ||
              c.counted_by?.toLowerCase().includes(q)
          );
        }

        setCounts(data);
      } catch (err) {
        console.error("Failed to load stock counts", err);
        toast.error("Data Load Error", "Failed to retrieve physical stock count audits.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [user?.business_id, currentPage, statusFilter, selectedWarehouseId, searchQuery, toast]
  );

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  useEffect(() => {
    fetchCounts(counts.length > 0);
  }, [currentPage, statusFilter, selectedWarehouseId, searchQuery]);

  // Start Count Transition
  const handleStartCount = async (countId: string) => {
    try {
      await apiClient.post(`/inventory/counts/${countId}/start`, null, {
        params: { business_id: user?.business_id || 1 },
      });
      toast.success("Count Started", "Audit session marked in progress.");
      fetchCounts(true);
    } catch (err) {
      toast.error("Error", "Unable to start audit count session.");
    }
  };

  // Complete Count Transition
  const handleCompleteCount = async (countId: string) => {
    try {
      await apiClient.post(`/inventory/counts/${countId}/complete`, null, {
        params: { business_id: user?.business_id || 1 },
      });
      toast.success("Count Completed", "Audit reconciliation finalized.");
      fetchCounts(true);
    } catch (err) {
      toast.error("Error", "Unable to complete count session.");
    }
  };

  // Schedule Count Action
  const handleScheduleCount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalWarehouseId) {
      toast.error("Validation Error", "Please select a warehouse for the count.");
      return;
    }

    setCountSaving(true);
    try {
      await apiClient.post("/inventory/counts", {
        warehouse_id: modalWarehouseId,
        scheduled_date: scheduledDate,
        notes: countNotes.trim() || undefined,
        business_id: user?.business_id || 1,
      });

      toast.success("Count Scheduled", "Physical inventory audit has been booked.");
      setShowScheduleModal(false);
      setCountNotes("");
      fetchCounts(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to schedule count.";
      toast.error("Scheduling Error", msg);
    } finally {
      setCountSaving(false);
    }
  };

  const openCount = counts.filter((c) => c.status === "open").length;
  const inProgressCount = counts.filter((c) => c.status === "in_progress").length;
  const completedCount = counts.filter((c) => c.status === "completed").length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Stock Audits & Physical Counts
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Periodic cycle counts, physical verification audits, and inventory variance reconciliation.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowScheduleModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Schedule Count
            </button>
            <button
              onClick={() => fetchCounts(true)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-xl shadow-xs transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Scheduled (Open)</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{openCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Play className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">In Progress</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{inProgressCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Reconciled</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{completedCount}</p>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Top-rim indeterminate line */}
          <div className="h-1 w-full bg-slate-100 overflow-hidden relative">
            {isFetching && (
              <div className="h-full bg-linear-to-r from-indigo-500 to-emerald-500 animate-pulse w-full" />
            )}
          </div>

          {/* Filters Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {["all", "open", "in_progress", "completed"].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    startTransition(() => {
                      setStatusFilter(st);
                      setCurrentPage(1);
                    });
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all shrink-0 ${
                    statusFilter === st
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100/70 text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => {
                    const val = e.target.value;
                    startTransition(() => {
                      setSelectedWarehouseId(val);
                      setCurrentPage(1);
                    });
                  }}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                >
                  <option value="all">All Warehouses</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative w-full md:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search auditor..."
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    startTransition(() => {
                      setSearchQuery(val);
                      setCurrentPage(1);
                    });
                  }}
                  className="w-full pl-10 pr-4 py-1.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50"
                />
              </div>
            </div>
          </div>

          {/* Table Container - Never unmounted */}
          <div className="overflow-x-auto min-h-[250px] relative">
            {initialLoading ? (
              <div className="p-8 text-center text-slate-400">Loading audit sessions...</div>
            ) : counts.length === 0 ? (
              <div className="p-12 text-center">
                <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800">No stock count sessions found</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Schedule a physical cycle count to ensure stock ledger accuracy.
                </p>
              </div>
            ) : (
              <table
                className={`w-full text-left border-collapse transition-opacity duration-200 ${
                  isFetching ? "opacity-60" : "opacity-100"
                }`}
              >
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Warehouse</th>
                    <th className="py-3.5 px-4">Scheduled Date</th>
                    <th className="py-3.5 px-4">Counted By</th>
                    <th className="py-3.5 px-4 text-center">Items Audited</th>
                    <th className="py-3.5 px-4 text-center">Variance Found</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {counts.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-900 flex items-center gap-2">
                        <Warehouse className="w-4 h-4 text-slate-400" />
                        {c.warehouse_name || "Main Warehouse"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(c.scheduled_date)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        {c.counted_by || "Unassigned"}
                      </td>
                      <td className="py-3.5 px-4 text-center font-medium text-slate-800">
                        {c.items_count || 0}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {(c.variance_count || 0) > 0 ? (
                          <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            {c.variance_count} lines
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {c.status === "completed" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Completed
                          </span>
                        ) : c.status === "in_progress" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Open
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {c.status === "open" && (
                            <button
                              onClick={() => handleStartCount(c.id)}
                              className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-2xs transition-colors"
                            >
                              Start
                            </button>
                          )}
                          {c.status === "in_progress" && (
                            <button
                              onClick={() => handleCompleteCount(c.id)}
                              className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors"
                            >
                              Finalize
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer Pagination */}
          <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{counts.length}</span> audit sessions
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1 || isFetching}
                onClick={() =>
                  startTransition(() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                  })
                }
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-slate-600">Page {currentPage}</span>
              <button
                disabled={counts.length < pageSize || isFetching}
                onClick={() =>
                  startTransition(() => {
                    setCurrentPage((p) => p + 1);
                  })
                }
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Count Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <ClipboardCheck className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Schedule Physical Count</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Initiate an inventory cycle count audit</p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleCount} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Warehouse Location *
                </label>
                <select
                  value={modalWarehouseId}
                  onChange={(e) => setModalWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                >
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Scheduled Audit Date *
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Audit Notes / Scope
                </label>
                <textarea
                  rows={3}
                  value={countNotes}
                  onChange={(e) => setCountNotes(e.target.value)}
                  placeholder="e.g. End of month cycle count for electronics section..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={countSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {countSaving ? "Scheduling..." : "Schedule Audit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
