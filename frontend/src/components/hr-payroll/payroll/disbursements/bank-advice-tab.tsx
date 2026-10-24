"use client";

import React, { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import {
  Building2,
  Download,
  FileSpreadsheet,
  Smartphone,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  Printer,
  ChevronDown,
  Layers,
  ShieldCheck,
  PauseCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import {
  PayrollPeriodOut,
  PayrollRecordOut,
  CompanyBankAccountOut,
} from "@/types";

interface BankAdviceTabProps {
  periods: PayrollPeriodOut[];
  currentBusinessId: number;
}

export function BankAdviceTab({
  periods,
  currentBusinessId,
}: BankAdviceTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Period state
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    periods[0]?.id || ""
  );

  useEffect(() => {
    if (!selectedPeriodId && periods.length > 0) {
      setSelectedPeriodId(periods[0].id);
    }
  }, [periods, selectedPeriodId]);

  // Company Bank Accounts
  const [bankAccounts, setBankAccounts] = useState<CompanyBankAccountOut[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");

  // Payslip records for this period
  const [records, setRecords] = useState<PayrollRecordOut[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // Fetch Company Bank Accounts
  const fetchBankAccounts = useCallback(async () => {
    try {
      const res = await apiClient.get<CompanyBankAccountOut[]>(
        `/payroll/bank-accounts?business_id=${currentBusinessId}`
      );
      setBankAccounts(res.data || []);
      const defaultAcc = res.data?.find((b) => b.is_default);
      if (defaultAcc) {
        setSelectedBankAccountId(defaultAcc.id);
      } else if (res.data?.length) {
        setSelectedBankAccountId(res.data[0].id);
      }
    } catch (err) {
      console.error("Failed to load company bank accounts:", err);
    }
  }, [currentBusinessId]);

  // Fetch Payslip Records for Selected Period
  const fetchRecords = useCallback(
    async (isBackground = false) => {
      if (!selectedPeriodId) return;
      if (isBackground) setIsFetching(true);
      else setInitialLoading(true);
      setError(null);

      try {
        const res = await apiClient.get<PayrollRecordOut[]>(
          `/payroll/records?period_id=${selectedPeriodId}&business_id=${currentBusinessId}&limit=500`
        );
        setRecords(res.data || []);
      } catch (err) {
        console.error("Failed to load records for advice:", err);
        setError("Failed to load payroll records for this disbursement period.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [selectedPeriodId, currentBusinessId]
  );

  useEffect(() => {
    fetchBankAccounts();
  }, [fetchBankAccounts]);

  useEffect(() => {
    fetchRecords(false);
  }, [fetchRecords]);

  // Handle BEFTN Download
  const handleDownloadBEFTN = async () => {
    if (!selectedPeriodId) return;
    setIsDownloading("beftn");
    try {
      let url = `/payroll/advice/excel?period_id=${selectedPeriodId}`;
      if (selectedBankAccountId) {
        url += `&bank_account_id=${selectedBankAccountId}`;
      }
      const response = await apiClient.get(url, { responseType: "blob" });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `BEFTN_Bank_Advice_${selectedPeriodId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Download Complete", "BEFTN Bank Advice spreadsheet downloaded successfully.");
    } catch (err: any) {
      toast.error("Export Failed", err?.response?.data?.detail || "Could not generate bank advice.");
    } finally {
      setIsDownloading(null);
    }
  };

  // Handle MFS Download
  const handleDownloadMFS = async () => {
    if (!selectedPeriodId) return;
    setIsDownloading("mfs");
    try {
      const url = `/payroll/advice/mfs?period_id=${selectedPeriodId}`;
      const response = await apiClient.get(url, { responseType: "blob" });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `MFS_Disbursement_Advice_${selectedPeriodId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Download Complete", "bKash/Nagad MFS Disbursement schedule downloaded.");
    } catch (err: any) {
      toast.error("Export Failed", err?.response?.data?.detail || "Could not generate MFS advice.");
    } finally {
      setIsDownloading(null);
    }
  };

  // Metrics computation
  const eligibleRecords = useMemo(() => records.filter((r) => !r.is_held), [records]);
  const heldRecords = useMemo(() => records.filter((r) => r.is_held), [records]);

  const totalEligibleNet = useMemo(
    () => eligibleRecords.reduce((acc, r) => acc + (r.net_salary || 0), 0),
    [eligibleRecords]
  );
  const totalHeldNet = useMemo(
    () => heldRecords.reduce((acc, r) => acc + (r.net_salary || 0), 0),
    [heldRecords]
  );

  const bankCount = useMemo(
    () => eligibleRecords.filter((r) => (r.payment_method || "").toLowerCase().includes("bank")).length,
    [eligibleRecords]
  );
  const mfsCount = useMemo(
    () => eligibleRecords.filter((r) => (r.payment_method || "").toLowerCase().includes("mfs") || (r.payment_method || "").toLowerCase().includes("bkash") || (r.payment_method || "").toLowerCase().includes("nagad")).length,
    [eligibleRecords]
  );
  const cashCount = useMemo(
    () => eligibleRecords.length - bankCount - mfsCount,
    [eligibleRecords, bankCount, mfsCount]
  );

  // Filtered rows for the view
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        !searchQuery ||
        (r.employee_name && r.employee_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.employee_code && r.employee_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.bank_account && r.bank_account.toLowerCase().includes(searchQuery.toLowerCase()));

      const method = (r.payment_method || "bank").toLowerCase();
      const matchesMethod =
        paymentMethodFilter === "all"
          ? true
          : paymentMethodFilter === "bank"
          ? method.includes("bank")
          : paymentMethodFilter === "mfs"
          ? method.includes("mfs") || method.includes("bkash") || method.includes("nagad")
          : !method.includes("bank") && !method.includes("mfs");

      return matchesSearch && matchesMethod;
    });
  }, [records, searchQuery, paymentMethodFilter]);

  return (
    <div className="space-y-6">
      {/* Header & Controls Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Bank & MFS Disbursement Advice
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated corporate electronic funds transfer (BEFTN / RTGS / NPSB) and mobile financial services (bKash / Nagad) batch advice
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Period selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Period:</label>
              <select
                value={selectedPeriodId}
                onChange={(e) => {
                  const val = e.target.value;
                  startTransition(() => setSelectedPeriodId(val));
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Corporate Debit Account */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Debit Bank:</label>
              <select
                value={selectedBankAccountId}
                onChange={(e) => setSelectedBankAccountId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 max-w-[220px]"
              >
                {bankAccounts.length > 0 ? (
                  bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bank_name} - {b.account_number} {b.is_default ? "★" : ""}
                    </option>
                  ))
                ) : (
                  <option value="">Default Company Account</option>
                )}
              </select>
            </div>

            <button
              type="button"
              onClick={() => fetchRecords(true)}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isDownloading === "beftn" || eligibleRecords.length === 0}
              onClick={handleDownloadBEFTN}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {isDownloading === "beftn" ? "Generating BEFTN..." : "Download BEFTN Bank Advice (Excel)"}
            </button>

            <button
              type="button"
              disabled={isDownloading === "mfs" || eligibleRecords.length === 0}
              onClick={handleDownloadMFS}
              className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Smartphone className="w-4 h-4" />
              {isDownloading === "mfs" ? "Generating MFS..." : "Download bKash/Nagad Advice (Excel)"}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              Print Advice Summary
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            * Bank advice auto-excludes {heldRecords.length} on-hold employee salaries
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Payable</span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">
            ৳ {totalEligibleNet.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1">
            {eligibleRecords.length} Employees Cleared
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Bank Transfers (EFT)</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">{bankCount}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">BEFTN Routing 9-Digit</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">MFS Wallets</span>
            <Smartphone className="w-4 h-4 text-pink-500" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">{mfsCount}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">bKash & Nagad Disbursed</div>
        </div>

        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-bold">Held / Suspended</span>
            <PauseCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-900 mt-2">
            ৳ {totalHeldNet.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-amber-700 font-bold mt-1">
            {heldRecords.length} Retained from advice
          </div>
        </div>
      </div>

      {/* Advice Ledger Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden relative">
        {/* Top Progress Bar on background fetch */}
        {isFetching && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden z-20">
            <div className="w-full h-full bg-gradient-to-r from-indigo-500 via-teal-500 to-indigo-500 animate-pulse" />
          </div>
        )}

        <div className="p-4 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Disbursement Schedule Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Individual beneficiary bank details, routing credentials, and net disbursement amounts
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  startTransition(() => setSearchQuery(val));
                }}
                placeholder="Search beneficiary or account..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-48 focus:w-60 transition-all focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Method Filter */}
            <select
              value={paymentMethodFilter}
              onChange={(e) => {
                const val = e.target.value;
                startTransition(() => setPaymentMethodFilter(val));
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Methods</option>
              <option value="bank">Bank Transfer (BEFTN)</option>
              <option value="mfs">MFS (bKash/Nagad)</option>
              <option value="cash">Cash / Cheque</option>
            </select>
          </div>
        </div>

        {/* In-Place Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3">Beneficiary Employee</th>
                <th className="px-5 py-3">Payment Channel</th>
                <th className="px-5 py-3">Account / Wallet No.</th>
                <th className="px-5 py-3 text-right">Net Payable</th>
                <th className="px-5 py-3">Disbursement Status</th>
                <th className="px-5 py-3 text-right">Advice Inclusion</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-100 text-xs transition-opacity duration-200 ${
                isFetching ? "opacity-75" : "opacity-100"
              }`}
            >
              {initialLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="h-3.5 bg-slate-100 rounded w-32 mb-1" />
                      <div className="h-2.5 bg-slate-100 rounded w-20" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 bg-slate-100 rounded w-20" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3 bg-slate-100 rounded w-28" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="h-3.5 bg-slate-100 rounded w-20 ml-auto" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-5 bg-slate-100 rounded-full w-16" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="h-5 bg-slate-100 rounded w-20 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 leading-tight">
                        {r.employee_name || "Employee"}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {r.employee_code || r.employee_id}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 capitalize font-medium text-slate-700">
                      {r.payment_method || "Bank Transfer"}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-700">
                      {r.bank_account || <span className="text-slate-300 italic">Not Assigned</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-slate-900">
                      ৳ {(r.net_salary || 0).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5">
                      {r.is_paid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Disbursed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Pending Pay
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {r.is_held ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <PauseCircle className="w-3 h-3 text-amber-600" /> Held / Excluded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          <CheckCircle2 className="w-3 h-3 text-teal-600" /> Included in EFT
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    No disbursement records found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
