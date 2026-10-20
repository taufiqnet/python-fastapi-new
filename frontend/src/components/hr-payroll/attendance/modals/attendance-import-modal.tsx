"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  StopCircle,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { ImportJobStatus } from "@/types";

interface BusinessOption {
  id: number;
  name_en: string;
}

interface AttendanceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: BusinessOption[];
  isSuperuser: boolean;
  currentBusinessId: number;
  onImportComplete: () => void;
}

export function AttendanceImportModal({
  isOpen,
  onClose,
  businesses,
  isSuperuser,
  currentBusinessId,
  onImportComplete,
}: AttendanceImportModalProps) {
  const [businessId, setBusinessId] = useState<number>(currentBusinessId || 1);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<ImportJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear polling on unmount or close
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  // Poll import job status
  const startPolling = (id: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await apiClient.get<ImportJobStatus>(
          `/attendance/import/${id}/status`
        );
        const data = res.data;
        setJobStatus(data);

        if (data.status === "completed" || data.status === "failed" || data.cancelled) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setUploading(false);
          if (data.status === "completed") {
            onImportComplete();
          }
        }
      } catch {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setUploading(false);
      }
    }, 1500);
  };

  const handleDownloadTemplate = async () => {
    try {
      const biz = businessId || currentBusinessId || 1;
      const res = await apiClient.get(
        `/attendance/template-excel?business_id=${biz}`,
        { responseType: "blob" }
      );
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `attendance_template_business_${biz}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download attendance excel template.");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select an Excel (.xlsx/.xls) file to upload.");
      return;
    }

    setUploading(true);
    setError(null);
    setJobStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiClient.post<{
        job_id: string;
        status: string;
        total_rows: number;
        message: string;
      }>(`/attendance/import-excel?business_id=${businessId || currentBusinessId || 1}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setJobId(res.data.job_id);
      startPolling(res.data.job_id);
    } catch {
      setError("Upload failed. Please ensure the file matches the sample attendance template.");
      setUploading(false);
    }
  };

  const handleCancelJob = async () => {
    if (!jobId) return;
    try {
      await apiClient.post(`/attendance/import/${jobId}/cancel`);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Import Monthly Attendance Sheet
              </h2>
              <p className="text-xs text-slate-500">
                Bulk upload daily punch records from biometric/Excel sheets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Business Select (Superuser) */}
          {isSuperuser && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Business Profile <span className="text-rose-500">*</span>
              </label>
              <select
                value={businessId}
                onChange={(e) => setBusinessId(Number(e.target.value))}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                required
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name_en}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Download Template Banner */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-bold text-indigo-950">Need the standard spreadsheet?</div>
              <div className="text-[11px] text-indigo-600 mt-0.5">
                Download the official template with active employee codes prefilled.
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              Template
            </button>
          </div>

          {/* File Upload Zone */}
          {!uploading && !jobStatus && (
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50/50">
                <FileSpreadsheet className="w-10 h-10 mx-auto text-emerald-600 mb-2 stroke-1" />
                <p className="font-bold text-slate-800">
                  {file ? file.name : "Choose Attendance Excel File"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supported formats: .xlsx, .xls (Max: 10MB)
                </p>
                <input
                  type="file"
                  id="excel_upload_input"
                  accept=".xlsx, .xls"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <label
                  htmlFor="excel_upload_input"
                  className="mt-3.5 inline-block px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer shadow-2xs transition-colors"
                >
                  Browse Files
                </label>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!file}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload & Import
                </button>
              </div>
            </form>
          )}

          {/* Job Processing Progress UI */}
          {(uploading || jobStatus) && (
            <div className="space-y-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {jobStatus?.status === "completed" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : jobStatus?.status === "failed" ? (
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                  )}
                  <span className="font-bold text-slate-900 capitalize">
                    Import Status: {jobStatus?.status || "Processing..."}
                  </span>
                </div>
                {uploading && (
                  <button
                    type="button"
                    onClick={handleCancelJob}
                    className="text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                )}
              </div>

              {/* Progress bar */}
              {jobStatus && (
                <div className="space-y-2">
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        jobStatus.status === "completed"
                          ? "bg-emerald-600"
                          : "bg-indigo-600"
                      }`}
                      style={{
                        width: `${
                          jobStatus.total_rows > 0
                            ? Math.round(
                                (jobStatus.processed / jobStatus.total_rows) * 100
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>
                      Processed: {jobStatus.processed} / {jobStatus.total_rows} rows
                    </span>
                    <span className="text-emerald-700 font-bold">
                      Success: {jobStatus.success_count}
                    </span>
                    {jobStatus.error_count > 0 && (
                      <span className="text-rose-600 font-bold">
                        Errors: {jobStatus.error_count}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Error messages if any */}
              {jobStatus && jobStatus.errors && jobStatus.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto p-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800 space-y-1">
                  <div className="font-bold">Errors encountered during import:</div>
                  {jobStatus.errors.slice(0, 5).map((err, idx) => (
                    <div key={idx}>
                      • Row {err.row || "?"}: {err.message || err.error || "Validation error"}
                    </div>
                  ))}
                  {jobStatus.errors.length > 5 && (
                    <div className="text-slate-500">
                      ...and {jobStatus.errors.length - 5} more errors
                    </div>
                  )}
                </div>
              )}

              {jobStatus?.status === "completed" && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
