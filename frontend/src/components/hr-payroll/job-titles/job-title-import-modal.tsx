"use client";

import React, { useState, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import { X, UploadCloud, FileSpreadsheet, Download, CheckCircle2, AlertCircle } from "lucide-react";

interface JobTitleImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  businessId?: number;
}

export function JobTitleImportModal({
  isOpen,
  onClose,
  onSuccess,
  businessId = 1,
}: JobTitleImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    imported_count?: number;
    errors?: string[];
  } | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/v1/job-titles/template-excel?business_id=${businessId}`, "_blank");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
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
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiClient.post<any>(
        `/job-titles/import-excel?business_id=${businessId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setResult(res.data);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Failed to import designation template.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Bulk Import Designations</h3>
              <p className="text-xs text-slate-500">Upload an Excel spreadsheet with job title definitions.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1: Download Template */}
        <div className="pt-4 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">Download Excel Template</p>
              <p className="text-[11px] text-slate-500">Standardized columns for Title, Acronym, and Department.</p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              Download .xlsx
            </button>
          </div>

          {/* Step 2: Upload File Area */}
          <form onSubmit={handleUpload} className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/20 rounded-2xl p-6 text-center cursor-pointer transition-all"
            >
              <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                {file ? file.name : "Click to select or drag & drop .xlsx file"}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Maximum file size: 10MB</p>
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

            {result && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Import Completed Successfully
                </div>
                <div className="mt-2 text-emerald-700 text-[11px]">
                  Imported Count: <span className="font-bold">{result.imported_count ?? 0}</span>
                </div>
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-emerald-200 text-rose-600 text-[11px]">
                    <p className="font-semibold">Skipped / Notices:</p>
                    <ul className="list-disc pl-4 space-y-0.5 mt-1">
                      {result.errors.slice(0, 3).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={!file || uploading}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
              >
                {uploading ? "Importing..." : "Process Import"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
