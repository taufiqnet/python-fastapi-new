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
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Eye,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Mushak63Modal } from "@/components/finance/mushak-6-3-modal";

interface SalesInvoiceItem {
  id: string;
  business_id: number;
  invoice_number: string;
  issue_date: string;
  customer_id?: string | null;
  buyer_name: string;
  buyer_bin?: string | null;
  buyer_address?: string | null;
  delivery_destination?: string | null;
  vehicle_nature_number?: string | null;
  total_subtotal: number | string;
  total_sd: number | string;
  total_vat: number | string;
  total_payable: number | string;
  status: string;
  created_at: string;
  mushak_challan?: {
    id: string;
    mushak_number: string;
    fiscal_year: string;
    serial_number: number;
  } | null;
}

export default function SalesInvoicesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const businessId = user?.business_id || 1;

  // Data State
  const [invoices, setInvoices] = useState<SalesInvoiceItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [autoDownloadPdf, setAutoDownloadPdf] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

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
      setError("Failed to fetch Sales Invoices from server.");
      toast.error("Failed to fetch invoices");
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

  const handlePostInvoice = async (invoiceId: string) => {
    setActionInProgress(invoiceId);
    try {
      await apiClient.post(`/finance/invoices/${invoiceId}/post?business_id=${businessId}`);
      toast.success("Sales invoice posted to General Ledger");
      await loadData(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to post invoice.";
      toast.error(msg);
    } finally {
      setActionInProgress(null);
    }
  };

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

  const handleDownloadPdf = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setAutoDownloadPdf(true);
    setIsModalOpen(true);
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesInv = inv.invoice_number.toLowerCase().includes(q);
        const matchesBuyer = inv.buyer_name?.toLowerCase().includes(q);
        const matchesBin = inv.buyer_bin?.toLowerCase().includes(q);
        if (!matchesInv && !matchesBuyer && !matchesBin) return false;
      }
      if (statusFilter !== "all" && inv.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [invoices, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredInvoices.length / pageSize) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  const formatCurrency = (val: number | string) => {
    const num = parseFloat(String(val || 0));
    return `BDT ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                Finance &amp; Accounting
              </span>
              <span className="text-xs font-medium text-slate-500">Sales Invoicing</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1 flex items-center gap-2.5">
              <FileText className="w-6 h-6 text-indigo-600" />
              বিক্রয় ইনভয়েস তালিকা (Sales Invoices)
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Commercial Sales Invoices, GL Posting &amp; Mushak 6.3 Tax Challan Issuance
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
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ইনভয়েস নম্বর, ক্রেতার নাম অথবা বিআইএন দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
            >
              <option value="all">সকল অবস্থা (All Status)</option>
              <option value="posted">Posted (অনুমোদিত)</option>
              <option value="draft">Draft (খসড়া)</option>
            </select>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden relative">
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-100 overflow-hidden z-20">
              <div className="h-full bg-indigo-600 animate-[indeterminate_1.5s_infinite_linear] origin-left w-full" />
            </div>
          )}

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
            </div>
          ) : paginatedInvoices.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-2">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">কোনো ইনভয়েস পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-500">আপনার ফিল্টারের সাথে কোনো বিক্রয় ইনভয়েস মিলেনি।</p>
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
                    <th className="py-3 px-4">ইনভয়েস নং</th>
                    <th className="py-3 px-4">তারিখ</th>
                    <th className="py-3 px-4">ক্রেতার বিবরণ</th>
                    <th className="py-3 px-4 text-right">মূল্য (Net)</th>
                    <th className="py-3 px-4 text-right">ভ্যাট (VAT)</th>
                    <th className="py-3 px-4 text-right">মোট প্রদেয়</th>
                    <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                    <th className="py-3 px-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{inv.issue_date}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">{inv.buyer_name}</div>
                        {inv.buyer_bin && (
                          <div className="text-[10px] text-slate-500 font-mono">BIN: {inv.buyer_bin}</div>
                        )}
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
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {inv.status === "draft" && (
                          <button
                            type="button"
                            onClick={() => handlePostInvoice(inv.id)}
                            disabled={actionInProgress === inv.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                          >
                            <Send className="w-3 h-3" />
                            <span>Post GL</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvoiceId(inv.id);
                            setAutoDownloadPdf(false);
                            setIsModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition"
                          title="View / Print Statutory Mushak 6.3"
                        >
                          <Printer className="w-3 h-3" />
                          <span>মূসক-৬.৩</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(inv.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition"
                          title="Download Statutory Mushak 6.3 PDF"
                        >
                          <Download className="w-3 h-3" />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!initialLoading && filteredInvoices.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 text-xs">
              <span className="text-slate-500">
                Page {currentPage} of {totalPages} ({filteredInvoices.length} invoices)
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 border border-slate-300 rounded-lg disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 border border-slate-300 rounded-lg disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Mushak63Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedInvoiceId(null);
          setAutoDownloadPdf(false);
        }}
        invoiceId={selectedInvoiceId}
        businessId={businessId}
        autoDownload={autoDownloadPdf}
      />
    </DashboardLayout>
  );
}
