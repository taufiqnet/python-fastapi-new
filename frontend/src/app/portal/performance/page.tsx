"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { EmployeeGoal, PerformanceAppraisal } from "@/types";
import { useToast } from "@/context/toast-context";
import {
  Target,
  Award,
  Clock,
  CheckCircle2,
  RefreshCw,
  Send,
  Star,
  FileCheck,
  Percent,
} from "lucide-react";

export default function PortalPerformancePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<EmployeeGoal[]>([]);
  const [appraisals, setAppraisals] = useState<PerformanceAppraisal[]>([]);

  // Self-Review Form State
  const [selectedAppraisal, setSelectedAppraisal] = useState<PerformanceAppraisal | null>(null);
  const [selfScore, setSelfScore] = useState("4.0");
  const [selfComments, setSelfComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPortalData = async () => {
    setLoading(true);
    try {
      const [goalsRes, appRes] = await Promise.allSettled([
        apiClient.get<EmployeeGoal[]>("/performance/portal/my-goals"),
        apiClient.get<PerformanceAppraisal[]>("/performance/portal/my-appraisals"),
      ]);

      if (goalsRes.status === "fulfilled") setGoals(goalsRes.value.data || []);
      if (appRes.status === "fulfilled") setAppraisals(appRes.value.data || []);
    } catch (err: any) {
      toast.error("Error", "Failed to load performance profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, []);

  const handleSelfReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppraisal) return;
    setIsSubmitting(true);
    try {
      await apiClient.post(`/performance/appraisals/${selectedAppraisal.id}/self-review`, {
        self_overall_score: parseFloat(selfScore) || 3.0,
        self_evaluation_text: selfComments,
      });
      toast.success("Self-Review Submitted", "Your self-appraisal has been forwarded to your direct manager.");
      setSelectedAppraisal(null);
      setSelfComments("");
      loadPortalData();
    } catch (err: any) {
      toast.error("Submission Failed", err.message || "Failed to submit self-review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcknowledge = async (appraisalId: string) => {
    try {
      await apiClient.post(`/performance/appraisals/${appraisalId}/acknowledge`);
      toast.success("Acknowledged", "You have formally acknowledged your performance appraisal.");
      loadPortalData();
    } catch (err: any) {
      toast.error("Error", err.message || "Failed to acknowledge appraisal.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">My Performance & Goals</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track your corporate KPIs, self-evaluation dossiers, and finalized appraisal ratings.
          </p>
        </div>
        <button
          onClick={loadPortalData}
          className="p-2 text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Appraisals Status Banner */}
      {appraisals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Evaluation Dossiers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appraisals.map((app) => (
              <div key={app.id} className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">
                      {app.cycle_title || "Appraisal Cycle"}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                      Stage: {app.status.replace(/_/g, " ").toUpperCase()}
                    </h4>
                  </div>
                  {app.final_rating_label && (
                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700">
                      {app.final_rating_label}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-50 p-2.5 rounded-xl">
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">Self Score</p>
                    <p className="font-bold text-slate-800">{app.self_overall_score ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">Manager Score</p>
                    <p className="font-bold text-slate-800">{app.manager_overall_score ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">Calibrated</p>
                    <p className="font-bold text-indigo-700">{app.calibrated_score ?? "—"}</p>
                  </div>
                </div>

                {app.status === "self_review_pending" && (
                  <button
                    onClick={() => setSelectedAppraisal(app)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors"
                  >
                    <Star className="w-3.5 h-3.5" />
                    <span>Submit Self-Review</span>
                  </button>
                )}

                {app.status === "acknowledgement_pending" && (
                  <button
                    onClick={() => handleAcknowledge(app.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Acknowledge Final Rating</span>
                  </button>
                )}

                {app.status === "completed" && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold justify-center py-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Evaluation Completed & Acknowledged</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assigned Goals / KPIs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Assigned KPIs & Objectives</h3>
            <p className="text-xs text-slate-500 mt-0.5">Corporate goals and performance deliverables</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700">
            {goals.length} Goals
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {loading ? (
            <div className="p-8 text-center text-slate-400 font-medium">Loading goals...</div>
          ) : goals.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-medium">No goals assigned for this cycle.</div>
          ) : (
            goals.map((goal) => {
              const ach = goal.achievement_pct || 0;
              return (
                <div key={goal.id} className="p-4 hover:bg-slate-50/60 transition-colors space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {goal.category} • Weight: {goal.weightage}%
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-0.5">{goal.title}</h4>
                      {goal.description && <p className="text-slate-500 text-xs mt-1">{goal.description}</p>}
                    </div>
                    <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700 capitalize">
                      {goal.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 pt-1">
                    <div className="flex-1">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                        <span>Progress: {goal.achieved_value} / {goal.target_value} ({goal.metric_type})</span>
                        <span>{Math.round(ach)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            ach >= 100 ? "bg-emerald-500" : ach >= 60 ? "bg-indigo-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${Math.min(ach, 100)}%` }}
                        />
                      </div>
                    </div>
                    {goal.due_date && (
                      <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                        Due: {goal.due_date}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: Self-Review Form */}
      {selectedAppraisal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Submit Self-Appraisal</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedAppraisal.cycle_title}</p>
              </div>
              <button
                onClick={() => setSelectedAppraisal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSelfReview} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Overall Self-Rating (1.00 - 5.00) *
                </label>
                <select
                  value={selfScore}
                  onChange={(e) => setSelfScore(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                >
                  <option value="5.0">5.00 - Outstanding (Far exceeds expectations)</option>
                  <option value="4.5">4.50 - Exceeds Expectations consistently</option>
                  <option value="4.0">4.00 - Strongly Meets Expectations</option>
                  <option value="3.5">3.50 - Meets Expectations</option>
                  <option value="3.0">3.00 - Satisfactory</option>
                  <option value="2.0">2.00 - Needs Improvement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Self-Evaluation Statement & Key Achievements *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail your major accomplishments, KPI results, project milestones, and areas of growth..."
                  value={selfComments}
                  onChange={(e) => setSelfComments(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAppraisal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  {isSubmitting ? "Submitting..." : "Send to Manager"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
