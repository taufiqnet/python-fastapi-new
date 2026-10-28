"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import {
  ArrowRightLeft,
  Truck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Warehouse,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Package,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { formatDate } from "@/lib/utils";
import { StockTransferOut, WarehouseOut } from "@/types";
import { Mushak65Modal, Mushak65TransferData } from "@/components/finance/mushak-6-5-modal";
import { Printer } from "lucide-react";

export default function StockTransfersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  // Primary State
  const [transfers, setTransfers] = useState<StockTransferOut[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOut[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // New Transfer Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>("");
  const [destWarehouseId, setDestWarehouseId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [transferSaving, setTransferSaving] = useState<boolean>(false);

  // Mushak 6.5 Statutory Transfer Chalan State
  const [mushakTransferData, setMushakTransferData] = useState<Mushak65TransferData | null>(null);
  const [showMushakModal, setShowMushakModal] = useState<boolean>(false);

  const handleOpenMushak65 = (tr: StockTransferOut) => {
    setMushakTransferData({
      transferNumber: tr.transfer_number || tr.id.substring(0, 8),
      transferDate: tr.created_at,
      sourceWarehouse: tr.source_warehouse?.name || "Central Distribution Hub",
      destWarehouse: tr.destination_warehouse?.name || "Retail Outlet Branch",
      itemsCount: tr.items_count || 1,
      notes: tr.notes,
    });
    setShowMushakModal(true);
  };

  // Fetch Warehouses
  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await apiClient.get<WarehouseOut[]>("/inventory/warehouses", {
        params: { business_id: user?.business_id || 1 },
      });
      setWarehouses(res.data || []);
      if (res.data?.length >= 2) {
        setSourceWarehouseId(res.data[0].id);
        setDestWarehouseId(res.data[1].id);
      }
    } catch (err) {
      console.error("Failed to load warehouses", err);
    }
  }, [user?.business_id]);

  // Fetch Transfers
  const fetchTransfers = useCallback(
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

        const res = await apiClient.get<StockTransferOut[]>("/inventory/transfers", { params });
        let data = res.data || [];

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          data = data.filter(
            (t) =>
              t.transfer_number?.toLowerCase().includes(q) ||
              t.source_warehouse_name?.toLowerCase().includes(q) ||
              t.destination_warehouse_name?.toLowerCase().includes(q)
          );
        }

        setTransfers(data);
      } catch (err) {
        console.error("Failed to load stock transfers", err);
        toast.error("Data Load Error", "Failed to retrieve stock transfer records.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [user?.business_id, currentPage, statusFilter, searchQuery, toast]
  );

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  useEffect(() => {
    fetchTransfers(transfers.length > 0);
  }, [currentPage, statusFilter, searchQuery]);

  // Status Filter Change with startTransition
  const handleStatusChange = (status: string) => {
    startTransition(() => {
      setStatusFilter(status);
      setCurrentPage(1);
    });
  };

  // Search input change with startTransition
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    startTransition(() => {
      setSearchQuery(val);
      setCurrentPage(1);
    });
  };

  // Create Transfer Action
  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceWarehouseId === destWarehouseId) {
      toast.error("Invalid Transfer", "Source and destination warehouses cannot be identical.");
      return;
    }

    setTransferSaving(true);
    try {
      await apiClient.post("/inventory/transfers", {
        source_warehouse_id: sourceWarehouseId,
        destination_warehouse_id: destWarehouseId,
        notes: notes.trim() || undefined,
        business_id: user?.business_id || 1,
        items: [],
      });

      toast.success("Transfer Created", "New inter-warehouse stock transfer record created.");
      setShowCreateModal(false);
      setNotes("");
      fetchTransfers(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to create transfer.";
      toast.error("Transfer Error", msg);
    } finally {
      setTransferSaving(false);
    }
  };

  // State Transition Actions (Ship / Receive / Cancel)
  const handleShip = async (transferId: string) => {
    try {
      await apiClient.post(`/inventory/transfers/${transferId}/ship`, null, {
        params: { business_id: user?.business_id || 1 },
      });
      toast.success("Transfer Shipped", "Stock has been deducted and placed in transit.");
      fetchTransfers(true);
    } catch (err) {
      toast.error("Ship Failed", "Unable to mark transfer as shipped.");
    }
  };

  const handleReceive = async (transferId: string) => {
    try {
      await apiClient.post(`/inventory/transfers/${transferId}/receive`, {}, {
        params: { business_id: user?.business_id || 1 },
      });
      toast.success("Transfer Received", "Stock has been received at destination warehouse.");
      fetchTransfers(true);
    } catch (err) {
      toast.error("Receive Failed", "Unable to record transfer receipt.");
    }
  };

  const inTransitCount = transfers.filter((t) => t.status === "in_transit").length;
  const draftCount = transfers.filter((t) => t.status === "draft").length;
  const receivedCount = transfers.filter((t) => t.status === "received").length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Inter-Warehouse Stock Transfers
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Move inventory stock between logistics hubs, verify shipments, and record destination receipts.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Stock Transfer
            </button>
            <button
              onClick={() => fetchTransfers(true)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-xl shadow-xs transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">In Transit</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{inTransitCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Draft Plans</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{draftCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Completed Receipts</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{receivedCount}</p>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Top-rim indeterminate line */}
          <div className="h-1 w-full bg-slate-100 overflow-hidden relative">
            {isFetching && (
              <div className="h-full bg-linear-to-r from-indigo-500 to-amber-500 animate-pulse w-full" />
            )}
          </div>

          {/* Filters & Tabs */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {["all", "draft", "in_transit", "received", "cancelled"].map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
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

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search transfer # or warehouse..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-1.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Table Area */}
          <div className="overflow-x-auto min-h-[250px] relative">
            {initialLoading ? (
              <div className="p-8 text-center text-slate-400">Loading transfers...</div>
            ) : transfers.length === 0 ? (
              <div className="p-12 text-center">
                <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800">No transfer records found</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Create a new stock transfer to rebalance inventory between warehouses.
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
                    <th className="py-3.5 px-4">Transfer Number</th>
                    <th className="py-3.5 px-4">Source Warehouse</th>
                    <th className="py-3.5 px-4">Destination Warehouse</th>
                    <th className="py-3.5 px-4 text-center">Items Count</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4">Created Date</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {transfers.map((tr) => (
                    <tr key={tr.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                        {tr.transfer_number}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                          {tr.source_warehouse_name || "Origin Hub"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                          {tr.destination_warehouse_name || "Target Hub"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-medium text-slate-800">
                        {tr.items_count || 1}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {tr.status === "received" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Received
                          </span>
                        ) : tr.status === "in_transit" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            In Transit
                          </span>
                        ) : tr.status === "cancelled" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                            Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {formatDate(tr.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {tr.status === "draft" && (
                            <button
                              onClick={() => handleShip(tr.id)}
                              className="px-2.5 py-1 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-2xs transition-colors"
                            >
                              Ship
                            </button>
                          )}
                          {tr.status === "in_transit" && (
                            <button
                              onClick={() => handleReceive(tr.id)}
                              className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors"
                            >
                              Receive
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenMushak65(tr)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors"
                            title="Print statutory Mushak 6.5 transfer chalan"
                          >
                            <Printer className="w-3 h-3" />
                            <span>মূসক-৬.৫</span>
                          </button>
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
              Showing <span className="font-semibold text-slate-700">{transfers.length}</span> records
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
                disabled={transfers.length < pageSize || isFetching}
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

      {/* New Stock Transfer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base">New Stock Transfer</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Transfer inventory between warehouses</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Source Warehouse *
                  </label>
                  <select
                    value={sourceWarehouseId}
                    onChange={(e) => setSourceWarehouseId(e.target.value)}
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
                    Destination Warehouse *
                  </label>
                  <select
                    value={destWarehouseId}
                    onChange={(e) => setDestWarehouseId(e.target.value)}
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
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Transfer Purpose / Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Stock replenishment for weekend campaign..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {transferSaving ? "Creating..." : "Create Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mushak 6.5 Statutory Transfer Chalan Modal */}
      <Mushak65Modal
        isOpen={showMushakModal}
        onClose={() => setShowMushakModal(false)}
        data={mushakTransferData}
      />
    </DashboardLayout>
  );
}
