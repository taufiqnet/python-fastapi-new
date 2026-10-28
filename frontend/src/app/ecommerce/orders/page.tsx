"use client";

import React, { useEffect, useState, useMemo, useRef, startTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import {
  OrderSummary,
  OrderDetail,
  OrderPaymentStatus,
  OrderFulfillmentStatus,
} from "@/types";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import {
  ShoppingBag,
  Search,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  RotateCcw,
  Truck,
  Eye,
  Edit,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  DollarSign,
  Printer,
  Plus,
  Trash2,
  MessageCircle,
  Globe,
  Phone,
  Store,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { OrderDetailDrawer } from "@/components/ecommerce/orders/order-detail-drawer";
import { OrderStatusModal } from "@/components/ecommerce/orders/order-status-modal";
import { OrderInvoiceModal } from "@/components/ecommerce/orders/order-invoice-modal";

export default function OrdersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const businessId = user?.business_id || 1;

  // Data State
  const [orders, setOrders] = useState<OrderSummary[]>([]);

  // Two-tier Loading per ui_in_place_filtering.md
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");

  // Deletion State
  const [orderToDelete, setOrderToDelete] = useState<OrderSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals & Drawer State
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [orderForModal, setOrderForModal] = useState<OrderDetail | null>(null);

  const loadData = async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setIsFetching(true);
    }
    setError(null);

    try {
      const res = await apiClient.get<OrderSummary[]>(
        `/orders?business_id=${businessId}&limit=200`
      );
      setOrders(res.data || []);
    } catch {
      setError("Failed to fetch customer orders from backend.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadData(true);
    }
  }, []);

  // Filter Handlers with React startTransition
  const handleSearchChange = (query: string) => {
    startTransition(() => {
      setSearchQuery(query);
      setCurrentPage(1);
    });
  };

  const handlePaymentFilterChange = (status: string) => {
    startTransition(() => {
      setPaymentFilter(status);
      setCurrentPage(1);
    });
  };

  const handleFulfillmentFilterChange = (status: string) => {
    startTransition(() => {
      setFulfillmentFilter(status);
      setCurrentPage(1);
    });
  };

  const handleChannelFilterChange = (channel: string) => {
    startTransition(() => {
      setChannelFilter(channel);
      setCurrentPage(1);
    });
  };

  const clearFilters = () => {
    startTransition(() => {
      setSearchQuery("");
      setPaymentFilter("all");
      setFulfillmentFilter("all");
      setChannelFilter("all");
      setCurrentPage(1);
    });
  };

  // Order Deletion Handler
  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/orders/${orderToDelete.id}?business_id=${businessId}`);
      toast.success(
        "Order Deleted",
        `Order ${orderToDelete.order_number} has been deleted successfully.`
      );
      setOrderToDelete(null);
      loadData(false);
    } catch (err: any) {
      toast.error(
        "Delete Failed",
        err.response?.data?.detail || "Could not delete order record."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const paidRevenue = orders
      .filter((o) => o.payment_status === "paid")
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const pendingFulfillment = orders.filter(
      (o) => o.fulfillment_status === "unfulfilled" || o.fulfillment_status === "processing"
    ).length;
    const shippedOrders = orders.filter(
      (o) => o.fulfillment_status === "shipped" || o.fulfillment_status === "delivered"
    ).length;
    return { totalOrders, paidRevenue, pendingFulfillment, shippedOrders };
  }, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
        (o.tracking_id && o.tracking_id.toLowerCase().includes(q));

      const matchesPayment =
        paymentFilter === "all" || o.payment_status === paymentFilter;

      const matchesFulfillment =
        fulfillmentFilter === "all" || o.fulfillment_status === fulfillmentFilter;

      const matchesChannel =
        channelFilter === "all" ||
        (channelFilter === "online_store"
          ? !o.payment_channel || o.payment_channel === "online_store"
          : o.payment_channel === channelFilter);

      return matchesSearch && matchesPayment && matchesFulfillment && matchesChannel;
    });
  }, [orders, searchQuery, paymentFilter, fulfillmentFilter, channelFilter]);

  // Pagination Calculations
  const totalFiltered = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFiltered);

  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, startIndex, endIndex]);

  // Fetch Full Order Details for Drawer / Modal
  const fetchOrderDetail = async (orderId: string): Promise<OrderDetail | null> => {
    try {
      const res = await apiClient.get<OrderDetail>(`/orders/${orderId}?business_id=${businessId}`);
      return res.data;
    } catch {
      toast.error("Failed to fetch full order details.");
      return null;
    }
  };

  const handleOpenDrawer = async (orderSummary: OrderSummary) => {
    const detail = await fetchOrderDetail(orderSummary.id);
    if (detail) {
      setSelectedOrder(detail);
      setIsDrawerOpen(true);
    }
  };

  const handleOpenStatusModal = async (orderSummary: OrderSummary | OrderDetail) => {
    let detail = orderSummary as OrderDetail;
    if (!detail.items) {
      const fetched = await fetchOrderDetail(orderSummary.id);
      if (!fetched) return;
      detail = fetched;
    }
    setOrderForModal(detail);
    setIsStatusModalOpen(true);
  };

  const handleOpenInvoiceModal = async (orderSummary: OrderSummary | OrderDetail) => {
    let detail = orderSummary as OrderDetail;
    if (!detail.items) {
      const fetched = await fetchOrderDetail(orderSummary.id);
      if (!fetched) return;
      detail = fetched;
    }
    setOrderForModal(detail);
    setIsInvoiceModalOpen(true);
  };

  const getPaymentStatusBadge = (status: OrderPaymentStatus) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        );
      case "pending":
      case "authorized":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> {status}
          </span>
        );
      case "refunded":
      case "partially_refunded":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <RotateCcw className="w-3 h-3" /> {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const getFulfillmentStatusBadge = (status: OrderFulfillmentStatus) => {
    switch (status) {
      case "delivered":
      case "fulfilled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> {status}
          </span>
        );
      case "shipped":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Truck className="w-3 h-3" /> Shipped
          </span>
        );
      case "unfulfilled":
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const getChannelBadge = (channel?: string | null) => {
    switch (channel) {
      case "facebook":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Globe className="w-2.5 h-2.5" /> Facebook
          </span>
        );
      case "whatsapp":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <MessageCircle className="w-2.5 h-2.5" /> WhatsApp
          </span>
        );
      case "phone":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Phone className="w-2.5 h-2.5" /> Phone
          </span>
        );
      case "walk_in":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Store className="w-2.5 h-2.5" /> Walk-in
          </span>
        );
      case "online_store":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            Online Store
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
            Online
          </span>
        );
    }
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    paymentFilter !== "all" ||
    fulfillmentFilter !== "all" ||
    channelFilter !== "all";

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
              <span>Sales & POS</span>
              <span>•</span>
              <span>Customer Order Records</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <ShoppingBag className="w-7 h-7 text-indigo-600" />
              Order Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Track customer purchases, payment settlements, fulfillment workflows, and tax invoices.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => loadData(false)}
              disabled={isFetching}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
              title="Refresh Orders"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            </button>

            <a
              href={`/api/v1/orders/template-excel?business_id=${businessId}`}
              download
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Excel Export
            </a>

            <Link
              href="/ecommerce/orders/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Order
            </Link>
          </div>
        </div>

        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Orders</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{metrics.totalOrders}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Settled Revenue</p>
              <p className="text-xl font-bold text-emerald-700 mt-0.5">
                {formatCurrency(metrics.paidRevenue)}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Pending Fulfillment</p>
              <p className="text-xl font-bold text-amber-700 mt-0.5">{metrics.pendingFulfillment}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Shipped / Delivered</p>
              <p className="text-xl font-bold text-blue-700 mt-0.5">{metrics.shippedOrders}</p>
            </div>
          </div>
        </div>

        {/* Filter & Search Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by order # (e.g. ORD-1001), customer, or tracking number..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2">
              <select
                value={channelFilter}
                onChange={(e) => handleChannelFilterChange(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Channels</option>
                <option value="facebook">Facebook</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="phone">Phone</option>
                <option value="walk_in">Walk-in</option>
                <option value="online_store">Online Store</option>
              </select>

              <select
                value={paymentFilter}
                onChange={(e) => handlePaymentFilterChange(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded</option>
                <option value="failed">Failed</option>
              </select>

              <select
                value={fulfillmentFilter}
                onChange={(e) => handleFulfillmentFilterChange(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Fulfillments</option>
                <option value="unfulfilled">Unfulfilled</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Quick Counter Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              Showing <strong className="text-slate-800">{filteredOrders.length}</strong> of{" "}
              {orders.length} orders
              {isFetching && <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />}
            </span>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-rose-600 hover:underline font-medium"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Orders Table Container - Never Unmounts per Invariant */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden relative">
          {/* Top-rim Indeterminate Progress Bar during background fetching */}
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden z-20">
              <div className="w-full h-full bg-indigo-600 origin-left animate-indeterminate" />
            </div>
          )}

          {initialLoading && orders.length === 0 ? (
            <div className="p-16 text-center">
              <div className="flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm font-semibold text-slate-800">Loading order records...</p>
                <p className="text-xs text-slate-400">Connecting to sales database</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Order Number</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Fulfillment</th>
                    <th className="py-3 px-4">Carrier / Tracking</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-slate-100 text-xs ${isFetching ? "opacity-50 transition-opacity" : ""}`}>
                  {paginatedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No orders found matching the active filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/75 transition-colors group">
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <button
                              type="button"
                              onClick={() => handleOpenDrawer(o)}
                              className="font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition"
                            >
                              {o.order_number}
                            </button>
                            {getChannelBadge(o.payment_channel)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {formatDate(o.created_at)}
                        </td>
                        <td className="py-3 px-4">{getPaymentStatusBadge(o.payment_status)}</td>
                        <td className="py-3 px-4">
                          {getFulfillmentStatusBadge(o.fulfillment_status)}
                        </td>
                        <td className="py-3 px-4 text-[11px]">
                          {o.courier_company ? (
                            <div>
                              <p className="font-semibold text-slate-800">{o.courier_company}</p>
                              {o.tracking_id && (
                                <p className="font-mono text-slate-400">#{o.tracking_id}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                          {formatCurrency(o.total_amount)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenDrawer(o)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="View Full Order Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(o)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="Update Status"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenInvoiceModal(o)}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                              title="Print Commercial Invoice"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrderToDelete(o)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Order Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/50">
            <div className="flex items-center gap-2 text-slate-500">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newSize = Number(e.target.value);
                  startTransition(() => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  });
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>per page</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">
                Page <strong className="text-slate-800">{safeCurrentPage}</strong> of{" "}
                <strong className="text-slate-800">{totalPages}</strong>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => startTransition(() => setCurrentPage(1))}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => startTransition(() => setCurrentPage((p) => Math.max(1, p - 1)))}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    startTransition(() => setCurrentPage((p) => Math.min(totalPages, p + 1)))
                  }
                  disabled={safeCurrentPage >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => startTransition(() => setCurrentPage(totalPages))}
                  disabled={safeCurrentPage >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modals & Slide-Over Drawers */}
        <OrderDetailDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          onOpenStatusModal={(ord) => handleOpenStatusModal(ord)}
          onOpenInvoiceModal={(ord) => handleOpenInvoiceModal(ord)}
        />

        <OrderStatusModal
          isOpen={isStatusModalOpen}
          onClose={() => {
            setIsStatusModalOpen(false);
            setOrderForModal(null);
          }}
          onSuccess={() => loadData(false)}
          order={orderForModal}
          businessId={businessId}
        />

        <OrderInvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setOrderForModal(null);
          }}
          order={orderForModal}
        />

        {/* Delete Confirmation Modal */}
        {orderToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Delete Order Record</h3>
                  <p className="text-xs text-slate-500">
                    Are you sure you want to permanently delete order{" "}
                    <strong className="text-slate-800">{orderToDelete.order_number}</strong>?
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                This action cannot be undone. All associated line items, status logs, and address records will be permanently removed.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteOrder}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-xs"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" /> Confirm Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
