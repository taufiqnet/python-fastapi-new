"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import {
  BulkLetterJob,
  BulkLetterItem,
  DocumentTemplate,
  EmployeeOut,
  BulkLetterType,
} from "@/types";
import {
  FileStack,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  Play,
  Eye,
  Send,
  Users,
  FileText,
  Sparkles,
  Check,
  ChevronRight,
} from "lucide-react";

interface BulkLettersTabProps {
  currentBusinessId: number;
  employees: EmployeeOut[];
}

export function BulkLettersTab({ currentBusinessId, employees }: BulkLettersTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [jobs, setJobs] = useState<BulkLetterJob[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Create Wizard Modal
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizardForm, setWizardForm] = useState({
    job_type: "increment" as BulkLetterType,
    batch_title: "",
    template_id: "",
    employee_ids: [] as string[],
    issue_date: new Date().toISOString().split("T")[0],
    reference_prefix: "HR/INC/2026",
    notes: "",
  });

  // Job Details Drawer / Modal
  const [selectedJob, setSelectedJob] = useState<BulkLetterJob | null>(null);
  const [selectedItemPreview, setSelectedItemPreview] = useState<BulkLetterItem | null>(null);
  const [dispatchingJobId, setDispatchingJobId] = useState<string | null>(null);

  const fetchJobs = useCallback(
    async (showBackgroundFetching: boolean = true) => {
      if (showBackgroundFetching) setIsFetching(true);
      try {
        const res = await apiClient.get<BulkLetterJob[]>(
          `/documents/bulk-letters?business_id=${currentBusinessId}`
        );
        setJobs(res.data || []);
      } catch (err: any) {
        console.error("Failed to load bulk letter jobs:", err);
        toast.error("Error", err.message || "Could not fetch bulk letter jobs");
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [currentBusinessId, toast]
  );

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await apiClient.get<DocumentTemplate[]>(
        `/documents/templates?business_id=${currentBusinessId}&is_active=true`
      );
      setTemplates(res.data || []);
    } catch (err: any) {
      console.error("Failed to load templates:", err);
    }
  }, [currentBusinessId]);

  useEffect(() => {
    fetchJobs(false);
    fetchTemplates();
  }, [fetchJobs, fetchTemplates]);

  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    startTransition(() => {
      setter(val);
    });
  };

  const handleSelectAllEmployees = () => {
    if (wizardForm.employee_ids.length === employees.length) {
      setWizardForm({ ...wizardForm, employee_ids: [] });
    } else {
      setWizardForm({ ...wizardForm, employee_ids: employees.map((e) => e.id) });
    }
  };

  const toggleEmployeeSelection = (empId: string) => {
    const current = [...wizardForm.employee_ids];
    const idx = current.indexOf(empId);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(empId);
    }
    setWizardForm({ ...wizardForm, employee_ids: current });
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wizardForm.template_id) {
      toast.error("Template Required", "Please select a template for generation.");
      return;
    }
    if (wizardForm.employee_ids.length === 0) {
      toast.error("Recipients Required", "Please select at least one recipient employee.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        business_id: currentBusinessId,
        job_type: wizardForm.job_type,
        batch_title:
          wizardForm.batch_title ||
          `${wizardForm.job_type.replace("_", " ").toUpperCase()} Batch`,
        template_id: wizardForm.template_id,
        employee_ids: wizardForm.employee_ids,
        issue_date: wizardForm.issue_date,
        reference_prefix: wizardForm.reference_prefix,
      };

      const res = await apiClient.post<BulkLetterJob>(
        `/documents/bulk-letters?business_id=${currentBusinessId}`,
        payload
      );
      toast.success(
        "Batch Created",
        `Created batch with ${res.data?.total_recipients ?? 0} recipient letters ready for generation.`
      );
      setIsCreateOpen(false);
      setWizardStep(1);
      fetchJobs(true);
    } catch (err: any) {
      toast.error("Creation Failed", err.message || "Failed to create bulk letter batch");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatchJob = async (jobId: string) => {
    setDispatchingJobId(jobId);
    try {
      const res = await apiClient.post<BulkLetterJob>(
        `/documents/bulk-letters/${jobId}/dispatch?business_id=${currentBusinessId}`,
        {}
      );
      toast.success(
        "Batch Processed",
        `Dispatched batch! Successfully rendered and generated ${res.data?.successful_count ?? 0} letters.`
      );
      fetchJobs(true);
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob(res.data);
      }
    } catch (err: any) {
      toast.error("Dispatch Failed", err.message || "Failed to run batch dispatch");
    } finally {
      setDispatchingJobId(null);
    }
  };

  const viewJobDetails = async (job: BulkLetterJob) => {
    try {
      const fullJob = await apiClient.get<BulkLetterJob>(
        `/documents/bulk-letters/${job.id}?business_id=${currentBusinessId}`
      );
      setSelectedJob(fullJob.data);
    } catch (err: any) {
      toast.error("Failed to load batch items", err.message);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (statusFilter !== "all" && j.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        j.batch_title.toLowerCase().includes(q) ||
        j.reference_prefix.toLowerCase().includes(q) ||
        j.job_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Batches
            </p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
              {jobs.length}
            </h3>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <FileStack className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">
              Letters Dispatched
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {jobs.reduce((acc, curr) => acc + (curr.successful_count || 0), 0)}
            </h3>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <Send className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-wider">
              Draft / Pending Batches
            </p>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {jobs.filter((j) => j.status === "draft" || j.status === "processing").length}
            </h3>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-wider">
              Active Templates
            </p>
            <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
              {templates.length}
            </h3>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-700/60 p-1 rounded-lg">
            {["all", "draft", "completed", "failed"].map((st) => (
              <button
                key={st}
                onClick={() => handleFilterChange(setStatusFilter, st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                  statusFilter === st
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {st === "all" ? "All Batches" : st}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search batches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setWizardForm({
                job_type: "increment",
                batch_title: "Annual Salary Revision 2026",
                template_id: templates[0]?.id || "",
                employee_ids: [],
                issue_date: new Date().toISOString().split("T")[0],
                reference_prefix: "HR/INC/2026",
                notes: "",
              });
              setWizardStep(1);
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all rounded-lg shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Bulk Letter Batch
          </button>

          <button
            onClick={() => fetchJobs(true)}
            className="p-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
            title="Refresh jobs"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Batches Table with In-Place Non-Destructive Filtering */}
      <div className="relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {(isPending || isFetching) && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-100 overflow-hidden z-10">
            <div className="w-full h-full bg-blue-600 origin-left animate-indeterminate"></div>
          </div>
        )}

        <div
          className={`overflow-x-auto transition-opacity duration-200 ${
            isPending || isFetching ? "opacity-60" : "opacity-100"
          }`}
        >
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3">Batch Title & Ref</th>
                <th className="px-4 py-3">Letter Type</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Issue Date</th>
                <th className="px-4 py-3">Recipients</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileStack className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                      No Bulk Letter Batches Found
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Launch a new bulk letter generation run for increments, appointments, or confirmations.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-white">{job.batch_title}</p>
                        <p className="text-[11px] font-mono text-slate-400">
                          Prefix: {job.reference_prefix}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3 capitalize">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {job.job_type.replace("_", " ")}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {job.template_name || `Template ${job.template_id}`}
                    </td>

                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 font-mono text-slate-600 dark:text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {job.issue_date}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-800 dark:text-white">
                          {job.successful_count} / {job.total_recipients}
                        </span>
                        {job.status === "completed" && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                          job.status === "completed"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : job.status === "processing"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 animate-pulse"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {job.status === "draft" && (
                          <button
                            onClick={() => handleDispatchJob(job.id)}
                            disabled={dispatchingJobId === job.id}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition disabled:opacity-50"
                          >
                            <Play className="w-3 h-3" />
                            {dispatchingJobId === job.id ? "Running..." : "Dispatch"}
                          </button>
                        )}

                        <button
                          onClick={() => viewJobDetails(job)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Letters
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Batch Modal (Multi-Step Wizard) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-scaleUp">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Bulk Letter Generation Wizard
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Step {wizardStep} of 2: {wizardStep === 1 ? "Configuration & Template" : "Select Recipients"}
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* Stepper Progress */}
            <div className="flex items-center mb-6">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                  wizardStep >= 1 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                }`}
              >
                1
              </div>
              <div
                className={`flex-1 h-1 mx-2 rounded ${
                  wizardStep >= 2 ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                  wizardStep >= 2 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                }`}
              >
                2
              </div>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4">
              {wizardStep === 1 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Batch Letter Type *
                      </label>
                      <select
                        value={wizardForm.job_type}
                        onChange={(e) =>
                          setWizardForm({
                            ...wizardForm,
                            job_type: e.target.value as BulkLetterType,
                          })
                        }
                        className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="increment">Salary Increment Letter</option>
                        <option value="appointment">Appointment / Offer Letter</option>
                        <option value="confirmation">Service Confirmation Letter</option>
                        <option value="transfer">Transfer / Relocation Letter</option>
                        <option value="bonus">Festival / Performance Bonus Letter</option>
                        <option value="custom">General Notice / Circular</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Batch Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={wizardForm.batch_title}
                        onChange={(e) =>
                          setWizardForm({ ...wizardForm, batch_title: e.target.value })
                        }
                        placeholder="e.g. Annual Appraisal Revision 2026"
                        className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Document Template *
                    </label>
                    <select
                      value={wizardForm.template_id}
                      onChange={(e) =>
                        setWizardForm({
                          ...wizardForm,
                          template_id: e.target.value,
                        })
                      }
                      className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Select Registered Template --</option>
                      {templates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name} ({tpl.subject})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Issue Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={wizardForm.issue_date}
                        onChange={(e) =>
                          setWizardForm({ ...wizardForm, issue_date: e.target.value })
                        }
                        className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Reference Prefix *
                      </label>
                      <input
                        type="text"
                        required
                        value={wizardForm.reference_prefix}
                        onChange={(e) =>
                          setWizardForm({ ...wizardForm, reference_prefix: e.target.value })
                        }
                        className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Select Employees ({wizardForm.employee_ids.length} of {employees.length} selected)
                    </p>
                    <button
                      type="button"
                      onClick={handleSelectAllEmployees}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                    >
                      {wizardForm.employee_ids.length === employees.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {employees.map((emp) => {
                      const isSelected = wizardForm.employee_ids.includes(emp.id);
                      return (
                        <div
                          key={emp.id}
                          onClick={() => toggleEmployeeSelection(emp.id)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border ${
                                isSelected
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "border-slate-300 dark:border-slate-600"
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                {emp.first_name} {emp.last_name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {emp.employee_id} • {emp.work_email}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-700">
                {wizardStep === 2 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                  >
                    Cancel
                  </button>

                  {wizardStep === 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!wizardForm.template_id) {
                          toast.error("Template Required", "Please choose a template.");
                          return;
                        }
                        setWizardStep(2);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                    >
                      Next: Choose Recipients
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting || wizardForm.employee_ids.length === 0}
                      className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {submitting ? "Creating Batch..." : "Create & Prepare Batch"}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[85vh] flex flex-col animate-scaleUp">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedJob.batch_title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Batch Type: <span className="font-semibold capitalize">{selectedJob.job_type.replace("_", " ")}</span> •
                  Total Recipients: <span className="font-semibold">{selectedJob.total_recipients}</span> •
                  Generated: <span className="font-semibold text-emerald-600">{selectedJob.successful_count}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedJob(null);
                  setSelectedItemPreview(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {selectedItemPreview ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Previewing Letter: {selectedItemPreview.reference_no}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Recipient: {selectedItemPreview.recipient_name} ({selectedItemPreview.recipient_email})
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedItemPreview(null)}
                      className="px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                    >
                      Back to Table
                    </button>
                  </div>

                  <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-serif text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner">
                    {selectedItemPreview.rendered_content}
                  </div>
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-2.5">Reference No</th>
                      <th className="px-4 py-2.5">Recipient</th>
                      <th className="px-4 py-2.5">Department & Title</th>
                      <th className="px-4 py-2.5">Acknowledged</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                    {selectedJob.items?.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition"
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {item.reference_no}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-white">
                              {item.recipient_name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {item.recipient_email}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-slate-700 dark:text-slate-300">
                            {item.designation || "General"} ({item.department || "HR"})
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.is_signed ? (
                            <span className="flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Signed ({item.signed_at?.split("T")[0]})
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Pending Ack</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedItemPreview(item)}
                            className="px-2 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition"
                          >
                            Read Letter
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700">
              {selectedJob.status === "draft" ? (
                <button
                  onClick={() => handleDispatchJob(selectedJob.id)}
                  disabled={dispatchingJobId === selectedJob.id}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
                >
                  <Play className="w-3.5 h-3.5" />
                  {dispatchingJobId === selectedJob.id ? "Processing..." : "Run Batch Dispatch"}
                </button>
              ) : (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Batch Generation Completed
                </span>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedJob(null);
                  setSelectedItemPreview(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
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
