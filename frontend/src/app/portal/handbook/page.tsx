"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import {
  BookOpen,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText,
  Download,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  BookmarkCheck,
  Filter,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { CompanyPolicy } from "@/types";

const CATEGORY_TABS = [
  { id: "all", label: "All Documents" },
  { id: "code_of_conduct", label: "Code of Conduct" },
  { id: "leave_rules", label: "BLA 2006 & Leave Rules" },
  { id: "it_security", label: "IT & Data Security" },
  { id: "health_safety", label: "Health & Safety" },
  { id: "benefits", label: "Benefits & Allowances" },
  { id: "hr_policy", label: "General HR Policy" },
];

export default function HandbookPage() {
  const [policies, setPolicies] = useState<CompanyPolicy[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [, startTransition] = useTransition();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPolicy, setSelectedPolicy] = useState<CompanyPolicy | null>(null);

  // Acknowledgement state
  const [acknowledging, setAcknowledging] = useState(false);
  const [ackConfirmed, setAckConfirmed] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchPolicies = async () => {
    try {
      setIsFetching(true);
      const res = await apiClient.get<CompanyPolicy[]>("/portal/policies");
      const data = res.data;
      setPolicies(data);
      if (data.length > 0 && !selectedPolicy) {
        setSelectedPolicy(data[0]);
      } else if (selectedPolicy) {
        const updated = data.find((p) => p.id === selectedPolicy.id);
        if (updated) setSelectedPolicy(updated);
      }
    } catch (err) {
      console.error("Failed to load policies", err);
    } finally {
      setIsFetching(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleCategoryChange = (cat: string) => {
    startTransition(() => {
      setSelectedCategory(cat);
    });
  };

  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      const matchCat = selectedCategory === "all" || p.category === selectedCategory;
      const matchQuery =
        !searchQuery.trim() ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.summary && p.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.content && p.content.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [policies, selectedCategory, searchQuery]);

  const handleAcknowledge = async () => {
    if (!selectedPolicy || !ackConfirmed) return;
    setAcknowledging(true);
    setActionError(null);
    try {
      await apiClient.post(`/portal/policies/${selectedPolicy.id}/acknowledge`);
      setActionSuccess("Policy acknowledgement recorded successfully with digital audit log.");
      setAckConfirmed(false);
      // Refresh policies
      await fetchPolicies();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || err.message || "Failed to submit acknowledgement.");
    } finally {
      setAcknowledging(false);
    }
  };

  const totalMandatory = policies.filter((p) => p.is_mandatory_acknowledgement).length;
  const acknowledgedMandatory = policies.filter(
    (p) => p.is_mandatory_acknowledgement && p.acknowledged_by_me
  ).length;

  return (
    <div className="space-y-6">
      {/* Top indeterminate rim loader for non-destructive filtering */}
      <div className="relative h-1 w-full overflow-hidden bg-transparent">
        {isFetching && !initialLoading && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-emerald-400 to-indigo-600 animate-pulse" />
        )}
      </div>

      {/* Header & Compliance Gauge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" /> Official Company Handbook & Statutory Guidelines
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Policy & Handbook Directory
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            Access real-time statutory labor policies (BLA 2006 compliant), organizational standards,
            health & safety protocols, and digitise required acknowledgements.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-md">
          <div className="relative flex items-center justify-center">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="currentColor"
                strokeWidth="4"
                className="text-white/10"
                fill="transparent"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray={150}
                strokeDashoffset={
                  totalMandatory > 0
                    ? 150 - (150 * acknowledgedMandatory) / totalMandatory
                    : 0
                }
                strokeLinecap="round"
                className="text-emerald-400 transition-all duration-700"
                fill="transparent"
              />
            </svg>
            <span className="absolute text-xs font-bold text-white">
              {totalMandatory > 0
                ? `${Math.round((acknowledgedMandatory / totalMandatory) * 100)}%`
                : "100%"}
            </span>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">Statutory Sign-Off</div>
            <div className="text-sm font-bold text-white">
              {acknowledgedMandatory} of {totalMandatory} Signed
            </div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <BookmarkCheck className="w-3 h-3" />
              {totalMandatory === acknowledgedMandatory
                ? "Full Compliance"
                : "Action required"}
            </div>
          </div>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {actionSuccess && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search handbook articles, policies, compliance rules..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            aria-label="Filter policies by category"
            className="text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CATEGORY_TABS.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Split-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Policy List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
            <span>Policies & Regulations ({filteredPolicies.length})</span>
            {isFetching && <span className="text-indigo-500 animate-pulse">Syncing...</span>}
          </div>

          {initialLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : filteredPolicies.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                No matching policies found.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try clearing search terms or selecting another category.
              </p>
            </div>
          ) : (
            <div
              className={`space-y-2.5 transition-opacity duration-200 ${
                isFetching ? "opacity-75" : "opacity-100"
              }`}
            >
              {filteredPolicies.map((pol) => {
                const isSelected = selectedPolicy?.id === pol.id;
                return (
                  <button
                    key={pol.id}
                    onClick={() => setSelectedPolicy(pol)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-150 flex flex-col gap-2 relative ${
                      isSelected
                        ? "bg-indigo-50/70 border-indigo-400/80 shadow-sm dark:bg-indigo-950/40 dark:border-indigo-600"
                        : "bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {pol.category.replace(/_/g, " ")}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            v{pol.version}
                          </span>
                        </div>
                        <h3 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1 mt-1">
                          {pol.title}
                        </h3>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 flex-shrink-0 transition-transform ${
                          isSelected
                            ? "text-indigo-600 dark:text-indigo-400 translate-x-0.5"
                            : "text-slate-400"
                        }`}
                      />
                    </div>

                    {pol.summary && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {pol.summary}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Eff: {new Date(pol.effective_date).toLocaleDateString()}
                      </span>

                      {pol.acknowledged_by_me ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Signed
                        </span>
                      ) : pol.is_mandatory_acknowledgement ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold animate-pulse">
                          <AlertCircle className="w-3.5 h-3.5" /> Sign Required
                        </span>
                      ) : (
                        <span className="text-slate-400">Informational</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Policy Reader & Digital Signature Action */}
        <div className="lg:col-span-7">
          {selectedPolicy ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 sticky top-6">
              {/* Policy Header Banner */}
              <div className="border-b border-slate-100 dark:border-slate-800 pb-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    <BookOpen className="w-3.5 h-3.5" />
                    {selectedPolicy.category.replace(/_/g, " ").toUpperCase()}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    Version: {selectedPolicy.version} • Effective:{" "}
                    {new Date(selectedPolicy.effective_date).toLocaleDateString()}
                  </div>
                </div>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {selectedPolicy.title}
                </h2>

                {selectedPolicy.summary && (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                    "{selectedPolicy.summary}"
                  </div>
                )}
              </div>

              {/* Policy Content Viewer */}
              <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm leading-relaxed max-h-[460px] overflow-y-auto pr-3 space-y-4">
                {selectedPolicy.content ? (
                  <div className="whitespace-pre-wrap font-sans">
                    {selectedPolicy.content}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">
                    No inline document body provided. Please refer to the official PDF attachment.
                  </p>
                )}
              </div>

              {/* PDF Attachment Download (if exists) */}
              {selectedPolicy.attachment_url && (
                <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Official Annexure / PDF Document
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Authorized copy from Human Resources & Legal
                      </div>
                    </div>
                  </div>
                  <a
                    href={selectedPolicy.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              )}

              {/* Acknowledgement Status / Action Box */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                {selectedPolicy.acknowledged_by_me ? (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                        Digitally Signed & Acknowledged
                      </div>
                      <div className="text-xs text-emerald-700 dark:text-emerald-400">
                        You acknowledged this document version on{" "}
                        {selectedPolicy.acknowledged_at
                          ? new Date(selectedPolicy.acknowledged_at).toLocaleString()
                          : "record"}
                        . Your signature is permanently logged in the enterprise audit trail.
                      </div>
                    </div>
                  </div>
                ) : selectedPolicy.is_mandatory_acknowledgement ? (
                  <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-bold text-amber-900 dark:text-amber-200">
                          Mandatory Compliance Signature Required
                        </div>
                        <div className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                          In compliance with company labor practices and statutory guidelines, all
                          employees are required to review and digitally accept this policy.
                        </div>
                      </div>
                    </div>

                    <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-amber-200/60 dark:border-amber-800/60">
                      <input
                        type="checkbox"
                        checked={ackConfirmed}
                        onChange={(e) => setAckConfirmed(e.target.checked)}
                        className="mt-1 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                        I confirm that I have thoroughly read, understood, and agree to abide by the
                        terms outlined in <strong>{selectedPolicy.title}</strong> (v{selectedPolicy.version}).
                      </span>
                    </label>

                    <button
                      onClick={handleAcknowledge}
                      disabled={!ackConfirmed || acknowledging}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-400 disabled:to-slate-400 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      {acknowledging ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Submitting Signature...
                        </>
                      ) : (
                        <>
                          <BookmarkCheck className="w-4 h-4" />
                          Digitally Sign & Acknowledge
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center text-xs text-slate-500 dark:text-slate-400">
                    This is an informational policy and does not mandate a formal digital signature.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Select a policy to view content and sign.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
