"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { DisciplinaryCase, EmployeeOut, LifecycleStats } from "@/types";
import { useToast } from "@/context/toast-context";
import {
  ShieldAlert,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
  ChevronRight,
  FileText,
  AlertTriangle,
  Scale,
  Send,
  Gavel,
} from "lucide-react";

export default function DisciplinaryPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const [cases, setCases] = useState<DisciplinaryCase[]>([]);
  const [employees, setEmployees] = useState<EmployeeOut[]>([]);
  const [stats, setStats] = useState<LifecycleStats>({
    on_probation: 0,
    probation_due_30_days: 0,
    probation_overdue: 0,
    pending_movements: 0,
    open_disciplinary_cases: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");

  // Create Case Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formIncidentDate, setFormIncidentDate] = useState("");
  const [formAllegationTitle, setFormAllegationTitle] = useState("");
  const [formAllegationDetails, setFormAllegationDetails] = useState("");
  const [formCategory, setFormCategory] = useState("misconduct");
  const [formClause, setFormClause] = useState("BLA Section 23/24");
  const [formSeverity, setFormSeverity] = useState("major");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Show-Cause Modal
  const [isShowCauseModalOpen, setIsShowCauseModalOpen] = useState(false);
  const [selectedCaseForNotice, setSelectedCaseForNotice] = useState<DisciplinaryCase | null>(null);
  const [scIssueDate, setScIssueDate] = useState("");
  const [scDeadline, setScDeadline] = useState("");
  const [scContent, setScContent] = useState("");

  // Record Explanation Modal
  const [isExplanationModalOpen, setIsExplanationModalOpen] = useState(false);
  const [selectedCaseForExplanation, setSelectedCaseForExplanation] = useState<DisciplinaryCase | null>(null);
  const [explanationText, setExplanationText] = useState("");
  const [explanationAccepted, setExplanationAccepted] = useState(false);

  // Issue Sanction Modal
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedCaseForAction, setSelectedCaseForAction] = useState<DisciplinaryCase | null>(null);
  const [sanctionType, setSanctionType] = useState("written_warning");
  const [suspensionDays, setSuspensionDays] = useState("7");
  const [subsistencePct, setSubsistencePct] = useState("50");
  const [actionRemarks, setActionRemarks] = useState("");

  // Letter Modal
  const [letterData, setLetterData] = useState<any>(null);

  const loadData = async (isBackground = false) => {
    if (isBackground) setIsFetching(true);
    else setInitialLoading(true);

    try {
      const [casesRes, empsRes, statsRes] = await Promise.allSettled([
        apiClient.get<DisciplinaryCase[]>("/lifecycle/disciplinary/cases"),
        apiClient.get<EmployeeOut[]>("/employees"),
        apiClient.get<LifecycleStats>("/lifecycle/overview/stats"),
      ]);

      if (casesRes.status === "fulfilled") setCases(casesRes.value.data || []);
      if (empsRes.status === "fulfilled") setEmployees(empsRes.value.data || []);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
    } catch (err: any) {
      toast.error("Error Loading Cases", err.message || "Failed to load disciplinary cases.");
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
      setSelectedStage(st);
      setSearchQuery(query);
    });
  };

  const filteredCases = cases.filter((c) => {
    const matchesStage = selectedStage === "all" || c.current_stage === selectedStage;
    const matchesSearch =
      !searchQuery ||
      c.allegation_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.employee_name && c.employee_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStage && matchesSearch;
  });

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmployeeId || !formIncidentDate || !formAllegationTitle) {
      toast.error("Validation Error", "Employee, incident date, and allegation title are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/lifecycle/disciplinary/cases", {
        employee_id: formEmployeeId,
        incident_date: formIncidentDate,
        allegation_title: formAllegationTitle,
        allegation_details: formAllegationDetails || null,
        allegation_category: formCategory,
        statutory_clause: formClause || null,
        severity_level: formSeverity,
      });

      toast.success("Case Registered", "Disciplinary case logged in compliance with BLA 2006.");
      setIsAddModalOpen(false);
      setFormEmployeeId("");
      setFormAllegationTitle("");
      setFormAllegationDetails("");
      loadData(true);
    } catch (err: any) {
      toast.error("Registration Failed", err.message || "Failed to register case.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIssueShowCause = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseForNotice) return;
    setIsSubmitting(true);
    try {
      await apiClient.post(`/lifecycle/disciplinary/cases/${selectedCaseForNotice.id}/show-cause`, {
        issue_date: scIssueDate || new Date().toISOString().split("T")[0],
        response_deadline: scDeadline || null,
        notice_content: scContent || null,
      });
      toast.success("Notice Issued", "Show-cause notice served to employee.");
      setIsShowCauseModalOpen(false);
      setSelectedCaseForNotice(null);
      loadData(true);
    } catch (err: any) {
      toast.error("Notice Error", err.message || "Failed to issue show-cause notice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordExplanation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseForExplanation) return;
    setIsSubmitting(true);
    try {
      await apiClient.post(`/lifecycle/disciplinary/cases/${selectedCaseForExplanation.id}/explanation`, {
        employee_explanation: explanationText,
        explanation_accepted: explanationAccepted,
      });
      toast.success("Explanation Logged", "Employee's statement recorded in natural justice dossier.");
      setIsExplanationModalOpen(false);
      setSelectedCaseForExplanation(null);
      setExplanationText("");
      loadData(true);
    } catch (err: any) {
      toast.error("Error", err.message || "Failed to record explanation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIssueAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseForAction) return;
    setIsSubmitting(true);
    try {
      await apiClient.post(`/lifecycle/disciplinary/cases/${selectedCaseForAction.id}/action`, {
        sanction_type: sanctionType,
        suspension_days: sanctionType === "suspension" ? parseInt(suspensionDays) : null,
        subsistence_allowance_pct: sanctionType === "suspension" ? parseFloat(subsistencePct) : null,
        remarks: actionRemarks || null,
      });
      toast.success("Action Executed", "Disciplinary sanction finalized; case is now closed.");
      setIsActionModalOpen(false);
      setSelectedCaseForAction(null);
      loadData(true);
    } catch (err: any) {
      toast.error("Action Failed", err.message || "Failed to issue disciplinary sanction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFetchLetter = async (caseId: string) => {
    try {
      const res = await apiClient.get<any>(`/lifecycle/disciplinary/cases/${caseId}/letter`);
      setLetterData(res.data);
    } catch (err: any) {
      toast.error("Letter Error", err.message || "Letter not available.");
    }
  };

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case "reported":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">Reported</span>;
      case "show_cause_issued":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Show-Cause Served</span>;
      case "explanation_received":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Explanation Logged</span>;
      case "inquiry_pending":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Inquiry Committee</span>;
      case "closed":
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Resolved / Closed</span>;
      default:
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">{stage}</span>;
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
              <span className="text-slate-800 font-semibold">Disciplinary Actions</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">Disciplinary Proceedings & Natural Justice</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Strict statutory compliance with Bangladesh Labour Act 2006 (Sections 23/24): 7-day show-cause window, written defense, and lawful sanction logs.
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
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs shadow-sm shadow-rose-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Report Case</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search case #, allegation or employee..."
              value={searchQuery}
              onChange={(e) => handleFilterChange(selectedStage, e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {["all", "reported", "show_cause_issued", "explanation_received", "closed"].map((st) => (
              <button
                key={st}
                onClick={() => handleFilterChange(st, searchQuery)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedStage === st
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                {st === "all" ? "All Stages" : st.replace("_", " ").toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden relative">
          {isFetching && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-100 overflow-hidden z-10">
              <div className="h-full bg-rose-600 animate-[indeterminate_1.5s_infinite_linear] origin-left w-1/3" />
            </div>
          )}

          <div className={`overflow-x-auto ${isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}`}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Case #</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Allegation Title</th>
                  <th className="py-3.5 px-4">Incident Date</th>
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4">Stage</th>
                  <th className="py-3.5 px-4 text-right">Workflow Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {initialLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      Loading disciplinary cases...
                    </td>
                  </tr>
                ) : filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      No disciplinary cases found.
                    </td>
                  </tr>
                ) : (
                  filteredCases.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{c.case_number}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{c.employee_name || "—"}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{c.allegation_title}</p>
                        <p className="text-[11px] text-slate-500">{c.statutory_clause || c.allegation_category}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">{c.incident_date}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            c.severity_level === "critical"
                              ? "bg-rose-100 text-rose-700"
                              : c.severity_level === "major"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {c.severity_level}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">{getStageBadge(c.current_stage)}</td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        {c.current_stage === "reported" && (
                          <button
                            onClick={() => {
                              setSelectedCaseForNotice(c);
                              setIsShowCauseModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs"
                          >
                            <Send className="w-3 h-3" />
                            <span>Show-Cause</span>
                          </button>
                        )}

                        {c.current_stage === "show_cause_issued" && (
                          <button
                            onClick={() => {
                              setSelectedCaseForExplanation(c);
                              setIsExplanationModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Log Defense</span>
                          </button>
                        )}

                        {(c.current_stage === "explanation_received" || c.current_stage === "reported") && (
                          <button
                            onClick={() => {
                              setSelectedCaseForAction(c);
                              setIsActionModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
                          >
                            <Gavel className="w-3 h-3" />
                            <span>Sanction</span>
                          </button>
                        )}

                        {(c.notices.length > 0 || c.actions.length > 0) && (
                          <button
                            onClick={() => handleFetchLetter(c.id)}
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
          </div>
        </div>

        {/* Modal: Report Case */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Report Disciplinary Case</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Register formal complaint & allegation</p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCase} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Employee *</label>
                    <select
                      required
                      value={formEmployeeId}
                      onChange={(e) => setFormEmployeeId(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                    >
                      <option value="">Select Employee...</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name || ""} ({emp.employee_id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Date *</label>
                    <input
                      type="date"
                      required
                      value={formIncidentDate}
                      onChange={(e) => setFormIncidentDate(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Allegation Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Willful insubordination and unauthorized absence"
                    value={formAllegationTitle}
                    onChange={(e) => setFormAllegationTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                    >
                      <option value="misconduct">Misconduct</option>
                      <option value="negligence">Gross Negligence</option>
                      <option value="attendance">Habitual Absence</option>
                      <option value="breach_of_trust">Breach of Trust</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Statutory Clause</label>
                    <input
                      type="text"
                      placeholder="BLA 2006 Sec 23"
                      value={formClause}
                      onChange={(e) => setFormClause(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Severity</label>
                    <select
                      value={formSeverity}
                      onChange={(e) => setFormSeverity(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200"
                    >
                      <option value="minor">Minor</option>
                      <option value="major">Major</option>
                      <option value="critical">Critical / Grave</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Factual Description</label>
                  <textarea
                    rows={3}
                    placeholder="Detailed account of incident, witnesses, and evidence..."
                    value={formAllegationDetails}
                    onChange={(e) => setFormAllegationDetails(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting..." : "Log Case"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Issue Show-Cause Notice */}
        {isShowCauseModalOpen && selectedCaseForNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Serve Statutory Show-Cause Notice</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Notice to {selectedCaseForNotice.employee_name} (BLA 7-Day Rule)</p>
                </div>
                <button
                  onClick={() => setIsShowCauseModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleIssueShowCause} className="p-6 space-y-4">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                  Under natural justice principles and BLA 2006, the employee must be granted at least 7 days to formulate and submit their written defense.
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Date *</label>
                    <input
                      type="date"
                      required
                      value={scIssueDate}
                      onChange={(e) => setScIssueDate(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Response Deadline (&gt;= 7 days)</label>
                    <input
                      type="date"
                      value={scDeadline}
                      onChange={(e) => setScDeadline(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Notice Content (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Leave blank to use standard statutory show-cause text..."
                    value={scContent}
                    onChange={(e) => setScContent(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsShowCauseModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
                  >
                    {isSubmitting ? "Serving..." : "Serve Notice"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Record Defense */}
        {isExplanationModalOpen && selectedCaseForExplanation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Record Employee Explanation</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Log written response for {selectedCaseForExplanation.employee_name}</p>
                </div>
                <button
                  onClick={() => setIsExplanationModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRecordExplanation} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Explanation *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Enter written defense verbatim or summarize submitted explanation..."
                    value={explanationText}
                    onChange={(e) => setExplanationText(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="accepted"
                    checked={explanationAccepted}
                    onChange={(e) => setExplanationAccepted(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="accepted" className="text-xs text-slate-700 font-medium">
                    Explanation accepted as satisfactory by management
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsExplanationModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                  >
                    {isSubmitting ? "Recording..." : "Save Explanation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Issue Sanction */}
        {isActionModalOpen && selectedCaseForAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Issue Disciplinary Sanction</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Finalize case for {selectedCaseForAction.employee_name}</p>
                </div>
                <button
                  onClick={() => setIsActionModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleIssueAction} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sanction Type *</label>
                  <select
                    value={sanctionType}
                    onChange={(e) => setSanctionType(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                  >
                    <option value="verbal_counseling">Verbal Counseling (Light)</option>
                    <option value="written_warning">Formal Written Warning</option>
                    <option value="withholding_increment">Withholding of Increment</option>
                    <option value="suspension">Suspension (with Subsistence)</option>
                    <option value="demotion">Demotion in Rank / Grade</option>
                    <option value="discharge">Discharge</option>
                    <option value="dismissal">Dismissal for Misconduct</option>
                    <option value="no_action">Exonerated / No Action</option>
                  </select>
                </div>

                {sanctionType === "suspension" && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                    <p className="text-xs font-bold text-slate-800">Suspension Parameters</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Suspension Days *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={suspensionDays}
                          onChange={(e) => setSuspensionDays(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Subsistence Allowance (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={subsistencePct}
                          onChange={(e) => setSubsistencePct(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Disciplinary Order Remarks</label>
                  <textarea
                    rows={3}
                    placeholder="Official decision rationale and directives..."
                    value={actionRemarks}
                    onChange={(e) => setActionRemarks(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsActionModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs"
                  >
                    {isSubmitting ? "Finalizing..." : "Execute Sanction & Close"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Disciplinary Letter Viewer */}
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
                  <span>Disciplinary Authority</span>
                  <span>HR Directorate</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
