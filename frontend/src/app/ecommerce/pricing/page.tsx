"use client";

import React, { useEffect, useState, useMemo, useRef, startTransition } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import {
  CouponOut,
  DiscountRuleOut,
  TaxRuleOut,
  CurrencyRateOut,
} from "@/types";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import {
  Ticket,
  Percent,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Calculator,
  Coins,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { CouponFormModal } from "@/components/ecommerce/pricing/coupon-form-modal";
import { DiscountRuleFormModal } from "@/components/ecommerce/pricing/discount-rule-form-modal";
import { DeletePricingDialog } from "@/components/ecommerce/pricing/delete-pricing-dialog";

export default function PricingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const businessId = user?.business_id || 1;

  // Active Tab: "coupons" | "rules" | "tax"
  const [activeTab, setActiveTab] = useState<"coupons" | "rules" | "tax">("coupons");

  // Data States
  const [coupons, setCoupons] = useState<CouponOut[]>([]);
  const [discountRules, setDiscountRules] = useState<DiscountRuleOut[]>([]);
  const [taxRules, setTaxRules] = useState<TaxRuleOut[]>([]);
  const [currencyRates, setCurrencyRates] = useState<CurrencyRateOut[]>([]);

  // Two-tier loading per ui_in_place_filtering.md
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals state
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponToEdit, setCouponToEdit] = useState<CouponOut | null>(null);

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState<DiscountRuleOut | null>(null);

  const [deleteItem, setDeleteItem] = useState<CouponOut | DiscountRuleOut | null>(null);
  const [deleteType, setDeleteType] = useState<"coupon" | "rule">("coupon");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Live Coupon Validator State
  const [testCode, setTestCode] = useState("");
  const [testAmount, setTestAmount] = useState("100");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
    discountAmount: number;
  } | null>(null);

  const loadData = async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setIsFetching(true);
    }
    setError(null);

    try {
      const [couponsRes, rulesRes, taxRes, curRes] = await Promise.allSettled([
        apiClient.get<CouponOut[]>("/pricing/coupons"),
        apiClient.get<DiscountRuleOut[]>("/pricing/discount-rules"),
        apiClient.get<TaxRuleOut[]>("/pricing/tax-rules"),
        apiClient.get<CurrencyRateOut[]>("/pricing/currency-rates"),
      ]);

      if (couponsRes.status === "fulfilled") setCoupons(couponsRes.value.data || []);
      if (rulesRes.status === "fulfilled") setDiscountRules(rulesRes.value.data || []);
      if (taxRes.status === "fulfilled") setTaxRules(taxRes.value.data || []);
      if (curRes.status === "fulfilled") setCurrencyRates(curRes.value.data || []);
    } catch {
      setError("Failed to fetch promotional pricing and coupon rules.");
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
  const handleTabSwitch = (tab: "coupons" | "rules" | "tax") => {
    startTransition(() => {
      setActiveTab(tab);
      setSearchQuery("");
      setStatusFilter("all");
      setCurrentPage(1);
    });
  };

  const handleSearchChange = (query: string) => {
    startTransition(() => {
      setSearchQuery(query);
      setCurrentPage(1);
    });
  };

  const handleStatusChange = (status: string) => {
    startTransition(() => {
      setStatusFilter(status);
      setCurrentPage(1);
    });
  };

  const clearFilters = () => {
    startTransition(() => {
      setSearchQuery("");
      setStatusFilter("all");
      setCurrentPage(1);
    });
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalCoupons = coupons.length;
    const activeCoupons = coupons.filter((c) => c.is_active).length;
    const totalRedemptions = coupons.reduce((sum, c) => sum + (c.used_count || 0), 0);
    const totalRules = discountRules.length;
    return { totalCoupons, activeCoupons, totalRedemptions, totalRules };
  }, [coupons, discountRules]);

  // Filtered Coupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || c.code.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && c.is_active) ||
        (statusFilter === "inactive" && !c.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [coupons, searchQuery, statusFilter]);

  // Filtered Discount Rules
  const filteredRules = useMemo(() => {
    return discountRules.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.code && r.code.toLowerCase().includes(q));
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && r.is_active) ||
        (statusFilter === "inactive" && !r.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [discountRules, searchQuery, statusFilter]);

  // Pagination for Active Tab
  const currentList = activeTab === "coupons" ? filteredCoupons : filteredRules;
  const totalItems = currentList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedCoupons = useMemo(() => {
    return filteredCoupons.slice(startIndex, endIndex);
  }, [filteredCoupons, startIndex, endIndex]);

  const paginatedRules = useMemo(() => {
    return filteredRules.slice(startIndex, endIndex);
  }, [filteredRules, startIndex, endIndex]);

  // Handle Coupon Validator Test
  const handleValidateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testCode.trim()) return;

    setValidating(true);
    setValidationResult(null);

    try {
      const res = await apiClient.post("/pricing/coupons/validate", {
        business_id: businessId,
        code: testCode.trim().toUpperCase(),
        cart_amount: parseFloat(testAmount) || 0,
      });
      setValidationResult({
        isValid: res.data.is_valid,
        message: res.data.message,
        discountAmount: res.data.discount_amount || 0,
      });
    } catch {
      setValidationResult({
        isValid: false,
        message: "Coupon validation failed or endpoint unreachable.",
        discountAmount: 0,
      });
    } finally {
      setValidating(false);
    }
  };

  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "all";

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">
              <span>Catalog & Store</span>
              <span>•</span>
              <span>Promotions & Calculations</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Ticket className="w-7 h-7 text-amber-600" />
              Pricing & Coupons
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage promotional coupon vouchers, percentage & fixed discount rules, and tax regimes.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => loadData(false)}
              disabled={isFetching}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
              title="Refresh Pricing"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            </button>

            {activeTab === "coupons" ? (
              <button
                type="button"
                onClick={() => {
                  setCouponToEdit(null);
                  setIsCouponModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition shadow-md shadow-amber-600/25 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Issue Coupon
              </button>
            ) : activeTab === "rules" ? (
              <button
                type="button"
                onClick={() => {
                  setRuleToEdit(null);
                  setIsRuleModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-md shadow-indigo-600/25 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Create Discount Rule
              </button>
            ) : null}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 gap-8">
          <button
            type="button"
            onClick={() => handleTabSwitch("coupons")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === "coupons"
                ? "border-amber-600 text-amber-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Ticket className="w-4 h-4" />
            Coupons ({metrics.totalCoupons})
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch("rules")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === "rules"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Percent className="w-4 h-4" />
            Discount Rules ({metrics.totalRules})
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch("tax")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === "tax"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Tax & Currency Rates ({taxRules.length})
          </button>
        </div>

        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Active Coupons</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{metrics.activeCoupons}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Redemptions Count</p>
              <p className="text-xl font-bold text-emerald-700 mt-0.5">{metrics.totalRedemptions}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Discount Rules</p>
              <p className="text-xl font-bold text-indigo-700 mt-0.5">{metrics.totalRules}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Active Currencies</p>
              <p className="text-xl font-bold text-violet-700 mt-0.5">{currencyRates.length || 1}</p>
            </div>
          </div>
        </div>

        {/* Live Coupon Tester Widget */}
        <div className="bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 rounded-2xl border border-amber-200 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-600" />
                Live Coupon Validation Simulator
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify voucher codes against min cart amounts before publishing promotions.
              </p>
            </div>

            <form onSubmit={handleValidateCoupon} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Code (e.g. SAVE20)"
                value={testCode}
                onChange={(e) => setTestCode(e.target.value.toUpperCase())}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-amber-500/20"
              />
              <input
                type="number"
                placeholder="Subtotal ($)"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20"
              />
              <button
                type="submit"
                disabled={validating || !testCode.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {validating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Test Code"}
              </button>
            </form>
          </div>

          {validationResult && (
            <div
              className={`mt-3 p-3 rounded-xl border text-xs flex items-center justify-between animate-in fade-in ${
                validationResult.isValid
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {validationResult.isValid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{validationResult.message}</span>
              </div>
              {validationResult.isValid && (
                <span className="font-bold text-emerald-700">
                  Deduction: -{formatCurrency(validationResult.discountAmount)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Filter & Search Bar (Coupons and Rules Tabs) */}
        {activeTab !== "tax" && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={
                    activeTab === "coupons"
                      ? "Search coupons by promo code..."
                      : "Search discount rules by name or code..."
                  }
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
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
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Status:
                </span>
                {[
                  { id: "all", label: "All Items" },
                  { id: "active", label: "Active" },
                  { id: "inactive", label: "Inactive" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleStatusChange(tab.id)}
                    className={`px-3 py-1 rounded-lg font-medium transition ${
                      statusFilter === tab.id
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  Showing <strong className="text-slate-800">{totalItems}</strong> entries
                  {isFetching && <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />}
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
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Main Data Table Container - Never Unmounts per Invariant */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden relative">
          {/* Top-rim indeterminate line */}
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-100 overflow-hidden z-20">
              <div className="w-full h-full bg-amber-600 origin-left animate-indeterminate" />
            </div>
          )}

          {initialLoading && coupons.length === 0 && discountRules.length === 0 ? (
            <div className="p-16 text-center">
              <div className="flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-600" />
                <p className="text-sm font-semibold text-slate-800">Loading pricing configurations...</p>
                <p className="text-xs text-slate-400">Fetching vouchers and discount rules</p>
              </div>
            </div>
          ) : activeTab === "coupons" ? (
            /* Coupons Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Coupon Code</th>
                    <th className="py-3 px-4">Associated Discount</th>
                    <th className="py-3 px-4">Usage Limit</th>
                    <th className="py-3 px-4">Validity Range</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-slate-100 text-xs ${isFetching ? "opacity-50 transition-opacity" : ""}`}>
                  {paginatedCoupons.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No coupon vouchers match the active filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedCoupons.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/75 transition-colors group">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-900 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200">
                            {c.code}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {c.discount_rule ? (
                            <div>
                              <p className="font-semibold text-slate-900">{c.discount_rule.name}</p>
                              <p className="text-[11px] text-slate-400">
                                {c.discount_rule.discount_type === "percentage"
                                  ? `${c.discount_rule.discount_value}% OFF`
                                  : `$${c.discount_rule.discount_value} OFF`}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400">Standard Discount</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800">{c.used_count || 0}</span>
                          <span className="text-slate-400"> / {c.max_uses ? `${c.max_uses} max` : "∞"}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {c.valid_from ? formatDate(c.valid_from) : "Immediate"} -{" "}
                          {c.valid_to ? formatDate(c.valid_to) : "Ongoing"}
                        </td>
                        <td className="py-3 px-4">
                          {c.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <XCircle className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setCouponToEdit(c);
                                setIsCouponModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="Edit Coupon"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteItem(c);
                                setDeleteType("coupon");
                                setIsDeleteOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Coupon"
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
          ) : activeTab === "rules" ? (
            /* Discount Rules Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Rule Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Value</th>
                    <th className="py-3 px-4">Min Spend</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-slate-100 text-xs ${isFetching ? "opacity-50 transition-opacity" : ""}`}>
                  {paginatedRules.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No discount calculation rules found.
                      </td>
                    </tr>
                  ) : (
                    paginatedRules.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/75 transition-colors group">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                            {r.name}
                          </p>
                          {r.code && (
                            <span className="font-mono text-[10px] text-slate-400">Code: {r.code}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                            {r.discount_type.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-600">
                          {r.discount_type === "percentage"
                            ? `${r.discount_value}%`
                            : r.discount_type === "buy_x_get_y"
                            ? `Buy ${r.buy_x_qty || 1} Get ${r.get_y_qty || 1} Free`
                            : formatCurrency(r.discount_value)}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {r.min_order_amount > 0 ? formatCurrency(r.min_order_amount) : "No minimum"}
                        </td>
                        <td className="py-3 px-4">
                          {r.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <XCircle className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setRuleToEdit(r);
                                setIsRuleModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Edit Rule"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteItem(r);
                                setDeleteType("rule");
                                setIsDeleteOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Rule"
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
          ) : (
            /* Tax & Currencies Table */
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Statutory Tax Regimes
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="py-2.5 px-4">Tax Name</th>
                        <th className="py-2.5 px-4">Rate (%)</th>
                        <th className="py-2.5 px-4">Jurisdiction</th>
                        <th className="py-2.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {taxRules.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-400">
                            No statutory tax rules configured. Standard VAT applied.
                          </td>
                        </tr>
                      ) : (
                        taxRules.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-semibold text-slate-900">{t.name}</td>
                            <td className="py-2.5 px-4 font-bold text-emerald-600">{t.tax_rate}%</td>
                            <td className="py-2.5 px-4 text-slate-500">{t.country_code || "Global"}</td>
                            <td className="py-2.5 px-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                                Active
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-violet-600" /> Exchange Rates
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="py-2.5 px-4">Currency Code</th>
                        <th className="py-2.5 px-4">Exchange Rate</th>
                        <th className="py-2.5 px-4">Base Currency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currencyRates.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-slate-400">
                            USD / Base Currency (Rate: 1.00)
                          </td>
                        </tr>
                      ) : (
                        currencyRates.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-bold font-mono text-slate-900">
                              {c.currency_code}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-slate-700">
                              {c.exchange_rate}
                            </td>
                            <td className="py-2.5 px-4">
                              {c.is_base ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                                  Base
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Pagination Footer */}
          {activeTab !== "tax" && (
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
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => startTransition(() => setCurrentPage((p) => Math.max(1, p - 1)))}
                    disabled={safeCurrentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
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
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => startTransition(() => setCurrentPage(totalPages))}
                    disabled={safeCurrentPage >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        <CouponFormModal
          isOpen={isCouponModalOpen}
          onClose={() => setIsCouponModalOpen(false)}
          onSuccess={() => loadData(false)}
          couponToEdit={couponToEdit}
          discountRules={discountRules}
          businessId={businessId}
        />

        <DiscountRuleFormModal
          isOpen={isRuleModalOpen}
          onClose={() => setIsRuleModalOpen(false)}
          onSuccess={() => loadData(false)}
          ruleToEdit={ruleToEdit}
          businessId={businessId}
        />

        <DeletePricingDialog
          isOpen={isDeleteOpen}
          onClose={() => {
            setIsDeleteOpen(false);
            setDeleteItem(null);
          }}
          onSuccess={() => loadData(false)}
          item={deleteItem}
          type={deleteType}
        />
      </div>
    </DashboardLayout>
  );
}
