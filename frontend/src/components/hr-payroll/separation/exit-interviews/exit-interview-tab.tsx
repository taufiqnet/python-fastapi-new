"use client";

import React, { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RefreshCw,
  Plus,
  Star,
  Eye,
  X,
  MessageSquare,
  ThumbsUp,
  User,
  HeartHandshake,
  TrendingUp,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { ExitInterview, EmployeeSeparation, EmployeeOut } from "@/types";

interface ExitInterviewTabProps {
  currentBusinessId: number;
}

export function ExitInterviewTab({ currentBusinessId }: ExitInterviewTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Data states
  const [interviews, setInterviews] = useState<ExitInterview[]>([]);
  const [separations, setSeparations] = useState<EmployeeSeparation[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [selectedInterview, setSelectedInterview] = useState<ExitInterview | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState({
    separation_id: "",
    interview_date: new Date().toISOString().split("T")[0],
    primary_reason_for_leaving: "Better career growth opportunity",
    rating_culture: 4,
    rating_management: 4,
    rating_growth_opportunities: 3,
    rating_compensation: 3,
    rating_work_life_balance: 4,
    would_recommend: "yes",
    proudest_accomplishment: "",
    improvement_suggestions: "",
    confidential_hr_notes: "",
  });

  // Fetch interviews
  const fetchInterviews = useCallback(
    async (isBackground = false) => {
      if (isBackground) setIsFetching(true);
      else setInitialLoading(true);

      try {
        const res = await apiClient.get<ExitInterview[]>("/separation/exit-interviews", {
          params: { business_id: currentBusinessId },
        });
        setInterviews(res.data || []);
      } catch (err: any) {
        toast.error("Failed to load interviews", err.response?.data?.detail || "Could not retrieve exit interviews.");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [currentBusinessId, toast]
  );

  // Fetch separations for dropdown
  const fetchSeparations = useCallback(async () => {
    try {
      const res = await apiClient.get<EmployeeSeparation[]>("/separation/separations", {
        params: { business_id: currentBusinessId, limit: 100 },
      });
      setSeparations(res.data || []);
    } catch {
      // ignore
    }
  }, [currentBusinessId]);

  useEffect(() => {
    fetchInterviews();
    fetchSeparations();
  }, [fetchInterviews, fetchSeparations]);

  // Handle Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.separation_id) {
      toast.error("Validation Error", "Please select an active separation record.");
      return;
    }

    const sep = separations.find((s) => s.id === formData.separation_id);
    if (!sep) return;

    setIsSubmitting(true);
    try {
      await apiClient.post(
        "/separation/exit-interviews",
        {
          ...formData,
          employee_id: sep.employee_id,
        },
        { params: { business_id: currentBusinessId } }
      );
      toast.success(
        "Exit Interview Recorded",
        "Exit interview feedback and ratings have been saved."
      );
      setIsCreateOpen(false);
      fetchInterviews(true);
    } catch (err: any) {
      toast.error(
        "Submission Failed",
        err.response?.data?.detail || "Failed to record exit interview."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered interviews
  const filteredInterviews = useMemo(() => {
    return interviews.filter((item) => {
      const empName = `${item.employee?.first_name || ""} ${item.employee?.last_name || ""}`.toLowerCase();
      const empCode = (item.employee?.employee_id || "").toLowerCase();
      const reason = item.primary_reason_for_leaving.toLowerCase();
      const query = searchQuery.toLowerCase();

      return empName.includes(query) || empCode.includes(query) || reason.includes(query);
    });
  }, [interviews, searchQuery]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = interviews.length;
    if (total === 0) return { total: 0, avgCulture: 0, avgMgmt: 0, recommendPct: 0 };

    const sumCulture = interviews.reduce((acc, i) => acc + i.rating_culture, 0);
    const sumMgmt = interviews.reduce((acc, i) => acc + i.rating_management, 0);
    const recommendCount = interviews.filter((i) => i.would_recommend === "yes").length;

    return {
      total,
      avgCulture: (sumCulture / total).toFixed(1),
      avgMgmt: (sumMgmt / total).toFixed(1),
      recommendPct: Math.round((recommendCount / total) * 100),
    };
  }, [interviews]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
            }`}
          />
        ))}
        <span className="text-xs font-semibold ml-1">{rating}/5</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Interviews Conducted</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Culture Rating</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{stats.avgCulture} / 5</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
            <HeartHandshake className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Management Rating</p>
            <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{stats.avgMgmt} / 5</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Advocate %</p>
            <p className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">{stats.recommendPct}%</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
            <ThumbsUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Header */}
      <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search employee or feedback reason..."
            value={searchQuery}
            onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchInterviews(true)}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg border hover:bg-muted transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Record Exit Interview
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden relative">
        {isFetching && (
          <div className="h-0.5 bg-primary/20 overflow-hidden relative">
            <div className="h-full bg-primary animate-pulse w-full" />
          </div>
        )}

        <div className={`overflow-x-auto transition-opacity duration-150 ${isFetching ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Interview Date</th>
                <th className="px-4 py-3">Primary Departure Driver</th>
                <th className="px-4 py-3">Culture</th>
                <th className="px-4 py-3">Management</th>
                <th className="px-4 py-3">Would Recommend</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {initialLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading exit interviews...
                  </td>
                </tr>
              ) : filteredInterviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No exit interviews recorded yet.
                  </td>
                </tr>
              ) : (
                filteredInterviews.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/40 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {item.employee?.first_name} {item.employee?.last_name || ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.employee?.employee_id} • {item.employee?.department || "General"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                      {item.interview_date}
                    </td>
                    <td className="px-4 py-3 text-foreground font-medium text-xs max-w-[250px] truncate">
                      {item.primary_reason_for_leaving}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {renderStars(item.rating_culture)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {renderStars(item.rating_management)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.would_recommend === "yes" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Yes
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedInterview(item);
                          setIsDetailsOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Exit Interview Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl w-full max-w-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-foreground">Record Exit Interview</h3>
                <p className="text-xs text-muted-foreground">Capture qualitative and organizational feedback</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Separation Case *
                </label>
                <select
                  required
                  value={formData.separation_id}
                  onChange={(e) => setFormData({ ...formData, separation_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select Separation Case</option>
                  {separations.map((sep) => (
                    <option key={sep.id} value={sep.id}>
                      {sep.separation_number} - {sep.employee?.first_name} {sep.employee?.last_name || ""} (
                      {sep.employee?.employee_id}) - {sep.separation_type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Interview Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.interview_date}
                    onChange={(e) => setFormData({ ...formData, interview_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Would Recommend Organization?
                  </label>
                  <select
                    value={formData.would_recommend}
                    onChange={(e) => setFormData({ ...formData, would_recommend: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="yes">Yes - Definitely</option>
                    <option value="neutral">Neutral / Maybe</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Primary Reason for Leaving *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Higher compensation, relocation, career change..."
                  value={formData.primary_reason_for_leaving}
                  onChange={(e) => setFormData({ ...formData, primary_reason_for_leaving: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Ratings */}
              <div className="bg-muted/30 p-4 rounded-xl border space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Experience Ratings (1 = Poor, 5 = Excellent)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-muted-foreground mb-1">Company Culture: {formData.rating_culture}/5</label>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={formData.rating_culture}
                      onChange={(e) => setFormData({ ...formData, rating_culture: parseInt(e.target.value) })}
                      className="w-full accent-primary cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-muted-foreground mb-1">Management Support: {formData.rating_management}/5</label>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={formData.rating_management}
                      onChange={(e) => setFormData({ ...formData, rating_management: parseInt(e.target.value) })}
                      className="w-full accent-primary cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-muted-foreground mb-1">Career Growth: {formData.rating_growth_opportunities}/5</label>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={formData.rating_growth_opportunities}
                      onChange={(e) => setFormData({ ...formData, rating_growth_opportunities: parseInt(e.target.value) })}
                      className="w-full accent-primary cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-muted-foreground mb-1">Compensation: {formData.rating_compensation}/5</label>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={formData.rating_compensation}
                      onChange={(e) => setFormData({ ...formData, rating_compensation: parseInt(e.target.value) })}
                      className="w-full accent-primary cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Improvement Suggestions for the Company
                </label>
                <textarea
                  rows={2}
                  placeholder="What could we have done better? What changes would have retained you?"
                  value={formData.improvement_suggestions}
                  onChange={(e) => setFormData({ ...formData, improvement_suggestions: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Confidential HR Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Internal observations, rehire eligibility notes..."
                  value={formData.confidential_hr_notes}
                  onChange={(e) => setFormData({ ...formData, confidential_hr_notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-muted-foreground hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition"
                >
                  {isSubmitting ? "Saving..." : "Save Interview"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Interview Details Modal */}
      {isDetailsOpen && selectedInterview && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-foreground">Exit Interview Findings</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedInterview.employee?.first_name} {selectedInterview.employee?.last_name || ""} (
                  {selectedInterview.employee?.employee_id})
                </p>
              </div>
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="bg-muted/30 p-3.5 rounded-xl border space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interview Date:</span>
                  <span className="font-medium text-foreground">{selectedInterview.interview_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Primary Reason:</span>
                  <span className="font-semibold text-foreground">{selectedInterview.primary_reason_for_leaving}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Advocate (Recommend):</span>
                  <span className="font-semibold capitalize text-emerald-600">{selectedInterview.would_recommend}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold uppercase tracking-wider text-muted-foreground">Ratings Breakdown</h4>
                <div className="grid grid-cols-2 gap-2 bg-muted/20 p-3 rounded-lg border">
                  <div>Culture: {renderStars(selectedInterview.rating_culture)}</div>
                  <div>Management: {renderStars(selectedInterview.rating_management)}</div>
                  <div>Growth: {renderStars(selectedInterview.rating_growth_opportunities)}</div>
                  <div>Compensation: {renderStars(selectedInterview.rating_compensation)}</div>
                </div>
              </div>

              {selectedInterview.improvement_suggestions && (
                <div className="space-y-1">
                  <h4 className="font-semibold uppercase tracking-wider text-muted-foreground">Improvement Suggestions</h4>
                  <p className="p-3 bg-muted/20 rounded-lg border text-foreground italic">
                    "{selectedInterview.improvement_suggestions}"
                  </p>
                </div>
              )}

              {selectedInterview.confidential_hr_notes && (
                <div className="space-y-1">
                  <h4 className="font-semibold uppercase tracking-wider text-muted-foreground">Confidential HR Notes</h4>
                  <p className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 rounded-lg border border-rose-200 dark:border-rose-900/30">
                    {selectedInterview.confidential_hr_notes}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t bg-muted/20 flex justify-end">
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="px-4 py-1.5 border rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
