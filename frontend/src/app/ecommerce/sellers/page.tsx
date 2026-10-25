"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import {
  Store,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mail,
  Percent,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  UserCheck,
  ShieldAlert,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { formatDate } from "@/lib/utils";
import { SellerOut } from "@/types";

export default function SellersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  // Primary Data State
  const [sellers, setSellers] = useState<SellerOut[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Onboard Seller Modal
  const [showOnboardModal, setShowOnboardModal] = useState<boolean>(false);
  const [storeName, setStoreName] = useState<string>("");
  const [ownerName, setOwnerName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [commissionType, setCommissionType] = useState<"percentage" | "flat">("percentage");
  const [commissionRate, setCommissionRate] = useState<string>("10");
  const [isOnboarding, setIsOnboarding] = useState<boolean>(false);

  // Fetch Sellers with in-place transition
  const fetchSellers = useCallback(
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

        if (statusFilter !== "all") {
          params.status = statusFilter;
        }

        const res = await apiClient.get<SellerOut[]>("/sellers", { params });
        let data = res.data || [];

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          data = data.filter(
            (s) =>
              s.store_name?.toLowerCase().includes(q) ||
              s.owner_name?.toLowerCase().includes(q) ||
              s.email?.toLowerCase().includes(q)
          );
        }

        setSellers(data);
      } catch (err) {
        console.error("Failed to load sellers", err);
        toast.error("Data Load Error", "Failed to retrieve multi-vendor seller directory.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [user?.business_id, statusFilter, searchQuery, toast]
  );

  useEffect(() => {
    fetchSellers(sellers.length > 0);
  }, [statusFilter, searchQuery]);

  // Handle Search Input with startTransition
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    startTransition(() => {
      setSearchQuery(val);
      setCurrentPage(1);
    });
  };

  // Status Change Action (Approve / Suspend)
  const handleUpdateStatus = async (sellerId: string, status: "active" | "suspended") => {
    try {
      await apiClient.put(
        `/sellers/${sellerId}/status`,
        { status },
        { params: { business_id: user?.business_id || 1 } }
      );
      toast.success(
        "Seller Status Updated",
        `Merchant store set to ${status === "active" ? "Active" : "Suspended"}.`
      );
      fetchSellers(true);
    } catch (err) {
      toast.error("Status Update Failed", "Unable to update vendor status.");
    }
  };

  // Onboard Seller Submit
  const handleOnboardSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !ownerName.trim() || !email.trim()) {
      toast.error("Validation Error", "Please provide required vendor information.");
      return;
    }

    setIsOnboarding(true);
    try {
      await apiClient.post(
        "/sellers",
        {
          store_name: storeName.trim(),
          owner_name: ownerName.trim(),
          email: email.trim(),
          commission_type: commissionType,
          commission_rate: Number(commissionRate) || 10,
          business_id: user?.business_id || 1,
        },
        { params: { business_id: user?.business_id || 1 } }
      );

      toast.success("Seller Onboarded", `${storeName} successfully registered to marketplace.`);
      setShowOnboardModal(false);
      setStoreName("");
      setOwnerName("");
      setEmail("");
      fetchSellers(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to onboard seller.";
      toast.error("Onboarding Error", msg);
    } finally {
      setIsOnboarding(false);
    }
  };

  const activeCount = sellers.filter((s) => s.status === "active").length;
  const pendingCount = sellers.filter((s) => s.status === "pending_approval").length;
  const suspendedCount = sellers.filter((s) => s.status === "suspended").length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Multi-Vendor Marketplace Sellers
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Onboard independent sellers, configure payout commissions, and monitor store compliance.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowOnboardModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Onboard Seller
            </button>
            <button
              onClick={() => fetchSellers(true)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-xl shadow-xs transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Merchants</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{activeCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Awaiting Approval</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{pendingCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Suspended Stores</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{suspendedCount}</p>
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
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {["all", "active", "pending_approval", "suspended"].map((st) => (
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

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search store name, owner, email..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-1.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Table Container - Never unmounted */}
          <div className="overflow-x-auto min-h-[250px] relative">
            {initialLoading ? (
              <div className="p-8 text-center text-slate-400">Loading sellers...</div>
            ) : sellers.length === 0 ? (
              <div className="p-12 text-center">
                <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800">No sellers registered</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Click 'Onboard Seller' to authorize your first marketplace vendor.
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
                    <th className="py-3.5 px-4">Store Name</th>
                    <th className="py-3.5 px-4">Owner Name</th>
                    <th className="py-3.5 px-4">Contact Email</th>
                    <th className="py-3.5 px-4 text-center">Commission</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4">Registered Date</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {sellers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                        <Store className="w-4 h-4 text-indigo-600" />
                        {s.store_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-medium">{s.owner_name}</td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {s.email}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-800 text-xs">
                        {s.commission_rate}
                        {s.commission_type === "percentage" ? "%" : "$"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {s.status === "active" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : s.status === "suspended" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">{formatDate(s.created_at)}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {s.status !== "active" && (
                            <button
                              onClick={() => handleUpdateStatus(s.id, "active")}
                              className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          {s.status === "active" && (
                            <button
                              onClick={() => handleUpdateStatus(s.id, "suspended")}
                              className="px-2.5 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition-colors"
                            >
                              Suspend
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
              Showing <span className="font-semibold text-slate-700">{sellers.length}</span> merchants
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
                disabled={sellers.length < pageSize || isFetching}
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

      {/* Onboard Modal */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Store className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Onboard Vendor Store</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Register an independent merchant</p>
                </div>
              </div>
              <button
                onClick={() => setShowOnboardModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardSeller} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Store Front Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Hardware Store"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Proprietor / Owner Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Johnathan Vance"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Contact Email *
                </label>
                <input
                  type="email"
                  placeholder="vendor@apex.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Commission Model
                  </label>
                  <select
                    value={commissionType}
                    onChange={(e) => setCommissionType(e.target.value as "percentage" | "flat")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Fee ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Commission Rate *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isOnboarding}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {isOnboarding ? "Registering..." : "Register Merchant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
