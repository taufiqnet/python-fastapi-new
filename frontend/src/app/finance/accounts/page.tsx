"use client";

import React, { useEffect, useState, useMemo, useRef, startTransition } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import {
  Wallet,
  Search,
  RefreshCw,
  Building2,
  CheckCircle2,
  AlertCircle,
  Plus,
  ShieldCheck,
  Tag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface AccountItem {
  id: string;
  business_id: number;
  code: string;
  name: string;
  account_type: string; // asset, liability, equity, revenue, expense
  parent_id?: string | null;
  currency: string;
  is_active: boolean;
  is_system: boolean;
  description?: string | null;
}

export default function ChartOfAccountsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const businessId = user?.business_id || 1;

  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const loadData = async (isInitial = false) => {
    if (isInitial) setInitialLoading(true);
    else setIsFetching(true);
    setError(null);

    try {
      const res = await apiClient.get<AccountItem[]>(
        `/finance/accounts?business_id=${businessId}`
      );
      setAccounts(res.data || []);
    } catch {
      setError("Failed to fetch Chart of Accounts from backend.");
      toast?.("Failed to fetch accounts", "error");
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
    });
  };

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = acc.code.toLowerCase().includes(q);
        const matchesName = acc.name.toLowerCase().includes(q);
        if (!matchesCode && !matchesName) return false;
      }
      if (typeFilter !== "all" && acc.account_type.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [accounts, searchQuery, typeFilter]);

  const getTypeBadgeClass = (type: string) => {
    switch (type.toLowerCase()) {
      case "asset":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "liability":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "equity":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "revenue":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "expense":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                Finance &amp; Accounting
              </span>
              <span className="text-xs font-medium text-slate-500">General Ledger Matrix</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1 flex items-center gap-2.5">
              <Wallet className="w-6 h-6 text-indigo-600" />
              হিসাব তালিকা (Chart of Accounts)
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Standard 4-Digit Bangladeshi Chart of Accounts (Assets, Liabilities, VAT Payable, Revenues, Expenses)
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

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="হিসাব কোড (যেমন ১১০০, ২১০০, ৪০১০) বা নাম দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div className="w-full md:w-56">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
            >
              <option value="all">সকল ধরন (All Account Types)</option>
              <option value="asset">Asset (সম্পদ)</option>
              <option value="liability">Liability (দায় ও মূসক প্রদেয়)</option>
              <option value="equity">Equity (মালিকানা স্বত্ব)</option>
              <option value="revenue">Revenue (বিক্রয় আয়)</option>
              <option value="expense">Expense (ব্যয়)</option>
            </select>
          </div>
        </div>

        {/* Accounts Table */}
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
          ) : filteredAccounts.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-2">
              <Wallet className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">কোনো হিসাব পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-500">আপনার ফিল্টারের সাথে কোনো অ্যাকাউন্ট মিলেনি।</p>
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
                    <th className="py-3 px-4 w-28">কোড (Code)</th>
                    <th className="py-3 px-4">হিসাবের নাম (Account Title)</th>
                    <th className="py-3 px-4">ধরন (Type)</th>
                    <th className="py-3 px-4">কারেন্সি</th>
                    <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                    <th className="py-3 px-4 text-center">সিস্টেম অ্যাকাউন্ট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-900 bg-indigo-50/50">
                        {acc.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{acc.name}</div>
                        {acc.description && (
                          <div className="text-[10px] text-slate-500">{acc.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getTypeBadgeClass(
                            acc.account_type
                          )}`}
                        >
                          {acc.account_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 uppercase">{acc.currency || "BDT"}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            acc.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {acc.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {acc.is_system ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            <ShieldCheck className="w-3 h-3 text-indigo-600" /> System Core
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Custom</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
