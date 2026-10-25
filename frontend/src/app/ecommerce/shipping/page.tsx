"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import {
  Truck,
  Package,
  Search,
  Filter,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Edit2,
  X,
  Calculator,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShipmentOut } from "@/types";

export default function ShippingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  // Primary Data State
  const [shipments, setShipments] = useState<ShipmentOut[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Tracking Update Modal
  const [selectedShipment, setSelectedShipment] = useState<ShipmentOut | null>(null);
  const [modalCarrier, setModalCarrier] = useState<string>("");
  const [modalTrackingNum, setModalTrackingNum] = useState<string>("");
  const [modalStatus, setModalStatus] = useState<string>("in_transit");
  const [isUpdatingTracking, setIsUpdatingTracking] = useState<boolean>(false);

  // Fetch Shipments with in-place transition
  const fetchShipments = useCallback(
    async (isBackground = false) => {
      if (!isBackground) {
        setInitialLoading(true);
      } else {
        setIsFetching(true);
      }

      try {
        const res = await apiClient.get<ShipmentOut[]>("/shipping/shipments", {
          params: { business_id: user?.business_id || 1 },
        });
        let data = res.data || [];

        if (statusFilter !== "all") {
          data = data.filter((s) => s.shipping_status === statusFilter);
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          data = data.filter(
            (s) =>
              s.tracking_number?.toLowerCase().includes(q) ||
              s.order_number?.toLowerCase().includes(q) ||
              s.carrier_name?.toLowerCase().includes(q)
          );
        }

        setShipments(data);
      } catch (err) {
        console.error("Failed to load shipments", err);
        toast.error("Data Load Error", "Failed to retrieve shipments and delivery logs.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [user?.business_id, statusFilter, searchQuery, toast]
  );

  useEffect(() => {
    fetchShipments(shipments.length > 0);
  }, [statusFilter, searchQuery]);

  // Handle Search Input with startTransition
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    startTransition(() => {
      setSearchQuery(val);
      setCurrentPage(1);
    });
  };

  // Handle Status Filter with startTransition
  const handleStatusFilter = (st: string) => {
    startTransition(() => {
      setStatusFilter(st);
      setCurrentPage(1);
    });
  };

  // Open Update Modal
  const openTrackingModal = (s: ShipmentOut) => {
    setSelectedShipment(s);
    setModalCarrier(s.carrier_name || "FedEx");
    setModalTrackingNum(s.tracking_number || "");
    setModalStatus(s.shipping_status || "in_transit");
  };

  // Submit Tracking Update
  const handleUpdateTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;

    setIsUpdatingTracking(true);
    try {
      await apiClient.put(
        `/shipping/shipments/${selectedShipment.id}/tracking`,
        {
          carrier: modalCarrier,
          tracking_number: modalTrackingNum,
          status: modalStatus,
        },
        { params: { business_id: user?.business_id || 1 } }
      );

      toast.success("Tracking Updated", `Shipment ${modalTrackingNum} marked as ${modalStatus}.`);
      setSelectedShipment(null);
      fetchShipments(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to update tracking details.";
      toast.error("Update Error", msg);
    } finally {
      setIsUpdatingTracking(false);
    }
  };

  // Metrics
  const totalShipments = shipments.length;
  const inTransitCount = shipments.filter(
    (s) => s.shipping_status === "in_transit" || s.shipping_status === "dispatched"
  ).length;
  const deliveredCount = shipments.filter((s) => s.shipping_status === "delivered").length;
  const pendingCount = shipments.filter((s) => s.shipping_status === "pending").length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Shipping & Fulfillment Logistics
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Consignment dispatch, carrier tracking, rate tables, and delivery verification.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchShipments(true)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-xl shadow-xs transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Consignments</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalShipments}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active In-Transit</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{inTransitCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Delivered</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{deliveredCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Dispatch</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{pendingCount}</p>
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

          {/* Filters Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {["all", "pending", "dispatched", "in_transit", "delivered", "failed"].map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusFilter(st)}
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
                placeholder="Search tracking #, order #, carrier..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-1.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Table Container - Never unmounted */}
          <div className="overflow-x-auto min-h-[250px] relative">
            {initialLoading ? (
              <div className="p-8 text-center text-slate-400">Loading shipments...</div>
            ) : shipments.length === 0 ? (
              <div className="p-12 text-center">
                <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800">No shipments found</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Consignments dispatched from orders will appear in this tracking ledger.
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
                    <th className="py-3.5 px-4">Tracking Number</th>
                    <th className="py-3.5 px-4">Order Number</th>
                    <th className="py-3.5 px-4">Carrier</th>
                    <th className="py-3.5 px-4 text-right">Shipping Cost</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4">Estimated Delivery</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {shipments.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                        {s.tracking_number}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">{s.order_number}</td>
                      <td className="py-3.5 px-4 text-slate-800 font-medium">{s.carrier_name}</td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-900">
                        {formatCurrency(s.shipping_cost || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {s.shipping_status === "delivered" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Delivered
                          </span>
                        ) : s.shipping_status === "in_transit" || s.shipping_status === "dispatched" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            {s.shipping_status.replace("_", " ")}
                          </span>
                        ) : s.shipping_status === "failed" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {s.estimated_delivery ? formatDate(s.estimated_delivery) : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => openTrackingModal(s)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Update Tracking Status"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
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
              Showing <span className="font-semibold text-slate-700">{shipments.length}</span> consignments
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
                disabled={shipments.length < pageSize || isFetching}
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

      {/* Tracking Update Modal */}
      {selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Truck className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Update Tracking</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Order: {selectedShipment.order_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedShipment(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTracking} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Carrier Name *
                </label>
                <input
                  type="text"
                  value={modalCarrier}
                  onChange={(e) => setModalCarrier(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Tracking Number *
                </label>
                <input
                  type="text"
                  value={modalTrackingNum}
                  onChange={(e) => setModalTrackingNum(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Fulfillment Status *
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="pending">Pending</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed / Returned</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedShipment(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingTracking}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {isUpdatingTracking ? "Saving..." : "Update Consignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
