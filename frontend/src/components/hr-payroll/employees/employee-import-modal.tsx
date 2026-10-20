"use client";

import React, { useState, useRef, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  Check,
  FileDown,
} from "lucide-react";

interface EmployeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  businessId?: number;
}

interface ImportStatusResponse {
  job_id: string;
  status: "processing" | "completed" | "failed" | "cancelled";
  total_rows: number;
  processed: number;
  success_count: number;
  error_count: number;
  errors: Array<{
    row: number;
    employee_id?: string;
    email?: string;
    error: string;
  }>;
  cancelled: boolean;
}

export function EmployeeImportModal({
  isOpen,
  onClose,
  onSuccess,
  businessId = 1,
}: EmployeeImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<ImportStatusResponse | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // Poll status when job is active
  useEffect(() => {
    if (!activeJobId) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get<ImportStatusResponse>(
          `/employees/import/${activeJobId}/status`
        );
        if (!isMounted) return;

        setJobStatus(res.data);
        if (res.data.status === "completed" || res.data.status === "failed") {
          clearInterval(interval);
          setUploading(false);
          if (res.data.status === "completed" && res.data.success_count > 0) {
            onSuccess();
          }
        }
      } catch (err: any) {
        clearInterval(interval);
        setUploading(false);
        setError("Failed to fetch import job progress.");
      }
    }, 1200);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeJobId, onSuccess]);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      const response = await apiClient.get(
        `/employees/template-excel?business_id=${businessId}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `employee_import_demo_template.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download Excel template.");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleDownloadErrors = async () => {
    if (!activeJobId) return;
    try {
      const response = await apiClient.get(
        `/employees/import/${activeJobId}/errors-csv`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `import_errors_${activeJobId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download error log.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setJobStatus(null);
      setActiveJobId(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select an Excel (.xlsx) file to upload.");
      return;
    }

    setUploading(true);
    setError(null);
    setJobStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiClient.post<{ job_id: string }>(
        `/employees/import-excel?business_id=${businessId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (res.data?.job_id) {
        setActiveJobId(res.data.job_id);
      }
    } catch (err: any) {
      setUploading(false);
      setError(
        err.response?.data?.detail || err.message || "Failed to start employee import."
      );
    }
  };

  const progressPercent =
    jobStatus && jobStatus.total_rows > 0
      ? Math.round((jobStatus.processed / jobStatus.total_rows) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                Import Employees
              </h3>
              <p className="text-xs text-slate-500">
                Bulk onboard employees via formatted Excel spreadsheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Instructions / Demo Template Download */}
        <div className="pt-5 space-y-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-slate-50 border border-indigo-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                <FileDown className="w-4 h-4 text-indigo-600" />
                <span>Download Demo Excel Template</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Contains all 56 fields (Bangla Name, Form 33, NID, Blood Group, Banking/MFS, Address Hierarchy) with 2 ready-to-test sample rows and guidelines.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50/60 shadow-xs transition shrink-0"
            >
              {downloadingTemplate ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-indigo-600" />
              )}
              Download Demo .xlsx
            </button>
          </div>

          {/* Guidelines bullet points */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider">
              <Info className="w-3.5 h-3.5 text-indigo-500" />
              Quick Preparation Guidelines
            </div>
            <ul className="text-[11px] space-y-1 text-slate-500 list-disc pl-4">
              <li>
                <strong className="text-slate-700">Mandatory Columns:</strong> Employee ID, First Name, and Work Email.
              </li>
              <li>
                <strong className="text-slate-700">Organization Links:</strong> Department, Job Title, Branch, and Salary Grade can be specified by exact Name or Code.
              </li>
              <li>
                <strong className="text-slate-700">Disbursement:</strong> Supports Bank Transfer (Account & Routing No) or MFS (bKash, Nagad, Rocket).
              </li>
            </ul>
          </div>

          {/* Form */}
          <form onSubmit={handleUpload} className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                file
                  ? "border-emerald-400 bg-emerald-50/30"
                  : "border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/20"
              }`}
            >
              {file ? (
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                    <Check className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-emerald-900">{file.name}</p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB • Click to choose a different file
                  </p>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">
                    Click to select or drag & drop your Excel (.xlsx) file
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Maximum 5,000 employee records per upload (up to 10MB)
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Live Progress Bar & Job Status */}
            {jobStatus && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    {jobStatus.status === "processing" ? (
                      <span className="flex items-center gap-1.5 text-indigo-600">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Processing Import...
                      </span>
                    ) : jobStatus.status === "completed" ? (
                      <span className="flex items-center gap-1.5 text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Import Completed
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold capitalize">
                        Status: {jobStatus.status}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-slate-600">
                    {jobStatus.processed} of {jobStatus.total_rows} rows ({progressPercent}%)
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      jobStatus.status === "failed"
                        ? "bg-rose-500"
                        : jobStatus.status === "completed"
                        ? "bg-emerald-500"
                        : "bg-indigo-600"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-100 text-emerald-800">
                    <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">
                      Successfully Created
                    </p>
                    <p className="text-lg font-black">{jobStatus.success_count}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-100 text-amber-800">
                    <p className="text-[10px] text-amber-600 uppercase font-bold tracking-wider">
                      Skipped / Errors
                    </p>
                    <p className="text-lg font-black">{jobStatus.error_count}</p>
                  </div>
                </div>

                {jobStatus.errors && jobStatus.errors.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-rose-600">
                        Found {jobStatus.errors.length} skipped row(s)
                      </span>
                      <button
                        type="button"
                        onClick={handleDownloadErrors}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold underline flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Download Error Log (CSV)
                      </button>
                    </div>
                    <ul className="text-[11px] text-rose-600 space-y-1 bg-white p-2.5 rounded-xl border border-rose-100 max-h-24 overflow-y-auto">
                      {jobStatus.errors.slice(0, 5).map((e, idx) => (
                        <li key={idx} className="truncate">
                          Row {e.row}: {e.employee_id ? `[${e.employee_id}] ` : ""}{e.error}
                        </li>
                      ))}
                      {jobStatus.errors.length > 5 && (
                        <li className="text-slate-400 italic">
                          + {jobStatus.errors.length - 5} more issues in CSV log
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
              >
                {jobStatus?.status === "completed" ? "Done" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={!file || uploading}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Process Import</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
