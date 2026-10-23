"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { CareerMovement, DisciplinaryCase, EmployeeOut } from "@/types";
import { useToast } from "@/context/toast-context";
import {
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  RefreshCw,
  FileText,
  Briefcase,
  Building,
  DollarSign,
  ShieldAlert,
  Send,
  AlertCircle,
} from "lucide-react";

export default function PortalCareerPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<EmployeeOut | null>(null);
  const [movements, setMovements] = useState<CareerMovement[]>([]);
  const [disciplinaryCases, setDisciplinaryCases] = useState<DisciplinaryCase[]>([]);

  // Explanation submission state
  const [selectedCase, setSelectedCase] = useState<DisciplinaryCase | null>(null);
  const [explanationText, setExplanationText] = useState("");
  const [isSubmittingExplanation, setIsSubmittingExplanation] = useState(false);

  // Letter Viewer State
  const [letterData, setLetterData] = useState<any>(null);

  const loadCareerData = async () => {
    setLoading(true);
    try {
      const [profRes, movRes] = await Promise.allSettled([
        apiClient.get<EmployeeOut>("/employees/me"),
        apiClient.get<CareerMovement[]>("/lifecycle/movements"),
      ]);

      if (profRes.status === "fulfilled") {
        setProfile(profRes.value.data);
      }
      if (movRes.status === "fulfilled") {
        setMovements(movRes.value.data || []);
      }
    } catch (err: any) {
      toast.error("Error", "Failed to load career records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCareerData();
  }, []);

  const handleFetchMovementLetter = async (movementId: string) => {
    try {
      const res = await apiClient.get<any>(`/lifecycle/movements/${movementId}/letter`);
      setLetterData(res.data);
    } catch (err: any) {
      toast.error("Error", "Letter not generated yet.");
    }
  };

  const handleSubmitExplanation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    setIsSubmittingExplanation(true);
    try {
      await apiClient.post(`/lifecycle/disciplinary/cases/${selectedCase.id}/explanation`, {
        employee_explanation: explanationText,
      });
      toast.success("Explanation Submitted", "Your explanation has been recorded.");
      setSelectedCase(null);
      setExplanationText("");
      loadCareerData();
    } catch (err: any) {
      toast.error("Submission Error", err.message || "Failed to submit explanation.");
    } finally {
      setIsSubmittingExplanation(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Career Progression & Conduct</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Employment standing, tenure timeline, promotion milestones, and official notices.
          </p>
        </div>
        <button
          onClick={loadCareerData}
          className="p-2 text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Probation / Confirmation Status Banner */}
      {profile && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold ${
                profile.confirmation_date
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              {profile.confirmation_date ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Employment Standing</p>
              <h4 className="text-sm font-bold text-slate-900">
                {profile.confirmation_date
                  ? `Confirmed Permanent Employee (since ${profile.confirmation_date})`
                  : `Probationary Period (Due: ${profile.probation_end_date || "N/A"})`}
              </h4>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Joined: {profile.start_date || "—"}
          </div>
        </div>
      )}

      {/* Career Progression Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Career Timeline & Order History</h3>
            <p className="text-xs text-slate-500 mt-0.5">Promotions, transfers, and salary increment records</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700">
            {movements.length} Records
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {loading ? (
            <div className="p-8 text-center text-slate-400 font-medium">Loading career timeline...</div>
          ) : movements.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-medium">No career movement records found.</div>
          ) : (
            movements.map((mov) => (
              <div key={mov.id} className="p-4 hover:bg-slate-50/60 transition-colors flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    {mov.action_type.includes("promotion") ? (
                      <Briefcase className="w-4 h-4" />
                    ) : mov.action_type === "transfer" ? (
                      <Building className="w-4 h-4" />
                    ) : (
                      <DollarSign className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 capitalize">
                        {mov.action_type.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">({mov.movement_number})</span>
                    </div>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Effective: <span className="font-mono font-semibold">{mov.effective_date}</span> • Reason:{" "}
                      <span className="capitalize">{mov.reason_category.replace(/_/g, " ")}</span>
                    </p>
                    {mov.new_job_title_name && (
                      <p className="text-indigo-600 font-medium text-[11px] mt-0.5">
                        Designation: {mov.new_job_title_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full capitalize ${
                      mov.status === "applied"
                        ? "bg-emerald-100 text-emerald-800"
                        : mov.status === "rejected"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {mov.status.replace(/_/g, " ")}
                  </span>
                  {mov.status === "applied" && (
                    <button
                      onClick={() => handleFetchMovementLetter(mov.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Letter</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex justify-between border-b pb-2 text-slate-500">
                <span>Date: {letterData.date}</span>
                <span>To: {letterData.employee}</span>
              </div>
              <p className="leading-relaxed text-slate-800 whitespace-pre-wrap">{letterData.body}</p>
              <div className="pt-8 border-t text-slate-500 text-[11px] flex justify-between">
                <span>Corporate Human Resources</span>
                <span>Authorized Signatory</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
