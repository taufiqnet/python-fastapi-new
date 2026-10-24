"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import {
  DocumentCategory,
  DossierSummary,
  EmployeeDocument,
  EmployeeOut,
} from "@/types";
import { SearchableEmployeeCombobox } from "@/components/common/searchable-employee-combobox";
import {
  FolderArchive,
  Upload,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Trash2,
  ChevronRight,
  Filter,
  Eye,
  FileCheck,
} from "lucide-react";

interface DossierTabProps {
  currentBusinessId: number;
  employees: EmployeeOut[];
}

export function DossierTab({ currentBusinessId, employees }: DossierTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [summary, setSummary] = useState<DossierSummary | null>(null);

  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Upload Modal
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadForm, setUploadForm] = useState({
    category_id: "",
    document_title: "",
    document_number: "",
    file_url: "",
    file_name: "",
    issue_date: "",
    expiry_date: "",
    confidentiality_level: "confidential" as const,
    notes: "",
  });

  // Verify Modal
  const [isVerifyOpen, setIsVerifyOpen] = useState<boolean>(false);
  const [verifyingDoc, setVerifyingDoc] = useState<EmployeeDocument | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<"verified" | "rejected">("verified");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [processingVerify, setProcessingVerify] = useState<boolean>(false);

  // Initial setup: select first employee if available and fetch categories
  useEffect(() => {
    if (employees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(employees[0].id);
    }
  }, [employees, selectedEmployeeId]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiClient.get<DocumentCategory[]>(
        `/documents/categories?business_id=${currentBusinessId}`
      );
      setCategories(res.data || []);
    } catch {
      // non-blocking
    }
  }, [currentBusinessId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const fetchDossierSummary = useCallback(
    async (isInitial = false) => {
      if (!selectedEmployeeId) return;

      if (isInitial) setInitialLoading(true);
      else setIsFetching(true);

      try {
        const res = await apiClient.get<DossierSummary>(
          `/documents/dossier/summary/${selectedEmployeeId}?business_id=${currentBusinessId}`
        );
        setSummary(res.data);
      } catch (err: any) {
        toast.error("Error", err.response?.data?.detail || "Failed to load employee dossier.");
      } finally {
        if (isInitial) setInitialLoading(false);
        else setIsFetching(false);
      }
    },
    [currentBusinessId, selectedEmployeeId, toast]
  );

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchDossierSummary(true);
    }
  }, [selectedEmployeeId, fetchDossierSummary]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.category_id) {
      toast.error("Validation Error", "Please select a document category.");
      return;
    }
    if (!uploadForm.document_title.trim()) {
      toast.error("Validation Error", "Please enter a document title.");
      return;
    }
    if (!uploadForm.file_url.trim()) {
      toast.error("Validation Error", "Please provide a document file URL.");
      return;
    }

    setUploading(true);
    try {
      const payload = {
        business_id: currentBusinessId,
        employee_id: selectedEmployeeId,
        category_id: uploadForm.category_id,
        document_title: uploadForm.document_title,
        document_number: uploadForm.document_number || null,
        file_url: uploadForm.file_url,
        file_name: uploadForm.file_name || uploadForm.document_title + ".pdf",
        issue_date: uploadForm.issue_date || null,
        expiry_date: uploadForm.expiry_date || null,
        confidentiality_level: uploadForm.confidentiality_level,
        notes: uploadForm.notes || null,
      };

      await apiClient.post("/documents/dossier", payload);
      toast.success("Uploaded", "Document has been added to employee e-dossier.");
      setIsUploadOpen(false);
      setUploadForm({
        category_id: "",
        document_title: "",
        document_number: "",
        file_url: "",
        file_name: "",
        issue_date: "",
        expiry_date: "",
        confidentiality_level: "confidential",
        notes: "",
      });
      fetchDossierSummary();
    } catch (err: any) {
      toast.error("Upload Failed", err.response?.data?.detail || "Could not upload document.");
    } finally {
      setUploading(false);
    }
  };

  const handleVerifySubmit = async () => {
    if (!verifyingDoc) return;
    if (verifyStatus === "rejected" && !rejectionReason.trim()) {
      toast.error("Validation Error", "Please provide a reason for document rejection.");
      return;
    }

    setProcessingVerify(true);
    try {
      await apiClient.put(`/documents/dossier/${verifyingDoc.id}/verify`, {
        status: verifyStatus,
        rejection_reason: verifyStatus === "rejected" ? rejectionReason : null,
      });

      toast.success(
        "Verification Updated",
        `Document marked as ${verifyStatus.toUpperCase()} successfully.`
      );
      setIsVerifyOpen(false);
      setVerifyingDoc(null);
      setRejectionReason("");
      fetchDossierSummary();
    } catch (err: any) {
      toast.error("Action Failed", err.response?.data?.detail || "Verification failed.");
    } finally {
      setProcessingVerify(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Are you sure you want to remove this document from the e-dossier?")) return;
    try {
      await apiClient.delete(`/documents/dossier/${docId}`);
      toast.success("Deleted", "Document removed.");
      fetchDossierSummary();
    } catch (err: any) {
      toast.error("Delete Failed", err.response?.data?.detail || "Could not delete document.");
    }
  };


  const getStatusBadge = (status: EmployeeDocument["verification_status"]) => {
    switch (status) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> Verified
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
            <Clock className="w-3 h-3" /> Unverified
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Employee Selector Bar & Top Actions */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
          <div className="p-2.5 bg-primary-50 dark:bg-primary-950/50 rounded-xl text-primary-600 dark:text-primary-400">
            <FolderArchive className="w-6 h-6" />
          </div>
          <div className="w-full sm:w-80">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Select Employee e-Dossier
            </label>
            <SearchableEmployeeCombobox
              employees={employees}
              value={selectedEmployeeId}
              onChange={(id) => {
                startTransition(() => {
                  setSelectedEmployeeId(id);
                });
              }}
              placeholder="Search & select employee e-dossier..."
              allowClear={false}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={() => fetchDossierSummary()}
            disabled={isFetching}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-primary-600" : ""}`} />
          </button>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm transition-all shadow-md shadow-primary-600/20 active:scale-95"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Compliance Scorecard Card */}
      {summary && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-indigo-900/40 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
                <ShieldCheck className="w-4 h-4" />
                Statutory Onboarding Compliance Scorecard
              </div>
              <h3 className="text-xl font-bold mt-1 text-white">
                {summary.employee_name} ({summary.employee_code})
              </h3>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Department: {summary.department_name || "General Staff"} • Total Documents:{" "}
                <span className="font-semibold text-white">{summary.total_documents}</span>
              </p>
            </div>

            <div className="flex items-center gap-5 w-full md:w-auto">
              {/* Radial or Big Metric */}
              <div className="text-right">
                <div className="text-3xl font-extrabold font-mono tracking-tight text-white">
                  {summary.completeness_percentage}%
                </div>
                <div className="text-xs text-indigo-300">
                  {summary.completed_mandatory_categories} of {summary.total_mandatory_categories} Mandatory Verified
                </div>
              </div>

              {/* Progress bar container */}
              <div className="w-36 h-3.5 bg-slate-800 rounded-full overflow-hidden border border-indigo-900/50">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    summary.completeness_percentage === 100
                      ? "bg-emerald-500"
                      : summary.completeness_percentage >= 60
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${summary.completeness_percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-Place Document Category Sections */}
      <div className="relative space-y-6">
        {/* Top-rim indeterminate progress bar */}
        {(isFetching || isPending) && (
          <div className="absolute -top-3 left-0 right-0 h-1 bg-primary-100 dark:bg-primary-950 overflow-hidden z-20 rounded-full">
            <div className="h-full bg-primary-600 animate-pulse w-full" />
          </div>
        )}

        {initialLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mb-3" />
            <p className="text-sm font-medium">Loading e-Dossier personal files...</p>
          </div>
        ) : !summary || summary.categories.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <FolderArchive className="w-12 h-12 stroke-[1.5] mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
              No personal documents found
            </p>
            <p className="text-sm mt-1">Upload statutory credentials or letters to populate this dossier.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {summary.categories.map((catGroup) => (
              <div
                key={catGroup.category_id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
              >
                {/* Category Header Bar */}
                <div className="p-4 px-6 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {catGroup.category_name}
                    </span>
                    {catGroup.is_mandatory && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                        Mandatory
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-mono">
                      ({catGroup.documents.length} files)
                    </span>
                  </div>

                  <div>
                    {catGroup.is_compliant ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Compliant
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="w-3.5 h-3.5" /> Pending Mandatory Submission
                      </span>
                    )}
                  </div>
                </div>

                {/* Documents list */}
                {catGroup.documents.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 italic">
                    No documents uploaded in this category yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {catGroup.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mt-1">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white text-sm">
                              {doc.document_title}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-0.5">
                              {doc.document_number && (
                                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                                  #{doc.document_number}
                                </span>
                              )}
                              <span>v{doc.version}</span>
                              {doc.expiry_date && (
                                <span className="text-amber-600 dark:text-amber-400">
                                  Expires: {doc.expiry_date}
                                </span>
                              )}
                              <span className="capitalize">{doc.confidentiality_level}</span>
                            </div>
                            {doc.rejection_reason && (
                              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                                Rejection Note: {doc.rejection_reason}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                          <div>{getStatusBadge(doc.verification_status)}</div>

                          <div className="flex items-center gap-1.5">
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Preview Document"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>

                            <button
                              onClick={() => {
                                setVerifyingDoc(doc);
                                setVerifyStatus("verified");
                                setRejectionReason("");
                                setIsVerifyOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors"
                            >
                              Verify
                            </button>

                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Delete Document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Upload Document */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary-600" />
                Upload to Employee e-Dossier
              </h3>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Document Category <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={uploadForm.category_id}
                  onChange={(e) => setUploadForm({ ...uploadForm, category_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} {cat.is_mandatory ? "(Mandatory)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BIDA Work Permit Copy or Smart NID Card"
                  value={uploadForm.document_title}
                  onChange={(e) => setUploadForm({ ...uploadForm, document_title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Document # / Ref
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 199012345678"
                    value={uploadForm.document_number}
                    onChange={(e) => setUploadForm({ ...uploadForm, document_number: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Confidentiality Tier
                  </label>
                  <select
                    value={uploadForm.confidentiality_level}
                    onChange={(e) =>
                      setUploadForm({
                        ...uploadForm,
                        confidentiality_level: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="internal">Internal</option>
                    <option value="confidential">Confidential</option>
                    <option value="strictly_confidential">Strictly Confidential (HR Only)</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  File URL or Path <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="/uploads/documents/employee_doc.pdf"
                  value={uploadForm.file_url}
                  onChange={(e) => setUploadForm({ ...uploadForm, file_url: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={uploadForm.issue_date}
                    onChange={(e) => setUploadForm({ ...uploadForm, issue_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={uploadForm.expiry_date}
                    onChange={(e) => setUploadForm({ ...uploadForm, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional verification instructions or context..."
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-600/20 disabled:opacity-50"
                >
                  {uploading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Save to e-Dossier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Document Verification */}
      {isVerifyOpen && verifyingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                Audit & Verify Document
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {verifyingDoc.document_title}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Verification Decision <span className="text-rose-500">*</span>
                </label>
                <select
                  value={verifyStatus}
                  onChange={(e) => setVerifyStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 font-semibold"
                >
                  <option value="verified">Approve & Verify Document</option>
                  <option value="rejected">Reject (Deficient / Illegible / Invalid)</option>
                </select>
              </div>

              {verifyStatus === "rejected" && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Rejection Reason <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Specify why this document is rejected (e.g. blurry image, expired certificate)..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsVerifyOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerifySubmit}
                  disabled={processingVerify}
                  className={`flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-xl text-white shadow-md ${
                    verifyStatus === "verified"
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                      : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                  }`}
                >
                  {processingVerify && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Confirm Decision
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
