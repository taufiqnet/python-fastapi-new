"use client";

import React, { useEffect, useState, useMemo, useRef, startTransition } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import {
  Receipt,
  Search,
  RefreshCw,
  Building2,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

interface JournalEntryItem {
  id: string;
  account_id: string;
  account_code?: string | null;
  account_name?: string | null;
  debit: number | string;
  credit: number | string;
  narration?: string | null;
}

interface JournalVoucherItem {
  id: string;
  business_id: number;
  voucher_number: string;
  voucher_type: string;
  entry_date: string;
  status: string;
  reference?: string | null;
  notes?: string | null;
  posted_at?: string | null;
  entries: JournalEntryItem[];
}

export default function JournalVouchersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const businessId = user?.business_id || 1;

  const [vouchers, setVouchers] = useState<JournalVoucherItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedVoucherId, setExpandedVoucherId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const loadData = async (isInitial = false) => {
    if (isInitial) setInitialLoading(true);
    else setIsFetching(true);
    setError(null);

    try {
      const res = await apiClient.get<JournalVoucherItem[]>(
        `/finance/journal-vouchers?business_id=${businessId}&limit=100`
      );
      setVouchers(res.data || []);
    } catch {
      setError("Failed to fetch Journal Vouchers from backend.");
      toast?.("Failed to fetch vouchers", "error");
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

  const handleSearchChange = (q: string) => {
    startTransition(() => {
      setSearchQuery(q);
      setCurrentPage(1);
    });
  };

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNum = v.voucher_number.toLowerCase().includes(q);
        const matchesRef = v.reference?.toLowerCase().includes(q);
        const matchesNote = v.notes?.toLowerCase().includes(q);
        if (!matchesNum && !matchesRef && !matchesNote) return false;
      }
      if (typeFilter !== "all" && v.voucher_type.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [vouchers, searchQuery, typeFilter]);

  const totalPages = Math.ceil(filteredVouchers.length / pageSize) || 1;
  const paginatedVouchers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVouchers.slice(start, start + pageSize);
  }, [filteredVouchers, currentPage, pageSize]);

  const formatCurrency = (val: number | string) => {
    const num = parseFloat(String(val || 0));
    return `BDT ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const toggleExpand = (id: string) => {
    setExpandedVoucherId((prev) => (prev === id ? null : id));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                General Ledger
              </span>
              <span className="text-xs font-medium text-slate-500">Double-Entry Postings</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1 flex items-center gap-2.5">
              <Receipt className="w-6 h-6 text-indigo-600" />
              জার্নাল ভাউচার (Journal Vouchers)
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Balanced Debit &amp; Credit General Ledger Entries (Sales, VAT Payable &amp; Cash Settlements)
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

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ভাউচার নম্বর বা রেফারেন্স দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div className="w-full md:w-52">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
            >
              <option value="all">সকল ধরন (All Types)</option>
              <option value="journal">Journal Voucher</option>
              <option value="payment">Payment Voucher</option>
              <option value="receipt">Receipt Voucher</option>
              <option value="contra">Contra Voucher</option>
            </select>
          </div>
        </div>

        {/* Vouchers List */}
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
          ) : paginatedVouchers.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-2">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">কোনো ভাউচার পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-500">আপনার ফিল্টারের সাথে কোনো জার্নাল ভাউচার মিলেনি।</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {paginatedVouchers.map((v) => {
                const isExpanded = expandedVoucherId === v.id;
                const totalDebit = v.entries.reduce(
                  (sum, e) => sum + parseFloat(String(e.debit || 0)),
                  0
                );

                return (
                  <div key={v.id} className="transition-colors hover:bg-slate-50/50">
                    <div
                      onClick={() => toggleExpand(v.id)}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-mono font-bold text-xs shrink-0">
                          JV
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {v.voucher_number}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                              {v.voucher_type}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                              {v.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            তারিখ: {v.entry_date} {v.reference ? `• Ref: ${v.reference}` : ""}{" "}
                            {v.notes ? `• ${v.notes}` : ""}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                            মোট ভ্যালু
                          </span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {formatCurrency(totalDebit)}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Entries Table */}
                    {isExpanded && (
                      <div className="px-6 pb-4 pt-1 bg-slate-50/80 border-t border-slate-100">
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                          <table className="w-full text-left">
                            <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                              <tr>
                                <th className="py-2 px-3">হিসাব কোড ও নাম</th>
                                <th className="py-2 px-3">বিবরণ (Narration)</th>
                                <th className="py-2 px-3 text-right">ডেবিট (Debit BDT)</th>
                                <th className="py-2 px-3 text-right">ক্রেডিট (Credit BDT)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {v.entries.map((entry) => (
                                <tr key={entry.id}>
                                  <td className="py-2 px-3">
                                    <span className="font-mono font-bold text-indigo-900 mr-2">
                                      {entry.account_code || "-"}
                                    </span>
                                    <span className="text-slate-800 font-medium">
                                      {entry.account_name || "Account Entry"}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-slate-500 text-[11px]">
                                    {entry.narration || "-"}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                                    {parseFloat(String(entry.debit)) > 0
                                      ? formatCurrency(entry.debit)
                                      : "-"}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                                    {parseFloat(String(entry.credit)) > 0
                                      ? formatCurrency(entry.credit)
                                      : "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!initialLoading && filteredVouchers.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 text-xs">
              <span className="text-slate-500">
                Page {currentPage} of {totalPages} ({filteredVouchers.length} vouchers)
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
    </DashboardLayout>
  );
}
