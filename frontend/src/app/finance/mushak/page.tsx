"use client";

import React, { useEffect, useState, useMemo, useRef, startTransition } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import {
  FileText,
  Search,
  RefreshCw,
  Printer,
  Download,
  AlertCircle,
  Eye,
  CheckCircle2,
  Clock,
  Building2,
  DollarSign,
  Receipt,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Mushak63Modal } from "@/components/finance/mushak-6-3-modal";

interface MushakChallanSummary {
  id: string;
  mushak_number: string;
  serial_number: number;
  fiscal_year: string;
  bin: string;
  issued_at: string;
}

interface SalesInvoiceItem {
  id: string;
  business_id: number;
  invoice_number: string;
  issue_date: string;
  customer_id?: string | null;
  buyer_name: string;
  buyer_bin?: string | null;
  buyer_address?: string | null;
  total_subtotal: number | string;
  total_sd: number | string;
  total_vat: number | string;
  total_payable: number | string;
  status: string;
  created_at: string;
  mushak_challan?: MushakChallanSummary | null;
}

export default function MushakRegistryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const businessId = user?.business_id || 1;

  // Data State
  const [invoices, setInvoices] = useState<SalesInvoiceItem[]>([]);

  // Two-Tier Loading per ui_in_place_filtering.md
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [mushakFilter, setMushakFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const loadData = async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setIsFetching(true);
    }
    setError(null);

    try {
      const res = await apiClient.get<SalesInvoiceItem[]>(
        `/finance/invoices?business_id=${businessId}&limit=200`
      );
      setInvoices(res.data || []);
    } catch {
      setError("Failed to fetch Sales Invoices & Mushak registry from backend.");
      toast?.("Failed to fetch invoices", "error");
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

  const handleStatusFilterChange = (status: string) => {
    startTransition(() => {
      setStatusFilter(status);
      setCurrentPage(1);
    });
  };

  const handleMushakFilterChange = (mStatus: string) => {
    startTransition(() => {
      setMushakFilter(mStatus);
      setCurrentPage(1);
    });
  };

  const handleResetFilters = () => {
    startTransition(() => {
      setSearchQuery("");
      setStatusFilter("all");
      setMushakFilter("all");
      setDateFilter("all");
      setCurrentPage(1);
    });
  };

  // Filter Computation
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesInv = inv.invoice_number.toLowerCase().includes(q);
        const matchesBuyer = inv.buyer_name?.toLowerCase().includes(q);
        const matchesBin = inv.buyer_bin?.toLowerCase().includes(q);
        const matchesMushak = inv.mushak_challan?.mushak_number.toLowerCase().includes(q);
        if (!matchesInv && !matchesBuyer && !matchesBin && !matchesMushak) {
          return false;
        }
      }

      // Invoice Status Filter
      if (statusFilter !== "all" && inv.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Mushak Status Filter
      if (mushakFilter === "issued" && !inv.mushak_challan) {
        return false;
      }
      if (mushakFilter === "pending" && inv.mushak_challan) {
        return false;
      }

      return true;
    });
  }, [invoices, searchQuery, statusFilter, mushakFilter]);

  // Pagination Computation
  const totalPages = Math.ceil(filteredInvoices.length / pageSize) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalSales = 0;
    let totalVat = 0;
    let totalSd = 0;
    let mushakIssuedCount = 0;

    invoices.forEach((inv) => {
      totalSales += parseFloat(String(inv.total_subtotal || 0));
      totalVat += parseFloat(String(inv.total_vat || 0));
      totalSd += parseFloat(String(inv.total_sd || 0));
      if (inv.mushak_challan) mushakIssuedCount++;
    });

    return { totalSales, totalVat, totalSd, mushakIssuedCount, totalInvoices: invoices.length };
  }, [invoices]);

  const formatCurrency = (val: number | string) => {
    const num = parseFloat(String(val || 0));
    return `BDT ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleOpenMushakModal = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setIsModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                NBR Statutory VAT Compliance
              </span>
              <span className="text-xs font-medium text-slate-500">VAT Act 2012 / Rule 40</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1 flex items-center gap-2.5">
              <Receipt className="w-6 h-6 text-indigo-600" />
              কর চালানপত্র (মূসক-৬.৩) ও ভ্যাট ব্যবস্থাপনা
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Statutory Tax Invoices (Mushak 6.3), Supplementary Duty (SD), and Value Added Tax (VAT) Registry
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => loadData(false)}
              disabled={isFetching}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition shadow-xs disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
              <span>Sync Invoices</span>
            </button>
          </div>
        </div>

        {/* Aggregate Statutory Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span>মোট করযোগ্য বিক্রয় (Base Sales)</span>
              <DollarSign className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono">
              {formatCurrency(metrics.totalSales)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Across {metrics.totalInvoices} sales invoices</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span>আদায়কৃত মূসক (Output VAT 15%)</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-emerald-700 font-mono">
              {formatCurrency(metrics.totalVat)}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">Govt Treasury Output VAT</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span>সম্পূরক শুল্ক (Supplementary Duty)</span>
              <Building2 className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-amber-700 font-mono">
              {formatCurrency(metrics.totalSd)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">SD applicable commodities</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span>ইস্যুকৃত মূসক-৬.৩ চালান (Issued)</span>
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl font-bold text-indigo-900 font-mono">
              {metrics.mushakIssuedCount}{" "}
              <span className="text-xs font-normal text-slate-500">/ {metrics.totalInvoices}</span>
            </div>
            <div className="text-[11px] text-indigo-600 font-medium mt-1">
              {Math.round((metrics.mushakIssuedCount / (metrics.totalInvoices || 1)) * 100)}% coverage
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="চালান নম্বর, ইনভয়েস নম্বর, ক্রেতার নাম বা বিআইএন (BIN) দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mushak Status Dropdown */}
            <div className="w-full md:w-52">
              <select
                value={mushakFilter}
                onChange={(e) => handleMushakFilterChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
              >
                <option value="all">মূসক চালান: সকল অবস্থা (All)</option>
                <option value="issued">ইস্যুকৃত চালান (Mushak Issued)</option>
                <option value="pending">অপেক্ষমাণ (Mushak Pending)</option>
              </select>
            </div>

            {/* Invoice Status Dropdown */}
            <div className="w-full md:w-44">
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
              >
                <option value="all">ইনভয়েস স্ট্যাটাস: সকল</option>
                <option value="posted">Posted (অনুমোদিত)</option>
                <option value="draft">Draft (খসড়া)</option>
              </select>
            </div>

            {(searchQuery || statusFilter !== "all" || mushakFilter !== "all") && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Table Container with Top-Rim Progress Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden relative">
          {/* Top-rim Indeterminate Progress Bar during background fetching */}
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-100 overflow-hidden z-20">
              <div className="h-full bg-indigo-600 animate-[indeterminate_1.5s_infinite_linear] origin-left w-full" />
            </div>
          )}

          {/* Initial Skeleton Loader */}
          {initialLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">{error}</p>
              <button
                type="button"
                onClick={() => loadData(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
              >
                Try Again
              </button>
            </div>
          ) : paginatedInvoices.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">কোনো ইনভয়েস পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                আপনার নির্বাচিত ফিল্টারের সাথে কোনো ইনভয়েস বা মূসক-৬.৩ চালান মিলেনি।
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-1.5 text-xs font-medium text-indigo-600 hover:underline"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className={`w-full text-left text-xs transition-opacity duration-200 ${
                  isFetching ? "opacity-60" : "opacity-100"
                }`}
              >
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">ইনভয়েস ও তারিখ</th>
                    <th className="py-3 px-4">মূসক-৬.৩ চালানপত্র নং</th>
                    <th className="py-3 px-4">ক্রেতার বিবরণ ও বিআইএন</th>
                    <th className="py-3 px-4 text-right">মূল্য (Base)</th>
                    <th className="py-3 px-4 text-right">মূসক (VAT 15%)</th>
                    <th className="py-3 px-4 text-right">মোট প্রদেয় (Gross)</th>
                    <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                    <th className="py-3 px-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedInvoices.map((inv) => {
                    const hasMushak = Boolean(inv.mushak_challan);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/75 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 font-mono">
                            {inv.invoice_number}
                          </div>
                          <div className="text-[11px] text-slate-500">{inv.issue_date}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          {hasMushak ? (
                            <div>
                              <span className="font-mono font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px]">
                                {inv.mushak_challan?.mushak_number}
                              </span>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                FY: {inv.mushak_challan?.fiscal_year} • Serial #{inv.mushak_challan?.serial_number}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                              <Clock className="w-3 h-3" /> অপেক্ষমাণ (Pending)
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900">{inv.buyer_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            BIN: {inv.buyer_bin || "Unregistered Retail"}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                          {formatCurrency(inv.total_subtotal)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-medium text-emerald-700">
                          {formatCurrency(inv.total_vat)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-950">
                          {formatCurrency(inv.total_payable)}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              inv.status === "posted"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenMushakModal(inv.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition"
                            title="View / Print Statutory Mushak 6.3"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>চালানপত্র (৬.৩)</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {!initialLoading && filteredInvoices.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <div className="text-xs text-slate-500">
                Showing <span className="font-semibold text-slate-700">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                <span className="font-semibold text-slate-700">
                  {Math.min(currentPage * pageSize, filteredInvoices.length)}
                </span>{" "}
                of <span className="font-semibold text-slate-700">{filteredInvoices.length}</span> invoices
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium text-slate-700 px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mushak 6.3 Printable Modal */}
      <Mushak63Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedInvoiceId(null);
        }}
        invoiceId={selectedInvoiceId}
        businessId={businessId}
      />
    </DashboardLayout>
  );
}
