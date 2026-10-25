"use client";

import React, { useState, useEffect, useTransition, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShoppingBag,
  Building2,
  Plus,
  Search,
  Filter,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Mail,
  Phone,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  FileCheck,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PurchaseOrderOut, SupplierOut } from "@/types";

function ProcurementContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  // Active Tab: "orders" | "suppliers"
  const [activeTab, setActiveTab] = useState<"orders" | "suppliers">(
    tabParam === "suppliers" ? "suppliers" : "orders"
  );

  useEffect(() => {
    if (tabParam === "suppliers") {
      setActiveTab("suppliers");
    } else if (tabParam === "orders") {
      setActiveTab("orders");
    }
  }, [tabParam]);

  // Purchase Orders State
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderOut[]>([]);
  const [poStatusFilter, setPoStatusFilter] = useState<string>("all");

  // Suppliers State
  const [suppliers, setSuppliers] = useState<SupplierOut[]>([]);

  // In-Place Loading States
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Common Search & Pagination
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // New Supplier Modal State
  const [showSupplierModal, setShowSupplierModal] = useState<boolean>(false);
  const [supplierName, setSupplierName] = useState<string>("");
  const [supplierCode, setSupplierCode] = useState<string>("");
  const [supplierContact, setSupplierContact] = useState<string>("");
  const [supplierEmail, setSupplierEmail] = useState<string>("");
  const [supplierPhone, setSupplierPhone] = useState<string>("");
  const [supplierPaymentTerms, setSupplierPaymentTerms] = useState<string>("Net 30");
  const [supplierSaving, setSupplierSaving] = useState<boolean>(false);

  // New PO Modal State
  const [showPoModal, setShowPoModal] = useState<boolean>(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [poTotalAmount, setPoTotalAmount] = useState<string>("");
  const [poSaving, setPoSaving] = useState<boolean>(false);

  // Fetch Suppliers
  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await apiClient.get<SupplierOut[]>("/procurement/suppliers", {
        params: { business_id: user?.business_id || 1 },
      });
      setSuppliers(res.data || []);
      if (res.data?.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(res.data[0].id);
      }
    } catch (err) {
      console.error("Failed to load suppliers", err);
    }
  }, [user?.business_id, selectedSupplierId]);

  // Fetch Purchase Orders with in-place transition
  const fetchPurchaseOrders = useCallback(
    async (isBackground = false) => {
      if (!isBackground) {
        setInitialLoading(true);
      } else {
        setIsFetching(true);
      }

      try {
        const params: Record<string, unknown> = {
          business_id: user?.business_id || 1,
        };

        if (poStatusFilter !== "all") {
          params.status = poStatusFilter;
        }

        const res = await apiClient.get<PurchaseOrderOut[]>("/procurement/purchase-orders", {
          params,
        });
        let data = res.data || [];

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          data = data.filter(
            (po) =>
              po.po_number?.toLowerCase().includes(q) ||
              po.supplier_name?.toLowerCase().includes(q)
          );
        }

        setPurchaseOrders(data);
      } catch (err) {
        console.error("Failed to load purchase orders", err);
        toast.error("Data Load Error", "Failed to retrieve purchase orders.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [user?.business_id, poStatusFilter, searchQuery, toast]
  );

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    if (activeTab === "orders") {
      fetchPurchaseOrders(purchaseOrders.length > 0);
    } else {
      setInitialLoading(false);
    }
  }, [activeTab, poStatusFilter, searchQuery]);

  // Tab switch with startTransition
  const handleTabSwitch = (tab: "orders" | "suppliers") => {
    startTransition(() => {
      setActiveTab(tab);
      setSearchQuery("");
      setCurrentPage(1);
    });
  };

  // Search input with startTransition
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    startTransition(() => {
      setSearchQuery(val);
      setCurrentPage(1);
    });
  };

  // PO status filter with startTransition
  const handleStatusFilterChange = (status: string) => {
    startTransition(() => {
      setPoStatusFilter(status);
      setCurrentPage(1);
    });
  };

  // Create Supplier Action
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim() || !supplierCode.trim()) {
      toast.error("Validation Error", "Supplier name and code are required.");
      return;
    }

    setSupplierSaving(true);
    try {
      await apiClient.post("/procurement/suppliers", {
        name: supplierName.trim(),
        code: supplierCode.trim().toUpperCase(),
        contact_name: supplierContact.trim() || null,
        email: supplierEmail.trim() || null,
        phone: supplierPhone.trim() || null,
        payment_terms: supplierPaymentTerms,
        business_id: user?.business_id || 1,
        is_active: true,
      });

      toast.success("Supplier Added", `${supplierName} added to vendor directory.`);
      setShowSupplierModal(false);
      setSupplierName("");
      setSupplierCode("");
      setSupplierContact("");
      setSupplierEmail("");
      setSupplierPhone("");
      fetchSuppliers();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to create supplier.";
      toast.error("Supplier Error", msg);
    } finally {
      setSupplierSaving(false);
    }
  };

  // Create PO Action
  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      toast.error("Validation Error", "Please select a supplier.");
      return;
    }

    setPoSaving(true);
    try {
      await apiClient.post("/procurement/purchase-orders", {
        supplier_id: selectedSupplierId,
        items: [],
        total_amount: Number(poTotalAmount) || 0,
        business_id: user?.business_id || 1,
      });

      toast.success("PO Created", "Draft purchase order created successfully.");
      setShowPoModal(false);
      setPoTotalAmount("");
      fetchPurchaseOrders(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to create purchase order.";
      toast.error("PO Error", msg);
    } finally {
      setPoSaving(false);
    }
  };

  // Receive Goods (GRN) Action
  const handleReceiveGoods = async (poId: string) => {
    try {
      await apiClient.post(
        `/procurement/purchase-orders/${poId}/receive`,
        { items: [] },
        { params: { business_id: user?.business_id || 1 } }
      );
      toast.success("GRN Recorded", "Goods receipt note created; inventory received.");
      fetchPurchaseOrders(true);
    } catch (err) {
      toast.error("Receive Error", "Failed to receive goods against this PO.");
    }
  };

  // Filtered suppliers
  const filteredSuppliers = suppliers.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  });

  const totalPoSpend = purchaseOrders.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
  const openPoCount = purchaseOrders.filter((p) => p.status === "draft" || p.status === "submitted").length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Procurement & Purchase Orders
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage vendor directory, purchase orders (PO), supply chain replenishments, and GRN receipts.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {activeTab === "orders" ? (
              <button
                onClick={() => setShowPoModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Purchase Order
              </button>
            ) : (
              <button
                onClick={() => setShowSupplierModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Supplier
              </button>
            )}
            <button
              onClick={() => (activeTab === "orders" ? fetchPurchaseOrders(true) : fetchSuppliers())}
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-xl shadow-xs transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Suppliers</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{suppliers.length}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Open PO Orders</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{openPoCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total PO Volume</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{formatCurrency(totalPoSpend)}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-6">
          <button
            onClick={() => handleTabSwitch("orders")}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              activeTab === "orders"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Purchase Orders ({purchaseOrders.length})
          </button>
          <button
            onClick={() => handleTabSwitch("suppliers")}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              activeTab === "suppliers"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Suppliers & Vendors ({suppliers.length})
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Top-rim indeterminate line */}
          <div className="h-1 w-full bg-slate-100 overflow-hidden relative">
            {isFetching && (
              <div className="h-full bg-linear-to-r from-indigo-500 to-amber-500 animate-pulse w-full" />
            )}
          </div>

          {/* Filters Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            {activeTab === "orders" ? (
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                {["all", "draft", "submitted", "partially_received", "received", "cancelled"].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusFilterChange(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all shrink-0 ${
                      poStatusFilter === st
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100/70 text-slate-600 hover:bg-slate-200/70"
                    }`}
                  >
                    {st.replace("_", " ")}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-xs font-medium text-slate-500">
                Registered vendors and supply contacts
              </span>
            )}

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === "orders" ? "Search PO # or vendor..." : "Search suppliers..."}
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-1.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Table Container - Never unmounted */}
          <div className="overflow-x-auto min-h-[250px] relative">
            {activeTab === "orders" ? (
              initialLoading ? (
                <div className="p-8 text-center text-slate-400">Loading purchase orders...</div>
              ) : purchaseOrders.length === 0 ? (
                <div className="p-12 text-center">
                  <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-800">No purchase orders found</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                    Create purchase orders to replenish warehouse inventory from suppliers.
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
                      <th className="py-3.5 px-4">PO Number</th>
                      <th className="py-3.5 px-4">Supplier</th>
                      <th className="py-3.5 px-4 text-right">Total Amount</th>
                      <th className="py-3.5 px-4 text-center">Order Status</th>
                      <th className="py-3.5 px-4">Order Date</th>
                      <th className="py-3.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {purchaseOrders.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                          {po.po_number}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {po.supplier_name || "Primary Supplier"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                          {formatCurrency(po.total_amount)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {po.status === "received" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Received
                            </span>
                          ) : po.status === "partially_received" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Partial
                            </span>
                          ) : po.status === "submitted" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              Submitted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                              Draft
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-xs">
                          {formatDate(po.order_date)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {po.status !== "received" && po.status !== "cancelled" && (
                            <button
                              onClick={() => handleReceiveGoods(po.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              Receive GRN
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Supplier Name</th>
                    <th className="py-3.5 px-4">Code</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Email & Phone</th>
                    <th className="py-3.5 px-4">Payment Terms</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredSuppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{s.name}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{s.code}</td>
                      <td className="py-3.5 px-4 text-slate-700">{s.contact_name || "—"}</td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs space-y-0.5">
                        {s.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {s.email}
                          </div>
                        )}
                        {s.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {s.phone}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">
                        {s.payment_terms || "Net 30"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Create Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base">New Supplier / Vendor</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Add an approved procurement vendor</p>
                </div>
              </div>
              <button
                onClick={() => setShowSupplierModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Industrial Supplies"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Vendor Code *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. APEX-01"
                    value={supplierCode}
                    onChange={(e) => setSupplierCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={supplierPaymentTerms}
                    onChange={(e) => setSupplierPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Cash on Delivery">Cash on Delivery</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  placeholder="e.g. Robert Vance"
                  value={supplierContact}
                  onChange={(e) => setSupplierContact(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="sales@apex.com"
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+1 (555) 0192"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={supplierSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {supplierSaving ? "Saving..." : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {showPoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <ShoppingBag className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Create Purchase Order</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Issue order to an authorized supplier</p>
                </div>
              </div>
              <button
                onClick={() => setShowPoModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Supplier *
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Estimated Total Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={poTotalAmount}
                  onChange={(e) => setPoTotalAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPoModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={poSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {poSaving ? "Creating..." : "Create PO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function ProcurementPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-xs text-slate-500 font-medium animate-pulse">
              Loading Procurement...
            </div>
          </div>
        </DashboardLayout>
      }
    >
      <ProcurementContent />
    </Suspense>
  );
}
