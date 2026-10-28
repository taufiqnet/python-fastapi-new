"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import {
  CreditCard,
  DollarSign,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  ExternalLink,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaymentTransactionOut } from "@/types";

export default function PaymentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  // Primary Data State
  const [payments, setPayments] = useState<PaymentTransactionOut[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Refund Modal State
  const [selectedTx, setSelectedTx] = useState<PaymentTransactionOut | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundReason, setRefundReason] = useState<string>("customer_request");
  const [isRefunding, setIsRefunding] = useState<boolean>(false);

  // Fetch Payments with in-place transition
  const fetchPayments = useCallback(
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

        const res = await apiClient.get<PaymentTransactionOut[]>("/payments", { params });
        let data = res.data || [];

        if (methodFilter !== "all") {
          data = data.filter((p) => p.payment_method?.toLowerCase() === methodFilter.toLowerCase());
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          data = data.filter(
            (p) =>
              p.transaction_ref?.toLowerCase().includes(q) ||
              p.order_number?.toLowerCase().includes(q) ||
              p.order_id?.toLowerCase().includes(q)
          );
        }

        setPayments(data);
      } catch (err) {
        console.error("Failed to load payments", err);
        toast.error("Data Load Error", "Failed to retrieve payment transaction ledger.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [user?.business_id, statusFilter, methodFilter, searchQuery, toast]
  );

  useEffect(() => {
    fetchPayments(payments.length > 0);
  }, [statusFilter, methodFilter, searchQuery]);

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

  // Open Refund Dialog
  const openRefundDialog = (tx: PaymentTransactionOut) => {
    setSelectedTx(tx);
    setRefundAmount(tx.amount.toString());
    setRefundReason("customer_request");
  };

  // Execute Refund
  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;

    setIsRefunding(true);
    try {
      await apiClient.post(
        `/payments/refunds`,
        {
          payment_id: selectedTx.id,
          amount: Number(refundAmount),
          reason: refundReason,
        },
        { params: { business_id: user?.business_id || 1 } }
      );

      toast.success("Refund Processed", `Refund of ${formatCurrency(Number(refundAmount))} issued.`);
      setSelectedTx(null);
      fetchPayments(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to process refund.";
      toast.error("Refund Error", msg);
    } finally {
      setIsRefunding(false);
    }
  };

  // Metrics
  const totalVolume = payments
    .filter((p) => p.status === "success")
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const successCount = payments.filter((p) => p.status === "success").length;
  const refundedCount = payments.filter((p) => p.status === "refunded").length;
  const pendingCount = payments.filter((p) => p.status === "pending").length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Payments & Financial Transactions
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Gateway settlements, capture verification, instant refunds, and multi-channel audit trail.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchPayments(true)}
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
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Captured</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{formatCurrency(totalVolume)}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Success Transactions</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{successCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Intent</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{pendingCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Refunds Issued</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{refundedCount}</p>
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
              {["all", "success", "pending", "refunded", "failed"].map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all shrink-0 ${
                    statusFilter === st
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100/70 text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search transaction ref or order..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-1.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Table Container - Never unmounted */}
          <div className="overflow-x-auto min-h-[250px] relative">
            {initialLoading ? (
              <div className="p-8 text-center text-slate-400">Loading transactions...</div>
            ) : payments.length === 0 ? (
              <div className="p-12 text-center">
                <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800">No payment records found</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Processed online checkouts and POS tenders will show here.
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
                    <th className="py-3.5 px-4">Transaction Ref</th>
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-4 text-right">Fee</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                        {p.transaction_ref}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 text-xs">
                        {p.order_number || p.order_id}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-medium capitalize">
                        {p.payment_method.replace("_", " ")}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500 text-xs">
                        {p.fee ? formatCurrency(p.fee) : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {p.status === "success" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Success
                          </span>
                        ) : p.status === "refunded" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Refunded
                          </span>
                        ) : p.status === "failed" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">{formatDate(p.created_at)}</td>
                      <td className="py-3.5 px-4 text-center">
                        {p.status === "success" && (
                          <button
                            onClick={() => openRefundDialog(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Refund
                          </button>
                        )}
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
              Showing <span className="font-semibold text-slate-700">{payments.length}</span> transactions
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
                disabled={payments.length < pageSize || isFetching}
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

      {/* Refund Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <RotateCcw className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Issue Payment Refund</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Ref: {selectedTx.transaction_ref}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessRefund} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Refund Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedTx.amount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 font-bold"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  Max refundable: {formatCurrency(selectedTx.amount)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Refund Reason
                </label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                >
                  <option value="customer_request">Customer Cancellation</option>
                  <option value="item_damaged">Damaged or Defective Goods</option>
                  <option value="duplicate_charge">Duplicate Charge</option>
                  <option value="out_of_stock">Inventory Stockout</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedTx(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRefunding}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {isRefunding ? "Processing..." : "Confirm Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
