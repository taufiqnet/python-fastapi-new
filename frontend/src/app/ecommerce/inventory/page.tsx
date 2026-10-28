"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import {
  Boxes,
  Search,
  Filter,
  Plus,
  ArrowRightLeft,
  AlertTriangle,
  Warehouse,
  QrCode,
  Printer,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Layers,
  CheckCircle2,
  X,
  Building,
  RefreshCw,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { formatCurrency } from "@/lib/utils";
import { InventoryStockOut, WarehouseOut } from "@/types";
import { InventoryAdjustmentModal } from "@/components/ecommerce/inventory-adjustment-modal";

export default function InventoryStockPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  // Primary Data State
  const [items, setItems] = useState<InventoryStockOut[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOut[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  // In-Place Loading State
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("all");
  const [reorderOnly, setReorderOnly] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Modals & Drawers
  const [adjustmentTarget, setAdjustmentTarget] = useState<InventoryStockOut | null>(null);
  const [barcodeModalItem, setBarcodeModalItem] = useState<InventoryStockOut | null>(null);
  const [showWarehouseModal, setShowWarehouseModal] = useState<boolean>(false);
  const [newWarehouseName, setNewWarehouseName] = useState<string>("");
  const [newWarehouseCode, setNewWarehouseCode] = useState<string>("");
  const [warehouseSaving, setWarehouseSaving] = useState<boolean>(false);

  // Fetch Warehouses
  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await apiClient.get<WarehouseOut[]>("/inventory/warehouses", {
        params: { business_id: user?.business_id || 1 },
      });
      setWarehouses(res.data || []);
    } catch (err) {
      console.error("Failed to load warehouses", err);
    }
  }, [user?.business_id]);

  // Fetch Inventory Stock with in-place transitions
  const fetchInventory = useCallback(
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

        if (selectedWarehouseId !== "all") {
          params.warehouse_id = selectedWarehouseId;
        }

        const res = await apiClient.get<InventoryStockOut[]>("/inventory/items", { params });
        let data = res.data || [];

        // In-memory filter for demo / search parity
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          data = data.filter(
            (item) =>
              item.item_title?.toLowerCase().includes(q) ||
              item.sku?.toLowerCase().includes(q) ||
              item.barcode?.toLowerCase().includes(q)
          );
        }

        if (reorderOnly) {
          data = data.filter((item) => item.quantity_on_hand <= (item.reorder_level || 10));
        }

        setItems(data);
        setTotalCount(data.length);
      } catch (err) {
        console.error("Failed to load inventory", err);
        toast.error("Data Load Error", "Failed to retrieve warehouse inventory items.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [user?.business_id, currentPage, selectedWarehouseId, searchQuery, reorderOnly, toast]
  );

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  useEffect(() => {
    fetchInventory(items.length > 0);
  }, [currentPage, selectedWarehouseId, searchQuery, reorderOnly]);

  // Handle Search Input with startTransition
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    startTransition(() => {
      setSearchQuery(val);
      setCurrentPage(1);
    });
  };

  // Handle Warehouse Select with startTransition
  const handleWarehouseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    startTransition(() => {
      setSelectedWarehouseId(val);
      setCurrentPage(1);
    });
  };

  // Handle Reorder Toggle with startTransition
  const handleReorderToggle = () => {
    startTransition(() => {
      setReorderOnly((prev) => !prev);
      setCurrentPage(1);
    });
  };

  // Create Warehouse Handler
  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWarehouseName.trim() || !newWarehouseCode.trim()) {
      toast.error("Validation Error", "Warehouse name and code are required.");
      return;
    }

    setWarehouseSaving(true);
    try {
      await apiClient.post("/inventory/warehouses", {
        name: newWarehouseName.trim(),
        code: newWarehouseCode.trim().toUpperCase(),
        business_id: user?.business_id || 1,
        is_active: true,
      });

      toast.success("Warehouse Created", `Added ${newWarehouseName} successfully.`);
      setShowWarehouseModal(false);
      setNewWarehouseName("");
      setNewWarehouseCode("");
      fetchWarehouses();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to create warehouse.";
      toast.error("Warehouse Error", msg);
    } finally {
      setWarehouseSaving(false);
    }
  };

  // Aggregated Metrics
  const totalOnHand = items.reduce((acc, curr) => acc + (curr.quantity_on_hand || 0), 0);
  const totalReserved = items.reduce((acc, curr) => acc + (curr.quantity_reserved || 0), 0);
  const totalAvailable = items.reduce((acc, curr) => acc + (curr.quantity_available || 0), 0);
  const lowStockCount = items.filter(
    (item) => item.quantity_on_hand <= (item.reorder_level || 10)
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Inventory & Stock Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Multi-warehouse inventory ledger, real-time allocations, stock adjustments, and barcode generation.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowWarehouseModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Building className="w-4 h-4 text-indigo-600" />
              Manage Warehouses
            </button>
            <button
              onClick={() => fetchInventory(true)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-xl shadow-xs transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total On-Hand
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalOnHand.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Allocated / Reserved
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalReserved.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Available to Sell
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalAvailable.toLocaleString()}</p>
            </div>
          </div>

          <div
            onClick={handleReorderToggle}
            className={`p-5 rounded-2xl border cursor-pointer transition-all shadow-xs flex items-center gap-4 ${
              reorderOnly
                ? "bg-rose-50/70 border-rose-300 ring-2 ring-rose-400/30"
                : "bg-white border-slate-200 hover:border-rose-200"
            }`}
          >
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Low Stock Alerts
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-2xl font-bold text-rose-600">{lowStockCount}</span>
                {reorderOnly && (
                  <span className="text-xs font-semibold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full">
                    Filter Active
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Top-rim indeterminate loading bar */}
          <div className="h-1 w-full bg-slate-100 overflow-hidden relative">
            {isFetching && (
              <div className="h-full bg-linear-to-r from-indigo-500 to-emerald-500 animate-pulse w-full" />
            )}
          </div>

          {/* Filters Toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search items by SKU, name, or barcode..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50 hover:bg-white transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedWarehouseId}
                  onChange={handleWarehouseChange}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-700 font-medium cursor-pointer"
                >
                  <option value="all">All Warehouses</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleReorderToggle}
                className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border transition-colors ${
                  reorderOnly
                    ? "bg-rose-100 border-rose-300 text-rose-800"
                    : "bg-slate-50/50 hover:bg-slate-100 border-slate-200 text-slate-600"
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                Low Stock Only
              </button>
            </div>
          </div>

          {/* Table Container - Never unmounted */}
          <div className="overflow-x-auto min-h-[300px] relative">
            {initialLoading ? (
              <div className="p-8 text-center text-slate-400">Loading inventory items...</div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center">
                <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800">No inventory records found</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchQuery || selectedWarehouseId !== "all" || reorderOnly
                    ? "Try adjusting your filters or search keywords."
                    : "No stock records have been initialized yet."}
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
                    <th className="py-3.5 px-4">Item & SKU</th>
                    <th className="py-3.5 px-4">Warehouse</th>
                    <th className="py-3.5 px-4 text-right">On Hand</th>
                    <th className="py-3.5 px-4 text-right">Allocated</th>
                    <th className="py-3.5 px-4 text-right">Available</th>
                    <th className="py-3.5 px-4 text-right">Unit Cost</th>
                    <th className="py-3.5 px-4 text-right">Total Value</th>
                    <th className="py-3.5 px-4 text-center">Stock Status</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {items.map((item) => {
                    const isLow = item.quantity_on_hand <= (item.reorder_level || 10);
                    const isOut = item.quantity_on_hand <= 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{item.item_title}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                              {item.sku}
                            </span>
                            {item.barcode && <span>• Barcode: {item.barcode}</span>}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                            <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                            {item.warehouse_name || "Primary Hub"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-medium text-slate-900">
                          {item.quantity_on_hand}
                        </td>

                        <td className="py-3.5 px-4 text-right text-slate-500">
                          {item.quantity_reserved || 0}
                        </td>

                        <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">
                          {item.quantity_available}
                        </td>

                        <td className="py-3.5 px-4 text-right text-slate-600">
                          {formatCurrency(item.unit_cost || 0)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-medium text-slate-900">
                          {formatCurrency(item.total_value || (item.quantity_on_hand * (item.unit_cost || 0)))}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Low Stock ({item.quantity_on_hand})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Healthy
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setAdjustmentTarget(item)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Adjust Stock"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setBarcodeModalItem(item)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Print Barcode Tag"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer Pagination */}
          <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{items.length}</span> items
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
                disabled={items.length < pageSize || isFetching}
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

      {/* Stock Adjustment Modal */}
      {adjustmentTarget && (
        <InventoryAdjustmentModal
          isOpen={!!adjustmentTarget}
          onClose={() => setAdjustmentTarget(null)}
          onSuccess={() => {
            fetchInventory(true);
            setAdjustmentTarget(null);
          }}
          inventoryItemId={adjustmentTarget.id}
          sku={adjustmentTarget.sku}
          productTitle={adjustmentTarget.item_title}
          currentStock={adjustmentTarget.quantity_on_hand}
          warehouseName={adjustmentTarget.warehouse_name || "Selected Warehouse"}
        />
      )}

      {/* Barcode Printable Modal */}
      {barcodeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                Barcode Label Preview
              </h3>
              <button
                onClick={() => setBarcodeModalItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Label Frame */}
            <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-3">
              <p className="font-bold text-slate-900 text-sm">{barcodeModalItem.item_title}</p>
              <div className="p-3 bg-white border border-slate-200 rounded-lg inline-block">
                <QrCode className="w-24 h-24 text-slate-800 mx-auto" />
              </div>
              <p className="font-mono text-xs font-semibold text-slate-700 tracking-wider">
                {barcodeModalItem.barcode || barcodeModalItem.sku}
              </p>
              <p className="text-xs text-slate-400">
                Warehouse: {barcodeModalItem.warehouse_name || "General"}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBarcodeModalItem(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.success("Print Dispatched", "Barcode label sent to thermal printer.");
                  setBarcodeModalItem(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs"
              >
                Print Label
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warehouse Management Modal */}
      {showWarehouseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Building className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Warehouse Management</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Configure fulfillment and storage locations</p>
                </div>
              </div>
              <button
                onClick={() => setShowWarehouseModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Warehouse List */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Existing Warehouses ({warehouses.length})
                </p>
                {warehouses.length === 0 ? (
                  <p className="text-xs text-slate-400">No warehouses configured yet.</p>
                ) : (
                  warehouses.map((wh) => (
                    <div
                      key={wh.id}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{wh.name}</p>
                        <p className="text-xs text-slate-500 font-mono">Code: {wh.code}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Add Warehouse Form */}
              <form onSubmit={handleCreateWarehouse} className="space-y-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Add New Warehouse
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Warehouse Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. North Hub"
                      value={newWarehouseName}
                      onChange={(e) => setNewWarehouseName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Warehouse Code *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. WH-NORTH"
                      value={newWarehouseCode}
                      onChange={(e) => setNewWarehouseCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 uppercase"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWarehouseModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50"
                  >
                    Done
                  </button>
                  <button
                    type="submit"
                    disabled={warehouseSaving}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {warehouseSaving ? "Saving..." : "Create Warehouse"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
