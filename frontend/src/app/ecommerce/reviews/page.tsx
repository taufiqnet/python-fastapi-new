"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import {
  Star,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Send,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { formatDate } from "@/lib/utils";
import { ReviewOut } from "@/types";

export default function ReviewsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  // Primary Data State
  const [reviews, setReviews] = useState<ReviewOut[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Reply Modal
  const [selectedReview, setSelectedReview] = useState<ReviewOut | null>(null);
  const [replyText, setReplyText] = useState<string>("");
  const [isReplying, setIsReplying] = useState<boolean>(false);

  // Fetch Reviews with in-place transition
  const fetchReviews = useCallback(
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

        if (ratingFilter !== "all") {
          params.rating = Number(ratingFilter);
        }

        const res = await apiClient.get<ReviewOut[]>("/reviews", { params });
        let data = res.data || [];

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          data = data.filter(
            (r) =>
              r.customer_name?.toLowerCase().includes(q) ||
              r.product_title?.toLowerCase().includes(q) ||
              r.content?.toLowerCase().includes(q) ||
              r.title?.toLowerCase().includes(q)
          );
        }

        setReviews(data);
      } catch (err) {
        console.error("Failed to load reviews", err);
        toast.error("Data Load Error", "Failed to retrieve product reviews.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [user?.business_id, statusFilter, ratingFilter, searchQuery, toast]
  );

  useEffect(() => {
    fetchReviews(reviews.length > 0);
  }, [statusFilter, ratingFilter, searchQuery]);

  // Handle Search Input with startTransition
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    startTransition(() => {
      setSearchQuery(val);
      setCurrentPage(1);
    });
  };

  // Moderate Actions (Approve / Reject)
  const handleApprove = async (id: string) => {
    try {
      await apiClient.put(`/reviews/${id}/approve`);
      toast.success("Review Approved", "Review published to catalog showcase.");
      fetchReviews(true);
    } catch (err) {
      toast.error("Error", "Failed to approve review.");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiClient.put(`/reviews/${id}/reject`);
      toast.success("Review Rejected", "Review has been hidden from storefront.");
      fetchReviews(true);
    } catch (err) {
      toast.error("Error", "Failed to reject review.");
    }
  };

  // Reply Submit
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview || !replyText.trim()) return;

    setIsReplying(true);
    try {
      await apiClient.post(`/reviews/${selectedReview.id}/reply`, {
        reply_content: replyText.trim(),
      });
      toast.success("Reply Posted", "Response submitted to customer review.");
      setSelectedReview(null);
      setReplyText("");
      fetchReviews(true);
    } catch (err) {
      toast.error("Error", "Failed to post seller reply.");
    } finally {
      setIsReplying(false);
    }
  };

  const pendingCount = reviews.filter((r) => r.status === "pending").length;
  const approvedCount = reviews.filter((r) => r.status === "approved").length;
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1)
      : "5.0";

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Customer Ratings & Reviews Moderation
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Verify customer feedback, moderate ratings, and post merchant responses.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchReviews(true)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-xl shadow-xs transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Average Rating</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{avgRating} / 5.0</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Moderation</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{pendingCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Published Reviews</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{approvedCount}</p>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Top-rim indeterminate line */}
          <div className="h-1 w-full bg-slate-100 overflow-hidden relative">
            {isFetching && (
              <div className="h-full bg-linear-to-r from-indigo-500 to-amber-500 animate-pulse w-full" />
            )}
          </div>

          {/* Filters Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {["all", "pending", "approved", "rejected"].map((st) => (
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
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={ratingFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  startTransition(() => {
                    setRatingFilter(val);
                    setCurrentPage(1);
                  });
                }}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
              >
                <option value="all">All Stars</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>

              <div className="relative w-full md:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search reviews or customers..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-1.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50"
                />
              </div>
            </div>
          </div>

          {/* Table Container - Never unmounted */}
          <div className="overflow-x-auto min-h-[250px] relative">
            {initialLoading ? (
              <div className="p-8 text-center text-slate-400">Loading reviews...</div>
            ) : reviews.length === 0 ? (
              <div className="p-12 text-center">
                <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800">No reviews found</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Customer feedback submitted on product showcase cards will appear here.
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
                    <th className="py-3.5 px-4">Product & Review</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4 text-center">Rating</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-center">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {reviews.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="font-semibold text-slate-900">
                          {r.product_title || "General Product"}
                        </div>
                        {r.title && <div className="text-xs font-bold text-slate-700 mt-0.5">{r.title}</div>}
                        <p className="text-xs text-slate-600 line-clamp-2 mt-1">{r.content}</p>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{r.customer_name}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1 text-amber-500 font-semibold text-xs">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {r.rating}.0
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {r.status === "approved" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Approved
                          </span>
                        ) : r.status === "rejected" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">{formatDate(r.created_at)}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {r.status !== "approved" && (
                            <button
                              onClick={() => handleApprove(r.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Approve Review"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {r.status !== "rejected" && (
                            <button
                              onClick={() => handleReject(r.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Reject Review"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedReview(r)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Reply as Merchant"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
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
              Showing <span className="font-semibold text-slate-700">{reviews.length}</span> reviews
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
                disabled={reviews.length < pageSize || isFetching}
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

      {/* Reply Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <MessageSquare className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Merchant Reply</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Customer: {selectedReview.customer_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 italic">
                "{selectedReview.content}"
              </div>

              <form onSubmit={handleSendReply} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Your Response *
                  </label>
                  <textarea
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Thank the customer or explain resolution..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedReview(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isReplying}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isReplying ? "Posting..." : "Post Reply"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
