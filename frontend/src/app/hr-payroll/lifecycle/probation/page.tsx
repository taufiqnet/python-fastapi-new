"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { ProbationDeskRow, ProbationReview, LifecycleStats } from "@/types";
import { useToast } from "@/context/toast-context";
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  X,
  ChevronRight,
  FileText,
  Calendar,
  AlertTriangle,
  Award,
} from "lucide-react";

export default function ProbationDeskPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  // Active tab: 'desk' (probation tracker) or 'reviews' (formal evaluation history)
  const [activeTab, setActiveTab] = useState<"desk" | "reviews">("desk");

  const [deskRows, setDeskRows] = useState<ProbationDeskRow[]>([]);
  const [reviews, setReviews] = useState<ProbationReview[]>([]);
  const [stats, setStats] = useState<LifecycleStats>({
    on_probation: 0,
    probation_due_30_days: 0,
    probation_overdue: 0,
    pending_movements: 0,
    open_disciplinary_cases: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");

  // Review Modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedDeskRow, setSelectedDeskRow] = useState<ProbationDeskRow | null>(null);
  const [perfRating, setPerfRating] = useState("4");
  const [conductRating, setConductRating] = useState("4");
  const [punctRating, setPunctRating] = useState("4");
  const [recommendation, setRecommendation] = useState<"confirm" | "extend_probation" | "terminate">("confirm");
  const [extensionMonths, setExtensionMonths] = useState("3");
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Decision Modal
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ProbationReview | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");

  // Letter view
  const [letterData, setLetterData] = useState<any>(null);

  const loadData = async (isBackground = false) => {
    if (isBackground) setIsFetching(true);
    else setInitialLoading(true);

    try {
      const [deskRes, revsRes, statsRes] = await Promise.allSettled([
        apiClient.get<ProbationDeskRow[]>("/lifecycle/probation"),
        apiClient.get<ProbationReview[]>("/lifecycle/probation/reviews"),
        apiClient.get<LifecycleStats>("/lifecycle/overview/stats"),
      ]);

      if (deskRes.status === "fulfilled") setDeskRows(deskRes.value.data || []);
      if (revsRes.status === "fulfilled") setReviews(revsRes.value.data || []);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
    } catch (err: any) {
      toast.error("Error Loading Probation Data", err.message || "Failed to load probation records.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const filteredDesk = deskRows.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.employee_name.toLowerCase().includes(q) ||
      (r.employee_code && r.employee_code.toLowerCase().includes(q)) ||
      (r.department_name && r.department_name.toLowerCase().includes(q))
    );
  });

  const filteredReviews = reviews.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.employee_name && r.employee_name.toLowerCase().includes(q)) ||
      r.review_number.toLowerCase().includes(q)
    );
  });

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeskRow) return;

    setIsSubmitting(true);
    try {
      await apiClient.post("/lifecycle/probation/reviews", {
        employee_id: selectedDeskRow.employee_id,
        performance_rating: parseInt(perfRating),
        conduct_rating: parseInt(conductRating),
        punctuality_rating: parseInt(punctRating),
        recommendation,
        extension_months: recommendation === "extend_probation" ? parseInt(extensionMonths) : null,
        comments: comments || null,
      });

      toast.success("Review Submitted", `Probation review recorded for ${selectedDeskRow.employee_name}.`);
      setIsReviewModalOpen(false);
      setSelectedDeskRow(null);
      loadData(true);
      setActiveTab("reviews");
    } catch (err: any) {
      toast.error("Submission Failed", err.message || "Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecide = async (approve: boolean) => {
    if (!selectedReview) return;
    setIsSubmitting(true);
    try {
      await apiClient.post(`/lifecycle/probation/reviews/${selectedReview.id}/decide`, {
        approve,
        notes: decisionNotes || null,
      });
      toast.success("Decision Recorded", `Review has been ${approve ? "approved" : "rejected"}.`);
      setIsDecisionModalOpen(false);
      setSelectedReview(null);
      setDecisionNotes("");
      loadData(true);
    } catch (err: any) {
      toast.error("Decision Failed", err.message || "Failed to record decision.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFetchLetter = async (reviewId: string) => {
    try {
      const res = await apiClient.get<any>(`/lifecycle/probation/reviews/${reviewId}/letter`);
      setLetterData(res.data);
    } catch (err: any) {
      toast.error("Letter Error", err.message || "Letter not available.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header Breadcrumbs & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Link href="/hr-payroll" className="hover:text-indigo-600">HR & Payroll</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span>Career Lifecycle</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-800 font-semibold">Probation Desk</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">Probation & Confirmation Desk</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Statutory 6-month probation tracking (BLA 2006), evaluations, extensions, and automated confirmation letters.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              className="p-2.5 text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Currently on Probation</p>
              <p className="text-xl font-bold text-slate-900">{stats.on_probation}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Due in 30 Days</p>
              <p className="text-xl font-bold text-slate-900">{stats.probation_due_30_days}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Overdue Confirmations</p>
              <p className="text-xl font-bold text-rose-600">{stats.probation_overdue}</p>
            </div>
          </div>
        </div>

        {/* Tab & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("desk")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "desk"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              Probation Roster ({deskRows.length})
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "reviews"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              Review Decisions ({reviews.length})
            </button>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
            />
          </div>
        </div>

        {/* Data Table with In-Place Non-Destructive Filtering */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden relative">
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-100 overflow-hidden z-10">
              <div className="h-full bg-indigo-600 animate-[indeterminate_1.5s_infinite_linear] origin-left w-1/3" />
            </div>
          )}

          <div className={`overflow-x-auto ${isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}`}>
            {activeTab === "desk" ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Department / Designation</th>
                    <th className="py-3.5 px-4">Start Date</th>
                    <th className="py-3.5 px-4">Probation End Date</th>
                    <th className="py-3.5 px-4">Status / Days</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {initialLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                        Loading probation roster...
                      </td>
                    </tr>
                  ) : filteredDesk.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                        No employees currently on probation.
                      </td>
                    </tr>
                  ) : (
                    filteredDesk.map((row) => (
                      <tr key={row.employee_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{row.employee_name}</p>
                          <p className="text-[11px] font-mono text-slate-400">{row.employee_code || "—"}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-slate-800 font-medium">{row.job_title_name || "—"}</p>
                          <p className="text-[11px] text-slate-500">{row.department_name || "—"}</p>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">{row.start_date || "—"}</td>
                        <td className="py-3.5 px-4 font-mono text-[11px] font-semibold text-slate-800">
                          {row.probation_end_date || "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          {row.is_overdue ? (
                            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-700">
                              Overdue ({Math.abs(row.days_remaining || 0)}d ago)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                              {row.days_remaining} days remaining
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedDeskRow(row);
                              setIsReviewModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Evaluate</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Review #</th>
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Review Date</th>
                    <th className="py-3.5 px-4 text-center">Ratings (P/C/P)</th>
                    <th className="py-3.5 px-4">Recommendation</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {initialLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        Loading reviews...
                      </td>
                    </tr>
                  ) : filteredReviews.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        No probation review records found.
                      </td>
                    </tr>
                  ) : (
                    filteredReviews.map((rev) => (
                      <tr key={rev.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{rev.review_number}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{rev.employee_name || "—"}</td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">{rev.review_date}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-700">
                          {rev.performance_rating} / {rev.conduct_rating} / {rev.punctuality_rating}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="capitalize font-semibold text-slate-900">
                            {rev.recommendation.replace("_", " ")}
                          </span>
                          {rev.extension_months && (
                            <span className="text-[11px] text-slate-500 ml-1">({rev.extension_months} mo)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {rev.status === "approved" ? (
                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">Approved</span>
                          ) : rev.status === "rejected" ? (
                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-700">Rejected</span>
                          ) : (
                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">Submitted</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5">
                          {rev.status === "submitted" && (
                            <button
                              onClick={() => {
                                setSelectedReview(rev);
                                setIsDecisionModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                            >
                              Decide
                            </button>
                          )}
                          {rev.status === "approved" && (
                            <button
                              onClick={() => handleFetchLetter(rev.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Letter</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal: Submit Evaluation */}
        {isReviewModalOpen && selectedDeskRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Probation Review & Appraisal</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Evaluate {selectedDeskRow.employee_name}</p>
                </div>
                <button
                  onClick={() => setIsReviewModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitReview} className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Performance (1-5)</label>
                    <select
                      value={perfRating}
                      onChange={(e) => setPerfRating(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>{n} - {n >= 4 ? "Good" : n === 3 ? "Meets" : "Poor"}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Conduct (1-5)</label>
                    <select
                      value={conductRating}
                      onChange={(e) => setConductRating(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Punctuality (1-5)</label>
                    <select
                      value={punctRating}
                      onChange={(e) => setPunctRating(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Recommendation *</label>
                  <select
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value as any)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                  >
                    <option value="confirm">Confirm as Permanent Employee</option>
                    <option value="extend_probation">Extend Probation Period</option>
                    <option value="terminate">Discontinue / Terminate during Probation</option>
                  </select>
                </div>

                {recommendation === "extend_probation" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Extension Duration (Months) *</label>
                    <select
                      value={extensionMonths}
                      onChange={(e) => setExtensionMonths(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                    >
                      <option value="1">1 Month Extension</option>
                      <option value="2">2 Months Extension</option>
                      <option value="3">3 Months Extension (Statutory Max under BLA)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supervisor Remarks / Justification</label>
                  <textarea
                    rows={3}
                    placeholder="Provide performance justification..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Review"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Admin Decision */}
        {isDecisionModalOpen && selectedReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Authorize Probation Review</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedReview.review_number} ({selectedReview.recommendation})</p>
                </div>
                <button
                  onClick={() => setIsDecisionModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-600">
                  Approving this review will immediately apply the recommendation (updating confirmation date or extending probation) on the employee master record.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Decision Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Approval comments..."
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleDecide(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl"
                  >
                    Reject Review
                  </button>
                  <button
                    onClick={() => handleDecide(true)}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                  >
                    {isSubmitting ? "Processing..." : "Approve & Apply"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Letter Viewer */}
        {letterData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{letterData.title}</h3>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">Ref: {letterData.reference_no}</p>
                </div>
                <button
                  onClick={() => setLetterData(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="flex justify-between border-b pb-2 text-slate-500">
                  <span>Date: {letterData.date}</span>
                  <span>To: {letterData.employee}</span>
                </div>
                <p className="leading-relaxed text-slate-800 whitespace-pre-wrap">{letterData.body}</p>
                <div className="pt-8 border-t text-slate-500 text-[11px] flex justify-between">
                  <span>HR Department, ProERP Enterprise</span>
                  <span>Authorized Signature</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
