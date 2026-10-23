"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { TravelRequest, TravelExpenseStats } from "@/types";
import { useToast } from "@/context/toast-context";
import {
  Plane,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Banknote,
  Calendar,
  MapPin,
  User,
  X,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

export default function TravelRequestsAdminPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [requests, setRequests] = useState<TravelRequest[]>([]);
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
  const [searchQuery, setSearchQuery] = useState("");

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedReqForReview, setSelectedReqForReview] = useState<TravelRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected">("approved");
  const [approvedAdvanceAmount, setApprovedAdvanceAmount] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Disburse Modal State
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [selectedReqForDisburse, setSelectedReqForDisburse] = useState<TravelRequest | null>(null);
  const [disburseMethod, setDisburseMethod] = useState("bank_transfer");
  const [paymentRef, setPaymentRef] = useState("");
  const [isSubmittingDisburse, setIsSubmittingDisburse] = useState(false);

  const loadData = async (isBackground = false) => {
    if (isBackground) setIsFetching(true);
    else setInitialLoading(true);

    try {
      const params: Record<string, any> = {};
      if (statusFilter !== "all") params.status = statusFilter;

      const [reqsRes, statsRes] = await Promise.allSettled([
        apiClient.get<TravelRequest[]>("/travel/requests", { params }),
        apiClient.get<TravelExpenseStats>("/travel/overview/stats"),
      ]);

      if (reqsRes.status === "fulfilled") setRequests(reqsRes.value.data || []);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
    } catch (err: any) {
      toast.error("Error Loading Travel Requests", err.message || "Failed to load business travel requests.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const handleFilterChange = (st: string, query: string) => {
    startTransition(() => {
      setStatusFilter(st);
      setSearchQuery(query);
    });
  };

  useEffect(() => {
    if (!initialLoading) {
      loadData(true);
    }
  }, [statusFilter]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqForReview) return;
    setIsSubmittingReview(true);
    try {
      await apiClient.post(`/travel/requests/${selectedReqForReview.id}/review`, {
        status: reviewAction,
        advance_amount_approved: approvedAdvanceAmount ? parseFloat(approvedAdvanceAmount) : undefined,
        rejection_reason: reviewAction === "rejected" ? rejectionReason : undefined,
        notes: reviewNotes || null,
      });
      toast.success(
        "Requisition Reviewed",
        `Travel request ${selectedReqForReview.request_number} marked as ${reviewAction}.`
      );
      setIsReviewModalOpen(false);
      setSelectedReqForReview(null);
      loadData(true);
    } catch (err: any) {
      toast.error("Review Failed", err.response?.data?.detail || err.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDisburseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqForDisburse || !selectedReqForDisburse.advance_id) return;
    setIsSubmittingDisburse(true);
    try {
      await apiClient.post(`/travel/advances/${selectedReqForDisburse.advance_id}/disburse`, {
        disbursement_method: disburseMethod,
        payment_reference: paymentRef || null,
      });
      toast.success(
        "Advance Disbursed",
        `Travel advance has been disbursed via ${disburseMethod}.`
      );
      setIsDisburseModalOpen(false);
      setSelectedReqForDisburse(null);
      setPaymentRef("");
      loadData(true);
    } catch (err: any) {
      toast.error("Disbursement Failed", err.response?.data?.detail || err.message);
    } finally {
      setIsSubmittingDisburse(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.request_number.toLowerCase().includes(q) ||
      (r.employee_name && r.employee_name.toLowerCase().includes(q)) ||
      r.origin.toLowerCase().includes(q) ||
      r.destination.toLowerCase().includes(q) ||
      r.purpose.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
              <Plane className="w-4 h-4" />
              <span>HR & Payroll Management</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Business Travel Requisitions & Advances
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review employee travel requests, authorize cash/bank advances, and audit pre-trip estimates
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/hr-payroll/expense-claims"
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Expense Settlements
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
              <span className="text-[11px] font-semibold text-amber-600 uppercase">Pending Approvals</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-2">{stats.pending_travel_requests}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Awaiting manager review</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-indigo-600 uppercase">Active Advances</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Banknote className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-indigo-600 mt-2">{stats.active_travel_advances}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Unsettled travel funds</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-600 uppercase">Total Advances Disbursed</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
              BDT {Number(stats.total_advances_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Issued advance balance</div>
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
                onChange={(e) => handleFilterChange(statusFilter, e.target.value)}
                placeholder="Search request #, employee, origin, destination..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value, searchQuery)}
              className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700"
            >
              <option value="all">All Request Statuses</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed & Settled</option>
              <option value="cancelled">Cancelled</option>
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
            <span className="font-semibold text-slate-700">{filteredRequests.length}</span> requests
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
              <p className="text-xs">Loading travel requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400">
              <Plane className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No travel requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full text-left border-collapse transition-opacity duration-150 ${isFetching ? "opacity-75" : "opacity-100"}`}>
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Request # / Type</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Route & Dates</th>
                    <th className="py-3 px-4">Purpose</th>
                    <th className="py-3 px-4">Est. Cost (BDT)</th>
                    <th className="py-3 px-4">Advance Requested</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredRequests.map((req) => {
                    const isPending = req.status === "pending_approval";
                    const isApproved = req.status === "approved";
                    const canDisburse = isApproved && req.advance_required && req.advance_id;
                    return (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-mono font-semibold text-indigo-600">{req.request_number}</div>
                          <div className="text-[10px] uppercase font-semibold text-slate-400">{req.travel_type}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-medium text-slate-900">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{req.employee_name || "—"}</span>
                          </div>
                          {req.employee_code && (
                            <div className="text-[11px] font-mono text-slate-400">{req.employee_code}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-slate-800 font-medium">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{req.origin}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span>{req.destination}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {req.departure_date} to {req.return_date}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{req.purpose}</td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-800">
                          {Number(req.estimated_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4">
                          {req.advance_required ? (
                            <div>
                              <span className="font-mono font-semibold text-slate-900">
                                {Number(req.advance_amount_requested).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                              {req.advance_settlement_status && (
                                <div className="text-[10px] text-indigo-600 uppercase font-semibold">
                                  {req.advance_settlement_status.replace("_", " ")}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No Advance</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              req.status === "approved"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : req.status === "pending_approval"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : req.status === "completed"
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {req.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending && (
                              <button
                                onClick={() => {
                                  setSelectedReqForReview(req);
                                  setReviewAction("approved");
                                  setApprovedAdvanceAmount(String(req.advance_amount_requested || ""));
                                  setIsReviewModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                              >
                                <span>Review</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}

                            {canDisburse && (
                              <button
                                onClick={() => {
                                  setSelectedReqForDisburse(req);
                                  setIsDisburseModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                              >
                                <Banknote className="w-3 h-3" />
                                <span>Disburse</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Review Requisition */}
        {isReviewModalOpen && selectedReqForReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative">
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
                <Plane className="w-4 h-4" />
                <span>Manager Decision</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">Review Travel Requisition</h2>
              <p className="text-xs text-slate-500">
                {selectedReqForReview.request_number} by <strong>{selectedReqForReview.employee_name}</strong>
              </p>

              <form onSubmit={handleReviewSubmit} className="space-y-3.5 mt-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Decision</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setReviewAction("approved")}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        reviewAction === "approved"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Approve Request
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewAction("rejected")}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        reviewAction === "rejected"
                          ? "bg-rose-50 border-rose-500 text-rose-700 shadow-xs"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Reject Request
                    </button>
                  </div>
                </div>

                {reviewAction === "approved" && selectedReqForReview.advance_required && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase">
                      Authorized Advance (BDT)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={approvedAdvanceAmount}
                      onChange={(e) => setApprovedAdvanceAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                    />
                  </div>
                )}

                {reviewAction === "rejected" && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase">Rejection Reason *</label>
                    <textarea
                      required
                      rows={2}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Budget constraints, schedule conflict..."
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Review Notes</label>
                  <textarea
                    rows={2}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Approval notes or policy reminders..."
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
                    {isSubmittingReview ? "Submitting..." : "Confirm Decision"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Disburse Advance */}
        {isDisburseModalOpen && selectedReqForDisburse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative">
              <button
                onClick={() => setIsDisburseModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs tracking-wider uppercase">
                <Banknote className="w-4 h-4" />
                <span>Finance Disbursement</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">Disburse Travel Advance</h2>
              <p className="text-xs text-slate-500">
                Releasing funds to <strong className="text-slate-800">{selectedReqForDisburse.employee_name}</strong> for trip {selectedReqForDisburse.request_number}.
              </p>

              <form onSubmit={handleDisburseSubmit} className="space-y-3.5 mt-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Payment Method</label>
                  <select
                    value={disburseMethod}
                    onChange={(e) => setDisburseMethod(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="bank_transfer">Corporate Bank Transfer (BEFTN/RTGS)</option>
                    <option value="cash">Petty Cash Voucher</option>
                    <option value="cheque">Company Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase">Reference / Cheque #</label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="TXN ID, Cheque No, or Voucher Ref"
                    className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsDisburseModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingDisburse}
                    className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    {isSubmittingDisburse ? "Disbursing..." : "Confirm Disbursement"}
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
