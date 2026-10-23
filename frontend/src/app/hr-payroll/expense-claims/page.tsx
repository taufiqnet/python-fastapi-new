"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { ExpenseSettlementClaim, TravelExpenseStats } from "@/types";
import { useToast } from "@/context/toast-context";
import {
  Receipt,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Banknote,
  FileText,
  User,
  X,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

export default function ExpenseClaimsAdminPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [claims, setClaims] = useState<ExpenseSettlementClaim[]>([]);
  const [stats, setStats] = useState<TravelExpenseStats>({
    pending_travel_requests: 0,
    active_travel_advances: 0,
    total_advances_amount: 0,
    pending_claims: 0,
    total_claims_pending_amount: 0,
    settled_claims_this_month: 0,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [claimTypeFilter, setClaimTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Audit Drawer State
  const [selectedClaimForAudit, setSelectedClaimForAudit] = useState<ExpenseSettlementClaim | null>(null);

  // Review & Settle Modals
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<"manager_approved" | "finance_approved" | "rejected">("finance_approved");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settleChannel, setSettleChannel] = useState("bank_transfer");
  const [settleRef, setSettleRef] = useState("");
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);

  const loadData = async (isBackground = false) => {
    if (isBackground) setIsFetching(true);
    else setInitialLoading(true);

    try {
      const params: Record<string, any> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (claimTypeFilter !== "all") params.claim_type = claimTypeFilter;

      const [claimsRes, statsRes] = await Promise.allSettled([
        apiClient.get<ExpenseSettlementClaim[]>("/expenses/claims", { params }),
        apiClient.get<TravelExpenseStats>("/travel/overview/stats"),
      ]);

      if (claimsRes.status === "fulfilled") setClaims(claimsRes.value.data || []);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
    } catch (err: any) {
      toast.error("Error Loading Claims", err.message || "Failed to load expense settlement claims.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const handleFilterChange = (st: string, type: string, query: string) => {
    startTransition(() => {
      setStatusFilter(st);
      setClaimTypeFilter(type);
      setSearchQuery(query);
    });
  };

  useEffect(() => {
    if (!initialLoading) {
      loadData(true);
    }
  }, [statusFilter, claimTypeFilter]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaimForAudit) return;
    setIsSubmittingReview(true);
    try {
      await apiClient.post(`/expenses/claims/${selectedClaimForAudit.id}/review`, {
        status: reviewAction,
        approval_notes: approvalNotes || null,
      });
      toast.success(
        "Claim Reviewed",
        `Expense claim ${selectedClaimForAudit.claim_number} marked as ${reviewAction.replace("_", " ")}.`
      );
      setIsReviewModalOpen(false);
      setSelectedClaimForAudit(null);
      loadData(true);
    } catch (err: any) {
      toast.error("Review Failed", err.response?.data?.detail || err.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaimForAudit) return;
    setIsSubmittingReview(true);
    try {
      await apiClient.post(`/expenses/claims/${selectedClaimForAudit.id}/settle`, {
        settlement_channel: settleChannel,
        payment_reference: settleRef || null,
      });
      toast.success(
        "Claim Settled",
        `Claim settled via ${settleChannel.replace("_", " ")}.`
      );
      setIsSettleModalOpen(false);
      setSelectedClaimForAudit(null);
      setSettleRef("");
      loadData(true);
    } catch (err: any) {
      toast.error("Settlement Failed", err.response?.data?.detail || err.message);
    } finally {
      setIsSubmittingSettle(false);
    }
  };

  const filteredClaims = claims.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.claim_number.toLowerCase().includes(q) ||
      (c.employee_name && c.employee_name.toLowerCase().includes(q)) ||
      c.title.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
              <Receipt className="w-4 h-4" />
              <span>HR & Payroll Management</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Expense Claims & Reimbursement Settlements
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Itemized receipt audit, advance offset reconciliation, and direct bank or payroll adjustment payout
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/hr-payroll/travel-requests"
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Travel Requests
            </Link>
            <Link
              href="/hr-payroll/expense-policies"
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              DA & Mileage Policies
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-600 uppercase">Pending Review</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-2">{stats.pending_claims}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Claims waiting audit</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-indigo-600 uppercase">Pending Amount</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Banknote className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
              BDT {Number(stats.total_claims_pending_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Total payable in review</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-600 uppercase">Settled This Month</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-2">{stats.settled_claims_this_month}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Disbursed / payroll adjusted</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleFilterChange(statusFilter, claimTypeFilter, e.target.value)}
                placeholder="Search claim #, title, employee..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <select
              value={claimTypeFilter}
              onChange={(e) => handleFilterChange(statusFilter, e.target.value, searchQuery)}
              className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700"
            >
              <option value="all">All Claim Types</option>
              <option value="travel_settlement">Travel Settlement</option>
              <option value="daily_conveyance">Daily Conveyance & DA</option>
              <option value="general_expense">General Office Expense</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value, claimTypeFilter, searchQuery)}
              className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="manager_approved">Manager Approved</option>
              <option value="finance_approved">Finance Approved</option>
              <option value="settled">Settled & Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button
              onClick={() => loadData(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
              <span>Refresh</span>
            </button>
            <span className="font-semibold text-slate-700">{filteredClaims.length}</span> claims
          </div>
        </div>

        {/* Table Container */}
        <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-100 overflow-hidden z-10">
              <div className="h-full bg-indigo-600 animate-pulse w-full" />
            </div>
          )}

          {initialLoading ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-xs">Loading expense claims...</p>
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400">
              <Receipt className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No expense claims found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full text-left border-collapse transition-opacity duration-150 ${isFetching ? "opacity-75" : "opacity-100"}`}>
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Claim # / Title</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Claim Type</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Total Claimed</th>
                    <th className="py-3 px-4">Advance Deducted</th>
                    <th className="py-3 px-4">Net Payable</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredClaims.map((claim) => {
                    const isNetPositive = Number(claim.net_payable_or_refundable) >= 0;
                    return (
                      <tr key={claim.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{claim.title}</div>
                          <div className="font-mono text-[11px] text-indigo-600 font-medium">
                            {claim.claim_number}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-medium text-slate-900">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{claim.employee_name || "—"}</span>
                          </div>
                          {claim.employee_code && (
                            <div className="text-[11px] font-mono text-slate-400">{claim.employee_code}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize">
                            {claim.claim_type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{claim.claim_date}</td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-800">
                          {Number(claim.total_claim_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {Number(claim.advance_deducted).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          <span className={isNetPositive ? "text-emerald-600" : "text-rose-600"}>
                            {isNetPositive ? "+" : ""}
                            {Number(claim.net_payable_or_refundable).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              claim.status === "settled"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : claim.status === "finance_approved" || claim.status === "manager_approved"
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : claim.status === "submitted"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {claim.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedClaimForAudit(claim)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Drawer: Inspect Claim & Audit Line Items */}
        {selectedClaimForAudit && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white w-full max-w-xl h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
                      <Receipt className="w-4 h-4" />
                      <span>Claim Audit Drawer</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mt-1">{selectedClaimForAudit.title}</h2>
                    <p className="text-xs text-slate-500 font-mono">{selectedClaimForAudit.claim_number}</p>
                  </div>
                  <button
                    onClick={() => setSelectedClaimForAudit(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Settlement Balance Overview */}
                <div className="grid grid-cols-3 gap-3 my-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Gross Claimed</span>
                    <div className="font-mono text-sm font-bold text-slate-900 mt-0.5">
                      BDT {Number(selectedClaimForAudit.total_claim_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Advance Deducted</span>
                    <div className="font-mono text-sm font-bold text-slate-600 mt-0.5">
                      BDT {Number(selectedClaimForAudit.advance_deducted).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Net Payable</span>
                    <div className="font-mono text-sm font-bold text-emerald-600 mt-0.5">
                      BDT {Number(selectedClaimForAudit.net_payable_or_refundable).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Line Items List */}
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Itemized Receipts & Mileage</h3>
                <div className="space-y-2">
                  {selectedClaimForAudit.lines && selectedClaimForAudit.lines.length > 0 ? (
                    selectedClaimForAudit.lines.map((ln, idx) => (
                      <div key={ln.id || idx} className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 capitalize">
                            {ln.category.replace("_", " ")}
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            BDT {Number(ln.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{ln.description}</p>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                          <span>{ln.expense_date}</span>
                          {ln.conveyance_km && <span>{ln.conveyance_km} km ({ln.conveyance_mode || "Local"})</span>}
                          {ln.receipt_url && (
                            <a
                              href={ln.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-0.5"
                            >
                              <span>View Receipt</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No line items attached.</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedClaimForAudit(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>

                <div className="flex items-center gap-2">
                  {selectedClaimForAudit.status === "submitted" && (
                    <button
                      type="button"
                      onClick={() => setIsReviewModalOpen(true)}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                    >
                      Audit / Approve
                    </button>
                  )}

                  {selectedClaimForAudit.status === "finance_approved" && (
                    <button
                      type="button"
                      onClick={() => setIsSettleModalOpen(true)}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    >
                      Disburse / Settle
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Review Claim */}
        {isReviewModalOpen && selectedClaimForAudit && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative">
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
                <ShieldCheck className="w-4 h-4" />
                <span>Audit Decision</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">Authorize Expense Claim</h2>
              <p className="text-xs text-slate-500">
                Auditing {selectedClaimForAudit.claim_number} ({selectedClaimForAudit.title}).
              </p>

              <form onSubmit={handleReviewSubmit} className="space-y-3.5 mt-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Decision</label>
                  <select
                    value={reviewAction}
                    onChange={(e: any) => setReviewAction(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="finance_approved">Finance Approved (Ready for Settlement)</option>
                    <option value="manager_approved">Manager Approved (Forward to Finance)</option>
                    <option value="rejected">Reject Claim</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Audit Notes</label>
                  <textarea
                    rows={3}
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Receipt verification notes or reason for deduction/rejection..."
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                  >
                    {isSubmittingReview ? "Submitting..." : "Save Audit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Settle Claim */}
        {isSettleModalOpen && selectedClaimForAudit && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative">
              <button
                onClick={() => setIsSettleModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs tracking-wider uppercase">
                <Banknote className="w-4 h-4" />
                <span>Payout & Payroll Settlement</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">Execute Expense Payout</h2>
              <p className="text-xs text-slate-500">
                Net amount: <strong className="text-emerald-600 font-mono">BDT {Number(selectedClaimForAudit.net_payable_or_refundable).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
              </p>

              <form onSubmit={handleSettleSubmit} className="space-y-3.5 mt-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Settlement Channel</label>
                  <select
                    value={settleChannel}
                    onChange={(e) => setSettleChannel(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="bank_transfer">Corporate Bank Transfer (BEFTN/RTGS)</option>
                    <option value="payroll_adjustment">Payroll Adjustment (Include in next Payslip)</option>
                    <option value="cash">Petty Cash Payout</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Payment / Transaction Ref</label>
                  <input
                    type="text"
                    value={settleRef}
                    onChange={(e) => setSettleRef(e.target.value)}
                    placeholder="Bank TXN ID or Voucher #"
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsSettleModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSettle}
                    className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    {isSubmittingSettle ? "Executing..." : "Confirm Settlement"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
